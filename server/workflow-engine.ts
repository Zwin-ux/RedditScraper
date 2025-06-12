import { storage } from "./storage";
import { analyzeCreatorContent, analyzePostRelevance, analyzeDataScienceTrends } from "./gemini";
import { redditApiClient } from "./reddit-api-client";
import type { Creator, Post } from "@shared/schema";

export interface WorkflowNode {
  id: string;
  type: 'gemini' | 'database' | 'reddit' | 'chat';
  config: Record<string, any>;
  connections: string[];
}

export interface WorkflowExecution {
  id: string;
  nodes: WorkflowNode[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  results: Record<string, any>;
  startTime: Date;
  endTime?: Date;
}

export class WorkflowEngine {
  private executions = new Map<string, WorkflowExecution>();

  async executeWorkflow(nodes: WorkflowNode[]): Promise<string> {
    const executionId = `exec_${Date.now()}`;
    const execution: WorkflowExecution = {
      id: executionId,
      nodes,
      status: 'pending',
      results: {},
      startTime: new Date()
    };

    this.executions.set(executionId, execution);
    
    try {
      execution.status = 'running';
      await this.processNodes(execution);
      execution.status = 'completed';
    } catch (error) {
      execution.status = 'failed';
      execution.results.error = error instanceof Error ? error.message : 'Unknown error';
    }

    execution.endTime = new Date();
    return executionId;
  }

  private async processNodes(execution: WorkflowExecution): Promise<void> {
    const processed = new Set<string>();
    const nodeMap = new Map(execution.nodes.map(n => [n.id, n]));

    // Process nodes in dependency order
    const processNode = async (nodeId: string): Promise<any> => {
      if (processed.has(nodeId)) {
        return execution.results[nodeId];
      }

      const node = nodeMap.get(nodeId);
      if (!node) throw new Error(`Node ${nodeId} not found`);

      // Process dependencies first
      const inputs: Record<string, any> = {};
      for (const depId of this.getDependencies(node, execution.nodes)) {
        inputs[depId] = await processNode(depId);
      }

      // Execute node
      const result = await this.executeNode(node, inputs);
      execution.results[nodeId] = result;
      processed.add(nodeId);

      return result;
    };

    // Process all nodes
    for (const node of execution.nodes) {
      await processNode(node.id);
    }
  }

  private getDependencies(node: WorkflowNode, allNodes: WorkflowNode[]): string[] {
    // Find nodes that connect to this node
    return allNodes
      .filter(n => n.connections.includes(node.id))
      .map(n => n.id);
  }

  private async executeNode(node: WorkflowNode, inputs: Record<string, any>): Promise<any> {
    console.log(`Executing node ${node.id} of type ${node.type}`);

    switch (node.type) {
      case 'database':
        return await this.executeDatabaseNode(node, inputs);
      
      case 'reddit':
        return await this.executeRedditNode(node, inputs);
      
      case 'gemini':
        return await this.executeGeminiNode(node, inputs);
      
      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  private async executeDatabaseNode(node: WorkflowNode, inputs: Record<string, any>): Promise<any> {
    const { queryType, subredditFilter, engagementThreshold, limit } = node.config;

    switch (queryType) {
      case 'creators':
        const filters: any = {};
        if (subredditFilter) filters.subreddit = subredditFilter;
        if (engagementThreshold) filters.engagementLevel = parseInt(engagementThreshold) >= 80 ? 'high' : 'medium';
        if (limit) filters.limit = parseInt(limit);

        return await storage.getCreators(filters);

      case 'posts':
        // Get all posts with creator information
        const creators = await storage.getCreators({ limit: limit || 50 });
        const allPosts = [];
        
        for (const creator of creators) {
          const posts = await storage.getPostsByCreator(creator.id, 5);
          allPosts.push(...posts.map(post => ({ ...post, creator })));
        }
        
        return allPosts;

      case 'analytics':
        const stats = await storage.getDashboardStats();
        const topCreators = await storage.getCreators({ limit: 10 });
        
        return {
          stats,
          topCreators,
          totalPosts: topCreators.reduce((sum, c) => sum + (c.postsCount || 0), 0)
        };

      default:
        throw new Error(`Unknown database query type: ${queryType}`);
    }
  }

  private async executeRedditNode(node: WorkflowNode, inputs: Record<string, any>): Promise<any> {
    const { subreddit, limit, sort, minScore } = node.config;

    if (!subreddit) {
      throw new Error('Subreddit is required for Reddit node');
    }

    // Use the existing Reddit API client
    const searchResult = await redditApiClient.searchSubreddit(
      subreddit, 
      undefined, 
      limit || 100
    );

    const filteredPosts = searchResult.posts.filter(post => 
      (post.ups || 0) >= (minScore || 0)
    );

    return {
      subreddit,
      posts: filteredPosts,
      totalFound: filteredPosts.length,
      source: 'reddit_api'
    };
  }

  private async executeGeminiNode(node: WorkflowNode, inputs: Record<string, any>): Promise<any> {
    const { analysisType, model, temperature } = node.config;
    
    // Get input data from connected nodes
    const inputData = Object.values(inputs)[0]; // Take first input
    
    if (!inputData) {
      throw new Error('No input data for Gemini analysis');
    }

    switch (analysisType) {
      case 'creator':
        if (Array.isArray(inputData) && inputData[0]?.username) {
          // Analyzing creators
          const results = [];
          for (const creator of inputData.slice(0, 10)) {
            try {
              const posts = await storage.getPostsByCreator(creator.id, 3);
              const analysis = await analyzeCreatorContent(
                creator.username,
                posts.map(p => ({ content: p.content || p.title, upvotes: p.upvotes }))
              );
              results.push({ creator: creator.username, analysis });
            } catch (error) {
              console.error(`Analysis failed for ${creator.username}:`, error);
            }
          }
          return results;
        }
        break;

      case 'post':
        if (Array.isArray(inputData) && inputData[0]?.title) {
          // Analyzing posts
          const results = [];
          for (const post of inputData.slice(0, 20)) {
            try {
              const analysis = await analyzePostRelevance(post.title, post.content || '');
              results.push({ post: post.title, analysis });
            } catch (error) {
              console.error(`Post analysis failed:`, error);
            }
          }
          return results;
        }
        break;

      case 'trends':
        if (Array.isArray(inputData)) {
          const posts = inputData
            .filter(item => item.title)
            .map(item => ({ title: item.title, content: item.content || '' }));
          
          return await analyzeDataScienceTrends(posts);
        }
        break;

      default:
        throw new Error(`Unknown analysis type: ${analysisType}`);
    }

    throw new Error('Invalid input data for Gemini analysis');
  }

  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  getAllExecutions(): WorkflowExecution[] {
    return Array.from(this.executions.values());
  }
}

export const workflowEngine = new WorkflowEngine();