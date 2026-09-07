import { Word } from '../types';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, getDocs, collection, deleteDoc, updateDoc } from 'firebase/firestore';

export interface UserAccount {
  id: string;
  username: string;
  role: 'admin' | 'user';
  permissions: {
    canEditDictionary: boolean;
    canBackupRestore: boolean;
  };
}

export interface AuthResponse {
  token: string;
  user: UserAccount;
}

export class ApiClient {
  static get token() {
    return localStorage.getItem('auth_token') || '';
  }

  static set token(t: string) {
    if (t) localStorage.setItem('auth_token', t);
    else localStorage.removeItem('auth_token');
  }

  static get user(): UserAccount | null {
    const u = localStorage.getItem('auth_user');
    return u ? JSON.parse(u) : null;
  }

  static set user(u: UserAccount | null) {
    if (u) localStorage.setItem('auth_user', JSON.stringify(u));
    else localStorage.removeItem('auth_user');
  }

  static get emailSuffix() {
    return '@spy.local';
  }

  static async login(username: string, password: string):Promise<AuthResponse> {
    const email = username.toLowerCase() + this.emailSuffix;
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Fetch user profile from Firestore
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (!userDoc.exists()) {
        throw new Error('User profile not found in database');
      }
      
      const userData = userDoc.data() as UserAccount;
      this.user = userData;
      this.token = await userCredential.user.getIdToken();
      return { token: this.token, user: userData };
      
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials') {
        // Auto-seed admin if no users exist
        if (username === 'admin' && password === 'admin123') {
          try {
            return await this.seedAdmin();
          } catch (seedErr: any) {
            if (seedErr.message.includes('auth/email-already-in-use')) {
              throw new Error('Invalid nickname or password');
            }
            throw seedErr;
          }
        }
        throw new Error('Invalid nickname or password');
      }
      throw new Error(err.message || 'Login failed');
    }
  }

  private static async seedAdmin(): Promise<AuthResponse> {
    const email = 'admin' + this.emailSuffix;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, 'admin123');
      const adminData: UserAccount = {
        id: userCredential.user.uid,
        username: 'admin',
        role: 'admin',
        permissions: { canEditDictionary: true, canBackupRestore: true }
      };
      await setDoc(doc(db, 'users', userCredential.user.uid), adminData);
      this.user = adminData;
      this.token = await userCredential.user.getIdToken();
      return { token: this.token, user: adminData };
    } catch (e: any) {
      throw new Error('Failed to seed initial admin account: ' + e.message);
    }
  }

  static async logout() {
    this.token = '';
    this.user = null;
    await signOut(auth);
  }

  static async getWords(): Promise<Word[]> {
    await auth.authStateReady();
    if (!auth.currentUser) throw new Error('Not authenticated');
    const docRef = doc(db, 'dictionary', 'main');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().words || [];
    }
    return [];
  }

  static async saveWords(words: Word[]): Promise<void> {
    await auth.authStateReady();
    if (!this.user || (this.user.role !== 'admin' && !this.user.permissions.canEditDictionary)) {
      throw new Error('Permission denied to edit dictionary');
    }
    const docRef = doc(db, 'dictionary', 'main');
    await setDoc(docRef, { words });
  }

  static async getUsers(): Promise<UserAccount[]> {
    await auth.authStateReady();
    if (this.user?.role !== 'admin') throw new Error('Admin required');
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(doc => doc.data() as UserAccount);
  }

  // To properly create a secondary user without signing out the admin, 
  // we would need a secondary Firebase app.
  // For simplicity, we just use a small trick:
  // we create another firebase instance on the fly
  static async createUser(data: any): Promise<void> {
    await auth.authStateReady();
    if (this.user?.role !== 'admin') throw new Error('Admin required');
    
    // We can use a cloud function, or a secondary Firebase app client-side
    // Let's create a secondary app to avoid logging out the current admin
    const { initializeApp } = await import('firebase/app');
    const { getAuth, createUserWithEmailAndPassword, signOut: signOutSecondary } = await import('firebase/auth');
    
    const secondaryApp = initializeApp(auth.app.options, "SecondaryApp-" + Date.now());
    const secondaryAuth = getAuth(secondaryApp);
    
    try {
      const email = data.username.toLowerCase() + this.emailSuffix;
      const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, data.password);
      
      const newUser: UserAccount = {
        id: userCred.user.uid,
        username: data.username,
        role: 'user',
        permissions: data.permissions || { canEditDictionary: false, canBackupRestore: false }
      };
      
      await setDoc(doc(db, 'users', userCred.user.uid), newUser);
      await signOutSecondary(secondaryAuth);
    } catch (e: any) {
      if (e.code === 'auth/email-already-in-use') {
        throw new Error('Username already exists');
      }
      throw new Error('Failed to create user: ' + e.message);
    }
  }

  static async updateUser(id: string, data: any): Promise<void> {
    await auth.authStateReady();
    if (this.user?.role !== 'admin') throw new Error('Admin required');
    await updateDoc(doc(db, 'users', id), data);
  }

  static async deleteUser(id: string): Promise<void> {
    await auth.authStateReady();
    if (this.user?.role !== 'admin') throw new Error('Admin required');
    // Note: this only deletes from Firestore. Client SDK cannot delete other Auth users directly.
    // In a real production app, you'd use Firebase Admin SDK to delete the Auth record.
    // For this use case, deleting the Firestore doc revokes access because we can enforce it in Security Rules.
    await deleteDoc(doc(db, 'users', id));
  }
}
