import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, TrendingUp, Users, MessageSquare, ExternalLink, CheckCircle, AlertCircle, Loader2, Star } from "lucide-react";
import { SiReddit } from "react-icons/si";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SubredditSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SubredditSuggestion {
  name: string;
  description: string;
  subscribers: string;
  category: string;
  isActive?: boolean;
}

export function SubredditSearch({ isOpen, onClose }: SubredditSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubreddit, setSelectedSubreddit] = useState('');
  const [validationState, setValidationState] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [activeTab, setActiveTab] = useState('search');
  const [bulkSubreddits, setBulkSubreddits] = useState('');
  const { toast } = useToast();

  // Validate subreddit name in real-time
  useEffect(() => {
    if (!searchQuery.trim()) {
      setValidationState('idle');
      return;
    }

    const subredditName = searchQuery.replace(/^r\//, '').trim();
    
    // Basic validation
    if (subredditName.length < 3) {
      setValidationState('invalid');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(subredditName)) {
      setValidationState('invalid');
      return;
    }

    setValidationState('valid');
  }, [searchQuery]);

  const scrapeMutation = useMutation({
    mutationFn: (subreddit: string) => api.scrapeSubreddit(subreddit),
    onSuccess: (data: any) => {
      toast({
        title: "Scraping Complete",
        description: `Found ${data.data?.creatorsFound || 0} creators from r/${selectedSubreddit}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/creators'] });
      queryClient.invalidateQueries({ queryKey: ['/api/subreddits'] });
      setSelectedSubreddit('');
      setSearchQuery('');
    },
    onError: (error: Error) => {
      toast({
        title: "Scraping Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkScrapeMutation = useMutation({
    mutationFn: async (subreddits: string[]) => {
      const results = [];
      for (const subreddit of subreddits) {
        try {
          const result = await api.scrapeSubreddit(subreddit);
          results.push({ subreddit, success: true, data: result });
        } catch (error) {
          results.push({ subreddit, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      toast({
        title: "Bulk Scraping Complete",
        description: `${successful} subreddits processed successfully${failed > 0 ? `, ${failed} failed` : ''}`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/creators'] });
      queryClient.invalidateQueries({ queryKey: ['/api/subreddits'] });
      setBulkSubreddits('');
    },
    onError: (error: Error) => {
      toast({
        title: "Bulk Scraping Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Curated subreddit suggestions for AI/ML communities
  const suggestions: SubredditSuggestion[] = [
    {
      name: "artificial",
      description: "General artificial intelligence discussions and news",
      subscribers: "2.1M",
      category: "AI General"
    },
    {
      name: "MachineLearning",
      description: "Academic and industry machine learning content",
      subscribers: "2.7M", 
      category: "ML Research",
      isActive: true
    },
    {
      name: "deeplearning",
      description: "Deep learning techniques and applications",
      subscribers: "295K",
      category: "ML Research"
    },
    {
      name: "datascience",
      description: "Data science tools, techniques, and career advice",
      subscribers: "1.8M",
      category: "Data Science",
      isActive: true
    },
    {
      name: "ChatGPT",
      description: "OpenAI's ChatGPT discussions and use cases",
      subscribers: "589K",
      category: "AI Tools",
      isActive: true
    },
    {
      name: "OpenAI",
      description: "OpenAI company news and model discussions",
      subscribers: "246K",
      category: "AI Companies",
      isActive: true
    },
    {
      name: "LocalLLaMA",
      description: "Self-hosted and local language models",
      subscribers: "85K",
      category: "AI Tools"
    },
    {
      name: "singularity",
      description: "Technological singularity and AGI discussions",
      subscribers: "184K",
      category: "AI General"
    },
    {
      name: "compsci",
      description: "Computer science theory and applications",
      subscribers: "1.2M",
      category: "Computer Science"
    },
    {
      name: "reinforcementlearning",
      description: "RL algorithms, environments, and research",
      subscribers: "42K",
      category: "ML Research"
    },
    {
      name: "statistics",
      description: "Statistical methods and data analysis",
      subscribers: "345K",
      category: "Data Science"
    },
    {
      name: "computervision",
      description: "Computer vision and image processing",
      subscribers: "67K",
      category: "ML Research"
    }
  ];

  const filteredSuggestions = suggestions.filter(sub =>
    sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sub.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sub.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddSubreddit = (subredditName: string) => {
    setSelectedSubreddit(subredditName);
    scrapeMutation.mutate(subredditName);
  };

  const handleCustomSearch = () => {
    const subreddit = searchQuery.replace(/^r\//, '').trim();
    if (subreddit && validationState === 'valid') {
      handleAddSubreddit(subreddit);
    }
  };

  const handleBulkScrape = () => {
    const subreddits = bulkSubreddits
      .split(/[,\n]/)
      .map(s => s.replace(/^r\//, '').trim())
      .filter(s => s.length >= 3 && /^[a-zA-Z0-9_]+$/.test(s));
    
    if (subreddits.length > 0) {
      bulkScrapeMutation.mutate(subreddits);
    }
  };

  const getValidationIcon = () => {
    switch (validationState) {
      case 'valid':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'invalid':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'checking':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  const getValidationMessage = () => {
    if (!searchQuery.trim()) return null;
    
    const subredditName = searchQuery.replace(/^r\//, '').trim();
    
    if (subredditName.length < 3) {
      return "Subreddit names must be at least 3 characters long";
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(subredditName)) {
      return "Subreddit names can only contain letters, numbers, and underscores";
    }
    
    return `Ready to scrape r/${subredditName}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Discover & Scrape Subreddits
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search & Add
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Bulk Import
            </TabsTrigger>
            <TabsTrigger value="popular" className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              Popular Communities
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            {/* Enhanced Search Input */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Enter subreddit name (e.g., 'MachineLearning' or 'r/MachineLearning')"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`pl-10 pr-10 ${
                      validationState === 'valid' ? 'border-green-300 focus:border-green-500' :
                      validationState === 'invalid' ? 'border-red-300 focus:border-red-500' : ''
                    }`}
                    onKeyDown={(e) => e.key === 'Enter' && handleCustomSearch()}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {getValidationIcon()}
                  </div>
                </div>
                <Button 
                  onClick={handleCustomSearch}
                  disabled={validationState !== 'valid' || scrapeMutation.isPending}
                  className="min-w-[120px]"
                >
                  {scrapeMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  {scrapeMutation.isPending ? 'Scraping...' : 'Scrape Now'}
                </Button>
              </div>
              
              {/* Validation Message */}
              {getValidationMessage() && (
                <p className={`text-sm ${
                  validationState === 'valid' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {getValidationMessage()}
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Enter Multiple Subreddits
                </label>
                <Textarea
                  placeholder="Enter subreddit names (one per line or comma-separated):&#10;MachineLearning&#10;datascience&#10;artificial&#10;ChatGPT, LocalLLaMA, deeplearning"
                  value={bulkSubreddits}
                  onChange={(e) => setBulkSubreddits(e.target.value)}
                  className="min-h-[120px]"
                />
                <p className="text-xs text-slate-500 mt-1">
                  You can use 'r/' prefix or just the subreddit name. Invalid names will be filtered out.
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  {bulkSubreddits ? `${bulkSubreddits.split(/[,\n]/).filter(s => s.trim()).length} subreddits detected` : 'No subreddits entered'}
                </div>
                <Button 
                  onClick={handleBulkScrape}
                  disabled={!bulkSubreddits.trim() || bulkScrapeMutation.isPending}
                  className="min-w-[140px]"
                >
                  {bulkScrapeMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  {bulkScrapeMutation.isPending ? 'Processing...' : 'Scrape All'}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="popular" className="space-y-4">
            {/* Popular Communities Grid */}
            <div className="overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {suggestions.map((sub) => (
                  <Card key={sub.name} className={`cursor-pointer transition-all hover:shadow-md ${sub.isActive ? 'border-green-200 bg-green-50' : ''}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <SiReddit className="w-4 h-4 text-orange-500" />
                          <CardTitle className="text-base">r/{sub.name}</CardTitle>
                          {sub.isActive && (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                              Active
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`https://reddit.com/r/${sub.name}`, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-slate-600 mb-3">{sub.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {sub.subscribers}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {sub.category}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddSubreddit(sub.name)}
                          disabled={scrapeMutation.isPending || bulkScrapeMutation.isPending || sub.isActive}
                          variant={sub.isActive ? "secondary" : "default"}
                        >
                          {sub.isActive ? (
                            <>
                              <TrendingUp className="w-3 h-3 mr-1" />
                              Rescan
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3 mr-1" />
                              Add
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Global Loading States */}
        {(scrapeMutation.isPending || bulkScrapeMutation.isPending) && (
          <Card className="border-blue-200 bg-blue-50 mt-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                <div>
                  <p className="font-medium">
                    {scrapeMutation.isPending 
                      ? `Scraping r/${selectedSubreddit}` 
                      : 'Processing multiple subreddits'
                    }
                  </p>
                  <p className="text-sm text-slate-600">
                    {scrapeMutation.isPending 
                      ? 'Discovering creators from authentic Reddit posts...' 
                      : 'This may take a few minutes depending on the number of subreddits...'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
}