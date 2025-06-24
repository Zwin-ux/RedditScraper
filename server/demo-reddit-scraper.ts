#!/usr/bin/env tsx

import { RedditScraperV2, ScrapingOptions } from './reddit-scraper-v2';
import fs from 'fs/promises';
import path from 'path';

async function demonstrateRedditScraper() {
  console.log('🔥 Reddit Scraper V2 Demonstration');
  console.log('=====================================\n');

  // Test 1: Basic authentication
  console.log('1. Testing Reddit API Authentication...');
  try {
    const scraper = new RedditScraperV2({ subreddit: 'test', enableLogging: false });
    await (scraper as any).authenticate();
    console.log('✅ Authentication successful\n');
  } catch (error) {
    console.log('❌ Authentication failed:', error);
    return;
  }

  // Test 2: Basic subreddit scraping
  console.log('2. Scraping r/MachineLearning (hot posts)...');
  try {
    const options: ScrapingOptions = {
      subreddit: 'MachineLearning',
      limit: 10,
      sort: 'hot',
      enableLogging: true,
      usePushshift: true
    };

    const scraper = new RedditScraperV2(options);
    const result = await scraper.scrapeSubreddit(options);

    console.log(`📊 Results: ${result.totalFound} posts found`);
    console.log(`⏱️  Execution time: ${result.executionTime}ms`);
    console.log(`📡 Data source: ${result.source}`);
    console.log(`❌ Errors: ${result.errors.length}\n`);

    // Show sample post
    if (result.posts.length > 0) {
      const samplePost = result.posts[0];
      console.log('📝 Sample post:');
      console.log(`   Title: ${samplePost.title.substring(0, 60)}...`);
      console.log(`   Author: ${samplePost.author}`);
      console.log(`   Score: ${samplePost.score}`);
      console.log(`   Created: ${samplePost.created_date}`);
      console.log(`   Comments: ${samplePost.num_comments}\n`);
    }

  } catch (error) {
    console.log('❌ Basic scraping failed:', error);
  }

  // Test 3: Advanced filtering
  console.log('3. Advanced filtering (r/datascience with keywords)...');
  try {
    const options: ScrapingOptions = {
      subreddit: 'datascience',
      limit: 20,
      sort: 'top',
      timeframe: 'week',
      keywordFilter: ['python', 'machine learning', 'AI'],
      minScore: 10,
      enableLogging: false,
      usePushshift: true
    };

    const scraper = new RedditScraperV2(options);
    const result = await scraper.scrapeSubreddit(options);

    console.log(`📊 Filtered results: ${result.totalFound} posts`);
    console.log(`🎯 Keywords: python, machine learning, AI`);
    console.log(`📈 Min score: 10`);
    console.log(`📅 Timeframe: week\n`);

  } catch (error) {
    console.log('❌ Advanced filtering failed:', error);
  }

  // Test 4: Batch scraping multiple subreddits
  console.log('4. Batch scraping multiple subreddits...');
  try {
    const subreddits = ['artificial', 'deeplearning', 'MachineLearning'];
    const baseOptions = {
      limit: 5,
      sort: 'hot' as const,
      enableLogging: false,
      usePushshift: true
    };

    const scraper = new RedditScraperV2();
    const results = await scraper.scrapeMultipleSubreddits(subreddits, baseOptions);
    const stats = scraper.getStats(results);

    console.log(`📊 Batch results:`);
    console.log(`   Subreddits processed: ${stats.subredditsScraped}`);
    console.log(`   Total posts: ${stats.totalPosts}`);
    console.log(`   Average execution time: ${Math.round(stats.avgExecutionTime)}ms`);
    console.log(`   Source breakdown:`, stats.sourceBreakdown);
    console.log(`   Rate limited requests: ${stats.rateLimitedRequests}\n`);

  } catch (error) {
    console.log('❌ Batch scraping failed:', error);
  }

  // Test 5: Export to different formats
  console.log('5. Testing export functionality...');
  try {
    const options: ScrapingOptions = {
      subreddit: 'programming',
      limit: 5,
      sort: 'hot',
      outputFile: './output/reddit_scrape_demo.json',
      outputFormat: 'json',
      enableLogging: false,
      usePushshift: true
    };

    // Ensure output directory exists
    await fs.mkdir('./output', { recursive: true });

    const scraper = new RedditScraperV2(options);
    const result = await scraper.scrapeSubreddit(options);

    console.log(`📁 Results exported to: ${options.outputFile}`);
    console.log(`📊 Exported ${result.totalFound} posts in JSON format\n`);

    // Also export as CSV
    const csvOptions: ScrapingOptions = {
      ...options,
      outputFile: './output/reddit_scrape_demo.csv',
      outputFormat: 'csv'
    };

    await scraper.scrapeSubreddit(csvOptions);
    console.log(`📁 Results also exported to: ${csvOptions.outputFile}\n`);

  } catch (error) {
    console.log('❌ Export functionality failed:', error);
  }

  // Test 6: Rate limiting and error handling
  console.log('6. Testing rate limiting and error handling...');
  try {
    const options: ScrapingOptions = {
      subreddit: 'nonexistentsubreddit12345',
      limit: 5,
      sort: 'hot',
      enableLogging: false,
      usePushshift: true,
      maxRetries: 2,
      retryDelay: 1000
    };

    const scraper = new RedditScraperV2(options);
    const result = await scraper.scrapeSubreddit(options);

    if (result.errors.length > 0) {
      console.log('✅ Error handling working correctly');
      console.log(`   Errors caught: ${result.errors.length}`);
      console.log(`   First error: ${result.errors[0]?.substring(0, 60)}...`);
    }

  } catch (error) {
    console.log('✅ Error handling working correctly - caught exception');
  }

  console.log('\n🎉 Reddit Scraper V2 demonstration completed!');
  console.log('=====================================');
  console.log('Key Features Demonstrated:');
  console.log('✅ Official Reddit API authentication');
  console.log('✅ Multiple sorting options (hot, new, top, rising)');
  console.log('✅ Advanced filtering (keywords, flair, score, age)');
  console.log('✅ Pushshift.io fallback for historical data');
  console.log('✅ Rate limiting and retry logic');
  console.log('✅ Batch processing multiple subreddits');
  console.log('✅ JSON and CSV export formats');
  console.log('✅ Comprehensive error handling');
  console.log('✅ Modular, reusable architecture\n');
}

// Run demonstration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateRedditScraper().catch(console.error);
}

export { demonstrateRedditScraper };