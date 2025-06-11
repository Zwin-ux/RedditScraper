import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, TrendingUp, Radio, BarChart3, Search, RefreshCw, Download, Eye, ExternalLink } from "lucide-react";
import { SiReddit } from "react-icons/si";
import { CreatorModal } from "@/components/creator-modal";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Creator } from "@shared/schema";

export default function Dashboard() {
  const [selectedCreatorId, setSelectedCreatorId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    subreddit: 'all',
    tag: 'all',
    engagementLevel: 'all',
    search: '',
  });
  
  const { toast } = useToast();

  // Queries
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: api.getDashboardStats,
  });

  const { data: creators = [], isLoading: creatorsLoading } = useQuery({
    queryKey: ['/api/creators', filters],
    queryFn: () => {
      const apiFilters = {
        ...filters,
        subreddit: filters.subreddit === 'all' ? undefined : filters.subreddit,
        tag: filters.tag === 'all' ? undefined : filters.tag,
        engagementLevel: filters.engagementLevel === 'all' ? undefined : filters.engagementLevel,
        search: filters.search || undefined,
      };
      // Remove undefined values
      Object.keys(apiFilters).forEach(key => {
        if (apiFilters[key] === undefined) {
          delete apiFilters[key];
        }
      });
      return api.getCreators(apiFilters);
    },
  });

  const { data: subreddits = [] } = useQuery({
    queryKey: ['/api/subreddits'],
    queryFn: api.getSubreddits,
  });

  // Mutations
  const crawlMutation = useMutation({
    mutationFn: (data: { all?: boolean; subreddit?: string }) => api.startCrawl(data),
    onSuccess: () => {
      toast({
        title: "Crawl Started",
        description: "Reddit crawling process has been initiated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/creators'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Crawl Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const exportMutation = useMutation({
    mutationFn: (format: 'json' | 'csv') => api.exportCreators(format),
    onSuccess: (data, format) => {
      if (format === 'csv') {
        // Download CSV file
        const blob = new Blob([data as string], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'reddit-creators.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
      toast({
        title: "Export Complete",
        description: `Creator data exported successfully as ${format.toUpperCase()}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleViewCreator = (creator: Creator) => {
    setSelectedCreatorId(creator.id);
    setModalOpen(true);
  };

  const getEngagementColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getEngagementBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatKarma = (karma: number) => {
    if (karma >= 1000) {
      return `${(karma / 1000).toFixed(1)}k`;
    }
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

  const getSubredditBadgeColor = (subreddit: string) => {
    const colorMap: { [key: string]: string } = {
      'MachineLearning': 'bg-red-100 text-red-800',
      'ArtificialIntelligence': 'bg-blue-100 text-blue-800',
      'LocalLLMs': 'bg-indigo-100 text-indigo-800',
      'PromptEngineering': 'bg-purple-100 text-purple-800',
      'AutoGPT': 'bg-rose-100 text-rose-800',
      'ChatGPT': 'bg-green-100 text-green-800',
    };
    return colorMap[subreddit] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg border-r border-slate-200 flex flex-col">
        {/* Logo and Title */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
              <SiReddit className="text-white text-xl" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Reddit Agent</h1>
              <p className="text-sm text-slate-500">Creator Discovery</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          <div className="flex items-center space-x-3 px-3 py-2 bg-blue-600 text-white rounded-lg font-medium">
            <BarChart3 className="w-4 h-4" />
            <span>Dashboard</span>
          </div>
          <button className="flex items-center space-x-3 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors w-full text-left">
            <Users className="w-4 h-4" />
            <span>Creators</span>
          </button>
          <button className="flex items-center space-x-3 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors w-full text-left">
            <Radio className="w-4 h-4" />
            <span>Subreddits</span>
          </button>
          <button 
            onClick={() => exportMutation.mutate('csv')}
            className="flex items-center space-x-3 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors w-full text-left"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </nav>

        {/* Status Panel */}
        <div className="p-4 border-t border-slate-200">
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Last Crawl</span>
              <span className="text-sm text-slate-500">2 hours ago</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-slate-600">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Creator Dashboard</h2>
              <p className="text-slate-600">Monitor and manage AI creators from Reddit</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Search Bar */}
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search creators..."
                  className="w-64 pl-10"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              </div>
              
              <Button 
                onClick={() => crawlMutation.mutate({ all: true })}
                disabled={crawlMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${crawlMutation.isPending ? 'animate-spin' : ''}`} />
                Refresh Data
              </Button>
              
              <Button 
                onClick={() => exportMutation.mutate('csv')}
                variant="outline"
                className="bg-green-600 text-white hover:bg-green-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </header>

        <div className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-sm font-medium">Total Creators</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">
                      {statsLoading ? (
                        <div className="h-8 w-16 bg-slate-200 animate-pulse rounded"></div>
                      ) : (
                        stats?.totalCreators.toLocaleString() || '0'
                      )}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="text-blue-600 w-6 h-6" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <span className="text-green-600 font-medium">+12.5%</span>
                  <span className="text-slate-500 ml-1">from last week</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-sm font-medium">High Engagement</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">
                      {statsLoading ? (
                        <div className="h-8 w-16 bg-slate-200 animate-pulse rounded"></div>
                      ) : (
                        stats?.highEngagement.toLocaleString() || '0'
                      )}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="text-green-600 w-6 h-6" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <span className="text-green-600 font-medium">+8.2%</span>
                  <span className="text-slate-500 ml-1">from last week</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-sm font-medium">Active Subreddits</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">
                      {statsLoading ? (
                        <div className="h-8 w-16 bg-slate-200 animate-pulse rounded"></div>
                      ) : (
                        stats?.activeSubreddits || '0'
                      )}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <SiReddit className="text-orange-500 w-6 h-6" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <span className="text-orange-600 font-medium">2 new</span>
                  <span className="text-slate-500 ml-1">this week</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-sm font-medium">Posts Analyzed</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">
                      {statsLoading ? (
                        <div className="h-8 w-16 bg-slate-200 animate-pulse rounded"></div>
                      ) : (
                        stats?.postsAnalyzed.toLocaleString() || '0'
                      )}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="text-purple-600 w-6 h-6" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <span className="text-purple-600 font-medium">+156</span>
                  <span className="text-slate-500 ml-1">today</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-slate-700">Subreddit:</label>
                  <Select value={filters.subreddit} onValueChange={(value) => setFilters(prev => ({ ...prev, subreddit: value }))}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All Subreddits" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subreddits</SelectItem>
                      {subreddits.map((sub) => (
                        <SelectItem key={sub.id} value={sub.name}>r/{sub.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-slate-700">Tag:</label>
                  <Select value={filters.tag} onValueChange={(value) => setFilters(prev => ({ ...prev, tag: value }))}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All Tags" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tags</SelectItem>
                      <SelectItem value="Prompt Engineer">Prompt Engineer</SelectItem>
                      <SelectItem value="AI Tools Builder">AI Tools Builder</SelectItem>
                      <SelectItem value="Research Explainer">Research Explainer</SelectItem>
                      <SelectItem value="Opinion Leader">Opinion Leader</SelectItem>
                      <SelectItem value="Open Source">Open Source</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-slate-700">Engagement:</label>
                  <Select value={filters.engagementLevel} onValueChange={(value) => setFilters(prev => ({ ...prev, engagementLevel: value }))}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All Levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="high">High (80+)</SelectItem>
                      <SelectItem value="medium">Medium (50-79)</SelectItem>
                      <SelectItem value="low">Low (0-49)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Creator Table */}
          <Card>
            <CardHeader>
              <CardTitle>Discovered Creators</CardTitle>
              <p className="text-sm text-slate-600">AI content creators ranked by engagement and activity</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-left">Creator</TableHead>
                      <TableHead className="text-left">Subreddit</TableHead>
                      <TableHead className="text-left">Engagement Score</TableHead>
                      <TableHead className="text-left">Karma</TableHead>
                      <TableHead className="text-left">Tags</TableHead>
                      <TableHead className="text-left">Last Active</TableHead>
                      <TableHead className="text-left">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creatorsLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-slate-200 rounded-full animate-pulse"></div>
                              <div className="space-y-1">
                                <div className="h-4 w-24 bg-slate-200 rounded animate-pulse"></div>
                                <div className="h-3 w-20 bg-slate-200 rounded animate-pulse"></div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="h-6 w-20 bg-slate-200 rounded animate-pulse"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-16 bg-slate-200 rounded animate-pulse"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-12 bg-slate-200 rounded animate-pulse"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-6 w-24 bg-slate-200 rounded animate-pulse"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-16 bg-slate-200 rounded animate-pulse"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-8 w-16 bg-slate-200 rounded animate-pulse"></div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : creators.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                          No creators found. Try adjusting your filters or start a crawl to discover new creators.
                        </TableCell>
                      </TableRow>
                    ) : (
                      creators.map((creator) => (
                        <TableRow key={creator.id} className="hover:bg-slate-50 transition-colors cursor-pointer">
                          <TableCell onClick={() => handleViewCreator(creator)}>
                            <div className="flex items-center space-x-3">
                              <div className={`w-10 h-10 bg-gradient-to-br ${getCreatorAvatarColor(creator.username)} rounded-full flex items-center justify-center text-white font-semibold text-sm`}>
                                {getCreatorInitials(creator.username)}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-slate-900">{creator.username}</div>
                                <div className="text-sm text-slate-500">u/{creator.username}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getSubredditBadgeColor(creator.subreddit)}>
                              r/{creator.subreddit}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Progress 
                                value={creator.engagementScore} 
                                className="w-16 h-2" 
                              />
                              <span className={`text-sm font-medium ${getEngagementColor(creator.engagementScore)}`}>
                                {creator.engagementScore}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-slate-900">
                            {formatKarma(creator.karma)}
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
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewCreator(creator);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(creator.profileLink, '_blank');
                                }}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                <div className="text-sm text-slate-500">
                  Showing {creators.length > 0 ? '1' : '0'}-{creators.length} creators
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                  <Button size="sm" className="bg-blue-600 text-white">
                    1
                  </Button>
                  <Button variant="outline" size="sm">
                    2
                  </Button>
                  <Button variant="outline" size="sm">
                    3
                  </Button>
                  <Button variant="outline" size="sm">
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Creator Modal */}
      <CreatorModal
        creatorId={selectedCreatorId}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
