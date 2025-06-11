import { apiRequest } from "./queryClient";
import type { Creator, DashboardStats, CreatorWithRecentActivity, Subreddit, CrawlLog } from "@shared/schema";

export const api = {
  // Dashboard
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await apiRequest("GET", "/api/dashboard/stats");
    return response.json();
  },

  // Creators
  getCreators: async (params?: {
    subreddit?: string;
    tag?: string;
    engagementLevel?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<Creator[]> => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    const url = `/api/creators${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await apiRequest("GET", url);
    return response.json();
  },

  getCreator: async (id: number): Promise<CreatorWithRecentActivity> => {
    const response = await apiRequest("GET", `/api/creators/${id}`);
    return response.json();
  },

  getCreatorPosts: async (creatorId: number, limit = 10) => {
    const response = await apiRequest("GET", `/api/creators/${creatorId}/posts?limit=${limit}`);
    return response.json();
  },

  // Subreddits
  getSubreddits: async (): Promise<Subreddit[]> => {
    const response = await apiRequest("GET", "/api/subreddits");
    return response.json();
  },

  // Scraping
  scrapeSubreddit: async (subreddit: string) => {
    const response = await apiRequest("POST", "/api/scrape-subreddit-fixed", { subreddit });
    return response.json();
  },

  // Crawling
  startCrawl: async (data: { subreddit?: string; all?: boolean }) => {
    const response = await apiRequest("POST", "/api/crawl", data);
    return response.json();
  },

  getCrawlLogs: async (limit = 10): Promise<CrawlLog[]> => {
    const response = await apiRequest("GET", `/api/crawl/logs?limit=${limit}`);
    return response.json();
  },

  // Export
  exportCreators: async (format: 'json' | 'csv' = 'json') => {
    const response = await apiRequest("GET", `/api/export/creators?format=${format}`);
    if (format === 'csv') {
      return response.text();
    }
    return response.json();
  }
};
