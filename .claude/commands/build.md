---
description: Implement the next task incrementally — build, test, verify, commit — then stop.
disable-model-invocation: true
---

Invoke the `incremental-implementation` skill alongside `test-driven-development`.

> **DailyBrief:** one task per `/build`, then stop. Upstream's `/build auto` mode (run the whole plan after one approval) was left out on purpose (Ryan, 2026-11-02).

Pick the next pending task from the plan (`tasks/todo.md`). Then:

1. Read the task's acceptance criteria
2. Load relevant context (existing code, patterns, types)
3. Write a failing test for the expected behavior (RED)
4. Implement the minimum code to pass the test (GREEN)
5. Run the full test suite to check for regressions
6. Run the build to verify compilation
7. Commit with a descriptive message. Stage only the files this task touched plus its task-status update — never `git add -A`
8. Mark the task complete and stop

Stop and ask Ryan (do not push through) when the spec is ambiguous, or the task is high-risk or irreversible: auth/permission changes, data migrations, deletions, deploys, anything touching secrets, or anything you can't undo with `git revert`. For those, follow `doubt-driven-development` and get explicit sign-off first.

If any step fails, follow the `debugging-and-error-recovery` skill.
