export interface FinalCreatorResult {
  username: string;
  post_link: string;
  upvotes: number;
  subreddit: string;
  timestamp: number;
  title: string;
}

// Final comprehensive scraper that handles all edge cases
export async function finalComprehensiveScraper(subreddit: string): Promise<FinalCreatorResult[]> {
  const results: FinalCreatorResult[] = [];
  const apiKey = process.env.SERPAPI_KEY;
  
  if (!apiKey) return results;

  // Map known problematic subreddits to working search terms
  const subredditMappings: Record<string, string[]> = {
    'ArtificialIntelligence': ['artificial intelligence', 'AI discussions', 'machine intelligence'],
    'ChatGPT': ['ChatGPT', 'GPT chat', 'OpenAI chat'],
    'LLMOps': ['LLM operations', 'language model ops', 'MLOps LLM'],
    'LocalLLMs': ['local LLM', 'local language models', 'offline AI'],
    'MachineLearning': ['machine learning', 'ML research', 'deep learning'],
    'datascience': ['data science', 'data analysis', 'analytics'],
    'deeplearning': ['deep learning', 'neural networks', 'AI research']
  };

  const searchTerms = subredditMappings[subreddit] || [subreddit.toLowerCase()];

  // Enhanced search strategies with broader terms
  const comprehensiveSearches: string[] = [];
  
  for (const term of searchTerms) {
    comprehensiveSearches.push(
      `site:reddit.com "${term}" discussions users 2024`,
      `reddit "${term}" community active users`,
      `"${term}" reddit posts authors discussions`,
      `site:reddit.com "${term}" "u/" OR "user/"`,
      `reddit.com "${term}" contributors discussions`
    );
  }

  // Add fallback searches for Reddit in general
  comprehensiveSearches.push(
    `site:reddit.com ${subreddit.toLowerCase()} users`,
    `reddit ${subreddit.replace(/([A-Z])/g, ' $1').trim()} discussions`,
    `"r/${subreddit}" reddit community posts`
  );

  for (const searchQuery of comprehensiveSearches.slice(0, 8)) {
    try {
      const url = new URL('https://serpapi.com/search');
      url.searchParams.append('engine', 'google');
      url.searchParams.append('q', searchQuery);
      url.searchParams.append('api_key', apiKey);
      url.searchParams.append('num', '15');
      url.searchParams.append('gl', 'us');
      url.searchParams.append('hl', 'en');
      
      console.log(`Final comprehensive search: ${searchQuery}`);

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        console.log(`Search failed with status: ${response.status}`);
        continue;
      }

      const data = await response.json();
      
      if (data.error) {
        console.log(`Search error: ${data.error}`);
        continue;
      }

      if (data.organic_results && data.organic_results.length > 0) {
        for (const result of data.organic_results) {
          if (result.link && result.link.includes('reddit.com')) {
            
            // Comprehensive username extraction
            const fullText = `${result.title || ''} ${result.snippet || ''} ${result.link || ''}`;
            
            // Multiple extraction patterns
            const extractionPatterns = [
              /reddit\.com\/u\/([a-zA-Z0-9_-]{3,20})/g,
              /reddit\.com\/user\/([a-zA-Z0-9_-]{3,20})/g,
              /\bu\/([a-zA-Z0-9_-]{3,20})\b/g,
              /\buser\/([a-zA-Z0-9_-]{3,20})\b/g,
              /submitted\s+by\s+([a-zA-Z0-9_-]{3,20})/gi,
              /posted\s+by\s+([a-zA-Z0-9_-]{3,20})/gi,
              /author:\s*([a-zA-Z0-9_-]{3,20})/gi,
              /by\s+([a-zA-Z0-9_-]{3,20})/gi,
              /\/comments\/[^\/]+\/[^\/]+\/([a-zA-Z0-9_-]{3,20})/g,
              /reddit\.com\/r\/[^\/]+\/comments\/[^\/]+\/[^\/]+\/([a-zA-Z0-9_-]{3,20})/g
            ];

            for (const pattern of extractionPatterns) {
              let match;
              while ((match = pattern.exec(fullText)) !== null) {
                const username = match[1];
                
                // Enhanced filtering
                if (username && 
                    username.length >= 3 &&
                    username.length <= 20 &&
                    !username.toLowerCase().includes(subreddit.toLowerCase()) &&
                    !['reddit', 'AutoModerator', 'deleted', 'removed', 'bot', 'mod', 'admin'].some(term => 
                      username.toLowerCase().includes(term.toLowerCase())) &&
                    !results.find(r => r.username.toLowerCase() === username.toLowerCase())) {
                  
                  // Extract engagement metrics
                  let upvotes = 0;
                  const engagementPatterns = [
                    /(\d+)\s*(?:upvotes?|points?|karma|ups)/i,
                    /score[:\s]*(\d+)/i,
                    /(\d+)\s*votes?/i
                  ];
                  
                  for (const engPattern of engagementPatterns) {
                    const engMatch = fullText.match(engPattern);
                    if (engMatch) {
                      upvotes = parseInt(engMatch[1]);
                      break;
                    }
                  }
                  
                  results.push({
                    username,
                    post_link: result.link,
                    upvotes,
                    subreddit,
                    timestamp: Date.now() / 1000,
                    title: result.title || `${subreddit} Discussion`
                  });
                  
                  console.log(`Final scraper found: ${username} for r/${subreddit} (${upvotes} upvotes)`);
                  
                  if (results.length >= 12) break;
                }
              }
              if (results.length >= 12) break;
            }
          }
          if (results.length >= 12) break;
        }
      }

      // Stop early if we found good results
      if (results.length >= 8) break;
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 700));
      
    } catch (error) {
      console.log(`Final search failed:`, error instanceof Error ? error.message : 'Unknown error');
      continue;
    }
  }

  // If still no results, try one last broad search
  if (results.length === 0) {
    try {
      const broadSearch = `reddit discussions users ${subreddit.replace(/([A-Z])/g, ' $1').trim()}`;
      const url = new URL('https://serpapi.com/search');
      url.searchParams.append('engine', 'google');
      url.searchParams.append('q', broadSearch);
      url.searchParams.append('api_key', apiKey);
      url.searchParams.append('num', '10');
      
      console.log(`Last resort search: ${broadSearch}`);
      
      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.json();
        
        if (data.organic_results) {
          for (const result of data.organic_results) {
            if (result.link && result.link.includes('reddit.com')) {
              
              // Simple username extraction from URL patterns
              const urlMatch = result.link.match(/reddit\.com\/u\/([a-zA-Z0-9_-]{3,20})/);
              if (urlMatch) {
                const username = urlMatch[1];
                if (!results.find(r => r.username === username)) {
                  results.push({
                    username,
                    post_link: result.link,
                    upvotes: 0,
                    subreddit,
                    timestamp: Date.now() / 1000,
                    title: result.title || 'Reddit User'
                  });
                  
                  console.log(`Last resort found: ${username}`);
                  if (results.length >= 5) break;
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.log('Last resort search failed');
    }
  }

  console.log(`Final comprehensive scraper found ${results.length} creators for r/${subreddit}`);
  return results.slice(0, 15);
}