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

export const validateProjectDescription = (value: string): ValidationResult => {
  if (value.length > 500) {
    return { isValid: false, error: 'Descrizione troppo lunga (max 500 caratteri)' };
  }
  return { isValid: true };
};

// --- Semantic Pair Validation ---

export const validateSemanticTerm = (value: string): ValidationResult => {
  const trimmed = value.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Termine richiesto' };
  }
  if (trimmed.length > 50) {
    return { isValid: false, error: 'Termine troppo lungo (max 50 caratteri)' };
  }
  return { isValid: true };
};

export const validateSemanticPair = (leftTerm: string, rightTerm: string): ValidationResult => {
  const leftResult = validateSemanticTerm(leftTerm);
  if (!leftResult.isValid) {
    return { isValid: false, error: `Termine sinistro: ${leftResult.error}` };
  }

  const rightResult = validateSemanticTerm(rightTerm);
  if (!rightResult.isValid) {
    return { isValid: false, error: `Termine destro: ${rightResult.error}` };
  }

  if (leftTerm.trim().toLowerCase() === rightTerm.trim().toLowerCase()) {
    return { isValid: false, error: 'I due termini devono essere diversi' };
  }

  return { isValid: true };
};

// --- Scale Validation ---

export const validateScalePoints = (value: number): ValidationResult => {
  const validPoints = [5, 7, 9, 11];
  if (!validPoints.includes(value)) {
    return { isValid: false, error: 'Scala non valida (usa 5, 7, 9 o 11 punti)' };
  }
  return { isValid: true };
};

// --- Session Validation ---

export const validateParticipantName = (value: string): ValidationResult => {
  if (value && value.length > 100) {
    return { isValid: false, error: 'Nome troppo lungo (max 100 caratteri)' };
  }
  return { isValid: true };
};

export const validateGroupLabel = (value: string): ValidationResult => {
  if (value && value.length > 50) {
    return { isValid: false, error: 'Etichetta gruppo troppo lunga (max 50 caratteri)' };
  }
  return { isValid: true };
};

// --- Sanitization ---

export const sanitizeInput = (input: string, maxLength: number = 500): string => {
  return input
    .trim()
    .replace(/<[^>]*>/g, '')  // Remove HTML tags
    .substring(0, maxLength);
};

export const sanitizeProjectName = (input: string): string => {
  return sanitizeInput(input, 100);
};

export const sanitizeSemanticTerm = (input: string): string => {
  return sanitizeInput(input, 50);
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
