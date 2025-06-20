import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Calendar, MessageSquare, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CreatorWithRecentActivity } from "@shared/schema";

interface CreatorModalProps {
  creatorId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreatorAvatar({ username }: { username: string }) {
  const initials = username
    .split(/[_\s]+/)
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  
  const colors = [
    'from-blue-500 to-indigo-500',
    'from-green-500 to-teal-500', 
    'from-orange-500 to-red-500',
    'from-teal-500 to-cyan-500',
    'from-pink-500 to-rose-500',
    'from-purple-500 to-violet-500'
  ];
  
  const colorIndex = username.length % colors.length;
  
  return (
    <div className={`w-16 h-16 bg-gradient-to-br ${colors[colorIndex]} rounded-full flex items-center justify-center text-white font-bold text-xl`}>
      {initials}
    </div>
  );
}

function EngagementBar({ score }: { score: number }) {
  const getColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  return (
    <div className="flex items-center">
      <div className="w-16 bg-slate-200 rounded-full h-2 mr-2">
        <div 
          className={`h-2 rounded-full ${getColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-sm font-medium text-slate-900">{score}</span>
    </div>
  );
}

export function CreatorModal({ creatorId, open, onOpenChange }: CreatorModalProps) {
  const { data: creator, isLoading } = useQuery({
    queryKey: ['/api/creators', creatorId],
    queryFn: () => creatorId ? api.getCreator(creatorId) : null,
    enabled: !!creatorId && open,
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['/api/creators', creatorId, 'posts'],
    queryFn: () => creatorId ? api.getCreatorPosts(creatorId, 10) : [],
    enabled: !!creatorId && open,
  });

  if (!creator && !isLoading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Creator Profile</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="p-6 space-y-6">
            <div className="animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-slate-200 rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-32"></div>
                  <div className="h-3 bg-slate-200 rounded w-24"></div>
                </div>
              </div>
            </div>
          </div>
        ) : creator ? (
          <div className="space-y-6">
            {/* Creator Header */}
            <div className="flex items-center space-x-4">
              <CreatorAvatar username={creator.username} />
              <div>
                <h4 className="text-lg font-semibold text-slate-900">{creator.username}</h4>
                <p className="text-slate-600">u/{creator.username}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-sm text-slate-500">
                    <Calendar className="inline w-4 h-4 mr-1" />
                    {creator.lastActive ? new Date(creator.lastActive).toLocaleDateString() : 'Unknown'}
                  </span>
                  <span className="text-sm text-slate-500">{creator.karma.toLocaleString()} karma</span>
                </div>
              </div>
            </div>

            {/* Engagement Metrics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-900">{creator.engagementScore}</div>
                <div className="text-sm text-slate-600">Engagement Score</div>
                <div className="mt-2">
                  <EngagementBar score={creator.engagementScore} />
                </div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-900">{creator.postsCount}</div>
                <div className="text-sm text-slate-600">Posts</div>
                <FileText className="w-5 h-5 mx-auto mt-2 text-slate-400" />
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-900">{creator.commentsCount}</div>
                <div className="text-sm text-slate-600">Comments</div>
                <MessageSquare className="w-5 h-5 mx-auto mt-2 text-slate-400" />
              </div>
            </div>

            {/* Tags */}
            {creator.tags && creator.tags.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-slate-700 mb-2">Tags</h5>
                <div className="flex flex-wrap gap-2">
                  {creator.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Top Posts */}
            {creator.topPostLinks && creator.topPostLinks.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-slate-700 mb-3 flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  Top Reddit Posts
                </h5>
                <div className="space-y-2">
                  {creator.topPostLinks.map((link, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-left"
                      onClick={() => window.open(link, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3 mr-2" />
                      <span className="truncate">Top Post #{index + 1}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Posts */}
            <div>
              <h5 className="text-sm font-medium text-slate-700 mb-3 flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Recent Reddit Posts
              </h5>
              {postsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse p-3 border border-slate-200 rounded-lg">
                      <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : posts.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {posts.map((post) => (
                    <div 
                      key={post.id} 
                      className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                      onClick={() => window.open(post.redditUrl, '_blank')}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h6 className="text-sm font-medium text-slate-900 mb-1 line-clamp-2">
                            {post.title}
                          </h6>
                          <div className="flex items-center space-x-3 text-xs text-slate-500">
                            <span className="flex items-center">
                              <MessageSquare className="w-3 h-3 mr-1" />
                              {post.upvotes.toLocaleString()} upvotes
                            </span>
                            <span>r/{post.subreddit}</span>
                            <span>{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Unknown date'}</span>
                          </div>
                          {post.content && (
                            <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                              {post.content.substring(0, 150)}...
                            </p>
                          )}
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-400 ml-2 flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">No posts found for this creator.</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t border-slate-200">
              <Button 
                variant="outline" 
                className="flex items-center space-x-2"
                onClick={() => window.open(creator.profileLink, '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
                <span>View on Reddit</span>
              </Button>
              <div className="flex space-x-3">
                <Button variant="outline">Add Note</Button>
                <Button>Add to List</Button>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
