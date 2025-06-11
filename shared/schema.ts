import { pgTable, text, serial, integer, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const creators = pgTable("creators", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  platform: text("platform").notNull().default("Reddit"),
  subreddit: text("subreddit").notNull(),
  karma: integer("karma").notNull().default(0),
  engagementScore: integer("engagement_score").notNull().default(0),
  tags: jsonb("tags").$type<string[]>().default([]),
  profileLink: text("profile_link").notNull(),
  lastActive: timestamp("last_active"),
  postsCount: integer("posts_count").default(0),
  commentsCount: integer("comments_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  creatorId: integer("creator_id").references(() => creators.id),
  title: text("title").notNull(),
  content: text("content"),
  subreddit: text("subreddit").notNull(),
  upvotes: integer("upvotes").default(0),
  awards: integer("awards").default(0),
  redditId: text("reddit_id").notNull().unique(),
  redditUrl: text("reddit_url").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const subreddits = pgTable("subreddits", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  isActive: integer("is_active").default(1),
  lastCrawled: timestamp("last_crawled"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const crawlLogs = pgTable("crawl_logs", {
  id: serial("id").primaryKey(),
  subreddit: text("subreddit").notNull(),
  postsFound: integer("posts_found").default(0),
  creatorsFound: integer("creators_found").default(0),
  status: text("status").notNull(), // 'success', 'failed', 'running'
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Zod schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertCreatorSchema = createInsertSchema(creators).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  createdAt: true,
});

export const insertSubredditSchema = createInsertSchema(subreddits).omit({
  id: true,
  createdAt: true,
});

export const insertCrawlLogSchema = createInsertSchema(crawlLogs).omit({
  id: true,
  startedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Creator = typeof creators.$inferSelect;
export type InsertCreator = z.infer<typeof insertCreatorSchema>;

export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;

export type Subreddit = typeof subreddits.$inferSelect;
export type InsertSubreddit = z.infer<typeof insertSubredditSchema>;

export type CrawlLog = typeof crawlLogs.$inferSelect;
export type InsertCrawlLog = z.infer<typeof insertCrawlLogSchema>;

// API response types
export type DashboardStats = {
  totalCreators: number;
  highEngagement: number;
  activeSubreddits: number;
  postsAnalyzed: number;
};

export type CreatorWithRecentActivity = Creator & {
  recentPosts: Post[];
};
