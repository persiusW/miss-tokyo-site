# miss-tokyo-site: Claude Code notes

## Memory and context (read first in a cloud session)

This repo holds code only. Claude's memory for this app, the owner's global
rules and anything kept out of git live in the PRIVATE repo
`persiusW/Dashttp-developer-context`.

In a cloud session, before any work, attach that repo to the session (or
`git clone https://github.com/persiusW/Dashttp-developer-context ~/ctx`) and read:

1. `global/CLAUDE.md`: the owner's standing rules for every project. Follow them.
2. `projects/miss-tokyo-site/dev/memory/MEMORY.md` (the index) and `projects/miss-tokyo-site/dev/memory/pending-tasks.md` if present.
   - `projects/miss-tokyo-site/dev/docs/`: this app's specs, plans and audits (kept out of this repo).
   Older copies from other checkouts: `projects/miss-tokyo-site/dev-root/memory/`, `projects/miss-tokyo-site/documents/memory/`, `projects/miss-tokyo-site/icloud/memory/`. Skim their MEMORY.md too: an older checkout can hold notes the main copy lacks.

When you learn something worth keeping, update those memory files and commit
and push `Dashttp-developer-context`. Never put a password, key or token there.
On the owner's Mac, local sessions already have this memory and mirror it with
`~/dev/Github/Dashttp-developer-context/scripts/sync.sh push`.
