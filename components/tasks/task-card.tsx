"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KanbanTask, Comment, CommentReply, Employee } from "@/lib/tasks/nessaKanbanMock";
import { MoreHorizontal, MessageSquare, Link2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CommentSection } from "./comment-section";

interface TaskCardProps {
  task: KanbanTask;
  onEdit?: (task: KanbanTask) => void;
  onDelete?: (taskId: string) => void;
  onUpdateComments?: (taskId: string, comments: Comment[]) => void;
  currentEmployee?: Employee | null;
}

const priorityVariants: Record<string, "negative" | "warning" | "info" | "neutral"> = {
  urgent: "negative",
  high:   "warning",
  medium: "info",
  low:    "neutral",
};

const getTaskStatusBadge = (task: KanbanTask): { label: string; variant: "info" | "positive" | "neutral" } => {
  if (task.priority === "urgent" || task.priority === "high") {
    return { label: "In Progress", variant: "info" };
  }
  if (task.status === "done") {
    return { label: "Completed", variant: "positive" };
  }
  return { label: "Not Started", variant: "neutral" };
};

export function TaskCard({ task, onEdit, onDelete, onUpdateComments, currentEmployee }: TaskCardProps) {
  const [showComments, setShowComments] = useState(false);
  const currentUser = currentEmployee || {
    id: "unknown",
    name: "Unknown User",
    initials: "??",
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const statusBadge = getTaskStatusBadge(task);
  const comments = task.comments || [];
  const totalComments = comments.length + comments.reduce((acc, c) => acc + c.replies.length, 0);

  const handleAddComment = (content: string) => {
    const newComment: Comment = {
      id: `cmt_${Date.now()}`,
      author: currentUser,
      content,
      timestamp: new Date().toISOString(),
      likes: [],
      replies: [],
    };
    const updatedComments = [...comments, newComment];
    onUpdateComments?.(task.id, updatedComments);
  };

  const handleLikeComment = (commentId: string) => {
    const updatedComments = comments.map((comment) => {
      if (comment.id === commentId) {
        const likes = comment.likes.includes(currentUser.id)
          ? comment.likes.filter((id) => id !== currentUser.id)
          : [...comment.likes, currentUser.id];
        return { ...comment, likes };
      }
      return comment;
    });
    onUpdateComments?.(task.id, updatedComments);
  };

  const handleReplyToComment = (commentId: string, content: string) => {
    const newReply: CommentReply = {
      id: `rpl_${Date.now()}`,
      author: currentUser,
      content,
      timestamp: new Date().toISOString(),
      likes: [],
    };
    const updatedComments = comments.map((comment) => {
      if (comment.id === commentId) {
        return { ...comment, replies: [...comment.replies, newReply] };
      }
      return comment;
    });
    onUpdateComments?.(task.id, updatedComments);
  };

  const handleLikeReply = (commentId: string, replyId: string) => {
    const updatedComments = comments.map((comment) => {
      if (comment.id === commentId) {
        const updatedReplies = comment.replies.map((reply) => {
          if (reply.id === replyId) {
            const likes = reply.likes.includes(currentUser.id)
              ? reply.likes.filter((id) => id !== currentUser.id)
              : [...reply.likes, currentUser.id];
            return { ...reply, likes };
          }
          return reply;
        });
        return { ...comment, replies: updatedReplies };
      }
      return comment;
    });
    onUpdateComments?.(task.id, updatedComments);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-white rounded-xl border border-neutral-200/60 p-3 mb-1.5 hover:shadow-md transition-all",
        isDragging && "opacity-30 shadow-xl scale-105"
      )}
    >
      <div {...attributes} {...listeners} className={!showComments ? "cursor-grab active:cursor-grabbing" : ""}>
        {/* Status Badge + Menu */}
        <div className="flex items-start justify-between mb-2">
          <Badge
            variant={statusBadge.variant}
            className="text-[10px] font-medium px-1.5 py-0.5 h-auto rounded-md"
          >
            {statusBadge.label}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 hover:bg-neutral-100 -mt-0.5 -mr-0.5"
              >
                <MoreHorizontal className="h-3 w-3 text-neutral-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(task)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete?.(task.id)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-[14px] text-neutral-900 leading-snug mb-1.5">
          {task.title}
        </h3>

        {/* Description */}
        <p className="text-[12px] text-neutral-500 leading-relaxed mb-3 line-clamp-2">
          {task.description}
        </p>

        {/* Assignees */}
        <div className="mb-2">
          <p className="text-[10px] text-neutral-500 mb-1">Assignees :</p>
          <div className="flex -space-x-2">
            {task.assignee.slice(0, 3).map((assignee, index) => (
              <Avatar
                key={index}
                className="h-6 w-6 border-2 border-white ring-0"
              >
                {assignee.avatar && <AvatarImage src={assignee.avatar} alt={assignee.name} />}
                <AvatarFallback className="text-[8px] font-semibold bg-gradient-to-br from-purple-400 to-blue-400 text-white">
                  {assignee.initials}
                </AvatarFallback>
              </Avatar>
            ))}
            {task.assignee.length > 3 && (
              <div className="h-6 w-6 rounded-full bg-neutral-100 border-2 border-white flex items-center justify-center">
                <span className="text-[8px] font-semibold text-neutral-600">
                  +{task.assignee.length - 3}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Date + Priority */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1 text-[11px] text-neutral-500">
            <Calendar className="h-3 w-3" />
            <span>{task.dueDate}</span>
          </div>
          <Badge
            variant={priorityVariants[task.priority as keyof typeof priorityVariants] ?? "neutral"}
            className="text-[10px] font-medium px-1.5 py-0.5 h-auto rounded-md capitalize"
          >
            {task.priority}
          </Badge>
        </div>

        {/* Footer - Comments, Links, Tasks Counter */}
        <div className="flex items-center gap-2 text-[11px] text-neutral-500 pt-2 border-t border-neutral-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowComments(!showComments);
            }}
            className={cn(
              "flex items-center gap-1 hover:text-neutral-700 transition-colors",
              showComments && "text-blue-600 hover:text-blue-700"
            )}
          >
            <MessageSquare className={cn("h-3 w-3", showComments && "fill-blue-600")} />
            <span className="font-medium">
              {totalComments} {totalComments === 1 ? "Comment" : "Comments"}
            </span>
          </button>
          <div className="flex items-center gap-1">
            <Link2 className="h-3 w-3" />
            <span>{task.links?.length ?? 0} {task.links?.length === 1 ? "Link" : "Links"}</span>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <CommentSection
          comments={comments}
          currentUser={currentUser}
          onAddComment={handleAddComment}
          onLikeComment={handleLikeComment}
          onReplyToComment={handleReplyToComment}
          onLikeReply={handleLikeReply}
        />
      )}
    </div>
  );
}
