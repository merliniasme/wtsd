import React, { useState, useEffect } from 'react';
import { ApiClient, UserAccount, DEFAULT_USER_PERMISSIONS, ADMIN_USER_PERMISSIONS } from '../utils/api';
import { UserPermissions, COMPLETE_APP_FEATURES, FeaturePermissionInfo } from '../types';
import {
  ShieldCheck,
  UserPlus,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  Users,
  Key,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Sparkles,
  Database,
  BookOpen,
  Wrench,
} from 'lucide-react';

interface AdminUserManagementProps {
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminUserManagement: React.FC<AdminUserManagementProps> = ({ onToast }) => {
  const currentUser = ApiClient.user;
  const isAdmin = currentUser?.role === 'admin';

  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // New user form state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [permissions, setPermissions] = useState<UserPermissions>({ ...DEFAULT_USER_PERMISSIONS });
  
  // Expanded card for existing user
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const data = await ApiClient.getUsers();
      setUsers(data);
    } catch (err: any) {
      onToast(err.message || 'Failed to fetch user accounts', 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleApplyPreset = (preset: 'readonly' | 'editor' | 'power' | 'all') => {
    if (preset === 'readonly') {
      setPermissions({ ...DEFAULT_USER_PERMISSIONS });
      onToast('Applied "Read-Only Viewer" permission preset', 'info');
    } else if (preset === 'editor') {
      setPermissions({
        ...DEFAULT_USER_PERMISSIONS,
        canEditDictionary: true,
        canRawImport: true,
        canUseAntiCensor: true,
        canPlayMemoryGame: true,
      });
      onToast('Applied "Dictionary Editor" permission preset', 'info');
    } else if (preset === 'power') {
      setPermissions({
        ...ADMIN_USER_PERMISSIONS,
        canResetData: false,
      });
      onToast('Applied "Power User" permission preset (No wipe)', 'info');
    } else if (preset === 'all') {
      setPermissions({ ...ADMIN_USER_PERMISSIONS });
      onToast('Applied "Full Features" permission preset', 'info');
    }
  };

  const handleToggleFormPerm = (key: keyof UserPermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = newUsername.trim();
    if (!cleanUser || !newPassword) {
      onToast('Nickname and password are required', 'error');
      return;
    }

    if (newPassword.length < 6) {
      onToast('Password must be at least 6 characters long', 'error');
      return;
    }

    try {
      setLoading(true);
      await ApiClient.createUser({
        username: cleanUser,
        password: newPassword,
        permissions,
      });
      onToast(`Account "${cleanUser}" created with custom restricted features`, 'success');
      setNewUsername('');
      setNewPassword('');
      setPermissions({ ...DEFAULT_USER_PERMISSIONS });
      await loadUsers();
    } catch (err: any) {
      onToast(err.message || 'Failed to create user', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleExistingPerm = async (
    userId: string,
    permKey: keyof UserPermissions,
    currentVal: boolean
  ) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;

    try {
      const updatedPermissions: UserPermissions = {
        ...DEFAULT_USER_PERMISSIONS,
        ...(targetUser.permissions || {}),
        [permKey]: !currentVal,
      };

      await ApiClient.updateUser(userId, {
        permissions: updatedPermissions,
      });

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, permissions: updatedPermissions } : u))
      );
      onToast(`Updated permission for "${targetUser.username}"`, 'success');
    } catch (err: any) {
      onToast(err.message || 'Failed to update user permissions', 'error');
    }
  };

