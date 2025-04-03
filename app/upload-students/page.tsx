"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Upload, FileSpreadsheet, CheckCircle, File, Github } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Progress } from "@/components/ui/progress"
import type React from "react"

export default function UploadStudentsPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadComplete, setUploadComplete] = useState(false)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      const fileType = selectedFile.name.split('.').pop()?.toLowerCase()
      
      if (fileType === 'csv' || fileType === 'xlsx' || fileType === 'xls') {
        setFile(selectedFile)
        setUploadComplete(false)
      } else {
        toast({
          title: "Invalid File Format",
          description: "Please upload a CSV or Excel file",
          variant: "destructive",
        })
        setFile(null)
      }
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!file) {
      toast({
        title: "No File Selected",
        description: "Please select a CSV or Excel file to upload",
        variant: "destructive",
      })
      return
    }
    
    // Simulate upload process
    setUploading(true)
    setProgress(0)
    
    // Mock progress updates
    const interval = setInterval(() => {
      setProgress(prevProgress => {
        const newProgress = prevProgress + 10
        if (newProgress >= 100) {
          clearInterval(interval)
          setTimeout(() => {
            setUploading(false)
            setUploadComplete(true)
            toast({
              title: "Upload Complete",
              description: "Student GitHub profiles have been processed successfully",
            })
          }, 500)
          return 100
        }
        return newProgress
      })
    }, 400)
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center">
          <Upload className="mr-2" /> Upload Student Profiles
        </h1>
        <p className="text-muted-foreground text-center max-w-2xl mb-6">
          Batch analyze GitHub profiles by uploading a CSV or Excel file containing student GitHub usernames.
        </p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Upload Students List</CardTitle>
          <CardDescription>
            Upload a CSV or Excel file with GitHub usernames in the first column.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-6">
            <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center">
              {file ? (
                <div className="text-center">
                  <FileSpreadsheet className="h-12 w-12 text-primary mx-auto mb-2" />
                  <p className="font-medium mb-1">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
              ) : (
                <div className="text-center">
                  <File className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground mb-4">Drag and drop your file here, or click to browse</p>
                  <p className="text-xs text-muted-foreground">Supported formats: CSV, Excel (.xlsx, .xls)</p>
                </div>
              )}
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                id="file-upload"
                onChange={handleFileChange}
              />
              <label htmlFor="file-upload">
                <Button variant="outline" className="mt-4" type="button" disabled={uploading}>
                  {file ? "Change File" : "Select File"}
                </Button>
              </label>
            </div>

            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processing profiles...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {uploadComplete && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Upload Complete</AlertTitle>
                <AlertDescription className="text-green-700">
                  Student GitHub profiles have been processed successfully.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={!file || uploading}>
                {uploading ? "Processing..." : "Upload and Analyze"}
              </Button>
            </div>
          </form>

          <div className="mt-8">
            <h3 className="text-sm font-medium mb-3">Expected Format Example:</h3>
            <div className="bg-muted p-3 rounded-md text-sm font-mono overflow-x-auto">
              <p>github_username,name,email,student_id</p>
              <p>johndoe,John Doe,john@example.com,2023001</p>
              <p>janedoe,Jane Doe,jane@example.com,2023002</p>
              <p>...</p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Only the GitHub username column is required. Other columns are optional.
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  )
} 