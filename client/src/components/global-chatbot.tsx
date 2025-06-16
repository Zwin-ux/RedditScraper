import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, MessageSquare, X, Minimize2, Maximize2 } from "lucide-react";
import { api } from "@/lib/api";

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  data?: string;
  analysis?: any;
  timestamp: Date;
}

interface GlobalChatbotProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function GlobalChatbot({ isOpen, onToggle }: GlobalChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'bot',
      content: "Hi! I'm your Reddit analysis assistant. I can help you find top creators, analyze subreddit trends, search specific communities, and provide insights from authentic Reddit data. Try asking:\n\n• \"Show me the highest karma creators\"\n• \"Find data science trends from r/datascience\"\n• \"Search r/MachineLearning for AI research\"\n• \"Who are the top creators in Python communities?\"\n\nWhat would you like to explore?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Quick action buttons for common tasks
  const quickActions = [
    { label: "Show top creators", query: "Show me the highest karma creators" },
    { label: "Data science trends", query: "Find data science trends from r/datascience" },
    { label: "Search communities", query: "Help me search Reddit communities" },
    { label: "AI research insights", query: "What are the latest AI research trends?" }
  ];

  // Get current page context for better assistance
  const getCurrentPage = () => {
    const path = window.location.pathname;
    if (path.includes('analytics')) return 'creator-analytics';
    if (path.includes('data-science')) return 'data-science-analyzer';
    if (path.includes('enhanced-search')) return 'enhanced-search';
    if (path.includes('trends')) return 'trends-analysis';
    return 'dashboard';
  };

  // Enhanced chat mutation with Reddit-focused assistance
  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await fetch('/api/chat/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message, 
          context: messages.slice(-5),
          includeFullAnalysis: true,
          currentPage: getCurrentPage()
        })
      });
      return response.json();
    },
    onSuccess: (data) => {
      const botMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'bot',
        content: data.response,
        data: data.data,
        analysis: data.analysis,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    },
    onError: () => {
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'bot',
        content: "I encountered an error while analyzing the data. Please try rephrasing your question.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  });

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    chatMutation.mutate(input);
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (!isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isMinimized]);

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg z-50"
        size="icon"
      >
        <MessageSquare className="w-6 h-6" />
      </Button>
    );
  }

  const quickQuestions = [
    "Who are my top performing creators?",
    "Show me trending posts this week",
    "Analyze engagement patterns by subreddit",
    "Which creators post about AI/ML?",
    "What content gets the most upvotes?",
    "Compare creators across different subreddits"
  ];

  return (
    <Card className={`fixed bottom-6 right-6 shadow-2xl z-50 transition-all duration-300 ${
      isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
    } flex flex-col`}>
      <CardHeader className="pb-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            <CardTitle className="text-sm">Reddit AI Assistant</CardTitle>
            <Badge variant="secondary" className="text-xs bg-white/20 text-white">
              Live Data
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-white hover:bg-white/20"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-white hover:bg-white/20"
              onClick={onToggle}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {!isMinimized && (
        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.type === 'bot' && (
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  
                  <div className={`max-w-[80%] ${message.type === 'user' ? 'order-1' : ''}`}>
                    <div
                      className={`p-3 rounded-lg ${
                        message.type === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-50 text-slate-900 border'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    
                    {message.data && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200 text-xs">
                        <div className="flex items-center gap-1 mb-2">
                          <Bot className="w-3 h-3 text-blue-600" />
                          <span className="font-medium text-blue-800">Data Analysis:</span>
                        </div>
                        <pre className="whitespace-pre-wrap text-slate-700 max-h-32 overflow-y-auto">
                          {message.data}
                        </pre>
                      </div>
                    )}

                    {message.analysis && (
                      <div className="mt-2 p-3 bg-purple-50 rounded-lg border border-purple-200 text-xs">
                        <div className="flex items-center gap-1 mb-2">
                          <Bot className="w-3 h-3 text-purple-600" />
                          <span className="font-medium text-purple-800">AI Insights:</span>
                        </div>
                        <div className="space-y-2">
                          {message.analysis.insights && (
                            <div>
                              <span className="font-medium">Key Insights:</span>
                              <ul className="ml-2 mt-1 space-y-1">
                                {message.analysis.insights.map((insight: string, i: number) => (
                                  <li key={i} className="text-purple-700">• {insight}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {message.analysis.recommendations && (
                            <div>
                              <span className="font-medium">Recommendations:</span>
                              <ul className="ml-2 mt-1 space-y-1">
                                {message.analysis.recommendations.map((rec: string, i: number) => (
                                  <li key={i} className="text-purple-700">• {rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <p className="text-xs text-slate-500 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>

                  {message.type === 'user' && (
                    <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-slate-600" />
                    </div>
                  )}
                </div>
              ))}
              
              {chatMutation.isPending && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-slate-50 border rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                      <span className="text-sm text-slate-600">Analyzing your data...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Quick Questions */}
          {messages.length === 1 && (
            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <p className="text-sm text-slate-600 mb-3 font-medium">Try asking:</p>
              <div className="grid grid-cols-1 gap-2">
                {quickQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="text-xs justify-start h-8 text-left"
                    onClick={() => setInput(question)}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-slate-200 bg-white">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about creators, posts, trends..."
                disabled={chatMutation.isPending}
                className="flex-1 text-sm"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || chatMutation.isPending}
                className="px-3 bg-gradient-to-r from-blue-500 to-purple-600"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}