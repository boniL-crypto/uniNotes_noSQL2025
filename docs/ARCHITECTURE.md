# Architecture and Project Layout

This project uses an MVC + services structure to separate HTTP concerns from business logic.

Top-level important folders:

- `models/` - Mongoose schemas
- `routes/` - Thin routers that apply middleware and delegate to controllers
- `controllers/` - Express request handlers. Do not call Mongoose here; call services.
- `services/` - Business logic and DB operations (unit-testable)
- `views/` - Server-rendered admin pages
- `public/` - Static assets and student SPA
- `utils/` - Small helpers, validators, mailer wrapper
- `docs/` - Architecture docs
- `tests/` - Unit and integration tests

## Validation Strategy (Client-First Parallel Flow)

All structure-based validations (email pattern + domain, password complexity & confirmation,
student ID format, required field presence, avatar file type) now execute exclusively on the
client in a parallel style: every field is checked in a single pass and all error messages are
shown simultaneously. The form does not submit until every rule passes.

Server-side validation has been intentionally reduced to essential application concerns only:

1. Duplicate checks: email & studentId uniqueness.
2. Avatar magic-byte verification (memoryStorage buffer inspected before write).
3. Persistence: hashing password, writing avatar once, creating the user record.
4. Email workflows: verification, reset, notifications.

The user registration & profile update flows follow an inputs-first memoryStorage design. The
avatar file is held in memory, validated for magic bytes only after all other inputs pass, and
written to disk exactly once after the user record successfully saves. If any failure occurs
post-write, the file is cleaned up.

College/course relational checks were removed from the backend because the frontend now derives
the course dropdown strictly from the chosen college using live database data. This keeps the
activity diagrams aligned with the real behavior and avoids redundant server logic.

Migration approach:
1. Scaffold `controllers/` and `services/` (done).
2. Pick one area to refactor (reports done). Next candidates: `notes`, `notifications`, `users`.
3. Move logic from routes to controller and into a service, keeping route middleware intact.
4. Add unit tests for services as they're migrated.

Notes:
- Routes remain thin and do auth/permission enforcement.
- Controllers format responses and call services for business logic.
- Services are the only layer that talks to Mongoose models.

