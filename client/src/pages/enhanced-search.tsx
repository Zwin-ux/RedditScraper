import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ExternalLink, TrendingUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";

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

export default function EnhancedSearch() {
  const [subreddit, setSubreddit] = useState("datascience");
  const [query, setQuery] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

  const enhancedSearch = useMutation({
    mutationFn: async (data: { subreddit: string; query?: string; limit?: number }) => {
      return await apiRequest("/api/search-reddit-enhanced", "POST", data);
    },
    onSuccess: (data) => {
      if (data.success) {
        setSearchResult(data);
      }
    },
  });

  const handleSearch = () => {
    enhancedSearch.mutate({
      subreddit,
      query: query || undefined,
      limit: 100
    });
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
            Search specific subreddits with optional query filters and AI analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subreddit</label>
              <Input
                placeholder="datascience"
                value={subreddit}
                onChange={(e) => setSubreddit(e.target.value)}
              />
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

      {/* Results Section */}
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