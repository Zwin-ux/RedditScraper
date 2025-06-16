import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Brain, Users, TrendingUp, Star, Loader2, ExternalLink, Target } from "lucide-react";
import { SiReddit } from "react-icons/si";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function EnhancedSearch() {
  const [domain, setDomain] = useState('ai-tools');
  const [searchResults, setSearchResults] = useState<any>(null);
  const { toast } = useToast();

  const enhancedSearchMutation = useMutation({
    mutationFn: (searchDomain: string) => apiRequest('/api/enhanced-reddit-search', 'POST', {
      domain: searchDomain
    }),
    onSuccess: (data: any) => {
      setSearchResults(data);
      toast({
        title: "Enhanced Search Complete",
        description: `Found ${data.creators?.length || 0} qualified creators`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Search Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    enhancedSearchMutation.mutate(domain);
  };

  const getActivityColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      default: return 'text-red-600';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
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
                <Brain className="text-purple-600" />
                Enhanced Reddit Search
              </h1>
              <p className="text-slate-600">AI-powered creator discovery across specialized domains</p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Search Configuration */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Domain-Specific Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Select Research Domain
                </label>
                <Select value={domain} onValueChange={setDomain}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ai-tools">AI Tools & Applications</SelectItem>
                    <SelectItem value="ai-research">AI Research & Academia</SelectItem>
                    <SelectItem value="data-science">Data Science & Analytics</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleSearch}
                disabled={enhancedSearchMutation.isPending}
                className="min-w-[140px] bg-purple-600 hover:bg-purple-700"
              >
                {enhancedSearchMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Searching
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Search Domain
                  </>
                )}
              </Button>
            </div>
            
            <div className="mt-4 p-4 bg-slate-50 rounded-lg">
              <h4 className="font-medium text-slate-900 mb-2">Domain Configuration:</h4>
              <div className="text-sm text-slate-600 space-y-1">
                {domain === 'ai-tools' && (
                  <>
                    <div><strong>Subreddits:</strong> ChatGPT, LocalLLaMA, OpenAI, ArtificialIntelligence</div>
                    <div><strong>Keywords:</strong> tool, API, GPT, LLM, chatbot, agent</div>
                    <div><strong>Min Karma:</strong> 300 | <strong>Post Limit:</strong> 30</div>
                  </>
                )}
                {domain === 'ai-research' && (
                  <>
                    <div><strong>Subreddits:</strong> MachineLearning, artificial, deeplearning, reinforcementlearning</div>
                    <div><strong>Keywords:</strong> research, paper, model, algorithm, neural network</div>
                    <div><strong>Min Karma:</strong> 500 | <strong>Post Limit:</strong> 25</div>
                  </>
                )}
                {domain === 'data-science' && (
                  <>
                    <div><strong>Subreddits:</strong> datascience, statistics, analytics, visualization</div>
                    <div><strong>Keywords:</strong> analysis, dataset, python, visualization, machine learning</div>
                    <div><strong>Min Karma:</strong> 400 | <strong>Post Limit:</strong> 20</div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {searchResults && (
          <Tabs defaultValue="creators" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="creators">Creators</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="creators" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-slate-600 text-sm font-medium">Total Found</div>
                        <div className="text-3xl font-bold text-slate-900 mt-1">
                          {searchResults.creators?.length || 0}
                        </div>
                      </div>
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Users className="text-purple-600 w-6 h-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-slate-600 text-sm font-medium">High Quality</div>
                        <div className="text-3xl font-bold text-slate-900 mt-1">
                          {searchResults.creators?.filter((c: any) => c.score >= 80).length || 0}
                        </div>
                      </div>
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <Star className="text-green-600 w-6 h-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-slate-600 text-sm font-medium">Avg Score</div>
                        <div className="text-3xl font-bold text-slate-900 mt-1">
                          {searchResults.creators?.length > 0 
                            ? Math.round(searchResults.creators.reduce((sum: number, c: any) => sum + c.score, 0) / searchResults.creators.length)
                            : 0
                          }
                        </div>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <TrendingUp className="text-blue-600 w-6 h-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Discovered Creators</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Creator</TableHead>
                        <TableHead>Karma</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Activity</TableHead>
                        <TableHead>Specializations</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchResults.creators?.map((creator: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                {creator.username.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-slate-900">u/{creator.username}</div>
                                <div className="text-sm text-slate-500">{creator.accountAge} days old</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{creator.totalKarma.toLocaleString()}</div>
                              <div className="text-sm text-slate-500">
                                L: {creator.linkKarma} | C: {creator.commentKarma}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={creator.score} className="w-16" />
                              <span className={`font-medium ${getScoreColor(creator.score)}`}>
                                {creator.score}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getActivityColor(creator.activityLevel)}>
                              {creator.activityLevel}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {creator.specializations?.slice(0, 2).map((spec: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {spec}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(creator.profileUrl, '_blank')}
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

            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Score Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { range: '80-100', label: 'Excellent', count: searchResults.creators?.filter((c: any) => c.score >= 80).length || 0 },
                        { range: '60-79', label: 'Good', count: searchResults.creators?.filter((c: any) => c.score >= 60 && c.score < 80).length || 0 },
                        { range: '40-59', label: 'Average', count: searchResults.creators?.filter((c: any) => c.score >= 40 && c.score < 60).length || 0 },
                        { range: '0-39', label: 'Below Average', count: searchResults.creators?.filter((c: any) => c.score < 40).length || 0 }
                      ].map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{item.label}</span>
                            <span className="text-slate-500 text-sm ml-2">({item.range})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={(item.count / (searchResults.creators?.length || 1)) * 100} className="w-20" />
                            <span className="text-sm font-medium w-8">{item.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Activity Levels</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {['high', 'medium', 'low'].map((level) => {
                        const count = searchResults.creators?.filter((c: any) => c.activityLevel === level).length || 0;
                        return (
                          <div key={level} className="flex items-center justify-between">
                            <span className={`font-medium capitalize ${getActivityColor(level)}`}>
                              {level} Activity
                            </span>
                            <div className="flex items-center gap-2">
                              <Progress value={(count / (searchResults.creators?.length || 1)) * 100} className="w-20" />
                              <span className="text-sm font-medium w-8">{count}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="insights" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Domain Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <h4 className="font-semibold text-purple-900 mb-2">Search Summary</h4>
                      <p className="text-purple-800">
                        Enhanced search of {domain.replace('-', ' ')} domain identified {searchResults.creators?.length || 0} qualified creators 
                        using AI-powered filtering and scoring algorithms.
                      </p>
                    </div>
                    
                    <div className="mt-6 space-y-4">
                      <div>
                        <h4 className="font-semibold text-slate-900">Quality Metrics:</h4>
                        <ul className="list-disc list-inside text-slate-700 space-y-1">
                          <li>Minimum karma requirements enforced</li>
                          <li>Account age and activity patterns analyzed</li>
                          <li>Specialization tags extracted using AI</li>
                          <li>Engagement ratios calculated from posting history</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-slate-900">Recommendations:</h4>
                        <ul className="list-disc list-inside text-slate-700 space-y-1">
                          <li>Focus on creators with scores above 80 for partnerships</li>
                          <li>Consider medium-activity creators for consistent engagement</li>
                          <li>Review specialization tags for domain expertise</li>
                          <li>Monitor account age for established community presence</li>
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
        {!searchResults && (
          <Card>
            <CardContent className="pt-16 pb-16 text-center">
              <Brain className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Advanced Creator Discovery
              </h3>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                Use AI-powered enhanced search to find qualified creators across specialized domains 
                with advanced filtering and scoring.
              </p>
              <Button onClick={handleSearch} className="bg-purple-600 hover:bg-purple-700">
                Start Enhanced Search
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}