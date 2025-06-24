// Efficient scraping queue with batching and rate limiting
import { rateLimitedScraper } from './rate-limited-scraper.js';

interface ScrapingJob {
  id: string;
  subreddit: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: number;
  resolve: (data: any) => void;
  reject: (error: any) => void;
}

class ScrapingQueue {
  private queue: ScrapingJob[] = [];
  private processing = false;
  private lastProcessTime = 0;
  private readonly minInterval = 2000; // 2 seconds between requests
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly cacheTimeout = 15 * 60 * 1000; // 15 minutes

  async addJob(subreddit: string, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<any> {
    // Check cache first
    const cached = this.cache.get(subreddit);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log(`Cache hit for subreddit: ${subreddit}`);
      return cached.data;
    }

    // Check if job already exists in queue
    const existingJob = this.queue.find(job => job.subreddit === subreddit);
    if (existingJob) {
      console.log(`Reusing existing job for: ${subreddit}`);
      return new Promise((resolve, reject) => {
        // Add additional listeners to existing job
        const originalResolve = existingJob.resolve;
        const originalReject = existingJob.reject;
        
        existingJob.resolve = (data) => {
          originalResolve(data);
          resolve(data);
        };
        
        existingJob.reject = (error) => {
          originalReject(error);
          reject(error);
        };
      });
    }

    return new Promise((resolve, reject) => {
      const job: ScrapingJob = {
        id: `${subreddit}_${Date.now()}`,
        subreddit,
        priority,
        timestamp: Date.now(),
        resolve,
        reject
      };

      // Insert job based on priority
      if (priority === 'high') {
        this.queue.unshift(job);
      } else if (priority === 'medium') {
        const highPriorityCount = this.queue.filter(j => j.priority === 'high').length;
        this.queue.splice(highPriorityCount, 0, job);
      } else {
        this.queue.push(job);
      }

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    try {
      while (this.queue.length > 0) {
        // Rate limiting
        const timeSinceLastProcess = Date.now() - this.lastProcessTime;
        if (timeSinceLastProcess < this.minInterval) {
          await new Promise(resolve => setTimeout(resolve, this.minInterval - timeSinceLastProcess));
        }

        const job = this.queue.shift()!;
        
        try {
          console.log(`Processing scraping job for: ${job.subreddit}`);
          const result = await rateLimitedScraper(job.subreddit);
          
          // Cache the result
          this.cache.set(job.subreddit, { 
            data: result, 
            timestamp: Date.now() 
          });
          
          job.resolve(result);
          this.lastProcessTime = Date.now();
          
        } catch (error) {
          console.error(`Scraping failed for ${job.subreddit}:`, error);
          job.reject(error);
        }
      }
    } finally {
      this.processing = false;
    }
  }

  // Batch process multiple subreddits efficiently
  async batchScrape(subreddits: string[], priority: 'high' | 'medium' | 'low' = 'medium'): Promise<any[]> {
    console.log(`Batch scraping ${subreddits.length} subreddits`);
    
    const promises = subreddits.map(subreddit => this.addJob(subreddit, priority));
    return Promise.allSettled(promises);
  }

  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      cacheSize: this.cache.size
    };
  }

  clearCache() {
    this.cache.clear();
    console.log('Scraping cache cleared');
  }
}

export const scrapingQueue = new ScrapingQueue();