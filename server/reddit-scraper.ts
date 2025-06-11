// Direct Reddit web scraper for authentic data extraction
import { load } from 'cheerio';

export interface ScrapedRedditPost {
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

export async function scrapeSubredditDirect(subreddit: string, limit = 100): Promise<ScrapedRedditPost[]> {
  try {
    const url = `https://www.reddit.com/r/${subreddit}/`;
    
    console.log(`Scraping Reddit directly from: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Reddit page: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = load(html);
    
    const posts: ScrapedRedditPost[] = [];
    
    // Parse Reddit's HTML structure to extract posts
    $('[data-testid="post-container"]').each((index, element) => {
      if (posts.length >= limit) return false;
      
      const $post = $(element);
      
      // Extract post title
      const titleElement = $post.find('h3').first();
      const title = titleElement.text().trim();
      
      // Extract author
      const authorElement = $post.find('[data-testid="post_author_link"]');
      const author = authorElement.text().replace('u/', '').trim();
      
      // Extract upvotes
      const upvoteElement = $post.find('[data-testid="upvote-button"]').parent();
      const upvoteText = upvoteElement.text();
      const ups = parseInt(upvoteText.replace(/[^0-9]/g, '')) || 0;
      
      // Extract comment count
      const commentElement = $post.find('[data-testid="post-comment-count"]');
      const commentText = commentElement.text();
      const num_comments = parseInt(commentText.replace(/[^0-9]/g, '')) || 0;
      
      // Extract post link
      const linkElement = $post.find('a[data-testid="post-title"]');
      const postUrl = linkElement.attr('href') || '';
      const permalink = postUrl.startsWith('/') ? `https://reddit.com${postUrl}` : postUrl;
      
      // Extract post content/selftext
      const contentElement = $post.find('[data-testid="post-content"]');
      const selftext = contentElement.text().trim();
      
      if (title && author && author.length > 2 && !author.includes('[deleted]') && !author.includes('[removed]')) {
        posts.push({
          title,
          author,
          subreddit,
          ups,
          num_comments,
          url: permalink,
          selftext,
          created_utc: Math.floor(Date.now() / 1000),
          permalink
        });
        
        console.log(`Scraped post by u/${author}: ${title.substring(0, 50)}...`);
      }
    });

    // Fallback: Try alternative selectors if modern React structure doesn't work
    if (posts.length === 0) {
      console.log('Trying alternative HTML parsing approach...');
      
      // Look for post data in script tags (Reddit often includes JSON data)
      $('script').each((index, element) => {
        const scriptContent = $(element).html() || '';
        
        if (scriptContent.includes('"posts"') && scriptContent.includes('"author"')) {
          try {
            // Extract JSON data from script tags
            const jsonMatch = scriptContent.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/);
            if (jsonMatch) {
              const data = JSON.parse(jsonMatch[1]);
              
              // Navigate through Reddit's data structure
              if (data.posts && typeof data.posts === 'object') {
                Object.values(data.posts).forEach((post: any) => {
                  if (posts.length >= limit) return;
                  
                  if (post.title && post.author && post.subreddit === subreddit) {
                    posts.push({
                      title: post.title,
                      author: post.author,
                      subreddit: post.subreddit,
                      ups: post.ups || 0,
                      num_comments: post.num_comments || 0,
                      url: `https://reddit.com${post.permalink}`,
                      selftext: post.selftext || '',
                      created_utc: post.created_utc || Math.floor(Date.now() / 1000),
                      permalink: `https://reddit.com${post.permalink}`
                    });
                    
                    console.log(`Extracted from JSON: u/${post.author}: ${post.title.substring(0, 50)}...`);
                  }
                });
              }
            }
          } catch (error) {
            // Continue if JSON parsing fails
          }
        }
      });
    }

    console.log(`Successfully scraped ${posts.length} authentic posts from r/${subreddit}`);
    return posts;
    
  } catch (error) {
    console.error(`Failed to scrape r/${subreddit}:`, error);
    throw error;
  }
}

export async function scrapeUserProfile(username: string): Promise<{ karma: number; cakeDay?: string } | null> {
  try {
    const url = `https://www.reddit.com/user/${username}/`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const $ = load(html);
    
    // Extract karma from user profile
    const karmaElement = $('[data-testid="profile-karma"]');
    const karmaText = karmaElement.text();
    const karma = parseInt(karmaText.replace(/[^0-9]/g, '')) || 0;
    
    // Extract cake day
    const cakeDayElement = $('[data-testid="profile-cake-day"]');
    const cakeDay = cakeDayElement.text().trim();
    
    return { karma, cakeDay: cakeDay || undefined };
    
  } catch (error) {
    console.error(`Failed to scrape profile for u/${username}:`, error);
    return null;
  }
}