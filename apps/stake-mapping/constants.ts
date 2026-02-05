
import { ProjectConfig, ZoneConfig } from './types';

export const BOARD_SIZE = 600;
export const TOKEN_RADIUS = 24;

export const PALETTE = [
    '#dc2626', '#ea580c', '#d97706', '#ca8a04', 
    '#65a30d', '#16a34a', '#059669', '#0d9488', 
    '#0891b2', '#2563eb', '#4f46e5', '#7c3aed', 
    '#9333ea', '#c026d3', '#db2777', '#e11d48'
];

export const THEME_COLORS = [
    '#d1fae5', // Emerald 100
    '#ccfbf1', // Teal 100
    '#e0f2fe', // Sky 100
    '#dbeafe', // Blue 100
    '#e0e7ff', // Indigo 100
    '#ede9fe', // Violet 100
    '#fae8ff', // Fuchsia 100
    '#ffe4e6', // Rose 100
    '#fee2e2', // Red 100
    '#ffedd5', // Orange 100
    '#fef3c7', // Amber 100
    '#ecfccb', // Lime 100
];

// Mapping pastel backgrounds (100) to saturated accents (600)
export const THEME_ACCENTS: Record<string, string> = {
    '#d1fae5': '#059669', // Emerald
    '#ccfbf1': '#0d9488', // Teal
    '#e0f2fe': '#0284c7', // Sky
    '#dbeafe': '#2563eb', // Blue
    '#e0e7ff': '#4f46e5', // Indigo
    '#ede9fe': '#7c3aed', // Violet
    '#fae8ff': '#c026d3', // Fuchsia
    '#ffe4e6': '#e11d48', // Rose
    '#fee2e2': '#dc2626', // Red
    '#ffedd5': '#ea580c', // Orange
    '#fef3c7': '#d97706', // Amber
    '#ecfccb': '#65a30d', // Lime
};

export const getThemeAccent = (themeColor: string) => {
    // Return mapped accent or fallback to a darkened version/default blue if not found
    return THEME_ACCENTS[themeColor.toLowerCase()] || '#2563eb';
};

export const FIXED_PENULTIMATE_COLOR = '#f9fafc'; // Slate 50

// --- COLOR HELPERS ---

const hexToRgb = (hex: string) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
};

const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

export const interpolateColor = (color1: string, color2: string, factor: number) => {
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    const r = Math.round(c1.r + factor * (c2.r - c1.r));
    const g = Math.round(c1.g + factor * (c2.g - c1.g));
    const b = Math.round(c1.b + factor * (c2.b - c1.b));
    return rgbToHex(r, g, b);
};

// Generates a lighter tint of a color. 
// factor: 0 = original, 1 = white. 0.85 is good for backgrounds.
export const lightenColor = (hex: string, factor: number) => {
    const { r, g, b } = hexToRgb(hex);
    const newR = Math.round(r + (255 - r) * factor);
    const newG = Math.round(g + (255 - g) * factor);
    const newB = Math.round(b + (255 - b) * factor);
    return rgbToHex(newR, newG, newB);
};

export const applyGradientToZones = (zones: ZoneConfig[], startColor: string): ZoneConfig[] => {
    const len = zones.length;
    if (len === 0) return zones;
    if (len === 1) return [{ ...zones[0], color: startColor }];
    if (len === 2) {
        return [
            { ...zones[0], color: startColor },
            { ...zones[1], color: '#ffffff' }
        ];
    }

    const pivotIdx = len - 2; 

    return zones.map((zone, idx) => {
        let color = '';

        if (idx === len - 1) {
            // Last is always White
            color = '#ffffff';
        } else if (idx === pivotIdx) {
            // Penultimate is Fixed
            color = FIXED_PENULTIMATE_COLOR;
        } else if (idx === 0) {
            color = startColor;
        } else if (idx < pivotIdx) {
            // Interpolate Start -> Penultimate
            const factor = idx / pivotIdx;
            color = interpolateColor(startColor, FIXED_PENULTIMATE_COLOR, factor);
        } else {
            color = '#ffffff'; 
        }

        return { ...zone, color };
    });
};

// --- DEFAULT CONFIG ---

const baseRelZones: ZoneConfig[] = [
    { id: 'z_r1', label: 'Strategic', color: '' },
    { id: 'z_r2', label: 'Frequent', color: '' },
    { id: 'z_r3', label: 'Occasional', color: '' },
    { id: 'z_r4', label: 'None', color: '' }
];

const baseImpZones: ZoneConfig[] = [
    { id: 'z_i1', label: 'Critical', color: '' },
    { id: 'z_i2', label: 'Important', color: '' },
    { id: 'z_i3', label: 'Relevant', color: '' },
    { id: 'z_i4', label: 'Peripheral', color: '' }
];

export const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
    stakeholders: [
        { id: 'sh_1', label: 'Stakeholder 1', color: '#dc2626' },
        { id: 'sh_2', label: 'Stakeholder 2', color: '#2563eb' },
        { id: 'sh_3', label: 'Stakeholder 3', color: '#16a34a' },
        { id: 'sh_4', label: 'Stakeholder 4', color: '#d97706' }
    ],
    relationshipZones: applyGradientToZones(baseRelZones, THEME_COLORS[0]), // Emerald 100
    impactZones: applyGradientToZones(baseImpZones, THEME_COLORS[3]),      // Blue 100
    useStakeholderColors: false
};
