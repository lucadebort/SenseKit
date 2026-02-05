// Design Tokens - Shared across all Etnograph tools

export const COLORS = {
  primary: {
    50: 'bg-blue-50',
    100: 'bg-blue-100',
    600: 'bg-blue-600',
    700: 'bg-blue-700',
    text: 'text-blue-600',
    textHover: 'hover:text-blue-600',
    border: 'border-blue-600',
  },
  slate: {
    50: 'bg-slate-50',
    100: 'bg-slate-100',
    200: 'bg-slate-200',
    text: {
      400: 'text-slate-400',
      500: 'text-slate-500',
      600: 'text-slate-600',
      700: 'text-slate-700',
      800: 'text-slate-800',
    },
    border: 'border-slate-200',
  },
  success: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
  },
  warning: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
  },
  danger: {
    bg: 'bg-red-50',
    bgSolid: 'bg-red-600',
    text: 'text-red-600',
    textHover: 'hover:text-red-600',
  },
} as const;

export const SPACING = {
  button: {
    sm: 'px-2 py-1',
    md: 'px-4 py-2',
    lg: 'px-6 py-3',
  },
  container: {
    page: 'px-6',
    card: 'p-6',
  },
} as const;

export const LAYOUT = {
  maxWidth: {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
  },
  container: 'max-w-7xl mx-auto px-6',
} as const;

export const ROUNDED = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  full: 'rounded-full',
} as const;

export const SHADOWS = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',
  footer: 'shadow-[0_-2px_10px_rgba(0,0,0,0.02)]',
} as const;

export const Z_INDEX = {
  dropdown: 'z-40',
  header: 'z-50',
  modal: 'z-50',
  footer: 'z-[100]',
} as const;

export const TRANSITIONS = {
  colors: 'transition-colors',
  all: 'transition-all',
  transform: 'transition-transform',
} as const;
