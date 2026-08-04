# SalesTrack — Remaining Tasks

Audit performed by cross-checking the locked documentation draft (FRs, NFRs, wireframes,
conceptual framework) against the actual built system. Ordered by priority — do NOT reorder
without discussing, since time before demo is limited.

## Priority 1 — Consistency bugs (fix first, low risk, high visibility)
- [ ] Nav bar active-state styling is inconsistent across pages — some pages hardcode green/bold
      on the wrong link (e.g. "Reports" shows green while on Dashboard). Audit all 6+ HTML files,
      make ONLY the current page's own nav link green/bold, every other link plain var(--text).
      Report findings before fixing.
- [ ] Confirm dashboard.js (just added stat cards) actually works for all 3 roles — test as
      admin, manager, agent. Admin/manager should see team-wide counts, agent should see own only.

## Priority 2 — Real functional gaps vs locked FRs (flagged during pre-handoff audit)
- [ ] **Activity feed / history is missing entirely.** Activities can be logged via modal but
      never displayed anywhere — not per-lead, not system-wide. Conceptual Framework (2.5)
      explicitly lists "activity feed" as an expected system output. Needs at minimum: a way to
      see past activities for a given lead (could be a simple list under/near the lead card,
      or inside a new Lead Detail view — see next item).
- [ ] **Won/Lost reasons are captured but never shown again.** `closed_reason` is saved to the
      `leads` table on close but doesn't appear anywhere in the UI afterward. Conceptual
      Framework names "analysis report about why a lead was won or lost" as an output. Minimum
      fix: show the reason on the card itself when in Closed Won/Lost columns, or surface it in
      Reports.
- [ ] **No Lead Detail view.** Wireframe list (4.3.7) includes "Lead Detail View Wireframe" —
      currently leads only exist as Kanban cards with a Log Activity button, no dedicated
      detail screen. Decide: full page or modal (modal is faster, matches the Activity Logging
      pattern already used).
- [ ] **Dashboards aren't role-differentiated per wireframes.** Wireframes name "Sales Agent
      Dashboard" and "Sales Manager Dashboard" as separate designs. Current build has ONE
      generic dashboard.html for all roles (data differs via RLS, but the view/layout doesn't).
      Decide if this needs visual differentiation or if current approach is defensible as-is
      (data differs by role even if layout doesn't) — flag to David for a decision, don't
      just build more without confirming scope.

## Priority 3 — Manager FRs not built (lower visibility, but explicitly in FR table)
- [ ] Manager: "reassign leads between agents" — no UI exists for this at all.
- [ ] Manager: "configure lead scoring rules" — scoring is a hardcoded JS object
      (`stageScores` in pipeline.js). No admin/manager-facing way to edit it.

## Priority 4 — NFR verification (check, don't necessarily build)
- [ ] NFR claims "responsive on desktop and mobile" — never actually tested on a small screen.
      Check Kanban board and modals on a narrow viewport. SortableJS drag-drop may not work
      well with touch — verify, don't assume.
- [ ] NFR claims "queries return efficiently due to indexing" — no custom indexes were created
      beyond Postgres' automatic PK/FK indexes. Decide if this claim needs adjusting in
      documentation or if default indexing is sufficient to defend as-is.

## Explicitly OUT of scope for tonight (documentation fixes, not code — do tomorrow AM)
- [ ] Chapter 4 Database Schema diagram doesn't match actual implementation (contacts/leads
      relationship direction flipped, some fields renamed, system_lookups table never built).
      This is a Chapter 5/documentation task, not a code task — do not "fix" by changing the
      schema back to match an outdated diagram.

## Already confirmed working — do not rebuild
Auth, Contacts CRUD, Pipeline (display/drag-drop/scoring/overdue/reason capture/add lead),
Activity logging (insert only, no display — see P2), Scorecards (self + manager scoring),
Reports (4 charts), Admin panel (roles/status/audit log), Vercel deployment.
