
# Alzheimer's Detection Web App — Final Build Plan

Production-quality medical app: doctors manage patients, upload brain MRI scans, an external Flask CNN API returns stage + confidence + metadata, results are stored with per-patient timeline, analytics, PDF reports, and admin oversight.

## Stack

- Frontend: TanStack Start (React + TS), Tailwind, shadcn/ui, Recharts, jsPDF, qrcode, sonner.
- Backend: Lovable Cloud (Supabase) — auth, Postgres, private Storage.
- ML: External Flask API. `ML_API_URL` (+ optional `ML_API_KEY`) as secrets (placeholders until user sets them). Called only from `createServerFn`.

## Flask API Contract

`POST {ML_API_URL}/predict` — multipart/form-data: `image`, `patient_id`.
```json
{
  "success": true,
  "stage": "Very Mild Demented",
  "confidence": 0.9741,
  "recommendation": "Schedule neurological evaluation.",
  "processing_ms": 1243,
  "model": "ResNet50",
  "version": "1.0",
  "probabilities": { "NonDemented": 0.01, "VeryMildDemented": 0.9741, "MildDemented": 0.013, "ModerateDemented": 0.0029 }
}
```
Health: `GET {ML_API_URL}/health` → `{ status, model, version, uptime_ms }`.

Server validates probability sum ≈ 1.0 (±0.02); mismatch flags `probability_warning` but doesn't fail. Confidence stored 0–1; UI formats as %. Both `recommendation_api` and templated `recommendation_display` persisted.

## Routes

Public: `/`, `/auth`, `/reset-password`.

Doctor (`_authenticated/`): `/dashboard`, `/patients`, `/patients/$id`, `/upload`, `/result/$id`, `/history`, `/profile`.

Admin (`_authenticated/_admin/`, gated by `has_role('admin')`): `/admin`, `/admin/analytics`, `/admin/users`, `/admin/logs`.

## Database (single migration)

Enums: `app_role` (admin/doctor), `prediction_status` (queued/processing/completed/failed), `gender` (male/female/other).

Tables (all with `created_at`; editable ones with `updated_at` trigger):
- `profiles` (id → auth.users, full_name, hospital_name, email, is_active, notification_prefs jsonb) + signup trigger.
- `user_roles` (user_id, role) + `has_role(uuid, app_role)` SECURITY DEFINER.
- `patients` (id, doctor_id, patient_id text, patient_name, date_of_birth, gender, `UNIQUE (doctor_id, patient_id)`).
- `predictions` (id, user_id, patient_id → patients.id, image_path, stage, confidence numeric(5,4), confidence_level, recommendation_api, recommendation_display, processing_ms, model_name, model_version, probabilities jsonb, probability_warning bool, status, error_message, request_id, heatmap_path nullable).
- `notifications` (id, user_id, type, title, body, read_at).
- `audit_logs` (id, user_id, action, entity, entity_id, request_id, metadata jsonb).
- `ml_health_pings` (id, checked_at, ok, response_ms, model, version, error).

RLS: doctors CRUD own patients/predictions/notifications; admins read all via `has_role`. Grants for `authenticated` + `service_role` on every table.

Storage: private bucket `mri-scans`, path `{doctor_id}/{patient_uuid}/{prediction_uuid}.{ext}`; owner-folder RLS; admins read all. Reserved `heatmaps/` prefix.

## Database Indexes

- `patients`: `(doctor_id)`, `(patient_id)`
- `predictions`: `(user_id)`, `(patient_id)`, `(created_at DESC)`, `(status)`, `(stage)`
- `notifications`: `(user_id, read_at)`
- `audit_logs`: `(user_id)`, `(created_at DESC)`
- `ml_health_pings`: `(checked_at DESC)`

## Server Functions (`src/lib/*.functions.ts`)

