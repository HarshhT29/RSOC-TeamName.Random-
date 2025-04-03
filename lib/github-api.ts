import { Octokit } from "@octokit/rest"

// Create an Octokit instance
// In a real app, you would use an auth token from environment variables
const octokit = new Octokit({
  auth: process.env.NEXT_PUBLIC_GITHUB_TOKEN, // Optional: For higher rate limits
})

export interface RepoData {
  repo: any
  contributors: any[]
  issues: {
    all: any[]
    open: any[]
    closed: any[]
    monthlyTrends: {
      month: string
      opened: number
      closed: number
    }[]
    avgResolutionTime: number
  }
  pullRequests: {
    all: any[]
    open: any[]
    closed: any[]
    merged: any[]
    monthlyTrends: {
      month: string
      opened: number
      merged: number
    }[]
    avgMergeTime: number
  }
}

export interface ContributorScoreData {
  username: string
  repositoryName: string
  isOpenSource: boolean
  contributorScore: number
  totalScore: number
  userDetails: {
    login: string
    avatar_url: string
    html_url: string
    name?: string
    bio?: string
  }
  contributionStats: {
    totalCommits: number
    totalPRs: number
    mergedPRs: number
    issuesCreated: number
    issuesClosed: number
    isOwner: boolean
    isMaintainer: boolean
    commitsRank: number
    contributorCount: number
    recentActivity: number // Activity in the last 3 months (percentage of total activity)
  }
  repoHealthScore: number
}

// Function to check if a repository is open source
async function isOpenSourceRepo(owner: string, repo: string): Promise<boolean> {
  try {
    const repoResponse = await octokit.repos.get({
      owner,
      repo,
    });
    
    // A repository is considered open source if:
    // 1. It's not private
    // 2. It has a license (optional but good indicator)
    return !repoResponse.data.private;
  } catch (error) {
    console.error("Error checking if repo is open source:", error);
    return false;
  }
}

// Function to calculate repository health score
function calculateRepoHealthScore(data: RepoData): number {
  // Factors to consider:
  // 1. Ratio of closed to open issues
  // 2. Average issue resolution time
  // 3. PR merge frequency
  // 4. Recent activity

  let score = 0;
  const totalIssues = data.issues.open.length + data.issues.closed.length;

  // Issue resolution ratio (up to 40 points)
  if (totalIssues > 0) {
    const resolutionRatio = data.issues.closed.length / totalIssues;
    score += resolutionRatio * 40;
  } else {
    score += 30; // No issues could be good or bad, give benefit of doubt
  }

  // Issue resolution time (up to 30 points)
  if (data.issues.avgResolutionTime > 0) {
    // Lower is better, max 30 days considered
    const resolutionTimeScore = Math.max(0, 30 - Math.min(data.issues.avgResolutionTime, 30));
    score += (resolutionTimeScore / 30) * 30;
  }

  // PR activity (up to 30 points)
  const totalPRs = data.pullRequests.all.length;
  if (totalPRs > 0) {
    const mergeRatio = data.pullRequests.merged.length / totalPRs;
    score += mergeRatio * 30;
  }

  return Math.round(score);
}

