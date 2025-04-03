"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { AlertCircle, Github, Star, GitFork, Loader2 } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { calculateOpenSourceValue } from "@/lib/github-api"
import Link from "next/link"
import { Progress } from "@/components/ui/progress"
import type React from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function OpenSourceValue() {
  const [username, setUsername] = useState("")
  const [submittedUsername, setSubmittedUsername] = useState<string | null>(null)
  const { toast } = useToast()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!username.trim()) {
      toast({
        title: "Username Required",
        description: "Please enter a GitHub username",
        variant: "destructive",
      })
      return
    }

    setSubmittedUsername(username.trim())
  }

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["openSourceValue", submittedUsername],
    queryFn: () => submittedUsername ? calculateOpenSourceValue(submittedUsername) : null,
    enabled: !!submittedUsername,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1, // Only retry once on failure
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
    <div className="space-y-6">
      <div className="flex flex-col items-center mb-8">
        <h2 className="text-2xl font-bold mb-4">GitHub Open Source Value</h2>
        <p className="text-muted-foreground text-center max-w-2xl mb-6">
          Calculate a user's total contribution to open source projects on GitHub.
        </p>

        <form onSubmit={handleSubmit} className="w-full max-w-md flex gap-2">
          <Input
            type="text"
            placeholder="GitHub Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="flex-1"
            disabled={isLoading || isFetching}
          />
          <Button type="submit" disabled={isLoading || isFetching}>
            {isLoading || isFetching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Calculating...
              </>
            ) : (
              "Calculate"
            )}
          </Button>
        </form>
      </div>

      {isLoading && submittedUsername && (
        <Card className="mb-6 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center text-center p-6">
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
              <h3 className="font-semibold mb-2">Analyzing GitHub Profile</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Evaluating repositories and calculating open source contributions for {submittedUsername}.
                This could take several minutes if the user has many repositories.
              </p>
              <Progress 
                value={100} 
                className="h-2 w-full max-w-md"
                style={{ animation: 'progress-loading 3s infinite' }}  
              />
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to fetch open source value data. Please check the username and try again.
            <details className="mt-2 text-xs">
              <summary>Error details</summary>
              <pre className="p-2 bg-red-50 rounded mt-2 overflow-auto">
                {error instanceof Error ? error.message : 'Unknown error'}
              </pre>
            </details>
          </AlertDescription>
        </Alert>
      )}

      {data && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center">
                <a
                  href={`https://github.com/${data.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline flex items-center"
                >
                  {data.username}
                  <Github className="ml-2 h-5 w-5" />
                </a>
              </CardTitle>
              <CardDescription>Open Source Contribution Summary</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Open Source Value</h3>
                  <div className="text-3xl font-bold">{data.totalScore}</div>
                </div>
                <Progress 
                  value={Math.min(data.totalScore, 100)} 
                  className="h-2" 
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Based on contributions to {data.repositories.filter(r => r.isOpenSource).length} open source repositories
                </p>
              </div>

              <h3 className="text-lg font-semibold mb-4">Repository Contributions</h3>
              
              {data.repositories.length === 0 ? (
                <p className="text-muted-foreground">No repositories found for this user.</p>
              ) : (
                <div className="space-y-4">
                  {data.repositories
                    .filter(repo => repo.isOpenSource)
                    .map((repo) => (
                      <Card key={repo.fullName} className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium">{repo.fullName}</h4>
                            <div className="flex gap-2 mt-1">
                              <Link
                                href={`/?repo=${encodeURIComponent(repo.url)}`}
                                className="text-xs text-primary hover:underline"
                              >
                                Repo Analysis
                              </Link>
                              <Link
                                href={`/contributor-score?username=${data.username}&repo=${encodeURIComponent(repo.url)}`}
                                className="text-xs text-primary hover:underline"
                              >
                                Contributor Score
                              </Link>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{repo.contributorScore}</div>
                            <Badge className={getScoreColor(repo.contributorScore)}>
                              {getScoreLabel(repo.contributorScore)}
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground border-t pt-4">
              <p>
                Some repositories might not appear due to access restrictions or API limitations.
                Only open source repositories are included in the total score.
              </p>
            </CardFooter>
          </Card>
        </div>
      )}

      <style jsx>{`
        @keyframes progress-loading {
          0% { background-position-x: 0%; }
          100% { background-position-x: -100%; }
        }
      `}</style>
    </div>
  )
} 