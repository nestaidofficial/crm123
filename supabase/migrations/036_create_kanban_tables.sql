-- =====================================================
-- Migration: 036_create_kanban_tables.sql
-- Description: Create kanban board tables with RLS, indexes, and realtime
-- =====================================================

-- =====================================================
-- 1. CREATE TABLES
-- =====================================================

-- Kanban columns (board columns per agency)
CREATE TABLE kanban_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  color TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agency_id, slug)
);

-- Kanban tasks (task cards)
CREATE TABLE kanban_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  column_id UUID NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  entity_type TEXT NOT NULL,
  due_date TEXT,
  links TEXT[] DEFAULT '{}',
  tags JSONB DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Task assignees (many-to-many)
CREATE TABLE kanban_task_assignees (
  task_id UUID NOT NULL REFERENCES kanban_tasks(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, employee_id)
);

-- Task comments
CREATE TABLE kanban_task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES kanban_tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comment likes
CREATE TABLE kanban_comment_likes (
  comment_id UUID NOT NULL REFERENCES kanban_task_comments(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, employee_id)
);

-- Comment replies
CREATE TABLE kanban_comment_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES kanban_task_comments(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reply likes
CREATE TABLE kanban_reply_likes (
  reply_id UUID NOT NULL REFERENCES kanban_comment_replies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (reply_id, employee_id)
);

-- =====================================================
-- 2. CREATE INDEXES
-- =====================================================

CREATE INDEX idx_kanban_columns_agency_id ON kanban_columns(agency_id);
CREATE INDEX idx_kanban_columns_position ON kanban_columns(agency_id, position);

CREATE INDEX idx_kanban_tasks_agency_id ON kanban_tasks(agency_id);
CREATE INDEX idx_kanban_tasks_column_id ON kanban_tasks(column_id);
CREATE INDEX idx_kanban_tasks_sort_order ON kanban_tasks(column_id, sort_order);
CREATE INDEX idx_kanban_tasks_created_by ON kanban_tasks(created_by);

CREATE INDEX idx_kanban_task_assignees_task_id ON kanban_task_assignees(task_id);
CREATE INDEX idx_kanban_task_assignees_employee_id ON kanban_task_assignees(employee_id);

CREATE INDEX idx_kanban_task_comments_task_id ON kanban_task_comments(task_id);
CREATE INDEX idx_kanban_task_comments_author_id ON kanban_task_comments(author_id);

CREATE INDEX idx_kanban_comment_likes_comment_id ON kanban_comment_likes(comment_id);
CREATE INDEX idx_kanban_comment_likes_employee_id ON kanban_comment_likes(employee_id);

CREATE INDEX idx_kanban_comment_replies_comment_id ON kanban_comment_replies(comment_id);
CREATE INDEX idx_kanban_comment_replies_author_id ON kanban_comment_replies(author_id);

CREATE INDEX idx_kanban_reply_likes_reply_id ON kanban_reply_likes(reply_id);
CREATE INDEX idx_kanban_reply_likes_employee_id ON kanban_reply_likes(employee_id);

-- =====================================================
-- 3. RLS POLICIES
-- =====================================================

ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_comment_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_reply_likes ENABLE ROW LEVEL SECURITY;

-- Kanban columns policies
CREATE POLICY "Agency members can view columns"
  ON kanban_columns FOR SELECT
  USING (is_agency_member(agency_id));

CREATE POLICY "Agency members can insert columns"
  ON kanban_columns FOR INSERT
  WITH CHECK (is_agency_member(agency_id));

CREATE POLICY "Agency members can update columns"
  ON kanban_columns FOR UPDATE
  USING (is_agency_member(agency_id));

CREATE POLICY "Agency members can delete columns"
  ON kanban_columns FOR DELETE
  USING (is_agency_member(agency_id));

-- Kanban tasks policies
CREATE POLICY "Agency members can view tasks"
  ON kanban_tasks FOR SELECT
  USING (is_agency_member(agency_id));

CREATE POLICY "Agency members can insert tasks"
  ON kanban_tasks FOR INSERT
  WITH CHECK (is_agency_member(agency_id));

CREATE POLICY "Agency members can update tasks"
  ON kanban_tasks FOR UPDATE
  USING (is_agency_member(agency_id));

CREATE POLICY "Agency members can delete tasks"
  ON kanban_tasks FOR DELETE
  USING (is_agency_member(agency_id));

-- Task assignees policies (inherit from task's agency)
CREATE POLICY "Agency members can view task assignees"
  ON kanban_task_assignees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM kanban_tasks
      WHERE kanban_tasks.id = task_id
      AND is_agency_member(kanban_tasks.agency_id)
    )
  );

CREATE POLICY "Agency members can insert task assignees"
  ON kanban_task_assignees FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kanban_tasks
      WHERE kanban_tasks.id = task_id
      AND is_agency_member(kanban_tasks.agency_id)
    )
  );

