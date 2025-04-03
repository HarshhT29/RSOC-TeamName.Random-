"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Github, User } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import RepoOverview from "@/components/repo-overview"
import ContributorStats from "@/components/contributor-stats"
import IssueStats from "@/components/issue-stats"
import PullRequestStats from "@/components/pull-request-stats"
import { useQuery } from "@tanstack/react-query"
import { fetchRepoData } from "@/lib/github-api"
import Link from "next/link"

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("")
  const [repoInfo, setRepoInfo] = useState<{ owner: string; repo: string } | null>(null)
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

    setRepoInfo(parsed)
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ["repoData", repoInfo?.owner, repoInfo?.repo],
    queryFn: () => (repoInfo ? fetchRepoData(repoInfo.owner, repoInfo.repo) : null),
    enabled: !!repoInfo,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  return (
    <main className="container mx-auto py-8 px-4">
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center">
          <Github className="mr-2" /> GitHub Repo Analyzer
        </h1>
        <p className="text-muted-foreground text-center max-w-2xl mb-6">
          Get detailed insights and visualizations for any GitHub repository. Enter a GitHub repository URL below to
          analyze stars, forks, contributors, issues, and pull requests.
        </p>

        <div className="w-full flex justify-center mb-4 gap-2">
          <Link href="/contributor-score">
            <Button variant="outline" className="flex items-center">
              <User className="mr-2 h-4 w-4" />
              Check Contributor Score
            </Button>
          </Link>
          <Link href="/user-profile">
            <Button variant="outline" className="flex items-center">
              <User className="mr-2 h-4 w-4" />
              User Profile Analysis
            </Button>
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="w-full max-w-xl flex gap-2">
          <Input
            type="text"
            placeholder="https://github.com/owner/repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Analyzing..." : "Analyze"}
          </Button>
        </form>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to fetch repository data. Please check the URL and try again.</AlertDescription>
        </Alert>
      )}

      {data && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                <a
                  href={data.repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline flex items-center"
                >
                  {data.repo.full_name}
                  <Github className="ml-2 h-5 w-5" />
                </a>
              </CardTitle>
              <CardDescription>{data.repo.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{data.repo.stargazers_count.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Stars</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{data.repo.forks_count.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Forks</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{data.repo.open_issues_count.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Open Issues</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{data.repo.watchers_count.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Watchers</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="contributors">Contributors</TabsTrigger>
              <TabsTrigger value="issues">Issues</TabsTrigger>
              <TabsTrigger value="pull-requests">Pull Requests</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <RepoOverview data={data} />
            </TabsContent>

            <TabsContent value="contributors">
              <ContributorStats data={data} />
            </TabsContent>

            <TabsContent value="issues">
              <IssueStats data={data} />
            </TabsContent>

            <TabsContent value="pull-requests">
              <PullRequestStats data={data} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </main>
  )
}

