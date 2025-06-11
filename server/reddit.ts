import { analyzeCreatorContent, analyzePostRelevance } from './openai';
import { storage } from './storage';

export interface RedditPost {
  id: string;
  title: string;
  content?: string;
  author: string;
  subreddit: string;
  upvotes: number;
  awards: number;
  url: string;
  created_utc: number;
}

export interface RedditCreatorData {
  username: string;
  karma: number;
  posts: RedditPost[];
  comments: Array<{ content: string; upvotes: number }>;
}

// Primary target subreddit for comprehensive analysis
const TARGET_SUBREDDIT = 'datascience';

export async function crawlSubreddit(subredditName: string, limit = 100): Promise<{
  posts: RedditPost[];
  creators: Set<string>;
}> {
  try {
    // Use Reddit's JSON API (no auth required for public content)
    const response = await fetch(`https://www.reddit.com/r/${subredditName}/hot.json?limit=${limit}`, {
      headers: {
        'User-Agent': 'RedditCreatorAgent/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Reddit API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const posts: RedditPost[] = [];
    const creators = new Set<string>();

    if (data?.data?.children) {
      for (const child of data.data.children) {
        const post = child.data;
        
        // Skip stickied posts and posts without authors
        if (post.stickied || !post.author || post.author === '[deleted]') {
          continue;
        }

        const redditPost: RedditPost = {
          id: post.id,
          title: post.title,
          content: post.selftext || '',
          author: post.author,
          subreddit: post.subreddit,
          upvotes: post.score,
          awards: post.total_awards_received || 0,
          url: `https://reddit.com${post.permalink}`,
          created_utc: post.created_utc
        };

        posts.push(redditPost);
        creators.add(post.author);
      }
    }

    return { posts, creators };
  } catch (error) {
    console.error(`Failed to crawl r/${subredditName}:`, error);
    throw new Error(`Reddit crawling failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function calculateEngagementScore(creatorData: RedditCreatorData): Promise<number> {
  const { karma, posts, comments } = creatorData;
  
  // Calculate various engagement metrics
  const avgUpvotes = posts.length > 0 ? posts.reduce((sum, p) => sum + p.upvotes, 0) / posts.length : 0;
  const totalAwards = posts.reduce((sum, p) => sum + p.awards, 0);
  const commentEngagement = comments.length > 0 ? comments.reduce((sum, c) => sum + c.upvotes, 0) / comments.length : 0;
  
  // Weighted scoring algorithm
  const karmaScore = Math.min(karma / 1000, 30); // Max 30 points for karma
  const avgUpvoteScore = Math.min(avgUpvotes / 10, 25); // Max 25 points for avg upvotes
  const awardScore = Math.min(totalAwards * 2, 20); // Max 20 points for awards
  const commentScore = Math.min(commentEngagement / 5, 15); // Max 15 points for comment engagement
  const activityScore = Math.min(posts.length / 5, 10); // Max 10 points for posting frequency
  
  const totalScore = karmaScore + avgUpvoteScore + awardScore + commentScore + activityScore;
  
  return Math.round(Math.min(totalScore, 100)); // Cap at 100
}

export async function processCreator(username: string, subreddit: string): Promise<void> {
  try {
    // Check if creator already exists
    const existingCreator = await storage.getCreatorByUsername(username);
    
    // Simulate fetching creator data (in real implementation, this would use PRAW)
    const creatorData: RedditCreatorData = {
      username,
      karma: Math.floor(Math.random() * 50000) + 1000, // Mock data - replace with real PRAW data
      posts: [], // Would be populated from Reddit API
      comments: [] // Would be populated from Reddit API
    };
    
    const engagementScore = await calculateEngagementScore(creatorData);
    const analysis = await analyzeCreatorContent(creatorData.posts, creatorData.comments);
    
    const creatorRecord = {
      username,
      platform: 'Reddit' as const,
      subreddit,
      karma: creatorData.karma,
      engagementScore,
      tags: analysis.tags,
      profileLink: `https://reddit.com/u/${username}`,
      lastActive: new Date(),
      postsCount: creatorData.posts.length,
      commentsCount: creatorData.comments.length,
    };
    
    if (existingCreator) {
      await storage.updateCreator(existingCreator.id, creatorRecord);
    } else {
      await storage.createCreator(creatorRecord);
    }
  } catch (error) {
    console.error(`Failed to process creator ${username}:`, error);
  }
}

export async function crawlAndProcessSubreddit(subredditName: string): Promise<{
  postsFound: number;
  creatorsProcessed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  
  try {
    // Start crawl log
    const crawlLog = await storage.createCrawlLog({
      subreddit: subredditName,
      status: 'running'
    });
    
    try {
      const { posts, creators } = await crawlSubreddit(subredditName);
      
      // Filter posts for AI/ML relevance
      const relevantPosts = [];
      for (const post of posts) {
        const relevance = await analyzePostRelevance(post.title, post.content);
        if (relevance.isRelevant && relevance.confidence > 0.7) {
          relevantPosts.push(post);
        }
      }
      
      // Process each creator
      for (const creatorUsername of Array.from(creators)) {
        try {
          await processCreator(creatorUsername, subredditName);
        } catch (error) {
          errors.push(`Failed to process creator ${creatorUsername}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // Update crawl log with success
      await storage.updateCrawlLog(crawlLog.id, {
        status: 'success',
        postsFound: relevantPosts.length,
        creatorsFound: creators.size
      });
      
      // Update subreddit last crawled time
      await storage.updateSubredditLastCrawled(subredditName);
      
      return {
        postsFound: relevantPosts.length,
        creatorsProcessed: creators.size,
        errors
      };
      
    } catch (error) {
      // Update crawl log with failure
      await storage.updateCrawlLog(crawlLog.id, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
    
  } catch (error) {
    errors.push(`Crawl failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      postsFound: 0,
      creatorsProcessed: 0,
      errors
    };
  }
}

export async function initializeSubreddits(): Promise<void> {
  try {
    const existing = await storage.getSubreddits();
    const existingNames = existing.map(s => s.name);
    
    if (!existingNames.includes(TARGET_SUBREDDIT)) {
      await storage.createSubreddit({
        name: TARGET_SUBREDDIT,
        isActive: 1
      });
    }
  } catch (error) {
    console.error(`Failed to initialize subreddit ${TARGET_SUBREDDIT}:`, error);
  }
}
