"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Comment, CommentReply, Employee } from "@/lib/tasks/nessaKanbanMock";
import { Heart, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommentSectionProps {
  comments: Comment[];
  currentUser: Employee;
  onAddComment: (content: string) => void;
  onLikeComment: (commentId: string) => void;
  onReplyToComment: (commentId: string, content: string) => void;
  onLikeReply: (commentId: string, replyId: string) => void;
}

export function CommentSection({
  comments,
  currentUser,
  onAddComment,
  onLikeComment,
  onReplyToComment,
  onLikeReply,
}: CommentSectionProps) {
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const handleSubmitComment = () => {
    if (newComment.trim()) {
      onAddComment(newComment.trim());
      setNewComment("");
    }
  };

  const handleSubmitReply = (commentId: string) => {
    if (replyContent.trim()) {
      onReplyToComment(commentId, replyContent.trim());
      setReplyContent("");
      setReplyingTo(null);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="border-t border-neutral-100 mt-3 pt-3 animate-in slide-in-from-top-2 duration-300 ease-out">
      {/* Comments List */}
      <div className="space-y-3 mb-3 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-neutral-300 scrollbar-track-transparent hover:scrollbar-thumb-neutral-400">
        {comments.map((comment) => (
          <div key={comment.id} className="group">
            {/* Main Comment */}
            <div className="flex gap-2">
              <Avatar className="h-8 w-8 flex-shrink-0">
                {comment.author.avatar && (
                  <AvatarImage src={comment.author.avatar} alt={comment.author.name} />
                )}
                <AvatarFallback className="text-[10px] font-semibold bg-gradient-to-br from-purple-400 to-blue-400 text-white">
                  {comment.author.initials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="bg-neutral-50 rounded-2xl px-3 py-2">
                  <p className="text-[13px] font-semibold text-neutral-900">
                    {comment.author.name}
                  </p>
                  <p className="text-[13px] text-neutral-700 leading-relaxed break-words">
                    {comment.content}
                  </p>
                </div>

                {/* Comment Actions */}
                <div className="flex items-center gap-3 mt-1 ml-3">
                  <button
                    onClick={() => onLikeComment(comment.id)}
                    className={cn(
                      "text-[12px] font-semibold transition-colors",
                      comment.likes.includes(currentUser.id)
                        ? "text-red-500"
                        : "text-neutral-500 hover:text-neutral-700"
                    )}
                  >
                    {comment.likes.includes(currentUser.id) ? "Liked" : "Like"}
                  </button>
                  <button
                    onClick={() => setReplyingTo(comment.id)}
                    className="text-[12px] font-semibold text-neutral-500 hover:text-neutral-700 transition-colors"
                  >
                    Reply
                  </button>
                  <span className="text-[12px] text-neutral-400">
                    {formatTimestamp(comment.timestamp)}
                  </span>
                  {comment.likes.length > 0 && (
                    <div className="flex items-center gap-1 ml-auto">
                      <Heart className="h-3 w-3 fill-red-500 text-red-500" />
                      <span className="text-[12px] text-neutral-600">
                        {comment.likes.length}
                      </span>
                    </div>
                  )}
                </div>

                {/* Replies */}
                {comment.replies.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex gap-2">
                        <Avatar className="h-7 w-7 flex-shrink-0">
                          {reply.author.avatar && (
                            <AvatarImage src={reply.author.avatar} alt={reply.author.name} />
                          )}
                          <AvatarFallback className="text-[9px] font-semibold bg-gradient-to-br from-cyan-400 to-blue-400 text-white">
                            {reply.author.initials}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="bg-neutral-50 rounded-2xl px-3 py-2">
                            <p className="text-[12px] font-semibold text-neutral-900">
                              {reply.author.name}
                            </p>
                            <p className="text-[12px] text-neutral-700 leading-relaxed break-words">
                              {reply.content}
                            </p>
                          </div>

                          {/* Reply Actions */}
                          <div className="flex items-center gap-3 mt-1 ml-3">
                            <button
                              onClick={() => onLikeReply(comment.id, reply.id)}
                              className={cn(
                                "text-[11px] font-semibold transition-colors",
                                reply.likes.includes(currentUser.id)
                                  ? "text-red-500"
                                  : "text-neutral-500 hover:text-neutral-700"
                              )}
                            >
                              {reply.likes.includes(currentUser.id) ? "Liked" : "Like"}
                            </button>
                            <span className="text-[11px] text-neutral-400">
                              {formatTimestamp(reply.timestamp)}
                            </span>
                            {reply.likes.length > 0 && (
                              <div className="flex items-center gap-1 ml-auto">
                                <Heart className="h-2.5 w-2.5 fill-red-500 text-red-500" />
                                <span className="text-[11px] text-neutral-600">
                                  {reply.likes.length}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Input */}
                {replyingTo === comment.id && (
                  <div className="mt-2 flex gap-2 animate-in slide-in-from-top duration-200">
                    <Avatar className="h-7 w-7 flex-shrink-0">
                      {currentUser.avatar && (
                        <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                      )}
                      <AvatarFallback className="text-[9px] font-semibold bg-gradient-to-br from-green-400 to-blue-400 text-white">
                        {currentUser.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 relative">
                      <Textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder={`Reply to ${comment.author.name.split(" ")[0]}...`}
                        className="min-h-[60px] text-[13px] pr-12 resize-none rounded-2xl border-neutral-200 focus:border-neutral-300"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmitReply(comment.id);
                          }
                          if (e.key === "Escape") {
                            setReplyingTo(null);
                            setReplyContent("");
                          }
                        }}
                        autoFocus
                      />
                      <div className="absolute right-2 bottom-2 flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyContent("");
                          }}
                        >
                          <span className="text-[11px] text-neutral-500">Esc</span>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => handleSubmitReply(comment.id)}
                          disabled={!replyContent.trim()}
                        >
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {comments.length === 0 && (
          <div className="text-center py-6">
            <p className="text-[13px] text-neutral-400">No comments yet. Be the first to comment!</p>
          </div>
        )}
      </div>

      {/* Add Comment Input */}
      <div className="flex gap-2 pt-2 border-t border-neutral-100">
        <Avatar className="h-8 w-8 flex-shrink-0">
          {currentUser.avatar && (
            <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
          )}
          <AvatarFallback className="text-[10px] font-semibold bg-gradient-to-br from-green-400 to-blue-400 text-white">
            {currentUser.initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 relative">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="min-h-[60px] text-[13px] pr-12 resize-none rounded-2xl border-neutral-200 focus:border-neutral-300"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmitComment();
              }
            }}
          />
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-2 bottom-2 h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            onClick={handleSubmitComment}
            disabled={!newComment.trim()}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
