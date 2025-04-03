"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { Award, Code, GitPullRequest, GitMerge, AlertCircle, Github, User } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { calculateContributorScore, type ContributorScoreData } from "@/lib/github-api"
import type React from "react"

export default function ContributorScore() {
  const [username, setUsername] = useState("")
  const [repoUrl, setRepoUrl] = useState("")
  const [userRepoInfo, setUserRepoInfo] = useState<{ username: string; owner: string; repo: string } | null>(null)
  const { toast } = useToast()

  const parseGitHubUrl = (url: string) => {
    try {
      const parsedUrl = new URL(url)
      if (parsedUrl.hostname !== "github.com") {
        throw new Error("Not a valid GitHub URL")
      }

      const pathParts = parsedUrl.pathname.split("/").filter(Boolean)
      if (pathParts.length < 2) {
        throw new Error("URL does not contain a valid repository path")
      }

      return { owner: pathParts[0], repo: pathParts[1] }
    } catch (error) {
      return null
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = parseGitHubUrl(repoUrl)

    if (!parsed) {
      toast({
        title: "Invalid GitHub URL",
        description: "Please enter a valid GitHub repository URL (e.g., https://github.com/owner/repo)",
        variant: "destructive",
      })
      return
    }

    if (!username.trim()) {
      toast({
        title: "Username Required",
        description: "Please enter a GitHub username",
        variant: "destructive",
      })
      return
    }

    setUserRepoInfo({
      username: username.trim(),
      owner: parsed.owner,
      repo: parsed.repo,
    })
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ["contributorScore", userRepoInfo?.username, userRepoInfo?.owner, userRepoInfo?.repo],
    queryFn: () =>
      userRepoInfo
        ? calculateContributorScore(userRepoInfo.username, userRepoInfo.owner, userRepoInfo.repo)
        : null,
    enabled: !!userRepoInfo,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Helper function to get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500"
    if (score >= 60) return "bg-emerald-500"
    if (score >= 40) return "bg-yellow-500"
    return "bg-red-500"
  }

  // Helper function to get score label
  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent"
    if (score >= 60) return "Good"
    if (score >= 40) return "Fair"
    return "Low"
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center">
          <User className="mr-2" /> GitHub Contributor Score
        </h1>
        <p className="text-muted-foreground text-center max-w-2xl mb-6">
          Analyze a GitHub user's contributions and importance to a specific repository. Enter a GitHub username
          and repository URL below.
        </p>

        <form onSubmit={handleSubmit} className="w-full max-w-xl space-y-3">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="GitHub Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="flex-1"
            />
          </div>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Repository URL (https://github.com/owner/repo)"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Analyzing..." : "Analyze"}
            </Button>
          </div>
        </form>
      </div>

      {error && (
        <Card className="mb-6 border-red-400">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="mr-2 h-5 w-5 text-red-500" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Failed to fetch contributor data. Please check the username and repository URL and try again.</p>
          </CardContent>
        </Card>
      )}

      {data && !data.isOpenSource && (
        <Card className="mb-6 border-yellow-400">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="mr-2 h-5 w-5 text-yellow-500" />
              Repository Not Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              This repository is not publicly accessible. It might be private or may not exist. Only public repositories
              can be analyzed.
            </p>
          </CardContent>
        </Card>
      )}

      {data && data.isOpenSource && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Avatar className="h-12 w-12 mr-4">
                    <AvatarImage src={data.userDetails.avatar_url} alt={data.userDetails.login} />
                    <AvatarFallback>{data.userDetails.login.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-2xl">
                      <a
                        href={data.userDetails.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline flex items-center"
                      >
                        {data.userDetails.name || data.userDetails.login}
                        <Github className="ml-2 h-5 w-5" />
                      </a>
                    </CardTitle>
                    <CardDescription>
                      @{data.userDetails.login} {data.userDetails.bio && `• ${data.userDetails.bio}`}
                    </CardDescription>
                  </div>
                </div>
                <div className="text-center">
                  <a
                    href={`https://github.com/${data.repositoryName}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:underline"
                  >
                    {data.repositoryName}
                  </a>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card>
                  <CardHeader className="py-4">
                    <CardTitle className="text-lg flex items-center">
                      <Award className="mr-2 h-5 w-5 text-yellow-500" />
                      Contributor Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="text-center">
                      <div className="text-3xl font-bold mb-2">{data.contributorScore}/100</div>
                      <Badge className={getScoreColor(data.contributorScore)}>
                        {getScoreLabel(data.contributorScore)}
                      </Badge>
                      <Progress 
                        value={data.contributorScore} 
                        className="h-2 mt-3" 
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-4">
                    <CardTitle className="text-lg flex items-center">
                      <Code className="mr-2 h-5 w-5 text-blue-500" />
                      Repository Health
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="text-center">
                      <div className="text-3xl font-bold mb-2">{data.repoHealthScore}/100</div>
                      <Badge className={getScoreColor(data.repoHealthScore)}>
                        {getScoreLabel(data.repoHealthScore)}
                      </Badge>
                      <Progress 
                        value={data.repoHealthScore} 
                        className="h-2 mt-3" 
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-4">
                    <CardTitle className="text-lg flex items-center">
                      <GitMerge className="mr-2 h-5 w-5 text-purple-500" />
                      Total Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="text-center">
                      <div className="text-3xl font-bold mb-2">{data.totalScore}/100</div>
                      <Badge className={getScoreColor(data.totalScore)}>
                        {getScoreLabel(data.totalScore)}
                      </Badge>
                      <Progress 
                        value={data.totalScore} 
                        className="h-2 mt-3" 
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Repo Health × Contributor Score ÷ 100
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Contribution Metrics</CardTitle>
                    <CardDescription>Key statistics about user's contributions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Commits</p>
                          <p className="text-xl font-semibold">{data.contributionStats.totalCommits}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Pull Requests</p>
                          <p className="text-xl font-semibold">{data.contributionStats.totalPRs}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Merged PRs</p>
                          <p className="text-xl font-semibold">{data.contributionStats.mergedPRs}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Issues Created</p>
                          <p className="text-xl font-semibold">{data.contributionStats.issuesCreated}</p>
                        </div>
                      </div>
                      <div className="pt-2">
                        <p className="text-sm text-muted-foreground mb-1">Recent Activity (Last 3 Months)</p>
                        <Progress 
                          value={data.contributionStats.recentActivity} 
                          className="h-2" 
                        />
                        <p className="text-xs text-right mt-1">
                          {Math.round(data.contributionStats.recentActivity)}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Contributor Status</CardTitle>
                    <CardDescription>User's role and ranking in the repository</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {data.contributionStats.isOwner && (
                          <Badge className="bg-purple-600">
                            Owner
                          </Badge>
                        )}
                        {data.contributionStats.isMaintainer && (
                          <Badge className="bg-blue-600">
                            Maintainer
                          </Badge>
                        )}
                        {data.contributionStats.commitsRank === 1 && (
                          <Badge className="bg-yellow-600">
                            Top Contributor
                          </Badge>
                        )}
                        {data.contributionStats.commitsRank > 0 && data.contributionStats.commitsRank <= 3 && data.contributionStats.commitsRank !== 1 && (
                          <Badge className="bg-emerald-600">
                            Top 3 Contributor
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-3 pt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Commit Rank</span>
                          <span className="font-medium">
                            {data.contributionStats.commitsRank > 0 
                              ? `#${data.contributionStats.commitsRank} of ${data.contributionStats.contributorCount}` 
                              : 'No commits'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">PR Merge Rate</span>
                          <span className="font-medium">
                            {data.contributionStats.totalPRs > 0 
                              ? `${Math.round((data.contributionStats.mergedPRs / data.contributionStats.totalPRs) * 100)}%` 
                              : 'No PRs'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Repository Role</span>
                          <span className="font-medium">
                            {data.contributionStats.isOwner 
                              ? 'Owner' 
                              : data.contributionStats.isMaintainer 
                                ? 'Maintainer' 
                                : 'Contributor'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  )
} 