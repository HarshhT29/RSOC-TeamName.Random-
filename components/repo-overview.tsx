"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { RepoData } from "@/lib/github-api"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, GitFork, Star, Eye, AlertCircle, GitPullRequest } from "lucide-react"

interface RepoOverviewProps {
  data: RepoData
}

export default function RepoOverview({ data }: RepoOverviewProps) {
  const { repo, issues, pullRequests } = data

  // Calculate repository health score (simple algorithm)
  const calculateHealthScore = () => {
    // Factors to consider:
    // 1. Ratio of closed to open issues
    // 2. Average issue resolution time
    // 3. PR merge frequency
    // 4. Recent activity

    let score = 0
    const totalIssues = issues.open.length + issues.closed.length

    // Issue resolution ratio (up to 40 points)
    if (totalIssues > 0) {
      const resolutionRatio = issues.closed.length / totalIssues
      score += resolutionRatio * 40
    } else {
      score += 30 // No issues could be good or bad, give benefit of doubt
    }

    // Issue resolution time (up to 30 points)
    if (issues.avgResolutionTime > 0) {
      // Lower is better, max 30 days considered
      const resolutionTimeScore = Math.max(0, 30 - Math.min(issues.avgResolutionTime, 30))
      score += (resolutionTimeScore / 30) * 30
    }

    // PR activity (up to 30 points)
    const totalPRs = pullRequests.all.length
    if (totalPRs > 0) {
      const mergeRatio = pullRequests.merged.length / totalPRs
      score += mergeRatio * 30
    }

    return Math.round(score)
  }

  const healthScore = calculateHealthScore()

  // Determine health status based on score
  const getHealthStatus = () => {
    if (healthScore >= 80) return { label: "Excellent", color: "bg-green-500" }
    if (healthScore >= 60) return { label: "Good", color: "bg-emerald-500" }
    if (healthScore >= 40) return { label: "Fair", color: "bg-yellow-500" }
    return { label: "Needs Improvement", color: "bg-red-500" }
  }

  const healthStatus = getHealthStatus()

  // Activity overview data
  const activityData = [
    { name: "Stars", value: repo.stargazers_count },
    { name: "Forks", value: repo.forks_count },
    { name: "Open Issues", value: repo.open_issues_count },
    { name: "Watchers", value: repo.watchers_count },
  ]

  // Issue status data for pie chart
  const issueStatusData = [
    { name: "Open", value: issues.open.length, color: "#f97316" },
    { name: "Closed", value: issues.closed.length, color: "#22c55e" },
  ]

  // PR status data for pie chart
  const prStatusData = [
    { name: "Open", value: pullRequests.open.length, color: "#3b82f6" },
    { name: "Closed", value: pullRequests.closed.length, color: "#ef4444" },
    { name: "Merged", value: pullRequests.merged.length, color: "#8b5cf6" },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Repository Health</CardTitle>
            <CardDescription>Overall health assessment based on activity and maintenance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold">{healthScore}/100</h3>
                <Badge className={`mt-2 ${healthStatus.color}`}>{healthStatus.label}</Badge>
              </div>
              <div className="w-24 h-24 rounded-full border-8 border-muted flex items-center justify-center">
                <span className="text-2xl font-bold">{healthScore}</span>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Issue Resolution:</span>
                <span>{issues.avgResolutionTime.toFixed(1)} days avg</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">PR Merge Time:</span>
                <span>{pullRequests.avgMergeTime.toFixed(1)} days avg</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Created:</span>
                <span>{new Date(repo.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Last Updated:</span>
                <span>{new Date(repo.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Repository Activity</CardTitle>
            <CardDescription>Key metrics overview</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="mr-2 h-5 w-5" />
              Issue Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={issueStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {issueStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div>
                <div className="text-lg font-bold">{issues.open.length}</div>
                <div className="text-sm text-muted-foreground">Open Issues</div>
              </div>
              <div>
                <div className="text-lg font-bold">{issues.closed.length}</div>
                <div className="text-sm text-muted-foreground">Closed Issues</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <GitPullRequest className="mr-2 h-5 w-5" />
              Pull Request Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={prStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {prStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-bold">{pullRequests.open.length}</div>
                <div className="text-sm text-muted-foreground">Open</div>
              </div>
              <div>
                <div className="text-lg font-bold">{pullRequests.closed.length}</div>
                <div className="text-sm text-muted-foreground">Closed</div>
              </div>
              <div>
                <div className="text-lg font-bold">{pullRequests.merged.length}</div>
                <div className="text-sm text-muted-foreground">Merged</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Repository Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <CalendarDays className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Created</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(repo.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Star className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Stars</div>
                  <div className="text-sm text-muted-foreground">{repo.stargazers_count.toLocaleString()}</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <GitFork className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Forks</div>
                  <div className="text-sm text-muted-foreground">{repo.forks_count.toLocaleString()}</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <Eye className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Watchers</div>
                  <div className="text-sm text-muted-foreground">{repo.watchers_count.toLocaleString()}</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Open Issues</div>
                  <div className="text-sm text-muted-foreground">{repo.open_issues_count.toLocaleString()}</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <GitPullRequest className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Default Branch</div>
                  <div className="text-sm text-muted-foreground">{repo.default_branch}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

