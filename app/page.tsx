"use client"

import type React from "react"

import { useState } from "react"
import { Upload, FileText, TrendingUp, BarChart3, Download } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  parseCSV,
  parseLinkedInCSV,
  processAdAccounts,
  processLinkedInAccounts,
  type ProcessedAdAccount,
  type ProcessOptions,
} from "@/lib/csv-parser"
import { ReportPreview } from "@/components/report-preview"
import { generatePDF, downloadPDF, generateAllPDFs } from "@/lib/pdf-generator"

export default function Page() {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [processedAccounts, setProcessedAccounts] = useState<ProcessedAdAccount[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedAccountIndex, setSelectedAccountIndex] = useState<number | null>(null)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isGeneratingAllPDFs, setIsGeneratingAllPDFs] = useState(false)
  const [adType, setAdType] = useState<"traffic" | "lead" | "linkedin-traffic">("traffic")
  const [combineCampaigns, setCombineCampaigns] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0 && files[0].name.endsWith(".csv")) {
      setUploadedFile(files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setUploadedFile(files[0])
    }
  }

  const processFile = async () => {
    if (!uploadedFile) return

    setIsProcessing(true)

    try {
      let text: string

      // Read the file as ArrayBuffer first to detect encoding
      const arrayBuffer = await uploadedFile.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)

      // Check for UTF-16 BOM (Byte Order Mark)
      const hasUtf16BOM =
        (uint8Array[0] === 0xff && uint8Array[1] === 0xfe) || (uint8Array[0] === 0xfe && uint8Array[1] === 0xff)

      if (hasUtf16BOM || adType === "linkedin-traffic") {
        // Decode as UTF-16
        const decoder = new TextDecoder("utf-16le")
        text = decoder.decode(arrayBuffer)
      } else {
        // Default UTF-8 decoding
        text = await uploadedFile.text()
      }

      console.log("[v0] File read successfully, length:", text.length)
      console.log("[v0] Ad type:", adType)
      console.log("[v0] First 200 chars:", text.substring(0, 200))

      let accounts: ProcessedAdAccount[]

      const options: ProcessOptions = { combineCampaigns }

      if (adType === "linkedin-traffic") {
        console.log("[v0] Processing as LinkedIn Traffic Ad")
        const rows = parseLinkedInCSV(text)
        console.log("[v0] Parsed LinkedIn rows:", rows.length)
        accounts = processLinkedInAccounts(rows, options)
        console.log("[v0] Processed LinkedIn accounts:", accounts.length)
      } else {
        console.log("[v0] Processing as Meta Ad")
        const rows = parseCSV(text)
        accounts = processAdAccounts(rows, options)
      }

      console.log("[v0] Final processed accounts:", accounts.length)
      setProcessedAccounts(accounts)
      if (accounts.length > 0) {
        setSelectedAccountIndex(0)
      } else {
        console.log("[v0] No accounts found - showing alert")
        alert("No accounts found in the CSV file. Please check the file format.")
      }
    } catch (error) {
      console.error("[v0] Error processing CSV:", error)
      alert("Error processing CSV file. Please check the format.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleGenerateSinglePDF = async () => {
    if (selectedAccountIndex === null) return

    setIsGeneratingPDF(true)
    try {
      const account = processedAccounts[selectedAccountIndex]
      const blob = await generatePDF(account, adType)
      const cleanClientName = account.accountName.split("(")[0].trim()
      const mostRecentMonth = account.historicalData[account.historicalData.length - 1].month

      const campaignDescriptor = account.campaignName.replace(/^Add-?\s*on\s+\d+\s+/i, "").trim()
      const platform = adType === "linkedin-traffic" ? "LinkedIn" : "Meta"
      const filename = `${cleanClientName} - ${mostRecentMonth} - ${platform} - ${campaignDescriptor}.pdf`

      downloadPDF(blob, filename)
    } catch (error) {
      console.error("[v0] Error generating PDF:", error)
      alert("Error generating PDF. Please try again.")
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const handleGenerateAllPDFs = async () => {
    setIsGeneratingAllPDFs(true)
    try {
      await generateAllPDFs(processedAccounts, adType)
    } catch (error) {
      console.error("[v0] Error generating PDFs:", error)
      alert("Error generating PDFs. Please try again.")
    } finally {
      setIsGeneratingAllPDFs(false)
    }
  }

  if (processedAccounts.length > 0 && selectedAccountIndex !== null) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-10 rounded-lg bg-primary text-primary-foreground">
                  <BarChart3 className="size-6" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">
                    {adType === "linkedin-traffic" ? "LinkedIn Ad Reporter" : "Meta Ads Reporter"}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {processedAccounts.length} account{processedAccounts.length !== 1 ? "s" : ""} processed
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={handleGenerateSinglePDF} disabled={isGeneratingPDF}>
                  <Download className="mr-2 size-4" />
                  {isGeneratingPDF ? "Generating..." : "Download PDF"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setProcessedAccounts([])
                    setSelectedAccountIndex(null)
                    setUploadedFile(null)
                  }}
                >
                  Upload New File
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="flex gap-6">
            {/* Sidebar - Account List */}
            <div className="w-64 shrink-0 space-y-2">
              <h3 className="font-semibold text-foreground mb-4">Ad Accounts</h3>
              {processedAccounts.map((account, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedAccountIndex(index)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedAccountIndex === index
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border hover:border-primary/50"
                  }`}
                >
                  <p className="font-medium text-sm truncate">{account.accountName}</p>
                  <p
                    className={`text-xs mt-1 ${
                      selectedAccountIndex === index ? "text-primary-foreground/80" : "text-muted-foreground"
                    }`}
                  >
                    {account.historicalData.length} months
                  </p>
                </button>
              ))}
              <Button className="w-full mt-4" size="lg" onClick={handleGenerateAllPDFs} disabled={isGeneratingAllPDFs}>
                <Download className="mr-2 size-4" />
                {isGeneratingAllPDFs ? "Generating..." : "Generate All PDFs"}
              </Button>
            </div>

            {/* Main Content - Report Preview */}
            <div className="flex-1 min-w-0">
              <ReportPreview account={processedAccounts[selectedAccountIndex]} adType={adType} />
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-primary text-primary-foreground">
              <BarChart3 className="size-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                {adType === "linkedin-traffic" ? "LinkedIn Ad Reporter" : "Meta Ads Reporter"}
              </h1>
              <p className="text-sm text-muted-foreground">Generate beautiful PDF reports</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold text-foreground text-balance">
              Transform Your Ads Data into Professional Reports
            </h2>
            <p className="text-lg text-muted-foreground text-balance max-w-2xl mx-auto">
              Upload your CSV export of ad report data and instantly generate beautifully designed PDF reports for each
              client account
            </p>
          </div>

          {/* Ad Type Toggle */}
          <Card>
            <CardHeader>
              <CardTitle>Select Ad Type</CardTitle>
              <CardDescription>Choose the type of ad campaign you're reporting on</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <button
                  onClick={() => setAdType("traffic")}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    adType === "traffic"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-center gap-3">
                    <div
                      className={`size-5 rounded-full border-2 flex items-center justify-center ${
                        adType === "traffic" ? "border-primary" : "border-border"
                      }`}
                    >
                      {adType === "traffic" && <div className="size-2.5 rounded-full bg-primary" />}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-foreground">Meta Traffic Ad</p>
                      <p className="text-sm text-muted-foreground">For campaigns focused on driving website traffic</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setAdType("lead")}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    adType === "lead"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-center gap-3">
                    <div
                      className={`size-5 rounded-full border-2 flex items-center justify-center ${
                        adType === "lead" ? "border-primary" : "border-border"
                      }`}
                    >
                      {adType === "lead" && <div className="size-2.5 rounded-full bg-primary" />}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-foreground">Meta Lead Ad</p>
                      <p className="text-sm text-muted-foreground">For campaigns focused on lead generation</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setAdType("linkedin-traffic")}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    adType === "linkedin-traffic"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-center gap-3">
                    <div
                      className={`size-5 rounded-full border-2 flex items-center justify-center ${
                        adType === "linkedin-traffic" ? "border-primary" : "border-border"
                      }`}
                    >
                      {adType === "linkedin-traffic" && <div className="size-2.5 rounded-full bg-primary" />}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-foreground">LinkedIn Traffic Ad</p>
                      <p className="text-sm text-muted-foreground">For LinkedIn campaigns focused on traffic</p>
                    </div>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Settings Toggle */}
          <Card>
            <CardHeader>
              <CardTitle>Report Settings</CardTitle>
              <CardDescription>Configure how your reports are generated</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Combine Campaigns</p>
                  <p className="text-sm text-muted-foreground">
                    Aggregate all campaign data into one report per account
                  </p>
                </div>
                <button
                  onClick={() => setCombineCampaigns(!combineCampaigns)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    combineCampaigns ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      combineCampaigns ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Ads CSV</CardTitle>
              <CardDescription>Export your ad account data and upload the CSV file here</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                  isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
              >
                <input type="file" accept=".csv" onChange={handleFileInput} className="hidden" id="file-upload" />
                {!uploadedFile && (
                  <label htmlFor="file-upload" className="cursor-pointer block">
                    <div className="flex flex-col items-center gap-4">
                      <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Upload className="size-8 text-primary" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-lg font-medium text-foreground">Drop your CSV file here</p>
                        <p className="text-sm text-muted-foreground">or click to browse</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        className="mt-4 pointer-events-none bg-transparent"
                      >
                        <Upload className="mr-2 size-4" />
                        Select File
                      </Button>
                    </div>
                  </label>
                )}
                {uploadedFile && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="size-8 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-lg font-medium text-foreground">{uploadedFile.name}</p>
                      <p className="text-sm text-muted-foreground">Ready to process</p>
                    </div>
                    <Button size="lg" className="mt-4" onClick={processFile} disabled={isProcessing}>
                      {isProcessing ? "Processing..." : "Process & Generate Reports"}
                    </Button>
                  </div>
                )}
              </div>

              {uploadedFile && (
                <div className="mt-6 p-4 rounded-lg flex items-center justify-between bg-[rgba(244,246,251,1)]">
                  <div className="flex items-center gap-3">
                    <FileText className="size-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">{uploadedFile.name}</p>
                      <p className="text-sm text-muted-foreground">{(uploadedFile.size / 1024).toFixed(2)} KB</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setUploadedFile(null)
                      setProcessedAccounts([])
                    }}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="size-12 rounded-lg bg-chart-1/10 flex items-center justify-center mb-4">
                  <TrendingUp className="size-6 text-chart-1" />
                </div>
                <CardTitle className="text-lg">Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Track impressions, reach, clicks, and CTR with beautifully designed scorecard widgets
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="size-12 rounded-lg bg-chart-2/10 flex items-center justify-center mb-4">
                  <BarChart3 className="size-6 text-chart-2" />
                </div>
                <CardTitle className="text-lg">Visual Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Generate pie charts and bar graphs showing 6-month trends for all key metrics
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="size-12 rounded-lg bg-chart-3/10 flex items-center justify-center mb-4">
                  <FileText className="size-6 text-chart-3" />
                </div>
                <CardTitle className="text-lg">Client-Ready PDFs</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  One professional PDF report per ad account, ready to send directly to clients
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
