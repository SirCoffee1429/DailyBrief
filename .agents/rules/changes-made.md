---
trigger: always_on
---

## Change Tracking

After every code change, update, or new feature addition, you MUST append a new
entry to: `C:\Old Hawthorne Projects\DailyBrief\CHANGES.md`

Each entry must follow this format:

---

### [DATE] — [SHORT TITLE]

**File(s) Changed:** `path/to/file.ext` **Type:** `feature` | `fix` | `refactor`
| `migration` | `config` **Summary:** Brief description of what was changed and
why.

**Details:**

- Bullet points of specific changes made
- Include function names, component names, or SQL objects affected
- Note any dependencies added or removed

---

Rules:

- Never skip this step, even for small changes
- One entry per session minimum, more if changes span multiple features
- If the file does not exist, create it with a `# DailyBrief — Change Log`
  header first
- Do not edit or delete previous entries, only append new ones
- If a change is reverted, log the reversion as its own entry
