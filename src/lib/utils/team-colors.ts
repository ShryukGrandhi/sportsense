// Team color mapping utility

export interface TeamTheme {
    primary: string; // Background/accent color (Tailwind class or hex)
    secondary: string; // Secondary accent
    text: string; // Text color
    gradient: string; // CSS gradient class
    border: string; // Border color class
    glow: string; // Box shadow / glow color
}

// Default theme for unknown teams
const defaultTheme: TeamTheme = {
    primary: 'indigo-500',
    secondary: 'purple-500',
    text: 'text-indigo-100',
    gradient: 'from-slate-800 to-slate-900',
    border: 'border-slate-700',
    glow: 'shadow-indigo-500/20',
};

// Map by team abbreviation
export const teamThemes: Record<string, TeamTheme> = {
    // NFL
    CHI: {
        primary: 'orange-500', // Bears Orange
        secondary: 'blue-900', // Navy
        text: 'text-orange-50',
        gradient: 'from-blue-950 via-slate-900 to-slate-950', // Deep Navy background
        border: 'border-orange-500/30',
        glow: 'shadow-orange-500/20',
    },
    CIN: {
        primary: 'orange-500', // Bengals Orange
        secondary: 'black',
        text: 'text-orange-50',
        gradient: 'from-slate-900 via-slate-900 to-black',
        border: 'border-orange-600/40',
        glow: 'shadow-orange-500/20',
    },
    GB: {
        primary: 'green-600',
        secondary: 'yellow-400',
        text: 'text-green-50',
        gradient: 'from-green-950 to-slate-950',
        border: 'border-yellow-500/30',
        glow: 'shadow-green-500/20',
    },
    // NBA
    LAL: {
        primary: 'purple-600', // Lakers Purple
        secondary: 'yellow-400', // Gold
        text: 'text-purple-50',
        gradient: 'from-purple-950 via-slate-900 to-slate-950',
        border: 'border-yellow-500/30',
        glow: 'shadow-purple-500/20',
    },
    SAS: {
        primary: 'slate-200', // Silver
        secondary: 'black',
        text: 'text-slate-200',
        gradient: 'from-slate-800 to-black',
        border: 'border-slate-500/30',
        glow: 'shadow-slate-500/10',
    },
    // Add more as needed...
};

export function getTeamTheme(abbreviation: string): TeamTheme {
    return teamThemes[abbreviation] || defaultTheme;
}
