# Department Communication — Acknowledgements ("Likes") + Local Name Storage

**Date:** 2026-06-26
**Component:** `src/components/ManagementWhiteboard.jsx` (Office Department Communication board)
**Status:** Approved design — ready for implementation

## Problem

The Department Communication board lets managers post notes but has no way to:
1. Acknowledge a note ("I've seen / I'm on it") so a poster knows who has read it.
2. Reliably remember who the current device's user is — the name bar exists only on
   the full `/office/communication` page and is hidden on the dashboard-embedded board,
   so dashboard posts default to the generic `'Manager'`.

## Audience / trust model

A small group of managers (≈3–6), each on their **own personal device**. No real auth.
Identity is a self-declared name anchored to the device. This scale makes a
localStorage-based identity acceptable.

## Feature 1 — Acknowledgements ("Acknowledge / Seen")

A like = "I've read & acknowledge this note." One acknowledgement per person, toggleable.
A note shows a count and, on demand, the list of names who acknowledged.

### Storage (Option A — separate table)

```sql
create table public.management_note_likes (
  id          uuid primary key default gen_random_uuid(),
  note_id     uuid not null references public.management_notes(id) on delete cascade,
  device_id   text not null,
  author_name text not null,
  created_at  timestamptz default now(),
  unique (note_id, device_id)
);
create index management_note_likes_note_id_idx on public.management_note_likes (note_id);
```

- `unique (note_id, device_id)` makes "one ack per person" a DB guarantee.
- Toggle = insert a row (acknowledge) or delete the row (un-acknowledge). No
  read-modify-write race.
- `on delete cascade` cleans up likes when a note is deleted.
- RLS enabled with a permissive anon policy mirroring `management_notes`
  ("Enable all for all users").
- Added to the `supabase_realtime` publication (along with `management_notes`,
  which is not currently published).

## Feature 2 — Local name + device identity

Two localStorage keys per device:
- `mgmt_author` — display name (already used today; retained).
- `mgmt_device_id` — stable random UUID, generated once on first use (new).

Acknowledgements and posts are keyed by `device_id` but **display** `author_name`.
Renaming (fixing a typo) keeps prior acks yours because the key is the device, not the
mutable name. Helper module: `src/lib/identity.js` — `getDeviceId()`, `getAuthorName()`,
`setAuthorName(name)`.

### First-time name capture (inline)

When a user taps Acknowledge or Post and `mgmt_author` is empty:
1. Intercept the action; show a small inline prompt ("What's your name?" + confirm) in
   place — not a modal.
2. On confirm: ensure `mgmt_device_id` exists, save both keys, then automatically
   complete the original action (no double-tap).
3. Subsequent actions skip the prompt.

The existing editable name bar stays on the full `/office/communication` page. The
dashboard-embedded board stays bar-free; the inline prompt covers first-timers there.

## UI

Per note, add an **always-visible** footer row (separate from the hover-only
`wb-note-actions` pin/delete cluster):
- Thumbs-up/check icon + count, e.g. `👍 3`.
- Filled with the column accent (`#4ade80`) when this device has acknowledged; outline
  otherwise. Tap toggles (optimistic update, reconciled by realtime).
- Tapping the count expands a compact "Seen by Matt C., Ryan, …" name list.

## Data flow & realtime

- On mount: load notes (existing) + load all likes for visible notes; group likes by
  `note_id` in component state.
- Subscribe to `postgres_changes` (`event: '*'`) on both `management_notes` and
  `management_note_likes`, mirroring the `event_tasks` pattern
  (`supabase.channel(...).on(...).subscribe()`, cleanup via `removeChannel`). On any
  event, reload the affected data.
- Toggle handler updates local state optimistically, then upserts/deletes; realtime
  reconciles other devices.

## Error handling

- All Supabase calls wrapped; on failure, revert the optimistic change and leave a
  console error (no silent swallow). The unique-constraint violation on a double-tap is
  treated as already-acknowledged (no-op), not an error surfaced to the user.

## Testing

- Toggle acknowledge on/off updates count and DB row.
- One ack per device enforced (re-acknowledge is a no-op).
- First-time inline prompt captures name, persists it, completes the original action.
- Second action from same device skips the prompt.
- Realtime: ack on device A appears on device B's open board without refresh.
- Deleting a note cascades its likes.

## Out of scope (YAGNI)

- Emoji / multi-reaction types.
- Real authentication.
- Per-category boards (only `comms` exists today).
