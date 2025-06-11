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
    // Direct fetch from Reddit JSON API
    const url = `https://www.reddit.com/r/${subreddit}.json?limit=${limit}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RedditScraper/1.0)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data?.data?.children) {
      for (const child of data.data.children) {
        const post = child.data;
        if (post.author && post.author !== '[deleted]' && post.author !== 'AutoModerator') {
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
    }
    
    console.log(`Quick scraper found ${posts.length} authentic posts from r/${subreddit}`);
    return posts;
    
  } catch (error) {
    console.error(`Quick scraper failed for r/${subreddit}:`, error);
    return [];
  }
}