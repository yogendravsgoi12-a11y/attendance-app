# Attendance App — Phase 1 (core loop)

Register students with a photo, then upload a classroom photo to
automatically mark who's present. This is the core loop only — no login,
no subjects/reports yet. Those come once this works for you.

## What's in here

```
src/
  supabaseClient.js   connects to your database
  face.js             loads face-api.js and compares faces
  App.jsx             three tabs: Register / Take Attendance / Students
  pages/
    RegisterStudent.jsx
    TakeAttendance.jsx
    StudentsList.jsx
supabase/
  schema.sql           the database tables + storage buckets, run once
```

## Setup (one time)

1. **Create a free Supabase project** at https://supabase.com if you don't
   have one.

2. **Run the schema.** In your Supabase dashboard: SQL Editor → New query →
   paste the contents of `supabase/schema.sql` → Run. This creates the
   `students` and `attendance` tables and two storage buckets for photos.

3. **Get your API keys.** In the dashboard: Project Settings → API. Copy
   the "Project URL" and the "anon public" key.

4. **Set up your environment file.**
   ```
   cp .env.example .env
   ```
   Then open `.env` and paste in your Project URL and anon key.

5. **Install and run.**
   ```
   npm install
   npm run dev
   ```
   Open the URL it prints (usually http://localhost:5173).

## Trying it out

1. Go to **Register Student**, enter an ID and name, upload a clear
   front-facing photo, and submit.
2. Register a second student the same way.
3. Go to **Students** — both should appear. Refresh the page — they're
   still there, because they're in the database, not just memory.
4. Go to **Take Attendance**, upload a photo containing both students,
   click **Scan Faces**. You should see both matched with a confidence
   score.
5. Click **Confirm & Save Attendance**.
6. Upload a second classroom photo with only one of the two students,
   scan again — the other should show as **absent**.

## Notes on the face matching

- `MATCH_THRESHOLD` in `src/face.js`/`TakeAttendance.jsx` controls how
  strict matching is (lower = stricter). Start at 0.5 and adjust based on
  your own test photos.
- The face detection models are loaded from a public demo server
  (`justadudewhohacks.github.io`) for convenience. For anything beyond
  testing, download the model files once and put them in a `public/models`
  folder in this project, then point `MODEL_URL` in `src/face.js` at
  `/models` instead — that way you're not depending on someone else's
  server staying up.

## Self-hosting the face detection models

The app now loads its face detection models from this project's own
`public/models` folder instead of a public demo server. Before running the
app, download the model files once:

```
mkdir -p public/models
curl -L -o public/models/tiny_face_detector_model-weights_manifest.json https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json
curl -L -o public/models/tiny_face_detector_model-shard1 https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-shard1
curl -L -o public/models/face_landmark_68_model-weights_manifest.json https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json
curl -L -o public/models/face_landmark_68_model-shard1 https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1
curl -L -o public/models/face_recognition_model-weights_manifest.json https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-weights_manifest.json
curl -L -o public/models/face_recognition_model-shard1 https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard1
curl -L -o public/models/face_recognition_model-shard2 https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard2
```

## What's intentionally left out of this phase

- Login / roles (admin vs teacher) — everyone who has the app can read
  and write right now, controlled only by the Supabase policies in
  `schema.sql`.
- Subjects, sessions, attendance history/reports, dashboard, exports.
- These map directly onto the full spec you gave me — once this core
  loop works for you, tell me and I'll add them on top of this, table by
  table, page by page.
