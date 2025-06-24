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

// Interface for Reddit user profile data
export interface RedditUserProfile {
  id: string;
  username: string;
  createdUtc: number;
  linkKarma: number;
  commentKarma: number;
  isGold: boolean;
  isMod: boolean;
  verified: boolean;
  hasVerifiedEmail: boolean;
  iconImg: string | null;
}
import { ExternalServiceError, RateLimitError } from '../utils/errors.js';

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

// Define the shape of a successful result
export interface ScraperSuccessResult<T> {
  data: T[];
  metadata: {
    total: number;
    after: string | null;
    before: string | null;
    pageSize: number;
    executionTime: number;
    cacheHit: boolean;
  };
  error?: never; // Ensure error is not present in success case
}

// Define the shape of an error result
export interface ScraperErrorResult {
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
  data: [];
  metadata: {
    total: 0;
    after: null;
    before: null;
    pageSize: 0;
    executionTime: 0;
    cacheHit: false;
  };
}

// Union type for the result
export type ScraperResult<T> = ScraperSuccessResult<T> | ScraperErrorResult;

// Helper function to create an error result
function createErrorResult(error: { message: string; code?: string; details?: unknown }): ScraperErrorResult {
  return {
    error: {
      message: error.message,
      code: error.code,
      details: error.details
    },
    data: [],
    metadata: {
      total: 0,
      after: null,
      before: null,
      pageSize: 0,
      executionTime: 0,
      cacheHit: false,
    }
  };
}

export class RedditScraper {
  private userAgent: string;
  private baseUrl = 'https://www.reddit.com';
  
  constructor() {
    this.userAgent = config.isDevelopment 
      ? 'RedditScraper/1.0 (Development)' 
      : 'RedditScraper/1.0';
  }
  
  private async handleRateLimit<T>(fn: () => Promise<T>): Promise<T> {
    try {
      await redditLimiter.removeTokens(1);
      return await fn();
    } catch (error) {
      if (error instanceof RateLimitError) throw error;
      throw new ExternalServiceError('Reddit API', getRedditErrorMessage(error as Error));
    }
  }

  private async makeRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
    const fetchWithRetry = async (): Promise<T> => {
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
      
      return response.json() as Promise<T>;
    };
    
