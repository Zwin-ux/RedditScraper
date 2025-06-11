export interface SpecializedCreatorResult {
  username: string;
  post_link: string;
  upvotes: number;
  subreddit: string;
  timestamp: number;
  title: string;
}

// Specialized scraper for specific problematic subreddits
export async function scrapeSpecializedSubreddits(subreddit: string): Promise<SpecializedCreatorResult[]> {
  const results: SpecializedCreatorResult[] = [];
  const apiKey = process.env.SERPAPI_KEY;
  
  if (!apiKey) return results;

  // Map problematic subreddits to working alternatives or broader searches
  const specializedSearches: Record<string, string[]> = {
    'ArtificialIntelligence': [
      'site:reddit.com "artificial intelligence" discussions users',
      '"AI" reddit users discussions posts',
      'reddit "artificial intelligence" community posts',
      'site:reddit.com AI discussions "u/"',
      '"artificial intelligence" reddit authors posts 2024'
    ],
    'ChatGPT': [
      'site:reddit.com "ChatGPT" users posts',
      '"ChatGPT" reddit discussions authors',
      'reddit "GPT" users discussions',
      'site:reddit.com openai discussions "u/"'
    ],
    'LLMOps': [
      'site:reddit.com "LLM" operations users',
      '"LLMOps" OR "LLM Ops" reddit discussions',
      'reddit "large language model" operations users',
      '"MLOps" reddit AI users discussions'
    ]
  };

  const searchQueries = specializedSearches[subreddit] || [
    `site:reddit.com "${subreddit}" discussions users`,
    `"${subreddit}" reddit community posts users`,
    `reddit "${subreddit}" authors discussions`
  ];

  for (const searchQuery of searchQueries) {
    try {
      const url = new URL('https://serpapi.com/search');
      url.searchParams.append('engine', 'google');
      url.searchParams.append('q', searchQuery);
      url.searchParams.append('api_key', apiKey);
      url.searchParams.append('num', '15');
      url.searchParams.append('tbs', 'qdr:y'); // Last year
      
      console.log(`Specialized search for ${subreddit}: ${searchQuery}`);

      const response = await fetch(url.toString());
      
      if (!response.ok) continue;

      const data = await response.json();
      
      if (data.error) {
        console.log(`Specialized search error: ${data.error}`);
        continue;
      }

      if (data.organic_results) {
        for (const result of data.organic_results) {
          if (result.link && result.link.includes('reddit.com')) {
            
            // Extract usernames from various parts of the result
            const allText = `${result.title || ''} ${result.snippet || ''} ${result.link || ''}`;
            
            // Multiple extraction patterns
            const patterns = [
              /reddit\.com\/u\/([a-zA-Z0-9_-]{3,20})/g,
              /reddit\.com\/user\/([a-zA-Z0-9_-]{3,20})/g,
              /\bu\/([a-zA-Z0-9_-]{3,20})\b/g,
              /by\s+([a-zA-Z0-9_-]{3,20})/gi,
              /author:\s*([a-zA-Z0-9_-]{3,20})/gi,
              /submitted\s+by\s+([a-zA-Z0-9_-]{3,20})/gi,
              /posted\s+by\s+([a-zA-Z0-9_-]{3,20})/gi,
            ];

            for (const pattern of patterns) {
              let match;
              while ((match = pattern.exec(allText)) !== null) {
                const username = match[1];
                
                if (username && 
                    username.length >= 3 &&
                    username.length <= 20 &&
                    username.toLowerCase() !== subreddit.toLowerCase() &&
                    !['reddit', 'AutoModerator', 'deleted', 'removed', 'bot'].includes(username.toLowerCase()) &&
                    !results.find(r => r.username.toLowerCase() === username.toLowerCase())) {
                  
                  // Extract engagement from snippet
                  let upvotes = 0;
                  const engagementMatch = allText.match(/(\d+)\s*(?:upvotes?|points?|karma|ups)/i);
                  if (engagementMatch) {
                    upvotes = parseInt(engagementMatch[1]);
                  }
                  
                  results.push({
                    username,
                    post_link: result.link,
                    upvotes,
                    subreddit,
                    timestamp: Date.now() / 1000,
                    title: result.title || `${subreddit} Discussion`
                  });
                  
                  console.log(`Specialized method found: ${username} for r/${subreddit}`);
                  
                  if (results.length >= 10) break;
                }
              }
              if (results.length >= 10) break;
            }
          }
          if (results.length >= 10) break;
        }
      }

      // Stop if we found enough
      if (results.length >= 8) break;
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 800));
      
    } catch (error) {
      console.log(`Specialized search failed:`, error instanceof Error ? error.message : 'Unknown error');
      continue;
    }
  }

  console.log(`Specialized scraper found ${results.length} creators for r/${subreddit}`);
  return results.slice(0, 12);
}

// Fallback method using broader Reddit searches
export async function broadRedditSearch(subreddit: string): Promise<SpecializedCreatorResult[]> {
  const results: SpecializedCreatorResult[] = [];
  const apiKey = process.env.SERPAPI_KEY;
  
  if (!apiKey) return results;

  // Broader search strategies
  const broadSearches = [
    `reddit "${subreddit.replace(/([A-Z])/g, ' $1').trim()}" users`,
    `site:reddit.com ${subreddit.toLowerCase()} discussions`,
    `reddit community "${subreddit}" posts users`,
    `"r/${subreddit}" OR "${subreddit}" reddit discussions`
  ];

  for (const searchQuery of broadSearches) {
    try {
      const url = new URL('https://serpapi.com/search');
      url.searchParams.append('engine', 'google');
      url.searchParams.append('q', searchQuery);
      url.searchParams.append('api_key', apiKey);
      url.searchParams.append('num', '10');
      
      const response = await fetch(url.toString());
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.organic_results) {
          for (const result of data.organic_results) {
            if (result.link && result.link.includes('reddit.com')) {
              
              const textContent = `${result.title || ''} ${result.snippet || ''}`;
              const usernameMatch = textContent.match(/\b([a-zA-Z0-9_-]{3,20})\b/g);
              
              if (usernameMatch) {
                for (const potential of usernameMatch) {
                  if (potential.length >= 3 && 
                      potential.length <= 20 &&
                      !['the', 'and', 'for', 'with', 'reddit', 'from'].includes(potential.toLowerCase()) &&
                      !results.find(r => r.username === potential)) {
                    
                    results.push({
                      username: potential,
                      post_link: result.link,
                      upvotes: 0,
                      subreddit,
                      timestamp: Date.now() / 1000,
                      title: result.title || 'Reddit Discussion'
                    });
                    
                    if (results.length >= 5) break;
                  }
                }
              }
            }
            if (results.length >= 5) break;
          }
        }
      }
      
      if (results.length >= 3) break;
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      continue;
    }
  }

  return results.slice(0, 8);
}