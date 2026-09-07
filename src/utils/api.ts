import { Word } from '../types';

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

  static get headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
    };
  }

  static async login(username: string, password: string):Promise<AuthResponse> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Login failed');
    const data = await res.json();
    this.token = data.token;
    this.user = data.user;
    return data;
  }

  static logout() {
    this.token = '';
    this.user = null;
  }

  static async getWords(): Promise<Word[]> {
    const res = await fetch('/api/words', { headers: this.headers });
    if (!res.ok) throw new Error('Failed to fetch words');
    return res.json();
  }

  static async saveWords(words: Word[]): Promise<void> {
    const res = await fetch('/api/words', {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ words })
    });
    if (!res.ok) throw new Error('Failed to save words');
  }

  static async getUsers(): Promise<UserAccount[]> {
    const res = await fetch('/api/users', { headers: this.headers });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  }

  static async createUser(data: any): Promise<void> {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create user');
  }

  static async updateUser(id: string, data: any): Promise<void> {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update user');
  }

  static async deleteUser(id: string): Promise<void> {
    const res = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!res.ok) throw new Error('Failed to delete user');
  }
}
