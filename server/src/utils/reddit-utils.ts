import { z } from 'zod';
import { subredditCache, userProfileCache } from '../services/cache-service';
import { config } from '../config';

// Zod schemas for Reddit data
export const RedditPostSchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string(),
  subreddit: z.string(),
  score: z.number(),
  num_comments: z.number(),
  created_utc: z.number(),
  permalink: z.string(),
  url: z.string(),
  selftext: z.string().optional(),
  is_self: z.boolean().optional(),
  thumbnail: z.string().optional(),
  post_hint: z.string().optional(),
  preview: z.any().optional(),
});

export const RedditListingSchema = z.object({
  kind: z.literal('Listing'),
  data: z.object({
    children: z.array(z.object({
      kind: z.string(),
      data: RedditPostSchema,
    })),
    after: z.string().nullable(),
    before: z.string().nullable(),
  }),
});

export type RedditPost = z.infer<typeof RedditPostSchema>;

export interface FormattedRedditPost {
  id: string;
  title: string;
  author: string;
  subreddit: string;
  upvotes: number;
  comments: number;
  createdAt: Date;
  url: string;
  permalink: string;
  content: string;
  media?: {
    type: 'image' | 'video' | 'gif' | 'link';
    url: string;
    thumbnail?: string;
  };
}

/**
 * Format a Reddit post from the API to our internal format
 */
export function formatRedditPost(post: RedditPost): FormattedRedditPost {
  const formatted: FormattedRedditPost = {
    id: post.id,
    title: post.title,
    author: post.author,
    subreddit: post.subreddit,
    upvotes: post.score,
    comments: post.num_comments,
    createdAt: new Date(post.created_utc * 1000),
    url: post.url,
    permalink: `https://reddit.com${post.permalink}`,
    content: post.selftext || '',
  };

  // Handle media
  if (post.post_hint === 'image' && post.preview?.images?.[0]?.source?.url) {
    formatted.media = {
      type: 'image',
      url: post.preview.images[0].source.url,
      thumbnail: post.thumbnail,
    };
  } else if (post.thumbnail && post.thumbnail.startsWith('http')) {
    formatted.media = {
      type: 'link',
      url: post.url,
      thumbnail: post.thumbnail,
    };
  }

  return formatted;
}

/**
 * Parse a Reddit username or profile URL
 */
export function parseUsername(input: string): string | null {
  if (!input) return null;
  
  // Handle URLs
  const urlMatch = input.match(/reddit\.com\/user\/([a-zA-Z0-9_-]+)/i);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }
  
  // Handle u/username format
  const userMatch = input.match(/^u?\/?([a-zA-Z0-9_-]+)$/i);
  if (userMatch && userMatch[1]) {
    return userMatch[1];
  }
  
  return null;
}

/**
 * Parse a subreddit name from various formats
 */
export function parseSubreddit(input: string): string | null {
  if (!input) return null;
  
  // Handle URLs
  const urlMatch = input.match(/reddit\.com\/r\/([a-zA-Z0-9_]+)/i);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }
  
  // Handle r/subreddit format
  const subMatch = input.match(/^r?\/?([a-zA-Z0-9_]+)$/i);
  if (subMatch && subMatch[1]) {
    return subMatch[1];
  }
  
  return null;
}

/**
 * Get a user-friendly error message from a Reddit API error
 */
export function getRedditErrorMessage(error: any): string {
  if (!error) return 'Unknown error occurred';
  
  if (error.response?.data?.error) {
    return `Reddit API error: ${error.response.data.error}`;
  }
  
  if (error.message) {
    return error.message;
  }
  
  return 'An unknown error occurred while communicating with Reddit';
}

/**
 * Check if a subreddit exists and is accessible
 */
export async function subredditExists(subreddit: string): Promise<boolean> {
  const cacheKey = `subreddit_exists:${subreddit.toLowerCase()}`;
  const cached = await subredditCache.get<boolean>(cacheKey);
  if (cached !== undefined) return cached;
  
  try {
    const response = await fetch(`https://www.reddit.com/r/${subreddit}/about.json`, {
      headers: {
        'User-Agent': config.isDevelopment ? 'RedditScraper/1.0 (Development)' : 'RedditScraper/1.0',
      },
    });
    
    const exists = response.status === 200;
    await subredditCache.set(cacheKey, exists, 3600); // Cache for 1 hour
    return exists;
  } catch (error) {
    console.error(`Error checking if subreddit exists: ${subreddit}`, error);
    return false;
  }
}

/**
 * Check if a Reddit username exists
 */
export async function userExists(username: string): Promise<boolean> {
  const cacheKey = `user_exists:${username.toLowerCase()}`;
  const cached = await userProfileCache.get<boolean>(cacheKey);
  if (cached !== undefined) return cached;
  
  try {
    const response = await fetch(`https://www.reddit.com/user/${username}/about.json`, {
      headers: {
        'User-Agent': config.isDevelopment ? 'RedditScraper/1.0 (Development)' : 'RedditScraper/1.0',
      },
    });
    
    const exists = response.status === 200;
    await userProfileCache.set(cacheKey, exists, 3600 * 24); // Cache for 24 hours
    return exists;
  } catch (error) {
    console.error(`Error checking if user exists: ${username}`, error);
    return false;
  }
}
