# Balady MCQ Firebase App

## Setup

1. Create a Firebase project and enable Firestore and Email/Password Authentication.
2. Copy `.env.example` to `.env`.
3. Fill the `NEXT_PUBLIC_FIREBASE_*` values from Firebase web app settings.
4. Put a Firebase service-account JSON object in `FIREBASE_SERVICE_ACCOUNT_JSON`. Keep this server-only value out of git.
5. Set `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD` in `.env`.
6. Install dependencies with `npm install`.
7. Create the Firebase Auth admin and custom claim with `npm run create-admin`.
8. Deploy `firestore.rules` from the Firebase CLI or Firebase console.
9. Import all source questions with `npm run migrate`.
10. Start the app with `npm run dev`, then open `/` or `/admin`.

The migration uses stable IDs (`question-0001`, etc.) and merges documents, so rerunning it does not create duplicate questions. Existing multilingual fields are preserved when present; missing Bangla or Arabic text falls back to English. The current `MCQ.json` source contains English fields only, so add localized fields before migrating if exact translations are required.

Public users can read questions. Firestore writes require a Firebase Auth user with the server-set `admin: true` custom claim. The admin password is never included in browser code.
"# balady-food-safety-exam" 
