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

export interface OpenSourceValueData {
  username: string;
  totalScore: number;
  repositories: {
    name: string;
    fullName: string;
    contributorScore: number;
    isOpenSource: boolean;
    url: string;
  }[];
}

// Function to check if a repository is open source
async function isOpenSourceRepo(owner: string, repo: string): Promise<boolean> {
  try {
    // Get repository data
    const repoResponse = await octokit.repos.get({
      owner,
      repo,
    });
    
    // First check: If it's private, it's definitely not open source
    if (repoResponse.data.private) {
      console.log(`Repository ${owner}/${repo} is private, not open source`);
      return false;
    }
    
    // If it's public, we'll check further metrics to determine if it's a meaningful open source project
    
    const repoData = repoResponse.data;
    
    // Get contributors data
    let numContributors = 0;
    try {
      const contributorsResponse = await octokit.repos.listContributors({
        owner,
        repo,
        per_page: 100
      });
      numContributors = contributorsResponse.data.length;
    } catch (error) {
      console.warn(`Could not fetch contributors for ${owner}/${repo}:`, error);
      // Continue with the evaluation even if we can't get contributors
    }
    
    // Calculate activity in last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    // Initialize recentActivity
    let recentActivity = 0;
    
    // Try to fetch commit data, but continue if it fails
    try {
      const commitsResponse = await octokit.repos.listCommits({
        owner,
        repo,
        since: sixMonthsAgo.toISOString(),
        per_page: 100
      });
      recentActivity = commitsResponse.data.length;
    } catch (error) {
      console.warn(`Could not fetch recent commits for ${owner}/${repo}:`, error);
      // We'll continue with recentActivity = 0
    }
    
    // Analyze factors
    const factors = {
      forks: repoData.forks_count,
      stars: repoData.stargazers_count,
      contributors: numContributors,
      hasLicense: !!repoData.license,
      issues: repoData.open_issues_count,
      recentActivity: recentActivity,
      size: repoData.size // in KB
    };
    
    console.log(`Repository metrics for ${owner}/${repo}:`, factors);
    
    // IMPORTANT: Lower the threshold for what's considered open source
    // Scoring (using revised weights to be more inclusive)
    let score = 0;
    score += Math.min(factors.forks, 50) * 0.5;  // max 25 points
    score += Math.min(factors.stars, 100) * 0.3;  // max 30 points
    score += Math.min(factors.contributors, 10) * 5;  // max 50 points
    score += factors.hasLicense ? 20 : 0;
    score += Math.min(factors.issues, 50) * 0.4;  // max 20 points
    score += Math.min(factors.recentActivity, 100) * 0.2;  // max 20 points
    score += Math.min(factors.size / 1000, 10);  // max 10 points (for size in MB)
    
    // Public repositories with at least some minimal activity should be considered open source
    // Lower the threshold from 50 to 20
    const isOpenSource = score > 35;
    console.log(`Repository ${owner}/${repo} score: ${score}, isOpenSource: ${isOpenSource}`);
    
    return isOpenSource;
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
    
    // For debugging purposes
    console.log(`Calculating contributor score for ${username} in ${owner}/${repo}, isOpenSource: ${openSource}`);
    
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
    let userCommits: any[] = [];
    try {
      const commitsResponse = await octokit.repos.listCommits({
        owner,
        repo,
        author: username,
        per_page: 100
      });
      
      userCommits = commitsResponse.data;
      console.log(`Found ${userCommits.length} commits for ${username} in ${owner}/${repo}`);
    } catch (error) {
      console.warn(`Could not fetch commits for ${username} in ${owner}/${repo}:`, error);
    }
    
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
    
    // Initialize PR and issue stats
    let totalPRs = 0;
    let mergedPRs = 0;
    let issuesCreated = 0;
    
    // Check PRs created by the user
    try {
      const userPRsResponse = await octokit.search.issuesAndPullRequests({
        q: `type:pr author:${username} repo:${owner}/${repo}`
      });
      totalPRs = userPRsResponse.data.total_count;
      
      // Check PRs merged from the user
      const mergedPRsResponse = await octokit.search.issuesAndPullRequests({
        q: `type:pr author:${username} repo:${owner}/${repo} is:merged`
      });
      mergedPRs = mergedPRsResponse.data.total_count;
      
      console.log(`Found ${totalPRs} PRs (${mergedPRs} merged) for ${username} in ${owner}/${repo}`);
    } catch (error) {
      console.warn(`Could not fetch PRs for ${username} in ${owner}/${repo}:`, error);
    }
    
    // Check issues created by the user
    try {
      const userIssuesResponse = await octokit.search.issuesAndPullRequests({
        q: `type:issue author:${username} repo:${owner}/${repo}`
      });
      issuesCreated = userIssuesResponse.data.total_count;
      console.log(`Found ${issuesCreated} issues created by ${username} in ${owner}/${repo}`);
    } catch (error) {
      console.warn(`Could not fetch issues for ${username} in ${owner}/${repo}:`, error);
    }
    
    // Count user's recent activity (last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const recentCommits = userCommits.filter(
      commit => {
        const commitDate = commit.commit?.author?.date || commit.commit?.committer?.date;
        return commitDate ? new Date(commitDate) > threeMonthsAgo : false;
      }
    ).length;
    
    const recentActivity = userCommits.length > 0 
      ? (recentCommits / userCommits.length) * 100 
      : 0;
    
    // Compile stats
    const contributionStats = {
      totalCommits: userCommits.length,
      totalPRs,
      mergedPRs,
      issuesCreated,
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
    
    // Give points for any commits (even if not ranked)
    if (contributionStats.totalCommits > 0 && contributorScore === 0) {
      contributorScore += Math.min(10, contributionStats.totalCommits);
    }
    
    // 2. PR activity (up to 20 points)
    if (contributionStats.totalPRs > 0) {
      const prMergeRate = contributionStats.mergedPRs / contributionStats.totalPRs;
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
    
    // 5. Issue creation (up to 10 points)
    contributorScore += Math.min(10, contributionStats.issuesCreated);
    
    // Ensure score is between 0-100
    contributorScore = Math.max(0, Math.min(100, Math.round(contributorScore)));
    
    console.log(`Final contributor score for ${username} in ${owner}/${repo}: ${contributorScore}`);
    
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

// Calculate the open source value for a user
export async function calculateOpenSourceValue(username: string): Promise<OpenSourceValueData> {
  try {
    console.log(`Starting open source value calculation for ${username}`);
    
    // Fetch user's repositories
    const userReposResponse = await octokit.repos.listForUser({
      username,
      per_page: 100,
      sort: 'updated'
    });
    
    const repos = userReposResponse.data;
    console.log(`Found ${repos.length} repositories for user ${username}`);
    
    // Create result object
    const result: OpenSourceValueData = {
      username,
      totalScore: 0,
      repositories: []
    };
    
    // Process each repository with proper error handling
    // Use Promise.allSettled instead of Promise.all to handle individual repo failures
    const repoPromises = repos.map(async (repo) => {
      try {
        // Skip private repositories immediately
        if (repo.private) {
          console.log(`Skipping private repository: ${repo.full_name}`);
          return;
        }
        
        console.log(`Processing repository: ${repo.full_name}`);
        
        let repoOwner = repo.owner.login;
        let repoName = repo.name;
        
        // Check if repo is a fork and get parent info if needed
        if (repo.fork) {
          try {
            // Get the parent repository for a fork
            const repoDetailsResponse = await octokit.repos.get({
              owner: repo.owner.login,
              repo: repo.name
            });
            
            if (repoDetailsResponse.data.parent) {
              repoOwner = repoDetailsResponse.data.parent.owner.login;
              repoName = repoDetailsResponse.data.parent.name;
              console.log(`Fork repository, using parent: ${repoOwner}/${repoName}`);
            }
          } catch (error) {
            console.warn(`Could not get parent repo for ${repo.full_name}`, error);
            // Continue with the original repo if we can't get the parent
          }
        }
        
        // Calculate contributor score for this repository
        const contributorData = await calculateContributorScore(username, repoOwner, repoName);
        
        if (contributorData) {
          console.log(`Adding repository ${repoOwner}/${repoName} with score ${contributorData.contributorScore}, isOpenSource: ${contributorData.isOpenSource}`);
          
          result.repositories.push({
            name: repoName,
            fullName: `${repoOwner}/${repoName}`,
            contributorScore: contributorData.contributorScore,
            isOpenSource: contributorData.isOpenSource,
            url: `https://github.com/${repoOwner}/${repoName}`
          });
          
          // Only add to total score if it's an open source repository
          if (contributorData.isOpenSource) {
            result.totalScore += contributorData.contributorScore;
            console.log(`Adding ${contributorData.contributorScore} points to total score, new total: ${result.totalScore}`);
          }
        }
      } catch (error) {
        console.error(`Error processing repository ${repo.full_name}:`, error);
        // Continue with the next repo even if this one fails
      }
    });
    
    // Wait for all repository processing to complete
    const promiseResults = await Promise.allSettled(repoPromises);
    console.log(`Processed ${promiseResults.length} repositories, ${promiseResults.filter(r => r.status === 'fulfilled').length} succeeded`);
    
    // Sort repositories by contributor score (highest first)
    result.repositories.sort((a, b) => b.contributorScore - a.contributorScore);
    
    // Display summary information
    const openSourceRepos = result.repositories.filter(r => r.isOpenSource);
    console.log(`Open source value calculation completed for ${username}:`);
    console.log(`- Total repositories: ${result.repositories.length}`);
    console.log(`- Open source repositories: ${openSourceRepos.length}`);
    console.log(`- Total score: ${result.totalScore}`);
    
    return result;
  } catch (error) {
    console.error("Error calculating open source value:", error);
    return {
      username,
      totalScore: 0,
      repositories: []
    };
  }
}

