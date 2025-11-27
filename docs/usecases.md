# UniNotes Essential Use Case Scenarios (Condensed)

This document provides textual scenarios for the core, high‑value use cases. Low‑level operations (individual delete actions, etc.) are intentionally folded into aggregate management cases to keep the model focused, per guidance.

---
## 1. Register (Student)
**Primary Actor:** Student  
**Goal:** Obtain a new UniNotes account.  
**Trigger:** User selects "Create Account".  
**Preconditions:** Registration page is displayed; user not already authenticated.  
**Postconditions:** Active student account persisted; user optionally auto‑logged in.

### Main Flow
1. Student enters required profile data (name, email, password, institution).
2. System validates input & checks email uniqueness.
3. System hashes password and creates student record (status=Active).
4. System sends welcome/verification notification (optional).
5. System establishes authenticated session or prompts login (config choice).

### Alternate / Error Flows
A1: Email Already Exists → System shows error; student may retry or recover account.
A2: Weak Password → System enforces strength rules and requests revision.
A3: Verification Required → Account marked PendingVerification until email link processed.

### Assumptions
- Institutional affiliation optional (can be enriched later).  
- Email verification strategy chosen (immediate or deferred).

---
## 2. Upload Note (Student / SuperAdmin)
**Primary Actor:** Student (SuperAdmin also permitted)  
**Goal:** Add a new note file with metadata.  
**Trigger:** User clicks "Upload Note".  
**Preconditions:** Authenticated; storage quota not exceeded.  
**Postconditions:** Note metadata and file stored; ownership linked to actor; searchable index updated.

### Main Flow
1. Actor supplies title, description, course tags, file attachment.
2. System validates file type/size and required metadata fields.
3. System stores file (e.g., in `uploads/`) and creates note document (status=Active, owner=Actor).
4. System updates search index / cache.
5. System returns success with note summary.

### Includes
- Manage Own Note (for later edits).  

### Alternate / Error Flows
E1: Invalid File Type → Reject with allowed types list.
E2: Oversized File → Reject with max size and auto-suggest compression.
E3: Duplicate Title (optional rule) → Prompt to edit title or proceed if duplicates allowed.

### Assumptions
- Virus/malware scan asynchronous (not blocking UI).  
- Tags normalized (lowercase, trimmed).

---
## 3. Manage Own Note (Student / SuperAdmin)
**Primary Actor:** Owner (Student or SuperAdmin)  
**Goal:** Maintain owned note (edit metadata, replace file, remove note).  
**Trigger:** Actor selects note in dashboard.  
**Preconditions:** Actor is authenticated and owns the note; note not locked by moderation.  
**Postconditions:** Updated note state persisted.

### Main Flow (Edit Metadata)
1. Actor opens edit form; modifies fields (title, description, tags).
2. System validates changes and persists updates.
3. System re-indexes search fields.

### File Replacement Subflow
1. Actor selects new file.
2. System validates file constraints; stores new file; updates reference; archives prior file (optional retention policy).

### Removal Subflow
1. Actor chooses "Remove".
2. System soft-deletes (status=Removed) OR hard deletes per retention policy.
3. System updates search index to exclude note.

### Alternate / Error Flows
E1: File Locked (under report review) → System blocks replacement/removal and shows status.
E2: Invalid Metadata → User prompted to correct.

### Assumptions
- Soft delete default; hard purge via scheduled job.  
- Audit trail maintained (old metadata, file hash).

---
## 4. Report Note (Student)
**Primary Actor:** Student  
**Goal:** Flag a note for moderation review.  
**Trigger:** Actor clicks "Report" while viewing a note.  
**Preconditions:** Actor authenticated; note exists & visible.  
**Postconditions:** Report document created (status=Pending); moderator queue updated.

### Main Flow
1. Actor selects reason (plagiarism, offensive, incorrect info, other + comment).
2. System validates reason/comment length.
3. System creates report with timestamps, noteId, reporterId.
4. System notifies moderators (in-app notification or email digest).
5. System reflects "Reported" badge for the actor (optional global badge rules).

### Alternate / Error Flows
E1: Duplicate Active Report by Same Actor → System prevents duplicate and shows existing status.
E2: Note Already Removed → System blocks and shows note status.

### Assumptions
- Multiple distinct users can open separate reports concurrently.  
- Rate limiting prevents spam (e.g., max N reports/hour per user).

---
## 5. Moderate Reports (Moderator / SuperAdmin, Admin read-only)
**Primary Actor:** Moderator  
**Goal:** Review and adjudicate pending reports.  
**Trigger:** Moderator opens report queue.  
**Preconditions:** Authenticated; at least one Pending report.  
**Postconditions:** Report status updated; optional follow-up actions (note removal, notifications) executed.

