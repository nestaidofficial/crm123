# Instagram/Facebook-Style Comments Feature

## Overview
The task cards now include a fully functional Instagram/Facebook-style commenting system that allows users to interact with tasks through comments, likes, and replies.

## Features Implemented

### 1. **Expandable Comments Section**
   - Click on "X Comments" to expand/collapse the comments section
   - Smooth slide-down animation when opening
   - The button changes color to blue when comments are open
   - The MessageSquare icon fills with blue when active

### 2. **Comment Display**
   - User avatar with gradient fallback for initials
   - Author name and comment content in speech-bubble style
   - Timestamp with relative formatting (e.g., "2m ago", "5h ago", "just now")
   - Like counter displayed when a comment has likes
   - Threaded replies shown nested under parent comments

### 3. **Add New Comments**
   - Comment input box at the bottom of the section
   - Current user's avatar shown next to input
   - Placeholder text: "Write a comment..."
   - Press Enter to submit (Shift+Enter for new line)
   - Send button appears in the textarea corner

### 4. **Like Functionality**
   - Click "Like" to like any comment or reply
   - Text changes to "Liked" and turns red when you've liked it
   - Heart icon shows total like count
   - Click again to unlike

### 5. **Reply Functionality**
   - Click "Reply" button under any comment
   - Reply input appears with user's avatar
   - Placeholder shows "Reply to [FirstName]..."
   - Press Enter to submit reply or Esc to cancel
   - Replies are nested under their parent comment with smaller avatars

### 6. **Real-time Updates**
   - Comment count updates immediately when adding comments or replies
   - All actions (add, like, reply) update the state in real-time
   - Changes persist in the task data structure

### 7. **Smooth UX**
   - Drag-and-drop disabled when comments section is open
   - Smooth animations for expanding/collapsing
   - Responsive scrollbar for long comment threads (max-height: 400px)
   - Click events stop propagation to prevent accidental card interactions

## Data Structure

### Comment Type
```typescript
interface Comment {
  id: string;
  author: Employee;
  content: string;
  timestamp: string;
  likes: string[]; // Array of employee IDs
  replies: CommentReply[];
}
```

### CommentReply Type
```typescript
interface CommentReply {
  id: string;
  author: Employee;
  content: string;
  timestamp: string;
  likes: string[]; // Array of employee IDs
}
```

## Sample Data
Three tasks have been populated with sample comments:
1. **"Email Campaign Setup"** (tsk_1) - 3 comments with 1 reply
2. **"Pipeline Review"** (tsk_2) - 1 comment
3. **"Deal Negotiation"** (tsk_6) - 2 comments with 1 reply

## How to Use

### For Users:
1. **View Comments**: Click on "X Comments" at the bottom of any task card
2. **Add Comment**: Type in the bottom input box and press Enter or click send
3. **Like**: Click "Like" under any comment or reply
4. **Reply**: Click "Reply" under a comment, type your response, and press Enter
5. **Close**: Click "X Comments" again to collapse the section

### For Developers:
The commenting system is modular and reusable:

- **CommentSection Component**: `/components/tasks/comment-section.tsx`
  - Handles all comment interactions
  - Props: comments, currentUser, callbacks for actions

- **TaskCard Component**: `/components/tasks/task-card.tsx`
  - Integrates CommentSection
  - Manages comment state
  - Handles updates to parent component

- **Mock Data**: `/app/tasks/nessaKanbanMock.ts`
  - Comment and CommentReply interfaces
  - Sample comments in task data

## Keyboard Shortcuts
- **Enter**: Submit comment/reply
- **Shift+Enter**: New line in comment/reply
- **Esc**: Cancel reply (when replying)

## Styling
The comments feature uses:
- Neutral color palette matching the existing design
- Rounded speech bubbles for comments
- Gradient avatars (purple-to-blue for comments, cyan-to-blue for replies)
- Red heart icons for likes
- Blue accent color for active states
- Smooth transitions and animations

## Future Enhancements
Potential additions:
- Edit/delete your own comments
- Mention other users (@username)
- Rich text formatting
- File attachments
- Comment notifications
- Comment timestamps on hover with full date/time
- Load more comments (pagination)
- Comment sorting options
