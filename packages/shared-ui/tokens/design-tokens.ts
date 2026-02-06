// Design Tokens - Shared across all SenseKit tools
// DEPRECATED: Prefer using CSS variables from styles/globals.css directly.
// These tokens map to semantic Tailwind classes based on CSS variables.

export const COLORS = {
  primary: {
    50: 'bg-primary/5',
    100: 'bg-primary/10',
    600: 'bg-primary',
    700: 'bg-primary/90',
    text: 'text-primary',
    textHover: 'hover:text-primary',
    border: 'border-primary',
  },
  slate: {
    50: 'bg-secondary',
    100: 'bg-accent',
    200: 'bg-accent',
    text: {
      400: 'text-muted-foreground/70',
      500: 'text-muted-foreground',
      600: 'text-muted-foreground',
      700: 'text-foreground',
      800: 'text-foreground',
    },
    border: 'border-border',
  },
  success: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
  },
  warning: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
  },
  danger: {
    bg: 'bg-red-50',
    bgSolid: 'bg-destructive',
    text: 'text-destructive',
    textHover: 'hover:text-destructive',
  },
} as const;

export const SPACING = {
  button: {
    sm: 'px-3 py-1',
    md: 'px-4 py-2',
    lg: 'px-5 py-3',
  },
  container: {
    page: 'px-4 sm:px-6',
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
  container: 'max-w-7xl mx-auto px-4 sm:px-6',
} as const;

export const ROUNDED = {
  sm: 'rounded-md',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  full: 'rounded-full',
} as const;

export const SHADOWS = {
  sm: 'shadow-none',
  md: 'shadow-sm',
  lg: 'shadow-sm',
  xl: 'shadow-md',
  '2xl': 'shadow-md',
  footer: 'shadow-none',
} as const;

export const Z_INDEX = {
  dropdown: 'z-40',
  header: 'z-50',
  modal: 'z-50',
  footer: 'z-[100]',
} as const;

export const TRANSITIONS = {
  colors: 'transition-colors duration-150',
  all: 'transition-all duration-150',
  transform: 'transition-transform duration-150',
} as const;
