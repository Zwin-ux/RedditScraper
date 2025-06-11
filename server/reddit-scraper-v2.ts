import fs from 'fs/promises';
import path from 'path';

export interface RedditPost {
  id: string;
  title: string;
  url: string;
  author: string;
  upvotes: number;
  downvotes?: number;
  score: number;
  num_comments: number;
  created_utc: number;
  created_date: string;
  subreddit: string;
  permalink: string;
  selftext: string;
  is_self: boolean;
  flair_text?: string;
  post_hint?: string;
  domain: string;
  thumbnail?: string;
  over_18: boolean;
  stickied: boolean;
  locked: boolean;
  archived: boolean;
  gilded: number;
  awards_received?: number;
  source: 'reddit_api' | 'pushshift';
}

export interface ScrapingOptions {
  subreddit: string;
  limit?: number;
  timeframe?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  sort?: 'hot' | 'new' | 'top' | 'rising';
  flairFilter?: string[];
  keywordFilter?: string[];
  includeComments?: boolean;
  outputFormat?: 'json' | 'csv';
  outputFile?: string;
  maxRetries?: number;
  retryDelay?: number;
  enableLogging?: boolean;
  usePushshift?: boolean;
  minScore?: number;
  maxAge?: number; // days
}

export interface ScrapingResult {
  posts: RedditPost[];
  totalFound: number;
  source: string;
  errors: string[];
  rateLimited: boolean;
  executionTime: number;
  subreddit: string;
  timestamp: string;
}

class RedditScraperV2 {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private requestCount: number = 0;
  private lastRequestTime: number = 0;
  private readonly baseUrl = 'https://oauth.reddit.com';
  private readonly authUrl = 'https://www.reddit.com/api/v1/access_token';
  private readonly pushShiftUrl = 'https://api.pushshift.io/reddit/search/submission';
  private readonly minRequestInterval = 1000; // 1 second between requests
  private readonly maxRequestsPerMinute = 60;

  constructor(private options: ScrapingOptions = { subreddit: '' }) {
    this.log('Initializing Reddit Scraper V2');
  }

