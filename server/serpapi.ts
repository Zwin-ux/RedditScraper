import { analyzeCreatorContent, analyzePostRelevance } from './openai';

export interface SerpRedditPost {
  title: string;
  link: string;
  snippet: string;
  date: string;
  thumbnail?: string;
  comments?: number;
  upvotes?: number;
  author?: string;
  subreddit: string;
}

export interface SerpRedditProfile {
  username: string;
  karma: number;
  cake_day: string;
  profile_link: string;
}

export async function searchRedditPosts(subreddit: string, query?: string, limit = 100): Promise<SerpRedditPost[]> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    throw new Error('SERPAPI_KEY not found in environment variables');
  }

  const searchQuery = query ? `site:reddit.com/r/${subreddit} ${query}` : `site:reddit.com/r/${subreddit}`;
  
  const url = new URL('https://serpapi.com/search');
  url.searchParams.append('engine', 'google');
  url.searchParams.append('q', searchQuery);
  url.searchParams.append('api_key', apiKey);
  url.searchParams.append('num', Math.min(limit, 100).toString());
  url.searchParams.append('start', '0');

  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`SerpAPI request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`SerpAPI error: ${data.error}`);
    }

    const posts: SerpRedditPost[] = [];
    
    if (data.organic_results) {
      for (const result of data.organic_results) {
        if (result.link && result.link.includes(`reddit.com/r/${subreddit}`)) {
          // Extract Reddit-specific data from the result
          const post: SerpRedditPost = {
            title: result.title || '',
            link: result.link,
            snippet: result.snippet || '',
            date: result.date || new Date().toISOString(),
            subreddit: subreddit,
          };

          // Try to extract additional metadata from the link or snippet
          if (result.snippet) {
            // Extract upvotes if available in snippet
            const upvoteMatch = result.snippet.match(/(\d+)\s*upvotes?/i);
            if (upvoteMatch) {
              post.upvotes = parseInt(upvoteMatch[1]);
            }

            // Extract comment count if available
            const commentMatch = result.snippet.match(/(\d+)\s*comments?/i);
            if (commentMatch) {
              post.comments = parseInt(commentMatch[1]);
            }
          }

          // Extract author from link if available
          const authorMatch = result.link.match(/\/u\/([^\/\?]+)/);
          if (authorMatch) {
            post.author = authorMatch[1];
          }

          posts.push(post);
        }
      }
    }

    return posts;
  } catch (error) {
    console.error('Failed to search Reddit posts with SerpAPI:', error);
    throw error;
  }
}

export async function getRedditUserProfile(username: string): Promise<SerpRedditProfile | null> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    throw new Error('SERPAPI_KEY not found in environment variables');
  }

  const url = new URL('https://serpapi.com/search');
  url.searchParams.append('engine', 'google');
  url.searchParams.append('q', `site:reddit.com/user/${username}`);
  url.searchParams.append('api_key', apiKey);
  url.searchParams.append('num', '10');

  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`SerpAPI request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`SerpAPI error: ${data.error}`);
    }

    if (data.organic_results && data.organic_results.length > 0) {
      const profileResult = data.organic_results.find((result: any) => 
        result.link && result.link.includes(`reddit.com/user/${username}`)
      );

      if (profileResult) {
        return {
          username,
          karma: 0, // Will be extracted from content analysis
          cake_day: '',
          profile_link: profileResult.link
        };
      }
    }

    return null;
  } catch (error) {
    console.error(`Failed to get Reddit user profile for ${username}:`, error);
    return null;
  }
}

export async function comprehensiveSubredditAnalysis(subreddit: string): Promise<{
  posts: SerpRedditPost[];
  topCreators: string[];
  insights: {
    totalPosts: number;
    avgEngagement: number;
    topTopics: string[];
    activeUsers: number;
    contentCategories: { [key: string]: number };
  };
}> {
  console.log(`Starting comprehensive analysis of r/${subreddit}...`);

  // Search for different types of content
  const searchQueries = [
    '', // General posts
    'discussion',
    'question',
    'tutorial',
    'resource',
    'project',
    'career',
    'tools',
    'dataset'
  ];

  let allPosts: SerpRedditPost[] = [];
  const creators = new Set<string>();

  // Collect posts from different search queries
  for (const query of searchQueries) {
    try {
      const posts = await searchRedditPosts(subreddit, query, 50);
      allPosts = allPosts.concat(posts);
      
      posts.forEach(post => {
        if (post.author) {
          creators.add(post.author);
        }
      });

      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Failed to search for "${query}" in r/${subreddit}:`, error);
    }
  }

  // Remove duplicates based on link
  const uniquePosts = allPosts.filter((post, index, self) => 
    index === self.findIndex(p => p.link === post.link)
  );

  // Analyze content with OpenAI
  const topTopics: string[] = [];
  const contentCategories: { [key: string]: number } = {};
  let totalEngagement = 0;
  let engagementCount = 0;

  for (const post of uniquePosts.slice(0, 20)) { // Analyze top 20 posts
    try {
      const analysis = await analyzePostRelevance(post.title, post.snippet);
      
      if (analysis.topics && analysis.topics.length > 0) {
        topTopics.push(...analysis.topics);
      }

      if (analysis.category) {
        contentCategories[analysis.category] = (contentCategories[analysis.category] || 0) + 1;
      }

      if (post.upvotes) {
        totalEngagement += post.upvotes;
        engagementCount++;
      }

      // Add delay for API rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Failed to analyze post:', error);
    }
  }

  // Get unique top topics
  const uniqueTopics = [...new Set(topTopics)].slice(0, 10);

  const insights = {
    totalPosts: uniquePosts.length,
    avgEngagement: engagementCount > 0 ? Math.round(totalEngagement / engagementCount) : 0,
    topTopics: uniqueTopics,
    activeUsers: creators.size,
    contentCategories
  };

  console.log(`Analysis complete for r/${subreddit}:`, insights);

  return {
    posts: uniquePosts,
    topCreators: [...creators].slice(0, 50),
    insights
  };
}