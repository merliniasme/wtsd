import { Word, UserPermissions } from '../types';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, getDocs, collection, deleteDoc, updateDoc } from 'firebase/firestore';

export const DEFAULT_USER_PERMISSIONS: UserPermissions = {
  canEditDictionary: false,
  canBackupRestore: false,
  canRawImport: false,
  canResetData: false,
  canUseAi: false,
  canUseWePlayEditor: false,
  canUseAntiCensor: false,
  canPlayMemoryGame: false,
};

export const ADMIN_USER_PERMISSIONS: UserPermissions = {
  canEditDictionary: true,
  canBackupRestore: true,
  canRawImport: true,
  canResetData: true,
  canUseAi: true,
  canUseWePlayEditor: true,
  canUseAntiCensor: true,
  canPlayMemoryGame: true,
};

export interface UserAccount {
  id: string;
  username: string;
  role: 'admin' | 'user';
  permissions: UserPermissions;
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

  static hasPermission(perm: keyof UserPermissions): boolean {
    if (!this.user) return false;
    if (this.user.role === 'admin') return true;
    return Boolean(this.user.permissions?.[perm]);
  }

  static get emailSuffix() {
    return '@spy.local';
  }

  static async login(username: string, password: string): Promise<AuthResponse> {
    const email = username.toLowerCase() + this.emailSuffix;
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Fetch user profile from Firestore
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (!userDoc.exists()) {
        throw new Error('User profile not found in database');
      }
      
      const rawData = userDoc.data() as Partial<UserAccount>;
      const isAdmin = rawData.role === 'admin';
      const userData: UserAccount = {
        id: rawData.id || userCredential.user.uid,
        username: rawData.username || username,
        role: isAdmin ? 'admin' : 'user',
        permissions: isAdmin
          ? { ...ADMIN_USER_PERMISSIONS, ...(rawData.permissions || {}) }
          : { ...DEFAULT_USER_PERMISSIONS, ...(rawData.permissions || {}) },
      };

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
        permissions: { ...ADMIN_USER_PERMISSIONS },
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
    if (
      !this.user ||
      (this.user.role !== 'admin' &&
        !this.user.permissions?.canEditDictionary &&
        !this.user.permissions?.canBackupRestore &&
        !this.user.permissions?.canResetData)
    ) {
      throw new Error('Permission denied to modify dictionary');
    }
    const docRef = doc(db, 'dictionary', 'main');
    await setDoc(docRef, { words });
  }

  static async getUsers(): Promise<UserAccount[]> {
    await auth.authStateReady();
    if (this.user?.role !== 'admin') throw new Error('Admin required');
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map((d) => {
      const data = d.data();
      const isAdmin = data.role === 'admin';
      return {
        id: d.id,
        username: data.username || 'User',
        role: isAdmin ? 'admin' : 'user',
        permissions: isAdmin
          ? { ...ADMIN_USER_PERMISSIONS, ...(data.permissions || {}) }
          : { ...DEFAULT_USER_PERMISSIONS, ...(data.permissions || {}) },
      } as UserAccount;
    });
  }

  // Creates secondary user account using secondary Firebase app client-side
  static async createUser(data: {
    username: string;
    password: string;
    permissions: UserPermissions;
  }): Promise<void> {
    await auth.authStateReady();
    if (this.user?.role !== 'admin') throw new Error('Admin required');
    
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
        permissions: { ...DEFAULT_USER_PERMISSIONS, ...data.permissions },
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

  static async updateUser(id: string, data: Partial<UserAccount>): Promise<void> {
    await auth.authStateReady();
    if (this.user?.role !== 'admin') throw new Error('Admin required');
    await updateDoc(doc(db, 'users', id), data);
  }

  static async deleteUser(id: string): Promise<void> {
    await auth.authStateReady();
    if (this.user?.role !== 'admin') throw new Error('Admin required');
    await deleteDoc(doc(db, 'users', id));
  }
}

