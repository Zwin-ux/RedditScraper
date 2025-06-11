import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, TrendingUp, MessageSquare, ExternalLink, Calendar, BarChart3 } from "lucide-react";
import { SiReddit } from "react-icons/si";
import { api } from "@/lib/api";
import type { Creator } from "@shared/schema";

interface SubredditModalProps {
  isOpen: boolean;
  onClose: () => void;
  subredditName: string;
}

export function SubredditModal({ isOpen, onClose, subredditName }: SubredditModalProps) {
  const [selectedTab, setSelectedTab] = useState("overview");

  // Fetch creators for this specific subreddit
  const { data: creators = [], isLoading: creatorsLoading } = useQuery({
    queryKey: ['/api/creators', { subreddit: subredditName }],
    queryFn: () => api.getCreators({ subreddit: subredditName }),
    enabled: isOpen && !!subredditName,
  });

  // Calculate subreddit statistics
  const stats = {
    totalCreators: creators.length,
    totalKarma: creators.reduce((sum, c) => sum + c.karma, 0),
    avgEngagement: creators.length > 0 ? Math.round(creators.reduce((sum, c) => sum + c.engagementScore, 0) / creators.length) : 0,
    topTags: getTopTags(creators),
    recentActivity: creators.filter(c => {
      const lastActive = c.lastActive ? new Date(c.lastActive) : null;
      return lastActive && (Date.now() - lastActive.getTime()) < 7 * 24 * 60 * 60 * 1000; // 7 days
    }).length
  };

  const topCreators = creators
    .sort((a, b) => b.engagementScore - a.engagementScore)
    .slice(0, 10);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SiReddit className="w-5 h-5 text-orange-500" />
            r/{subredditName}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(`https://reddit.com/r/${subredditName}`, '_blank')}
              className="ml-auto"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto">
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="creators">Top Creators</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-500" />
                      <div>
                        <p className="text-2xl font-bold">{stats.totalCreators}</p>
                        <p className="text-sm text-slate-600">Creators</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <div>
                        <p className="text-2xl font-bold">{stats.totalKarma.toLocaleString()}</p>
                        <p className="text-sm text-slate-600">Total Karma</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-purple-500" />
                      <div>
                        <p className="text-2xl font-bold">{stats.avgEngagement}</p>
                        <p className="text-sm text-slate-600">Avg Engagement</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-orange-500" />
                      <div>
                        <p className="text-2xl font-bold">{stats.recentActivity}</p>
                        <p className="text-sm text-slate-600">Active This Week</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Popular Topics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {stats.topTags.map(({ tag, count }) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <span className="text-xs bg-slate-200 rounded px-1">{count}</span>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Engagement Distribution</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>High Engagement (80-100)</span>
                      <span>{creators.filter(c => c.engagementScore >= 80).length}</span>
                    </div>
                    <Progress value={(creators.filter(c => c.engagementScore >= 80).length / creators.length) * 100} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Medium Engagement (50-79)</span>
                      <span>{creators.filter(c => c.engagementScore >= 50 && c.engagementScore < 80).length}</span>
                    </div>
                    <Progress value={(creators.filter(c => c.engagementScore >= 50 && c.engagementScore < 80).length / creators.length) * 100} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Low Engagement (20-49)</span>
                      <span>{creators.filter(c => c.engagementScore < 50).length}</span>
                    </div>
                    <Progress value={(creators.filter(c => c.engagementScore < 50).length / creators.length) * 100} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="creators" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Creator</TableHead>
                      <TableHead>Karma</TableHead>
                      <TableHead>Engagement</TableHead>
                      <TableHead>Specialties</TableHead>
                      <TableHead>Posts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topCreators.map((creator) => (
                      <TableRow key={creator.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <SiReddit className="w-4 h-4 text-orange-500" />
                            <div>
                              <p className="font-medium">{creator.username}</p>
                              <p className="text-xs text-slate-500">
                                {creator.lastActive ? new Date(creator.lastActive).toLocaleDateString() : 'Unknown'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{creator.karma.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={creator.engagementScore} className="w-16 h-2" />
                            <span className="text-sm">{creator.engagementScore}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {creator.tags?.slice(0, 2).map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{creator.postsCount || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Creator Growth</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">This Week</span>
                        <span className="font-semibold">+{stats.recentActivity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Total Active</span>
                        <span className="font-semibold">{stats.totalCreators}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Avg Karma per Creator</span>
                        <span className="font-semibold">
                          {stats.totalCreators > 0 ? Math.round(stats.totalKarma / stats.totalCreators).toLocaleString() : 0}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Content Categories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stats.topTags.slice(0, 5).map(({ tag, count }) => (
                        <div key={tag} className="flex justify-between items-center">
                          <span className="text-sm">{tag}</span>
                          <div className="flex items-center gap-2">
                            <Progress value={(count / stats.totalCreators) * 100} className="w-16 h-2" />
                            <span className="text-xs text-slate-500">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getTopTags(creators: Creator[]): Array<{ tag: string; count: number }> {
  const tagCounts = new Map<string, number>();
  
  creators.forEach(creator => {
    creator.tags?.forEach(tag => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
  });
  
  return Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}