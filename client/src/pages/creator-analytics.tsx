import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Users, TrendingUp, Calendar, Award, ExternalLink, Eye, Download, Filter } from "lucide-react";
import { SiReddit } from "react-icons/si";
import { Link } from "wouter";
import { api } from "@/lib/api";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function CreatorAnalytics() {
  const [filters, setFilters] = useState({
    subreddit: 'all',
    engagementLevel: 'all',
    tag: 'all',
    sortBy: 'engagementScore'
  });
  const [selectedCreatorId, setSelectedCreatorId] = useState<number | null>(null);
  const { toast } = useToast();

  // Get creators with analytics
  const { data: creators = [], isLoading: creatorsLoading } = useQuery({
    queryKey: ['/api/creators', filters],
    queryFn: () => {
      const apiFilters = {
        ...filters,
        subreddit: filters.subreddit === 'all' ? undefined : filters.subreddit,
        engagementLevel: filters.engagementLevel === 'all' ? undefined : filters.engagementLevel,
        tag: filters.tag === 'all' ? undefined : filters.tag,
      };
      Object.keys(apiFilters).forEach(key => {
        if (apiFilters[key as keyof typeof apiFilters] === undefined) {
          delete apiFilters[key as keyof typeof apiFilters];
        }
      });
      return api.getCreators(apiFilters);
    },
  });

  // Get dashboard stats
  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: api.getDashboardStats,
  });

  // Get subreddits
  const { data: subreddits = [] } = useQuery({
    queryKey: ['/api/subreddits'],
    queryFn: api.getSubreddits,
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: (format: 'json' | 'csv') => api.exportCreators(format),
    onSuccess: (data, format) => {
      if (format === 'csv') {
        const blob = new Blob([data as string], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'creator-analytics.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
      toast({
        title: "Export Complete",
        description: `Analytics data exported as ${format.toUpperCase()}`,
      });
    },
  });

  const getEngagementColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getEngagementBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 50) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const formatKarma = (karma: number) => {
    if (karma >= 1000000) return `${(karma / 1000000).toFixed(1)}M`;
    if (karma >= 1000) return `${(karma / 1000).toFixed(1)}k`;
    return karma.toString();
  };

  const getCreatorInitials = (username: string) => {
    return username
      .split(/[_\s]+/)
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getCreatorAvatarColor = (username: string) => {
    const colors = [
      'from-blue-500 to-indigo-500',
      'from-green-500 to-teal-500', 
      'from-orange-500 to-red-500',
      'from-teal-500 to-cyan-500',
      'from-pink-500 to-rose-500',
      'from-purple-500 to-violet-500'
    ];
    return colors[username.length % colors.length];
  };

  // Calculate analytics metrics
  const analyticsMetrics = {
    totalCreators: creators.length,
    avgEngagement: creators.length > 0 ? Math.round(creators.reduce((sum, c) => sum + c.engagementScore, 0) / creators.length) : 0,
    highPerformers: creators.filter(c => c.engagementScore >= 80).length,
    topSubreddits: Object.entries(
      creators.reduce((acc, c) => {
        acc[c.subreddit] = (acc[c.subreddit] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).sort(([,a], [,b]) => b - a).slice(0, 5),
    tagDistribution: Object.entries(
      creators.reduce((acc, c) => {
        c.tags?.forEach(tag => {
          acc[tag] = (acc[tag] || 0) + 1;
        });
        return acc;
      }, {} as Record<string, number>)
    ).sort(([,a], [,b]) => b - a).slice(0, 8)
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
                <BarChart3 className="text-blue-600" />
                Creator Analytics
              </h1>
              <p className="text-slate-600">Advanced metrics and performance analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => exportMutation.mutate('csv')}
              disabled={exportMutation.isPending}
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/creators'] });
                queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
              }}
              variant="outline"
            >
              Refresh Data
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Analytics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-slate-600 text-sm font-medium">Total Creators</div>
                  <div className="text-3xl font-bold text-slate-900 mt-1">
                    {analyticsMetrics.totalCreators.toLocaleString()}
                  </div>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="text-blue-600 w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-slate-600 text-sm font-medium">Avg Engagement</div>
                  <div className="text-3xl font-bold text-slate-900 mt-1">
                    {analyticsMetrics.avgEngagement}
                  </div>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="text-green-600 w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-slate-600 text-sm font-medium">High Performers</div>
                  <div className="text-3xl font-bold text-slate-900 mt-1">
                    {analyticsMetrics.highPerformers}
                  </div>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Award className="text-purple-600 w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-slate-600 text-sm font-medium">Performance Rate</div>
                  <div className="text-3xl font-bold text-slate-900 mt-1">
                    {creators.length > 0 ? Math.round((analyticsMetrics.highPerformers / creators.length) * 100) : 0}%
                  </div>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="text-orange-600 w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="creators" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="creators">Creators</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="creators" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Analytics Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Subreddit</label>
                    <Select value={filters.subreddit} onValueChange={(value) => setFilters({...filters, subreddit: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subreddits</SelectItem>
                        {subreddits.map((sub) => (
                          <SelectItem key={sub.id} value={sub.name}>r/{sub.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Engagement Level</label>
                    <Select value={filters.engagementLevel} onValueChange={(value) => setFilters({...filters, engagementLevel: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Levels</SelectItem>
                        <SelectItem value="high">High (80+)</SelectItem>
                        <SelectItem value="medium">Medium (50-79)</SelectItem>
                        <SelectItem value="low">Low (under 50)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Tag Filter</label>
                    <Select value={filters.tag} onValueChange={(value) => setFilters({...filters, tag: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tags</SelectItem>
                        {analyticsMetrics.tagDistribution.map(([tag]) => (
                          <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Sort By</label>
                    <Select value={filters.sortBy} onValueChange={(value) => setFilters({...filters, sortBy: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="engagementScore">Engagement Score</SelectItem>
                        <SelectItem value="karma">Karma</SelectItem>
                        <SelectItem value="lastActive">Last Active</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Creators Table */}
            <Card>
              <CardHeader>
                <CardTitle>Creator Performance Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Creator</TableHead>
                      <TableHead>Engagement Score</TableHead>
                      <TableHead>Karma</TableHead>
                      <TableHead>Subreddit</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creators.slice(0, 20).map((creator) => (
                      <TableRow key={creator.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 bg-gradient-to-br ${getCreatorAvatarColor(creator.username)} rounded-full flex items-center justify-center text-white text-sm font-bold`}>
                              {getCreatorInitials(creator.username)}
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">u/{creator.username}</div>
                              <div className="text-sm text-slate-500">ID: {creator.id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={creator.engagementScore} className="w-16" />
                            <Badge className={getEngagementBadgeColor(creator.engagementScore)}>
                              {creator.engagementScore}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{formatKarma(creator.karma)}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">r/{creator.subreddit}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {creator.tags?.slice(0, 2).map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {creator.tags && creator.tags.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{creator.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {creator.lastActive ? new Date(creator.lastActive).toLocaleDateString() : 'Unknown'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(creator.profileLink, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Engagement Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { range: '90-100', label: 'Exceptional', count: creators.filter(c => c.engagementScore >= 90).length, color: 'bg-emerald-500' },
                      { range: '80-89', label: 'Excellent', count: creators.filter(c => c.engagementScore >= 80 && c.engagementScore < 90).length, color: 'bg-green-500' },
                      { range: '70-79', label: 'Very Good', count: creators.filter(c => c.engagementScore >= 70 && c.engagementScore < 80).length, color: 'bg-yellow-500' },
                      { range: '60-69', label: 'Good', count: creators.filter(c => c.engagementScore >= 60 && c.engagementScore < 70).length, color: 'bg-orange-500' },
                      { range: '0-59', label: 'Needs Improvement', count: creators.filter(c => c.engagementScore < 60).length, color: 'bg-red-500' }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded ${item.color}`}></div>
                          <div>
                            <span className="font-medium">{item.label}</span>
                            <span className="text-slate-500 text-sm ml-2">({item.range})</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={(item.count / creators.length) * 100} className="w-20" />
                          <span className="text-sm font-medium w-8">{item.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Subreddits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analyticsMetrics.topSubreddits.map(([subreddit, count], index) => (
                      <div key={subreddit} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <SiReddit className="w-4 h-4 text-orange-500" />
                          <span className="font-medium">r/{subreddit}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={(count / creators.length) * 100} className="w-20" />
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="distribution" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tag Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analyticsMetrics.tagDistribution.map(([tag, count], index) => (
                      <div key={tag} className="flex items-center justify-between">
                        <Badge variant="secondary">{tag}</Badge>
                        <div className="flex items-center gap-2">
                          <Progress value={(count / creators.length) * 100} className="w-20" />
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Karma Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { range: '100k+', count: creators.filter(c => c.karma >= 100000).length },
                      { range: '50k-99k', count: creators.filter(c => c.karma >= 50000 && c.karma < 100000).length },
                      { range: '10k-49k', count: creators.filter(c => c.karma >= 10000 && c.karma < 50000).length },
                      { range: '1k-9k', count: creators.filter(c => c.karma >= 1000 && c.karma < 10000).length },
                      { range: '<1k', count: creators.filter(c => c.karma < 1000).length }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="font-medium">{item.range}</span>
                        <div className="flex items-center gap-2">
                          <Progress value={creators.length > 0 ? (item.count / creators.length) * 100 : 0} className="w-20" />
                          <span className="text-sm font-medium w-8">{item.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Analytics Summary</h4>
                    <p className="text-blue-800">
                      Analysis of {creators.length} creators shows an average engagement score of {analyticsMetrics.avgEngagement}, 
                      with {analyticsMetrics.highPerformers} high-performing creators (80+ score).
                    </p>
                  </div>
                  
                  <div className="mt-6 space-y-4">
                    <div>
                      <h4 className="font-semibold text-slate-900">Performance Insights:</h4>
                      <ul className="list-disc list-inside text-slate-700 space-y-1">
                        <li>Top {Math.round((analyticsMetrics.highPerformers / creators.length) * 100)}% of creators maintain high engagement</li>
                        <li>Most active communities: {analyticsMetrics.topSubreddits.slice(0, 3).map(([name]) => `r/${name}`).join(', ')}</li>
                        <li>Common specializations: {analyticsMetrics.tagDistribution.slice(0, 3).map(([tag]) => tag).join(', ')}</li>
                        <li>Average creator karma: {formatKarma(Math.round(creators.reduce((sum, c) => sum + c.karma, 0) / creators.length))}</li>
                      </ul>
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