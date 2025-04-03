"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { RepoData } from "@/lib/github-api"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { AlertCircle, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface IssueStatsProps {
  data: RepoData
}

export default function IssueStats({ data }: IssueStatsProps) {
  const { issues } = data

  // Calculate issue resolution metrics
  const totalIssues = issues.open.length + issues.closed.length
  const resolutionRate = totalIssues > 0 ? (issues.closed.length / totalIssues) * 100 : 0

  // Get recent issues
  const recentIssues = [...issues.all]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="mr-2 h-5 w-5" />
              Issue Trends
            </CardTitle>
            <CardDescription>Monthly opened and closed issues</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={issues.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="opened" name="Opened" fill="#f97316" />
                <Bar dataKey="closed" name="Closed" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              Issue Resolution
            </CardTitle>
            <CardDescription>Time to close issues and resolution rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-[300px]">
              <div className="w-36 h-36 rounded-full border-8 border-muted flex items-center justify-center mb-4">
                <span className="text-3xl font-bold">{Math.round(resolutionRate)}%</span>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-medium">Resolution Rate</h3>
                <p className="text-sm text-muted-foreground">
                  {issues.closed.length} of {totalIssues} issues resolved
                </p>
              </div>
              <div className="mt-6 text-center">
                <h3 className="text-lg font-medium">Average Resolution Time</h3>
                <p className="text-2xl font-bold">{issues.avgResolutionTime.toFixed(1)} days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Issues</CardTitle>
          <CardDescription>The 5 most recently created issues</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentIssues.map((issue) => (
              <div key={issue.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">
                    <a href={issue.html_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {issue.title}
                    </a>
                  </h4>
                  <Badge variant={issue.state === "open" ? "outline" : "secondary"}>{issue.state}</Badge>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  #{issue.number} opened on {new Date(issue.created_at).toLocaleDateString()} by {issue.user.login}
                </div>
                {issue.labels.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {issue.labels.map((label: any) => (
                      <Badge
                        key={label.id}
                        variant="outline"
                        style={{
                          backgroundColor: `#${label.color}20`,
                          color: `#${label.color}`,
                          borderColor: `#${label.color}40`,
                        }}
                      >
                        {label.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {recentIssues.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">No issues found for this repository</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

