import OpenSourceValue from "@/components/open-source-value"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Github, Activity } from "lucide-react"

export const metadata = {
  title: "GitHub User Profile",
  description: "Analyze GitHub user contributions and open source value",
}

export default function UserProfilePage() {
  return (
    <main className="container mx-auto py-8 px-4">
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center">
          <Github className="mr-2" /> GitHub User Analyzer
        </h1>
        <p className="text-muted-foreground text-center max-w-2xl mb-6">
          Analyze GitHub user contributions and calculate their open source value.
        </p>
      </div>

      <Tabs defaultValue="opensource" className="w-full">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="activity">
            <Activity className="mr-2 h-4 w-4" />
            GitHub Activity
          </TabsTrigger>
          <TabsTrigger value="opensource">
            <Github className="mr-2 h-4 w-4" />
            Open Source Value
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>GitHub Activity</CardTitle>
              <CardDescription>View a user's GitHub activity and contributions over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center p-12 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">GitHub Activity Component (Not Implemented)</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opensource">
          <OpenSourceValue />
        </TabsContent>
      </Tabs>
    </main>
  )
} 