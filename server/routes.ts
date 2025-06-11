import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { crawlAndProcessSubreddit, initializeSubreddits } from "./reddit";
import { comprehensiveSubredditAnalysis, searchRedditPosts } from "./serpapi";
import { analyzeDataScienceTrends } from "./openai";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize subreddits on startup
  await initializeSubreddits();
  
  // Seed sample data endpoint for demonstration
  app.post("/api/seed", async (req, res) => {
    try {
      // Sample creator data for demonstration
      const sampleCreators = [
        {
          username: "ai_researcher_42",
          platform: "Reddit" as const,
          subreddit: "MachineLearning",
          karma: 15420,
          engagementScore: 85,
          tags: ["AI Researcher", "Deep Learning", "Research Explainer"],
          profileLink: "https://reddit.com/u/ai_researcher_42",
          lastActive: new Date(),
          postsCount: 42,
          commentsCount: 156
        },
        {
          username: "prompt_wizard",
          platform: "Reddit" as const,
          subreddit: "PromptEngineering",
          karma: 8920,
          engagementScore: 92,
          tags: ["Prompt Engineer", "AI Tools Builder", "GPT Expert"],
          profileLink: "https://reddit.com/u/prompt_wizard",
          lastActive: new Date(),
          postsCount: 28,
          commentsCount: 89
        },
        {
          username: "local_llm_guru",
          platform: "Reddit" as const,
          subreddit: "LocalLLMs",
          karma: 12350,
          engagementScore: 78,
          tags: ["Open Source", "LLM Expert", "AI Tools Builder"],
          profileLink: "https://reddit.com/u/local_llm_guru",
          lastActive: new Date(),
          postsCount: 35,
          commentsCount: 124
        },
        {
          username: "chatgpt_hacker",
          platform: "Reddit" as const,
          subreddit: "ChatGPT",
          karma: 6750,
          engagementScore: 73,
          tags: ["Prompt Engineer", "Opinion Leader", "AI Enthusiast"],
          profileLink: "https://reddit.com/u/chatgpt_hacker",
          lastActive: new Date(),
          postsCount: 19,
          commentsCount: 67
        },
        {
          username: "ai_startup_founder",
          platform: "Reddit" as const,
          subreddit: "ArtificialIntelligence",
          karma: 23100,
          engagementScore: 88,
          tags: ["AI Tools Builder", "Opinion Leader", "Tech Influencer"],
          profileLink: "https://reddit.com/u/ai_startup_founder",
          lastActive: new Date(),
          postsCount: 51,
          commentsCount: 203
        }
      ];

      // Create sample creators
      for (const creator of sampleCreators) {
        const existing = await storage.getCreatorByUsername(creator.username);
        if (!existing) {
          await storage.createCreator(creator);
        }
      }

      res.json({ message: "Sample data seeded successfully", count: sampleCreators.length });
    } catch (error) {
      console.error("Failed to seed sample data:", error);
      res.status(500).json({ message: "Failed to seed sample data" });
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

  const httpServer = createServer(app);
  return httpServer;
}
