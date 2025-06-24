// Direct Reddit API test

async function testRedditAPI() {
  try {
    // Test with Reddit's public JSON endpoint first
    const response = await fetch('https://www.reddit.com/r/datascience/hot.json?limit=5', {
      headers: {
        'User-Agent': 'RedditAnalyzer/1.0 test script'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.data && data.data.children) {
      console.log('=== REAL REDDIT POSTS FROM r/datascience ===');
      
      data.data.children.slice(0, 5).forEach((child, index) => {
        const post = child.data;
        console.log(`\n${index + 1}. ${post.title}`);
        console.log(`   Author: u/${post.author}`);
        console.log(`   Score: ${post.ups} upvotes`);
        console.log(`   Comments: ${post.num_comments}`);
        console.log(`   Reddit Link: https://reddit.com${post.permalink}`);
        console.log(`   External URL: ${post.url}`);
        console.log(`   Created: ${new Date(post.created_utc * 1000).toLocaleString()}`);
      });
    } else {
      console.log('No posts found in response');
    }
    
  } catch (error) {
    console.error('Error fetching Reddit data:', error.message);
  }
}

testRedditAPI();