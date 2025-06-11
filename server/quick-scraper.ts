export interface QuickRedditPost {
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

export async function quickScrapeSubreddit(subreddit: string, limit = 20): Promise<QuickRedditPost[]> {
  const posts: QuickRedditPost[] = [];
  
  try {
    // Try multiple Reddit endpoints for better reliability
    const endpoints = [
      `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`,
      `https://www.reddit.com/r/${subreddit}/new.json?limit=${limit}`,
      `https://www.reddit.com/r/${subreddit}.json?limit=${limit}`
    ];

    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          console.log(`Endpoint ${url} failed with ${response.status}`);
          continue;
        }
        
        const data = await response.json();
        
        if (data?.data?.children) {
          for (const child of data.data.children) {
            const post = child.data;
            if (post.author && 
                post.author !== '[deleted]' && 
                post.author !== 'AutoModerator' &&
                post.author !== 'automoderator' &&
                !posts.find(p => p.author === post.author)) {
              posts.push({
                title: post.title || '',
                author: post.author,
                subreddit: post.subreddit || subreddit,
                ups: post.ups || 0,
                num_comments: post.num_comments || 0,
                url: post.url || '',
                selftext: post.selftext || '',
                created_utc: post.created_utc || Date.now() / 1000,
                permalink: post.permalink || ''
              });
            }
          }
          
          if (posts.length > 0) {
            console.log(`Reddit API found ${posts.length} authentic posts from r/${subreddit}`);
            return posts;
          }
        }
      } catch (endpointError) {
        console.log(`Endpoint ${url} error:`, endpointError instanceof Error ? endpointError.message : 'Unknown error');
        continue;
      }
    }
    
    console.log(`All Reddit API endpoints failed for r/${subreddit}`);
    return [];
    
  } catch (error) {
    console.error(`Reddit scraper failed for r/${subreddit}:`, error);
    return [];
  }
}