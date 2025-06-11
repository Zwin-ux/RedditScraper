export interface CreatorResult {
  username: string;
  post_link: string;
  upvotes: number;
  subreddit: string;
  timestamp: number;
  title: string;
}

export async function scrapeTopCreators(subreddit: string): Promise<CreatorResult[]> {
  const results: CreatorResult[] = [];
  const sevenDaysAgo = Date.now() / 1000 - (7 * 24 * 60 * 60);
  
  // Try multiple Reddit endpoints with different user agents
  const endpoints = [
    `https://www.reddit.com/r/${subreddit}/hot.json?limit=25`,
    `https://www.reddit.com/r/${subreddit}/new.json?limit=25`,
    `https://www.reddit.com/r/${subreddit}/top.json?t=week&limit=25`
  ];
  
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  ];
  
  for (let i = 0; i < endpoints.length; i++) {
    try {
      const response = await fetch(endpoints[i], {
        headers: {
          'User-Agent': userAgents[i % userAgents.length],
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data?.data?.children) {
          for (const child of data.data.children) {
            const post = child.data;
            
            // More lenient filtering for better results
            if (post.author && 
                post.author !== '[deleted]' && 
                post.author !== 'AutoModerator' &&
                post.author !== 'automoderator' &&
                post.ups >= 3 && // Lower threshold
                !results.find(r => r.username === post.author)) {
              
              results.push({
                username: post.author,
                post_link: `https://reddit.com${post.permalink}`,
                upvotes: post.ups,
                subreddit: post.subreddit || subreddit,
                timestamp: post.created_utc,
                title: post.title || 'Post'
              });
            }
          }
          
          if (results.length > 0) {
            console.log(`Found ${results.length} quality creators from r/${subreddit}`);
            return results.slice(0, 15); // Return top 15
          }
        }
      } else {
        console.log(`Endpoint ${endpoints[i]} returned ${response.status}`);
      }
    } catch (error) {
      console.log(`Endpoint ${i + 1} failed:`, error instanceof Error ? error.message : 'Unknown error');
      continue;
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`No results found for r/${subreddit} from any endpoint`);
  return results;
}