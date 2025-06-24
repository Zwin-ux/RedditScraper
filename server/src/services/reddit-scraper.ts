import { z } from 'zod';
import { RateLimiter } from 'limiter';
import { subredditCache, userProfileCache } from './cache-service.js';
import { config } from '../config/index.js';
import { 
  RedditPost, 
  formatRedditPost, 
  parseSubreddit, 
  parseUsername,
  getRedditErrorMessage
} from '../utils/reddit-utils.js';
import { ExternalServiceError, RateLimitError, ValidationError } from '../utils/errors.js';

// Rate limiter: 30 requests per minute (Reddit's limit)
const redditLimiter = new RateLimiter({
  tokensPerInterval: config.rateLimit.max,
  interval: config.rateLimit.windowMs, // in milliseconds
});

// Cache TTLs (in seconds)
const CACHE_TTL = {
  SUBREDDIT: 3600, // 1 hour
  USER_PROFILE: 86400, // 24 hours
  SEARCH: 1800, // 30 minutes
};

// Zod schemas for validation
export const SubredditSchema = z.string().min(3).max(21).regex(/^[a-zA-Z0-9_]+$/);
export const UsernameSchema = z.string().min(3).max(20).regex(/^[a-zA-Z0-9_-]+$/);

export interface ScraperOptions {
  /**
   * Maximum number of posts to retrieve
   * @default 25
   */
  limit?: number;
  
  /**
   * Time filter for posts (hour, day, week, month, year, all)
   * @default 'month'
   */
  time?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  
  /**
   * Sort order (new, hot, top, rising, etc.)
   * @default 'new'
   */
  sort?: 'new' | 'hot' | 'top' | 'rising' | 'controversial';
  
  /**
   * Whether to include user profile data for authors
   * @default false
   */
  includeUserProfiles?: boolean;
  
  /**
   * Whether to bypass cache
   * @default false
   */
  forceRefresh?: boolean;
  
  /**
   * Additional query parameters
   */
  [key: string]: any;
}

export type ScraperResult<T = any> = {
  data: T[];
  metadata: {
    total: number;
    after: string | null;
    before: string | null;
    pageSize: number;
    executionTime: number;
    cacheHit: boolean;
  };
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
};

export class RedditScraper {
  private userAgent: string;
  private baseUrl = 'https://www.reddit.com';
  
  constructor() {
    this.userAgent = config.isDevelopment 
      ? 'RedditScraper/1.0 (Development)' 
      : 'RedditScraper/1.0';
  }
  
