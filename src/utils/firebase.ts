import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  "projectId": "gen-lang-client-0412863020",
  "appId": "1:780780008464:web:b4b861df5a5c813f350695",
  "apiKey": "AIzaSyD0My09lUSq3ogqRjsQmO-m6xA_QUDsrmw",
  "authDomain": "gen-lang-client-0412863020.firebaseapp.com",
  "storageBucket": "gen-lang-client-0412863020.firebasestorage.app",
  "messagingSenderId": "780780008464",
  "measurementId": "",
  "oAuthClientId": "780780008464-sqlqgso8kg0d25h2bcpctohel6nm6k4j.apps.googleusercontent.com",
  "recaptchaSiteKey": "",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, "ai-studio-whosthespydictio-05bfba50-35ba-4803-957d-6688397c4095");
