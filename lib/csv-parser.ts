export interface MetaAdsRow {
  accountName: string
  campaignName: string
  month: string
  reach: number
  impressions: number
  ctr: number
  clicks: number
  leads?: number
  reportingStarts: string
  reportingEnds: string
}

export interface ProcessOptions {
  combineCampaigns?: boolean
}

export interface ProcessedAdAccount {
  accountName: string
  accountId: string
  campaignName: string
  dateRange: {
    start: string
    end: string
  }
  currentMetrics: {
    impressions: number
    reach: number
    clicks: number
    ctr: number
    leads?: number
  }
  historicalData: {
    month: string
    impressions: number
    reach: number
    clicks: number
    ctr: number
    leads?: number
  }[]
}

export function parseCSV(csvText: string): MetaAdsRow[] {
  const lines = csvText.trim().split("\n")
  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))

  const rows: MetaAdsRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])

    if (values.length >= 9) {
      const accountName = values[0].replace(/"/g, "").trim()
      const campaignName = values[1].replace(/"/g, "")

      // Skip summary rows with no account name
      if (!accountName) {
        continue
      }

      rows.push({
        accountName: values[0].replace(/"/g, ""),
        campaignName: campaignName,
        month: values[2].replace(/"/g, ""),
        reach: Number.parseFloat(values[3]) || 0,
        impressions: Number.parseFloat(values[4]) || 0,
        ctr: Number.parseFloat(values[5]) || 0,
        clicks: Number.parseFloat(values[6]) || 0,
        leads: values.length > 9 ? Number.parseFloat(values[7]) || 0 : undefined,
        reportingStarts: values[values.length > 9 ? 8 : 7].replace(/"/g, ""),
        reportingEnds: values[values.length > 9 ? 9 : 8].replace(/"/g, ""),
      })
    }
  }

  return rows
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

export function processAdAccounts(rows: MetaAdsRow[], options: ProcessOptions = {}): ProcessedAdAccount[] {
  const { combineCampaigns = false } = options
  const accountMap = new Map<string, MetaAdsRow[]>()

  // Group rows by account only (if combining) or account + campaign combination
  rows.forEach((row) => {
    const key = combineCampaigns ? row.accountName : `${row.accountName}|||${row.campaignName}`
    const existing = accountMap.get(key) || []
    existing.push(row)
    accountMap.set(key, existing)
  })

  const processedAccounts: ProcessedAdAccount[] = []
  
  accountMap.forEach((accountRows, key) => {
  const [accountName, campaignName] = combineCampaigns ? [key, "All Campaigns"] : key.split("|||")
  
  accountRows.sort((a, b) => {
      const dateA = parseDateString(a.reportingStarts)
      const dateB = parseDateString(b.reportingStarts)
      return dateA.getTime() - dateB.getTime()
    })

    // Extract account ID from name (if present in parentheses)
    const match = accountName.match(/\$\$([^)]+)\$\$/)
    const accountId = match ? match[1] : accountName
    const cleanName = accountName.replace(/\s*\$\$[^)]+\$\$/, "")

    // Get most recent data for current metrics
    const latestRow = accountRows[accountRows.length - 1]

    // Calculate totals across all months for current metrics
    const totalImpressions = accountRows.reduce((sum, row) => sum + row.impressions, 0)
    const totalReach = accountRows.reduce((sum, row) => sum + row.reach, 0)
    const totalClicks = accountRows.reduce((sum, row) => sum + row.clicks, 0)
    const avgCTR = (totalClicks / totalImpressions) * 100
    const totalLeads = accountRows.reduce((sum, row) => sum + (row.leads || 0), 0)

    // Aggregate historical data by month
    const monthlyDataMap = new Map<string, { impressions: number; reach: number; clicks: number; leads: number }>()
    accountRows.forEach((row) => {
      const monthKey = formatMonth(row.month)
      const existing = monthlyDataMap.get(monthKey) || { impressions: 0, reach: 0, clicks: 0, leads: 0 }
      existing.impressions += row.impressions
      existing.reach += row.reach
      existing.clicks += row.clicks
      existing.leads += row.leads || 0
      monthlyDataMap.set(monthKey, existing)
    })

    const historicalData = Array.from(monthlyDataMap.entries()).map(([month, data]) => ({
      month,
      impressions: data.impressions,
      reach: data.reach,
      clicks: data.clicks,
      ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
      leads: data.leads > 0 ? data.leads : undefined,
    }))

    processedAccounts.push({
      accountName: cleanName,
      accountId,
      campaignName: cleanCampaignName(campaignName),
      dateRange: {
        start: accountRows[0].reportingStarts,
        end: latestRow.reportingEnds,
      },
      currentMetrics: {
        impressions: totalImpressions,
        reach: totalReach,
        clicks: totalClicks,
        ctr: avgCTR,
        leads: totalLeads > 0 ? totalLeads : undefined,
      },
      historicalData,
    })
  })

  return processedAccounts
}

function cleanCampaignName(campaignName: string): string {
  // Remove "Campaign # " or "Campaign #" prefix using regex
  return campaignName.replace(/^Campaign\s+\d+\s+/i, "").trim()
}

function formatMonth(monthString: string): string {
  if (!monthString || monthString.trim() === "") {
    return "Unknown"
  }
  
  // Input format could be: "2025-10-01 - 2025-10-31" or "2026-01-01 - 2026-01-07"
  const startDate = monthString.split(" - ")[0].trim()
  
  if (!startDate) {
    return "Unknown"
  }
  
  // Use parseDateString to handle multiple date formats
  const date = parseDateString(startDate)
  
  if (isNaN(date.getTime())) {
    return "Unknown"
  }
  
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M"
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K"
  }
  return num.toFixed(0)
}

export function formatPercentage(num: number): string {
  return num.toFixed(2) + "%"
}

function parseDateString(dateString: string): Date {
  const trimmed = dateString.trim()
  if (trimmed.includes("-")) {
    // YYYY-MM-DD format
    const [year, month, day] = trimmed.split("-").map(Number)
    return new Date(year, month - 1, day)
  } else if (trimmed.includes("/")) {
    // M/D/YY or M/D/YYYY format
    const parts = trimmed.split("/").map(Number)
    let year = parts[2]
    if (year < 100) year += 2000 // Convert 2-digit year
    return new Date(year, parts[0] - 1, parts[1])
  }
  return new Date(trimmed)
}

export function formatDateForDisplay(dateString: string): string {
  const date = parseDateString(dateString)
  return date.toLocaleDateString()
}

// LinkedIn-specific types and parser
export interface LinkedInAdsRow {
  accountName: string
  campaignName: string
  impressions: number
  clicks: number
  ctr: number
  startDate: string
  endDate: string
}

function parseTSVLine(line: string): string[] {
  // Split by tabs and trim each value
  return line.split("\t").map((v) => v.trim().replace(/"/g, ""))
}

function parseMultiLineTSV(csvText: string): string[][] {
  // Handle multi-line quoted fields in TSV format
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ""
  let inQuotes = false
  let i = 0
  
  while (i < csvText.length) {
    const char = csvText[i]
    const nextChar = csvText[i + 1]
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"'
        i += 2
        continue
      }
      inQuotes = !inQuotes
      i++
      continue
    }
    
    if (char === '\t' && !inQuotes) {
      currentRow.push(currentField.trim())
      currentField = ""
      i++
      continue
    }
    
    if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
      currentRow.push(currentField.trim())
      if (currentRow.length > 1 || currentRow[0] !== "") {
        rows.push(currentRow)
      }
      currentRow = []
      currentField = ""
      i += char === '\r' ? 2 : 1
      continue
    }
    
    if (char === '\r' && !inQuotes) {
      // Handle \r without \n
      currentRow.push(currentField.trim())
      if (currentRow.length > 1 || currentRow[0] !== "") {
        rows.push(currentRow)
      }
      currentRow = []
      currentField = ""
      i++
      continue
    }
    
    currentField += char
    i++
  }
  
  // Don't forget the last field/row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim())
    if (currentRow.length > 1 || currentRow[0] !== "") {
      rows.push(currentRow)
    }
  }
  
  return rows
}

