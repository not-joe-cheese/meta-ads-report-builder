import { type ProcessedAdAccount, formatNumber, formatPercentage, formatDateForDisplay } from "./csv-parser"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { loadImage as loadImageHelper } from "./load-image-helper" // Import loadImage helper function
import { assetPath } from "./utils"
import JSZip from "jszip"

// Extend jsPDF type to include autoTable
declare module "jspdf" {
  interface jsPDF {
    lastAutoTable: { finalY: number }
  }
}

const COLORS = {
  primary: [255, 80, 0], // #FF5000 - Primary Orange
  accent: [83, 120, 252], // #5378FC - Accent Blue
  secondary: [61, 81, 153], // #3D5199 - Secondary Navy
  text: [77, 77, 77], // #4D4D4D - Dark Gray
  textLight: [150, 150, 150], // Muted text
  background: [240, 245, 248], // #F0F5F8 - Light background
  cardBg: [255, 255, 255], // White for cards
  border: [230, 235, 240], // Light border
}

export async function generatePDF(
  account: ProcessedAdAccount,
  adType: "traffic" | "lead" | "linkedin-traffic" = "traffic",
): Promise<Blob> {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let yPosition = 20

  const cleanAccountName = account.accountName.split("(")[0].trim()

  // Header background
  doc.setFillColor(...COLORS.cardBg)
  doc.rect(0, 0, pageWidth, 41, "F")

  // Feedback CTA section
  const feedbackUrl = "https://calendly.com/d/cvjz-c2v-r39/thryv-social-ads-customer-feedback"
  doc.setFontSize(8)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...COLORS.text)
  const feedbackHeadline = "Got 30 minutes? Talk Social Ads with us.    "
  doc.text(feedbackHeadline, 15, 33)
  const headlineWidth = doc.getTextWidth(feedbackHeadline)
  
  // Add underlined hyperlink
  doc.setTextColor(...COLORS.accent)
  const linkText = "Schedule your feedback session."
  doc.textWithLink(linkText, 15 + headlineWidth, 33, { url: feedbackUrl })
  const linkWidth = doc.getTextWidth(linkText)
  doc.setDrawColor(...COLORS.accent)
  doc.setLineWidth(0.3)
  doc.line(15 + headlineWidth, 33.5, 15 + headlineWidth + linkWidth, 33.5)
  
  doc.setFontSize(7)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...COLORS.textLight)
  doc.text("Share your experience in a 30-min interview, selected participants receive $75 for their time.", 15, 37)
  
  // Header border bottom
  doc.setDrawColor(...COLORS.border)
  doc.setLineWidth(0.5)
  doc.line(0, 41, pageWidth, 41)

  // Account name
  doc.setTextColor(...COLORS.text)
  doc.setFontSize(20)
  doc.setFont("helvetica", "bold")
  doc.text(cleanAccountName, 15, 14)

  // Calculate the width of the client name to position Meta logo right next to it
  const nameWidth = doc.getTextWidth(cleanAccountName)

  const logoUrl = assetPath(adType === "linkedin-traffic" ? "/images/linkedin-logo.png" : "/images/meta-logo.svg")
  const logoType = "PNG" // Convert SVG to PNG for smaller size

  try {
    const logoImg = await loadImageHelper(logoUrl, 120, 50, 0.85) // Max 120px wide, 50px tall, 85% quality
    // Create a temporary image to get natural dimensions
    const img = new Image()
    img.src = logoImg
    await new Promise((resolve) => {
      img.onload = resolve
    })

    const logoHeight = 5 // Set desired height
    const logoWidth = (img.naturalWidth / img.naturalHeight) * logoHeight // Maintain aspect ratio
    const logoX = 15 + nameWidth + 4 // 4 units spacing from name
    const logoY = 10.5 // Vertically align with name

    doc.addImage(logoImg, logoType, logoX, logoY, logoWidth, logoHeight)
  } catch (error) {
    console.error(`Failed to load ${adType === "linkedin-traffic" ? "LinkedIn" : "Meta"} logo:`, error)
  }

  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...COLORS.textLight)
  doc.text(account.campaignName, 15, 20)

  // Date range
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...COLORS.textLight)
  const dateRangeText = `Date range ${formatDateForDisplay(account.dateRange.start)} to ${formatDateForDisplay(account.dateRange.end)}`
  doc.text(dateRangeText, 15, 27)

  // Created date
  doc.setFontSize(9)
  const createdText = `Created on ${new Date().toLocaleDateString()}`
  const createdTextWidth = doc.getTextWidth(createdText)
  doc.text(createdText, pageWidth - 15 - createdTextWidth, 27)

  const monthInProgressText = "Month in progress. Date as of today."
  const monthInProgressWidth = doc.getTextWidth(monthInProgressText)
  doc.text(monthInProgressText, pageWidth - 15 - monthInProgressWidth, 31)

  // Load and add Thryv logo above Meta badge
  const thryvLogoUrl = assetPath("/images/thryvlogo.png")
  try {
    const thryvLogoImg = await loadImageHelper(thryvLogoUrl, 200, 80, 0.85) // Max 200px wide, 80px tall, 85% quality
    // Create a temporary image to get natural dimensions
    const img = new Image()
    img.src = thryvLogoImg
    await new Promise((resolve) => {
      img.onload = resolve
    })

    const naturalAspectRatio = img.naturalWidth / img.naturalHeight
    const logoHeight = 7 // Set desired height
    const logoWidth = logoHeight * naturalAspectRatio // Calculate width to maintain aspect ratio

    const logoXPosition = pageWidth - 15 - logoWidth
    doc.addImage(thryvLogoImg, "PNG", logoXPosition, 6, logoWidth, logoHeight)
  } catch (error) {
    console.error("Failed to load Thryv logo:", error)
  }

  yPosition = 45

  if (adType === "linkedin-traffic") {
    // LinkedIn layout: 3 hero widgets across
    const cardWidth = (pageWidth - 40) / 3
    const cardHeight = 38
    const cardSpacing = 5

    const linkedinMetrics = [
      {
        label: "Impressions",
        value: formatNumber(account.currentMetrics.impressions),
        desc: "The number of times your LinkedIn ads were shown on screen.",
      },
      {
        label: "Clicks",
        value: formatNumber(account.currentMetrics.clicks),
        desc: "The number of clicks on your LinkedIn ads.",
      },
      {
        label: "Click Through Rate",
        value: formatPercentage(account.currentMetrics.ctr),
        desc: "The % of people who clicked on your LinkedIn ads after seeing them.",
      },
    ]

    // Draw 3 cards across
    linkedinMetrics.forEach((metric, index) => {
      const xPos = 15 + index * (cardWidth + cardSpacing)

      // Card background
      doc.setFillColor(...COLORS.cardBg)
      doc.roundedRect(xPos, yPosition, cardWidth, cardHeight, 2, 2, "F")

      // Border
      doc.setDrawColor(...COLORS.border)
      doc.setLineWidth(0.5)
      doc.roundedRect(xPos, yPosition, cardWidth, cardHeight, 2, 2, "S")

      // Label
      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(...COLORS.text)
      doc.text(metric.label, xPos + 4, yPosition + 7)

      // Value
      doc.setFontSize(18)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(...COLORS.text)
      doc.text(metric.value, xPos + 4, yPosition + 20)

      doc.setFontSize(7)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(...COLORS.textLight)
      const descLines = doc.splitTextToSize(metric.desc, cardWidth - 8)
      doc.text(descLines, xPos + 4, yPosition + 27)
    })

    yPosition += cardHeight + 8
  } else {
    // Meta layout: 2x2 scorecards + pie chart
    const leftColWidth = pageWidth * 0.52
    const rightColWidth = pageWidth * 0.38
    const cardWidth = (leftColWidth - 20) / 2
    const cardHeight = 38
    const cardSpacing = 4

    const metrics = [
      {
        label: "Impressions",
        value: formatNumber(account.currentMetrics.impressions),
        desc: "The number of times your Meta ads were shown on screen.",
      },
      {
        label: "Reach",
        value: formatNumber(account.currentMetrics.reach),
        desc: "The unique number of people that saw your Meta ads at least once.",
      },
      {
        label: "Clicks",
        value: formatNumber(account.currentMetrics.clicks),
        desc: "The number of clicks, taps, or swipes on your Meta ads.",
      },
      {
        label: "Click Through Rate",
        value: formatPercentage(account.currentMetrics.ctr),
        desc: adType === "traffic"
          ? "The % of people who clicked on your ads. Industry average: 1%-1.5%."
          : "The % of people who clicked on your Meta ads after seeing them.",
      },
    ]

    // Draw 2x2 scorecard grid
    metrics.forEach((metric, index) => {
      const row = Math.floor(index / 2)
      const col = index % 2
      const xPos = 15 + col * (cardWidth + cardSpacing)
      const yPos = yPosition + row * (cardHeight + cardSpacing)

      // Card background
      doc.setFillColor(...COLORS.cardBg)
      doc.roundedRect(xPos, yPos, cardWidth, cardHeight, 2, 2, "F")

      // Border
      doc.setDrawColor(...COLORS.border)
      doc.setLineWidth(0.5)
      doc.roundedRect(xPos, yPos, cardWidth, cardHeight, 2, 2, "S")

      // Label
      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(...COLORS.text)
      doc.text(metric.label, xPos + 4, yPos + 7)

      // Value - highlight CTR in green if > 1.5% for traffic reports only
      doc.setFontSize(18)
      doc.setFont("helvetica", "bold")
      if (adType === "traffic" && metric.label === "Click Through Rate" && account.currentMetrics.ctr > 1.5) {
        doc.setTextColor(34, 139, 34) // Green color for good CTR
      } else {
        doc.setTextColor(...COLORS.text)
      }
      doc.text(metric.value, xPos + 4, yPos + 20)

      doc.setFontSize(7)
      if (adType === "traffic" && metric.label === "Click Through Rate") {
        // Render first part normally
        const firstPart = "The % of people who clicked on your ads."
        const secondPart = "Industry average: 1%-1.5%."
        doc.setFont("helvetica", "normal")
        doc.setTextColor(...COLORS.textLight)
        const firstLines = doc.splitTextToSize(firstPart, cardWidth - 8)
        doc.text(firstLines, xPos + 4, yPos + 27)
        const firstLineHeight = firstLines.length * 3
        // Render second part with conditional green/bold
        if (account.currentMetrics.ctr > 1.5) {
          doc.setFont("helvetica", "bold")
          doc.setTextColor(34, 139, 34)
        }
        const secondLines = doc.splitTextToSize(secondPart, cardWidth - 8)
        doc.text(secondLines, xPos + 4, yPos + 27 + firstLineHeight)
      } else {
        doc.setFont("helvetica", "normal")
        doc.setTextColor(...COLORS.textLight)
        const descLines = doc.splitTextToSize(metric.desc, cardWidth - 8)
        doc.text(descLines, xPos + 4, yPos + 27)
      }
    })

    const pieXPos = leftColWidth + 10
    const pieYPos = yPosition
    const pieHeight = cardHeight * 2 + cardSpacing

    // Pie chart card
    doc.setFillColor(...COLORS.cardBg)
    doc.roundedRect(pieXPos, pieYPos, rightColWidth, pieHeight, 2, 2, "F")
    doc.setDrawColor(...COLORS.border)
    doc.roundedRect(pieXPos, pieYPos, rightColWidth, pieHeight, 2, 2, "S")

    // Pie chart title
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...COLORS.text)
    doc.text("Impressions vs Reach", pieXPos + 4, pieYPos + 7)

    const totalForPie = account.currentMetrics.impressions + account.currentMetrics.reach
    const impressionsPercent = (account.currentMetrics.impressions / totalForPie) * 100
    const reachPercent = (account.currentMetrics.reach / totalForPie) * 100

    // Pie chart center and radius
    const pieCenterX = pieXPos + rightColWidth * 0.32
    const pieCenterY = pieYPos + pieHeight / 2 + 3
    const pieRadius = 18

    // Draw Impressions slice (orange) - starts at top (270 degrees)
    const impressionsAngle = (impressionsPercent / 100) * 360
    doc.setFillColor(...COLORS.primary)

    const startAngle = 270
    const endAngle = startAngle + impressionsAngle

    doc.setLineWidth(0.5)
    doc.setDrawColor(255, 255, 255)

    // Draw impressions slice
    if (impressionsPercent > 0) {
      doc.circle(pieCenterX, pieCenterY, pieRadius, "F")

      if (impressionsPercent < 100) {
        doc.setFillColor(...COLORS.accent)

        const reachStartAngle = endAngle
        const reachEndAngle = reachStartAngle + (reachPercent / 100) * 360

        const points = []
        points.push([pieCenterX, pieCenterY])

        for (let angle = reachStartAngle; angle <= reachEndAngle; angle += 5) {
          const radian = (angle * Math.PI) / 180
          const x = pieCenterX + pieRadius * Math.cos(radian)
          const y = pieCenterY + pieRadius * Math.sin(radian)
          points.push([x, y])
        }

        const finalRadian = (reachEndAngle * Math.PI) / 180
        points.push([pieCenterX + pieRadius * Math.cos(finalRadian), pieCenterY + pieRadius * Math.sin(finalRadian)])

        points.push([pieCenterX, pieCenterY])

        doc.setFillColor(...COLORS.accent)
        if (points.length > 2) {
          doc.lines(
            points.slice(1).map((p, i) => [p[0] - points[i][0], p[1] - points[i][1]]),
            points[0][0],
            points[0][1],
            [1, 1],
            "F",
          )
        }
      }
    }

    const legendX = pieXPos + rightColWidth * 0.62
    const legendY = pieCenterY - 10

    // Impressions legend item
    doc.setFillColor(...COLORS.primary)
    doc.circle(legendX, legendY, 2, "F")
    doc.setFontSize(8)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...COLORS.text)
    doc.text(`Impressions`, legendX + 5, legendY + 1)
    doc.setFontSize(7)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...COLORS.textLight)
    doc.text(`${formatNumber(account.currentMetrics.impressions)}`, legendX + 5, legendY + 5)

    // Reach legend item
    doc.setFillColor(...COLORS.accent)
    doc.circle(legendX, legendY + 12, 2, "F")
    doc.setFontSize(8)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...COLORS.text)
    doc.text(`Reach`, legendX + 5, legendY + 13)
    doc.setFontSize(7)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...COLORS.textLight)
    doc.text(`${formatNumber(account.currentMetrics.reach)}`, legendX + 5, legendY + 17)

    yPosition += pieHeight + 8
  }

  if (adType === "lead" && account.currentMetrics.leads !== undefined) {
    // Meta Leads card
    const leadsCardWidth = pageWidth - 30
    const leadsCardHeight = 32

    doc.setFillColor(...COLORS.cardBg)
    doc.roundedRect(15, yPosition, leadsCardWidth, leadsCardHeight, 2, 2, "F")
    doc.setDrawColor(...COLORS.border)
    doc.roundedRect(15, yPosition, leadsCardWidth, leadsCardHeight, 2, 2, "S")

    // Label
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...COLORS.text)
    doc.text("Meta Leads", 19, yPosition + 7)

    // Value
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...COLORS.text)
    doc.text(formatNumber(account.currentMetrics.leads), 19, yPosition + 18)

    // Description
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...COLORS.textLight)
    doc.text("Total number of leads generated from your Meta ad campaigns.", 19, yPosition + 26)

    yPosition += leadsCardHeight + 8
  }

  const last6Months = account.historicalData.slice(-6)

  // Section spacing
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...COLORS.text)

  const chartWidth = (pageWidth - 40) / 3 // Increased width from (pageWidth - 45) / 3 to align with pie chart right edge
  const chartHeight = 55
  const chartStartY = yPosition

  // Draw three bar charts side by side
  const chartData = [
    { title: "Impression Trend - Last 6 Months", key: "impressions" },
    { title: "Reach Trend - Last 6 Months", key: "reach" },
    { title: "Click Trend - Last 6 Months", key: "clicks" },
  ]

  const linkedinChartData = [
    { title: "Impression Trend - Last 6 Months", key: "impressions" },
    { title: "Click Trend - Last 6 Months", key: "clicks" },
    { title: "CTR Trend - Last 6 Months", key: "ctr" },
  ]

  const chartsToRender = adType === "linkedin-traffic" ? linkedinChartData : chartData

  chartsToRender.forEach((chart, chartIndex) => {
    const xPos = 15 + chartIndex * (chartWidth + 5)

    // Chart card background
    doc.setFillColor(...COLORS.cardBg)
    doc.roundedRect(xPos, chartStartY, chartWidth, chartHeight, 2, 2, "F")
    doc.setDrawColor(...COLORS.border)
    doc.roundedRect(xPos, chartStartY, chartWidth, chartHeight, 2, 2, "S")

    // Chart title
    doc.setFontSize(8)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...COLORS.text)
    const lines = doc.splitTextToSize(chart.title, chartWidth - 8)
    doc.text(lines, xPos + 4, chartStartY + 6)

    // Chart area
    const chartAreaHeight = 28
    const chartAreaY = chartStartY + 14
    const barWidth = (chartWidth - 12) / last6Months.length - 2

    // Draw bars with blue color
    const values = last6Months.map((d) => d[chart.key as keyof typeof d] as number)
    const maxValue = Math.max(...values)

    values.forEach((value, i) => {
      const barHeight = maxValue > 0 ? (value / maxValue) * chartAreaHeight : 0
      const barX = xPos + 6 + i * (barWidth + 2)
      const barY = chartAreaY + chartAreaHeight - barHeight

      // Draw bar with accent blue color
      doc.setFillColor(...COLORS.accent)
      doc.rect(barX, barY, barWidth, barHeight, "F")

      // Draw data label above bar
      doc.setFontSize(6)
      doc.setTextColor(...COLORS.text)
      const formattedValue = chart.key === "ctr" ? formatPercentage(value) : formatNumber(value)
      doc.text(formattedValue, barX + barWidth / 2, barY - 2, { align: "center" })
    })

    // X-axis labels
    doc.setFontSize(6)
    doc.setTextColor(...COLORS.textLight)
    last6Months.forEach((month, i) => {
      const labelX = xPos + 6 + i * (barWidth + 2) + barWidth / 2
      const monthShort = month.month.split(" ")[0].substring(0, 3)
      doc.text(monthShort, labelX, chartAreaY + chartAreaHeight + 4, { align: "center" })
    })
  })

  yPosition = chartStartY + chartHeight + 8

  doc.setFontSize(13)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...COLORS.text)
  doc.text("Historical Performance", 15, yPosition)
  yPosition += 3

  const tableData = last6Months
    .slice()
    .reverse()
    .map((row) => {
      if (adType === "linkedin-traffic") {
        return [row.month, formatNumber(row.impressions), formatNumber(row.clicks), formatPercentage(row.ctr)]
      }
      return [
        row.month,
        formatNumber(row.impressions),
        formatNumber(row.reach),
        formatNumber(row.clicks),
        formatPercentage(row.ctr),
      ]
    })

  const tableHeaders =
    adType === "linkedin-traffic"
      ? [["Month", "Impressions", "Clicks", "CTR"]]
      : [["Month", "Impressions", "Reach", "Clicks", "CTR"]]

  // Determine CTR column index for conditional styling
  const ctrColIndex = adType === "linkedin-traffic" ? 3 : 4

  autoTable(doc, {
    startY: yPosition,
    head: tableHeaders,
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: COLORS.background,
      textColor: COLORS.text,
      fontSize: 9,
      fontStyle: "bold",
      lineWidth: 0.5,
      lineColor: COLORS.border,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: COLORS.text,
      lineWidth: 0.5,
      lineColor: COLORS.border,
    },
    alternateRowStyles: {
      fillColor: COLORS.cardBg,
    },
    margin: { left: 15, right: 15 },
    didParseCell: (data: { section: string; column: { index: number }; cell: { styles: { textColor: number[]; fontStyle: string } }; row: { index: number } }) => {
      // Highlight CTR cells green + bold for Meta Traffic reports only
      if (adType === "traffic" && data.section === "body" && data.column.index === ctrColIndex) {
        const rowData = last6Months.slice().reverse()[data.row.index]
        if (rowData && rowData.ctr > 1.5) {
          data.cell.styles.textColor = [34, 139, 34]
          data.cell.styles.fontStyle = "bold"
        }
      }
    },
  })

  return doc.output("blob")
}

export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export async function generateAllPDFs(
  accounts: ProcessedAdAccount[],
  adType: "traffic" | "lead" | "linkedin-traffic" = "traffic",
): Promise<void> {
  const zip = new JSZip()

  for (const account of accounts) {
    const blob = await generatePDF(account, adType)
    const cleanClientName = account.accountName.split("(")[0].trim()
    const mostRecentMonth = account.historicalData[account.historicalData.length - 1].month
    const campaignDescriptor = account.campaignName.replace(/^Add-?\s*on\s+\d+\s+/i, "").trim()
    const platform = adType === "linkedin-traffic" ? "LinkedIn" : "Meta"
    const filename = `${cleanClientName} - ${mostRecentMonth} - ${platform} - ${campaignDescriptor}.pdf`

    // Add PDF to zip file
    zip.file(filename, blob)
  }

  // Generate zip file and download it
  const zipBlob = await zip.generateAsync({ type: "blob" })
  const timestamp = new Date().toISOString().split("T")[0]
  const zipFilename = `Thryv Social Ad Reports - ${timestamp}.zip`

  downloadPDF(zipBlob, zipFilename)
}
