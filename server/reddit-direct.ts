// Direct Reddit data extraction using real Reddit JSON API
export interface RedditPostData {
  title: string;
  author: string;
  subreddit: string;
  ups: number;
  num_comments: number;
  url: string;
  selftext: string;
  created_utc: number;
  permalink: string;
}

export async function fetchRedditPosts(subreddit: string, limit = 100): Promise<RedditPostData[]> {
  try {
    // Use Reddit's JSON API endpoint with better headers
    const url = `https://www.reddit.com/r/${subreddit}.json?limit=${Math.min(limit, 100)}`;
    
    console.log(`Fetching real Reddit data from: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (DataScienceAnalyzer/1.0)',
        'Accept': 'application/json'
      }
    });

    console.log(`Reddit API response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Reddit API error: ${response.status} - ${errorText}`);
      throw new Error(`Reddit API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.data || !data.data.children) {
      throw new Error('Invalid Reddit API response format');
    }

    const posts: RedditPostData[] = [];
    
    for (const child of data.data.children) {
      const post = child.data;
      
      // Only include posts with real authors (not deleted/removed)
      if (post.author && post.author !== '[deleted]' && post.author !== '[removed]' && post.author.length >= 3) {
        posts.push({
          title: post.title || '',
          author: post.author,
          subreddit: post.subreddit,
          ups: post.ups || 0,
          num_comments: post.num_comments || 0,
          url: post.url || '',
          selftext: post.selftext || '',
          created_utc: post.created_utc || 0,
          permalink: post.permalink || ''
        });
      }
    }

    console.log(`Successfully extracted ${posts.length} real posts with authentic usernames`);
    return posts;
    
  } catch (error) {
    console.error('Failed to fetch Reddit posts:', error);
    throw error;
  }
}

export async function fetchUserProfile(username: string): Promise<any> {
  try {
    const url = `https://www.reddit.com/user/${username}.json?limit=10`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DataScienceAnalyzer/1.0'
      }
    });

    if (!response.ok) {
      return null; // User might not exist or be private
    }

    const data = await response.json();
    return data;
    
  } catch (error) {
    console.error(`Failed to fetch user profile for ${username}:`, error);
    return null;
  }
}