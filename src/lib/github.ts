import { graphql } from '@octokit/graphql';
import { GitHubUser, GitHubStats, LanguageStats, ContributionDay, StreakInfo, MonthlyContribution } from '@/types/index';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
  console.warn('⚠️ GITHUB_TOKEN not set. Please add it to .env.local');
}

const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `Bearer ${GITHUB_TOKEN}`,
  },
});

function renameGoToGolang(languages: LanguageStats[]): LanguageStats[] {
  return languages.map(lang => {
    if (lang.name === 'Go') {
      return { ...lang, name: 'Golang' };
    }
    return lang;
  });
}

function calculateStreaks(contributionDays: ContributionDay[]): { current: StreakInfo; longest: StreakInfo } {
  if (!contributionDays || contributionDays.length === 0) {
    return {
      current: { count: 0, startDate: '', endDate: '' },
      longest: { count: 0, startDate: '', endDate: '' }
    };
  }

  const sortedDays = [...contributionDays].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let longest: StreakInfo = { count: 0, startDate: '', endDate: '' };
  let currentCount = 0;
  let currentStart = '';
  let currentEnd = '';

  for (const day of sortedDays) {
    if (day.contributionCount > 0) {
      if (currentCount === 0) currentStart = day.date;
      currentCount++;
      currentEnd = day.date;
    } else {
      if (currentCount > 0) {
        if (currentCount > longest.count) {
          longest = { count: currentCount, startDate: currentStart, endDate: currentEnd };
        }
        currentCount = 0;
      }
    }
  }

  if (currentCount > 0 && currentCount > longest.count) {
    longest = { count: currentCount, startDate: currentStart, endDate: currentEnd };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let streak = 0;
  let startDate = '';
  
  for (let i = sortedDays.length - 1; i >= 0; i--) {
    const day = sortedDays[i];
    const dayDate = new Date(day.date);
    dayDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((today.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0 || diffDays === 1) {
      if (day.contributionCount > 0) {
        if (streak === 0) startDate = day.date;
        streak++;
      } else {
        break;
      }
    } else {
      break;
    }
  }

  const currentStreak: StreakInfo = streak > 0
    ? { count: streak, startDate: startDate, endDate: sortedDays[sortedDays.length - 1]?.date || '' }
    : { count: 0, startDate: '', endDate: '' };

  return { current: currentStreak, longest };
}

interface GraphQLResponse {
  user: {
    login: string;
    name: string | null;
    location: string | null;
    createdAt: string;
    followers: { totalCount: number };
    repositories: {
      totalCount: number;
      nodes: Array<{
        stargazerCount: number;
        forkCount: number;
        isFork: boolean;
        languages: {
          edges: Array<{
            size: number;
            node: {
              name: string;
              color: string;
            };
          }>;
        } | null;
      }>;
    };
    contributionsCollection: {
      totalCommitContributions: number;
      totalIssueContributions: number;
      totalPullRequestContributions: number;
      totalPullRequestReviewContributions: number;
      totalRepositoryContributions: number;
      contributionCalendar: {
        totalContributions: number;
        weeks: Array<{
          contributionDays: Array<{
            contributionCount: number;
            date: string;
          }>;
        }>;
      };
    };
  };
}

export async function fetchGitHubStats(username: string, hiddenLanguages: string[] = []): Promise<GitHubStats> {
  const query = `
    query($username: String!) {
      user(login: $username) {
        login
        name
        location
        createdAt
        followers { totalCount }
        repositories(first: 100, ownerAffiliations: OWNER, privacy: PUBLIC) {
          totalCount
          nodes {
            stargazerCount
            forkCount
            isFork
            languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
              edges {
                size
                node {
                  name
                  color
                }
              }
            }
          }
        }
        contributionsCollection {
          totalCommitContributions
          totalIssueContributions
          totalPullRequestContributions
          totalPullRequestReviewContributions
          totalRepositoryContributions
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
      }
    }
  `;

  try {
    const data = await graphqlWithAuth<GraphQLResponse>(query, { username });
    const user = data.user;
    
    if (!user) {
      throw new Error(`User "${username}" not found`);
    }

    const repos = user.repositories.nodes || [];
    let totalStars = 0;
    const languageMap = new Map<string, { name: string; color: string; size: number }>();
    
    const allHiddenLanguages = [...hiddenLanguages, 'HTML', 'CSS'];
    const hiddenSet = new Set(allHiddenLanguages.map(l => l.toLowerCase()));

    for (const repo of repos) {
      if (repo.isFork) continue;
      totalStars += repo.stargazerCount || 0;
      
      if (repo.languages?.edges) {
        for (const edge of repo.languages.edges) {
          const name = edge.node.name;
          if (hiddenSet.has(name.toLowerCase())) continue;
          
          if (languageMap.has(name)) {
            const existing = languageMap.get(name)!;
            existing.size += edge.size;
          } else {
            languageMap.set(name, {
              name,
              color: edge.node.color || '#858585',
              size: edge.size
            });
          }
        }
      }
    }

    const totalLangSize = Array.from(languageMap.values()).reduce((s, l) => s + l.size, 0);
    let languages: LanguageStats[] = Array.from(languageMap.values())
      .map(l => ({
        ...l,
        percentage: totalLangSize > 0 ? (l.size / totalLangSize) * 100 : 0
      }))
      .sort((a, b) => b.percentage - a.percentage);

    languages = renameGoToGolang(languages);

    const contributionDays: ContributionDay[] = user.contributionsCollection.contributionCalendar.weeks
      .flatMap((w) => w.contributionDays);
    const streaks = calculateStreaks(contributionDays);
    const activeDays = contributionDays.filter(d => d.contributionCount > 0).length;

    const monthMap = new Map<string, number>();
    for (const d of contributionDays) {
      const m = d.date.slice(0, 7);
      monthMap.set(m, (monthMap.get(m) || 0) + d.contributionCount);
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyContributions: MonthlyContribution[] = Array.from(monthMap.entries())
      .sort()
      .slice(-12)
      .map(([m, count]) => ({
        month: m,
        label: `${months[parseInt(m.split('-')[1]) - 1]} '${m.slice(2, 4)}`,
        count
      }));

    const commits = user.contributionsCollection.totalCommitContributions || 0;
    const prs = user.contributionsCollection.totalPullRequestContributions || 0;
    const issues = user.contributionsCollection.totalIssueContributions || 0;
    const reviews = user.contributionsCollection.totalPullRequestReviewContributions || 0;
    const followers = user.followers.totalCount || 0;

    const score = commits * 0.3 + prs * 0.25 + issues * 0.15 + reviews * 0.1 + totalStars * 0.1 + followers * 0.1;
    let rank = 'C';
    if (score > 1000) rank = 'S';
    else if (score > 500) rank = 'A+';
    else if (score > 300) rank = 'A';
    else if (score > 200) rank = 'A-';
    else if (score > 150) rank = 'B+';
    else if (score > 100) rank = 'B';
    else if (score > 50) rank = 'B-';
    else if (score > 25) rank = 'C+';

    return {
      user: user as unknown as GitHubUser,
      totalStars,
      totalForks: 0,
      totalCommits: commits,
      totalPRs: prs,
      totalIssues: issues,
      totalContributions: user.contributionsCollection.contributionCalendar.totalContributions,
      totalContributionsAllTime: contributionDays.reduce((s, d) => s + d.contributionCount, 0),
      contributedRepos: user.contributionsCollection.totalRepositoryContributions || 0,
      languages,
      currentStreak: streaks.current,
      longestStreak: streaks.longest,
      accountCreatedAt: user.createdAt,
      contributionData: contributionDays,
      monthlyContributions,
      rank,
      rankPercentile: 0,
      activeDays,
    };
  } catch (error) {
    console.error('GitHub API Error:', error);
    throw error;
  }
}