  private log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
    if (this.options.enableLogging !== false) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
      console.log(logMessage);
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      await this.sleep(this.minRequestInterval - timeSinceLastRequest);
    }
    
    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  private async authenticate(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('Reddit API credentials not configured. Set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET environment variables.');
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    this.log('Authenticating with Reddit API');
    
    await this.rateLimit();
    
    try {
      const response = await fetch(this.authUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'RedditScraperV2/2.0.0'
        },
        body: 'grant_type=client_credentials'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Authentication failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer
      
      this.log('Successfully authenticated with Reddit API');
      return this.accessToken!;
    } catch (error) {
      this.log(`Authentication error: ${error}`, 'error');
      throw error;
    }
  }

  private async makeRedditRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const token = await this.authenticate();
    const url = new URL(endpoint, this.baseUrl);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    await this.rateLimit();

    const maxRetries = this.options.maxRetries || 3;
    const retryDelay = this.options.retryDelay || 2000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'RedditScraperV2/2.0.0'
          }
        });

        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('retry-after') || '60', 10);
          this.log(`Rate limited. Waiting ${retryAfter} seconds before retry ${attempt}/${maxRetries}`, 'warn');
          await this.sleep(retryAfter * 1000);
          continue;
        }

        if (!response.ok) {
          throw new Error(`Reddit API request failed: ${response.status} ${response.statusText}`);
        }

        return response.json();
      } catch (error) {
        this.log(`Request attempt ${attempt}/${maxRetries} failed: ${error}`, 'warn');
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        await this.sleep(retryDelay * attempt);
      }
    }
  }

  private async fetchFromPushshift(subreddit: string, options: ScrapingOptions): Promise<RedditPost[]> {
    this.log('Falling back to Pushshift API');
    
    const params: Record<string, any> = {
      subreddit: subreddit,
      size: Math.min(options.limit || 100, 500),
      sort: 'desc',
      sort_type: 'created_utc'
    };

    if (options.timeframe && options.timeframe !== 'all') {
      const now = Math.floor(Date.now() / 1000);
      const timeframes = {
        hour: 3600,
        day: 86400,
        week: 604800,
        month: 2592000,
        year: 31536000
      };
      params.after = now - timeframes[options.timeframe];
    }

    if (options.minScore) {
      params.score = `>${options.minScore}`;
    }

    try {
      await this.rateLimit();
      
      const url = new URL(this.pushShiftUrl);
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value.toString());
      });

      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'RedditScraperV2/2.0.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Pushshift API failed: ${response.status}`);
      }

      const data = await response.json();
      const posts: RedditPost[] = [];

      if (data.data && Array.isArray(data.data)) {
        for (const post of data.data) {
          posts.push(this.transformPushshiftPost(post, subreddit));
        }
      }

      this.log(`Fetched ${posts.length} posts from Pushshift`);
      return posts;
    } catch (error) {
      this.log(`Pushshift fallback failed: ${error}`, 'error');
      return [];
    }
  }

  private transformRedditPost(post: any, subreddit: string): RedditPost {
    return {
      id: post.id,
      title: post.title || '',
      url: post.url || '',
      author: post.author || '[deleted]',
      upvotes: post.ups || 0,
      downvotes: post.downs || 0,
      score: post.score || 0,
      num_comments: post.num_comments || 0,
      created_utc: post.created_utc || 0,
      created_date: new Date((post.created_utc || 0) * 1000).toISOString(),
      subreddit: subreddit,
      permalink: `https://reddit.com${post.permalink || ''}`,
      selftext: post.selftext || '',
      is_self: post.is_self || false,
      flair_text: post.link_flair_text || undefined,
      post_hint: post.post_hint || undefined,
      domain: post.domain || '',
      thumbnail: post.thumbnail || undefined,
      over_18: post.over_18 || false,
      stickied: post.stickied || false,
      locked: post.locked || false,
      archived: post.archived || false,
      gilded: post.gilded || 0,
      awards_received: post.total_awards_received || 0,
      source: 'reddit_api'
    };
  }

  private transformPushshiftPost(post: any, subreddit: string): RedditPost {
    return {
      id: post.id,
      title: post.title || '',
      url: post.url || '',
      author: post.author || '[deleted]',
      upvotes: post.score || 0,
      score: post.score || 0,
      num_comments: post.num_comments || 0,
      created_utc: post.created_utc || 0,
      created_date: new Date((post.created_utc || 0) * 1000).toISOString(),
      subreddit: subreddit,
      permalink: `https://reddit.com/r/${subreddit}/comments/${post.id}/`,
      selftext: post.selftext || '',
      is_self: post.is_self || false,
      flair_text: post.link_flair_text || undefined,
      domain: post.domain || '',
      over_18: post.over_18 || false,
      stickied: post.stickied || false,
      locked: post.locked || false,
      archived: post.archived || false,
      gilded: post.gilded || 0,
      source: 'pushshift'
    };
  }

  private applyFilters(posts: RedditPost[], options: ScrapingOptions): RedditPost[] {
    let filtered = posts;

    // Flair filter
    if (options.flairFilter && options.flairFilter.length > 0) {
      filtered = filtered.filter(post => 
        post.flair_text && 
        options.flairFilter!.some(flair => 
          post.flair_text!.toLowerCase().includes(flair.toLowerCase())
        )
      );
    }

    // Keyword filter
    if (options.keywordFilter && options.keywordFilter.length > 0) {
      filtered = filtered.filter(post => {
        const searchText = `${post.title} ${post.selftext}`.toLowerCase();
        return options.keywordFilter!.some(keyword => 
          searchText.includes(keyword.toLowerCase())
        );
      });
    }

    // Score filter
    if (options.minScore) {
      filtered = filtered.filter(post => post.score >= options.minScore!);
    }

    // Age filter
    if (options.maxAge) {
      const maxAgeTimestamp = Date.now() / 1000 - (options.maxAge * 24 * 60 * 60);
      filtered = filtered.filter(post => post.created_utc >= maxAgeTimestamp);
    }

    return filtered;
  }

  async scrapeSubreddit(options: ScrapingOptions): Promise<ScrapingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let posts: RedditPost[] = [];
    let rateLimited = false;
    let source = 'reddit_api';

    this.options = { ...this.options, ...options };
    this.log(`Starting scrape of r/${options.subreddit} with options: ${JSON.stringify(options)}`);

    try {
      // Try Reddit API first
      const endpoint = `/r/${options.subreddit}/${options.sort || 'hot'}.json`;
      const params: Record<string, any> = {
        limit: Math.min(options.limit || 100, 100),
        raw_json: 1
      };

      if (options.timeframe && options.sort === 'top') {
        params.t = options.timeframe;
      }

      try {
        const data = await this.makeRedditRequest(endpoint, params);
        
        if (data.data && data.data.children) {
          for (const child of data.data.children) {
            if (child.data) {
              posts.push(this.transformRedditPost(child.data, options.subreddit));
            }
          }
        }

        this.log(`Fetched ${posts.length} posts from Reddit API`);
      } catch (error) {
        this.log(`Reddit API failed: ${error}`, 'error');
        errors.push(`Reddit API error: ${error instanceof Error ? error.message : String(error)}`);
        
        const errorStr = error instanceof Error ? error.message : String(error);
        if (errorStr.includes('429') || errorStr.includes('rate limit')) {
          rateLimited = true;
        }

        // Fallback to Pushshift if enabled
        if (options.usePushshift !== false) {
          posts = await this.fetchFromPushshift(options.subreddit, options);
          source = 'pushshift';
        }
      }

      // Apply filters
      const originalCount = posts.length;
      posts = this.applyFilters(posts, options);
      this.log(`Applied filters: ${originalCount} -> ${posts.length} posts`);

      // Sort posts if needed
      if (options.sort === 'new') {
        posts.sort((a, b) => b.created_utc - a.created_utc);
      } else if (options.sort === 'top') {
        posts.sort((a, b) => b.score - a.score);
      }

      // Limit results
      if (options.limit) {
        posts = posts.slice(0, options.limit);
      }

    } catch (error) {
      this.log(`Critical error during scraping: ${error}`, 'error');
      errors.push(`Critical error: ${error instanceof Error ? error.message : String(error)}`);
    }

    const result: ScrapingResult = {
      posts,
      totalFound: posts.length,
      source,
      errors,
      rateLimited,
      executionTime: Date.now() - startTime,
      subreddit: options.subreddit,
      timestamp: new Date().toISOString()
    };

    this.log(`Scraping completed: ${posts.length} posts in ${result.executionTime}ms`);

    // Save output if specified
    if (options.outputFile) {
      await this.saveOutput(result, options);
    }

    return result;
  }

  private async saveOutput(result: ScrapingResult, options: ScrapingOptions): Promise<void> {
    try {
      const outputDir = path.dirname(options.outputFile!);
      await fs.mkdir(outputDir, { recursive: true });

      if (options.outputFormat === 'csv') {
        await this.saveAsCSV(result.posts, options.outputFile!);
      } else {
        await this.saveAsJSON(result, options.outputFile!);
      }

      this.log(`Output saved to ${options.outputFile}`);
    } catch (error) {
      this.log(`Failed to save output: ${error}`, 'error');
    }
  }

  private async saveAsJSON(result: ScrapingResult, filePath: string): Promise<void> {
    const jsonOutput = JSON.stringify(result, null, 2);
    await fs.writeFile(filePath, jsonOutput, 'utf-8');
  }

  private async saveAsCSV(posts: RedditPost[], filePath: string): Promise<void> {
    const headers = [
      'id', 'title', 'url', 'author', 'upvotes', 'score', 'num_comments',
      'created_date', 'subreddit', 'permalink', 'selftext', 'is_self',
      'flair_text', 'domain', 'over_18', 'source'
    ];

    const csvRows = [headers.join(',')];
    
    for (const post of posts) {
      const row = headers.map(header => {
        const value = post[header as keyof RedditPost];
        if (typeof value === 'string') {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      });
      csvRows.push(row.join(','));
    }

    await fs.writeFile(filePath, csvRows.join('\n'), 'utf-8');
  }

  // Batch scraping multiple subreddits
  async scrapeMultipleSubreddits(subreddits: string[], baseOptions: Omit<ScrapingOptions, 'subreddit'>): Promise<ScrapingResult[]> {
    const results: ScrapingResult[] = [];
    
    for (const subreddit of subreddits) {
      this.log(`Scraping r/${subreddit}...`);
      
      try {
        const result = await this.scrapeSubreddit({
          ...baseOptions,
          subreddit
        });
        results.push(result);
        
        // Delay between subreddits to avoid rate limiting
        await this.sleep(2000);
      } catch (error) {
        this.log(`Failed to scrape r/${subreddit}: ${error}`, 'error');
        results.push({
          posts: [],
          totalFound: 0,
          source: 'error',
          errors: [error instanceof Error ? error.message : String(error)],
          rateLimited: false,
          executionTime: 0,
          subreddit,
          timestamp: new Date().toISOString()
        });
      }
    }

    return results;
  }

  // Get statistics for scraped data
  getStats(results: ScrapingResult[]): any {
    const totalPosts = results.reduce((sum, r) => sum + r.totalFound, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const avgExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0) / results.length;
    
    const sourceBreakdown = results.reduce((acc, r) => {
      acc[r.source] = (acc[r.source] || 0) + r.totalFound;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalPosts,
      totalErrors,
      avgExecutionTime,
      sourceBreakdown,
      subredditsScraped: results.length,
      rateLimitedRequests: results.filter(r => r.rateLimited).length
    };
  }
}

export { RedditScraperV2 };