- Patients: `listPatients` (paginated), `getPatient`, `createPatient`, `updatePatient`.
- Predictions: `uploadAndPredict`, `listMyPredictions` (paginated + filtered), `getPrediction`, `deletePrediction`, `listPatientPredictions` (paginated).
- Stats: `getDoctorStats` (cached 60s in-memory per user).
- Admin (verify `has_role`, then `await import` `supabaseAdmin`): `listAllPredictions` (paginated), `listUsers` (paginated), `setUserActive`, `assignRole`, `getAdminStats` (cached 60s), `getAnalytics` (cached 60s), `exportPredictionsCsv`, `getCachedMlHealth`, `refreshMlHealth`.
- Notifications: `listNotifications` (paginated), `markRead`.

`uploadAndPredict` executes as a single logical transaction: insert queued row → upload to storage → mark processing → call Flask → in one `.rpc('finalize_prediction', ...)` (SECURITY DEFINER Postgres function) update prediction + insert notification + insert audit log atomically; on any failure delete uploaded object and mark row failed with `error_message` + `request_id`.

## ML API Error Handling

Every prediction call generates a `request_id` (uuid) attached to request headers, prediction row, audit log, and server console log.

Flask response mapping (row marked failed, notification created, audit logged, friendly UI message shown — no internal detail leaked):

- `400` → "The uploaded image could not be processed. Please try a different file."
- `401` → "AI service authentication failed. Please contact the administrator."
- `404` → "AI service endpoint unavailable. Please try again later."
- `408` → "Prediction timed out. Please try again."
- `429` → "AI service is busy. Please try again in a moment."
- `500` → "AI service encountered an internal error. Please try again."
- `503` → "AI service is currently unavailable. Please try again later."
- Network / unset `ML_API_URL` → "AI service is not configured. Please contact the administrator."

## Security

- File extension + MIME + magic-byte check; 10 MB cap.
- Auth required on every mutation; `user_id` from session.
- Per-user upload rate limit (30/min via `audit_logs`).
- Audit log on upload, delete, role change, deactivate, patient create/update.
- Private bucket; short-lived signed URLs.

## UI / Design

- Medical tokens in `src/styles.css`: primary blue #2563EB, cyan accent, success/warning/error, glassmorphism, dark mode.
- Motion: route transitions, animated pipeline steps, animated probability bars.
- Sonner toasts, skeletons, empty states, responsive (desktop/tablet/mobile).
- Header notification center with unread badge.
- Accessibility: semantic HTML, `aria-label` on icon buttons, keyboard nav, focus rings, single `<main>`, tokens only (no arbitrary grays).

## PDF Report (jsPDF + qrcode)

Hospital, doctor, patient (id/name/age/gender), upload date, embedded MRI image, stage, confidence % + level, probability table, templated recommendation, model + version, QR (→ `/result/$id`), signature line.

## Folder Structure

```
src/
  components/{dashboard,upload,reports,charts,admin,ui}
  lib/{api,pdf,recommendations,ml-client}.ts + *.functions.ts
  hooks/  types/  utils/
  routes/  styles.css
```

## Deployment Architecture

```
Browser (React / TanStack Start)
      │
      ▼
Lovable Cloud (Cloudflare Workers SSR)
      │
      ├──► Supabase (Auth · Postgres · Storage)
      └──► TanStack Server Functions
                   │
                   ▼
             Flask API (Python)
             TensorFlow + OpenCV
             ResNet50 / EfficientNet
                   │
                   ▼
             Prediction JSON → Supabase → Dashboards
```

## Secrets

`ML_API_URL`, optional `ML_API_KEY` — placeholders; user configures later.

## Build Requirements

- Generate all pages, layouts, routes, components, hooks, server functions, migrations, storage policies, auth, RBAC, and UI.
- No mock data unless required because `ML_API_URL` is unset.
- TypeScript throughout.
- TanStack Start routing + server functions only.
- Supabase RLS on every protected resource.
- All secrets stay server-side; `ML_API_URL`/`ML_API_KEY` never reach the browser.
- Every prediction request runs inside a server function.
- Responsive: desktop, tablet, mobile.
- Accessibility best practices (semantic HTML, keyboard nav, ARIA).
- Follow the folder structure above.
- Clean, modular, reusable components.
- Loading / empty / success / error states on every page.
- Zod validation + friendly error messages on every form.
- Do not remove or simplify any feature; implement prerequisites automatically.
- Optimistic UI (notifications mark-read, patient CRUD) with rollback via TanStack Query `onMutate`/`onError`.
- Every route wraps content in an `errorComponent` + `notFoundComponent` with a friendly fallback.
- Log unexpected server errors with a unique `request_id`; surface the id in the friendly UI error for support.
- Multi-step operations (upload → prediction → notification → audit log) run atomically via a SECURITY DEFINER Postgres function + storage cleanup on failure.
- Server-side pagination + filtering on prediction history, audit logs, patient lists, admin tables (no full-table loads).
- Cache dashboard/analytics stats ~60s to reduce DB load.
- Disable the Upload button + drop zone while a prediction is in progress to prevent duplicates.

