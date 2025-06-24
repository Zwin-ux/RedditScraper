import Exa from 'exa-js';
import { analyzeCreatorContent, analyzeDataScienceTrends } from './gemini.js';

const exa = new Exa(process.env.EXA_API_KEY);

export interface ExaRedditResult {
  title: string;
  url: string;
  publishedDate: string;
  author: string;
  text: string;
  highlights: string[];
  score: number;
  subreddit: string;
  domain: string;
}

export interface EnhancedSearchResult {
  query: string;
  results: ExaRedditResult[];
  totalResults: number;
  relatedTopics: string[];
  insights: {
    topKeywords: string[];
    emergingTrends: string[];
    popularSubreddits: string[];
    contentTypes: string[];
  };
  aiAnalysis?: any;
}

// Cache for storing search results
const searchCache = new Map<string, { data: EnhancedSearchResult; timestamp: number }>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

class ExaSearchService {
  private pendingRequests = new Map<string, Promise<EnhancedSearchResult>>();
  
  private getCacheKey(query: string, options: any): string {
    return `${query}_${JSON.stringify(options)}`;
  }
  
  private isValidCache(timestamp: number): boolean {
    return Date.now() - timestamp < CACHE_DURATION;
  }
  
  async searchRedditContent(query: string, options: {
    numResults?: number;
    includeDomains?: string[];
    startPublishedDate?: string;
    endPublishedDate?: string;
    category?: string;
  } = {}): Promise<EnhancedSearchResult> {
    const cacheKey = this.getCacheKey(query, options);
    
    // Check cache first
    const cached = searchCache.get(cacheKey);
    if (cached && this.isValidCache(cached.timestamp)) {
      console.log(`Cache hit for: "${query}"`);
      return cached.data;
    }
    
    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      console.log(`Reusing pending request for: "${query}"`);
      return this.pendingRequests.get(cacheKey)!;
    }
    
    // Create new request
    const requestPromise = this.performSearch(query, options);
    this.pendingRequests.set(cacheKey, requestPromise);
    
    try {
      const result = await requestPromise;
      // Cache the result
      searchCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }
  
