// Test Reddit API authentication
export async function testRedditAuth() {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.error('Reddit credentials not found');
    return false;
  }
  
  console.log('Testing Reddit API authentication...');
  console.log('Client ID length:', clientId.length);
  console.log('Client Secret length:', clientSecret.length);
  
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  try {
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'RedditContentAnalyzer/1.0.0'
      },
      body: 'grant_type=client_credentials'
    });
    
    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('Response body:', responseText);
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('Authentication successful!');
      console.log('Access token received:', data.access_token ? 'Yes' : 'No');
      return true;
    } else {
      console.error('Authentication failed');
      return false;
    }
  } catch (error) {
    console.error('Auth test error:', error);
    return false;
  }
}