## Completion Criteria

Home · Auth · Doctor dashboard · Patient management · Upload workflow · Flask integration · Results · History · Patient timeline · Notifications · PDF reports · Admin dashboard · Analytics · User management · Audit logs · CSV export · ML health monitoring · Dark mode · Responsive UI · Secure auth · Supabase storage · Migrations · RLS · Server functions · Production-ready structure.

## Acceptance Tests

- ✓ Doctor can register and sign in.
- ✓ Doctor can create a patient.
- ✓ Doctor can upload an MRI scan.
- ✓ Flask API prediction is saved.
- ✓ Patient timeline displays all predictions.
- ✓ PDF report downloads successfully.
- ✓ Notifications are created.
- ✓ Admin can view analytics.
- ✓ Admin can manage users.
- ✓ RLS prevents doctors from viewing other doctors' data.
- ✓ Missing `ML_API_URL` produces a graceful UI error.
- ✓ Responsive layout works on desktop, tablet, and mobile.
- ✓ Accessibility audit passes basic keyboard navigation and semantic checks.

## Important Notes

- No CNN training inside the app; the model is served by the external Flask API.
- If `ML_API_URL` is unset, UI informs the user gracefully — never crashes.
- Deployable without architecture changes.
- Future Enhancements (Grad-CAM, multi-image compare, model switching, batch uploads, doctor notes, appointment reminders, email, OpenAPI, Docker, CI/CD, tests) are documentation only — not built.

## Milestones (execution order)

1. Enable Lovable Cloud + single migration (enums, tables, indexes, triggers, RLS, grants, `has_role`, `finalize_prediction`) + storage bucket & policies.
2. Auth (`/auth`, `/reset-password`), profile trigger, role helpers.
3. Home + theme tokens + dark mode.
4. Patients CRUD (paginated) + `/patients` + `/patients/$id` timeline.
5. Upload flow + Flask server fn (request_id, error map, atomic finalize) + `/upload` + `/result/$id` + PDF export.
6. Doctor dashboard (cached stats) + history (paginated + filters) + notifications (optimistic).
7. Admin dashboard, analytics, users, logs (paginated), cached ML health, CSV export.
8. Polish: skeletons, empty states, animations, responsive + a11y pass, acceptance-test sweep.

## Techniques Used

- **Deep Learning & CNNs**: ResNet50 architecture for multi-class medical image classification.
- **Transfer Learning**: Utilizing ImageNet pre-trained weights for feature extraction.
- **Image Preprocessing**: Standardized resizing (224x224), RGB channel conversion, and mean/std normalization.
- **Server-Side Rendering (SSR) & Server Functions**: TanStack Start executing backend logic (API keys, Supabase clients) exclusively on the server to prevent client-side exposure.
- **Row-Level Security (RLS)**: PostgreSQL-level security policies isolating patient registries and prediction history per physician.
- **Role-Based Access Control (RBAC)**: Custom database enums and `SECURITY DEFINER` functions to segregate 'admin' and 'doctor' privileges.
- **Atomic Database Transactions**: Multi-step operations (upload, inference, audit log, notification) wrapped in a PostgreSQL RPC function to prevent orphaned data on failure.
- **Secure Object Storage**: Short-lived Signed URLs generated dynamically for private MRI scan access.
- **RESTful API Integration**: Python Flask serving as an independent inference microservice, consumed by the Node/TypeScript backend.
- **Client-Side Document Generation**: Generating dynamic clinical PDF sheets in the browser using `jsPDF` and QR codes.
