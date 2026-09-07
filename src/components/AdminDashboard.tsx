import React, { useState, useEffect, useRef } from 'react';
import { ApiClient, UserAccount } from '../utils/api';
import { ShieldCheck, UserPlus, Save, FileUp, Download, Trash2 } from 'lucide-react';
import { Word } from '../types';

export const AdminDashboard: React.FC<{ 
  onToast: (msg: string, type?: 'success'|'error'|'info') => void;
  words: Word[];
  onWordsRestored: (w: Word[]) => void;
}> = ({ onToast, words, onWordsRestored }) => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const user = ApiClient.user;

  // New user form state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [canEditDict, setCanEditDict] = useState(false);
  const [canBackup, setCanBackup] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadUsers();
    }
  }, [user]);

  const loadUsers = async () => {
    try {
      const data = await ApiClient.getUsers();
      setUsers(data);
    } catch (err: any) {
      onToast(err.message, 'error');
    }
  };

  const handleCreateUser = async () => {
    if (!newUsername || !newPassword) {
      onToast('Username and password required', 'error');
      return;
    }
    try {
      setLoading(true);
      await ApiClient.createUser({
        username: newUsername,
        password: newPassword,
        permissions: { canEditDictionary: canEditDict, canBackupRestore: canBackup }
      });
      onToast('User created successfully', 'success');
      setNewUsername('');
      setNewPassword('');
      setCanEditDict(false);
      setCanBackup(false);
      loadUsers();
    } catch (err: any) {
      onToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await ApiClient.deleteUser(id);
      onToast('User deleted', 'info');
      loadUsers();
    } catch (err: any) {
      onToast(err.message, 'error');
    }
  };

  const handleTogglePerm = async (id: string, perm: 'canEditDictionary' | 'canBackupRestore', current: boolean) => {
    const targetUser = users.find(u => u.id === id);
    if (!targetUser) return;
    try {
      await ApiClient.updateUser(id, {
        permissions: {
          ...targetUser.permissions,
          [perm]: !current
        }
      });
      onToast('Permissions updated', 'success');
      loadUsers();
    } catch(err: any) {
      onToast(err.message, 'error');
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackup = async () => {
    try {
      const allWords = await ApiClient.getWords();
      const allUsers = user?.role === 'admin' ? await ApiClient.getUsers() : [];
      
      const backupData = {
        words: allWords,
        users: allUsers,
      };
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spy-dictionary-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onToast('Database backup downloaded successfully', 'success');
    } catch(err:any) {
      onToast(err.message, 'error');
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed.words) throw new Error('Invalid backup file');
      
      await ApiClient.saveWords(parsed.words);
      
      // We only restore users if the current user is admin and the backup has users
      if (user?.role === 'admin' && parsed.users && Array.isArray(parsed.users)) {
         for (const u of parsed.users) {
           // Basic sync (in a real scenario we might need to recreate them in Firebase Auth too,
           // but we'll just restore the Firestore doc for now, assuming Auth didn't get wiped)
           // Actually restoring users in Firebase is complex because of Auth passwords.
           // We will skip user restoration for this simple example and just restore words.
         }
      }
      
      onToast('Database words restored successfully! Reloading...', 'success');
      onWordsRestored(parsed.words);
    } catch(err:any) {
      onToast(err.message, 'error');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!user) return null;

  return (
    <div className="space-y-4">
      {/* Backup & Restore Section */}
      {(user.role === 'admin' || user.permissions.canBackupRestore) && (
        <section className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 space-y-3 shadow-sm">
           <div className="flex items-center gap-2 text-sky-400">
            <Save className="w-4 h-4" />
            <h3 className="text-sm font-semibold text-slate-100">Database Backup & Restore</h3>
          </div>
          <p className="text-xs text-slate-400">
            Download a full copy of the dictionary (and users if admin) or restore from an existing backup.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackup}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors border border-slate-700"
            >
              <Download className="w-4 h-4" />
              Download Backup
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-600/40 text-xs font-semibold rounded-lg transition-colors"
            >
              <FileUp className="w-4 h-4" />
              Restore Database
            </button>
            <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleRestore} />
          </div>
        </section>
      )}

      {/* Admin Panel */}
      {user.role === 'admin' && (
        <section className="bg-[#1E293B] border border-amber-900/40 rounded-xl p-4 space-y-4 shadow-sm">
           <div className="flex items-center gap-2 text-amber-400">
            <ShieldCheck className="w-4 h-4" />
            <h3 className="text-sm font-semibold text-slate-100">Admin User Management</h3>
          </div>
          
          <div className="grid gap-3 p-3 bg-slate-900 rounded border border-slate-800">
            <h4 className="text-xs font-medium text-slate-300">Create New Account</h4>
            <div className="grid sm:grid-cols-2 gap-2">
              <input 
                type="text" 
                placeholder="Nickname"
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-xs text-white px-3 py-2 rounded focus:outline-none focus:border-amber-500"
              />
              <input 
                type="password" 
                placeholder="Password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-xs text-white px-3 py-2 rounded focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200">
                <input type="checkbox" checked={canEditDict} onChange={e => setCanEditDict(e.target.checked)} className="accent-amber-500" />
                Can Edit Dictionary
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200">
                <input type="checkbox" checked={canBackup} onChange={e => setCanBackup(e.target.checked)} className="accent-amber-500" />
                Can Backup & Restore
              </label>
            </div>
            <button
              onClick={handleCreateUser}
              disabled={loading}
              className="w-full mt-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold text-xs py-2 rounded transition-colors"
            >
              <UserPlus className="w-4 h-4 inline-block mr-1" />
              Create User
            </button>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-medium text-slate-300">Existing Users</h4>
            {users.map(u => (
              <div key={u.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3 bg-slate-800/50 rounded border border-slate-700/50">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-amber-200 font-semibold">{u.username}</span>
                  {u.role === 'admin' && (
                    <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold uppercase tracking-wide">
                      Admin
                    </span>
                  )}
                </div>
                {u.role !== 'admin' && (
                  <div className="flex items-center gap-3 text-xs flex-wrap">
                    <label className="flex items-center gap-1 text-slate-400 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={u.permissions?.canEditDictionary || false} 
                        onChange={() => handleTogglePerm(u.id, 'canEditDictionary', u.permissions?.canEditDictionary)}
                        className="accent-amber-500"
                      />
                      Edit Dict
                    </label>
                    <label className="flex items-center gap-1 text-slate-400 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={u.permissions?.canBackupRestore || false} 
                        onChange={() => handleTogglePerm(u.id, 'canBackupRestore', u.permissions?.canBackupRestore)}
                        className="accent-amber-500"
                      />
                      Backup
                    </label>
                    <button onClick={() => handleDeleteUser(u.id)} className="p-1 hover:bg-rose-500/20 text-rose-400 rounded">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
