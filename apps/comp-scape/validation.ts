// ===== VALIDATION UTILITIES =====

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// --- Project Validation ---

export const validateProjectName = (value: string): ValidationResult => {
  const trimmed = value.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Nome progetto richiesto' };
  }
  if (trimmed.length > 100) {
    return { isValid: false, error: 'Nome troppo lungo (max 100 caratteri)' };
  }
  return { isValid: true };
};

// --- Competitor Validation ---

export const validateCompetitorName = (value: string): ValidationResult => {
  const trimmed = value.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Nome competitor richiesto' };
  }
  if (trimmed.length > 60) {
    return { isValid: false, error: 'Nome troppo lungo (max 60 caratteri)' };
  }
  return { isValid: true };
};

// --- Axis Validation ---

export const validateAxisLabel = (value: string): ValidationResult => {
  const trimmed = value.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Etichetta asse richiesta' };
  }
  if (trimmed.length > 40) {
    return { isValid: false, error: 'Etichetta troppo lunga (max 40 caratteri)' };
  }
  return { isValid: true };
};

// --- Sanitization ---

export const sanitizeInput = (input: string, maxLength: number = 500): string => {
  return input
    .trim()
    .replace(/<[^>]*>/g, '')
    .substring(0, maxLength);
};

export const sanitizeProjectName = (input: string): string => {
  return sanitizeInput(input, 100);
};

export const sanitizeCompetitorName = (input: string): string => {
  return sanitizeInput(input, 60);
};

// --- Safe JSON Parse ---

export const safeJsonParse = <T>(json: string, fallback: T): T => {
  try {
    return JSON.parse(json) as T;
  } catch (e) {
    console.error('JSON parse error:', e);
    return fallback;
  }
};