    return this.handleRateLimit(fetchWithRetry);
  }

  /**
   * Search for posts in a subreddit
   */
  public async searchPosts(
    subreddit: string,
    options: ScraperOptions = {}
  ): Promise<ScraperResult<RedditPost>> {
    const startTime = Date.now();
    const validatedSubreddit = parseSubreddit(subreddit);
    if (!validatedSubreddit) {
      return createErrorResult({
        message: `Invalid subreddit name: ${subreddit}`,
        code: 'INVALID_SUBREDDIT',
      });
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
      const cached = await subredditCache.get<ScraperSuccessResult<RedditPost>>(cacheKey);
      if (cached && typeof cached === 'object' && 'data' in cached && Array.isArray(cached.data)) {
        const defaultMetadata = {
          total: 0,
          after: null as string | null,
          before: null as string | null,
          pageSize: 0,
          executionTime: 0,
          cacheHit: false,
        };
        
        const cachedMetadata = (cached as any).metadata || defaultMetadata;
        const safeMetadata = {
          total: typeof cachedMetadata.total === 'number' ? cachedMetadata.total : defaultMetadata.total,
          after: cachedMetadata.after === null || typeof cachedMetadata.after === 'string' 
            ? cachedMetadata.after 
            : defaultMetadata.after,
          before: cachedMetadata.before === null || typeof cachedMetadata.before === 'string' 
            ? cachedMetadata.before 
            : defaultMetadata.before,
          pageSize: typeof cachedMetadata.pageSize === 'number' ? cachedMetadata.pageSize : defaultMetadata.pageSize,
          executionTime: 0,
          cacheHit: true,
        };
        
        const result: ScraperSuccessResult<RedditPost> = {
          data: cached.data,
          metadata: safeMetadata,
        };
        return result;
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
      
      const response = await this.makeRequest<{ 
        data: { 
          children: Array<{ data: RedditPost }>;
          after: string | null;
          before: string | null;
        } 
      }>(url.toString());
      
      // Ensure response has the expected structure
      if (!response?.data?.children) {
        return createErrorResult({
          message: 'Invalid response from Reddit API',
          code: 'INVALID_RESPONSE',
          details: response
        });
      }
      
      const posts = response.data.children.map(child => child.data);
      const metadata = {
        total: posts.length,
        after: response.data.after || null,
        before: response.data.before || null,
        pageSize: limit,
        executionTime: Date.now() - startTime,
        cacheHit: false,
      };
      
      const result: ScraperSuccessResult<RedditPost> = {
        data: posts,
        metadata
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
   * @param username - The Reddit username to fetch profile for
   * @param options - Options for the request
   * @returns A promise that resolves to the user profile or an error
   */
  async getUserProfile(
    username: string,
    options: { forceRefresh?: boolean } = {}
  ): Promise<ScraperResult<RedditUserProfile>> {
    const startTime = Date.now();
    const validatedUsername = parseUsername(username);
    if (!validatedUsername) {
      return createErrorResult({
        message: `Invalid username: ${username}`,
        code: 'INVALID_USERNAME'
      });
    }

    const cacheKey = `user_profile:${validatedUsername}`;
    
    // Check cache if not forcing refresh
    if (!options.forceRefresh) {
      const cached = await userProfileCache.get<RedditUserProfile>(cacheKey);
      if (cached && typeof cached === 'object' && 'id' in cached && 'username' in cached) {
        const profile = cached as RedditUserProfile;
        const result: ScraperSuccessResult<RedditUserProfile> = {
          data: [profile],
          metadata: {
            total: 1,
            after: null,
            before: null,
            pageSize: 1,
            executionTime: 0,
            cacheHit: true,
          }
        };
        return result;
      }
    }

    try {
      const url = `${this.baseUrl}/user/${validatedUsername}/about.json`;
      const response = await this.makeRequest<{ data: RedditUserProfile }>(url);
      const executionTime = Date.now() - startTime;
      
      if (!response || !response.data) {
        return createErrorResult({
          message: 'Invalid user profile data',
          code: 'INVALID_RESPONSE',
        });
      }
      
      const profile = response.data;
      
      // Cache the profile
      await userProfileCache.set(cacheKey, profile);
      
      const result: ScraperSuccessResult<RedditUserProfile> = {
        data: [profile],
        metadata: {
          total: 1,
          after: null,
          before: null,
          pageSize: 1,
          executionTime,
          cacheHit: false,
        }
      };
      
      return result;
          code: 'INVALID_RESPONSE'
        });
      }
      
      const profile: RedditUserProfile = {
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
      
      return {
        data: [profile],
        metadata: {
          total: 1,
          after: null,
          before: null,
          pageSize: 1,
          executionTime,
          cacheHit: false,
        }
      };
    } catch (error) {
      console.error(`Error fetching profile for u/${validatedUsername}:`, error);
      
      if (error instanceof ExternalServiceError) {
        return createErrorResult({
          message: error.message,
          code: error.code || 'EXTERNAL_SERVICE_ERROR',
          details: error.details
        });
      }
      
      return createErrorResult({
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        code: 'FETCH_ERROR',
        details: error
      });
    }
  }

  /**
   * Get top posts from a subreddit
   * @param subreddit - The subreddit name to fetch top posts from
   * @param options - Additional options for the request
   */
  public async getTopPosts(
    subreddit: string,
    options: Omit<ScraperOptions, 'sort'> = {}
  ): Promise<ScraperResult<RedditPost>> {
    return this.searchPosts(subreddit, { ...options, sort: 'top' });
  }
  
  /**
   * Get hot posts from a subreddit
   * @param subreddit - The subreddit name to fetch hot posts from
   * @param options - Additional options for the request
   */
  public async getHotPosts(
    subreddit: string,
    options: Omit<ScraperOptions, 'sort'> = {}
  ): Promise<ScraperResult<RedditPost>> {
    return this.searchPosts(subreddit, { ...options, sort: 'hot' });
  }
  
  /**
   * Get user's submitted posts
   * @param username - The Reddit username to fetch posts for
   * @param options - Additional options for the request
   */
  public async getUserPosts(
    username: string,
    options: Omit<ScraperOptions, 'sort'> & { forceRefresh?: boolean } = {}
  ): Promise<ScraperResult<RedditPost>> {
    try {
      const validatedUsername = parseUsername(username);
      if (!validatedUsername) {
        return {
          error: { message: `Invalid username: ${username}`, code: 'INVALID_USERNAME' },
          data: [],
          metadata: {
            total: 0,
            after: null,
            before: null,
            pageSize: 0,
            executionTime: 0,
            cacheHit: false,
          },
        };
      }
      
      const cacheKey = `user_posts:${validatedUsername}:${JSON.stringify(options)}`;
      
      // Define interface for cached data structure
      interface CachedPosts {
        data: RedditPost[];
        metadata: {
          total: number;
          after: string | null;
          before: string | null;
          pageSize: number;
          executionTime: number;
          cacheHit: boolean;
        };
      }

      // Helper function to validate cached data
      const isValidCachedPosts = (data: unknown): data is CachedPosts => {
        if (!data || typeof data !== 'object') return false;
        
        const d = data as Record<string, unknown>;
        const metadata = d.metadata as Record<string, unknown> | null | undefined;
        
        return (
          Array.isArray(d.data) &&
          metadata !== null &&
          typeof metadata === 'object' &&
          metadata !== undefined &&
          'total' in metadata &&
          'pageSize' in metadata &&
          typeof metadata.total === 'number' &&
          typeof metadata.pageSize === 'number' &&
          (metadata.after === null || typeof metadata.after === 'string') &&
          (metadata.before === null || typeof metadata.before === 'string') &&
          typeof metadata.executionTime === 'number' &&
          typeof metadata.cacheHit === 'boolean'
        );
      };

      // Check cache if not forcing refresh
      if (!options.forceRefresh) {
        const cached = await subredditCache.get<unknown>(cacheKey);
        if (cached && isValidCachedPosts(cached)) {
          return {
            data: cached.data,
            metadata: {
              total: cached.metadata.total || 0,
              after: cached.metadata.after || null,
              before: cached.metadata.before || null,
              pageSize: cached.metadata.pageSize || 0,
              executionTime: 0, // Reset execution time for cached results
              cacheHit: true,
            },
          };
        }
      }
      
      const url = `${this.baseUrl}/user/${validatedUsername}/submitted.json`;
      const params = new URLSearchParams({
        limit: String(options.limit || 25),
        ...(options.time && { t: options.time }),
      });
      
      const startTime = Date.now();
      const response = await this.makeRequest<{ 
        data: { 
          children: Array<{ data: RedditPost }>;
          after: string | null;
          before: string | null;
        } 
      }>(`${url}?${params}`);
      
      const executionTime = Date.now() - startTime;
      
      const result: ScraperSuccessResult<RedditPost> = {
        data: response.data.children.map(child => ({
          ...formatRedditPost(child.data),
          score: child.data.score,
          num_comments: child.data.num_comments,
          created_utc: child.data.created_utc
        })),
        metadata: {
          total: response.data.children.length,
          after: response.data.after || null,
          before: response.data.before || null,
          pageSize: options.limit || 25,
          executionTime,
          cacheHit: false,
        },
      };
      
      // Cache the result
      await subredditCache.set(cacheKey, result, CACHE_TTL.SUBREDDIT);
      
      return result;
    } catch (error) {
      console.error(`Error fetching posts for user ${username}:`, error);
      return {
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          code: 'FETCH_ERROR',
          details: error
        },
        data: [],
        metadata: {
          total: 0,
          after: null,
          before: null,
          pageSize: 0,
          executionTime: 0,
          cacheHit: false,
        },
      };
    }
  }
}

// Export a singleton instance
export const redditScraper = new RedditScraper();
