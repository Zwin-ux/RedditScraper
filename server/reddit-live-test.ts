// Direct Reddit API test with authentic data
async function testLiveRedditAPI() {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('Reddit API credentials not found');
    return;
  }

  try {
    console.log('Testing live Reddit API connection...');

    // Authenticate
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const authResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'RedditContentAnalyzer/1.0.0'
      },
      body: 'grant_type=client_credentials'
    });

    if (!authResponse.ok) {
      throw new Error(`Authentication failed: ${authResponse.status}`);
    }

    const authData = await authResponse.json();
    console.log('Authentication successful');

    // Get real posts
    const postsResponse = await fetch('https://oauth.reddit.com/r/datascience/hot?limit=5&raw_json=1', {
      headers: {
        'Authorization': `Bearer ${authData.access_token}`,
        'User-Agent': 'RedditContentAnalyzer/1.0.0'
      }
    });

    if (!postsResponse.ok) {
      throw new Error(`Posts request failed: ${postsResponse.status}`);
    }

    const postsData = await postsResponse.json();
    console.log('\n=== AUTHENTIC REDDIT POSTS FROM r/datascience ===');

    if (postsData.data && postsData.data.children) {
      postsData.data.children.slice(0, 5).forEach((child: any, index: number) => {
        const post = child.data;
        if (post.author !== '[deleted]' && post.author !== 'AutoModerator') {
          console.log(`\n${index + 1}. ${post.title}`);
          console.log(`   Author: u/${post.author}`);
          console.log(`   Score: ${post.ups} upvotes`);
          console.log(`   Comments: ${post.num_comments}`);
          console.log(`   Reddit Link: https://reddit.com${post.permalink}`);
          console.log(`   External URL: ${post.url}`);
          console.log(`   Domain: ${post.domain}`);
          console.log(`   Created: ${new Date(post.created_utc * 1000).toLocaleString()}`);
          console.log(`   ID: ${post.id}`);
        }
      });
    }

    console.log('\n=== Reddit API test completed successfully ===');

  } catch (error) {
    console.error('Reddit API test failed:', error);
  }
}

export { testLiveRedditAPI };