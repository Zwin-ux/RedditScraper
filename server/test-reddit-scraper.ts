import { enhancedRedditScraper } from './enhanced-reddit-scraper';

async function testRedditScraper() {
  console.log('=== Testing Enhanced Reddit Scraper ===\n');

  try {
    // Test authentication
    console.log('1. Testing Reddit API authentication...');
    const token = await enhancedRedditScraper.authenticate();
    console.log('✅ Authentication successful');
    console.log(`Token length: ${token.length} characters\n`);

    // Test scraping hot posts
    console.log('2. Scraping hot posts from r/datascience...');
    const hotPosts = await enhancedRedditScraper.scrapeSubredditPosts('datascience', 'hot', 5);
    
    console.log(`✅ Retrieved ${hotPosts.length} hot posts:`);
    hotPosts.forEach((post, index) => {
      console.log(`\n${index + 1}. ${post.title}`);
      console.log(`   Author: u/${post.author}`);
      console.log(`   Score: ${post.ups} upvotes`);
      console.log(`   Comments: ${post.num_comments}`);
      console.log(`   Reddit Link: ${post.permalink}`);
      console.log(`   External URL: ${post.url}`);
      console.log(`   Domain: ${post.domain}`);
      console.log(`   Created: ${new Date(post.created_utc * 1000).toLocaleString()}`);
    });

    // Test search functionality
    console.log('\n3. Testing search functionality...');
    const searchPosts = await enhancedRedditScraper.searchSubreddit('datascience', 'machine learning', 3);
    
    console.log(`✅ Retrieved ${searchPosts.length} search results for "machine learning":`);
    searchPosts.forEach((post, index) => {
      console.log(`\n${index + 1}. ${post.title}`);
      console.log(`   Author: u/${post.author}`);
      console.log(`   Reddit Link: ${post.permalink}`);
    });

    // Test top creators
    console.log('\n4. Testing top creators extraction...');
    const topCreators = await enhancedRedditScraper.getTopCreators('datascience');
    
    console.log(`✅ Retrieved ${topCreators.length} top creators:`);
    topCreators.slice(0, 5).forEach((creator, index) => {
      console.log(`\n${index + 1}. u/${creator.username}`);
      console.log(`   Total Score: ${creator.totalScore}`);
      console.log(`   Posts: ${creator.postCount}`);
      console.log(`   Recent Post: ${creator.posts[0]?.title || 'N/A'}`);
    });

    console.log('\n=== All tests completed successfully! ===');

  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testRedditScraper();
}

export { testRedditScraper };