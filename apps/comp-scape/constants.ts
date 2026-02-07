import { ProjectConfig, CompetitorDef } from './types';

// ===== COLOR PALETTE =====

export const PALETTE = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#84cc16', // lime
  '#d946ef', // fuchsia
  '#0ea5e9', // sky
  '#eab308', // yellow
  '#a855f7', // purple
  '#10b981', // emerald
];

// ===== COMMON AXIS PRESETS =====

export const AXIS_PRESETS: Array<{
  label: string;
  x: { leftLabel: string; rightLabel: string };
  y: { bottomLabel: string; topLabel: string };
}> = [
  {
    label: 'Brand Positioning',
    x: { leftLabel: 'Tradizionale', rightLabel: 'Innovativo' },
    y: { bottomLabel: 'Di Nicchia', topLabel: 'Generalista' },
  },
  {
    label: 'Prezzo / Qualita',
    x: { leftLabel: 'Economico', rightLabel: 'Premium' },
    y: { bottomLabel: 'Essenziale', topLabel: 'Full-Featured' },
  },
  {
    label: 'Mercato',
    x: { leftLabel: 'Locale', rightLabel: 'Globale' },
    y: { bottomLabel: 'B2B', topLabel: 'B2C' },
  },
  {
    label: 'User Experience',
    x: { leftLabel: 'Complesso', rightLabel: 'Semplice' },
    y: { bottomLabel: 'Funzionale', topLabel: 'Emozionale' },
  },
  {
    label: 'Comunicazione',
    x: { leftLabel: 'Formale', rightLabel: 'Informale' },
    y: { bottomLabel: 'Conservatore', topLabel: 'Audace' },
  },
];

// ===== DEFAULT COMPETITORS =====

const DEFAULT_COMPETITORS: CompetitorDef[] = [
  { id: 'comp_1', name: 'Brand A', color: PALETTE[0] },
  { id: 'comp_2', name: 'Brand B', color: PALETTE[1] },
  { id: 'comp_3', name: 'Brand C', color: PALETTE[2] },
];

// ===== DEFAULT CONFIGURATION =====

export const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  axes: AXIS_PRESETS[0],
  competitors: DEFAULT_COMPETITORS,
  question: '',
  instructions: '',
};

// ===== MATRIX CONSTANTS =====

export const MATRIX_SIZE = 600;
export const TOKEN_RADIUS = 20;

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
