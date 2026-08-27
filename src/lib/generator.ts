import { GitHubStats, ThemeColors } from '@/types/index';
import { escapeHtml, renderIcon } from './svg-utils';

const FONT_FAMILY = "'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

interface CardOptions {
  theme: ThemeColors;
  showGraph?: boolean;
  showLanguages?: boolean;
  showStreak?: boolean;
  showStats?: boolean;
  showHeader?: boolean;
  showSummary?: boolean;
  showProfile?: boolean;
  showDevScore?: boolean;
}

function formatDateRange(startDateStr: string, endDateStr: string): string {
  if (!startDateStr || !endDateStr) return "";
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  if (startDate.getFullYear() === endDate.getFullYear()) {
    return `${months[startDate.getMonth()]} ${startDate.getDate()} - ${months[endDate.getMonth()]} ${endDate.getDate()}, ${endDate.getFullYear()}`;
  } else {
    return `${months[startDate.getMonth()]} ${startDate.getDate()}, ${startDate.getFullYear()} - ${months[endDate.getMonth()]} ${endDate.getDate()}, ${endDate.getFullYear()}`;
  }
}

function formatDateFull(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function getYearsAgo(dateStr: string): string {
  const created = new Date(dateStr);
  const now = new Date();
  const years = Math.floor((now.getTime() - created.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return `${years} year${years !== 1 ? "s" : ""} ago`;
}

function getGradeColor(rank: string): string {
  const gradeColors: Record<string, string> = {
    'S': '#fbbf24',
    'A+': '#10b981',
    'A': '#34d399',
    'A-': '#6ee7b7',
    'B+': '#60a5fa',
    'B': '#93c5fd',
    'B-': '#a78bfa',
    'C+': '#c4b5fd',
    'C': '#9ca3af',
  };
  return gradeColors[rank] || '#9ca3af';
}

function calculateGrade(stats: GitHubStats): { grade: string; color: string } {
  const grade = stats.rank;
  const color = getGradeColor(grade);
  return { grade, color };
}

function renderDeveloperMetric(theme: ThemeColors, label: string, value: string, current: number, max: number, color: string, y: number): string {
  const percentage = Math.min((current / max) * 100, 100);
  const barWidth = (percentage / 100) * 422;

  return `
    <g transform="translate(24, ${y})">
      <text x="0" y="10" font-size="12" fill="${theme.text}" font-family="${FONT_FAMILY}">${label}</text>
      <text x="422" y="10" text-anchor="end" font-size="12" font-weight="600" fill="${theme.text}" font-family="${FONT_FAMILY}">${value}</text>
      <rect x="0" y="16" width="422" height="4" rx="2" fill="${theme.border}"/>
      <rect x="0" y="16" width="${barWidth}" height="4" rx="2" fill="${color}"/>
    </g>
  `;
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}

function renderHeaderSection(
  stats: GitHubStats,
  theme: ThemeColors,
  startY: number,
  cardWidth: number,
  options: {
    showProfile?: boolean;
    showSummary?: boolean;
    showHeader?: boolean;
    showDevScore?: boolean;
  }
): { svg: string; height: number } {
  const { user, monthlyContributions } = stats;
  const name = escapeHtml(user.name || user.login);

  const showProfile = options.showProfile !== false;
  const showHeader = options.showHeader !== false;
  const showDevScore = options.showDevScore !== false;

  if (!showProfile && !showHeader && !showDevScore) {
    return { svg: "", height: 0 };
  }

  const profileSvg = showProfile ? `
    <g transform="translate(${cardWidth / 2}, 20)">
      <text x="0" y="0" text-anchor="middle" font-size="28" font-weight="700" fill="${theme.accent}" font-family="${FONT_FAMILY}" letter-spacing="0.5">
        ${name}
      </text>
    </g>
  ` : "";

  const profileHeight = showProfile ? 36 : 0;
  const startX = 48;
  let currentY = profileHeight + (showProfile ? 24 : 0);

  let headerSvg = '';
  let totalHeight = profileHeight + (showProfile ? 16 : 0);

  // Developer Score Card (60%) - Comes first
  if (showDevScore) {
    const devScoreCard = `
      <g transform="translate(${startX}, ${currentY})">
        <rect x="0" y="0" width="470" height="178" rx="14" fill="${theme.cardBackground}" stroke="${theme.border}" stroke-width="1"/>
        <g transform="translate(24, 16)">
          ${renderIcon("zap", 0, -1, theme.accent, 16)}
          <text x="26" y="12" font-size="14" font-weight="600" fill="${theme.title}" font-family="${FONT_FAMILY}" letter-spacing="0.3">Developer Score</text>
        </g>
        ${renderDeveloperMetric(theme, "Contribution Streak", `${stats.currentStreak.count} days`, stats.currentStreak.count, 365, "#58a6ff", 48)}
        ${renderDeveloperMetric(theme, "Community Reach", formatNumber(stats.user.followers.totalCount) + " follows", stats.user.followers.totalCount, 1000, "#f0883e", 78)}
        ${renderDeveloperMetric(theme, "Project Leadership", `${stats.user.repositories.totalCount} repos`, stats.user.repositories.totalCount, 20, "#d29922", 108)}
        ${renderDeveloperMetric(theme, "Language Diversity", `${stats.languages.length} languages`, stats.languages.length, 10, "#3fb950", 138)}
      </g>
    `;
    headerSvg += devScoreCard;
    totalHeight = Math.max(totalHeight, currentY + 178 + 10);
  }

  // Monthly Chart Card (40%) - Comes after Developer Score
  if (showHeader) {
    const monthlyData = monthlyContributions || [];
    const graphWidth = 200;
    const graphHeight = 90;
    const maxCount = Math.max(...monthlyData.map((d) => d.count), 1);

    const areaPoints: string[] = [];
    const linePoints: string[] = [];

    // Get last 7 months (Nov 25, Dec 25, Jan 26, Feb 26, Mar 26, Apr 26, May 26, Jun 26, Jul 26, Aug 26)
    const last7Months = monthlyData.slice(-7);

    last7Months.forEach((data, i) => {
      const x = 30 + (i / Math.max(last7Months.length - 1, 1)) * graphWidth;
      const y = graphHeight - (data.count / maxCount) * (graphHeight - 6);
      areaPoints.push(`L ${x} ${y}`);
      linePoints.push(`${i === 0 ? "M" : "L"} ${x} ${y}`);
    });

    const firstX = 30 + 0;
    const lastX = 30 + graphWidth;
    areaPoints.unshift(`M ${firstX} ${graphHeight}`);
    areaPoints.push(`L ${lastX} ${graphHeight} Z`);

    const areaPath = areaPoints.join(" ");
    const linePath = linePoints.join(" ");

    const chartX = showDevScore ? startX + 470 + 16 : startX;
    const chartWidth = showDevScore ? 280 : 770;

    // Labels: Nov 25, Feb 26, May 26, Aug 26 (every 3 months)
    const labelIndices = [0, 3, 6];
    const labelMonths = last7Months.filter((_, i) => labelIndices.includes(i));

    const miniChartSvg = `
      <g transform="translate(${chartX}, ${currentY})">
        <rect x="0" y="0" width="${chartWidth}" height="178" rx="14" fill="${theme.cardBackground}" stroke="${theme.border}" stroke-width="1"/>
        <g transform="translate(24, 16)">
          ${renderIcon("calendar", 0, -1, theme.accent, 16)}
          <text x="26" y="12" font-size="14" font-weight="600" fill="${theme.title}" font-family="${FONT_FAMILY}" letter-spacing="0.3">Monthly Chart</text>
        </g>
        <g transform="translate(24, 46)">
          <text x="0" y="8" font-size="8" fill="${theme.textSecondary}" font-family="${FONT_FAMILY}" text-anchor="end">${maxCount}</text>
          <text x="0" y="${graphHeight / 3 + 4}" font-size="8" fill="${theme.textSecondary}" font-family="${FONT_FAMILY}" text-anchor="end">${Math.round(maxCount * 2 / 3)}</text>
          <text x="0" y="${graphHeight * 2 / 3 + 4}" font-size="8" fill="${theme.textSecondary}" font-family="${FONT_FAMILY}" text-anchor="end">${Math.round(maxCount / 3)}</text>
          <text x="0" y="${graphHeight + 4}" font-size="8" fill="${theme.textSecondary}" font-family="${FONT_FAMILY}" text-anchor="end">0</text>
          <defs>
            <linearGradient id="miniAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:${theme.accent};stop-opacity:0.5" />
              <stop offset="100%" style="stop-color:${theme.accent};stop-opacity:0.05" />
            </linearGradient>
          </defs>
          <path d="${areaPath}" fill="url(#miniAreaGradient)" />
          <path d="${linePath}" fill="none" stroke="${theme.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <g transform="translate(30, ${graphHeight + 12})">
            ${labelMonths.map((data, idx) => {
              const originalIdx = last7Months.indexOf(data);
              return `<text x="${(originalIdx / Math.max(last7Months.length - 1, 1)) * graphWidth}" y="0" font-size="8" fill="${theme.textSecondary}" font-family="${FONT_FAMILY}" text-anchor="middle">${data.label}</text>`;
            }).join("")}
          </g>
        </g>
      </g>
    `;
    headerSvg += miniChartSvg;
    totalHeight = Math.max(totalHeight, currentY + 178 + 10);
  }

  return {
    svg: `<g transform="translate(0, ${startY})">${profileSvg}${headerSvg}</g>`,
    height: totalHeight
  };
}

function renderStatsCard(stats: GitHubStats, theme: ThemeColors, startY: number, startX: number = 40): { svg: string; height: number } {
  const { totalStars, totalContributions, totalPRs, totalIssues, totalCommits } = stats;
  const { grade, color: gradeColor } = calculateGrade(stats);

  const statItems = [
    { icon: "star", label: "Total Stars Earned", value: totalStars, color: "#fbbf24" },
    { icon: "activity", label: "Contributions (12mo)", value: totalContributions, color: "#60a5fa" },
    { icon: "issue", label: "Issues (12mo)", value: totalIssues, color: "#f472b6" },
    { icon: "pr", label: "Pull Requests (12mo)", value: totalPRs, color: "#a78bfa" },
    { icon: "commit", label: "Commits (12mo)", value: totalCommits, color: "#34d399" },
  ];

  const statsSvgParts = statItems.map((item, index) => {
    const y = index * 27;
    return `<g transform="translate(0, ${y})">${renderIcon(item.icon, 0, 0, item.color, 16)}<text x="26" y="12" font-size="13" fill="${theme.textSecondary}" font-family="${FONT_FAMILY}" letter-spacing="0.3">${item.label}</text><text x="230" y="12" font-size="14" font-weight="600" fill="${theme.text}" font-family="${FONT_FAMILY}" text-anchor="end" letter-spacing="0.2">${item.value.toLocaleString()}</text></g>`;
  });

  return {
    svg: `<g transform="translate(${startX}, ${startY})">
      <rect x="0" y="0" width="377" height="210" rx="14" fill="${theme.cardBackground}" stroke="${theme.border}" stroke-width="1"/>
      <g transform="translate(24, 24)">
        ${renderIcon("activity", 0, -1, theme.accent, 18)}
        <text x="28" y="13" font-size="16" font-weight="600" fill="${theme.title}" font-family="${FONT_FAMILY}" letter-spacing="0.3">General Statistics</text>
      </g>
      <g transform="translate(24, 56)">${statsSvgParts.join("")}</g>
      <g transform="translate(287, 58)">
        <circle cx="36" cy="36" r="34" fill="${theme.background}" stroke="${gradeColor}" stroke-width="2.5"/>
        <circle cx="36" cy="36" r="26" fill="${gradeColor}" opacity="0.1"/>
        <text x="36" y="41" text-anchor="middle" font-size="22" font-weight="700" fill="${gradeColor}" font-family="${FONT_FAMILY}" letter-spacing="0.5">${grade}</text>
      </g>
      <text x="323" y="176" text-anchor="middle" font-size="12" font-weight="500" fill="${theme.textSecondary}" font-family="${FONT_FAMILY}" letter-spacing="0.3">Rating</text>
    </g>`,
    height: 210
  };
}

function renderLanguagesCard(stats: GitHubStats, theme: ThemeColors, startY: number, startX: number): { svg: string; height: number } {
  const { languages } = stats;

  if (languages.length === 0) {
    return { svg: "", height: 0 };
  }

  const barWidth = 329;
  const barHeight = 12;
  const borderRadius = 6;

  let currentX = 0;
  const segments: { x: number; width: number; color: string }[] = [];

  const topLangs = languages.slice(0, 8);
  const validLangs = topLangs.filter((lang) => (lang.percentage / 100) * barWidth > 0.5);
  const totalPercentage = validLangs.reduce((sum, lang) => sum + lang.percentage, 0);

  for (let index = 0; index < validLangs.length; index++) {
    const lang = validLangs[index];
    const normalizedPercentage = (lang.percentage / totalPercentage) * 100;
    const width = (normalizedPercentage / 100) * barWidth;
    const actualWidth = index === validLangs.length - 1 ? barWidth - currentX : width;
    segments.push({ x: currentX, width: actualWidth, color: lang.color });
    currentX += actualWidth;
  }

  const segmentsSvg = segments.map((seg) => `<rect x="${seg.x}" y="0" width="${seg.width}" height="${barHeight}" fill="${seg.color}"/>`).join("");

  const leftColumn = topLangs.filter((_, i) => i % 2 === 0);
  const rightColumn = topLangs.filter((_, i) => i % 2 === 1);

  const leftLangsSvg = leftColumn.map((lang, index) => {
    const y = index * 27;
    return `<g transform="translate(0, ${y})"><circle cx="6" cy="7" r="5" fill="${lang.color}"/><text x="20" y="11" font-size="12" font-weight="500" fill="${theme.text}" font-family="${FONT_FAMILY}" letter-spacing="0.3">${escapeHtml(lang.name)}</text><text x="155" y="11" font-size="12" fill="${theme.textSecondary}" font-family="${FONT_FAMILY}" text-anchor="end" letter-spacing="0.2">${lang.percentage.toFixed(1)}%</text></g>`;
  }).join("");

  const rightLangsSvg = rightColumn.map((lang, index) => {
    const y = index * 27;
    return `<g transform="translate(175, ${y})"><circle cx="6" cy="7" r="5" fill="${lang.color}"/><text x="20" y="11" font-size="12" font-weight="500" fill="${theme.text}" font-family="${FONT_FAMILY}" letter-spacing="0.3">${escapeHtml(lang.name)}</text><text x="155" y="11" font-size="12" fill="${theme.textSecondary}" font-family="${FONT_FAMILY}" text-anchor="end" letter-spacing="0.2">${lang.percentage.toFixed(1)}%</text></g>`;
  }).join("");

  return {
    svg: `<g transform="translate(${startX}, ${startY})">
      <rect x="0" y="0" width="377" height="210" rx="14" fill="${theme.cardBackground}" stroke="${theme.border}" stroke-width="1"/>
      <g transform="translate(24, 24)">
        ${renderIcon("code", 0, -1, theme.accent, 18)}
        <text x="28" y="13" font-size="16" font-weight="600" fill="${theme.title}" font-family="${FONT_FAMILY}" letter-spacing="0.3">Primary Languages</text>
      </g>
      <g transform="translate(24, 56)">
        <defs><clipPath id="langBarClip"><rect x="0" y="0" width="${barWidth}" height="${barHeight}" rx="${borderRadius}"/></clipPath></defs>
        <rect x="0" y="0" width="${barWidth}" height="${barHeight}" rx="${borderRadius}" fill="${theme.background}"/>
        <g clip-path="url(#langBarClip)">${segmentsSvg}</g>
      </g>
      <g transform="translate(24, 84)">${leftLangsSvg}${rightLangsSvg}</g>
    </g>`,
    height: 210
  };
}

function renderContributionLineGraph(stats: GitHubStats, theme: ThemeColors, startY: number, cardWidth: number): { svg: string; height: number } {
  const { contributionData } = stats;

  if (!contributionData || contributionData.length === 0) {
    return { svg: "", height: 0 };
  }

  const last31Days = contributionData.slice(-31);
  const firstDate = new Date(last31Days[0].date);
  const lastDate = new Date(last31Days[last31Days.length - 1].date);
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  let monthLabel: string;
  if (firstDate.getMonth() === lastDate.getMonth() && firstDate.getFullYear() === lastDate.getFullYear()) {
    monthLabel = `${months[firstDate.getMonth()]} ${firstDate.getFullYear()}`;
  } else if (firstDate.getFullYear() === lastDate.getFullYear()) {
    monthLabel = `${months[firstDate.getMonth()].slice(0, 3)} - ${months[lastDate.getMonth()].slice(0, 3)} ${lastDate.getFullYear()}`;
  } else {
    monthLabel = `${months[firstDate.getMonth()].slice(0, 3)} ${firstDate.getFullYear()} - ${months[lastDate.getMonth()].slice(0, 3)} ${lastDate.getFullYear()}`;
  }

  const innerWidth = cardWidth - 80;
  const graphWidth = innerWidth - 70;
  const graphHeight = 80;
  const maxCount = Math.max(...last31Days.map((d) => d.contributionCount), 1);

  const linePathParts: string[] = [];
  const points: { x: number; y: number; date: string }[] = [];

  for (let i = 0; i < last31Days.length; i++) {
    const day = last31Days[i];
    const x = (i / Math.max(last31Days.length - 1, 1)) * graphWidth;
    const y = graphHeight - (day.contributionCount / maxCount) * (graphHeight - 10);
    points.push({ x, y, date: day.date });
    linePathParts.push(`${i === 0 ? "M" : "L"} ${x} ${y}`);
  }

  const linePath = linePathParts.join(" ");

  const dataPointsSvg = points.filter((_, i) => i % 5 === 0 || i === points.length - 1).map((p) => `<circle cx="${p.x}" cy="${p.y}" r="4" fill="${theme.accent}" stroke="${theme.cardBackground}" stroke-width="2"/>`).join("");

  const xAxisLabelsSvg = points.filter((_, i) => i % 7 === 0 || i === points.length - 1).map((p) => {
    const date = new Date(p.date);
    return `<text x="${p.x}" y="0" text-anchor="middle" font-size="10" fill="${theme.textSecondary}" font-family="${FONT_FAMILY}" letter-spacing="0.2">${date.getDate()}</text>`;
  }).join("");

  return {
    svg: `<g transform="translate(40, ${startY})">
      <rect x="0" y="0" width="${innerWidth}" height="${graphHeight + 90}" rx="14" fill="${theme.cardBackground}" stroke="${theme.border}" stroke-width="1"/>
      <g transform="translate(24, 16)">
        ${renderIcon("history", 0, -1, theme.accent, 18)}
        <text x="28" y="13" font-size="15" font-weight="600" fill="${theme.title}" font-family="${FONT_FAMILY}" letter-spacing="0.3">Contribution Activity</text>
        <text x="28" y="34" font-size="12" fill="${theme.textSecondary}" font-family="${FONT_FAMILY}" letter-spacing="0.2">Daily contributions · ${monthLabel}</text>
      </g>
      <g transform="translate(36, 66)">
        <text x="0" y="5" font-size="10" fill="${theme.textSecondary}" text-anchor="end" font-family="${FONT_FAMILY}" letter-spacing="0.2">${maxCount}</text>
        <text x="0" y="${graphHeight / 2 + 2}" font-size="10" fill="${theme.textSecondary}" text-anchor="end" font-family="${FONT_FAMILY}" letter-spacing="0.2">${Math.round(maxCount / 2)}</text>
        <text x="0" y="${graphHeight - 3}" font-size="10" fill="${theme.textSecondary}" text-anchor="end" font-family="${FONT_FAMILY}" letter-spacing="0.2">0</text>
        <line x1="10" y1="0" x2="${graphWidth + 12}" y2="0" stroke="${theme.border}" stroke-width="0.5" stroke-dasharray="4,2" opacity="0.4"/>
        <line x1="10" y1="${graphHeight / 2}" x2="${graphWidth + 12}" y2="${graphHeight / 2}" stroke="${theme.border}" stroke-width="0.5" stroke-dasharray="4,2" opacity="0.4"/>
        <line x1="10" y1="${graphHeight}" x2="${graphWidth + 12}" y2="${graphHeight}" stroke="${theme.border}" stroke-width="0.5"/>
      </g>
      <g transform="translate(52, 66)">
        <defs><linearGradient id="graphGradient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:${theme.accent};stop-opacity:0.3"/><stop offset="100%" style="stop-color:${theme.accent};stop-opacity:0.02"/></linearGradient></defs>
        <path d="${linePath} L ${graphWidth} ${graphHeight} L 0 ${graphHeight} Z" fill="url(#graphGradient)"/>
        <path d="${linePath}" fill="none" stroke="${theme.accent}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        ${dataPointsSvg}
      </g>
      <g transform="translate(52, ${graphHeight + 76})">${xAxisLabelsSvg}</g>
    </g>`,
    height: graphHeight + 70 + 28
  };
}

export function generateInsightCard(stats: GitHubStats, options: CardOptions): string {
  const { theme } = options;
  const cardWidth = 850;
  let currentY = 36;

  const headerSection = renderHeaderSection(stats, theme, currentY, cardWidth, {
    showProfile: options.showProfile,
    showSummary: options.showSummary,
    showHeader: options.showHeader,
    showDevScore: options.showDevScore,
  });
  currentY += headerSection.height + (headerSection.height > 0 ? 3 : 0);

  const showStats = options.showStats !== false;
  const showLanguages = options.showLanguages !== false;

  let statsStartX = 40;
  let languagesStartX = 433;

  if (showStats && !showLanguages) {
    statsStartX = (cardWidth - 377) / 2;
  } else if (!showStats && showLanguages) {
    languagesStartX = (cardWidth - 377) / 2;
  }

  const statsCard = showStats ? renderStatsCard(stats, theme, currentY, statsStartX) : { svg: "", height: 0 };
  const languagesCard = showLanguages ? renderLanguagesCard(stats, theme, currentY, languagesStartX) : { svg: "", height: 0 };

  const statsAndLangsHeight = Math.max(statsCard.height, languagesCard.height);
  currentY += statsAndLangsHeight + 3;

  // Streak Monitor removed - skip to Contribution Graph
  const graphSection = options.showGraph !== false ? renderContributionLineGraph(stats, theme, currentY, cardWidth) : { svg: "", height: 0 };
  currentY += graphSection.height;

  const cardHeight = currentY + 28;

  return `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${cardWidth}" height="${cardHeight}" viewBox="0 0 ${cardWidth} ${cardHeight}">
  <rect x="0" y="0" width="${cardWidth}" height="${cardHeight}" rx="16" fill="${theme.background}"/>
  <rect x="1" y="1" width="${cardWidth - 2}" height="${cardHeight - 2}" rx="15" fill="none" stroke="${theme.border}" stroke-width="1.5"/>
  
  ${headerSection.svg}
  ${statsCard.svg}
  ${languagesCard.svg}
  ${graphSection.svg}
</svg>
  `.trim();
}