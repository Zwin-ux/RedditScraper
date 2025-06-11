export interface AlternativeCreatorResult {
  username: string;
  post_link: string;
  upvotes: number;
  subreddit: string;
  timestamp: number;
  title: string;
}

export async function scrapeWithAlternativeMethod(subreddit: string): Promise<AlternativeCreatorResult[]> {
  const results: AlternativeCreatorResult[] = [];
  const apiKey = process.env.SERPAPI_KEY;
  
  if (!apiKey) {
    console.log('SERPAPI_KEY not available for alternative scraping');
    return results;
  }

  // Enhanced search strategies for newer/smaller subreddits
  const alternativeStrategies = [
    `site:reddit.com/r/${subreddit} "u/" recent`,
    `"${subreddit}" reddit "u/" posts 2024`,
    `reddit.com "${subreddit}" username "u/" discussions`,
    `site:reddit.com "${subreddit}" author posts`,
    `"r/${subreddit}" reddit discussions users`,
  ];

  for (const searchQuery of alternativeStrategies) {
    try {
      const url = new URL('https://serpapi.com/search');
      url.searchParams.append('engine', 'google');
      url.searchParams.append('q', searchQuery);
      url.searchParams.append('api_key', apiKey);
      url.searchParams.append('num', '15');
      url.searchParams.append('tbs', 'qdr:m'); // Recent results
      
      console.log(`Alternative search: ${searchQuery}`);

      const response = await fetch(url.toString());
      
      if (!response.ok) continue;

      const data = await response.json();
      
      if (data.error) {
        console.log(`Alternative search error: ${data.error}`);
        continue;
      }

      if (data.organic_results) {
        for (const result of data.organic_results) {
          if (result.link && result.link.includes('reddit.com')) {
            
            // Enhanced username extraction patterns
            const textContent = `${result.title || ''} ${result.snippet || ''}`;
            const patterns = [
              /\bu\/([a-zA-Z0-9_-]{3,20})\b/g,
              /\buser\/([a-zA-Z0-9_-]{3,20})\b/g,
              /reddit\.com\/u\/([a-zA-Z0-9_-]{3,20})/g,
              /submitted by ([a-zA-Z0-9_-]{3,20})/gi,
              /posted by ([a-zA-Z0-9_-]{3,20})/gi,
              /by u\/([a-zA-Z0-9_-]{3,20})/gi,
            ];

            for (const pattern of patterns) {
              let match;
              while ((match = pattern.exec(textContent)) !== null) {
                const username = match[1];
                
                // Filter out common false positives
                if (username && 
                    username !== subreddit &&
                    username !== 'reddit' &&
                    username !== 'AutoModerator' &&
                    username !== 'deleted' &&
                    username.length >= 3 &&
                    !results.find(r => r.username === username)) {
                  
                  // Extract upvotes from snippet
                  let upvotes = 0;
                  const upvoteMatch = textContent.match(/(\d+)\s*(?:upvotes?|points?)/i);
                  if (upvoteMatch) upvotes = parseInt(upvoteMatch[1]);
                  
                  results.push({
                    username,
                    post_link: result.link,
                    upvotes,
                    subreddit,
                    timestamp: Date.now() / 1000,
                    title: result.title || 'Post'
                  });
                  
                  console.log(`Alternative method found: ${username}`);
                  break;
                }
              }
            }
          }
        }
      }

      // Stop if we found enough results
      if (results.length >= 10) break;
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 800));
      
    } catch (error) {
      console.log(`Alternative search strategy failed:`, error instanceof Error ? error.message : 'Unknown error');
      continue;
    }
  }

  console.log(`Alternative scraper found ${results.length} creators for r/${subreddit}`);
  return results.slice(0, 15);
}

// Fallback method using direct Reddit URL scraping
export async function scrapeRedditDirectly(subreddit: string): Promise<AlternativeCreatorResult[]> {
  const results: AlternativeCreatorResult[] = [];
  
  // Try different Reddit endpoints with various parameters
  const endpoints = [
    `https://old.reddit.com/r/${subreddit}.json?limit=25`,
    `https://old.reddit.com/r/${subreddit}/new.json?limit=25`,
    `https://old.reddit.com/r/${subreddit}/top.json?t=month&limit=25`,
    `https://www.reddit.com/r/${subreddit}/.json?limit=25`,
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RedditScraper/1.0)',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
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
                post.ups >= 1 &&
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
            console.log(`Direct Reddit scraping found ${results.length} creators for r/${subreddit}`);
            return results.slice(0, 15);
          }
        }
      }
    } catch (error) {
      continue;
    }
  }

  return results;
}