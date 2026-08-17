import { ThemeColors } from '@/types/index';

export const themes: Record<string, ThemeColors> = {
  github_light: {
    background: '#f6f8fa',
    backgroundGradient: 'linear-gradient(135deg, #f6f8fa 0%, #ffffff 50%, #f6f8fa 100%)',
    cardBackground: '#ffffff',
    border: '#d0d7de',
    title: '#0550ae',
    text: '#24292f',
    textSecondary: '#57606a',
    accent: '#0550ae',
    accentSecondary: '#1a7f37',
    iconColor: '#57606a',
    contributionLevels: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
  },
  github_dark: {
    background: '#0d1117',
    backgroundGradient: 'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%)',
    cardBackground: '#161b22',
    border: '#30363d',
    title: '#58a6ff',
    text: '#c9d1d9',
    textSecondary: '#8b949e',
    accent: '#58a6ff',
    accentSecondary: '#3fb950',
    iconColor: '#58a6ff',
    contributionLevels: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
  },
};

export function getTheme(name: string): ThemeColors {
  return themes[name] || themes.github_dark;
}