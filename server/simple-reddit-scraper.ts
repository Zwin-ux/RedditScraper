import { RedditScraperV2 } from './reddit-scraper-v2';
import { analyzeCreatorContent } from './gemini';

export interface CreatorProfile {
  username: string;
  posts: number;
  totalScore: number;
  avgScore: number;
  categories: string[];
  profileLink: string;
  recentPosts: Array<{
    title: string;
    score: number;
    comments: number;
  }>;
}

export async function scrapeSubredditCreators(subreddit: string): Promise<{
  success: boolean;
  creators: CreatorProfile[];
  totalPosts: number;
  message: string;
}> {
  try {
    console.log(`Scraping r/${subreddit} for active creators...`);
    
    // Use Reddit Scraper V2 to get actual posts
    const scraper = new RedditScraperV2({
      subreddit,
      limit: 100,
      sort: 'hot',
      minScore: 3,
      enableLogging: false,
      usePushshift: true
    });
    
    const result = await scraper.scrapeSubreddit({
      subreddit,
      limit: 100,
      sort: 'hot',
      minScore: 3,
      enableLogging: false,
      usePushshift: true
    });
    
    console.log(`Found ${result.posts.length} posts from r/${subreddit}`);
    
    // Extract creators from posts
    const creatorMap = new Map<string, {
      posts: any[];
      totalScore: number;
      categories: Set<string>;
    }>();
    
    for (const post of result.posts) {
      const username = post.author;
      if (username === '[deleted]' || username === 'AutoModerator' || username === 'automoderator') {
        continue;
      }
      
      if (!creatorMap.has(username)) {
        creatorMap.set(username, {
          posts: [],
          totalScore: 0,
          categories: new Set()
        });
      }
      
      const creator = creatorMap.get(username)!;
      creator.posts.push(post);
      creator.totalScore += post.score || 0;
      
      // Categorize based on content
      const content = (post.title + ' ' + (post.selftext || '')).toLowerCase();
      if (content.includes('career') || content.includes('job') || content.includes('interview')) {
        creator.categories.add('Career');
      }
      if (content.includes('python') || content.includes('coding') || content.includes('programming')) {
        creator.categories.add('Programming');
      }
      if (content.includes('machine learning') || content.includes('ml') || content.includes('ai') || content.includes('artificial intelligence')) {
        creator.categories.add('Machine Learning');
      }
      if (content.includes('data') || content.includes('analysis') || content.includes('analytics') || content.includes('visualization')) {
        creator.categories.add('Data Analysis');
      }
      if (content.includes('research') || content.includes('paper') || content.includes('study')) {
        creator.categories.add('Research');
      }
      if (creator.categories.size === 0) {
        creator.categories.add('Discussion');
      }
    }
    
    // Filter and sort creators
    const creators: CreatorProfile[] = Array.from(creatorMap.entries())
      .filter(([username, data]) => data.posts.length >= 1 && data.totalScore >= 5)
      .sort((a, b) => {
        const scoreA = a[1].totalScore + (a[1].posts.length * 5);
        const scoreB = b[1].totalScore + (b[1].posts.length * 5);
        return scoreB - scoreA;
      })
      .slice(0, 15)
      .map(([username, data]) => ({
        username,
        posts: data.posts.length,
        totalScore: data.totalScore,
        avgScore: Math.round(data.totalScore / data.posts.length),
        categories: Array.from(data.categories),
        profileLink: `https://reddit.com/u/${username}`,
        recentPosts: data.posts.slice(0, 3).map(p => ({
          title: p.title.substring(0, 60) + '...',
          score: p.score || 0,
          comments: p.num_comments || 0
        }))
      }));
    
    return {
      success: true,
      creators,
      totalPosts: result.posts.length,
      message: `Found ${creators.length} active creators from ${result.posts.length} posts in r/${subreddit}`
    };
    
  } catch (error) {
    console.error(`Reddit scraping failed for r/${subreddit}:`, error);
    return {
      success: false,
      creators: [],
      totalPosts: 0,
      message: `Failed to scrape r/${subreddit}: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function enhanceCreatorsWithAI(creators: CreatorProfile[]): Promise<CreatorProfile[]> {
  const enhanced: CreatorProfile[] = [];
  
  for (const creator of creators.slice(0, 5)) { // Limit AI analysis to top 5
    try {
      const posts = creator.recentPosts.map(p => ({ title: p.title, content: '' }));
      const analysis = await analyzeCreatorContent(creator.username, posts);
      
      enhanced.push({
        ...creator,
        categories: Array.from(new Set([...creator.categories, ...analysis.tags.slice(0, 2)]))
      });
    } catch (error) {
      enhanced.push(creator);
    }
  }
  
  // Add remaining creators without AI enhancement
  enhanced.push(...creators.slice(5));
  
  return enhanced;
}