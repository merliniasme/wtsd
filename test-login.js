import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  "projectId": "gen-lang-client-0412863020",
  "appId": "1:780780008464:web:b4b861df5a5c813f350695",
  "apiKey": "AIzaSyD0My09lUSq3ogqRjsQmO-m6xA_QUDsrmw",
  "authDomain": "gen-lang-client-0412863020.firebaseapp.com"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, "ai-studio-whosthespydictio-05bfba50-35ba-4803-957d-6688397c4095");

async function run() {
  try {
    const cred2 = await createUserWithEmailAndPassword(auth, 'admin@spy.local', 'admin123');
    console.log("Created user:", cred2.user.uid);
    await setDoc(doc(db, 'users', cred2.user.uid), {
        id: cred2.user.uid,
        username: 'admin',
        role: 'admin',
        permissions: { canEditDictionary: true, canBackupRestore: true }
    });
    console.log("Seeded successfully");
  } catch (e2) {
    console.error("Seed failed:", e2);
  }
  process.exit(0);
}
run();
