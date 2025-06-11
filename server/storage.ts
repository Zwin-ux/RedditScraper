import { users, creators, posts, subreddits, crawlLogs, type User, type InsertUser, type Creator, type InsertCreator, type Post, type InsertPost, type Subreddit, type InsertSubreddit, type CrawlLog, type InsertCrawlLog, type DashboardStats, type CreatorWithRecentActivity } from "@shared/schema";
import { db } from "./db";
import { eq, desc, count, sql, and, gte, like, inArray } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Creator methods
  getCreators(filters?: {
    subreddit?: string;
    tag?: string;
    engagementLevel?: 'high' | 'medium' | 'low';
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Creator[]>;
  getCreator(id: number): Promise<CreatorWithRecentActivity | undefined>;
  getCreatorByUsername(username: string): Promise<Creator | undefined>;
  createCreator(creator: InsertCreator): Promise<Creator>;
  updateCreator(id: number, updates: Partial<InsertCreator>): Promise<Creator>;
  
  // Post methods
  createPost(post: InsertPost): Promise<Post>;
  getPostsByCreator(creatorId: number, limit?: number): Promise<Post[]>;
  
  // Subreddit methods
  getSubreddits(): Promise<Subreddit[]>;
  getActiveSubreddits(): Promise<Subreddit[]>;
  createSubreddit(subreddit: InsertSubreddit): Promise<Subreddit>;
  updateSubredditLastCrawled(name: string): Promise<void>;
  
  // Stats methods
  getDashboardStats(): Promise<DashboardStats>;
  
  // Crawl log methods
  createCrawlLog(log: InsertCrawlLog): Promise<CrawlLog>;
  updateCrawlLog(id: number, updates: Partial<InsertCrawlLog>): Promise<CrawlLog>;
  getRecentCrawlLogs(limit?: number): Promise<CrawlLog[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getCreators(filters?: {
    subreddit?: string;
    tag?: string;
    engagementLevel?: 'high' | 'medium' | 'low';
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Creator[]> {
    let query = db.select().from(creators);
    const conditions = [];

    if (filters?.subreddit) {
      conditions.push(eq(creators.subreddit, filters.subreddit));
    }

    if (filters?.tag) {
      conditions.push(sql`${creators.tags} @> ${JSON.stringify([filters.tag])}`);
    }

    if (filters?.engagementLevel) {
      if (filters.engagementLevel === 'high') {
        conditions.push(gte(creators.engagementScore, 80));
      } else if (filters.engagementLevel === 'medium') {
        conditions.push(and(gte(creators.engagementScore, 50), sql`${creators.engagementScore} < 80`));
      } else if (filters.engagementLevel === 'low') {
        conditions.push(sql`${creators.engagementScore} < 50`);
      }
    }

    if (filters?.search) {
      conditions.push(like(creators.username, `%${filters.search}%`));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    query = query.orderBy(desc(creators.engagementScore));

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.offset(filters.offset);
    }

    return await query;
  }

  async getCreator(id: number): Promise<CreatorWithRecentActivity | undefined> {
    const [creator] = await db.select().from(creators).where(eq(creators.id, id));
    if (!creator) return undefined;

    const recentPosts = await db
      .select()
      .from(posts)
      .where(eq(posts.creatorId, id))
      .orderBy(desc(posts.createdAt))
      .limit(5);

    return { ...creator, recentPosts };
  }

  async getCreatorByUsername(username: string): Promise<Creator | undefined> {
    const [creator] = await db.select().from(creators).where(eq(creators.username, username));
    return creator || undefined;
  }

  async createCreator(insertCreator: InsertCreator): Promise<Creator> {
    const [creator] = await db
      .insert(creators)
      .values({
        ...insertCreator,
        updatedAt: new Date()
      })
      .returning();
    return creator;
  }

  async updateCreator(id: number, updates: Partial<InsertCreator>): Promise<Creator> {
    const [creator] = await db
      .update(creators)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(creators.id, id))
      .returning();
    return creator;
  }

  async createPost(insertPost: InsertPost): Promise<Post> {
    const [post] = await db
      .insert(posts)
      .values(insertPost)
      .returning();
    return post;
  }

  async getPostsByCreator(creatorId: number, limit = 10): Promise<Post[]> {
    return await db
      .select()
      .from(posts)
      .where(eq(posts.creatorId, creatorId))
      .orderBy(desc(posts.createdAt))
      .limit(limit);
  }

  async getSubreddits(): Promise<Subreddit[]> {
    return await db.select().from(subreddits).orderBy(subreddits.name);
  }

  async getActiveSubreddits(): Promise<Subreddit[]> {
    return await db.select().from(subreddits).where(eq(subreddits.isActive, 1));
  }

  async createSubreddit(insertSubreddit: InsertSubreddit): Promise<Subreddit> {
    const [subreddit] = await db
      .insert(subreddits)
      .values(insertSubreddit)
      .returning();
    return subreddit;
  }

  async updateSubredditLastCrawled(name: string): Promise<void> {
    await db
      .update(subreddits)
      .set({ lastCrawled: new Date() })
      .where(eq(subreddits.name, name));
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const [totalCreatorsResult] = await db
      .select({ count: count() })
      .from(creators);

    const [highEngagementResult] = await db
      .select({ count: count() })
      .from(creators)
      .where(gte(creators.engagementScore, 80));

    const [activeSubredditsResult] = await db
      .select({ count: count() })
      .from(subreddits)
      .where(eq(subreddits.isActive, 1));

    const [postsAnalyzedResult] = await db
      .select({ count: count() })
      .from(posts);

    return {
      totalCreators: totalCreatorsResult.count,
      highEngagement: highEngagementResult.count,
      activeSubreddits: activeSubredditsResult.count,
      postsAnalyzed: postsAnalyzedResult.count,
    };
  }

  async createCrawlLog(insertCrawlLog: InsertCrawlLog): Promise<CrawlLog> {
    const [log] = await db
      .insert(crawlLogs)
      .values(insertCrawlLog)
      .returning();
    return log;
  }

  async updateCrawlLog(id: number, updates: Partial<InsertCrawlLog>): Promise<CrawlLog> {
    const [log] = await db
      .update(crawlLogs)
      .set({
        ...updates,
        completedAt: updates.status ? new Date() : undefined
      })
      .where(eq(crawlLogs.id, id))
      .returning();
    return log;
  }

  async getRecentCrawlLogs(limit = 10): Promise<CrawlLog[]> {
    return await db
      .select()
      .from(crawlLogs)
      .orderBy(desc(crawlLogs.startedAt))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
