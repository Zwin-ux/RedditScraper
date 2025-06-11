export interface RobustCreatorResult {
  username: string;
  post_link: string;
  upvotes: number;
  subreddit: string;
  timestamp: number;
  title: string;
}

// Specialized scraper for problematic subreddits using multiple approaches
export async function robustSubredditScraper(subreddit: string): Promise<RobustCreatorResult[]> {
  const results: RobustCreatorResult[] = [];
  const apiKey = process.env.SERPAPI_KEY;
  
  if (!apiKey) {
    console.log('SERPAPI_KEY not available for robust scraping');
    return results;
  }

  // Enhanced search strategies specifically for AI-related subreddits
  const robustStrategies = [
    // General Reddit searches
    `site:reddit.com "${subreddit}" users posts`,
    `"${subreddit}" reddit authors discussions`,
    `reddit "${subreddit}" community posts users`,
    // Alternative spelling approaches
    `site:reddit.com r/${subreddit.toLowerCase()} "u/"`,
    `"r/${subreddit}" reddit "posted by" OR "submitted by"`,
    // Broader searches
    `"${subreddit}" reddit discussions 2024 users`,
    `reddit.com "${subreddit}" community authors`,
  ];

  for (const searchQuery of robustStrategies) {
    try {
      const url = new URL('https://serpapi.com/search');
      url.searchParams.append('engine', 'google');
      url.searchParams.append('q', searchQuery);
      url.searchParams.append('api_key', apiKey);
      url.searchParams.append('num', '20');
      url.searchParams.append('gl', 'us');
      url.searchParams.append('hl', 'en');
      
      console.log(`Robust search: ${searchQuery}`);

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        console.log(`Robust search failed with status: ${response.status}`);
        continue;
      }

      const data = await response.json();
      
      if (data.error) {
        console.log(`Robust search error: ${data.error}`);
        continue;
      }

      if (data.organic_results) {
        for (const result of data.organic_results) {
          if (result.link && result.link.includes('reddit.com')) {
            
            // Enhanced username extraction with multiple patterns
            const textContent = `${result.title || ''} ${result.snippet || ''}`;
            const usernamePatterns = [
              /\bu\/([a-zA-Z0-9_-]{3,20})\b/g,
              /\buser\/([a-zA-Z0-9_-]{3,20})\b/g,
              /reddit\.com\/u\/([a-zA-Z0-9_-]{3,20})/g,
              /reddit\.com\/user\/([a-zA-Z0-9_-]{3,20})/g,
              /submitted by ([a-zA-Z0-9_-]{3,20})/gi,
              /posted by ([a-zA-Z0-9_-]{3,20})/gi,
              /by u\/([a-zA-Z0-9_-]{3,20})/gi,
              /author:?\s*([a-zA-Z0-9_-]{3,20})/gi,
              /\/comments\/[^\/]+\/[^\/]+\/([a-zA-Z0-9_-]{3,20})/g,
            ];

            for (const pattern of usernamePatterns) {
              let match;
              while ((match = pattern.exec(textContent)) !== null) {
                const username = match[1];
                
                // Enhanced filtering
                if (username && 
                    username.toLowerCase() !== subreddit.toLowerCase() &&
                    username !== 'reddit' &&
                    username !== 'AutoModerator' &&
                    username !== 'deleted' &&
                    username !== 'removed' &&
                    username.length >= 3 &&
                    username.length <= 20 &&
                    !results.find(r => r.username.toLowerCase() === username.toLowerCase())) {
                  
                  // Extract engagement metrics
                  let upvotes = 0;
                  const upvotePatterns = [
                    /(\d+)\s*(?:upvotes?|points?|karma)/i,
                    /(\d+)\s*ups?/i,
                    /score:\s*(\d+)/i
                  ];
                  
                  for (const upPattern of upvotePatterns) {
                    const upMatch = textContent.match(upPattern);
                    if (upMatch) {
                      upvotes = parseInt(upMatch[1]);
                      break;
                    }
                  }
                  
                  results.push({
                    username,
                    post_link: result.link,
                    upvotes,
                    subreddit,
                    timestamp: Date.now() / 1000,
                    title: result.title || 'Reddit Post'
                  });
                  
                  console.log(`Robust method found: ${username} (${upvotes} upvotes)`);
                  
                  // Stop if we found enough
                  if (results.length >= 12) break;
                }
              }
              if (results.length >= 12) break;
            }
          }
          if (results.length >= 12) break;
        }
      }

      // Stop if we found enough results
      if (results.length >= 8) break;
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 600));
      
    } catch (error) {
      console.log(`Robust search strategy failed:`, error instanceof Error ? error.message : 'Unknown error');
      continue;
    }
  }

  console.log(`Robust scraper found ${results.length} creators for r/${subreddit}`);
  return results.slice(0, 15);
}

// Alternative approach using Reddit's old interface
export async function scrapeOldReddit(subreddit: string): Promise<RobustCreatorResult[]> {
  const results: RobustCreatorResult[] = [];
  
  const oldRedditUrls = [
    `https://old.reddit.com/r/${subreddit}/.json?limit=25&raw_json=1`,
    `https://old.reddit.com/r/${subreddit}/hot/.json?limit=25&raw_json=1`,
    `https://old.reddit.com/r/${subreddit}/new/.json?limit=25&raw_json=1`,
    `https://old.reddit.com/r/${subreddit}/top/.json?t=week&limit=25&raw_json=1`,
  ];

  for (const url of oldRedditUrls) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RedditBot/1.0; +http://example.com/bot)',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data?.data?.children) {
          for (const child of data.data.children) {
            const post = child.data;
            
            if (post.author && 
                post.author !== '[deleted]' && 
                post.author !== 'AutoModerator' &&
                post.author !== 'deleted' &&
                post.ups >= 1 &&
                !results.find(r => r.username === post.author)) {
              
              results.push({
                username: post.author,
                post_link: `https://reddit.com${post.permalink}`,
                upvotes: post.ups || 0,
                subreddit: post.subreddit || subreddit,
                timestamp: post.created_utc,
                title: post.title || 'Post'
              });
            }
          }
          
          if (results.length > 0) {
            console.log(`Old Reddit found ${results.length} creators for r/${subreddit}`);
            return results.slice(0, 15);
          }
        }
      } else {
        console.log(`Old Reddit URL failed: ${url} - Status: ${response.status}`);
      }
    } catch (error) {
      console.log(`Old Reddit attempt failed:`, error instanceof Error ? error.message : 'Unknown error');
      continue;
    }
    
    // Small delay between attempts
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  return results;
}