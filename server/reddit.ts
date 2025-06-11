import { spawn } from 'child_process';
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

// Target subreddits for AI content discovery
const TARGET_SUBREDDITS = [
  'MachineLearning',
  'ArtificialIntelligence', 
  'LocalLLMs',
  'PromptEngineering',
  'AutoGPT',
  'ChatGPT',
  'LLMOps',
  'OpenAI',
  'deeplearning',
  'datascience'
];

export async function crawlSubreddit(subredditName: string, limit = 100): Promise<{
  posts: RedditPost[];
  creators: Set<string>;
}> {
  return new Promise((resolve, reject) => {
    // Create a Python script to use PRAW for Reddit data
    const pythonScript = `
import praw
import json
import sys
import os
from datetime import datetime

# Reddit API credentials from environment
reddit = praw.Reddit(
    client_id=os.getenv('REDDIT_CLIENT_ID', 'your_client_id'),
    client_secret=os.getenv('REDDIT_CLIENT_SECRET', 'your_client_secret'),
    user_agent='RedditCreatorAgent/1.0 by YourUsername'
)

try:
    subreddit = reddit.subreddit('${subredditName}')
    posts_data = []
    creators = set()
    
    # Get top posts from the last week
    for post in subreddit.hot(limit=${limit}):
        if not post.stickied and post.author:
            post_data = {
                'id': post.id,
                'title': post.title,
                'content': post.selftext if hasattr(post, 'selftext') else '',
                'author': post.author.name,
                'subreddit': subreddit.display_name,
                'upvotes': post.score,
                'awards': post.total_awards_received,
                'url': f"https://reddit.com{post.permalink}",
                'created_utc': post.created_utc
            }
            posts_data.append(post_data)
            creators.add(post.author.name)
    
    result = {
        'posts': posts_data,
        'creators': list(creators)
    }
    
    print(json.dumps(result))
    
except Exception as e:
    print(json.dumps({'error': str(e)}), file=sys.stderr)
    sys.exit(1)
`;

    const pythonProcess = spawn('python3', ['-c', pythonScript], {
      env: {
        ...process.env,
        REDDIT_CLIENT_ID: process.env.REDDIT_CLIENT_ID || process.env.PRAW_CLIENT_ID,
        REDDIT_CLIENT_SECRET: process.env.REDDIT_CLIENT_SECRET || process.env.PRAW_CLIENT_SECRET
      }
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python script error:', stderr);
        reject(new Error(`Reddit crawling failed: ${stderr}`));
        return;
      }

      try {
        const result = JSON.parse(stdout);
        if (result.error) {
          reject(new Error(result.error));
          return;
        }

        const posts = result.posts || [];
        const creators = new Set(result.creators || []);
        
        resolve({ posts, creators });
      } catch (error) {
        reject(new Error('Failed to parse Reddit API response'));
      }
    });
  });
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
      for (const creatorUsername of creators) {
        try {
          await processCreator(creatorUsername, subredditName);
        } catch (error) {
          errors.push(`Failed to process creator ${creatorUsername}: ${error.message}`);
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
        errorMessage: error.message
      });
      throw error;
    }
    
  } catch (error) {
    errors.push(`Crawl failed: ${error.message}`);
    return {
      postsFound: 0,
      creatorsProcessed: 0,
      errors
    };
  }
}

export async function initializeSubreddits(): Promise<void> {
  for (const subredditName of TARGET_SUBREDDITS) {
    try {
      const existing = await storage.getSubreddits();
      const existingNames = existing.map(s => s.name);
      
      if (!existingNames.includes(subredditName)) {
        await storage.createSubreddit({
          name: subredditName,
          isActive: 1
        });
      }
    } catch (error) {
      console.error(`Failed to initialize subreddit ${subredditName}:`, error);
    }
  }
}
