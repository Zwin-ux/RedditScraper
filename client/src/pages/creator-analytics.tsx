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
  const [sortBy, setSortBy] = useState("karma");

  const { data: allCreators = [], isLoading } = useQuery({
    queryKey: ["/api/creators", { limit: 200 }],
    queryFn: () => api.getCreators({ limit: 200 }),
  });

  // Sort and filter creators based on criteria
  const creators = allCreators
    .filter(creator => 
      !searchQuery || 
      creator.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      creator.subreddit.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "karma":
          return b.karma - a.karma;
        case "engagement":
          return b.engagementScore - a.engagementScore;
        case "recent":
          return new Date(b.lastActive || 0).getTime() - new Date(a.lastActive || 0).getTime();
        default:
          return b.karma - a.karma;
      }
    })
    .slice(0, 50);

  const topCreatorsByKarma = allCreators
    .sort((a, b) => b.karma - a.karma)
    .slice(0, 10);

  const highEngagementCreators = allCreators
    .filter(creator => creator.engagementScore >= 80)
    .length;

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
        <h1 className="text-3xl font-bold">Top Reddit Creators</h1>
        <p className="text-muted-foreground">
          Discover the highest karma creators and most engaged users across Reddit communities
        </p>
      </div>

      {/* Quick Filter Buttons */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Filters</h3>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Top Performers", filter: { engagementLevel: 'high' } },
              { label: "Data Science", filter: { subreddit: 'datascience' } },
              { label: "Machine Learning", filter: { subreddit: 'MachineLearning' } },
              { label: "Programming", filter: { subreddit: 'programming' } },
              { label: "High Karma", filter: { search: '' } },
              { label: "Recent Activity", filter: { search: '' } }
            ].map((item) => (
              <Button
                key={item.label}
                onClick={() => {
                  if (item.filter.subreddit) {
                    setSearchQuery(`subreddit:${item.filter.subreddit}`);
                  } else if (item.label === "Top Performers") {
                    setSortBy('engagement');
                  } else if (item.label === "High Karma") {
                    setSortBy('karma');
                  } else if (item.label === "Recent Activity") {
                    setSortBy('recent');
                  }
                }}
                variant="outline"
                className="bg-white hover:bg-green-100"
              >
                {item.label}
              </Button>
            ))}
            <Button
              onClick={() => {
                setSearchQuery('');
                setSortBy('karma');
              }}
              variant="ghost"
              className="text-gray-600 hover:text-gray-900"
            >
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search and Sort */}
      <Card>
        <CardHeader>
          <CardTitle>Find Top Creators</CardTitle>
          <CardDescription>
            Search by username or subreddit, and sort by different criteria
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Search by username or subreddit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Sort By</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="karma">Highest Karma</SelectItem>
                  <SelectItem value="engagement">Best Engagement</SelectItem>
                  <SelectItem value="recent">Most Recent Activity</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Performers Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Creators</p>
                <p className="text-2xl font-bold">{allCreators.length}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Highest Karma</p>
                <p className="text-2xl font-bold">
                  {topCreatorsByKarma.length > 0 
                    ? topCreatorsByKarma[0].karma.toLocaleString()
                    : 0
                  }
                </p>
              </div>
              <Award className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Engagement</p>
                <p className="text-2xl font-bold">{highEngagementCreators}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Showing Results</p>
                <p className="text-2xl font-bold">{creators.length}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Creators Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>
            {sortBy === "karma" ? "🏆 Highest Karma Creators" : 
             sortBy === "engagement" ? "⚡ Most Engaged Creators" : 
             "📈 Most Active Creators"}
          </CardTitle>
          <CardDescription>
            {searchQuery 
              ? `Showing ${creators.length} creators matching "${searchQuery}"`
              : `Top ${creators.length} creators sorted by ${sortBy === "karma" ? "karma" : sortBy === "engagement" ? "engagement score" : "recent activity"}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading top creators...</p>
            </div>
          ) : creators.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No creators found matching your search.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {creators.map((creator, index) => (
                <div key={creator.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                        #{index + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">u/{creator.username}</h3>
                        <p className="text-sm text-muted-foreground">
                          r/{creator.subreddit}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        {sortBy === "karma" ? creator.karma.toLocaleString() : 
                         sortBy === "engagement" ? creator.engagementScore : 
                         creator.lastActive ? new Date(creator.lastActive).toLocaleDateString() : 'N/A'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {sortBy === "karma" ? "karma" : 
                         sortBy === "engagement" ? "engagement" : 
                         "last active"}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                    <div className="text-center">
                      <div className="font-medium">{creator.karma.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Karma</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">{creator.engagementScore}</div>
                      <div className="text-xs text-muted-foreground">Engagement</div>
                    </div>
                    <div className="text-center">
                      <a
                        href={creator.profileLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        View Profile <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  {creator.tags && creator.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2">
                      {creator.tags.slice(0, 4).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {creator.tags.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{creator.tags.length - 4}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}