import { apiRequest } from "./queryClient";
import type { Creator, DashboardStats, CreatorWithRecentActivity, Subreddit, CrawlLog } from "@shared/schema";

export const api = {
  // Dashboard
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await apiRequest("/api/dashboard/stats", "GET");
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
    const response = await apiRequest(url, "GET");
    return response.json();
  },

  getCreator: async (id: number): Promise<CreatorWithRecentActivity> => {
    const response = await apiRequest(`/api/creators/${id}`, "GET");
    return response.json();
  },

  getCreatorPosts: async (creatorId: number, limit = 10) => {
    const response = await apiRequest(`/api/creators/${creatorId}/posts?limit=${limit}`, "GET");
    return response.json();
  },

  // Subreddits
  getSubreddits: async (): Promise<Subreddit[]> => {
    const response = await apiRequest("/api/subreddits", "GET");
    return response.json();
  },

  // Scraping
  scrapeSubreddit: async (subreddit: string) => {
    const response = await apiRequest("/api/scrape-subreddit-fixed", "POST", { subreddit });
    return response.json();
  },

  // Crawling
  startCrawl: async (data: { subreddit?: string; all?: boolean }) => {
    const response = await apiRequest("/api/crawl", "POST", data);
    return response.json();
  },

  getCrawlLogs: async (limit = 10): Promise<CrawlLog[]> => {
    const response = await apiRequest(`/api/crawl/logs?limit=${limit}`, "GET");
    return response.json();
  },

  // Export
  exportCreators: async (format: 'json' | 'csv' = 'json') => {
    const response = await apiRequest(`/api/export/creators?format=${format}`, "GET");
    if (format === 'csv') {
      return response.text();
    }
    return response.json();
  }
};
