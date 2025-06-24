export interface RealRedditPost {
  id: string;
  title: string;
  author: string;
  subreddit: string;
  ups: number;
  num_comments: number;
  created_utc: number;
  url: string;
  permalink: string;
  selftext: string;
  thumbnail?: string;
  is_self: boolean;
  domain: string;
}

class EnhancedRedditScraper {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  async authenticate(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Reddit API credentials not configured');
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'RedditContentAnalyzer/1.0.0'
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      throw new Error(`Reddit authentication failed: ${response.status}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;

    if (!this.accessToken) {
      throw new Error('Failed to retrieve access token from Reddit API');
    }

    return this.accessToken;
  }

  async scrapeSubredditPosts(subreddit: string, sort: 'hot' | 'new' | 'top' = 'hot', limit: number = 50): Promise<RealRedditPost[]> {
    const token = await this.authenticate();
    
    const url = `https://oauth.reddit.com/r/${subreddit}/${sort}`;
    const params = new URLSearchParams({
      limit: Math.min(limit, 100).toString(),
      raw_json: '1'
    });

    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'RedditContentAnalyzer/1.0.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Reddit API request failed: ${response.status}`);
    }

    const data = await response.json();
    const posts: RealRedditPost[] = [];

    if (data.data && data.data.children) {
      for (const child of data.data.children) {
        const post = child.data;
        
        if (post.author === '[deleted]' || post.author === 'AutoModerator') continue;
        if (post.removed_by_category) continue;

        posts.push({
          id: post.id,
          title: post.title,
          author: post.author,
          subreddit: post.subreddit,
          ups: post.ups || 0,
          num_comments: post.num_comments || 0,
          created_utc: post.created_utc,
          url: post.url,
          permalink: `https://reddit.com${post.permalink}`,
          selftext: post.selftext || '',
          thumbnail: post.thumbnail !== 'self' ? post.thumbnail : undefined,
          is_self: post.is_self || false,
          domain: post.domain || 'reddit.com'
        });
      }
    }

    return posts;
  }

  async searchSubreddit(subreddit: string, query: string, limit: number = 50): Promise<RealRedditPost[]> {
    const token = await this.authenticate();
    
    const url = `https://oauth.reddit.com/r/${subreddit}/search`;
    const params = new URLSearchParams({
      q: query,
      restrict_sr: 'true',
      sort: 'relevance',
      t: 'month',
      limit: Math.min(limit, 100).toString(),
      raw_json: '1'
    });

    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'RedditContentAnalyzer/1.0.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Reddit search failed: ${response.status}`);
    }

    const data = await response.json();
    const posts: RealRedditPost[] = [];

    if (data.data && data.data.children) {
      for (const child of data.data.children) {
        const post = child.data;
        
        if (post.author === '[deleted]' || post.author === 'AutoModerator') continue;
        if (post.removed_by_category) continue;

        posts.push({
          id: post.id,
          title: post.title,
          author: post.author,
          subreddit: post.subreddit,
          ups: post.ups || 0,
          num_comments: post.num_comments || 0,
          created_utc: post.created_utc,
          url: post.url,
          permalink: `https://reddit.com${post.permalink}`,
          selftext: post.selftext || '',
          thumbnail: post.thumbnail !== 'self' ? post.thumbnail : undefined,
          is_self: post.is_self || false,
          domain: post.domain || 'reddit.com'
        });
      }
    }

    return posts;
  }

  async getTopCreators(subreddit: string, timeframe: 'day' | 'week' | 'month' = 'week'): Promise<Array<{username: string, totalScore: number, postCount: number, posts: RealRedditPost[]}>> {
    const posts = await this.scrapeSubredditPosts(subreddit, 'top', 100);
    const creatorMap = new Map<string, {totalScore: number, postCount: number, posts: RealRedditPost[]}>();

    for (const post of posts) {
      if (!creatorMap.has(post.author)) {
        creatorMap.set(post.author, {
          totalScore: 0,
          postCount: 0,
          posts: []
        });
      }

      const creator = creatorMap.get(post.author)!;
      creator.totalScore += post.ups;
      creator.postCount += 1;
      creator.posts.push(post);
    }

    return Array.from(creatorMap.entries())
      .map(([username, data]) => ({
        username,
        ...data
      }))
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 50);
  }
}

export const enhancedRedditScraper = new EnhancedRedditScraper();