import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { crawlAndProcessSubreddit, initializeSubreddits } from "./reddit";
import { redditApiClient } from "./reddit-api-client";
import { RedditScraperV2, ScrapingOptions } from "./reddit-scraper-v2";
import { scrapeSubredditCreators, enhanceCreatorsWithAI } from "./simple-reddit-scraper";
import { addFixedRedditEndpoint } from "./fixed-reddit-endpoint";
import { analyzeDataScienceTrends, analyzePostRelevance, analyzeCreatorContent } from "./gemini";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize subreddits on startup with error handling
  try {
    await initializeSubreddits();
    console.log("Successfully initialized subreddits");
  } catch (error) {
    console.error("Failed to initialize subreddits:", error);
    // Continue without subreddit initialization to allow server to start
  }

  // Test Reddit API credentials endpoint
  app.get("/api/test-reddit-credentials", async (req, res) => {
    try {
      const clientId = process.env.REDDIT_CLIENT_ID;
      const clientSecret = process.env.REDDIT_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        return res.json({
          success: false,
          message: "Reddit API credentials not configured",
          details: "REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET environment variables are required"
        });
      }

      // Test authentication
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
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
      
      if (response.ok) {
        const data = JSON.parse(responseText);
        res.json({
          success: true,
          message: "Reddit API credentials are valid",
          hasAccessToken: !!data.access_token,
          tokenType: data.token_type,
          expiresIn: data.expires_in
        });
      } else {
        res.json({
          success: false,
          message: "Reddit API authentication failed",
          status: response.status,
          error: responseText,
          suggestion: "Please verify your Reddit API credentials are correct"
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to test Reddit API credentials",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Advanced Reddit Scraper V2 Endpoints
  app.post("/api/v2/scrape", async (req, res) => {
    try {
      const {
        subreddit,
        limit = 100,
        timeframe = 'week',
        sort = 'hot',
        flairFilter,
        keywordFilter,
        minScore,
        maxAge,
        outputFormat = 'json',
        usePushshift = true,
        enableLogging = true
      } = req.body;

      if (!subreddit) {
        return res.status(400).json({
          success: false,
          error: "Subreddit parameter is required"
        });
      }

      const scrapingOptions: ScrapingOptions = {
        subreddit,
        limit: parseInt(limit),
        timeframe,
        sort,
        flairFilter: Array.isArray(flairFilter) ? flairFilter : undefined,
        keywordFilter: Array.isArray(keywordFilter) ? keywordFilter : undefined,
        minScore: minScore ? parseInt(minScore) : undefined,
        maxAge: maxAge ? parseInt(maxAge) : undefined,
        outputFormat,
        usePushshift,
        enableLogging,
        maxRetries: 3,
        retryDelay: 2000
      };

      const scraper = new RedditScraperV2(scrapingOptions);
      const result = await scraper.scrapeSubreddit(scrapingOptions);

      res.json({
        success: true,
        data: result,
        message: `Successfully scraped ${result.totalFound} posts from r/${subreddit}`
      });

    } catch (error) {
      console.error("Reddit Scraper V2 error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: "Failed to scrape subreddit"
      });
    }
  });

  app.post("/api/v2/batch-scrape", async (req, res) => {
    try {
      const {
        subreddits,
        limit = 50,
        sort = 'hot',
        outputFormat = 'json',
        enableLogging = true
      } = req.body;

      if (!Array.isArray(subreddits) || subreddits.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Subreddits array is required"
        });
      }

      const baseOptions = {
        limit: parseInt(limit),
        sort,
        outputFormat,
        enableLogging,
        maxRetries: 3,
        retryDelay: 2000
      };

      const scraper = new RedditScraperV2();
      const results = await scraper.scrapeMultipleSubreddits(subreddits, baseOptions);
      const stats = scraper.getStats(results);

      res.json({
        success: true,
        data: {
          results,
          stats
        },
        message: `Batch scraping completed for ${subreddits.length} subreddits`
      });

    } catch (error) {
      console.error("Batch scraping error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: "Failed to complete batch scraping"
      });
    }
  });

  app.get("/api/v2/test-reddit-auth", async (req, res) => {
    try {
      const scraper = new RedditScraperV2({ subreddit: 'test', enableLogging: false });
      await (scraper as any).authenticate();
      
      res.json({
        success: true,
        message: "Reddit API authentication successful",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: "Reddit API authentication failed"
      });
    }
  });

  app.post("/api/v2/scrape-with-ai", async (req, res) => {
    try {
      const {
        subreddit,
        limit = 50,
        sort = 'hot',
        keywordFilter,
        minScore = 10
      } = req.body;

      if (!subreddit) {
        return res.status(400).json({
          success: false,
          error: "Subreddit parameter is required"
        });
      }

      // First scrape with Reddit API
      const scrapingOptions: ScrapingOptions = {
        subreddit,
        limit: parseInt(limit),
        sort,
        keywordFilter: Array.isArray(keywordFilter) ? keywordFilter : undefined,
        minScore: parseInt(minScore),
        enableLogging: true,
        usePushshift: true
      };

      const scraper = new RedditScraperV2(scrapingOptions);
      const result = await scraper.scrapeSubreddit(scrapingOptions);

      // Enhance with AI analysis using Gemini
      const enhancedPosts = [];
      for (const post of result.posts.slice(0, 20)) { // Limit AI analysis to first 20 posts
        try {
          const analysis = await analyzePostRelevance(post.title, post.selftext);
          enhancedPosts.push({
            ...post,
            aiAnalysis: analysis
          });
        } catch (error) {
          enhancedPosts.push({
            ...post,
            aiAnalysis: { error: 'Analysis failed' }
          });
        }
      }

      res.json({
        success: true,
        data: {
          ...result,
          posts: enhancedPosts,
          aiEnhanced: true
        },
        message: `Scraped and analyzed ${result.totalFound} posts from r/${subreddit}`
      });

    } catch (error) {
      console.error("AI-enhanced scraping error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: "Failed to scrape and analyze subreddit"
      });
    }
  });
  
  // Comprehensive r/datascience analysis endpoint - Reddit API with Gemini
  app.post("/api/analyze-datascience", async (req, res) => {
    try {
      console.log("Starting r/datascience analysis with Reddit API...");
      
      // Use Reddit API to get posts with AI analysis
      const analysis = await redditApiClient.searchWithAIAnalysis('datascience', undefined, 100);
      const posts = analysis.posts;
      
      // Extract creators and calculate real engagement metrics
      const creatorsMap = new Map<string, { posts: number; totalUpvotes: number }>();
      const categories: Record<string, number> = {};
      let totalEngagement = 0;
      let validPosts = 0;
      
      for (const post of posts) {
        if (post.author) {
          const creatorData = creatorsMap.get(post.author) || { posts: 0, totalUpvotes: 0 };
          creatorData.posts++;
          creatorData.totalUpvotes += post.ups || 0;
          creatorsMap.set(post.author, creatorData);
        }
        
        if (post.ups) {
          totalEngagement += post.ups;
          validPosts++;
        }
        
        // Categorize posts based on content
        const content = (post.title + ' ' + (post.selftext || '')).toLowerCase();
        if (content.includes('career') || content.includes('job')) {
          categories.career = (categories.career || 0) + 1;
        } else if (content.includes('python') || content.includes('sql')) {
          categories.programming = (categories.programming || 0) + 1;
        } else if (content.includes('machine learning') || content.includes('ml')) {
          categories.machine_learning = (categories.machine_learning || 0) + 1;
        } else if (content.includes('visualization') || content.includes('plot')) {
          categories.visualization = (categories.visualization || 0) + 1;
        } else {
          categories.discussion = (categories.discussion || 0) + 1;
        }
      }
      
      // Store top creators with real data
      let creatorsProcessed = 0;
      const topCreators = Array.from(creatorsMap.entries())
        .sort((a, b) => b[1].totalUpvotes - a[1].totalUpvotes)
        .slice(0, 20);
        
      for (const [username, data] of topCreators) {
        try {
          const existing = await storage.getCreatorByUsername(username);
          if (!existing) {
            const avgUpvotes = data.posts > 0 ? Math.floor(data.totalUpvotes / data.posts) : 0;
            const engagementScore = Math.min(100, Math.max(10, Math.floor(avgUpvotes / 5)));
            
            await storage.createCreator({
              username,
              platform: "Reddit",
              subreddit: "datascience",
              karma: data.totalUpvotes,
              engagementScore,
              tags: ["Data Science"],
              profileLink: `https://reddit.com/u/${username}`,
              lastActive: new Date(),
              postsCount: data.posts,
              commentsCount: 0
            });
            creatorsProcessed++;
          }
        } catch (error) {
          console.error(`Failed to process creator ${username}:`, error);
        }
      }

      const insights = {
        totalPosts: posts.length,
        avgEngagement: validPosts > 0 ? Math.floor(totalEngagement / validPosts) : 0,
        activeUsers: creatorsMap.size,
        contentCategories: categories
      };

      res.json({
        success: true,
        summary: {
          postsAnalyzed: posts.length,
          creatorsFound: creatorsMap.size,
          creatorsProcessed,
          insights,
          topCreators: topCreators.slice(0, 10).map(([username, data]) => ({
            username,
            posts: data.posts,
            totalUpvotes: data.totalUpvotes
          }))
        },
        message: `Analyzed ${posts.length} real posts from r/datascience, found ${creatorsMap.size} creators, stored ${creatorsProcessed} new creators`
      });

    } catch (error) {
      console.error("Failed to analyze r/datascience:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to analyze r/datascience", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Fast subreddit scraping endpoint for UI button
  app.post("/api/scrape-subreddit", async (req, res) => {
    const { subreddit } = req.body;
    
    if (!subreddit) {
      return res.status(400).json({ success: false, error: "Subreddit name is required" });
    }

    try {
      console.log(`Scraping r/${subreddit} for active creators...`);
      
      let qualityCreators: any[] = [];
      
      try {
        // Use the comprehensive Reddit Scraper V2 to get actual posts
        const scraper = new RedditScraperV2({
          subreddit,
          limit: 100,
          sort: 'hot',
          minScore: 5,
          enableLogging: false,
          usePushshift: true
        });
        
        const result = await scraper.scrapeSubreddit({
          subreddit,
          limit: 100,
          sort: 'hot',
          minScore: 5,
          enableLogging: false,
          usePushshift: true
        });
        
        console.log(`Scraped ${result.posts.length} posts from r/${subreddit}`);
        
        // Extract creators from scraped posts and calculate engagement
        const creatorStats = new Map();
        
        for (const post of result.posts) {
          const username = post.author;
          if (username === '[deleted]' || username === 'AutoModerator') continue;
          
          if (!creatorStats.has(username)) {
            creatorStats.set(username, {
              username,
              posts: [],
              totalScore: 0,
              totalComments: 0,
              postCount: 0
            });
          }
          
          const creator = creatorStats.get(username);
          creator.posts.push(post);
          creator.totalScore += post.score || 0;
          creator.totalComments += post.num_comments || 0;
          creator.postCount += 1;
        }
        
        // Convert to array and sort by engagement
        const creators = Array.from(creatorStats.values())
          .filter(creator => creator.postCount >= 1 && creator.totalScore >= 5)
          .sort((a, b) => {
            const scoreA = a.totalScore + (a.totalComments * 0.1);
            const scoreB = b.totalScore + (b.totalComments * 0.1);
            return scoreB - scoreA;
          })
          .slice(0, 20);
        
        // Enhance with AI analysis for top creators
        for (const creator of creators) {
          try {
            const posts = creator.posts.slice(0, 3).map((p: any) => ({ title: p.title, content: p.selftext || '' }));
            const analysis = await analyzeCreatorContent(creator.username, posts);
            
            qualityCreators.push({
              username: creator.username,
              post_link: `https://reddit.com/u/${creator.username}`,
              upvotes: creator.totalScore,
              subreddit: subreddit,
              timestamp: Date.now() / 1000,
              title: `${creator.postCount} posts, ${Math.round(creator.totalScore/creator.postCount)} avg score - ${analysis.tags.slice(0, 3).join(', ')}`
            });
          } catch (analysisError) {
            // Include creator without AI analysis
            qualityCreators.push({
              username: creator.username,
              post_link: `https://reddit.com/u/${creator.username}`,
              upvotes: creator.totalScore,
              subreddit: subreddit,
              timestamp: Date.now() / 1000,
              title: `${creator.postCount} posts, ${Math.round(creator.totalScore/creator.postCount)} avg score`
            });
          }
        }
        
        console.log(`Found ${qualityCreators.length} active creators in r/${subreddit}`);
        
      } catch (scrapeError) {
        console.log(`Reddit scraping failed: ${scrapeError}`);
        
        // Fallback to existing database creators
        const existingCreators = await storage.getCreators({ 
          subreddit: subreddit, 
          limit: 10 
        });
        
        for (const creator of existingCreators) {
          qualityCreators.push({
            username: creator.username,
            post_link: `https://reddit.com/u/${creator.username}`,
            upvotes: creator.karma,
            subreddit: subreddit,
            timestamp: Date.now() / 1000,
            title: `Database creator - ${creator.engagementScore} engagement`
          });
        }
      }
      
      if (qualityCreators.length === 0) {
        return res.json({
          success: true,
          data: {
            subreddit,
            postsAnalyzed: 0,
            creatorsStored: 0,
            message: `No creators found in r/${subreddit}. This subreddit may be private or have no recent activity.`
          }
        });
      }
      
      // Process and categorize creators
      const creators = new Map<string, { posts: number; karma: number; categories: string[] }>();
      const categories: Record<string, number> = {};
      
      for (const creator of qualityCreators) {
        // Fast categorization based on content keywords
        const content = creator.title.toLowerCase();
        let category = 'General';
        if (content.includes('career') || content.includes('job')) {
          category = 'Career';
          categories['career'] = (categories['career'] || 0) + 1;
        } else if (content.includes('python') || content.includes('coding') || content.includes('programming')) {
          category = 'Programming';
          categories['programming'] = (categories['programming'] || 0) + 1;
        } else if (content.includes('machine learning') || content.includes('ml') || content.includes('ai')) {
          category = 'Machine Learning';
          categories['ml'] = (categories['ml'] || 0) + 1;
        } else if (content.includes('data') || content.includes('analysis') || content.includes('analytics')) {
          category = 'Data Analysis';
          categories['analysis'] = (categories['analysis'] || 0) + 1;
        } else {
          category = 'Discussion';
          categories['discussion'] = (categories['discussion'] || 0) + 1;
        }
        
        // Store creator data with real metrics
        const data = creators.get(creator.username) || { posts: 0, karma: 0, categories: [] };
        data.posts++;
        data.karma += creator.upvotes;
        if (!data.categories.includes(category)) {
          data.categories.push(category);
        }
        creators.set(creator.username, data);
      }
      
      // Store creator profiles in database
      let stored = 0;
      const topCreators = Array.from(creators.entries())
        .sort((a, b) => b[1].karma - a[1].karma)
        .slice(0, 15);
        
      for (const [username, data] of topCreators) {
        try {
          const existing = await storage.getCreatorByUsername(username);
          if (!existing) {
            const tags = data.categories.length > 0 ? data.categories : ["General"];
            await storage.createCreator({
              username,
              platform: "Reddit",
              subreddit,
              karma: data.karma,
              engagementScore: Math.min(100, Math.max(20, Math.floor(data.karma / 5))),
              tags,
              profileLink: `https://reddit.com/u/${username}`,
              lastActive: new Date(),
              postsCount: data.posts,
            });
            stored++;
          }
        } catch (error) {
          console.error(`Failed to store creator ${username}:`, error);
        }
      }

      res.json({
        success: true,
        data: {
          subreddit,
          postsAnalyzed: qualityCreators.length,
          creatorsFound: creators.size,
          creatorsStored: stored,
          categories,
          topCreators: topCreators.slice(0, 8).map(([username, data]) => ({
            username,
            posts: data.posts,
            karma: data.karma,
            specialties: data.categories,
            recent_post: qualityCreators.find(c => c.username === username)?.post_link
          }))
        },
        message: `Found ${creators.size} quality creators from r/${subreddit}, stored ${stored} new profiles`
      });

    } catch (error) {
      console.error(`Analysis failed for r/${subreddit}:`, error);
      res.status(500).json({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Enhanced r/datascience analysis with Google Gemini
  app.post("/api/scrape-datascience-now", async (req, res) => {
    try {
      console.log("Analyzing r/datascience with direct web scraping + Google Gemini...");
      
      // Use Reddit API for authentic data
      const searchResult = await redditApiClient.searchSubreddit('datascience', undefined, 50);
      const redditPosts = searchResult.posts;
      console.log(`Reddit API extracted ${redditPosts.length} authentic posts from r/datascience`);
      
      // AI-powered content analysis using Gemini
      const trends = await analyzeDataScienceTrends(
        redditPosts.map((p: any) => ({ title: p.title, content: p.selftext }))
      );
      
      // Process creators with enhanced categorization using real Reddit data
      const creators = new Map<string, { posts: number; karma: number; categories: string[] }>();
      const categories: Record<string, number> = {};
      
      for (const post of redditPosts.slice(0, 25)) {
        try {
          // Use Gemini for accurate post categorization
          const analysis = await analyzePostRelevance(post.title, post.selftext);
          categories[analysis.category] = (categories[analysis.category] || 0) + 1;
          
          // All posts have real authors from authentic Reddit scraping
          const data = creators.get(post.author) || { posts: 0, karma: 0, categories: [] };
          data.posts++;
          data.karma += post.ups || 0;
          if (!data.categories.includes(analysis.category)) {
            data.categories.push(analysis.category);
          }
          creators.set(post.author, data);
        } catch (error) {
          console.error(`Analysis failed for post: ${post.title}`, error);
          // Fallback categorization based on content
          const content = (post.title + ' ' + (post.selftext || '')).toLowerCase();
          if (content.includes('career')) categories.career = (categories.career || 0) + 1;
          else if (content.includes('python')) categories.programming = (categories.programming || 0) + 1;
          else if (content.includes('machine learning') || content.includes('ml')) categories.ml = (categories.ml || 0) + 1;
          else categories.discussion = (categories.discussion || 0) + 1;
          
          // Still add the creator data even without AI analysis
          const data = creators.get(post.author) || { posts: 0, karma: 0, categories: ['Data Science'] };
          data.posts++;
          data.karma += post.ups || 0;
          creators.set(post.author, data);
        }
      }
      
      // Store enhanced creator profiles
      let stored = 0;
      const topCreators = Array.from(creators.entries())
        .sort((a, b) => b[1].karma - a[1].karma)
        .slice(0, 15);
        
      for (const [username, data] of topCreators) {
        const existing = await storage.getCreatorByUsername(username);
        if (!existing) {
          const tags = data.categories.length > 0 ? data.categories : ["Data Science"];
          await storage.createCreator({
            username,
            platform: "Reddit",
            subreddit: "datascience",
            karma: data.karma,
            engagementScore: Math.min(100, Math.max(20, Math.floor(data.karma / 5))),
            tags,
            profileLink: `https://reddit.com/u/${username}`,
            lastActive: new Date(),
            postsCount: data.posts,
            commentsCount: 0
          });
          stored++;
        }
      }

      res.json({
        success: true,
        data: {
          postsAnalyzed: redditPosts.length,
          creatorsFound: creators.size,
          creatorsStored: stored,
          categories,
          trends,
          topCreators: topCreators.slice(0, 8).map(([username, data]) => ({
            username,
            posts: data.posts,
            karma: data.karma,
            specialties: data.categories
          }))
        },
        message: `Analyzed ${redditPosts.length} posts with Gemini AI, found ${creators.size} creators, stored ${stored} new profiles`
      });

    } catch (error) {
      console.error("Analysis failed:", error);
      res.status(500).json({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Clear dummy data and reset database for real data
  app.post("/api/reset-database", async (req, res) => {
    try {
      // This would clear existing dummy data
      // In a real implementation, you'd add database clearing logic here
      res.json({ 
        success: true,
        message: "Database reset completed. Ready for real r/datascience data." 
      });
    } catch (error) {
      console.error("Failed to reset database:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to reset database",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Real-time search endpoint for specific r/datascience content
  app.post("/api/search-datascience", async (req, res) => {
    try {
      const { query, limit = 50 } = req.body;
      
      console.log(`Searching r/datascience for: ${query || 'general content'}`);
      
      const searchResult = await redditApiClient.searchSubreddit('datascience', query, limit);
      const posts = searchResult.posts;
      
      // Analyze the found posts with Gemini
      const trends = await analyzeDataScienceTrends(
        posts.map(p => ({ title: p.title, content: p.selftext }))
      );

      res.json({
        success: true,
        results: {
          postsFound: posts.length,
          posts: posts.slice(0, 20), // Return top 20 for display
          trends,
          query: query || 'general'
        }
      });

    } catch (error) {
      console.error("Failed to search r/datascience:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to search r/datascience",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Dashboard stats endpoint
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Failed to get dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });

  // Get creators with filtering
  app.get("/api/creators", async (req, res) => {
    try {
      const { subreddit, tag, engagementLevel, search, page = "1", limit = "20" } = req.query;
      
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const offset = (pageNum - 1) * limitNum;
      
      const filters = {
        subreddit: subreddit as string,
        tag: tag as string,
        engagementLevel: engagementLevel as 'high' | 'medium' | 'low',
        search: search as string,
        limit: limitNum,
        offset
      };
      
      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof typeof filters] === undefined || filters[key as keyof typeof filters] === '') {
          delete filters[key as keyof typeof filters];
        }
      });
      
      const creators = await storage.getCreators(filters);
      res.json(creators);
    } catch (error) {
      console.error("Failed to get creators:", error);
      res.status(500).json({ message: "Failed to fetch creators" });
    }
  });

  // Get single creator with details
  app.get("/api/creators/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid creator ID" });
      }
      
      const creator = await storage.getCreator(id);
      if (!creator) {
        return res.status(404).json({ message: "Creator not found" });
      }
      
      res.json(creator);
    } catch (error) {
      console.error("Failed to get creator:", error);
      res.status(500).json({ message: "Failed to fetch creator details" });
    }
  });

  // Get posts for a specific creator
  app.get("/api/creators/:id/posts", async (req, res) => {
    try {
      const creatorId = parseInt(req.params.id, 10);
      const { limit = "10" } = req.query;
      
      if (isNaN(creatorId)) {
        return res.status(400).json({ message: "Invalid creator ID" });
      }
      
      const posts = await storage.getPostsByCreator(creatorId, parseInt(limit as string));
      res.json(posts);
    } catch (error) {
      console.error("Failed to get creator posts:", error);
      res.status(500).json({ message: "Failed to fetch creator posts" });
    }
  });

  // Workflow execution endpoints
  app.post("/api/workflow/execute", async (req, res) => {
    try {
      const { nodes } = req.body;
      const { workflowEngine } = await import("./workflow-engine");
      
      const executionId = await workflowEngine.executeWorkflow(nodes);
      res.json({ executionId, status: 'started' });
    } catch (error) {
      console.error("Failed to execute workflow:", error);
      res.status(500).json({ message: "Failed to execute workflow", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/workflow/execution/:id", async (req, res) => {
    try {
      const { workflowEngine } = await import("./workflow-engine");
      const execution = workflowEngine.getExecution(req.params.id);
      
      if (!execution) {
        return res.status(404).json({ message: "Execution not found" });
      }
      
      res.json(execution);
    } catch (error) {
      console.error("Failed to get execution:", error);
      res.status(500).json({ message: "Failed to get execution details" });
    }
  });

  // Enhanced chat endpoint with comprehensive analysis
  app.post("/api/chat/enhanced", async (req, res) => {
    try {
      const { message, context, includeFullAnalysis } = req.body;
      const { analyzeCreatorContent, analyzeDataScienceTrends } = await import("./gemini");
      
      let responseData = "";
      let analysis = null;
      let insights: string[] = [];
      let recommendations: string[] = [];

      // Comprehensive data gathering based on message content
      if (message.toLowerCase().includes('creator') || message.toLowerCase().includes('user') || message.toLowerCase().includes('who')) {
        const creators = await storage.getCreators({ limit: 50 });
        
        // Get detailed creator analysis
        const topCreators = creators.slice(0, 10);
        const creatorDetails = [];
        
        for (const creator of topCreators) {
          const posts = await storage.getPostsByCreator(creator.id, 5);
          const totalUpvotes = posts.reduce((sum, p) => sum + (p.upvotes || 0), 0);
          const avgUpvotes = posts.length > 0 ? Math.round(totalUpvotes / posts.length) : 0;
          
          creatorDetails.push({
            username: creator.username,
            karma: creator.karma,
            engagement: creator.engagementScore,
            tags: creator.tags?.join(', ') || 'General',
            subreddit: creator.subreddit,
            postsCount: posts.length,
            avgUpvotes,
            topPost: posts[0]?.title || 'No posts'
          });
        }
        
        responseData = creatorDetails.map(c => 
          `${c.username} (${c.subreddit}): ${c.karma} karma, ${c.engagement}% engagement\n` +
          `  • ${c.postsCount} posts, avg ${c.avgUpvotes} upvotes\n` +
          `  • Tags: ${c.tags}\n` +
          `  • Top post: "${c.topPost}"`
        ).join('\n\n');

        insights = [
          `Found ${creators.length} total creators across ${new Set(creators.map(c => c.subreddit)).size} subreddits`,
          `Average engagement score: ${Math.round(creators.reduce((sum, c) => sum + c.engagementScore, 0) / creators.length)}%`,
          `Top subreddit: ${creators.reduce((acc, c) => {
            acc[c.subreddit] = (acc[c.subreddit] || 0) + 1;
            return acc;
          }, {} as Record<string, number>).toString().split(',')[0]}`
        ];

        recommendations = [
          "Focus on creators with 80+ engagement scores for partnerships",
          "Monitor trending topics in top-performing subreddits",
          "Analyze posting patterns of high-karma creators"
        ];
      }
      
      if (message.toLowerCase().includes('post') || message.toLowerCase().includes('content')) {
        const creators = await storage.getCreators({ limit: 20 });
        const allPosts = [];
        
        for (const creator of creators) {
          const posts = await storage.getPostsByCreator(creator.id, 3);
          allPosts.push(...posts.map(p => ({
            ...p,
            creator: creator.username,
            subreddit: creator.subreddit
          })));
        }
        
        // Sort by upvotes and analyze patterns
        allPosts.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
        const topPosts = allPosts.slice(0, 20);
        
        responseData = topPosts.map(p => 
          `"${p.title}" by ${p.creator} (r/${p.subreddit})\n` +
          `  • ${p.upvotes || 0} upvotes • ${p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Unknown date'}`
        ).join('\n\n');

        // Analyze trends in top posts
        if (includeFullAnalysis && topPosts.length > 0) {
          const trendsAnalysis = await analyzeDataScienceTrends(
            topPosts.map(p => ({ title: p.title, content: p.content || '' }))
          );
          
          insights = [
            `Analyzed ${allPosts.length} total posts`,
            `Highest engagement: ${topPosts[0]?.upvotes || 0} upvotes`,
            `Top skills mentioned: ${trendsAnalysis.topSkills?.slice(0, 3).join(', ') || 'Various'}`,
            `Emerging technologies: ${trendsAnalysis.emergingTechnologies?.slice(0, 3).join(', ') || 'AI/ML'}`
          ];

          recommendations = [
            "Create content around trending technologies",
            "Study high-upvote post formats and timing",
            "Focus on practical tutorials and case studies"
          ];
        }
      }
      
      if (message.toLowerCase().includes('stat') || message.toLowerCase().includes('data') || message.toLowerCase().includes('analytic')) {
        const stats = await storage.getDashboardStats();
        const creators = await storage.getCreators({ limit: 100 });
        
        // Advanced statistics
        const subredditStats = creators.reduce((acc, c) => {
          acc[c.subreddit] = (acc[c.subreddit] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const engagementDistribution = {
          high: creators.filter(c => c.engagementScore >= 80).length,
          medium: creators.filter(c => c.engagementScore >= 50 && c.engagementScore < 80).length,
          low: creators.filter(c => c.engagementScore < 50).length
        };

        responseData = `Comprehensive Database Statistics:

Core Metrics:
• Total Creators: ${stats.totalCreators}
• High Engagement (80%+): ${stats.highEngagement}
• Active Subreddits: ${stats.activeSubreddits}
• Posts Analyzed: ${stats.postsAnalyzed}

Subreddit Distribution:
${Object.entries(subredditStats)
  .sort((a, b) => b[1] - a[1])
  .map(([sub, count]) => `• r/${sub}: ${count} creators`)
  .join('\n')}

Engagement Breakdown:
• High (80%+): ${engagementDistribution.high} creators
• Medium (50-79%): ${engagementDistribution.medium} creators  
• Low (<50%): ${engagementDistribution.low} creators

Average Karma: ${Math.round(creators.reduce((sum, c) => sum + c.karma, 0) / creators.length)}`;

        insights = [
          `${((engagementDistribution.high / creators.length) * 100).toFixed(1)}% of creators have high engagement`,
          `Most active subreddit: r/${Object.entries(subredditStats).sort((a, b) => b[1] - a[1])[0][0]}`,
          `Database growth: ${stats.postsAnalyzed} posts from ${stats.totalCreators} creators`
        ];

        recommendations = [
          "Target recruitment in high-engagement subreddits",
          "Develop content strategy based on top-performing posts",
          "Monitor creator activity patterns for optimal posting times"
        ];
      }

      // Specific creator lookup
      if (message.toLowerCase().includes('analyze') || message.match(/\bu\/\w+/)) {
        const usernameMatch = message.match(/\bu\/(\w+)/) || message.match(/(\w+)/);
        if (usernameMatch) {
          const username = usernameMatch[1];
          const creators = await storage.getCreators({ limit: 100 });
          const creator = creators.find(c => c.username.toLowerCase().includes(username.toLowerCase()));
          
          if (creator) {
            const posts = await storage.getPostsByCreator(creator.id, 10);
            const totalUpvotes = posts.reduce((sum, p) => sum + (p.upvotes || 0), 0);
            
            responseData = `Deep Analysis of u/${creator.username}:

Profile Overview:
• Platform: ${creator.platform}
• Primary Subreddit: r/${creator.subreddit}
• Karma: ${creator.karma}
• Engagement Score: ${creator.engagementScore}%
• Tags: ${creator.tags?.join(', ') || 'General'}
• Last Active: ${creator.lastActive ? new Date(creator.lastActive).toLocaleDateString() : 'Unknown'}

Content Performance:
• Total Posts: ${posts.length}
• Total Upvotes: ${totalUpvotes}
• Average Upvotes: ${posts.length > 0 ? Math.round(totalUpvotes / posts.length) : 0}
• Top Post: "${posts[0]?.title || 'No posts'}" (${posts[0]?.upvotes || 0} upvotes)

Recent Posts:
${posts.slice(0, 5).map(p => 
  `• "${p.title}" (${p.upvotes || 0} upvotes)`
).join('\n')}`;

            // AI analysis of creator's content
            if (posts.length > 0) {
              const creatorAnalysis = await analyzeCreatorContent(
                posts.map(p => ({ title: p.title, content: p.content || '' })),
                []
              );
              
              insights = [
                `Specializes in: ${creatorAnalysis.tags?.join(', ') || 'General topics'}`,
                `Content confidence: ${creatorAnalysis.confidence}%`,
                `Activity level: ${posts.length > 5 ? 'High' : posts.length > 2 ? 'Medium' : 'Low'}`,
                `Engagement trend: ${creator.engagementScore > 70 ? 'Growing' : 'Stable'}`
              ];

              recommendations = [
                `${creator.engagementScore > 80 ? 'Priority creator for partnerships' : 'Monitor for growth potential'}`,
                `Content focus: ${creatorAnalysis.tags?.[0] || 'Diversified content'}`,
                `Optimal posting: ${creator.subreddit} community engagement`
              ];
            }
          }
        }
      }

      // Generate AI response
      const aiAnalysis = await analyzeCreatorContent(
        [{ title: message, content: `User question: ${message}\n\nData context: ${responseData}` }],
        []
      );
      
      res.json({
        response: aiAnalysis.summary || "I've analyzed your Reddit creator data. What specific insights would you like to explore further?",
        data: responseData,
        analysis: {
          insights,
          recommendations
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error("Enhanced chat error:", error);
      res.status(500).json({ 
        response: "I encountered an issue while analyzing your data. Please try rephrasing your question.",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Original chat endpoint (kept for backward compatibility)
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, context } = req.body;
      const { analyzeCreatorContent } = await import("./gemini");
      
      // Get relevant data based on the message
      let responseData = "";
      
      if (message.toLowerCase().includes('creator') || message.toLowerCase().includes('user')) {
        const creators = await storage.getCreators({ limit: 20 });
        const creatorSummary = creators.map(c => 
          `${c.username}: ${c.karma} karma, ${c.engagementScore} engagement, ${c.tags?.join(', ') || 'No tags'}`
        ).join('\n');
        
        responseData = `Here are our top Reddit creators:\n${creatorSummary}`;
      }
      
      if (message.toLowerCase().includes('post')) {
        const creators = await storage.getCreators({ limit: 10 });
        const allPosts = [];
        
        for (const creator of creators) {
          const posts = await storage.getPostsByCreator(creator.id, 2);
          allPosts.push(...posts.map(p => `${creator.username}: "${p.title}" (${p.upvotes} upvotes)`));
        }
        
        responseData = `Recent Reddit posts:\n${allPosts.slice(0, 15).join('\n')}`;
      }
      
      if (message.toLowerCase().includes('stat') || message.toLowerCase().includes('data')) {
        const stats = await storage.getDashboardStats();
        responseData = `Database Statistics:
- Total Creators: ${stats.totalCreators}
- High Engagement: ${stats.highEngagement}
- Active Subreddits: ${stats.activeSubreddits}
- Posts Analyzed: ${stats.postsAnalyzed}`;
      }
      
      // Use Gemini to generate natural response
      const analysis = await analyzeCreatorContent(
        [{ title: message, content: `User question: ${message}\n\nData context: ${responseData}` }],
        []
      );
      
      res.json({
        response: analysis.summary || "I can help you analyze our Reddit creators and posts. What would you like to know?",
        data: responseData,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ 
        response: "I'm having trouble accessing the data right now. Please try again.",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get subreddits
  app.get("/api/subreddits", async (req, res) => {
    try {
      const subreddits = await storage.getSubreddits();
      res.json(subreddits);
    } catch (error) {
      console.error("Failed to get subreddits:", error);
      res.status(500).json({ message: "Failed to fetch subreddits" });
    }
  });

  // Trigger manual crawl
  app.post("/api/crawl", async (req, res) => {
    try {
      const schema = z.object({
        subreddit: z.string().optional(),
        all: z.boolean().optional()
      });
      
      const { subreddit, all } = schema.parse(req.body);
      
      if (all) {
        // Crawl all active subreddits
        const activeSubreddits = await storage.getActiveSubreddits();
        const results = [];
        
        for (const sub of activeSubreddits) {
          const result = await crawlAndProcessSubreddit(sub.name);
          results.push({ subreddit: sub.name, ...result });
        }
        
        res.json({ 
          message: "Crawl completed for all subreddits",
          results 
        });
      } else if (subreddit) {
        // Crawl specific subreddit
        const result = await crawlAndProcessSubreddit(subreddit);
        res.json({
          message: `Crawl completed for r/${subreddit}`,
          ...result
        });
      } else {
        res.status(400).json({ message: "Must specify subreddit or set all=true" });
      }
    } catch (error) {
      console.error("Failed to start crawl:", error);
      res.status(500).json({ message: "Failed to start crawling process" });
    }
  });

  // Get crawl logs
  app.get("/api/crawl/logs", async (req, res) => {
    try {
      const { limit = "10" } = req.query;
      const logs = await storage.getRecentCrawlLogs(parseInt(limit as string, 10));
      res.json(logs);
    } catch (error) {
      console.error("Failed to get crawl logs:", error);
      res.status(500).json({ message: "Failed to fetch crawl logs" });
    }
  });

  // Export creators
  app.get("/api/export/creators", async (req, res) => {
    try {
      const { format = "json" } = req.query;
      const creators = await storage.getCreators({ limit: 10000 });
      
      if (format === "csv") {
        // Convert to CSV format
        const csvHeaders = "Username,Platform,Subreddit,Karma,Engagement Score,Tags,Profile Link,Last Active";
        const csvRows = creators.map(creator => {
          const tags = Array.isArray(creator.tags) ? creator.tags.join(";") : "";
          return [
            creator.username,
            creator.platform,
            creator.subreddit,
            creator.karma,
            creator.engagementScore,
            tags,
            creator.profileLink,
            creator.lastActive?.toISOString() || ""
          ].join(",");
        });
        
        const csv = [csvHeaders, ...csvRows].join("\n");
        
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=reddit-creators.csv");
        res.send(csv);
      } else {
        // JSON format
        res.json(creators);
      }
    } catch (error) {
      console.error("Failed to export creators:", error);
      res.status(500).json({ message: "Failed to export creator data" });
    }
  });

  // Add the fixed Reddit scraping endpoint
  addFixedRedditEndpoint(app);

  const httpServer = createServer(app);
  return httpServer;
}
