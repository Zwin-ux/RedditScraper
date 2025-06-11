import { RedditScraperV2 } from './server/reddit-scraper-v2.js';

async function testDirectScraping() {
  console.log('Testing Reddit Scraper V2 directly...\n');

  try {
    // Test scraping r/MachineLearning
    const scraper = new RedditScraperV2({
      subreddit: 'MachineLearning',
      limit: 20,
      sort: 'hot',
      minScore: 3,
      enableLogging: true,
      usePushshift: true
    });
    
    const result = await scraper.scrapeSubreddit({
      subreddit: 'MachineLearning',
      limit: 20,
      sort: 'hot',
      minScore: 3,
      enableLogging: true,
      usePushshift: true
    });
    
    console.log(`Found ${result.posts.length} posts from r/MachineLearning`);
    
    // Extract unique creators
    const creators = new Map();
    
    for (const post of result.posts) {
      const username = post.author;
      if (username === '[deleted]' || username === 'AutoModerator') continue;
      
      if (!creators.has(username)) {
        creators.set(username, {
          username,
          posts: 0,
          totalScore: 0,
          recentPost: ''
        });
      }
      
      const creator = creators.get(username);
      creator.posts += 1;
      creator.totalScore += post.score || 0;
      if (!creator.recentPost) {
        creator.recentPost = post.title.substring(0, 60) + '...';
      }
    }
    
    // Sort by engagement
    const sortedCreators = Array.from(creators.values())
      .filter(c => c.posts >= 1 && c.totalScore >= 5)
      .sort((a, b) => (b.totalScore + b.posts * 2) - (a.totalScore + a.posts * 2))
      .slice(0, 10);
    
    console.log(`\nFound ${sortedCreators.length} active creators:`);
    sortedCreators.forEach((creator, i) => {
      console.log(`${i + 1}. ${creator.username}`);
      console.log(`   Posts: ${creator.posts}, Total Score: ${creator.totalScore}`);
      console.log(`   Recent: ${creator.recentPost}`);
      console.log('');
    });
    
    return sortedCreators;
    
  } catch (error) {
    console.error('Error:', error.message);
    return [];
  }
}

testDirectScraping();