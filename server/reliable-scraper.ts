export interface ReliableCreatorResult {
  username: string;
  post_link: string;
  upvotes: number;
  subreddit: string;
  timestamp: number;
  title: string;
}

// Simplified, reliable scraper that avoids rate limits
export async function reliableScraper(subreddit: string): Promise<ReliableCreatorResult[]> {
  const results: ReliableCreatorResult[] = [];
  const apiKey = process.env.SERPAPI_KEY;
  
  if (!apiKey) return results;

  try {
    // Single optimized query to find Reddit users
    const searchQuery = `site:reddit.com/r/${subreddit} "u/" OR "user/"`;
    
    console.log(`Reliable search for ${subreddit}: ${searchQuery}`);
    
    const url = new URL('https://serpapi.com/search');
    url.searchParams.append('engine', 'google');
    url.searchParams.append('q', searchQuery);
    url.searchParams.append('api_key', apiKey);
    url.searchParams.append('num', '15');
    url.searchParams.append('gl', 'us');
    url.searchParams.append('hl', 'en');
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.log(`Search failed with status: ${response.status}`);
      return results;
    }

    const data = await response.json();
    
    if (data.error) {
      console.log(`Search error: ${data.error}`);
      return results;
    }

    if (data.organic_results) {
      for (const result of data.organic_results) {
        if (result.link && result.link.includes('reddit.com')) {
          
          // Extract usernames from URLs and content
          const fullText = `${result.title || ''} ${result.snippet || ''} ${result.link || ''}`;
          
          // Focus on most reliable username patterns
          const patterns = [
            /reddit\.com\/u\/([a-zA-Z0-9_-]{3,20})/g,
            /reddit\.com\/user\/([a-zA-Z0-9_-]{3,20})/g,
            /\bu\/([a-zA-Z0-9_-]{3,20})\b/g,
          ];

          for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(fullText)) !== null) {
              const username = match[1];
              
              if (username && 
                  username.length >= 3 &&
                  username.length <= 20 &&
                  username.toLowerCase() !== subreddit.toLowerCase() &&
                  !['reddit', 'AutoModerator', 'deleted', 'removed', 'bot'].includes(username.toLowerCase()) &&
                  !results.find(r => r.username.toLowerCase() === username.toLowerCase())) {
                
                // Extract engagement metrics from snippet
                let upvotes = 0;
                const upvoteMatch = fullText.match(/(\d+)\s*(?:upvotes?|points?|karma)/i);
                if (upvoteMatch) upvotes = parseInt(upvoteMatch[1]);
                
                results.push({
                  username,
                  post_link: result.link,
                  upvotes,
                  subreddit,
                  timestamp: Date.now() / 1000,
                  title: result.title || `r/${subreddit} Discussion`
                });
                
                console.log(`Reliable scraper found: ${username} for r/${subreddit}`);
                
                if (results.length >= 8) break;
              }
            }
            if (results.length >= 8) break;
          }
        }
        if (results.length >= 8) break;
      }
    }
    
  } catch (error) {
    console.log(`Reliable search failed:`, error instanceof Error ? error.message : 'Unknown error');
    return results;
  }

  console.log(`Reliable scraper found ${results.length} creators for r/${subreddit}`);
  return results.slice(0, 10);
}