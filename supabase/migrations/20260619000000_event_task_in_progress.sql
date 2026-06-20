-- Add the "being worked on" state to event tasks.
-- in_progress: true = a crew member tapped the task as actively being worked on.
-- Derived 3-state in the app: is_completed -> done, in_progress -> in progress, else -> todo.
-- is_completed remains the single source of truth for "done"; the two are never both true.
ALTER TABLE event_tasks
  ADD COLUMN in_progress boolean NOT NULL DEFAULT false;

-- Enable live cross-device sync for event tasks (the table was not in the publication).
-- REPLICA IDENTITY FULL so UPDATE payloads carry the full row for clean realtime reconciliation.
ALTER PUBLICATION supabase_realtime ADD TABLE event_tasks;
ALTER TABLE event_tasks REPLICA IDENTITY FULL;
