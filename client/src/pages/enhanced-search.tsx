import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ExternalLink, TrendingUp, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface EnhancedPost {
  id: string;
  title: string;
  author: string;
  subreddit: string;
  ups: number;
  num_comments: number;
  created_utc: number;
  url: string;
  permalink: string;
  selftext: string;
  domain: string;
  is_self: boolean;
  thumbnail?: string;
  aiAnalysis?: {
    tags: string[];
    summary: string;
    confidence: number;
  };
}

interface SearchResult {
  success: boolean;
  subreddit: string;
  query: string;
  totalResults: number;
  posts: EnhancedPost[];
  uniqueUsers: number;
  topUsers: string[];
  source: string;
  authentic: boolean;
}

interface ExaSearchResult {
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

interface ExaSearchResponse {
  query: string;
  results: ExaSearchResult[];
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

export default function EnhancedSearch() {
  const [subreddit, setSubreddit] = useState("datascience");
  const [query, setQuery] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [exaSearchResult, setExaSearchResult] = useState<ExaSearchResponse | null>(null);
  const [searchMode, setSearchMode] = useState<'reddit' | 'exa'>('exa');
  const [isSubredditOpen, setIsSubredditOpen] = useState(false);
  const [subredditSearch, setSubredditSearch] = useState("");

  // Popular subreddits for easy discovery
  const popularSubreddits = [
    { name: "datascience", description: "Data science community" },
    { name: "MachineLearning", description: "Machine learning research and discussion" },
    { name: "artificial", description: "Artificial intelligence topics" },
    { name: "ChatGPT", description: "ChatGPT discussions and tips" },
    { name: "OpenAI", description: "OpenAI products and research" },
    { name: "LocalLLaMA", description: "Local language models" },
    { name: "deeplearning", description: "Deep learning techniques" },
    { name: "statistics", description: "Statistical analysis and methods" },
    { name: "analytics", description: "Data analytics and insights" },
    { name: "Python", description: "Python programming" },
    { name: "programming", description: "General programming discussion" },
    { name: "tech", description: "Technology news and discussion" },
    { name: "cscareerquestions", description: "Computer science career advice" },
    { name: "learnmachinelearning", description: "Learning machine learning" },
    { name: "ArtificialIntelligence", description: "AI discussions and news" }
  ];

  const filteredSubreddits = popularSubreddits.filter(sub =>
    sub.name.toLowerCase().includes(subredditSearch.toLowerCase()) ||
    sub.description.toLowerCase().includes(subredditSearch.toLowerCase())
  );

  const enhancedSearch = useMutation({
    mutationFn: async (data: { subreddit: string; query?: string; limit?: number }) => {
      return await apiRequest("/api/search-reddit-enhanced", "POST", data);
    },
    onSuccess: (data) => {
      if (data.success) {
        setSearchResult(data);
        setExaSearchResult(null);
      }
    },
  });

  // Exa-powered search mutation
  const exaSearchMutation = useMutation({
    mutationFn: async ({ query, subreddit }: { query: string; subreddit?: string }) => {
      if (subreddit && subreddit !== 'all') {
        return apiRequest(`/api/search/exa/subreddit`, 'POST', { subreddit, query, timeframe: 'month' });
      } else {
        return apiRequest(`/api/search/exa`, 'POST', { query, numResults: 30, timeframe: 'month' });
      }
    },
    onSuccess: (data) => {
      setExaSearchResult(data);
      setSearchResult(null);
    }
  });

  const handleSearch = () => {
    if (searchMode === 'exa') {
      exaSearchMutation.mutate({
        query: query || 'trending posts',
        subreddit: subreddit === 'all' ? undefined : subreddit
      });
    } else {
      enhancedSearch.mutate({
        subreddit,
        query: query || undefined,
        limit: 100
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col space-y-4">
        <h1 className="text-3xl font-bold">Enhanced Reddit Search</h1>
        <p className="text-muted-foreground">
          Search any subreddit with AI-powered analysis and authentic data retrieval
        </p>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Advanced Search
          </CardTitle>
          <CardDescription>
            Search Reddit with AI-powered semantic understanding using Exa.ai or traditional Reddit API
          </CardDescription>
          
          {/* Search Mode Toggle */}
          <div className="flex items-center gap-2 mt-4">
            <span className="text-sm font-medium">Search Mode:</span>
            <div className="flex rounded-lg border p-1">
              <Button
                variant={searchMode === 'exa' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSearchMode('exa')}
                className="text-xs"
              >
                🔍 Exa.ai (Semantic)
              </Button>
              <Button
                variant={searchMode === 'reddit' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSearchMode('reddit')}
                className="text-xs"
              >
                📡 Reddit API
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subreddit</label>
              <Popover open={isSubredditOpen} onOpenChange={setIsSubredditOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isSubredditOpen}
                    className="w-full justify-between"
                  >
                    {subreddit ? `r/${subreddit}` : "Select subreddit..."}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Search subreddits..." 
                      value={subredditSearch}
                      onValueChange={setSubredditSearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <div className="p-4 text-center">
                          <p className="text-sm text-muted-foreground mb-2">
                            No matches found. Try typing the exact subreddit name.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (subredditSearch.trim()) {
                                setSubreddit(subredditSearch.trim());
                                setIsSubredditOpen(false);
                              }
                            }}
                          >
                            Use "{subredditSearch}"
                          </Button>
                        </div>
                      </CommandEmpty>
                      <CommandGroup heading="Popular Subreddits">
                        {filteredSubreddits.map((sub) => (
                          <CommandItem
                            key={sub.name}
                            value={sub.name}
                            onSelect={(currentValue) => {
                              setSubreddit(currentValue);
                              setIsSubredditOpen(false);
                            }}
                          >
                            <CheckCircle
                              className={`mr-2 h-4 w-4 ${
                                subreddit === sub.name ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            <div>
                              <div className="font-medium">r/{sub.name}</div>
                              <div className="text-xs text-muted-foreground">{sub.description}</div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Query (Optional)</label>
              <Input
                placeholder="machine learning, career advice, etc."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
          </div>
          
          {/* Quick Subreddit Suggestions */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Quick Select:</label>
            <div className="flex flex-wrap gap-2">
              {["datascience", "MachineLearning", "ChatGPT", "Python", "artificial"].map((quickSub) => (
                <Button
                  key={quickSub}
                  variant={subreddit === quickSub ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSubreddit(quickSub)}
                >
                  r/{quickSub}
                </Button>
              ))}
            </div>
          </div>

          <Button 
            onClick={handleSearch} 
            disabled={enhancedSearch.isPending || !subreddit}
            className="w-full"
          >
            {enhancedSearch.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Search r/{subreddit}
          </Button>
        </CardContent>
      </Card>

      {/* Error Handling */}
      {enhancedSearch.error && (
        <Alert variant="destructive">
          <AlertDescription>
            Search failed. Please check the subreddit name and try again.
          </AlertDescription>
        </Alert>
      )}

      {/* Exa Search Results */}
      {exaSearchResult && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Exa.ai Search Results
                <Badge variant="secondary" className="ml-2">
                  Semantic Search
                </Badge>
              </CardTitle>
              <CardDescription>
                Found {exaSearchResult.totalResults} results with AI-powered analysis for "{exaSearchResult.query}"
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{exaSearchResult.totalResults}</div>
                  <p className="text-sm text-muted-foreground">Total Results</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{exaSearchResult.insights.popularSubreddits.length}</div>
                  <p className="text-sm text-muted-foreground">Subreddits</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{exaSearchResult.insights.topKeywords.length}</div>
                  <p className="text-sm text-muted-foreground">Key Topics</p>
                </div>
              </div>

              {/* AI Insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Top Keywords</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {exaSearchResult.insights.topKeywords.slice(0, 8).map((keyword, index) => (
                        <Badge key={index} variant="outline">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Popular Communities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {exaSearchResult.insights.popularSubreddits.map((sub, index) => (
                        <Badge key={index} variant="secondary">
                          r/{sub}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Search Results */}
              <div className="space-y-4">
                {exaSearchResult.results.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <h3 className="font-medium text-sm leading-relaxed pr-4">
                        {result.title}
                      </h3>
                      <div className="flex gap-2 flex-shrink-0">
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View
                        </a>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>u/{result.author}</span>
                      <span>r/{result.subreddit}</span>
                      <span>Score: {result.score.toFixed(3)}</span>
                      <span>{new Date(result.publishedDate).toLocaleDateString()}</span>
                    </div>

                    {result.text && (
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {result.text.substring(0, 200)}...
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reddit API Results */}
      {searchResult && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-2xl font-bold">{searchResult.totalResults}</p>
                  <p className="text-sm text-muted-foreground">Posts Found</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-2xl font-bold">{searchResult.uniqueUsers}</p>
                  <p className="text-sm text-muted-foreground">Unique Users</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-lg font-bold">r/{searchResult.subreddit}</p>
                  <p className="text-sm text-muted-foreground">Subreddit</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <Badge variant={searchResult.authentic ? "default" : "secondary"}>
                    {searchResult.source}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchResult.authentic ? "Live Data" : "Cached"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Users */}
          {searchResult.topUsers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Active Contributors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {searchResult.topUsers.slice(0, 10).map((username, index) => (
                    <Badge key={index} variant="outline">
                      u/{username}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Posts Results */}
          <Card>
            <CardHeader>
              <CardTitle>Search Results</CardTitle>
              <CardDescription>
                {searchResult.query 
                  ? `Posts matching "${searchResult.query}" in r/${searchResult.subreddit}`
                  : `Recent posts from r/${searchResult.subreddit}`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {searchResult.posts.map((post) => (
                  <div key={post.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <h3 className="font-medium text-sm leading-relaxed pr-4">
                        {post.title}
                      </h3>
                      <div className="flex gap-2 flex-shrink-0">
                        <a
                          href={post.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
                        >
                          Reddit <ExternalLink className="h-3 w-3" />
                        </a>
                        {post.url !== post.permalink && (
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-green-600 hover:text-green-800 text-xs"
                          >
                            Link <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>u/{post.author}</span>
                      <span>{post.ups} upvotes</span>
                      <span>{post.num_comments} comments</span>
                      <span>{new Date(post.created_utc * 1000).toLocaleDateString()}</span>
                      <span>{post.domain}</span>
                    </div>
                    
                    {/* AI Analysis */}
                    {post.aiAnalysis && post.aiAnalysis.tags.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1">
                          {post.aiAnalysis.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        {post.aiAnalysis.summary !== 'Analysis unavailable' && (
                          <p className="text-xs text-muted-foreground">
                            AI Summary: {post.aiAnalysis.summary}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {post.selftext && (
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {post.selftext.substring(0, 300)}...
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}