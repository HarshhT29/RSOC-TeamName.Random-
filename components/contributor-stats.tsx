"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { RepoData } from "@/lib/github-api"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users } from "lucide-react"

interface ContributorStatsProps {
  data: RepoData
}

export default function ContributorStats({ data }: ContributorStatsProps) {
  const { contributors } = data

  // Sort contributors by contributions
  const sortedContributors = [...contributors].sort((a, b) => b.contributions - a.contributions)

  // Prepare data for the chart
  const chartData = sortedContributors.slice(0, 10).map((contributor) => ({
    name: contributor.login,
    contributions: contributor.contributions,
  }))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Top Contributors
          </CardTitle>
          <CardDescription>Contributors with the most commits to this repository</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} />
              <Tooltip />
              <Legend />
              <Bar dataKey="contributions" name="Commits" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contributor Details</CardTitle>
          <CardDescription>Profile information for the top contributors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedContributors.slice(0, 9).map((contributor) => (
              <div key={contributor.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={contributor.avatar_url} alt={contributor.login} />
                  <AvatarFallback>{contributor.login.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-medium">{contributor.login}</h4>
                  <p className="text-sm text-muted-foreground">{contributor.contributions.toLocaleString()} commits</p>
                  <a
                    href={contributor.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    View Profile
                  </a>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

