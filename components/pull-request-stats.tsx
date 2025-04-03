"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { RepoData } from "@/lib/github-api"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { GitMerge, GitPullRequest } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface PullRequestStatsProps {
  data: RepoData
}

export default function PullRequestStats({ data }: PullRequestStatsProps) {
  const { pullRequests } = data

  // Calculate PR metrics
  const totalPRs = pullRequests.all.length
  const mergeRate = totalPRs > 0 ? (pullRequests.merged.length / totalPRs) * 100 : 0

  // Get recent PRs
  const recentPRs = [...pullRequests.all]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  // Get PR status
  const getPRStatus = (pr: any) => {
    if (pr.merged_at) return "merged"
    if (pr.state === "closed") return "closed"
    return "open"
  }

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "merged":
        return "secondary"
      case "closed":
        return "destructive"
      default:
        return "outline"
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <GitPullRequest className="mr-2 h-5 w-5" />
              Pull Request Trends
            </CardTitle>
            <CardDescription>Monthly opened and merged pull requests</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pullRequests.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="opened" name="Opened" fill="#3b82f6" />
                <Bar dataKey="merged" name="Merged" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <GitMerge className="mr-2 h-5 w-5" />
              Pull Request Metrics
            </CardTitle>
            <CardDescription>Merge rate and average time to merge</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-[300px]">
              <div className="w-36 h-36 rounded-full border-8 border-muted flex items-center justify-center mb-4">
                <span className="text-3xl font-bold">{Math.round(mergeRate)}%</span>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-medium">Merge Rate</h3>
                <p className="text-sm text-muted-foreground">
                  {pullRequests.merged.length} of {totalPRs} PRs merged
                </p>
              </div>
              <div className="mt-6 text-center">
                <h3 className="text-lg font-medium">Average Merge Time</h3>
                <p className="text-2xl font-bold">{pullRequests.avgMergeTime.toFixed(1)} days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Pull Requests</CardTitle>
          <CardDescription>The 5 most recently created pull requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentPRs.map((pr) => {
              const status = getPRStatus(pr)

              return (
                <div key={pr.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">
                      <a href={pr.html_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {pr.title}
                      </a>
                    </h4>
                    <Badge variant={getStatusBadgeVariant(status)}>{status}</Badge>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    #{pr.number} opened on {new Date(pr.created_at).toLocaleDateString()} by {pr.user.login}
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="text-muted-foreground">
                      {pr.base.ref} ← {pr.head.ref}
                    </span>
                  </div>
                </div>
              )
            })}

            {recentPRs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">No pull requests found for this repository</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

