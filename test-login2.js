import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, getDocs, collection } from "firebase/firestore";

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
  const cred = await signInWithEmailAndPassword(auth, 'admin@spy.local', 'admin123');
  console.log("Logged in:", cred.user.uid);
  try {
    const d = await getDoc(doc(db, 'users', cred.user.uid));
    console.log("Read own profile:", d.exists());
  } catch(e) { console.error("Read profile error:", e.message); }
  
  try {
    const words = await getDoc(doc(db, 'dictionary', 'main'));
    console.log("Read dictionary:", words.exists());
  } catch(e) { console.error("Read dict error:", e.message); }
  
  try {
    const users = await getDocs(collection(db, 'users'));
    console.log("Read all users:", users.size);
  } catch(e) { console.error("Read all users error:", e.message); }
  
  process.exit(0);
}
run();
