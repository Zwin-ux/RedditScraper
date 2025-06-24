import { RedditScraper } from './src/services/reddit-scraper.js';
import { config } from './src/config/index.js';

async function runDemo() {
  console.log('🚀 Starting Reddit Scraper Demo 🚀');
  console.log('--------------------------------');
  
  // Initialize the scraper
  const scraper = new RedditScraper();
  
  try {
    // Demo 1: Search for posts in a subreddit
    console.log('\n🔍 Demo 1: Searching for posts in r/programming');
    const searchResult = await scraper.searchPosts('programming', { limit: 3 });
    console.log(`✅ Found ${searchResult.data.length} posts in r/programming`);
    searchResult.data.forEach((post, index) => {
      console.log(`\n📝 Post ${index + 1}:`);
      console.log(`   Title: ${post.title}`);
      console.log(`   Author: u/${post.author}`);
      console.log(`   Score: ${post.score} ⬆️`);
      console.log(`   Comments: ${post.num_comments} 💬`);
    });

    // Demo 2: Get top posts
    console.log('\n🏆 Demo 2: Getting top posts from r/javascript');
    const topPosts = await scraper.getTopPosts('javascript', { limit: 2 });
    console.log(`✅ Found ${topPosts.data.length} top posts in r/javascript`);
    topPosts.data.forEach((post, index) => {
      console.log(`\n🏅 Top Post ${index + 1}: ${post.title}`);
      console.log(`   Score: ${post.score} ⬆️`);
    });

    // Demo 3: Get user posts (if username is provided in config)
    if (config.redditUsername) {
      console.log('\n👤 Demo 3: Getting posts from a user');
      const userPosts = await scraper.getUserPosts(config.redditUsername, { limit: 2 });
      console.log(`✅ Found ${userPosts.data.length} posts from u/${config.redditUsername}`);
      userPosts.data.forEach((post, index) => {
        console.log(`\n📝 User Post ${index + 1}:`);
        console.log(`   Title: ${post.title}`);
        console.log(`   Posted in: r/${post.subreddit}`);
      });
    }

    console.log('\n✨ Demo completed successfully! ✨');
  } catch (error) {
    console.error('❌ Error during demo:', error);
  }
}

// Run the demo
runDemo().catch(console.error);
