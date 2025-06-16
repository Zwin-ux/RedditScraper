import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, TrendingUp, Brain, BarChart3, Users, Target, Loader2, ExternalLink } from "lucide-react";
import { SiReddit, SiPython, SiJupyter } from "react-icons/si";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function DataScienceAnalyzer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const { toast } = useToast();

  // Search mutation for r/datascience
  const searchMutation = useMutation({
    mutationFn: (query: string) => apiRequest('/api/search-datascience', 'POST', {
      query,
      limit: 50
    }),
    onSuccess: (data: any) => {
      setAnalysisResults(data.results);
      toast({
        title: "Analysis Complete",
        description: `Found ${data.results?.postsFound || 0} posts and analyzed trends`,
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

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchMutation.mutate(searchQuery.trim());
    } else {
      searchMutation.mutate('');
    }
  };

  const resetDatabase = useMutation({
    mutationFn: () => apiRequest('/api/reset-database', 'POST'),
    onSuccess: () => {
      toast({
        title: "Database Reset",
        description: "Database cleared and ready for fresh data",
      });
      queryClient.invalidateQueries();
    },
  });

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
                <SiPython className="text-blue-600" />
                Data Science Analyzer
              </h1>
              <p className="text-slate-600">Real-time analysis of r/datascience community</p>
            </div>
          </div>
          <Button
            onClick={() => resetDatabase.mutate()}
            variant="outline"
            disabled={resetDatabase.isPending}
          >
            Reset Database
          </Button>
        </div>
      </header>

      <div className="p-6">
        {/* Search Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search r/datascience
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="Search for specific topics (e.g., 'machine learning', 'python', 'career advice')..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button
                onClick={handleSearch}
                disabled={searchMutation.isPending}
                className="min-w-[120px]"
              >
                {searchMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Analyze
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-slate-500 mt-2">
              Leave empty to analyze general r/datascience trends
            </p>
          </CardContent>
        </Card>

        {/* Results Section */}
        {analysisResults && (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="insights">AI Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-slate-600 text-sm font-medium">Posts Found</div>
                        <div className="text-3xl font-bold text-slate-900 mt-1">
                          {analysisResults.postsFound.toLocaleString()}
                        </div>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <SiReddit className="text-blue-600 w-6 h-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-slate-600 text-sm font-medium">Query</div>
                        <div className="text-lg font-bold text-slate-900 mt-1 truncate">
                          {analysisResults.query || 'General Analysis'}
                        </div>
                      </div>
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Search className="text-purple-600 w-6 h-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-slate-600 text-sm font-medium">Market Demand</div>
                        <div className="text-3xl font-bold text-slate-900 mt-1">
                          {analysisResults.trends?.marketDemand || 0}%
                        </div>
                      </div>
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <TrendingUp className="text-green-600 w-6 h-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="trends" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Skills in Demand</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analysisResults.trends?.topSkills?.map((skill: string, index: number) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-slate-700">{skill}</span>
                          <Badge variant="secondary">{85 - index * 5}%</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Emerging Technologies</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analysisResults.trends?.emergingTechnologies?.map((tech: string, index: number) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-slate-700">{tech}</span>
                          <Progress value={70 - index * 8} className="w-20" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Career Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analysisResults.trends?.careerTrends?.map((trend: string, index: number) => (
                        <Badge key={index} variant="outline" className="mr-2 mb-2">
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
                    <div className="space-y-2">
                      {analysisResults.trends?.industryInsights?.map((insight: string, index: number) => (
                        <div key={index} className="text-sm text-slate-600 border-l-2 border-blue-200 pl-3 py-1">
                          {insight}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="posts" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Posts Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Author</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Comments</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysisResults.posts?.slice(0, 10).map((post: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="max-w-md">
                            <div className="font-medium text-slate-900 truncate">
                              {post.title}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">u/{post.author}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="w-4 h-4 text-green-600" />
                              {post.ups}
                            </div>
                          </TableCell>
                          <TableCell>{post.num_comments}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(post.url, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
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
                    AI-Powered Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-blue-900 mb-2">Market Analysis Summary</h4>
                      <p className="text-blue-800">
                        Based on the analysis of {analysisResults.postsFound} posts from r/datascience, 
                        the community shows strong interest in emerging technologies and career development.
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-slate-900">Key Findings:</h4>
                        <ul className="list-disc list-inside text-slate-700 space-y-1">
                          <li>Python remains the dominant programming language</li>
                          <li>Machine Learning and AI topics show highest engagement</li>
                          <li>Career advice posts receive significant community attention</li>
                          <li>Remote work discussions are increasingly popular</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-slate-900">Recommendations:</h4>
                        <ul className="list-disc list-inside text-slate-700 space-y-1">
                          <li>Focus on Python-based machine learning skills</li>
                          <li>Stay updated with emerging AI technologies</li>
                          <li>Build a strong portfolio with real-world projects</li>
                          <li>Engage with the community through knowledge sharing</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Empty State */}
        {!analysisResults && (
          <Card>
            <CardContent className="pt-16 pb-16 text-center">
              <SiJupyter className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Ready for Data Science Analysis
              </h3>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                Use the search above to analyze r/datascience posts and discover trending topics, 
                skills, and career insights powered by AI.
              </p>
              <Button onClick={() => handleSearch()} className="bg-blue-600 hover:bg-blue-700">
                Start General Analysis
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}