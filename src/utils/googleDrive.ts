import { Word } from '../types';
import { exportWordsJson, validateAndImportJson } from './storage';

export const BACKUP_FILE_NAME = 'whos_the_spy_dictionary_backup.json';

export class DriveApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'DriveApiError';
    this.status = status;
  }
}

export interface DriveFileInfo {
  id: string;
  name: string;
  modifiedTime: string;
  lastModifiedTimestamp?: number;
  size?: string;
  totalWords?: number;
}

/**
 * Searches user's Google Drive for an existing dictionary backup file
 */
export async function findDriveBackupFile(accessToken: string): Promise<DriveFileInfo | null> {
  try {
    const query = encodeURIComponent(`name = '${BACKUP_FILE_NAME}' and trashed = false`);
    const fields = encodeURIComponent('files(id, name, modifiedTime, size)');
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&spaces=drive`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Google Drive search failed:', res.status, errorText);
      if (res.status === 401) {
        throw new DriveApiError('Authentication token expired or invalid', 401);
      }
      throw new DriveApiError(`Google Drive API error: ${res.statusText}`, res.status);
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0] as DriveFileInfo;
    }
    return null;
  } catch (error) {
    console.error('Failed to find backup file in Drive:', error);
    throw error;
  }
}

/**
 * Uploads (Creates or Overwrites) dictionary backup to Google Drive with session timestamp
 */
export async function uploadBackupToDrive(
  accessToken: string,
  words: Word[],
  sessionTimestamp: number = Date.now()
): Promise<DriveFileInfo> {
  const jsonContent = exportWordsJson(words, sessionTimestamp);
  const existingFile = await findDriveBackupFile(accessToken);

  if (existingFile?.id) {
    // Overwrite existing file content
    const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`;
    const res = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: jsonContent,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Failed to overwrite Drive file:', res.status, err);
      if (res.status === 401) {
        throw new DriveApiError('Authentication token expired during upload', 401);
      }
      throw new DriveApiError('Failed to update Google Drive database file.', res.status);
    }

    const data = await res.json();
    return {
      id: data.id || existingFile.id,
      name: BACKUP_FILE_NAME,
      modifiedTime: new Date(sessionTimestamp).toISOString(),
      lastModifiedTimestamp: sessionTimestamp,
      totalWords: words.length,
    };
  }

  // Create new file with multipart upload
  const boundary = '-------' + Math.random().toString(36).substring(2);
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: BACKUP_FILE_NAME,
    mimeType: 'application/json',
    description: "Who's the Spy? Dictionary Backup & Cloud Storage",
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    jsonContent +
    closeDelimiter;

  const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  const res = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Failed to create Drive file:', res.status, err);
    if (res.status === 401) {
      throw new DriveApiError('Authentication token expired during file creation', 401);
    }
    throw new DriveApiError('Failed to create Google Drive database file.', res.status);
  }

  const data = await res.json();
  return {
    id: data.id,
    name: data.name || BACKUP_FILE_NAME,
    modifiedTime: new Date(sessionTimestamp).toISOString(),
    lastModifiedTimestamp: sessionTimestamp,
    totalWords: words.length,
  };
}

/**
 * Downloads dictionary backup file content from Google Drive
 */
export async function downloadBackupFromDrive(
  accessToken: string,
  fileId: string
): Promise<{ words: Word[]; rawText: string; totalWords: number; lastModified: number }> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Failed to download Drive backup:', res.status, err);
    if (res.status === 401) {
      throw new DriveApiError('Authentication token expired during download', 401);
    }
    throw new DriveApiError('Failed to download database file from Google Drive.', res.status);
  }

  const rawText = await res.text();
  const parsedResult = validateAndImportJson(rawText, [], 'replace');

  if (!parsedResult.success || !parsedResult.words) {
    throw new Error(parsedResult.error || 'Failed to parse dictionary data from Drive.');
  }

  return {
    words: parsedResult.words,
    rawText,
    totalWords: parsedResult.words.length,
    lastModified: parsedResult.lastModified || Date.now(),
  };
}

/**
 * Deletes backup file from Google Drive (Requires user confirmation)
 */
export async function deleteDriveBackupFile(
  accessToken: string,
  fileId: string
): Promise<void> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok && res.status !== 404) {
    const err = await res.text();
    console.error('Failed to delete Drive file:', err);
    throw new Error('Failed to delete database file from Google Drive.');
  }
}

