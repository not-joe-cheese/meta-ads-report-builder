"use client"

import { type ProcessedAdAccount, formatNumber, formatPercentage, formatDateForDisplay } from "@/lib/csv-parser"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts"
import { TrendingUp, Users, MousePointerClick, Eye, UserCheck } from "lucide-react"
import Image from "next/image"

interface ReportPreviewProps {
  account: ProcessedAdAccount
  adType?: "traffic" | "lead" | "linkedin-traffic" // Updated adType prop to include linkedin-traffic option
}

export function ReportPreview({ account, adType = "traffic" }: ReportPreviewProps) {
  const { currentMetrics, historicalData, accountName, campaignName, dateRange } = account

  const cleanAccountName = accountName.split("(")[0].trim()

  const showPieChart = adType !== "linkedin-traffic"
  const showReach = adType !== "linkedin-traffic"

  // Prepare data for pie chart (Impressions vs Reach) - only for Meta reports
  const pieData = showPieChart
    ? [
        { name: "Impressions", value: currentMetrics.impressions, fill: "#FF5000" },
        { name: "Reach", value: currentMetrics.reach, fill: "#5378FC" },
      ]
    : []

  // Get last 6 months of historical data and reverse for most recent first
  const last6Months = historicalData.slice(-6).reverse()

  return (
    <div className="space-y-6 bg-card p-6 rounded-lg border border-border">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-foreground">{cleanAccountName}</h2>
              {adType === "linkedin-traffic" ? (
                <Image
                  src="/images/linkedin-logo.png"
                  alt="LinkedIn"
                  width={60}
                  height={20}
                  className="object-contain leading-8"
                />
              ) : (
                <Image
                  src="/images/meta-logo.svg"
                  alt="Meta"
                  width={40}
                  height={20}
                  className="object-contain leading-8"
                />
              )}
            </div>
            <p className="text-base text-muted-foreground ml-0">{campaignName}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Image src="/images/thryv-logo.png" alt="Thryv" width={80} height={24} className="object-contain" />
          </div>
        </div>
        <div className="flex items-start justify-between">
          <p className="text-sm text-muted-foreground">
            Date range {formatDateForDisplay(dateRange.start)} to {formatDateForDisplay(dateRange.end)}
          </p>
          <div className="flex flex-col items-end">
            <p className="text-xs text-muted-foreground">Created on {new Date().toLocaleDateString()}</p>
            <p className="text-xs text-muted-foreground">Month in progress. Date as of today.</p>
          </div>
        </div>
      </div>

      {/* Scorecards and Pie Chart */}
      {adType === "linkedin-traffic" ? (
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium text-muted-foreground">Impressions</CardTitle>
                <Eye className="size-4 text-chart-1" />
              </div>
            </CardHeader>
            <CardContent className="pt-2 my-[-40px]">
              <div className="text-2xl font-bold text-foreground">{formatNumber(currentMetrics.impressions)}</div>
              <p className="text-xs text-muted-foreground mt-2 mb-8">
                The number of times your LinkedIn ads were shown on screen.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium text-muted-foreground">Clicks</CardTitle>
                <MousePointerClick className="size-4 text-chart-3" />
              </div>
            </CardHeader>
            <CardContent className="pt-2 my-[-40px]">
              <div className="text-2xl font-bold text-foreground">{formatNumber(currentMetrics.clicks)}</div>
              <p className="text-xs text-muted-foreground mt-2 mb-8">The number of clicks on your LinkedIn ads.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium text-muted-foreground">Click Through Rate</CardTitle>
                <TrendingUp className="size-4 text-chart-4" />
              </div>
            </CardHeader>
            <CardContent className="pt-2 my-[-40px]">
              <div className="text-2xl font-bold text-foreground">{formatPercentage(currentMetrics.ctr)}</div>
              <p className="text-xs text-muted-foreground mt-2 mb-8">
                The % of people who clicked on your LinkedIn ads after seeing them.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column: 2x2 Scorecards */}
          <div className="grid grid-cols-2 gap-5">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium text-muted-foreground">Impressions</CardTitle>
                  <Eye className="size-4 text-chart-1" />
                </div>
              </CardHeader>
              <CardContent className="pt-2 my-[-40px]">
                <div className="text-2xl font-bold text-foreground">{formatNumber(currentMetrics.impressions)}</div>
                <p className="text-xs text-muted-foreground mt-2 mb-8">
                  The number of times your Meta ads were shown on screen.
                </p>
              </CardContent>
            </Card>

            <Card className="my-0">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium text-muted-foreground">Reach</CardTitle>
                  <Users className="size-4 text-chart-2" />
                </div>
              </CardHeader>
              <CardContent className="pt-2 my-[-40px]">
                <div className="text-2xl font-bold text-foreground">{formatNumber(currentMetrics.reach)}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  The unique number of people that saw your Meta ads at least once.
                </p>
              </CardContent>
            </Card>

            <Card className="my-[30px] py-5">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium text-muted-foreground">Clicks</CardTitle>
                  <MousePointerClick className="size-4 text-chart-3" />
                </div>
              </CardHeader>
              <CardContent className="pt-2 my-[-40px]">
                <div className="text-2xl font-bold text-foreground my-[0]">{formatNumber(currentMetrics.clicks)}</div>
                <p className="text-xs text-muted-foreground mt-2 mb-8">
                  The unique number of people that saw your Meta ads at least once.
                </p>
              </CardContent>
            </Card>

            <Card className="my-[30px]">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium text-muted-foreground">Click Through Rate</CardTitle>
                  <TrendingUp className="size-4 text-chart-4" />
                </div>
              </CardHeader>
              <CardContent className="pt-2 my-[-40px]">
                <div className={`text-2xl font-bold ${adType === "traffic" && currentMetrics.ctr > 1.5 ? "text-green-600 font-extrabold" : "text-foreground"}`}>{formatPercentage(currentMetrics.ctr)}</div>
                <p className="text-xs mt-2 text-muted-foreground">
                  {adType === "traffic"
                    ? <>{"The % of people who clicked on your ads. "}<span className={currentMetrics.ctr > 1.5 ? "text-green-600 font-bold" : ""}>{"Industry average: 1%-1.5%."}</span></>
                    : "The % of people who clicked on your Meta ads after seeing them."}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-[26px]">
            <CardHeader>
              <CardTitle>Impressions vs Reach</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-8">
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" labelLine={false} outerRadius={80} dataKey="value" />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-4 h-4 rounded-full bg-[#FF5000] mt-1" />
                    <div>
                      <div className="font-medium text-sm">Impressions</div>
                      <div className="text-xs text-muted-foreground">{formatNumber(currentMetrics.impressions)}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-4 h-4 rounded-full bg-[#5378FC] mt-1" />
                    <div>
                      <div className="font-medium text-sm">Reach</div>
                      <div className="text-xs text-muted-foreground">{formatNumber(currentMetrics.reach)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {adType === "lead" && currentMetrics.leads !== undefined && (
        <Card className="mt-[-30px]">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium text-muted-foreground">Meta Leads</CardTitle>
              <UserCheck className="size-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-bold text-foreground">{formatNumber(currentMetrics.leads)}</div>
            <p className="text-sm text-muted-foreground mt-2">
              Total number of leads generated from your Meta lead campaigns.
            </p>
          </CardContent>
        </Card>
      )}

      {adType === "linkedin-traffic" && currentMetrics.linkedinImpressions !== undefined && (
        <Card className="mt-[-30px]">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium text-muted-foreground">LinkedIn Impressions</CardTitle>
              {/* Placeholder for LinkedIn icon */}
              <div className="size-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-bold text-foreground">{formatNumber(currentMetrics.linkedinImpressions)}</div>
            <p className="text-sm text-muted-foreground mt-2">
              Total number of impressions generated from your LinkedIn campaigns.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Bar Charts */}
      {adType === "linkedin-traffic" ? (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Impressions Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Impression Trend - Last 6 Months</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={last6Months.slice().reverse()} margin={{ top: 20, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(value) => formatNumber(value)}
                  />
                  <Tooltip formatter={(value: number) => formatNumber(value)} />
                  <Bar dataKey="impressions" fill="#5378FC">
                    <LabelList
                      dataKey="impressions"
                      position="top"
                      formatter={(value: number) => formatNumber(value)}
                      style={{ fontSize: 10, fill: "hsl(var(--foreground))" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Clicks Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Click Trend - Last 6 Months</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={last6Months.slice().reverse()} margin={{ top: 20, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(value) => formatNumber(value)}
                  />
                  <Tooltip formatter={(value: number) => formatNumber(value)} />
                  <Bar dataKey="clicks" fill="#5378FC">
                    <LabelList
                      dataKey="clicks"
                      position="top"
                      formatter={(value: number) => formatNumber(value)}
                      style={{ fontSize: 10, fill: "hsl(var(--foreground))" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* CTR Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">CTR Trend - Last 6 Months</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={last6Months.slice().reverse()} margin={{ top: 20, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(value) => formatPercentage(value)}
                  />
                  <Tooltip formatter={(value: number) => formatPercentage(value)} />
                  <Bar dataKey="ctr" fill="#5378FC">
                    <LabelList
                      dataKey="ctr"
                      position="top"
                      formatter={(value: number) => formatPercentage(value)}
                      style={{ fontSize: 10, fill: "hsl(var(--foreground))" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Impressions Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Impression Trend - Last 6 Months</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={last6Months.slice().reverse()} margin={{ top: 20, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(value) => formatNumber(value)}
                  />
                  <Tooltip formatter={(value: number) => formatNumber(value)} />
                  <Bar dataKey="impressions" fill="#5378FC">
                    <LabelList
                      dataKey="impressions"
                      position="top"
                      formatter={(value: number) => formatNumber(value)}
                      style={{ fontSize: 10, fill: "hsl(var(--foreground))" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Reach Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reach Trend - Last 6 Months</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={last6Months.slice().reverse()} margin={{ top: 20, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(value) => formatNumber(value)}
                  />
                  <Tooltip formatter={(value: number) => formatNumber(value)} />
                  <Bar dataKey="reach" fill="#5378FC">
                    <LabelList
                      dataKey="reach"
                      position="top"
                      formatter={(value: number) => formatNumber(value)}
                      style={{ fontSize: 10, fill: "hsl(var(--foreground))" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Clicks Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Click Trend - Last 6 Months</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={last6Months.slice().reverse()} margin={{ top: 20, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(value) => formatNumber(value)}
                  />
                  <Tooltip formatter={(value: number) => formatNumber(value)} />
                  <Bar dataKey="clicks" fill="#5378FC">
                    <LabelList
                      dataKey="clicks"
                      position="top"
                      formatter={(value: number) => formatNumber(value)}
                      style={{ fontSize: 10, fill: "hsl(var(--foreground))" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Historical Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historical Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Month</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Impressions</th>
                  {showReach && (
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Reach</th>
                  )}
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Clicks</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">CTR</th>
                </tr>
              </thead>
              <tbody>
                {last6Months.map((row, index) => (
                  <tr key={index} className="border-b border-border last:border-0">
                    <td className="py-3 px-4 text-sm font-medium text-foreground">{row.month}</td>
                    <td className="py-3 px-4 text-sm text-right text-foreground">{formatNumber(row.impressions)}</td>
                    {showReach && (
                      <td className="py-3 px-4 text-sm text-right text-foreground">{formatNumber(row.reach)}</td>
                    )}
                    <td className="py-3 px-4 text-sm text-right text-foreground">{formatNumber(row.clicks)}</td>
                    <td className={`py-3 px-4 text-sm text-right ${adType === "traffic" && row.ctr > 1.5 ? "text-green-600 font-bold" : "text-foreground"}`}>{formatPercentage(row.ctr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
