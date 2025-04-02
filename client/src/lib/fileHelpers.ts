import { FileCategory, FileSource } from '@shared/schema';

/**
 * Gets appropriate icon for file category
 */
export function getFileIcon(category: string): string {
  switch (category) {
    case FileCategory.DOCUMENT:
      return 'description';
    case FileCategory.CODE:
      return 'code';
    case FileCategory.IMAGE:
      return 'image';
    case FileCategory.VIDEO:
      return 'videocam';
    case FileCategory.AUDIO:
      return 'audiotrack';
    case FileCategory.NOTE:
      return 'note';
    case FileCategory.CHAT_LOG:
      return 'chat';
    default:
      return 'insert_drive_file';
  }
}

/**
 * Gets appropriate color for file category
 */
export function getFileColor(category: string): string {
  switch (category) {
    case FileCategory.DOCUMENT:
      return 'text-purple-500';
    case FileCategory.CODE:
      return 'text-blue-500';
    case FileCategory.IMAGE:
      return 'text-yellow-500';
    case FileCategory.VIDEO:
      return 'text-red-500';
    case FileCategory.AUDIO:
      return 'text-green-500';
    case FileCategory.NOTE:
      return 'text-orange-500';
    case FileCategory.CHAT_LOG:
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
}

/**
 * Gets readable name for file source
 */
export function getSourceName(source: string): string {
  switch (source) {
    case FileSource.LOCAL:
      return 'Local';
    case FileSource.GOOGLE_DRIVE:
      return 'Google Drive';
    case FileSource.DROPBOX:
      return 'Dropbox';
    case FileSource.NOTION:
      return 'Notion';
    case FileSource.ANYTYPE:
      return 'Anytype';
    default:
      return source;
  }
}

/**
 * Gets appropriate icon and color for file source
 */
export function getSourceIcon(source: string): { icon: string; color: string } {
  switch (source) {
    case FileSource.LOCAL:
      return { icon: 'folder', color: 'text-neutral-500' };
    case FileSource.GOOGLE_DRIVE:
      return { icon: 'cloud', color: 'text-green-500' };
    case FileSource.DROPBOX:
      return { icon: 'cloud', color: 'text-blue-500' };
    case FileSource.NOTION:
      return { icon: 'description', color: 'text-black' };
    case FileSource.ANYTYPE:
      return { icon: 'article', color: 'text-purple-500' };
    default:
      return { icon: 'storage', color: 'text-neutral-500' };
  }
}

/**
 * Formats date in relative time (Today, Yesterday, or specific date)
 */
export function formatRelativeDate(date: Date | string | null | undefined): string {
  if (!date) return 'Unknown';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const yesterday = new Date(now.setDate(now.getDate() - 1));
  const today = new Date();
  
  // Reset time to compare just the dates
  today.setHours(0, 0, 0, 0);
  yesterday.setHours(0, 0, 0, 0);
  const compareDate = new Date(dateObj);
  compareDate.setHours(0, 0, 0, 0);
  
  if (compareDate.getTime() === today.getTime()) {
    return `Today, ${dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  } else if (compareDate.getTime() === yesterday.getTime()) {
    return `Yesterday, ${dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  } else {
    return `${dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
}