export function parseLinkedInCSV(csvText: string): LinkedInAdsRow[] {
  console.log("[v0] Starting LinkedIn CSV parse")
  console.log("[v0] CSV text length:", csvText.length)

  const allRows = parseMultiLineTSV(csvText)
  console.log("[v0] Total parsed rows:", allRows.length)
  
  // Debug: log each row's column count
  allRows.forEach((row, idx) => {
    console.log(`[v0] Row ${idx} columns: ${row.length}, first col: "${row[0]?.substring(0, 30)}"`)
  })

  if (allRows.length < 2) {
    console.log("[v0] Error: Not enough rows in CSV file")
    return []
  }

  // Find the header row (contains "Account Name" or "Start Date")
  let headerRowIndex = -1
  for (let i = 0; i < allRows.length; i++) {
    const row = allRows[i]
    if (row.some(cell => cell.includes("Account Name") || cell.includes("Start Date"))) {
      headerRowIndex = i
      console.log(`[v0] Found header row at index ${i}`)
      break
    }
  }

  if (headerRowIndex === -1) {
    console.log("[v0] Error: Could not find header row")
    return []
  }

  // Data starts after the header row
  const dataStartIndex = headerRowIndex + 1
  const rows: LinkedInAdsRow[] = []

  for (let i = dataStartIndex; i < allRows.length; i++) {
    const values = allRows[i]
    console.log(`[v0] Row ${i} parsed values count:`, values.length)

    // Support two LinkedIn CSV schemas:
    // 1. Creative Performance Report (17+ columns): Account in B, Campaign in C, Impressions in O, Clicks in P, CTR in Q, Start in L, End in N
    // 2. Ad Set/Campaign Performance Report (14 columns): Account in B, Campaign in C, Impressions in K, Clicks in L, CTR in M, Start in H, End in J
    
    if (values.length >= 17) {
      // Creative Performance Report schema (17+ columns)
      const accountName = values[1].replace(/"/g, "") // Column B
      const campaignName = values[2].replace(/"/g, "") // Column C - Campaign Group Name
      const impressionsStr = values[14].replace(/,/g, "") // Column O
      const clicksStr = values[15].replace(/,/g, "") // Column P
      const ctrString = values[16].replace(/"/g, "").replace(/%/g, "") // Column Q

      const impressions = Number.parseFloat(impressionsStr) || 0
      const clicks = Number.parseFloat(clicksStr) || 0
      const ctr = Number.parseFloat(ctrString) || 0
      const startDate = values[11].replace(/"/g, "") // Column L (Ad Set Start Date)
      const endDate = values[13].replace(/"/g, "") // Column N (Ad Set End Date)

      console.log(`[v0] Parsed row ${i} (17+ col schema):`, {
        accountName,
        campaignName,
        impressions,
        clicks,
        ctr,
        startDate,
        endDate,
      })

      rows.push({
        accountName,
        campaignName,
        impressions,
        clicks,
        ctr,
        startDate,
        endDate,
      })
    } else if (values.length >= 14) {
      // Ad Set/Campaign Performance Report schema (14 columns)
      const accountName = values[1].replace(/"/g, "") // Column B
      const campaignName = values[2].replace(/"/g, "") // Column C - Campaign Name
      const impressionsStr = values[10].replace(/,/g, "") // Column K
      const clicksStr = values[11].replace(/,/g, "") // Column L
      const ctrString = values[12].replace(/"/g, "").replace(/%/g, "") // Column M

      const impressions = Number.parseFloat(impressionsStr) || 0
      const clicks = Number.parseFloat(clicksStr) || 0
      const ctr = Number.parseFloat(ctrString) || 0
      const startDate = values[7].replace(/"/g, "") // Column H (Ad Set Start Date)
      const endDate = values[9].replace(/"/g, "") // Column J (Ad Set End Date)

      console.log(`[v0] Parsed row ${i} (14 col schema):`, {
        accountName,
        campaignName,
        impressions,
        clicks,
        ctr,
        startDate,
        endDate,
      })

      rows.push({
        accountName,
        campaignName,
        impressions,
        clicks,
        ctr,
        startDate,
        endDate,
      })
    } else {
      console.log(`[v0] Skipping row ${i}: not enough values (${values.length} < 14)`)
    }
  }

  console.log("[v0] Total LinkedIn rows parsed:", rows.length)
  return rows
}

export function processLinkedInAccounts(rows: LinkedInAdsRow[], options: ProcessOptions = {}): ProcessedAdAccount[] {
  const { combineCampaigns = false } = options
  const accountMap = new Map<string, LinkedInAdsRow[]>()

  // Group rows by account only (if combining) or account + campaign combination
  rows.forEach((row) => {
    const key = combineCampaigns ? row.accountName : `${row.accountName}|||${row.campaignName}`
    const existing = accountMap.get(key) || []
    existing.push(row)
    accountMap.set(key, existing)
  })

  const processedAccounts: ProcessedAdAccount[] = []
  
  accountMap.forEach((accountRows, key) => {
  const [accountName, campaignName] = combineCampaigns ? [key, "All Campaigns"] : key.split("|||")
  
  // Sort by date
    accountRows.sort((a, b) => {
      const dateA = new Date(a.startDate)
      const dateB = new Date(b.startDate)
      return dateA.getTime() - dateB.getTime()
    })

    // Extract account ID from name (if present in parentheses)
    const match = accountName.match(/$$([^)]+)$$/)
    const accountId = match ? match[1] : accountName
    const cleanName = accountName.replace(/\s*$$[^)]+$$/, "")

    // Calculate totals
    const totalImpressions = accountRows.reduce((sum, row) => sum + row.impressions, 0)
    const totalClicks = accountRows.reduce((sum, row) => sum + row.clicks, 0)
    const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0

    // Group by month for historical data - split data across months if campaign spans multiple months
    const monthlyData = new Map<string, { impressions: number; clicks: number }>()
    const today = new Date()
    const currentMonthCap = new Date(today.getFullYear(), today.getMonth(), 1)
    
    accountRows.forEach((row) => {
      const startDate = new Date(row.startDate)
      let endDate = new Date(row.endDate)
      
      // Cap end date to current month to prevent showing future months
      if (endDate > today) {
        endDate = today
      }
      
      // Get all months between start and end dates
      const months: string[] = []
      const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
      const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1)
      
      while (currentDate <= endMonth) {
        months.push(currentDate.toLocaleDateString("en-US", { month: "short", year: "numeric" }))
        currentDate.setMonth(currentDate.getMonth() + 1)
      }
      
      // Split impressions and clicks evenly across months (proportional distribution)
      const monthCount = months.length
      const impressionsPerMonth = row.impressions / monthCount
      const clicksPerMonth = row.clicks / monthCount
      
      months.forEach((monthKey) => {
        const existing = monthlyData.get(monthKey) || { impressions: 0, clicks: 0 }
        existing.impressions += impressionsPerMonth
        existing.clicks += clicksPerMonth
        monthlyData.set(monthKey, existing)
      })
    })

    const historicalData = Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      impressions: data.impressions,
      reach: 0, // LinkedIn reports don't have reach
      clicks: data.clicks,
      ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
    }))

    const earliestStart = accountRows[0].startDate // Already sorted
    const latestEnd = accountRows[accountRows.length - 1].endDate

    // Convert to YYYY-MM-DD format
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const day = String(date.getDate()).padStart(2, "0")
      return `${year}-${month}-${day}`
    }

    processedAccounts.push({
      accountName: cleanName,
      accountId,
      campaignName: cleanCampaignName(campaignName),
      dateRange: {
        start: formatDate(earliestStart),
        end: formatDate(latestEnd),
      },
      currentMetrics: {
        impressions: totalImpressions,
        reach: 0, // LinkedIn reports don't have reach
        clicks: totalClicks,
        ctr: avgCTR,
      },
      historicalData,
    })
  })

  return processedAccounts
}
