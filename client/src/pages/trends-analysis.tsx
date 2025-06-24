import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Search, BarChart3, Target } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";

interface TrendAnalysisResult {
  success: boolean;
  creators: Array<{
    username: string;
    totalKarma: number;
    linkKarma: number;
    commentKarma: number;
    accountAge: number;
    profileUrl: string;
    score: number;
    engagementRatio: number;
    activityLevel: 'high' | 'medium' | 'low';
    specializations: string[];
    recentPostsCount: number;
    averageUpvotes: number;
  }>;
  totalFound: number;
  domain: string;
  searchedSubreddits: string[];
  searchedKeywords: string[];
  message: string;
}

export default function TrendsAnalysis() {
  const [selectedDomain, setSelectedDomain] = useState("ai-tools");
  const [analysisResult, setAnalysisResult] = useState<TrendAnalysisResult | null>(null);

  const analyzeEnhancedTrends = useMutation({
    mutationFn: async (data: { domain: string }) => {
      return await apiRequest("/api/enhanced-reddit-search", "POST", data);
    },
    onSuccess: (data) => {
      if (data.success) {
        setAnalysisResult(data);
      }
    },
  });

  const handleAnalyze = (domain: string) => {
    setSelectedDomain(domain);
    analyzeEnhancedTrends.mutate({ domain });
  };

  const getDomainDescription = (domain: string) => {
    switch (domain) {
      case 'ai-research':
        return 'Machine learning researchers, paper authors, and academic contributors';
      case 'data-science':
        return 'Data scientists, analysts, and visualization experts';
      default:
        return 'AI tool creators, API developers, and ChatGPT enthusiasts';
    }
  };

  const getDomainColor = (domain: string) => {
    switch (domain) {
      case 'ai-research':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'data-science':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-purple-100 text-purple-800 border-purple-200';
    }
  };

  const getActivityLevelColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-green-600';
      case 'medium':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col space-y-4">
        <h1 className="text-3xl font-bold">Trends Analysis</h1>
        <p className="text-muted-foreground">
          Discover trending creators and emerging patterns across different AI and data science domains
        </p>
      </div>

      {/* Domain Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Select Analysis Domain
          </CardTitle>
          <CardDescription>
            Choose a domain to analyze trending creators and emerging patterns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant={selectedDomain === 'ai-tools' ? 'default' : 'outline'}
              onClick={() => handleAnalyze('ai-tools')}
              disabled={analyzeEnhancedTrends.isPending}
              className="h-auto p-4 flex flex-col items-start space-y-2"
            >
              <div className="font-medium">AI Tools & APIs</div>
              <div className="text-sm text-left opacity-80">
                ChatGPT, LocalLLaMA, OpenAI, and tool creators
              </div>
            </Button>

            <Button
              variant={selectedDomain === 'ai-research' ? 'default' : 'outline'}
              onClick={() => handleAnalyze('ai-research')}
              disabled={analyzeEnhancedTrends.isPending}
              className="h-auto p-4 flex flex-col items-start space-y-2"
            >
              <div className="font-medium">AI Research</div>
              <div className="text-sm text-left opacity-80">
                Machine learning, deep learning, and academic research
              </div>
            </Button>

            <Button
              variant={selectedDomain === 'data-science' ? 'default' : 'outline'}
              onClick={() => handleAnalyze('data-science')}
              disabled={analyzeEnhancedTrends.isPending}
              className="h-auto p-4 flex flex-col items-start space-y-2"
            >
              <div className="font-medium">Data Science</div>
              <div className="text-sm text-left opacity-80">
                Analytics, statistics, and data visualization
              </div>
            </Button>
          </div>

          {analyzeEnhancedTrends.isPending && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Analyzing {selectedDomain} trends...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Handling */}
      {analyzeEnhancedTrends.error && (
        <Alert variant="destructive">
          <AlertDescription>
            Trends analysis failed. Please try again or check your connection.
          </AlertDescription>
        </Alert>
      )}

      {/* Results Section */}
      {analysisResult && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-2xl font-bold">{analysisResult.totalFound}</p>
                  <p className="text-sm text-muted-foreground">Creators Found</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-2xl font-bold">{analysisResult.searchedSubreddits.length}</p>
                  <p className="text-sm text-muted-foreground">Subreddits Analyzed</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {analysisResult.creators.filter(c => c.activityLevel === 'high').length}
                  </p>
                  <p className="text-sm text-muted-foreground">High Activity</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getDomainColor(analysisResult.domain)}`}>
                    {analysisResult.domain}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Domain Focus</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Domain Info */}
          <Card>
            <CardHeader>
              <CardTitle>{analysisResult.domain.charAt(0).toUpperCase() + analysisResult.domain.slice(1)} Domain Analysis</CardTitle>
              <CardDescription>
                {getDomainDescription(analysisResult.domain)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Analyzed Subreddits:</h4>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.searchedSubreddits.map((subreddit, index) => (
                    <Badge key={index} variant="outline">
                      r/{subreddit}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Search Keywords:</h4>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.searchedKeywords.map((keyword, index) => (
                    <Badge key={index} variant="secondary">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Creators */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Top Trending Creators
              </CardTitle>
              <CardDescription>
                Leading creators in the {analysisResult.domain} domain, ranked by engagement and activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysisResult.creators.slice(0, 15).map((creator, index) => (
                  <div key={creator.username} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                          <h3 className="font-medium">u/{creator.username}</h3>
                          <Badge 
                            variant={creator.activityLevel === 'high' ? 'default' : 
                                   creator.activityLevel === 'medium' ? 'secondary' : 'outline'}
                            className="text-xs"
                          >
                            {creator.activityLevel} activity
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {creator.totalKarma.toLocaleString()} total karma • {creator.accountAge} days old
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{creator.score}</div>
                        <div className="text-xs text-muted-foreground">engagement score</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="font-medium">{creator.linkKarma.toLocaleString()}</div>
                        <div className="text-muted-foreground">Link Karma</div>
                      </div>
                      <div>
                        <div className="font-medium">{creator.commentKarma.toLocaleString()}</div>
                        <div className="text-muted-foreground">Comment Karma</div>
                      </div>
                      <div>
                        <div className="font-medium">{creator.recentPostsCount}</div>
                        <div className="text-muted-foreground">Recent Posts</div>
                      </div>
                      <div>
                        <div className="font-medium">{creator.averageUpvotes}</div>
                        <div className="text-muted-foreground">Avg Upvotes</div>
                      </div>
                    </div>

                    {creator.specializations.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {creator.specializations.slice(0, 6).map((spec, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {spec}
                          </Badge>
                        ))}
                        {creator.specializations.length > 6 && (
                          <Badge variant="outline" className="text-xs">
                            +{creator.specializations.length - 6} more
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        Engagement ratio: {(creator.engagementRatio * 100).toFixed(1)}%
                      </div>
                      <a
                        href={creator.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        View Profile
                      </a>
                    </div>
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