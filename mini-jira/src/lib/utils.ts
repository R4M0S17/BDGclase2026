import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AVATAR_GRADIENTS = [
  'bg-gradient-to-br from-primary to-primary-dim text-on-primary',
  'bg-tertiary-container text-on-tertiary-fixed',
  'bg-error-container text-on-error-container',
  'bg-surface-container-highest text-inverse-surface',
];

export function getAvatarColor(userId: string): string {
  const hash = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}
