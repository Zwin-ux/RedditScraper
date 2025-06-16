import { analyzeCreatorContent } from './gemini';
import { storage } from './storage';

export interface EnhancedRedditCreator {
  username: string;
  totalKarma: number;
  linkKarma: number;
  commentKarma: number;
  accountAge: number; // days
  profileUrl: string;
  score: number;
  engagementRatio: number;
  activityLevel: 'high' | 'medium' | 'low';
  specializations: string[];
  recentPostsCount: number;
  averageUpvotes: number;
}

export interface RedditAgentConfig {
  subreddits: string[];
  keywords: string[];
  postLimit: number;
  minKarma: number;
  maxAge: number; // days
}

class EnhancedRedditAgent {
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
    
    const response = await fetch(this.authUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'RedditCreatorAgent/1.0.0'
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      throw new Error(`Reddit authentication failed: ${response.status}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer

    if (!this.accessToken) {
      throw new Error('Failed to retrieve access token from Reddit API');
    }

    return this.accessToken;
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const token = await this.getAccessToken();
    if (!token) {
      throw new Error('Failed to get Reddit access token');
    }
    
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined) {
        url.searchParams.append(key, params[key].toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'RedditCreatorAgent/1.0.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async searchSubredditCreators(config: RedditAgentConfig): Promise<EnhancedRedditCreator[]> {
    const seenUsers = new Set<string>();
    const creatorData = new Map<string, any>();

    console.log(`Searching ${config.subreddits.length} subreddits for AI creators...`);

    for (const subreddit of config.subreddits) {
      for (const keyword of config.keywords) {
        try {
          console.log(`Searching r/${subreddit} for "${keyword}"...`);
          
          const searchData = await this.makeRequest(`/r/${subreddit}/search`, {
            q: keyword,
            restrict_sr: true,
            sort: 'relevance',
            limit: config.postLimit,
            type: 'link'
          });

          if (searchData.data && searchData.data.children) {
            for (const child of searchData.data.children) {
              const post = child.data;
              const author = post.author;

              if (author && author !== '[deleted]' && author !== 'AutoModerator' && !seenUsers.has(author)) {
                seenUsers.add(author);
                
                try {
                  // Get detailed user information
                  const userInfo = await this.getUserDetails(author);
                  if (userInfo && this.meetsQualityCriteria(userInfo, config)) {
                    creatorData.set(author, {
                      ...userInfo,
                      posts: [post],
                      totalUpvotes: post.ups || 0,
                      postCount: 1
                    });
                  }
                } catch (userError) {
                  console.log(`Failed to get details for user ${author}: ${userError}`);
                  continue;
                }
              } else if (author && creatorData.has(author)) {
                // Update existing creator data with additional post
                const existing = creatorData.get(author);
                existing.posts.push(post);
                existing.totalUpvotes += post.ups || 0;
                existing.postCount += 1;
              }
            }
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error searching r/${subreddit} for "${keyword}": ${error}`);
          continue;
        }
      }
    }

    console.log(`Found ${creatorData.size} qualifying creators`);

    // Convert to enhanced creator format and calculate scores
    const enhancedCreators: EnhancedRedditCreator[] = [];
    
    for (const entry of Array.from(creatorData.entries())) {
      const [username, data] = entry;
      const enhanced = await this.enhanceCreatorData(username, data);
      enhancedCreators.push(enhanced);
    }

    // Sort by score (highest first)
    return enhancedCreators.sort((a, b) => b.score - a.score);
  }

  private async getUserDetails(username: string): Promise<any> {
    try {
      const userData = await this.makeRequest(`/user/${username}/about`);
      return userData.data;
    } catch (error) {
      console.log(`Failed to get user details for ${username}: ${error}`);
      return null;
    }
  }

  private meetsQualityCriteria(userInfo: any, config: RedditAgentConfig): boolean {
    const totalKarma = (userInfo.link_karma || 0) + (userInfo.comment_karma || 0);
    const accountAgeMs = Date.now() - (userInfo.created_utc * 1000);
    const accountAgeDays = accountAgeMs / (1000 * 60 * 60 * 24);

    return totalKarma >= config.minKarma && accountAgeDays <= config.maxAge;
  }

  private async enhanceCreatorData(username: string, data: any): Promise<EnhancedRedditCreator> {
    const totalKarma = (data.link_karma || 0) + (data.comment_karma || 0);
    const accountAgeMs = Date.now() - (data.created_utc * 1000);
    const accountAgeDays = Math.floor(accountAgeMs / (1000 * 60 * 60 * 24));
    
    // Calculate engagement ratio (comment karma vs link karma)
    const engagementRatio = data.link_karma > 0 ? data.comment_karma / data.link_karma : data.comment_karma;
    
    // Calculate activity level based on karma per day
    const karmaPerDay = accountAgeDays > 0 ? totalKarma / accountAgeDays : totalKarma;
    let activityLevel: 'high' | 'medium' | 'low' = 'low';
    if (karmaPerDay > 50) activityLevel = 'high';
    else if (karmaPerDay > 10) activityLevel = 'medium';

    // Calculate average upvotes from recent posts
    const averageUpvotes = data.postCount > 0 ? data.totalUpvotes / data.postCount : 0;

    // Advanced scoring algorithm inspired by the Python version
    const baseScore = totalKarma * 0.4;
    const engagementBonus = data.comment_karma * 0.3;
    const recentActivityBonus = averageUpvotes * 0.2;
    const consistencyBonus = Math.min(accountAgeDays / 365, 2) * 0.1 * totalKarma; // Account age factor
    
    const score = baseScore + engagementBonus + recentActivityBonus + consistencyBonus;

    // Analyze posts for specializations using AI
    let specializations: string[] = ['AI General'];
    try {
      if (data.posts && data.posts.length > 0) {
        const posts = data.posts.slice(0, 5).map((p: any) => ({ title: p.title, content: p.selftext || '' }));
        const analysis = await analyzeCreatorContent(posts, []);
        specializations = analysis.tags.length > 0 ? analysis.tags : ['AI General'];
      }
    } catch (error) {
      console.log(`Failed to analyze specializations for ${username}: ${error}`);
    }

    return {
      username,
      totalKarma,
      linkKarma: data.link_karma || 0,
      commentKarma: data.comment_karma || 0,
      accountAge: accountAgeDays,
      profileUrl: `https://reddit.com/u/${username}`,
      score: Math.round(score),
      engagementRatio: Math.round(engagementRatio * 100) / 100,
      activityLevel,
      specializations,
      recentPostsCount: data.postCount || 0,
      averageUpvotes: Math.round(averageUpvotes)
    };
  }

  async storeCreators(creators: EnhancedRedditCreator[], subreddit: string): Promise<number> {
    let stored = 0;
    
    for (const creator of creators) {
      try {
        const existing = await storage.getCreatorByUsername(creator.username);
        
        if (!existing) {
          await storage.createCreator({
            username: creator.username,
            platform: "Reddit",
            subreddit,
            karma: creator.totalKarma,
            engagementScore: Math.min(100, Math.max(10, Math.floor(creator.score / 100))),
            tags: creator.specializations,
            profileLink: creator.profileUrl,
            topPostLinks: [], // Could be enhanced to include top post links
            lastActive: new Date(),
            postsCount: creator.recentPostsCount,
            commentsCount: 0 // Could be enhanced with comment count
          });
          stored++;
        } else {
          // Update existing creator with new data
          await storage.updateCreator(existing.id, {
            karma: creator.totalKarma,
            engagementScore: Math.min(100, Math.max(10, Math.floor(creator.score / 100))),
            tags: creator.specializations,
            lastActive: new Date(),
            postsCount: creator.recentPostsCount
          });
        }
      } catch (error) {
        console.error(`Failed to store creator ${creator.username}: ${error}`);
      }
    }

    return stored;
  }
}

export const enhancedRedditAgent = new EnhancedRedditAgent();

// Predefined configurations for different AI domains
export const AI_RESEARCH_CONFIG: RedditAgentConfig = {
  subreddits: ['MachineLearning', 'artificial', 'deeplearning', 'reinforcementlearning'],
  keywords: ['research', 'paper', 'model', 'algorithm', 'neural network'],
  postLimit: 25,
  minKarma: 500,
  maxAge: 1825 // 5 years
};

export const AI_TOOLS_CONFIG: RedditAgentConfig = {
  subreddits: ['ChatGPT', 'LocalLLaMA', 'OpenAI', 'ArtificialIntelligence'],
  keywords: ['tool', 'API', 'GPT', 'LLM', 'chatbot', 'agent'],
  postLimit: 30,
  minKarma: 300,
  maxAge: 1095 // 3 years
};

export const DATA_SCIENCE_CONFIG: RedditAgentConfig = {
  subreddits: ['datascience', 'statistics', 'analytics', 'visualization'],
  keywords: ['analysis', 'dataset', 'python', 'visualization', 'machine learning'],
  postLimit: 20,
  minKarma: 400,
  maxAge: 1460 // 4 years
};