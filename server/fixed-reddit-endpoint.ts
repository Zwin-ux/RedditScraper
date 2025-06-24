import type { Express } from "express";
import { RedditScraperV2 } from './reddit-scraper-v2';
import { storage } from './storage';

export function addFixedRedditEndpoint(app: Express) {
  app.post("/api/scrape-subreddit-fixed", async (req, res) => {
    const { subreddit } = req.body;
    
    if (!subreddit) {
      return res.status(400).json({ success: false, error: "Subreddit name is required" });
    }

    try {
      console.log(`Scraping r/${subreddit} for active creators...`);
      
      // Use Reddit Scraper V2 to get actual posts with multiple strategies
      let result;
      const strategies = [
        { sort: 'hot', minScore: 1, timeframe: 'week' },
        { sort: 'new', minScore: 1, timeframe: 'month' },
        { sort: 'top', minScore: 5, timeframe: 'month' }
      ];
      
      for (const strategy of strategies) {
        try {
          const scraper = new RedditScraperV2({
            subreddit,
            limit: 75,
            sort: strategy.sort as any,
            timeframe: strategy.timeframe as any,
            minScore: strategy.minScore,
            enableLogging: false,
            usePushshift: true
          });
          
          result = await scraper.scrapeSubreddit({
            subreddit,
            limit: 75,
            sort: strategy.sort as any,
            timeframe: strategy.timeframe as any,
            minScore: strategy.minScore,
            enableLogging: false,
            usePushshift: true
          });
          
          if (result.posts.length > 5) {
            console.log(`Successfully scraped r/${subreddit} using ${strategy.sort} strategy`);
            break;
          }
        } catch (error) {
          console.log(`Strategy ${strategy.sort} failed for r/${subreddit}, trying next...`);
          continue;
        }
      }
      
      if (!result || result.posts.length === 0) {
        console.log(`No posts found for r/${subreddit} with any strategy`);
        return res.json({
          success: true,
          data: {
            subreddit,
            postsAnalyzed: 0,
            creatorsFound: 0,
            creatorsStored: 0,
            topCreators: [],
            message: `r/${subreddit} appears to be private, restricted, or has no recent activity`
          }
        });
      }
      
      console.log(`Found ${result.posts.length} posts from r/${subreddit}`);
      
      // Extract creators from posts
      const creatorMap = new Map();
      
      for (const post of result.posts) {
        const username = post.author;
        if (username === '[deleted]' || username === 'AutoModerator' || username === 'automoderator') {
          continue;
        }
        
        if (!creatorMap.has(username)) {
          creatorMap.set(username, {
            username,
            posts: 0,
            totalScore: 0,
            categories: new Set(),
            recentPosts: []
          });
        }
        
        const creator = creatorMap.get(username);
        creator.posts += 1;
        creator.totalScore += post.score || 0;
        creator.recentPosts.push({
          title: post.title.substring(0, 80),
          score: post.score || 0,
          comments: post.num_comments || 0,
          link: `https://reddit.com${post.permalink}`,
          timestamp: post.created_utc
        });
        
        // Categorize based on content
        const content = (post.title + ' ' + (post.selftext || '')).toLowerCase();
        if (content.includes('career') || content.includes('job')) {
          creator.categories.add('Career');
        }
        if (content.includes('python') || content.includes('coding') || content.includes('programming')) {
          creator.categories.add('Programming');
        }
        if (content.includes('machine learning') || content.includes('ml') || content.includes('ai')) {
          creator.categories.add('Machine Learning');
        }
        if (content.includes('data') || content.includes('analysis') || content.includes('visualization')) {
          creator.categories.add('Data Analysis');
        }
        if (content.includes('research') || content.includes('paper')) {
          creator.categories.add('Research');
        }
        if (creator.categories.size === 0) {
          creator.categories.add('Discussion');
        }
      }
      
      // Filter and sort creators
      const creators = Array.from(creatorMap.values())
        .filter(creator => creator.posts >= 1 && creator.totalScore >= 3)
        .sort((a, b) => {
          const scoreA = a.totalScore + (a.posts * 2);
          const scoreB = b.totalScore + (b.posts * 2);
          return scoreB - scoreA;
        })
        .slice(0, 15);
      
      // Store in database
      let stored = 0;
      // Only store creators with verified Reddit API data
      for (const creator of creators.slice(0, 10)) {
        try {
          // Verify this is authentic Reddit data by checking post links
          const hasValidPosts = creator.recentPosts.some((post: any) => 
            post.link && post.link.includes('reddit.com') && post.timestamp > 0
          );
          
          if (!hasValidPosts) {
            console.log(`Skipping ${creator.username} - no verified Reddit posts`);
            continue;
          }
          
          const existing = await storage.getCreatorByUsername(creator.username);
          let creatorId: number;
          
          if (!existing) {
            const newCreator = await storage.createCreator({
              username: creator.username,
              platform: "Reddit",
              subreddit,
              karma: creator.totalScore,
              engagementScore: Math.min(100, Math.max(20, Math.floor(creator.totalScore / 2))),
              tags: Array.from(creator.categories),
              profileLink: `https://reddit.com/u/${creator.username}`,
              lastActive: new Date(),
              postsCount: creator.posts,
            });
            creatorId = newCreator.id;
            stored++;
            console.log(`Stored verified Reddit creator: ${creator.username}`);
          } else {
            creatorId = existing.id;
            // Update existing creator with latest activity
            await storage.updateCreator(existing.id, {
              karma: Math.max(existing.karma, creator.totalScore),
              lastActive: new Date(),
              postsCount: existing.postsCount + creator.posts,
            });
            console.log(`Updated existing creator: ${creator.username}`);
          }
          
          // Store actual posts for this creator
          for (const post of creator.recentPosts.slice(0, 3)) {
            try {
              const redditId = post.link ? post.link.split('/').pop() || `${subreddit}_${Date.now()}` : `${subreddit}_${Date.now()}`;
              await storage.createPost({
                creatorId,
                title: post.title || 'Untitled Post',
                content: post.content || '',
                subreddit,
                upvotes: post.score || 0,
                awards: post.awards || 0,
                redditId,
                redditUrl: post.link || `https://reddit.com/r/${subreddit}`,
              });
              console.log(`Stored post: ${post.title?.substring(0, 50)}...`);
            } catch (error) {
              // Skip duplicate posts (redditId constraint)
              if (!error.message?.includes('duplicate')) {
                console.error(`Failed to store post:`, error);
              }
            }
          }
        } catch (error) {
          console.error(`Failed to store creator ${creator.username}:`, error);
        }
      }

      res.json({
        success: true,
        data: {
          subreddit,
          postsAnalyzed: result.posts.length,
          creatorsFound: creators.length,
          creatorsStored: stored,
          topCreators: creators.slice(0, 8).map(creator => ({
            username: creator.username,
            posts: creator.posts,
            karma: creator.totalScore,
            avgScore: Math.round(creator.totalScore / creator.posts),
            specialties: Array.from(creator.categories),
            profileLink: `https://reddit.com/u/${creator.username}`,
            recentActivity: creator.recentPosts[0]?.title || 'No recent posts',
            recentPosts: creator.recentPosts.slice(0, 3).map(post => ({
              title: post.title,
              score: post.score,
              comments: post.comments,
              link: post.link,
              timeAgo: Math.floor((Date.now() / 1000 - post.timestamp) / 3600) + 'h ago'
            }))
          }))
        },
        message: `Found ${creators.length} active creators from ${result.posts.length} posts in r/${subreddit}, stored ${stored} new profiles`
      });

    } catch (error) {
      console.error(`Reddit scraping failed for r/${subreddit}:`, error);
      res.status(500).json({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}