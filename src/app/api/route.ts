import { NextRequest, NextResponse } from 'next/server';
import { fetchGitHubStats } from '@/lib/github';
import { generateInsightCard } from '@/lib/generator';
import { getTheme } from '@/lib/themes';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');
  const theme = searchParams.get('theme') || 'github_dark';

  const showGraph = searchParams.get('graph') !== 'false';
  const showLanguages = searchParams.get('languages') !== 'false';
  const showStreak = searchParams.get('streak') !== 'false';
  const showStats = searchParams.get('stats') !== 'false';
  const showHeader = searchParams.get('header') !== 'false';
  const showProfile = searchParams.get('profile') !== 'false';
  const showDevScore = searchParams.get('devscore') !== 'false';

  const hideLangs = searchParams.get('hide_langs') || '';
  const hiddenLanguages = hideLangs.split(',').map(l => l.trim()).filter(Boolean);

  if (!username) {
    return new NextResponse('Username is required', { status: 400 });
  }

  try {
    console.log(`Fetching stats for ${username}...`);
    const stats = await fetchGitHubStats(username, hiddenLanguages);
    const themeColors = getTheme(theme);
    const svg = generateInsightCard(stats, {
      theme: themeColors,
      showGraph,
      showLanguages,
      showStreak,
      showStats,
      showHeader,
      showProfile,
      showDevScore,
    });

    return new NextResponse(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate stats';
    return new NextResponse(`Error: ${errorMessage}`, { status: 500 });
  }
}