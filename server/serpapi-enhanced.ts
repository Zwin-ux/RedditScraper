// Enhanced SerpAPI implementation for extracting real Reddit usernames
export interface RealRedditPost {
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

export async function extractRealRedditUsernames(subreddit: string, limit = 100): Promise<RealRedditPost[]> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) throw new Error('SERPAPI_KEY environment variable is required');

  const realPosts: RealRedditPost[] = [];
  
  // Multiple targeted search strategies to find real usernames
  const searchStrategies = [
    `"submitted by u/" site:reddit.com/r/${subreddit}`,
    `"posted by u/" site:reddit.com/r/${subreddit}`,
    `site:reddit.com/r/${subreddit}/comments "u/"`,
    `site:reddit.com/r/${subreddit} "author:" -site:reddit.com/user`,
    `"r/${subreddit}" "by u/" reddit.com`,
    // Additional strategies for newer/smaller subreddits
    `"u/" site:reddit.com/r/${subreddit}`,
    `reddit.com/r/${subreddit} "submitted" "u/"`,
    `"reddit.com/r/${subreddit}" "u/" -"subreddit"`,
    `site:reddit.com "${subreddit}" "u/" posts`,
  ];

  for (const searchQuery of searchStrategies) {
    try {
      const url = new URL('https://serpapi.com/search');
      url.searchParams.append('engine', 'google');
      url.searchParams.append('q', searchQuery);
      url.searchParams.append('api_key', apiKey);
      url.searchParams.append('num', '20');
      url.searchParams.append('gl', 'us');
      url.searchParams.append('hl', 'en');

      console.log(`Searching for real usernames: ${searchQuery}`);

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        console.warn(`SerpAPI request failed for query: ${searchQuery}`);
        continue;
      }

      const data = await response.json();
      
      if (data.error) {
        console.warn(`SerpAPI error for query: ${searchQuery} - ${data.error}`);
        continue;
      }

      if (data.organic_results) {
        for (const result of data.organic_results) {
          if (result.link && result.link.includes(`reddit.com/r/${subreddit}`)) {
            
            // Extract real usernames from snippets using multiple patterns
            const textContent = `${result.title || ''} ${result.snippet || ''}`;
            let realUsername = null;

            // Comprehensive username extraction patterns
            const usernamePatterns = [
              /submitted\s+(?:by\s+)?u\/([a-zA-Z0-9_-]{3,20})/i,
              /posted\s+(?:by\s+)?u\/([a-zA-Z0-9_-]{3,20})/i,
              /by\s+u\/([a-zA-Z0-9_-]{3,20})/i,
              /u\/([a-zA-Z0-9_-]{3,20})\s+(?:submitted|posted)/i,
              /author:\s*u\/([a-zA-Z0-9_-]{3,20})/i,
              /\bu\/([a-zA-Z0-9_-]{3,20})\b/g, // Global search for any u/username
            ];

            for (const pattern of usernamePatterns) {
              const match = textContent.match(pattern);
              if (match && match[1] && match[1] !== subreddit && !match[1].includes('reddit')) {
                realUsername = match[1];
                break;
              }
            }

            // Additional extraction from URL patterns
            if (!realUsername) {
              const urlPatterns = [
                /reddit\.com\/u\/([a-zA-Z0-9_-]{3,20})/,
                /reddit\.com\/user\/([a-zA-Z0-9_-]{3,20})/,
              ];
              
              for (const pattern of urlPatterns) {
                const match = result.link.match(pattern);
                if (match && match[1] && match[1] !== subreddit) {
                  realUsername = match[1];
                  break;
                }
              }
            }

            // Only include posts with confirmed real usernames
            if (realUsername && realUsername.length >= 3) {
              // Extract additional metadata
              let upvotes = 0;
              let comments = 0;
              
              const upvoteMatch = textContent.match(/(\d+)\s*(?:upvotes?|points?)/i);
              if (upvoteMatch) upvotes = parseInt(upvoteMatch[1]);
              
              const commentMatch = textContent.match(/(\d+)\s*comments?/i);
              if (commentMatch) comments = parseInt(commentMatch[1]);

              const post: RealRedditPost = {
                title: result.title || '',
                author: realUsername,
                subreddit: subreddit,
                ups: upvotes,
                num_comments: comments,
                url: result.link,
                selftext: result.snippet || '',
                created_utc: Math.floor(Date.now() / 1000),
                permalink: result.link
              };

              // Avoid duplicates
              if (!realPosts.find(p => p.author === realUsername && p.title === post.title)) {
                realPosts.push(post);
                console.log(`Found real user: ${realUsername} with post: ${post.title.substring(0, 50)}...`);
              }
            }
          }
        }
      }

      // Rate limiting between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Error in search strategy "${searchQuery}":`, error);
      continue;
    }
  }

  console.log(`Total real usernames extracted: ${realPosts.length}`);
  return realPosts.slice(0, limit);
}

// Additional function to get user profile data from search results
export async function getUserProfileFromSearch(username: string): Promise<{karma: number, cakeDay?: string} | null> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) return null;

  try {
    const searchQuery = `site:reddit.com/user/${username} OR site:reddit.com/u/${username}`;
    
    const url = new URL('https://serpapi.com/search');
    url.searchParams.append('engine', 'google');
    url.searchParams.append('q', searchQuery);
    url.searchParams.append('api_key', apiKey);
    url.searchParams.append('num', '5');

    const response = await fetch(url.toString());
    
    if (!response.ok) return null;

    const data = await response.json();
    
    if (data.organic_results && data.organic_results.length > 0) {
      const result = data.organic_results[0];
      const snippet = result.snippet || '';
      
      // Extract karma if available
      const karmaMatch = snippet.match(/(\d+(?:,\d+)*)\s*(?:karma|points)/i);
      const karma = karmaMatch ? parseInt(karmaMatch[1].replace(/,/g, '')) : 0;
      
      // Extract cake day if available
      const cakeDayMatch = snippet.match(/cake\s*day[:\s]*([^,\n]+)/i);
      const cakeDay = cakeDayMatch ? cakeDayMatch[1].trim() : undefined;
      
      return { karma, cakeDay };
    }
    
    return null;
  } catch (error) {
    console.error(`Failed to get profile for ${username}:`, error);
    return null;
  }
}