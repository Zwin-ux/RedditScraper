import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, TrendingUp, Users, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";

interface RedditPost {
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
}

interface DataScienceTrends {
  topSkills: string[];
  emergingTechnologies: string[];
  careerTrends: string[];
  industryInsights: string[];
  marketDemand: number;
}

interface AnalysisResult {
  postsFound: number;
  posts: RedditPost[];
  trends: DataScienceTrends;
  query: string;
  source: string;
  authentic: boolean;
}

export default function DataScienceAnalyzer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubreddit, setSelectedSubreddit] = useState("datascience");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const queryClient = useQueryClient();

  // Popular data science related subreddits
  const dataSubreddits = [
    { name: "datascience", description: "Data science community" },
    { name: "MachineLearning", description: "Machine learning research" },
    { name: "statistics", description: "Statistical analysis" },
    { name: "analytics", description: "Data analytics" },
    { name: "Python", description: "Python programming" },
    { name: "artificial", description: "Artificial intelligence" },
    { name: "deeplearning", description: "Deep learning" },
    { name: "learnmachinelearning", description: "ML learning resources" }
  ];

  const analyzeDataScience = useMutation({
    mutationFn: async (data: { query?: string; limit?: number; subreddit?: string }) => {
      return await apiRequest("/api/search-datascience", "POST", data);
    },
    onSuccess: (data) => {
      if (data.success) {
        setAnalysisResult(data.results);
      }
    },
  });

  const handleAnalyze = () => {
    analyzeDataScience.mutate({
      query: searchQuery || undefined,
      subreddit: selectedSubreddit,
      limit: 50
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col space-y-4">
        <h1 className="text-3xl font-bold">Data Science Analyzer</h1>
        <p className="text-muted-foreground">
          Analyze authentic Reddit posts from data science communities to discover trends, skills, and industry insights
        </p>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Analyze
          </CardTitle>
          <CardDescription>
            Search for specific topics or analyze recent posts from r/datascience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Subreddit Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Subreddit:</label>
            <div className="flex flex-wrap gap-2">
              {dataSubreddits.map((sub) => (
                <Button
                  key={sub.name}
                  variant={selectedSubreddit === sub.name ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSubreddit(sub.name)}
                  className="text-xs"
                >
                  r/{sub.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Search for topics (e.g., machine learning, career advice) or leave empty for recent posts"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            />
            <Button 
              onClick={handleAnalyze} 
              disabled={analyzeDataScience.isPending}
            >
              {analyzeDataScience.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Analyze r/{selectedSubreddit}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {analyzeDataScience.error && (
        <Alert variant="destructive">
          <AlertDescription>
            Failed to analyze data science posts. Please check your connection and try again.
          </AlertDescription>
        </Alert>
      )}

      {analysisResult && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Posts Found</p>
                    <p className="text-2xl font-bold">{analysisResult.postsFound}</p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Market Demand</p>
                    <p className="text-2xl font-bold">{analysisResult.trends.marketDemand}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Data Source</p>
                    <p className="text-sm font-bold text-green-600">
                      {analysisResult.authentic ? "Authentic Reddit API" : "Cached Data"}
                    </p>
                  </div>
                  <Badge variant={analysisResult.authentic ? "default" : "secondary"}>
                    {analysisResult.source}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trends Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.trends.topSkills.map((skill, index) => (
                    <Badge key={index} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Emerging Technologies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.trends.emergingTechnologies.map((tech, index) => (
                    <Badge key={index} variant="outline">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Career Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.trends.careerTrends.map((trend, index) => (
                    <Badge key={index} variant="default">
                      {trend}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Industry Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysisResult.trends.industryInsights.map((insight, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      • {insight}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Recent Posts */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Posts from r/datascience</CardTitle>
              <CardDescription>
                {analysisResult.query !== 'recent posts' 
                  ? `Search results for "${analysisResult.query}"`
                  : "Latest posts from the data science community"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysisResult.posts.slice(0, 10).map((post) => (
                  <div key={post.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="font-medium text-sm leading-relaxed">
                        {post.title}
                      </h3>
                      <a
                        href={post.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
                      >
                        Reddit <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>u/{post.author}</span>
                      <span>{post.ups} upvotes</span>
                      <span>{post.num_comments} comments</span>
                      <span>{new Date(post.created_utc * 1000).toLocaleDateString()}</span>
                    </div>
                    
                    {post.selftext && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {post.selftext.substring(0, 200)}...
                      </p>
                    )}
                    
                    {post.url !== post.permalink && (
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        {post.domain} <ExternalLink className="h-3 w-3" />
                      </a>
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