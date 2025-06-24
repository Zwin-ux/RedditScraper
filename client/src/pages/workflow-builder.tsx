import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Settings, Play, Save, Database, Zap, Bot, ArrowLeft, MessageSquare } from "lucide-react";
import { SiGooglegemini, SiPostgresql, SiReddit } from "react-icons/si";
import { Link } from "wouter";
import { Chatbot } from "@/components/chatbot";
import { useMutation } from "@tanstack/react-query";

interface WorkflowNode {
  id: string;
  type: 'gemini' | 'database' | 'reddit' | 'filter';
  title: string;
  config: Record<string, any>;
  position: { x: number; y: number };
  connections: string[];
}

interface NodeComponentProps {
  node: WorkflowNode;
  onUpdate: (id: string, config: Record<string, any>) => void;
  onConnect: (fromId: string, toId: string) => void;
}

function GeminiNode({ node, onUpdate }: NodeComponentProps) {
  const [config, setConfig] = useState(node.config);

  const updateConfig = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    onUpdate(node.id, newConfig);
  };

  return (
    <Card className="w-80 border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-blue-700">
          <SiGooglegemini className="w-5 h-5" />
          Gemini AI Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-slate-600 mb-4">Inputs</div>
        
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="text-sm text-slate-600">Cache</span>
        </div>

        <div>
          <Label className="text-sm font-medium">
            Model Name <span className="text-red-500">*</span>
          </Label>
          <Select value={config.model || 'gemini-1.5-pro'} onValueChange={(value) => updateConfig('model', value)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gemini-1.5-pro">gemini-1.5-pro</SelectItem>
              <SelectItem value="gemini-1.5-flash">gemini-1.5-flash</SelectItem>
              <SelectItem value="gemini-pro">gemini-pro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium">Temperature</Label>
          <Input
            type="number"
            min="0"
            max="2"
            step="0.1"
            value={config.temperature || 0.7}
            onChange={(e) => updateConfig('temperature', parseFloat(e.target.value))}
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-sm font-medium">Analysis Type</Label>
          <Select value={config.analysisType || 'creator'} onValueChange={(value) => updateConfig('analysisType', value)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="creator">Creator Analysis</SelectItem>
              <SelectItem value="post">Post Relevance</SelectItem>
              <SelectItem value="trends">Data Science Trends</SelectItem>
              <SelectItem value="sentiment">Sentiment Analysis</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Enable Content Filtering</Label>
          <Switch
            checked={config.enableFiltering || false}
            onCheckedChange={(checked) => updateConfig('enableFiltering', checked)}
          />
        </div>

        <Button variant="outline" className="w-full">
          <Settings className="w-4 h-4 mr-2" />
          Additional Parameters
        </Button>

        <div className="pt-4 border-t">
          <div className="text-sm text-slate-600 mb-2">Output</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium">GeminiAnalysis</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DatabaseNode({ node, onUpdate }: NodeComponentProps) {
  const [config, setConfig] = useState(node.config);

  const updateConfig = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    onUpdate(node.id, newConfig);
  };

  return (
    <Card className="w-80 border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-emerald-700">
          <SiPostgresql className="w-5 h-5" />
          PostgreSQL Query
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-slate-600 mb-4">Inputs</div>
        
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
          <span className="text-sm text-slate-600">Query Parameters</span>
        </div>

        <div>
          <Label className="text-sm font-medium">
            Query Type <span className="text-red-500">*</span>
          </Label>
          <Select value={config.queryType || 'creators'} onValueChange={(value) => updateConfig('queryType', value)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="creators">Get Creators</SelectItem>
              <SelectItem value="posts">Get Posts</SelectItem>
              <SelectItem value="subreddits">Get Subreddits</SelectItem>
              <SelectItem value="analytics">Analytics Query</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium">
            Database Connection <span className="text-red-500">*</span>
          </Label>
          <div className="mt-1 p-2 bg-slate-100 rounded text-sm text-slate-600">
            Using: DATABASE_URL
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Filters</Label>
          <div className="space-y-2 mt-1">
            <Input
              placeholder="Subreddit filter..."
              value={config.subredditFilter || ''}
              onChange={(e) => updateConfig('subredditFilter', e.target.value)}
            />
            <Input
              placeholder="Engagement threshold..."
              type="number"
              value={config.engagementThreshold || ''}
              onChange={(e) => updateConfig('engagementThreshold', e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Limit Results</Label>
          <Input
            type="number"
            min="1"
            max="1000"
            value={config.limit || 50}
            onChange={(e) => updateConfig('limit', parseInt(e.target.value))}
            className="mt-1"
          />
        </div>

        <Button variant="outline" className="w-full">
          <Settings className="w-4 h-4 mr-2" />
          Additional Parameters
        </Button>

        <div className="pt-4 border-t">
          <div className="text-sm text-slate-600 mb-2">Output</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <span className="text-sm font-medium">DatabaseResults</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RedditNode({ node, onUpdate }: NodeComponentProps) {
  const [config, setConfig] = useState(node.config);

  const updateConfig = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    onUpdate(node.id, newConfig);
  };

  return (
    <Card className="w-80 border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-red-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-orange-700">
          <SiReddit className="w-5 h-5" />
          Reddit Scraper
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-slate-600 mb-4">Inputs</div>
        
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
          <span className="text-sm text-slate-600">API Credentials</span>
        </div>

        <div>
          <Label className="text-sm font-medium">
            Subreddit <span className="text-red-500">*</span>
          </Label>
          <Input
            placeholder="e.g., MachineLearning"
            value={config.subreddit || ''}
            onChange={(e) => updateConfig('subreddit', e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-sm font-medium">Post Limit</Label>
          <Input
            type="number"
            min="1"
            max="500"
            value={config.limit || 100}
            onChange={(e) => updateConfig('limit', parseInt(e.target.value))}
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-sm font-medium">Sort Method</Label>
          <Select value={config.sort || 'hot'} onValueChange={(value) => updateConfig('sort', value)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hot">Hot</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="top">Top</SelectItem>
              <SelectItem value="rising">Rising</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium">Minimum Score</Label>
          <Input
            type="number"
            min="0"
            value={config.minScore || 10}
            onChange={(e) => updateConfig('minScore', parseInt(e.target.value))}
            className="mt-1"
          />
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Store Posts</Label>
          <Switch
            checked={config.storePosts !== false}
            onCheckedChange={(checked) => updateConfig('storePosts', checked)}
          />
        </div>

        <Button variant="outline" className="w-full">
          <Settings className="w-4 h-4 mr-2" />
          Additional Parameters
        </Button>

        <div className="pt-4 border-t">
          <div className="text-sm text-slate-600 mb-2">Output</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span className="text-sm font-medium">RedditData</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function WorkflowBuilder() {
  const [nodes, setNodes] = useState<WorkflowNode[]>([
    {
      id: 'database-1',
      type: 'database',
      title: 'Get Creators',
      config: { queryType: 'creators', limit: 20 },
      position: { x: 100, y: 100 },
      connections: ['gemini-1']
    },
    {
      id: 'gemini-1',
      type: 'gemini',
      title: 'Analyze Creators',
      config: { model: 'gemini-1.5-pro', temperature: 0.7, analysisType: 'creator' },
      position: { x: 500, y: 100 },
      connections: []
    }
  ]);

  const [selectedWorkflow, setSelectedWorkflow] = useState('creator-analysis');
  const [showChatbot, setShowChatbot] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);

  const executeMutation = useMutation({
    mutationFn: async (workflowNodes: WorkflowNode[]) => {
      const response = await fetch('/api/workflow/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: workflowNodes })
      });
      return response.json();
    },
    onSuccess: async (data) => {
      // Poll for execution results
      const pollExecution = async () => {
        const response = await fetch(`/api/workflow/execution/${data.executionId}`);
        const execution = await response.json();
        
        if (execution.status === 'completed') {
          setExecutionResult(execution);
        } else if (execution.status === 'failed') {
          console.error('Workflow execution failed:', execution.results.error);
        } else {
          setTimeout(pollExecution, 1000);
        }
      };
      
      setTimeout(pollExecution, 1000);
    }
  });

  const updateNodeConfig = useCallback((nodeId: string, config: Record<string, any>) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, config } : node
    ));
  }, []);

  const addNode = (type: WorkflowNode['type']) => {
    const newNode: WorkflowNode = {
      id: `${type}-${Date.now()}`,
      type,
      title: type.charAt(0).toUpperCase() + type.slice(1),
      config: {},
      position: { x: 200, y: 200 + nodes.length * 100 },
      connections: []
    };
    setNodes(prev => [...prev, newNode]);
  };

  const executeWorkflow = () => {
    console.log('Executing workflow with nodes:', nodes);
    executeMutation.mutate(nodes);
  };

  const renderNode = (node: WorkflowNode) => {
    const commonProps = {
      node,
      onUpdate: updateNodeConfig,
      onConnect: () => {}
    };

    switch (node.type) {
      case 'gemini':
        return <GeminiNode key={node.id} {...commonProps} />;
      case 'database':
        return <DatabaseNode key={node.id} {...commonProps} />;
      case 'reddit':
        return <RedditNode key={node.id} {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Reddit Analysis Workflow</h1>
              <p className="text-slate-600">Build AI-powered workflows for Reddit creator analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="creator-analysis">Creator Analysis</SelectItem>
                <SelectItem value="trend-detection">Trend Detection</SelectItem>
                <SelectItem value="sentiment-analysis">Sentiment Analysis</SelectItem>
                <SelectItem value="custom">Custom Workflow</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button 
              onClick={executeWorkflow}
              disabled={executeMutation.isPending}
            >
              <Play className="w-4 h-4 mr-2" />
              {executeMutation.isPending ? 'Running...' : 'Run Workflow'}
            </Button>
            <Button 
              variant="outline"
              onClick={() => setShowChatbot(!showChatbot)}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat Assistant
            </Button>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Components</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => addNode('reddit')}
              >
                <SiReddit className="w-4 h-4 mr-2 text-orange-500" />
                Reddit Scraper
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => addNode('gemini')}
              >
                <SiGooglegemini className="w-4 h-4 mr-2 text-blue-500" />
                Gemini AI
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => addNode('database')}
              >
                <Database className="w-4 h-4 mr-2 text-emerald-500" />
                Database Query
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Workflow Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Components</span>
                <Badge variant="secondary">{nodes.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Connections</span>
                <Badge variant="secondary">
                  {nodes.reduce((acc, node) => acc + node.connections.length, 0)}
                </Badge>
              </div>
              <Separator />
              <div className="text-xs text-slate-500">
                Last saved: Never
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Canvas */}
        <div className="flex-1 flex gap-4">
          <div className="flex-1 bg-white rounded-lg border border-slate-200 relative overflow-auto min-h-[600px]">
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
              {/* Workflow Canvas */}
              <div className="relative p-6">
                <div className="flex flex-wrap gap-6">
                  {nodes.map(renderNode)}
                </div>
                
                {/* Execution Results */}
                {executionResult && (
                  <div className="absolute top-4 right-4 max-w-sm">
                    <Card className="border-green-200 bg-green-50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-green-700">Workflow Complete</CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs">
                        <p>Status: {executionResult.status}</p>
                        <p>Duration: {new Date(executionResult.endTime).getTime() - new Date(executionResult.startTime).getTime()}ms</p>
                        <p>Results: {Object.keys(executionResult.results).length} nodes processed</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
                
                {executeMutation.isPending && (
                  <div className="absolute top-4 right-4 max-w-sm">
                    <Card className="border-blue-200 bg-blue-50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span className="text-sm text-blue-700">Executing workflow...</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
              
              {/* Connection Lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {nodes.map(node =>
                  node.connections.map(targetId => {
                    const targetNode = nodes.find(n => n.id === targetId);
                    if (!targetNode) return null;
                    
                    return (
                      <line
                        key={`${node.id}-${targetId}`}
                        x1={node.position.x + 320}
                        y1={node.position.y + 100}
                        x2={targetNode.position.x}
                        y2={targetNode.position.y + 100}
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                        markerEnd="url(#arrowhead)"
                      />
                    );
                  })
                )}
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon
                      points="0 0, 10 3.5, 0 7"
                      fill="#3b82f6"
                    />
                  </marker>
                </defs>
              </svg>
            </div>
          </div>
          
          {/* Chatbot Panel */}
          {showChatbot && (
            <div className="w-96">
              <Chatbot />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}