import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const normalizeImageUrl = (url: string) => {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.hostname === 'imgur.com') {
      const id = u.pathname.split('/').pop();
      if (id && !id.includes('.')) {
        return `https://i.imgur.com/${id}.png`;
      }
    }
    // Generic fix for Imgur gallery links
    if (u.hostname === 'i.imgur.com' && u.pathname.includes('/a/')) {
       return url.replace('/a/', '/');
    }
    return url;
  } catch {
    return url;
  }
};