  const handleDeleteUser = async (user: UserAccount) => {
    if (user.role === 'admin' || user.username === 'admin') {
      onToast('The master admin account cannot be deleted', 'error');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete user "${user.username}"? Access will be revoked immediately.`)) {
      return;
    }

    try {
      await ApiClient.deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      onToast(`Account "${user.username}" deleted`, 'info');
    } catch (err: any) {
      onToast(err.message || 'Failed to delete user', 'error');
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-[#1E293B] border border-amber-500/30 rounded-xl p-5 text-center space-y-2">
        <Lock className="w-6 h-6 text-amber-400 mx-auto" />
        <h4 className="text-sm font-semibold text-slate-100">Admin Feature Restricted</h4>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          User account management and role delegation are restricted strictly to master administrator accounts.
        </p>
      </div>
    );
  }

  // Count active permissions for user
  const countPermissions = (perms?: UserPermissions) => {
    if (!perms) return 0;
    return Object.values(perms).filter(Boolean).length;
  };

  // Group features by category for display
  const categories: ('Dictionary' | 'Database' | 'Tools' | 'AI & Game')[] = [
    'Dictionary',
    'Database',
    'AI & Game',
    'Tools',
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Dictionary':
        return <BookOpen className="w-3.5 h-3.5 text-emerald-400" />;
      case 'Database':
        return <Database className="w-3.5 h-3.5 text-sky-400" />;
      case 'AI & Game':
        return <Sparkles className="w-3.5 h-3.5 text-violet-400" />;
      case 'Tools':
        return <Wrench className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview & Security Badge */}
      <div className="bg-gradient-to-r from-amber-500/10 via-slate-800 to-slate-900 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-100">Admin User Management</h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold tracking-wider uppercase border border-amber-500/30">
                Admin Exclusive
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Provision sub-accounts with custom restricted feature permissions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700/60 self-stretch sm:self-auto justify-center">
          <Users className="w-3.5 h-3.5 text-amber-400" />
          <span>{users.length} registered accounts</span>
        </div>
      </div>

      {/* Create New Account Section */}
      <section
        id="section-create-user-account"
        className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 sm:p-5 space-y-4 shadow-sm"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
          <div className="flex items-center gap-2 text-amber-400">
            <UserPlus className="w-4 h-4" />
            <h4 className="text-sm font-semibold text-slate-100">Create Restricted User Account</h4>
          </div>
          <span className="text-[11px] text-slate-400">Granular feature isolation</span>
        </div>

        <form onSubmit={handleCreateUser} className="space-y-4">
          {/* Credentials Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <span>Account Nickname / Username</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. detective_alex"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-700 text-xs text-slate-100 px-3 py-2.5 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-500">Signs in via nickname or {newUsername.trim() || 'user'}@spy.local</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Account Password</span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[10px] text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-700 text-xs text-slate-100 px-3 py-2.5 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-500">Secure credentials stored via Firebase Auth</p>
            </div>
          </div>

          {/* Feature Permissions Complete List Header & Presets */}
          <div className="space-y-2 pt-2 border-t border-slate-700/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h5 className="text-xs font-semibold text-slate-200">
                  Feature Permissions Delegation ({countPermissions(permissions)}/
                  {COMPLETE_APP_FEATURES.length} Allowed)
                </h5>
                <p className="text-[11px] text-slate-400">
                  Select which features this account can access. Unchecked features will be locked.
                </p>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-500 font-medium">Presets:</span>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('readonly')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium rounded border border-slate-700 transition-colors cursor-pointer"
                >
                  Read-Only
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('editor')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[10px] font-medium rounded border border-slate-700 transition-colors cursor-pointer"
                >
                  Editor
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('power')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 text-[10px] font-medium rounded border border-slate-700 transition-colors cursor-pointer"
                >
                  Power User
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('all')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-medium rounded border border-slate-700 transition-colors cursor-pointer"
                >
                  All Features
                </button>
              </div>
            </div>

            {/* Complete Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
              {COMPLETE_APP_FEATURES.map((feature: FeaturePermissionInfo) => {
                const isEnabled = permissions[feature.key];
                return (
                  <label
                    key={feature.key}
                    htmlFor={`perm-toggle-${feature.key}`}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      isEnabled
                        ? 'bg-amber-500/10 border-amber-500/40 text-slate-100 shadow-xs'
                        : 'bg-[#0F172A]/70 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      id={`perm-toggle-${feature.key}`}
                      checked={isEnabled}
                      onChange={() => handleToggleFormPerm(feature.key)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900 accent-amber-500 cursor-pointer shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-slate-200">
                          {feature.name}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {getCategoryIcon(feature.category)}
                          <span>{feature.category}</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight">
                        {feature.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !newUsername.trim() || !newPassword}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-600 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-sm disabled:cursor-not-allowed"
          >
            <UserPlus className="w-4 h-4" />
            <span>{loading ? 'Provisioning Account...' : 'Create Account with Custom Permissions'}</span>
          </button>
        </form>
      </section>

      {/* Existing User Accounts List */}
      <section
        id="section-existing-user-accounts"
        className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 sm:p-5 space-y-4 shadow-sm"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
          <div className="flex items-center gap-2 text-slate-200">
            <Users className="w-4 h-4 text-sky-400" />
            <h4 className="text-sm font-semibold">Active User Accounts ({users.length})</h4>
          </div>
          <button
            type="button"
            onClick={loadUsers}
            disabled={loadingUsers}
            className="text-xs text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
          >
            {loadingUsers ? 'Refreshing...' : 'Refresh List'}
          </button>
        </div>

        {users.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-3 text-center">
            No user accounts found in the system.
          </p>
        ) : (
          <div className="space-y-3">
            {users.map((u) => {
              const isUserAdmin = u.role === 'admin';
              const isExpanded = expandedUserId === u.id;
              const activePermsCount = isUserAdmin
                ? COMPLETE_APP_FEATURES.length
                : countPermissions(u.permissions);

              return (
                <div
                  key={u.id}
                  className="bg-[#0F172A] border border-slate-800 rounded-xl overflow-hidden transition-colors"
                >
                  {/* Account Header Line */}
                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          isUserAdmin
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        }`}
                      >
                        {u.username.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-xs text-slate-100 truncate">
                            {u.username}
                          </span>
                          {isUserAdmin ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold uppercase tracking-wider">
                              Admin (Full Access)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[10px] font-medium">
                              Restricted User ({activePermsCount}/{COMPLETE_APP_FEATURES.length} Features)
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono">ID: {u.id.substring(0, 14)}...</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      {!isUserAdmin && (
                        <button
                          type="button"
                          onClick={() => setExpandedUserId(isExpanded ? null : u.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors cursor-pointer"
                        >
                          <span>{isExpanded ? 'Hide Permissions' : 'Manage Permissions'}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}

                      {!isUserAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-500/20"
                          title={`Delete account "${u.username}"`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quick Active Badges for Restricted Users */}
                  {!isUserAdmin && !isExpanded && (
                    <div className="px-3.5 pb-3 flex flex-wrap gap-1.5 pt-0.5 border-t border-slate-800/60">
                      {COMPLETE_APP_FEATURES.map((feat) => {
                        const hasIt = u.permissions?.[feat.key];
                        return (
                          <span
                            key={feat.key}
                            className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded ${
                              hasIt
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                : 'bg-slate-900 text-slate-600 border border-slate-800/80 line-through'
                            }`}
                          >
                            {hasIt ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <XCircle className="w-3 h-3 text-slate-600" />
                            )}
                            <span>{feat.name}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Expanded Interactive Permissions Panel */}
                  {!isUserAdmin && isExpanded && (
                    <div className="p-3.5 bg-slate-900/90 border-t border-slate-800 space-y-3 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-300">
                          Toggle feature permissions for <strong className="text-amber-300">{u.username}</strong>:
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Changes take effect immediately in cloud
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {COMPLETE_APP_FEATURES.map((feat) => {
                          const isEnabled = Boolean(u.permissions?.[feat.key]);
                          return (
                            <div
                              key={feat.key}
                              className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                                isEnabled
                                  ? 'bg-slate-800/90 border-amber-500/30 text-slate-200'
                                  : 'bg-slate-950/60 border-slate-800 text-slate-400'
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="text-xs font-semibold text-slate-200 truncate">
                                  {feat.name}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {feat.description}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleToggleExistingPerm(u.id, feat.key, isEnabled)}
                                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-all cursor-pointer shrink-0 ${
                                  isEnabled
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                                }`}
                              >
                                {isEnabled ? 'Allowed' : 'Locked'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
