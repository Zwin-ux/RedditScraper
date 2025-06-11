import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, TrendingUp, Users, MessageSquare, ExternalLink } from "lucide-react";
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
  const { toast } = useToast();

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
    if (subreddit) {
      handleAddSubreddit(subreddit);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Explore Subreddits
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search subreddits or enter custom name (e.g., 'NLP' or 'r/NLP')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                onKeyDown={(e) => e.key === 'Enter' && handleCustomSearch()}
              />
            </div>
            <Button 
              onClick={handleCustomSearch}
              disabled={!searchQuery.trim() || scrapeMutation.isPending}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Custom
            </Button>
          </div>

          {/* Loading State */}
          {scrapeMutation.isPending && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <div>
                    <p className="font-medium">Scraping r/{selectedSubreddit}</p>
                    <p className="text-sm text-slate-600">Discovering creators from authentic Reddit posts...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Suggestions Grid */}
          <div className="overflow-y-auto max-h-[60vh]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredSuggestions.map((sub) => (
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
                        disabled={scrapeMutation.isPending || sub.isActive}
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

            {filteredSuggestions.length === 0 && searchQuery && (
              <div className="text-center py-8">
                <p className="text-slate-500 mb-4">No matching subreddit suggestions found</p>
                <Button onClick={handleCustomSearch} disabled={scrapeMutation.isPending}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add "r/{searchQuery.replace(/^r\//, '')}" anyway
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}