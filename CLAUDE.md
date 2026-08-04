# SalesTrack — Project Context

## What this is
Web-based Sales Team Management and Performance Tracking System for service-based SMEs in Kenya.
Diploma IS Project — Strathmore University. Student: David Mucheru Gachuhi (220235).
Supervisor: Daniel Simiyu.

## Stack
HTML5, CSS3, vanilla JS, Bootstrap 5, Supabase (Postgres + Auth + RLS), Chart.js, SortableJS.
No frameworks, no build step. Deployed on Vercel, version controlled on GitHub.

## Critical constraint
This is coursework. I must understand every line of code — do not make silent, unexplained
changes. Explain what you're changing and why before/as you do it. Do not add features not
listed in Locked FRs below without asking first. Lecturer's rule: AI use is fine, but I must
be able to explain any line if questioned.

## Locked requirements (do not deviate without asking)
- 3 roles: Administrator, Sales Manager, Sales Agent
- 6 modules: Auth, Lead Pipeline (7-stage Kanban), Contact Management, Activity/Call Logging,
  Dual Performance Scorecards, Reporting Dashboard
- 7 pipeline stages (exact names, case-sensitive): New Lead, Contacted, Qualified, Proposal Sent,
  Negotiation, Closed Won, Closed Lost

## Design tokens (already in css/style.css)
Dark mode default, black/white base, green accent (#22c55e), no purple gradients, no emojis.

## Style/scope guardrails
- Keep code readable at "diligent diploma student" level — no advanced abstractions,
  no unnecessary refactors into frameworks or build tools
- Flat file structure (one JS file per page, no subfolders) is intentional, not a mistake
- Folder names MUST be lowercase (css/, js/) — Vercel/Linux is case-sensitive, macOS isn't.
  A capital-letter folder name broke production once already. Do not reintroduce.

## What's built and confirmed working (as of tonight)
- Authentication: login, role fetch, localStorage session, logout, auth guard on all pages
- Contact Management: full CRUD via modal
- Lead Pipeline: Kanban display, SortableJS drag-drop with Supabase persistence, rules-based
  lead scoring (stage-weighted), overdue flagging (>3 days since last_contacted_at), Closed
  Won/Lost reason capture via prompt(), Add Lead modal
- Activity/Call Logging: modal from pipeline lead card, inserts to `activities` table
- Performance Scorecards: agent self-assessment form, manager scoring form + comparison table
- Reporting Dashboard: 4 Chart.js charts (leads by stage, won/lost, activity volume by agent,
  self vs manager scores)
- Admin panel (admin.html): role assignment, activate/deactivate users, audit log view
  (audit_logs table + Postgres trigger, currently only logs lead stage changes)
- RLS on every table; helper function `is_manager_or_admin()` and `is_admin()` used to avoid
  recursive-policy bugs (hit this once on `users` table — fixed via SECURITY DEFINER function)
- Deployed live on Vercel, connected to GitHub, folder-casing bug fixed

## Known gaps vs the locked documentation (audit done before handoff — see TASKS.md)
See TASKS.md for the prioritized list. Summary: role-specific dashboards don't really exist
(all roles share one generic dashboard.html), no activity feed/history view exists anywhere,
Closed Won/Lost reasons are captured but never displayed again, no Lead Detail view, Manager
can't reassign leads or configure scoring rules, mobile/responsive behavior untested.

## Database schema notes
- `contacts.lead_id` in the original diagram was flipped to `leads.contact_id` during build —
  deliberate improvement (one contact can have multiple leads over time), needs to be reflected
  in the Chapter 4 diagram, not fixed in code.
- `system_lookups` table from early FRs was never built — scoped out, role/status management
  in admin.html substitutes for it. Needs an honest note in Ch6 future work, not new code
  unless explicitly asked.