CREATE POLICY "Agency members can delete task assignees"
  ON kanban_task_assignees FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM kanban_tasks
      WHERE kanban_tasks.id = task_id
      AND is_agency_member(kanban_tasks.agency_id)
    )
  );

-- Task comments policies
CREATE POLICY "Agency members can view task comments"
  ON kanban_task_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM kanban_tasks
      WHERE kanban_tasks.id = task_id
      AND is_agency_member(kanban_tasks.agency_id)
    )
  );

CREATE POLICY "Agency members can insert task comments"
  ON kanban_task_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kanban_tasks
      WHERE kanban_tasks.id = task_id
      AND is_agency_member(kanban_tasks.agency_id)
    )
  );

CREATE POLICY "Agency members can delete their own comments"
  ON kanban_task_comments FOR DELETE
  USING (
    author_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

-- Comment likes policies
CREATE POLICY "Agency members can view comment likes"
  ON kanban_comment_likes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM kanban_task_comments
      JOIN kanban_tasks ON kanban_tasks.id = kanban_task_comments.task_id
      WHERE kanban_task_comments.id = comment_id
      AND is_agency_member(kanban_tasks.agency_id)
    )
  );

CREATE POLICY "Agency members can insert comment likes"
  ON kanban_comment_likes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kanban_task_comments
      JOIN kanban_tasks ON kanban_tasks.id = kanban_task_comments.task_id
      WHERE kanban_task_comments.id = comment_id
      AND is_agency_member(kanban_tasks.agency_id)
    )
  );

CREATE POLICY "Agency members can delete their own comment likes"
  ON kanban_comment_likes FOR DELETE
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

-- Comment replies policies
CREATE POLICY "Agency members can view comment replies"
  ON kanban_comment_replies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM kanban_task_comments
      JOIN kanban_tasks ON kanban_tasks.id = kanban_task_comments.task_id
      WHERE kanban_task_comments.id = comment_id
      AND is_agency_member(kanban_tasks.agency_id)
    )
  );

CREATE POLICY "Agency members can insert comment replies"
  ON kanban_comment_replies FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kanban_task_comments
      JOIN kanban_tasks ON kanban_tasks.id = kanban_task_comments.task_id
      WHERE kanban_task_comments.id = comment_id
      AND is_agency_member(kanban_tasks.agency_id)
    )
  );

CREATE POLICY "Agency members can delete their own replies"
  ON kanban_comment_replies FOR DELETE
  USING (
    author_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

-- Reply likes policies
CREATE POLICY "Agency members can view reply likes"
  ON kanban_reply_likes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM kanban_comment_replies
      JOIN kanban_task_comments ON kanban_task_comments.id = kanban_comment_replies.comment_id
      JOIN kanban_tasks ON kanban_tasks.id = kanban_task_comments.task_id
      WHERE kanban_comment_replies.id = reply_id
      AND is_agency_member(kanban_tasks.agency_id)
    )
  );

CREATE POLICY "Agency members can insert reply likes"
  ON kanban_reply_likes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kanban_comment_replies
      JOIN kanban_task_comments ON kanban_task_comments.id = kanban_comment_replies.comment_id
      JOIN kanban_tasks ON kanban_tasks.id = kanban_task_comments.task_id
      WHERE kanban_comment_replies.id = reply_id
      AND is_agency_member(kanban_tasks.agency_id)
    )
  );

CREATE POLICY "Agency members can delete their own reply likes"
  ON kanban_reply_likes FOR DELETE
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 4. ENABLE REALTIME
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE kanban_columns;
ALTER PUBLICATION supabase_realtime ADD TABLE kanban_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE kanban_task_assignees;
ALTER PUBLICATION supabase_realtime ADD TABLE kanban_task_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE kanban_comment_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE kanban_comment_replies;
ALTER PUBLICATION supabase_realtime ADD TABLE kanban_reply_likes;

-- =====================================================
-- 5. SEED DEFAULT COLUMNS FUNCTION
-- =====================================================

-- Function to seed default kanban columns for an agency
CREATE OR REPLACE FUNCTION seed_default_kanban_columns(p_agency_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Only seed if no columns exist for this agency
  IF NOT EXISTS (SELECT 1 FROM kanban_columns WHERE agency_id = p_agency_id) THEN
    INSERT INTO kanban_columns (agency_id, slug, title, color, position)
    VALUES
      (p_agency_id, 'todo', 'To-do', 'blue', 0),
      (p_agency_id, 'in_progress', 'In Progress', 'orange', 1),
      (p_agency_id, 'done', 'Done', 'green', 2);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Seed default columns for all existing agencies
DO $$
DECLARE
  agency_record RECORD;
BEGIN
  FOR agency_record IN SELECT id FROM agencies LOOP
    PERFORM seed_default_kanban_columns(agency_record.id);
  END LOOP;
END $$;

-- =====================================================
-- 6. UPDATED_AT TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_kanban_columns_updated_at
  BEFORE UPDATE ON kanban_columns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kanban_tasks_updated_at
  BEFORE UPDATE ON kanban_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
