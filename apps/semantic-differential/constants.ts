import { ProjectConfig, ScaleConfig, SemanticPair } from './types';

// ===== SCALE CONSTANTS =====

export const SCALE_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
export const DEFAULT_SCALE_POINTS = 7;

// ===== COLOR PALETTE =====

// Primary palette for UI elements
export const PALETTE = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
];

// Semantic scale gradient colors
export const SCALE_COLORS = {
  left: '#059669',   // emerald-600
  center: '#64748b', // slate-500
  right: '#dc2626',  // red-600
};

// Theme colors for backgrounds
export const THEME_COLORS = {
  primary: '#2563eb',   // blue-600
  secondary: '#059669', // emerald-600
  accent: '#8b5cf6',    // violet-500
  warning: '#f59e0b',   // amber-500
  error: '#dc2626',     // red-600
};

// ===== DEFAULT CONFIGURATIONS =====

export const DEFAULT_SCALE_CONFIG: ScaleConfig = {
  points: 7,
  mode: 'discrete',
  showLabels: true,
  showMidpoint: true,
};

export const DEFAULT_SEMANTIC_PAIRS: SemanticPair[] = [
  { id: 'sp_default_1', leftTerm: 'Tradizionale', rightTerm: 'Innovativo' },
  { id: 'sp_default_2', leftTerm: 'Semplice', rightTerm: 'Complesso' },
  { id: 'sp_default_3', leftTerm: 'Formale', rightTerm: 'Informale' },
];

export const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  semanticPairs: DEFAULT_SEMANTIC_PAIRS,
  scale: DEFAULT_SCALE_CONFIG,
  randomization: { enabled: false },
  question: '',
  instructions: '',
};

// ===== COMMON SEMANTIC PAIRS (for suggestions) =====

export const COMMON_SEMANTIC_PAIRS: Array<{ left: string; right: string; category?: string }> = [
  // Valori
  { left: 'Tradizionale', right: 'Innovativo', category: 'Valori' },
  { left: 'Conservatore', right: 'Progressista', category: 'Valori' },
  { left: 'Individuale', right: 'Collettivo', category: 'Valori' },
  { left: 'Locale', right: 'Globale', category: 'Valori' },
  { left: 'Materialista', right: 'Post-materialista', category: 'Valori' },

  // Stile
  { left: 'Formale', right: 'Informale', category: 'Stile' },
  { left: 'Serio', right: 'Giocoso', category: 'Stile' },
  { left: 'Riservato', right: 'Espansivo', category: 'Stile' },
  { left: 'Minimalista', right: 'Massimalista', category: 'Stile' },

  // Personalita
  { left: 'Introverso', right: 'Estroverso', category: 'Personalita' },
  { left: 'Razionale', right: 'Emotivo', category: 'Personalita' },
  { left: 'Cauto', right: 'Audace', category: 'Personalita' },
  { left: 'Pratico', right: 'Idealista', category: 'Personalita' },

  // Organizzazione
  { left: 'Gerarchico', right: 'Orizzontale', category: 'Organizzazione' },
  { left: 'Centralizzato', right: 'Decentralizzato', category: 'Organizzazione' },
  { left: 'Rigido', right: 'Flessibile', category: 'Organizzazione' },
  { left: 'Chiuso', right: 'Aperto', category: 'Organizzazione' },

  // Percezione
  { left: 'Freddo', right: 'Caldo', category: 'Percezione' },
  { left: 'Lento', right: 'Veloce', category: 'Percezione' },
  { left: 'Debole', right: 'Forte', category: 'Percezione' },
  { left: 'Passivo', right: 'Attivo', category: 'Percezione' },
  { left: 'Semplice', right: 'Complesso', category: 'Percezione' },
  { left: 'Vecchio', right: 'Nuovo', category: 'Percezione' },
];

// ===== UTILITY FUNCTIONS =====

export const generateId = (prefix: string = 'id'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Interpolate between two colors
export const interpolateColor = (color1: string, color2: string, factor: number): string => {
  const hex2rgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  };

  const rgb2hex = (r: number, g: number, b: number) => {
    return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
  };

  const [r1, g1, b1] = hex2rgb(color1);
  const [r2, g2, b2] = hex2rgb(color2);

  const r = r1 + (r2 - r1) * factor;
  const g = g1 + (g2 - g1) * factor;
  const b = b1 + (b2 - b1) * factor;

  return rgb2hex(r, g, b);
};

// Get scale color based on value (-50 to +50)
export const getScaleColor = (value: number): string => {
  const normalized = (value + 50) / 100; // 0 to 1
  if (normalized < 0.5) {
    return interpolateColor(SCALE_COLORS.left, SCALE_COLORS.center, normalized * 2);
  } else {
    return interpolateColor(SCALE_COLORS.center, SCALE_COLORS.right, (normalized - 0.5) * 2);
  }
};
