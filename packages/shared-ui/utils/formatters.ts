// Shared formatting utilities

export const formatDate = (timestamp?: number): string => {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const formatTime = (timestamp?: number): string => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

export const formatDateTime = (timestamp?: number): string => {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};
