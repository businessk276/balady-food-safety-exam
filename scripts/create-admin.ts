import 'dotenv/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

async function main() {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!serviceAccount || !email || !password) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON, ADMIN_EMAIL, and ADMIN_PASSWORD are required in .env');
  const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(JSON.parse(serviceAccount)) });
  const auth = getAuth(app);
  let user;
  try { user = await auth.getUserByEmail(email); } catch (error: unknown) {
    if ((error as { code?: string }).code !== 'auth/user-not-found') throw error;
    user = await auth.createUser({ email, password });
  }
  await auth.updateUser(user.uid, { email, password, emailVerified: true });
  await auth.setCustomUserClaims(user.uid, { admin: true });
  console.log(`Admin ready: ${email}`);
}

main().catch((error) => { console.error(error); process.exit(1); });
