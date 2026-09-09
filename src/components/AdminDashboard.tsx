import React from 'react';
import { Word } from '../types';
import { AdminUserManagement } from './AdminUserManagement';
import { DatabaseBackupRestore } from './DatabaseBackupRestore';

interface AdminDashboardProps {
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  words: Word[];
  onWordsRestored: (w: Word[]) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onToast,
  words,
  onWordsRestored,
}) => {
  return (
    <div className="space-y-6">
      {/* Database Backup & Restore */}
      <DatabaseBackupRestore
        words={words}
        onRestoreBackup={onWordsRestored}
        onToast={onToast}
      />

      {/* Admin User Management */}
      <AdminUserManagement onToast={onToast} />
    </div>
  );
};
