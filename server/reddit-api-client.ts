import { analyzePostRelevance, analyzeCreatorContent } from './gemini';

export interface RedditApiPost {
  id: string;
  title: string;
  selftext: string;
  author: string;
  subreddit: string;
  ups: number;
  num_comments: number;
  created_utc: number;
  url: string;
  permalink: string;
  over_18: boolean;
  stickied: boolean;
  is_self: boolean;
}

export interface RedditApiUser {
  name: string;
  total_karma: number;
  comment_karma: number;
  link_karma: number;
  created_utc: number;
  is_verified: boolean;
  has_verified_email: boolean;
  subreddit?: {
    display_name: string;
    subscribers: number;
  };
}

export interface RedditSearchResult {
  posts: RedditApiPost[];
  users: string[];
  totalResults: number;
}

class RedditApiClient {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private readonly baseUrl = 'https://oauth.reddit.com';
  private readonly authUrl = 'https://www.reddit.com/api/v1/access_token';
  
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('Reddit API credentials not configured');
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    console.log('Attempting Reddit API authentication...');
    
    try {
      const response = await fetch(this.authUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'RedditContentAnalyzer/1.0.0'
        },
        body: 'grant_type=client_credentials'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Reddit API auth failed: ${response.status} - ${errorText}`);
        throw new Error(`Token request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer
      
      return this.accessToken!;
    } catch (error) {
      console.error('Failed to get Reddit access token:', error);
      throw error;
    }
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const token = await this.getAccessToken();
    const url = new URL(endpoint, this.baseUrl);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'RedditAnalyzer/1.0 by YourApp'
      }
    });

    if (!response.ok) {
      throw new Error(`Reddit API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async searchSubreddit(subreddit: string, query?: string, limit: number = 100): Promise<RedditSearchResult> {
    try {
      const endpoint = query 
        ? `/r/${subreddit}/search`
        : `/r/${subreddit}/hot`;
      
      const params: Record<string, any> = {
        limit: Math.min(limit, 100),
        raw_json: 1
      };
      
      if (query) {
        params.q = query;
        params.restrict_sr = 'true';
        params.sort = 'relevance';
        params.t = 'month';
      }

      const data = await this.makeRequest(endpoint, params);
      const posts: RedditApiPost[] = [];
      const users = new Set<string>();

      if (data.data && data.data.children) {
        for (const child of data.data.children) {
          const post = child.data;
          
          // Skip removed/deleted content
          if (post.author === '[deleted]' || post.author === '[removed]') continue;
          if (post.removed_by_category) continue;
          
          const redditPost: RedditApiPost = {
            id: post.id,
            title: post.title,
            selftext: post.selftext || '',
            author: post.author,
            subreddit: post.subreddit,
            ups: post.ups || 0,
            num_comments: post.num_comments || 0,
            created_utc: post.created_utc,
            url: post.url,
            permalink: `https://reddit.com${post.permalink}`,
            over_18: post.over_18 || false,
            stickied: post.stickied || false,
            is_self: post.is_self || false
          };

          posts.push(redditPost);
          if (post.author) {
            users.add(post.author);
          }
        }
      }

      return {
        posts,
        users: Array.from(users),
        totalResults: posts.length
      };
    } catch (error) {
      console.error(`Reddit API failed for r/${subreddit}:`, error);
      // Return empty result - let the calling code handle fallback
      throw error;
    }
  }

  async getUserProfile(username: string): Promise<RedditApiUser | null> {
    try {
      const data = await this.makeRequest(`/user/${username}/about`);
      
      if (!data.data) return null;
      
      const user = data.data;
      return {
        name: user.name,
        total_karma: user.total_karma || 0,
        comment_karma: user.comment_karma || 0,
        link_karma: user.link_karma || 0,
        created_utc: user.created_utc,
        is_verified: user.is_verified || false,
        has_verified_email: user.has_verified_email || false,
        subreddit: user.subreddit ? {
          display_name: user.subreddit.display_name,
          subscribers: user.subreddit.subscribers || 0
        } : undefined
      };
    } catch (error) {
      console.error(`Failed to get user profile for ${username}:`, error);
      return null;
    }
  }

  async getUserPosts(username: string, limit: number = 25): Promise<RedditApiPost[]> {
    try {
      const data = await this.makeRequest(`/user/${username}/submitted`, {
        limit: Math.min(limit, 100),
        sort: 'top',
        t: 'month',
        raw_json: 1
      });

      const posts: RedditApiPost[] = [];
      
      if (data.data && data.data.children) {
        for (const child of data.data.children) {
          const post = child.data;
          
          if (post.author === '[deleted]' || post.author === '[removed]') continue;
          
          posts.push({
            id: post.id,
            title: post.title,
            selftext: post.selftext || '',
            author: post.author,
            subreddit: post.subreddit,
            ups: post.ups || 0,
            num_comments: post.num_comments || 0,
            created_utc: post.created_utc,
            url: post.url,
            permalink: `https://reddit.com${post.permalink}`,
            over_18: post.over_18 || false,
            stickied: post.stickied || false,
            is_self: post.is_self || false
          });
        }
      }

      return posts;
    } catch (error) {
      console.error(`Failed to get posts for user ${username}:`, error);
      return [];
    }
  }

  // Enhanced search with Gemini AI post-processing
  async searchWithAIAnalysis(subreddit: string, query?: string, limit: number = 50): Promise<{
    posts: RedditApiPost[];
    users: string[];
    relevantPosts: RedditApiPost[];
    topCreators: Array<{
      username: string;
      score: number;
      postCount: number;
      totalUpvotes: number;
      avgUpvotes: number;
    }>;
  }> {
    const searchResult = await this.searchSubreddit(subreddit, query, limit);
    
    // Use Gemini to analyze post relevance
    const relevantPosts: RedditApiPost[] = [];
    for (const post of searchResult.posts) {
      try {
        const analysis = await analyzePostRelevance(post.title, post.selftext);
        if (analysis.isRelevant) {
          relevantPosts.push(post);
        }
      } catch (error) {
        // If analysis fails, include post anyway
        relevantPosts.push(post);
      }
    }

    // Calculate creator scores
    const creatorStats = new Map<string, {
      posts: RedditApiPost[];
      totalUpvotes: number;
    }>();

    for (const post of relevantPosts) {
      const stats = creatorStats.get(post.author) || { posts: [], totalUpvotes: 0 };
      stats.posts.push(post);
      stats.totalUpvotes += post.ups;
      creatorStats.set(post.author, stats);
    }

    const topCreators = Array.from(creatorStats.entries())
      .map(([username, stats]) => ({
        username,
        score: stats.totalUpvotes + (stats.posts.length * 10), // Engagement score
        postCount: stats.posts.length,
        totalUpvotes: stats.totalUpvotes,
        avgUpvotes: stats.posts.length > 0 ? Math.round(stats.totalUpvotes / stats.posts.length) : 0
      }))
      .filter(creator => creator.postCount >= 1) // At least 1 relevant post
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    return {
      posts: searchResult.posts,
      users: searchResult.users,
      relevantPosts,
      topCreators
    };
  }
}

export const redditApiClient = new RedditApiClient();