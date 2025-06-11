#!/usr/bin/env node

import { RedditScraperV2, ScrapingOptions } from './reddit-scraper-v2';
import { Command } from 'commander';
import path from 'path';

const program = new Command();

program
  .name('reddit-scraper')
  .description('Reliable Reddit scraper using official API with Pushshift fallback')
  .version('2.0.0');

program
  .command('scrape')
  .description('Scrape posts from a subreddit')
  .requiredOption('-s, --subreddit <name>', 'Subreddit to scrape (without r/)')
  .option('-l, --limit <number>', 'Maximum number of posts to fetch', '100')
  .option('-t, --timeframe <period>', 'Time period for top posts', 'week')
  .option('--sort <method>', 'Sort method: hot, new, top, rising', 'hot')
  .option('-f, --flair <flairs...>', 'Filter by post flairs')
  .option('-k, --keywords <words...>', 'Filter by keywords in title/content')
  .option('--min-score <number>', 'Minimum post score threshold')
  .option('--max-age <days>', 'Maximum post age in days')
  .option('-o, --output <file>', 'Output file path')
  .option('--format <type>', 'Output format: json or csv', 'json')
  .option('--no-pushshift', 'Disable Pushshift fallback')
  .option('--retries <number>', 'Maximum retry attempts', '3')
  .option('--delay <ms>', 'Retry delay in milliseconds', '2000')
  .option('--verbose', 'Enable verbose logging')
  .action(async (options) => {
    try {
      const scrapingOptions: ScrapingOptions = {
        subreddit: options.subreddit,
        limit: parseInt(options.limit),
        timeframe: options.timeframe,
        sort: options.sort,
        flairFilter: options.flair,
        keywordFilter: options.keywords,
        minScore: options.minScore ? parseInt(options.minScore) : undefined,
        maxAge: options.maxAge ? parseInt(options.maxAge) : undefined,
        outputFile: options.output,
        outputFormat: options.format,
        usePushshift: options.pushshift,
        maxRetries: parseInt(options.retries),
        retryDelay: parseInt(options.delay),
        enableLogging: options.verbose
      };

      const scraper = new RedditScraperV2(scrapingOptions);
      const result = await scraper.scrapeSubreddit(scrapingOptions);

      if (!options.output) {
        console.log(JSON.stringify(result, null, 2));
      }

      console.log(`\nScraping Summary:`);
      console.log(`- Posts found: ${result.totalFound}`);
      console.log(`- Source: ${result.source}`);
      console.log(`- Execution time: ${result.executionTime}ms`);
      console.log(`- Errors: ${result.errors.length}`);
      
      if (result.errors.length > 0) {
        console.log(`\nErrors:`);
        result.errors.forEach(error => console.log(`  - ${error}`));
      }

    } catch (error) {
      console.error(`Error: ${error}`);
      process.exit(1);
    }
  });

program
  .command('batch')
  .description('Scrape multiple subreddits')
  .requiredOption('-s, --subreddits <names...>', 'Subreddits to scrape (space-separated)')
  .option('-l, --limit <number>', 'Posts per subreddit', '50')
  .option('--sort <method>', 'Sort method', 'hot')
  .option('-o, --output <directory>', 'Output directory', './output')
  .option('--format <type>', 'Output format', 'json')
  .option('--verbose', 'Enable verbose logging')
  .action(async (options) => {
    try {
      const baseOptions = {
        limit: parseInt(options.limit),
        sort: options.sort,
        outputFormat: options.format,
        enableLogging: options.verbose
      };

      const scraper = new RedditScraperV2();
      const results = await scraper.scrapeMultipleSubreddits(options.subreddits, baseOptions);

      // Save individual results
      for (const result of results) {
        const filename = `${result.subreddit}_${Date.now()}.${options.format}`;
        const filepath = path.join(options.output, filename);
        
        if (options.format === 'csv') {
          await scraper['saveAsCSV'](result.posts, filepath);
        } else {
          await scraper['saveAsJSON'](result, filepath);
        }
      }

      const stats = scraper.getStats(results);
      console.log('\nBatch Scraping Summary:');
      console.log(JSON.stringify(stats, null, 2));

    } catch (error) {
      console.error(`Error: ${error}`);
      process.exit(1);
    }
  });

program
  .command('test-auth')
  .description('Test Reddit API authentication')
  .action(async () => {
    try {
      const scraper = new RedditScraperV2({ subreddit: 'test', enableLogging: true });
      await scraper['authenticate']();
      console.log('✅ Authentication successful!');
    } catch (error) {
      console.error(`❌ Authentication failed: ${error}`);
      process.exit(1);
    }
  });

if (require.main === module) {
  program.parse();
}

export { program };