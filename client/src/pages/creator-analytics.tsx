import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, TrendingUp, Award, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import type { Creator } from "@shared/schema";

export default function CreatorAnalytics() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubreddit, setSelectedSubreddit] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [engagementLevel, setEngagementLevel] = useState("");

  const { data: creators = [], isLoading } = useQuery({
    queryKey: ["/api/creators", { 
      search: searchQuery || undefined,
      subreddit: selectedSubreddit || undefined,
      tag: selectedTag || undefined,
      engagementLevel: engagementLevel || undefined,
      limit: 50
    }],
    queryFn: () => api.getCreators({ 
      search: searchQuery || undefined,
      subreddit: selectedSubreddit || undefined,
      tag: selectedTag || undefined,
      engagementLevel: engagementLevel || undefined,
      limit: 50
    }),
  });

  const { data: subreddits = [] } = useQuery({
    queryKey: ["/api/subreddits"],
    queryFn: () => api.getSubreddits(),
  });

  // Get unique tags from creators
  const allTags = creators.flatMap(creator => creator.tags || []);
  const uniqueTags = Array.from(new Set(allTags));

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedSubreddit("");
    setSelectedTag("");
    setEngagementLevel("");
  };

  const getEngagementLevel = (score: number) => {
    if (score >= 80) return "High";
    if (score >= 50) return "Medium";
    return "Low";
  };

  const getEngagementColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col space-y-4">
        <h1 className="text-3xl font-bold">Creator Analytics</h1>
        <p className="text-muted-foreground">
          Analyze Reddit creators and their engagement patterns across different subreddits
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter creators by search query, subreddit, tags, or engagement level
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Search creators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Subreddit</label>
              <Select value={selectedSubreddit} onValueChange={setSelectedSubreddit}>
                <SelectTrigger>
                  <SelectValue placeholder="All subreddits" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All subreddits</SelectItem>
                  {subreddits.map(subreddit => (
                    <SelectItem key={subreddit.id} value={subreddit.name}>
                      r/{subreddit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tag</label>
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger>
                  <SelectValue placeholder="All tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All tags</SelectItem>
                  {uniqueTags.slice(0, 20).map(tag => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Engagement</label>
              <Select value={engagementLevel} onValueChange={setEngagementLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="All levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All levels</SelectItem>
                  <SelectItem value="high">High (80+)</SelectItem>
                  <SelectItem value="medium">Medium (50-79)</SelectItem>
                  <SelectItem value="low">Low (0-49)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button onClick={clearFilters} variant="outline" size="sm">
            Clear Filters
          </Button>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Creators</p>
                <p className="text-2xl font-bold">{creators.length}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Engagement</p>
                <p className="text-2xl font-bold">
                  {creators.length > 0 
                    ? Math.round(creators.reduce((sum, c) => sum + c.engagementScore, 0) / creators.length)
                    : 0
                  }
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Performers</p>
                <p className="text-2xl font-bold">
                  {creators.filter(c => c.engagementScore >= 80).length}
                </p>
              </div>
              <Award className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Creators List */}
      <Card>
        <CardHeader>
          <CardTitle>Creators</CardTitle>
          <CardDescription>
            {creators.length > 0 
              ? `Showing ${creators.length} creators matching your filters`
              : "No creators found matching your filters"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading creators...</p>
            </div>
          ) : creators.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No creators found. Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {creators.map((creator) => (
                <div key={creator.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-medium">u/{creator.username}</h3>
                      <p className="text-sm text-muted-foreground">
                        r/{creator.subreddit} • {creator.karma} karma
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={creator.engagementScore >= 80 ? "default" : 
                               creator.engagementScore >= 50 ? "secondary" : "outline"}
                      >
                        {getEngagementLevel(creator.engagementScore)}
                      </Badge>
                      <span className={`text-sm font-medium ${getEngagementColor(creator.engagementScore)}`}>
                        {creator.engagementScore}
                      </span>
                    </div>
                  </div>

                  {creator.tags && creator.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {creator.tags.slice(0, 5).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {creator.tags.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{creator.tags.length - 5} more
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      Last activity: {creator.lastActive ? new Date(creator.lastActive).toLocaleDateString() : 'Unknown'}
                    </div>
                    <a
                      href={creator.profileLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
                    >
                      View Profile <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}