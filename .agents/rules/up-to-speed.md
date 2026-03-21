---
trigger: always_on
---

## Session Initialization

At the start of every new session, or whenever a new model is loaded, you MUST
perform the following steps before doing anything else:

### Step 1 — Read the Change Log

Read the full contents of:
`C:\Old Hawthorne Projects\DailyBrief\.claude\changes_made\CHANGES.md`

### Step 2 — Read the Project Brief

Read the full contents of: `C:\Old Hawthorne Projects\DailyBrief\CLAUDE.md`

### Step 3 — Build Your Context

After reading both files, summarize the following before proceeding with any
task:

**Project:** Brief description of what DailyBrief is and its current state.

**Last 3 Tasks Completed:** Pull the 3 most recent entries from CHANGES.md and
summarize what was done.

**Current Status:** What is in progress, incomplete, or was the last thing
worked on.

**Immediate Next Step:** What the developer is likely picking up from based on
the last CHANGES.md entry.

### Step 4 — Confirm Before Proceeding

Output this exact line before starting any work:

> "Context loaded. Ready to continue from [LAST TASK TITLE FROM CHANGES.md]."

---

Rules:

- Never skip this initialization, even if the session seems straightforward
- If CHANGES.md does not exist yet, say so and ask the developer to describe
  where the project stands before proceeding
- If CLAUDE.md does not exist, flag it immediately and ask for a project brief
  before doing any work
- Do not rely on training knowledge alone — always read the files first
- Treat CHANGES.md as the source of truth for project history