// Calculate contributor score for a specific user in a repository
export async function calculateContributorScore(username: string, owner: string, repo: string): Promise<ContributorScoreData | null> {
  try {
    // Check if repository is open source
    const openSource = await isOpenSourceRepo(owner, repo);
    
    if (!openSource) {
      return {
        username,
        repositoryName: `${owner}/${repo}`,
        isOpenSource: false,
        contributorScore: 0,
        totalScore: 0,
        userDetails: {
          login: username,
          avatar_url: "",
          html_url: `https://github.com/${username}`
        },
        contributionStats: {
          totalCommits: 0,
          totalPRs: 0,
          mergedPRs: 0,
          issuesCreated: 0,
          issuesClosed: 0,
          isOwner: false,
          isMaintainer: false,
          commitsRank: 0,
          contributorCount: 0,
          recentActivity: 0
        },
        repoHealthScore: 0
      };
    }
    
    // Fetch repository data
    const repoData = await fetchRepoData(owner, repo);
    const repoHealthScore = calculateRepoHealthScore(repoData);
    
    // Get user details
    const userResponse = await octokit.users.getByUsername({
      username
    });
    
    // Check if user is the repository owner
    const isOwner = owner.toLowerCase() === username.toLowerCase();
    
    // Fetch repository collaborators to check if user is a maintainer
    let isMaintainer = false;
    try {
      const collaboratorsResponse = await octokit.repos.listCollaborators({
        owner,
        repo,
        affiliation: 'direct'
      });
      
      const userCollaborator = collaboratorsResponse.data.find(
        collab => collab.login.toLowerCase() === username.toLowerCase()
      );
      
      isMaintainer = !!userCollaborator && userCollaborator.permissions?.push === true;
    } catch (error) {
      console.warn("Could not check collaborator status, might need higher permissions", error);
    }
    
    // Fetch commits by the user
    const commitsResponse = await octokit.repos.listCommits({
      owner,
      repo,
      author: username,
      per_page: 100
    });
    
    const userCommits = commitsResponse.data;
    
    // Get total commit count for user ranking
    const allContributors = repoData.contributors;
    const contributorCount = allContributors.length;
    
    // Find user's rank by commits
    let commitsRank = 0;
    const sortedContributors = [...allContributors].sort((a, b) => b.contributions - a.contributions);
    const userContributor = sortedContributors.findIndex(c => c.login.toLowerCase() === username.toLowerCase());
    if (userContributor !== -1) {
      commitsRank = userContributor + 1; // Add 1 because array index is 0-based
    } else if (userCommits.length > 0) {
      // User has commits but not in top contributors
      commitsRank = contributorCount + 1;
    }
    
    // Check PRs created by the user
    const userPRsResponse = await octokit.search.issuesAndPullRequests({
      q: `type:pr author:${username} repo:${owner}/${repo}`
    });
    
    // Check PRs merged from the user
    const mergedPRsResponse = await octokit.search.issuesAndPullRequests({
      q: `type:pr author:${username} repo:${owner}/${repo} is:merged`
    });
    
    // Check issues created by the user
    const userIssuesResponse = await octokit.search.issuesAndPullRequests({
      q: `type:issue author:${username} repo:${owner}/${repo}`
    });
    
    // Check issues closed by the user (more difficult, need to check each issue)
    const closedIssuesResponse = await octokit.search.issuesAndPullRequests({
      q: `type:issue repo:${owner}/${repo} closed:>2000-01-01`
    });
    
    // Count user's recent activity (last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const recentCommits = userCommits.filter(
      commit => new Date(commit.commit.author?.date || commit.commit.committer?.date || "") > threeMonthsAgo
    ).length;
    
    const recentActivity = userCommits.length > 0 
      ? (recentCommits / userCommits.length) * 100 
      : 0;
    
    // Compile stats
    const contributionStats = {
      totalCommits: userCommits.length,
      totalPRs: userPRsResponse.data.total_count,
      mergedPRs: mergedPRsResponse.data.total_count,
      issuesCreated: userIssuesResponse.data.total_count,
      issuesClosed: 0, // We would need to check each issue, using 0 for now
      isOwner,
      isMaintainer,
      commitsRank,
      contributorCount,
      recentActivity
    };
    
    // Calculate contributor score (out of 100)
    let contributorScore = 0;
    
    // 1. Commit volume and rank (up to 40 points)
    if (contributorCount > 0) {
      // Top contributor gets 40 points, scales down
      const rankScore = commitsRank === 1 ? 40 : Math.max(0, 40 - ((commitsRank - 1) * (40 / Math.min(contributorCount, 10))));
      contributorScore += rankScore;
    }
    
    // 2. PR activity (up to 20 points)
    if (contributionStats.totalPRs > 0) {
      const prMergeRate = contributionStats.totalPRs > 0 
        ? contributionStats.mergedPRs / contributionStats.totalPRs
        : 0;
      contributorScore += Math.min(20, contributionStats.mergedPRs * 2) * prMergeRate;
    }
    
    // 3. Maintainer status (up to 20 points)
    if (contributionStats.isOwner) {
      contributorScore += 20;
    } else if (contributionStats.isMaintainer) {
      contributorScore += 15;
    }
    
    // 4. Recent activity (up to 20 points)
    contributorScore += (contributionStats.recentActivity / 100) * 20;
    
    // Ensure score is between 0-100
    contributorScore = Math.max(0, Math.min(100, Math.round(contributorScore)));
    
    // Calculate total score (repository health * contributor score / 100)
    const totalScore = Math.round((repoHealthScore * contributorScore) / 100);
    
    return {
      username,
      repositoryName: `${owner}/${repo}`,
      isOpenSource: openSource,
      contributorScore,
      totalScore,
      userDetails: {
        login: userResponse.data.login,
        avatar_url: userResponse.data.avatar_url,
        html_url: userResponse.data.html_url,
        name: userResponse.data.name || undefined,
        bio: userResponse.data.bio || undefined
      },
      contributionStats,
      repoHealthScore
    };
  } catch (error) {
    console.error("Error calculating contributor score:", error);
    return null;
  }
}