### Main Flow
1. Moderator filters Pending reports (search by note, reporter, reason).
2. Opens a report; reviews note contents & history.
3. Chooses outcome: Reviewed (no action), Resolved (action taken), Rejected (invalid).
4. If Resolved & action = remove note → System updates note status accordingly.
5. System records decision, timestamp, moderatorId.
6. System triggers notifications to reporter (and owner if action taken).

### Alternate / Error Flows
E1: Concurrent Decision Collision → System detects stale version; prompts refresh.
E2: Note Already Removed by Another Moderator → Outcome auto-adjusted; moderator informed.

### Assumptions
- Optimistic locking on report documents.  
- Moderator actions auditable.

---
## 6. Create Notification (Admin / SuperAdmin)
**Primary Actor:** Admin  
**Goal:** Broadcast an announcement or targeted message.  
**Trigger:** Admin selects "New Notification".  
**Preconditions:** Authenticated; has broadcast permission.  
**Postconditions:** Notification stored; recipients receive entry in inbox.

### Main Flow
1. Admin enters title, message body, recipient scope (all, role-based, specific users).
2. System validates content (length, no empty fields).
3. System resolves recipient list and creates notification records.
4. System pushes real-time event (if enabled) or schedules digest.
5. Admin sees confirmation with delivery counts.

### Alternate / Error Flows
E1: Empty Recipient Result → System warns; admin must adjust scope.
E2: Length Exceeds Policy → System truncates or rejects based on configuration.

### Assumptions
- Editing existing notifications is disallowed (delete + recreate).  
- Bulk creation optimized via batch insert.

---
## 7. View Analytics (Admin / Moderator / SuperAdmin)
**Primary Actor:** Admin or Moderator  
**Goal:** Inspect platform KPIs (note counts, active users, report volume).  
**Trigger:** Actor opens analytics dashboard.  
**Preconditions:** Authenticated; has analytics permission.  
**Postconditions:** Metrics displayed; no data mutation.

### Main Flow
1. Actor loads dashboard.
2. System aggregates metrics (cached snapshot or on-demand queries).
3. System renders charts/tables.
4. Actor may adjust date range/filter, causing refresh.

### Alternate / Error Flows
E1: Cache Miss → System performs full recompute (slower) then seeds cache.
E2: Permission Revoked Mid-Session → Subsequent refresh blocked; message displayed.

### Assumptions
- Heavy aggregations pre-computed (hourly).  
- Real-time counters approximate until next batch.

---
## Relationship Summary
- Includes: Upload Note → Manage Own Note; Collections → Organize Collection; Moderate Reports → View Reports; Manage Notifications → Receive/View Notifications.
- Extends: Report / Like / Download → View Note; Recover Account → Login; Request Deletion → Update Profile.
- Aggregations intentionally group delete/edit operations to avoid clutter (e.g., Admin Account Ops, Manage Own Note, Moderator Manage Note).

---
## Mapping to Further Diagrams
- Activity Diagrams: Elaborate branching inside Moderate Reports and Upload/Manage Note flows.
- Sequence Diagrams: Use actors + boundary/controller/entity partition (e.g., Student → NotesController → NotesService → StorageAdapter → SearchIndex).
- Class Diagrams: Derive core entities (User, Note, Report, Notification, Collection, AnalyticsSnapshot) plus services (NotesService, ReportService, NotificationService).
- State Machine (optional): Note status transitions (Active → Reported → UnderReview → Removed / Restored).

---
## Scenario Template (Reusable)
Name: <Use Case Name>
Primary Actor: <Actor>
Goal: <Business outcome>
Trigger: <Event starting flow>
Preconditions: <State that must hold>
Postconditions: <State after success>
Main Flow:
 1. ...
Alternate / Error Flows:
 A1/E1. Condition → Outcome.
Assumptions: <Context / policies>
Includes: <Mandatory sub-use cases>
Extends: <Optional/alternative use cases>

---
## Next Suggested Artifacts
1. Activity diagram for Moderate Reports (decision-rich).  
2. Sequence diagram for Upload Note (with storage and indexing).  
3. Class diagram refinement using existing `class_domain_model.puml` as baseline.  
4. State machine for Report lifecycle.  
5. Non-functional requirements tie-in (performance thresholds for search & analytics).

---
## Traceability Matrix (Excerpt)
| Requirement Domain | Use Case | Notes |
|--------------------|----------|-------|
| Account Management | Register / Login / Recover | Covers student onboarding & access continuity |
| Notes Lifecycle | Upload / Manage Own / View / Search | Core content operations |
| Engagement | Like / Download / Collections | User interaction & organization |
| Moderation | Report Note / Moderate Reports | Quality & policy enforcement |
| Notifications | Create / Manage / Receive | Communications layer |
| Analytics | View Analytics | Operational visibility |

---
Revision: v1.0 (essential focus). Future revisions may split aggregates if detailed auditing or workflow expansion is required.
