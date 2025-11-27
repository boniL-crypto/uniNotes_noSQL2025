# Statecharts

This document captures the lifecycle statecharts for the three core domain objects in UniNotes: `User`, `Note`, and `Report`. Diagrams are expressed in Mermaid (`stateDiagram-v2`) so they can be rendered in VS Code, GitHub, and many Markdown viewers.

Notes on notation:
- Events are shown on transitions. Optional guards appear in square brackets, and actions after a slash.
- Start is `[*]` and terminal states are also `[*]` or explicit `final` states like `Deleted`.

## User

Key fields and drivers:
- `isActive:Boolean` — deactivation/activation toggles.
- `emailVerified:Boolean` — email verification gate on login.
- `pendingDeletion:{ status: 'pending'|'approved'|'rejected', requestedAt }` — self-service deletion workflow.

```mermaid
stateDiagram-v2
  [*] --> Unverified: Register

  Unverified --> Active: VerifyEmail [token valid]/emailVerified=true
  Unverified --> Unverified: ResendVerification

  state "Active" as Active
  state "Deactivated" as Deactivated
  state "Pending Deletion" as PendingDeletion
  state "Deleted" as Deleted

  Active --> Deactivated: DEACTIVATE/revokeTokens
  Deactivated --> Active: ACTIVATE/restoreAccess

  Active --> PendingDeletion: REQUEST_DELETION/by user
  Deactivated --> PendingDeletion: REQUEST_DELETION/by user

  PendingDeletion --> Deleted: ADMIN_APPROVE_DELETE/anonymizeData+removeAvatar
  PendingDeletion --> Active: ADMIN_REJECT_DELETE/notifyUser

  Active --> Deleted: ADMIN_DELETE/anonymizeData+removeAvatar
  Deactivated --> Deleted: ADMIN_DELETE/anonymizeData+removeAvatar

  Deleted --> [*]
```

Operational notes:
- Registration creates an Unverified account; login requires `emailVerified = true`.
- Admins toggle `isActive` via Deactivate/Activate; this does not change verification history.
- Deletion can happen via approved user request or direct admin action; in both cases data cleanup is triggered.

## Note

Key fields and drivers:
- `visibility: 'public'|'private'`
- `reportsCount:Number`
- `isOrphaned:Boolean` — set when uploader account is removed (flag; does not change visibility).

```mermaid
stateDiagram-v2
  [*] --> Uploading
  Uploading --> Stored: VALIDATED
  Uploading --> Error: VALIDATION_ERROR/captureError

  Stored --> Published: SET_PUBLIC
  Stored --> Private: SET_PRIVATE
  Stored --> Deleted: UPLOADER_DELETE
  Stored --> Reported: REPORT_SUBMITTED

  Published --> Reported: REPORT_SUBMITTED
  Published --> Deleted: UPLOADER_DELETE

  Private --> Reported: REPORT_SUBMITTED
  Private --> Deleted: UPLOADER_DELETE

  Reported --> Review: ADMIN_OPEN
  Reported --> Deleted: UPLOADER_DELETE

  Review --> Resolved: ADMIN_RESOLVE
  Review --> Deleted: ADMIN_DELETE_NOTE

  Resolved --> Deleted: UPLOADER_DELETE

  %% Ancillary flag transition (note remains in its visibility state)
  Published --> Published: UPLOADER_REMOVED/set isOrphaned=true
  Private --> Private: UPLOADER_REMOVED/set isOrphaned=true
  Reported --> Reported: UPLOADER_REMOVED/set isOrphaned=true
  Review --> Review: UPLOADER_REMOVED/set isOrphaned=true
  Resolved --> Resolved: UPLOADER_REMOVED/set isOrphaned=true

  Deleted --> [*]
  Error --> [*]
```

Operational notes:
- "Uploading" covers the period between file submission and validation. On success, metadata is persisted in `Stored`, then visibility is chosen.
- Reporting a note routes it to admin review. Admin can resolve (keep or edit note) or delete it.
- `isOrphaned` is a flag set when the uploader account is deleted; it does not change the note's main lifecycle state.

## Report

Key fields and drivers:
- `status: 'pending'|'reviewed'|'resolved'|'rejected'`

```mermaid
stateDiagram-v2
  [*] --> Pending
  Pending --> Reviewed: REVIEW

  Reviewed --> Resolved: RESOLVE/setResolvedAt+notifyReporter
  Reviewed --> Rejected: REJECT/setRejectedAt

  Reviewed --> Deleted: DELETE
  Resolved --> Deleted: DELETE
  Rejected --> Deleted: DELETE

  Deleted --> [*]
```

Operational notes:
- Only `Reviewed` reports can transition to `Rejected` or `Resolved` (matching `reportService.updateStatus`).
- Deletion is allowed for any non-pending report; pending items remain in the queue until reviewed.

---

How to view: many Markdown previewers auto-render Mermaid. In VS Code, enable built-in preview or an extension that supports Mermaid to visualize these diagrams.
