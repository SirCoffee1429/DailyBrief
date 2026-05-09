-- Add subtask hierarchy and AI-generation tracking to event_tasks.
-- parent_id: NULL = root task; non-NULL = subtask of that parent (one level deep only).
-- ON DELETE CASCADE ensures deleting a parent automatically removes its subtasks.
-- is_generated: false = manual (default, backward compatible); true = AI-generated prep task.
ALTER TABLE event_tasks
  ADD COLUMN parent_id    uuid    REFERENCES event_tasks(id) ON DELETE CASCADE,
  ADD COLUMN is_generated boolean NOT NULL DEFAULT false;