  private async performSearch(query: string, options: any): Promise<EnhancedSearchResult> {
    try {
      const searchQuery = `${query} site:reddit.com`;
      
      console.log(`Exa Search: "${searchQuery}"`);
      const searchOptions: any = {
        type: 'neural',
        useAutoprompt: true,
        numResults: options.numResults || 20,
        includeDomains: options.includeDomains || ['reddit.com'],
        contents: {
          text: true,
          highlights: true,
          summary: true
        }
      };

      if (options.startPublishedDate) {
        searchOptions.startPublishedDate = options.startPublishedDate;
      }
      if (options.endPublishedDate) {
        searchOptions.endPublishedDate = options.endPublishedDate;
      }
      if (options.category) {
        searchOptions.category = options.category;
      }

      const response = await exa.searchAndContents(searchQuery, searchOptions);
      
      const results: ExaRedditResult[] = response.results.map(result => {
        // Extract subreddit from URL
        const subredditMatch = result.url.match(/reddit\.com\/r\/([^\/]+)/);
        const subreddit = subredditMatch ? subredditMatch[1] : 'unknown';
        
        // Extract author from URL or text
        const authorMatch = result.url.match(/\/u\/([^\/\s]+)/) || 
                           result.text?.match(/u\/([^\s\]]+)/) ||
                           result.text?.match(/by ([^\s,\n]+)/);
        const author = authorMatch ? authorMatch[1] : 'unknown';

        return {
          title: result.title || 'No title',
          url: result.url,
          publishedDate: result.publishedDate || new Date().toISOString(),
          author: author,
          text: result.text || '',
          highlights: [],
          score: result.score || 0,
          subreddit: subreddit,
          domain: 'reddit.com'
        };
      });

      // Analyze patterns and extract insights
      const insights = await this.analyzeSearchResults(results);
      
      // Get AI analysis for trending topics
      let aiAnalysis;
      if (results.length > 5) {
        try {
          aiAnalysis = await analyzeDataScienceTrends(
            results.map(r => ({ title: r.title, content: r.text }))
          );
        } catch (error) {
          console.log('AI analysis failed, continuing without it');
        }
      }

      return {
        query,
        results,
        totalResults: results.length,
        relatedTopics: this.extractRelatedTopics(results),
        insights,
        aiAnalysis
      };

    } catch (error) {
      console.error('Exa search failed:', error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchDataScienceContent(query: string): Promise<EnhancedSearchResult> {
    const enhancedQuery = `${query} (data science OR machine learning OR AI OR python OR statistics OR analytics)`;
    
    return this.searchRedditContent(enhancedQuery, {
      numResults: 25,
      category: 'programming',
      startPublishedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // Last 30 days
    });
  }

  async searchBySubreddit(subreddit: string, query?: string, timeframe: 'week' | 'month' | 'year' = 'month'): Promise<EnhancedSearchResult> {
    const searchQuery = query 
      ? `${query} site:reddit.com/r/${subreddit}`
      : `site:reddit.com/r/${subreddit}`;
    
    const startDate = new Date();
    if (timeframe === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeframe === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    return this.searchRedditContent(searchQuery, {
      numResults: 30,
      startPublishedDate: startDate.toISOString()
    });
  }

  async findTrendingTopics(domain: 'data_science' | 'ai' | 'programming' | 'general' = 'general'): Promise<EnhancedSearchResult> {
    const domainQueries = {
      data_science: 'trending (data science OR machine learning OR analytics OR statistics) site:reddit.com',
      ai: 'trending (artificial intelligence OR AI OR ChatGPT OR LLM OR neural networks) site:reddit.com',
      programming: 'trending (programming OR coding OR python OR javascript OR web development) site:reddit.com',
      general: 'trending discussion site:reddit.com'
    };

    return this.searchRedditContent(domainQueries[domain], {
      numResults: 20,
      startPublishedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // Last 7 days
    });
  }

  private async analyzeSearchResults(results: ExaRedditResult[]) {
    const subreddits = results.map(r => r.subreddit);
    const titles = results.map(r => r.title);
    
    // Extract keywords from titles and text
    const allText = results.map(r => `${r.title} ${r.text}`).join(' ');
    const words = allText.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['that', 'this', 'with', 'from', 'they', 'have', 'will', 'been', 'were', 'said', 'each', 'which', 'their', 'about', 'other', 'after', 'first', 'well', 'also'].includes(word));
    
    const wordCount = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topKeywords = Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    const subredditCount = subreddits.reduce((acc, sub) => {
      acc[sub] = (acc[sub] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const popularSubreddits = Object.entries(subredditCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([sub]) => sub);

    // Identify content types
    const contentTypes = [];
    if (titles.some(t => t.toLowerCase().includes('tutorial'))) contentTypes.push('Tutorials');
    if (titles.some(t => t.toLowerCase().includes('question'))) contentTypes.push('Questions');
    if (titles.some(t => t.toLowerCase().includes('project'))) contentTypes.push('Projects');
    if (titles.some(t => t.toLowerCase().includes('news'))) contentTypes.push('News');
    if (titles.some(t => t.toLowerCase().includes('discussion'))) contentTypes.push('Discussions');

    return {
      topKeywords,
      emergingTrends: topKeywords.slice(0, 5),
      popularSubreddits,
      contentTypes
    };
  }

  private extractRelatedTopics(results: ExaRedditResult[]): string[] {
    const topics = new Set<string>();
    
    results.forEach(result => {
      // Extract hashtags and mentions
      const text = `${result.title} ${result.text}`;
      const hashtags = text.match(/#\w+/g) || [];
      const mentions = text.match(/@\w+/g) || [];
      
      hashtags.forEach(tag => topics.add(tag.slice(1)));
      mentions.forEach(mention => topics.add(mention.slice(1)));
      
      // Extract key technical terms
      const techTerms = text.match(/\b(AI|ML|Python|JavaScript|React|Node|API|ChatGPT|GPT|LLM|neural|deep learning|machine learning|data science|analytics)\b/gi) || [];
      techTerms.forEach(term => topics.add(term));
    });

    return Array.from(topics).slice(0, 10);
  }
}

export const exaSearchService = new ExaSearchService();