  private async makeRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
    try {
      await redditLimiter.removeTokens(1);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
          ...options.headers,
        },
      });
      
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '60', 10);
        throw new RateLimitError(retryAfter);
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ExternalServiceError(
          'Reddit API',
          errorData.message || `HTTP ${response.status} ${response.statusText}`
        );
      }
      
      return response.json();
    } catch (error) {
      if (error instanceof RateLimitError) throw error;
      throw new ExternalServiceError('Reddit API', getRedditErrorMessage(error as Error));
    }
  }

  /**
   * Search for posts in a subreddit
   */
  async searchPosts(
    subreddit: string,
    options: ScraperOptions = {}
  ): Promise<ScraperResult<RedditPost>> {
    const startTime = Date.now();
    const validatedSubreddit = parseSubreddit(subreddit);
    
    if (!validatedSubreddit) {
      throw new ValidationError(`Invalid subreddit: ${subreddit}`);
    }
    
    const {
      limit = 25,
      time = 'month',
      sort = 'new',
      forceRefresh = false,
      ...queryParams
    } = options;
    
    const cacheKey = `subreddit:${validatedSubreddit}:${sort}:${time}:${limit}`;
    
    // Check cache if not forcing refresh
    if (!forceRefresh) {
      const cached = await subredditCache.get<ScraperResult<RedditPost>>(cacheKey);
      if (cached) {
        return {
          ...cached,
          metadata: {
            ...cached.metadata,
            cacheHit: true,
          },
        };
      }
    }
    
    try {
      const url = new URL(`${this.baseUrl}/r/${validatedSubreddit}/${sort}.json`);
      url.searchParams.append('limit', limit.toString());
      url.searchParams.append('t', time);
      
      // Add any additional query parameters
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          url.searchParams.append(key, String(value));
        }
      });
      
      const data = await this.makeRequest<{ data: { children: Array<{ data: RedditPost }> } }>(
        url.toString()
      );
      
      const posts = data.data.children.map(child => child.data);
      const result: ScraperResult<RedditPost> = {
        data: posts,
        metadata: {
          total: posts.length,
          after: null, // Would come from pagination
          before: null, // Would come from pagination
          pageSize: limit,
          executionTime: Date.now() - startTime,
          cacheHit: false,
        },
      };
      
      // Cache the result
      await subredditCache.set(cacheKey, result, CACHE_TTL.SUBREDDIT);
      
      return result;
    } catch (error) {
      console.error(`Error searching posts in r/${validatedSubreddit}:`, error);
      throw error;
    }
  }

  /**
   * Get user profile information
   */
  async getUserProfile(
    username: string,
    options: { forceRefresh?: boolean } = {}
  ) {
    const validatedUsername = parseUsername(username);
    
    if (!validatedUsername) {
      throw new ValidationError(`Invalid username: ${username}`);
    }
    
    const cacheKey = `user:${validatedUsername}`;
    
    // Check cache if not forcing refresh
    if (!options.forceRefresh) {
      const cached = await userProfileCache.get<any>(cacheKey);
      if (cached) {
        return { ...cached, _cached: true };
      }
    }
    
    try {
      const url = `${this.baseUrl}/user/${validatedUsername}/about.json`;
      const data = await this.makeRequest<{ data: any }>(url);
      
      if (!data || !data.data) {
        throw new Error('Invalid user profile data');
      }
      
      const profile = {
        id: data.data.id,
        username: data.data.name,
        createdUtc: data.data.created_utc,
        linkKarma: data.data.link_karma,
        commentKarma: data.data.comment_karma,
        isGold: data.data.is_gold,
        isMod: data.data.is_mod,
        verified: data.data.verified,
        hasVerifiedEmail: data.data.has_verified_email,
        iconImg: data.data.icon_img,
      };
      
      // Cache the profile
      await userProfileCache.set(cacheKey, profile, CACHE_TTL.USER_PROFILE);
      
      return profile;
    } catch (error) {
      console.error(`Error fetching profile for u/${validatedUsername}:`, error);
      
      // Return a partial profile if available in the error
      if (error instanceof ExternalServiceError && error.details?.data) {
        return {
          username: validatedUsername,
          error: error.message,
          ...error.details.data,
        };
      }
      
      throw error;
    }
  }
}

  /**
   * Get top posts from a subreddit
   */
  async getTopPosts(
    subreddit: string,
    options: Omit<ScraperOptions, 'sort'> = {}
  ): Promise<ScraperResult<RedditPost>> {
    return this.searchPosts(subreddit, { ...options, sort: 'top' });
  }
  
  /**
   * Get hot posts from a subreddit
   */
  async getHotPosts(
    subreddit: string,
    options: Omit<ScraperOptions, 'sort'> = {}
  ): Promise<ScraperResult<RedditPost>> {
    return this.searchPosts(subreddit, { ...options, sort: 'hot' });
  }
  
  /**
   * Get user's submitted posts
   */
  async getUserPosts(
    username: string,
    options: Omit<ScraperOptions, 'sort'> = {}
  ): Promise<ScraperResult<RedditPost>> {
    const validatedUsername = parseUsername(username);
    if (!validatedUsername) {
      throw new ValidationError(`Invalid username: ${username}`);
    }
    
    const url = `${this.baseUrl}/user/${validatedUsername}/submitted.json`;
    const params = new URLSearchParams({
      limit: String(options.limit || 25),
      ...(options.time && { t: options.time }),
    });
    
    const data = await this.makeRequest<{ data: { children: Array<{ data: RedditPost }> } }>(
      `${url}?${params}`
    );
    
    return {
      data: data.data.children.map(child => formatRedditPost(child.data)),
      metadata: {
        total: data.data.children.length,
        after: data.data.after || null,
        before: data.data.before || null,
        pageSize: options.limit || 25,
        executionTime: 0, // Would be calculated in a real implementation
        cacheHit: false,
      },
    };
  }
}

// Export a singleton instance
export const redditScraper = new RedditScraper();
