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
  const months = []
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
    merged: isPR ? month.merged : undefined,
  }))
}