export async function fetchRepoData(owner: string, repo: string): Promise<RepoData> {
  try {
    // Fetch basic repository information
    const repoResponse = await octokit.repos.get({
      owner,
      repo,
    })

    // Fetch contributors
    const contributorsResponse = await octokit.repos.listContributors({
      owner,
      repo,
      per_page: 10,
    })

    // Fetch issues (last 100)
    const issuesResponse = await octokit.issues.listForRepo({
      owner,
      repo,
      state: "all",
      per_page: 100,
      sort: "created",
      direction: "desc",
    })

    // Filter out pull requests from issues (GitHub API includes PRs in issues)
    const issues = issuesResponse.data.filter((issue) => !issue.pull_request)

    // Fetch pull requests (last 100)
    const pullsResponse = await octokit.pulls.list({
      owner,
      repo,
      state: "all",
      per_page: 100,
      sort: "created",
      direction: "desc",
    })

    // Process issues data
    const openIssues = issues.filter((issue) => issue.state === "open")
    const closedIssues = issues.filter((issue) => issue.state === "closed")

    // Calculate average resolution time for closed issues
    const resolutionTimes = closedIssues.map((issue) => {
      const createdAt = new Date(issue.created_at)
      const closedAt = new Date(issue.closed_at!)
      return (closedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24) // in days
    })

    const avgResolutionTime =
      resolutionTimes.length > 0 ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length : 0

    // Process pull requests data
    const openPRs = pullsResponse.data.filter((pr) => pr.state === "open")
    const closedPRs = pullsResponse.data.filter((pr) => pr.state === "closed" && !pr.merged_at)
    const mergedPRs = pullsResponse.data.filter((pr) => pr.merged_at)

    // Calculate average merge time for merged PRs
    const mergeTimes = mergedPRs.map((pr) => {
      const createdAt = new Date(pr.created_at)
      const mergedAt = new Date(pr.merged_at!)
      return (mergedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24) // in days
    })

    const avgMergeTime = mergeTimes.length > 0 ? mergeTimes.reduce((sum, time) => sum + time, 0) / mergeTimes.length : 0

    // Generate monthly trends for issues
    const issueMonthlyTrends = generateMonthlyTrends(issues)

    // Generate monthly trends for pull requests
    const prMonthlyTrends = generateMonthlyTrends(pullsResponse.data, true)

    return {
      repo: repoResponse.data,
      contributors: contributorsResponse.data,
      issues: {
        all: issues,
        open: openIssues,
        closed: closedIssues,
        monthlyTrends: issueMonthlyTrends,
        avgResolutionTime,
      },
      pullRequests: {
        all: pullsResponse.data,
        open: openPRs,
        closed: closedPRs,
        merged: mergedPRs,
        monthlyTrends: prMonthlyTrends,
        avgMergeTime,
      },
    }
  } catch (error) {
    console.error("Error fetching GitHub data:", error)
    throw error
  }
}

function generateMonthlyTrends(items: any[], isPR = false) {
  // Get the last 6 months
  const months: {
    month: string;
    date: Date;
    opened: number;
    closed: number;
    merged: number;
  }[] = [];
  const today = new Date()

  for (let i = 5; i >= 0; i--) {
    const month = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const monthStr = month.toLocaleString("default", { month: "short", year: "numeric" })
    months.push({
      month: monthStr,
      date: month,
      opened: 0,
      closed: 0,
      merged: 0,
    })
  }

  // Count items by month
  items.forEach((item) => {
    const createdDate = new Date(item.created_at)
    const closedDate = item.closed_at ? new Date(item.closed_at) : null
    const mergedDate = item.merged_at ? new Date(item.merged_at) : null

    months.forEach((monthData) => {
      const nextMonth = new Date(monthData.date)
      nextMonth.setMonth(nextMonth.getMonth() + 1)

      // Count opened items
      if (createdDate >= monthData.date && createdDate < nextMonth) {
        monthData.opened++
      }

      // Count closed items
      if (closedDate && closedDate >= monthData.date && closedDate < nextMonth) {
        monthData.closed++
      }

      // Count merged PRs
      if (isPR && mergedDate && mergedDate >= monthData.date && mergedDate < nextMonth) {
        monthData.merged++
      }
    })
  })

  // Format the data for charts
  return months.map((month) => ({
    month: month.month,
    opened: month.opened,
    closed: month.closed,
    merged: isPR ? month.merged : 0,
  }))
}

