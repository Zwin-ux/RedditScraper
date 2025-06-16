import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, BarChart3, Brain, Calendar, Target, Loader2, RefreshCw } from "lucide-react";
import { SiReddit } from "react-icons/si";
import { Link } from "wouter";
import { api } from "@/lib/api";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function TrendsAnalysis() {
  const [subredditInput, setSubredditInput] = useState('');
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const { toast } = useToast();

  // Get dashboard stats for baseline
  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: api.getDashboardStats,
  });

  // Get creators for trend analysis
  const { data: creators = [] } = useQuery({
    queryKey: ['/api/creators'],
    queryFn: () => api.getCreators({}),
  });

  // Analyze subreddit mutation
  const analyzeMutation = useMutation({
    mutationFn: (subreddit: string) => apiRequest('/api/analyze-subreddit', 'POST', { subreddit }),
    onSuccess: (data) => {
      setAnalysisResults(data);
      toast({
        title: "Analysis Complete",
        description: `Analyzed r/${subredditInput} with AI insights`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = () => {
    const subreddit = subredditInput.replace(/^r\//, '').trim();
    if (subreddit) {
      analyzeMutation.mutate(subreddit);
    }
  };

  // Calculate trending metrics from existing data
  const trendingMetrics = {
    topTags: Object.entries(
      creators.reduce((acc, c) => {
        c.tags?.forEach(tag => {
          acc[tag] = (acc[tag] || 0) + 1;
        });
        return acc;
      }, {} as Record<string, number>)
    ).sort(([,a], [,b]) => b - a).slice(0, 10),
    
    subredditGrowth: Object.entries(
      creators.reduce((acc, c) => {
        acc[c.subreddit] = (acc[c.subreddit] || 0) + c.engagementScore;
        return acc;
      }, {} as Record<string, number>)
    ).sort(([,a], [,b]) => b - a).slice(0, 8),
    
    engagementTrends: creators.length > 0 ? {
      avgScore: Math.round(creators.reduce((sum, c) => sum + c.engagementScore, 0) / creators.length),
      highPerformers: creators.filter(c => c.engagementScore >= 80).length,
      risingStars: creators.filter(c => c.engagementScore >= 70 && c.engagementScore < 80).length,
      totalKarma: creators.reduce((sum, c) => sum + c.karma, 0)
    } : { avgScore: 0, highPerformers: 0, risingStars: 0, totalKarma: 0 }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" size="sm">← Dashboard</Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="text-green-600" />
                Trends Analysis
              </h1>
              <p className="text-slate-600">Community trends and AI-powered insights</p>
            </div>
          </div>
          <Button
            onClick={() => {
              queryClient.invalidateQueries();
              toast({ title: "Data refreshed successfully" });
            }}
            variant="outline"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </header>

      <div className="p-6">
        {/* Quick Analysis Tool */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              AI Subreddit Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="Enter subreddit name (e.g., MachineLearning, datascience, artificial)"
                value={subredditInput}
                onChange={(e) => setSubredditInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
                className="flex-1"
              />
              <Button
                onClick={handleAnalyze}
                disabled={analyzeMutation.isPending || !subredditInput.trim()}
                className="min-w-[120px]"
              >
                {analyzeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing
                  </>
                ) : (
                  <>
                    <Target className="w-4 h-4 mr-2" />
                    Analyze
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tags">Tag Trends</TabsTrigger>
            <TabsTrigger value="communities">Communities</TabsTrigger>
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-slate-600 text-sm font-medium">Avg Engagement</div>
                      <div className="text-3xl font-bold text-slate-900 mt-1">
                        {trendingMetrics.engagementTrends.avgScore}
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="text-green-600 w-6 h-6" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <span className="text-green-600 font-medium">↗ Trending</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-slate-600 text-sm font-medium">High Performers</div>
                      <div className="text-3xl font-bold text-slate-900 mt-1">
                        {trendingMetrics.engagementTrends.highPerformers}
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <BarChart3 className="text-purple-600 w-6 h-6" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <span className="text-purple-600 font-medium">Active creators</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-slate-600 text-sm font-medium">Rising Stars</div>
                      <div className="text-3xl font-bold text-slate-900 mt-1">
                        {trendingMetrics.engagementTrends.risingStars}
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="text-yellow-600 w-6 h-6" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <span className="text-yellow-600 font-medium">Emerging talent</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-slate-600 text-sm font-medium">Total Karma</div>
                      <div className="text-3xl font-bold text-slate-900 mt-1">
                        {(trendingMetrics.engagementTrends.totalKarma / 1000000).toFixed(1)}M
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <SiReddit className="text-blue-600 w-6 h-6" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <span className="text-blue-600 font-medium">Community reach</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Analysis Results */}
            {analysisResults && (
              <Card>
                <CardHeader>
                  <CardTitle>Latest Analysis: r/{analysisResults.data?.subreddit || 'Unknown'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">Posts Analyzed</h4>
                      <div className="text-2xl font-bold text-blue-800">
                        {analysisResults.data?.postsAnalyzed || 0}
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="font-semibold text-green-900 mb-2">Creators Found</h4>
                      <div className="text-2xl font-bold text-green-800">
                        {analysisResults.data?.creatorsFound || 0}
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <h4 className="font-semibold text-purple-900 mb-2">AI Categories</h4>
                      <div className="text-2xl font-bold text-purple-800">
                        {analysisResults.data?.categories?.length || 0}
                      </div>
                    </div>
                  </div>
                  
                  {analysisResults.data?.topCreators && (
                    <div className="mt-6">
                      <h4 className="font-semibold text-slate-900 mb-3">Top Creators from Analysis</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {analysisResults.data.topCreators.slice(0, 6).map((creator: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div>
                              <div className="font-medium">u/{creator.username}</div>
                              <div className="text-sm text-slate-500">{creator.posts} posts • {creator.karma} karma</div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {creator.specialties?.slice(0, 2).map((spec: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {spec}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="tags" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Trending Tags & Specializations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-4">Most Popular Tags</h4>
                    <div className="space-y-3">
                      {trendingMetrics.topTags.map(([tag, count], index) => (
                        <div key={tag} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded text-white text-xs flex items-center justify-center font-bold">
                              {index + 1}
                            </div>
                            <Badge variant="secondary">{tag}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={(count / creators.length) * 100} className="w-20" />
                            <span className="text-sm font-medium w-8">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-4">Tag Distribution</h4>
                    <div className="space-y-4">
                      {[
                        { category: 'AI/ML', tags: trendingMetrics.topTags.filter(([tag]) => tag.toLowerCase().includes('ai') || tag.toLowerCase().includes('ml') || tag.toLowerCase().includes('machine')).length },
                        { category: 'Programming', tags: trendingMetrics.topTags.filter(([tag]) => tag.toLowerCase().includes('python') || tag.toLowerCase().includes('code') || tag.toLowerCase().includes('dev')).length },
                        { category: 'Data Science', tags: trendingMetrics.topTags.filter(([tag]) => tag.toLowerCase().includes('data') || tag.toLowerCase().includes('analytics')).length },
                        { category: 'Research', tags: trendingMetrics.topTags.filter(([tag]) => tag.toLowerCase().includes('research') || tag.toLowerCase().includes('academic')).length }
                      ].map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="font-medium">{item.category}</span>
                          <div className="flex items-center gap-2">
                            <Progress value={(item.tags / trendingMetrics.topTags.length) * 100} className="w-20" />
                            <span className="text-sm font-medium">{item.tags}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="communities" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Community Performance Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subreddit</TableHead>
                      <TableHead>Total Engagement</TableHead>
                      <TableHead>Creator Count</TableHead>
                      <TableHead>Avg Score</TableHead>
                      <TableHead>Trend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trendingMetrics.subredditGrowth.map(([subreddit, totalEngagement], index) => {
                      const creatorCount = creators.filter(c => c.subreddit === subreddit).length;
                      const avgScore = creatorCount > 0 ? Math.round(totalEngagement / creatorCount) : 0;
                      return (
                        <TableRow key={subreddit}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <SiReddit className="w-4 h-4 text-orange-500" />
                              <span className="font-medium">r/{subreddit}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{Math.round(totalEngagement).toLocaleString()}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{creatorCount}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={avgScore} className="w-16" />
                              <span className="text-sm font-medium">{avgScore}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={index < 3 ? "default" : "secondary"} className="text-xs">
                              {index < 3 ? "Hot" : "Stable"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  AI-Powered Trend Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
                    <h4 className="font-semibold text-slate-900 mb-4">Current Trend Analysis</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h5 className="font-medium text-slate-800 mb-2">Key Findings:</h5>
                        <ul className="text-sm text-slate-700 space-y-1">
                          <li>• {trendingMetrics.topTags[0]?.[0] || 'AI General'} is the most dominant specialization</li>
                          <li>• {Math.round((trendingMetrics.engagementTrends.highPerformers / creators.length) * 100)}% of creators maintain high engagement</li>
                          <li>• Top performing community: r/{trendingMetrics.subredditGrowth[0]?.[0] || 'Unknown'}</li>
                          <li>• {trendingMetrics.engagementTrends.risingStars} emerging creators showing potential</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-slate-800 mb-2">Strategic Recommendations:</h5>
                        <ul className="text-sm text-slate-700 space-y-1">
                          <li>• Focus on {trendingMetrics.topTags.slice(0, 3).map(([tag]) => tag).join(', ')} specializations</li>
                          <li>• Engage with communities showing consistent growth</li>
                          <li>• Monitor rising stars for partnership opportunities</li>
                          <li>• Leverage AI analysis for deeper insights</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 space-y-4">
                    <div>
                      <h4 className="font-semibold text-slate-900">Market Insights:</h4>
                      <p className="text-slate-700">
                        The Reddit AI community shows strong engagement patterns with {creators.length} active creators 
                        maintaining an average engagement score of {trendingMetrics.engagementTrends.avgScore}. 
                        Communities like r/{trendingMetrics.subredditGrowth[0]?.[0]} lead in terms of creator quality and engagement.
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-slate-900">Future Opportunities:</h4>
                      <p className="text-slate-700">
                        With {trendingMetrics.engagementTrends.risingStars} rising creators and emerging specializations 
                        in {trendingMetrics.topTags.slice(0, 2).map(([tag]) => tag).join(' and ')}, 
                        there are significant opportunities for strategic partnerships and community building.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}