import {
  DEFAULT_RESTAURANT_SETTINGS,
  RestaurantSettings,
} from "@/lib/restaurant-settings"

export interface PdfBillInput {
  tableName: string
  sentAt?: string
  hasUnpaid?: boolean
  subtotal: number
  tax: number
  discount?: number
  grandTotal: number
  settings?: Partial<RestaurantSettings>
  orders: Array<{
    order_number?: string
    order_type?: string
    customer_name?: string | null
    customer_phone?: string | null
    payment_status?: string
    payment_method?: string
    created_at?: string
    items?: Array<{
      name?: string
      quantity?: number
      unit_price?: number
    }>
  }>
}

function pdfEscape(text: string): string {
  const asciiSafe = text
    .replace(/₹/g, "Rs.")
    .replace(/×/g, "x")
    .replace(/·/g, "-")
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\x7E]/g, " ")
  return asciiSafe
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ""
  for (const w of words) {
    if (!current) {
      current = w
    } else if (current.length + 1 + w.length <= maxChars) {
      current += ` ${w}`
    } else {
      lines.push(current)
      current = w
    }
  }
  if (current) lines.push(current)
  return lines.length > 0 ? lines : [""]
}

function formatBillDateTime(iso?: string): string {
  const d = iso ? new Date(iso) : new Date()
  if (isNaN(d.getTime())) return new Date().toLocaleString("en-IN")
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

/**
 * Builds a valid PDF 1.4 thermal-style GST invoice matching BillReceiptModal.
 */
export function buildBillPdfBlob(bill: PdfBillInput): Blob {
  const cfg = { ...DEFAULT_RESTAURANT_SETTINGS, ...(bill.settings || {}) }
  const pageWidth = 340
  const marginX = 20
  const rightX = pageWidth - marginX

  const flattenedItems = (bill.orders || []).flatMap((ord) =>
    (ord.items || []).map((it) => {
      const name = String(it.name || "Menu Item").trim()
      const qty = Math.max(1, Number(it.quantity) || 1)
      const rate = Number(it.unit_price) || 0
      return { name, qty, rate, amount: rate * qty }
    })
  )

  const totalQty = flattenedItems.reduce((s, it) => s + it.qty, 0)
  const billNos = Array.from(
    new Set((bill.orders || []).map((o) => o.order_number).filter(Boolean))
  ).join(", ") || "BILL"

  const firstOrder = bill.orders?.[0]
  const orderDate = formatBillDateTime(firstOrder?.created_at || bill.sentAt)
  const modeLabel = String(firstOrder?.order_type || "dine-in")
    .replace(/[-_]/g, " ")
    .toUpperCase()

  const customerOrder = (bill.orders || []).find(
    (o) => o.customer_name || o.customer_phone
  )
  const guestLabel = customerOrder
    ? [
        customerOrder.customer_name,
        customerOrder.customer_phone ? `(${customerOrder.customer_phone})` : "",
      ]
        .filter(Boolean)
        .join(" ")
    : ""

  const paymentMethod = String(firstOrder?.payment_method || "CASH").toUpperCase()
  const statusBoxText = bill.hasUnpaid
    ? "PAYMENT DUE"
    : `PAID - ${paymentMethod}`

  const fullAddress = [cfg.address, cfg.cityState, cfg.pinCode ? `- ${cfg.pinCode}` : ""]
    .filter(Boolean)
    .join(", ")
    .replace(", - ", " - ")
  const addressLines = wrapText(fullAddress, 44)
  const footerLines = wrapText(
    cfg.receiptFooterNote || `Thank you for dining at ${cfg.restaurantName}!`,
    44
  )

  // Compute exact dynamic page height
  const extraLines =
    addressLines.length +
    footerLines.length +
    (guestLabel ? 1 : 0) +
    (Number(bill.discount || 0) > 0 ? 1 : 0)
  const pageHeight = Math.max(460, 350 + extraLines * 14 + Math.max(1, flattenedItems.length) * 16)

  const cmds: string[] = []
  let y = pageHeight - 32

  // Monospace Courier character width is exactly 0.6 * fontSize
  const drawText = (
    text: string,
    x: number,
    yPos: number,
    size = 9,
    bold = false,
    gray = 0.13
  ) => {
    const font = bold ? "/F2" : "/F1"
    cmds.push(
      `BT ${gray.toFixed(2)} g ${font} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${yPos.toFixed(2)} Tm (${pdfEscape(text)}) Tj ET`
    )
  }

  const drawCentered = (
    text: string,
    yPos: number,
    size = 9,
    bold = false,
    gray = 0.13
  ) => {
    const safe = pdfEscape(text)
    const width = safe.length * size * 0.6
    const x = Math.max(marginX, (pageWidth - width) / 2)
    drawText(text, x, yPos, size, bold, gray)
  }

  const drawRight = (
    text: string,
    yPos: number,
    size = 9,
    bold = false,
    gray = 0.13,
    targetRightX = rightX
  ) => {
    const safe = pdfEscape(text)
    const width = safe.length * size * 0.6
    const x = Math.max(marginX, targetRightX - width)
    drawText(text, x, yPos, size, bold, gray)
  }

  const drawDashedLine = (yPos: number) => {
    cmds.push("0.70 G 0.7 w [2.5 2.5] 0 d")
    cmds.push(`${marginX} ${yPos.toFixed(2)} m ${rightX} ${yPos.toFixed(2)} l S`)
    cmds.push("[] 0 d")
  }

  const drawSolidLine = (yPos: number, width = 1.2) => {
    cmds.push(`0.10 G ${width} w [] 0 d`)
    cmds.push(`${marginX} ${yPos.toFixed(2)} m ${rightX} ${yPos.toFixed(2)} l S`)
  }

  // 1. Restaurant Header
  drawCentered(String(cfg.restaurantName || "RESTAURANT").toUpperCase(), y, 14, true, 0.1)
  y -= 15
  if (cfg.outletName) {
    drawCentered(cfg.outletName, y, 9.5, true, 0.2)
    y -= 13
  }
  for (const line of addressLines) {
    drawCentered(line, y, 8.5, false, 0.35)
    y -= 12
  }
  if (cfg.phone) {
    drawCentered(`Tel: ${cfg.phone}`, y, 8.5, false, 0.35)
    y -= 12
  }
  const taxIds = [
    cfg.gstin ? `GSTIN: ${cfg.gstin}` : "",
    cfg.fssaiNumber ? `FSSAI: ${cfg.fssaiNumber}` : "",
  ]
    .filter(Boolean)
    .join(" - ")
  if (taxIds) {
    drawCentered(taxIds, y, 8.2, false, 0.35)
    y -= 13
  }
  if (cfg.receiptHeaderNote) {
    drawCentered(cfg.receiptHeaderNote, y, 8.5, true, 0.15)
    y -= 13
  }

  drawDashedLine(y)
  y -= 15

  // 2. Metadata Rows
  drawText("Bill No:", marginX, y, 9, false, 0.35)
  drawRight(billNos, y, 9, true, 0.12)
  y -= 14

  drawText("Date:", marginX, y, 9, false, 0.35)
  drawRight(orderDate, y, 9, false, 0.15)
  y -= 14

  drawText("Table / Mode:", marginX, y, 9, false, 0.35)
  drawRight(`${bill.tableName || "Table"} (${modeLabel})`, y, 9, true, 0.12)
  y -= 14

  if (guestLabel) {
    drawText("Guest:", marginX, y, 9, false, 0.35)
    drawRight(guestLabel, y, 9, false, 0.15)
    y -= 14
  }

  y -= 2
  drawDashedLine(y)
  y -= 14

  // 3. Items Table Header
  const qtyColX = rightX - 102
  const rateColX = rightX - 54
  drawText("ITEM", marginX, y, 8.5, true, 0.2)
  drawRight("QTY", y, 8.5, true, 0.2, qtyColX)
  drawRight("RATE", y, 8.5, true, 0.2, rateColX)
  drawRight("AMT", y, 8.5, true, 0.2, rightX)
  y -= 8
  drawDashedLine(y)
  y -= 14

  // 4. Item Rows
  for (const it of flattenedItems) {
    const itemName = it.name.length > 24 ? `${it.name.slice(0, 22)}..` : it.name
    drawText(itemName, marginX, y, 9, true, 0.12)
    drawRight(String(it.qty), y, 9, false, 0.15, qtyColX)
    drawRight(it.rate.toFixed(2), y, 9, false, 0.15, rateColX)
    drawRight(it.amount.toFixed(2), y, 9, true, 0.12, rightX)
    y -= 15
  }

  y -= 2
  drawDashedLine(y)
  y -= 15

  // 5. Subtotal & GST Breakdown
  const halfTax = Number(bill.tax || 0) / 2
  const cgstPct = Number(cfg.cgstRate ?? 2.5)
  const sgstPct = Number(cfg.sgstRate ?? 2.5)

  drawText(`Subtotal (${totalQty} item${totalQty === 1 ? "" : "s"})`, marginX, y, 9, false, 0.25)
  drawRight(`Rs.${Number(bill.subtotal || 0).toFixed(2)}`, y, 9, false, 0.15)
  y -= 14

  drawText(`CGST (${cgstPct}%)`, marginX, y, 9, false, 0.35)
  drawRight(`Rs.${halfTax.toFixed(2)}`, y, 9, false, 0.25)
  y -= 14

  drawText(`SGST (${sgstPct}%)`, marginX, y, 9, false, 0.35)
  drawRight(`Rs.${halfTax.toFixed(2)}`, y, 9, false, 0.25)
  y -= 14

  if (Number(bill.discount || 0) > 0) {
    drawText("Discount", marginX, y, 9, false, 0.25)
    drawRight(`-Rs.${Number(bill.discount || 0).toFixed(2)}`, y, 9, false, 0.25)
    y -= 14
  }

  y -= 2
  drawSolidLine(y, 1.3)
  y -= 16

  // 6. Grand Total
  drawText("GRAND TOTAL", marginX, y, 11.5, true, 0.08)
  drawRight(`Rs.${Number(bill.grandTotal || 0).toFixed(2)}`, y, 11.5, true, 0.08)
  y -= 9
  drawSolidLine(y, 1.3)
  y -= 22

  // 7. Boxed Paid / Payment Due Stamp
  const boxW = Math.max(96, pdfEscape(statusBoxText).length * 9 * 0.6 + 24)
  const boxH = 20
  const boxX = (pageWidth - boxW) / 2
  const boxY = y - 5
  cmds.push(`0.15 G 0.9 w [] 0 d ${boxX.toFixed(2)} ${boxY.toFixed(2)} ${boxW.toFixed(2)} ${boxH} re S`)
  drawCentered(statusBoxText, y + 2, 9, true, 0.12)
  y -= 22

  // 8. Footer Note
  for (const line of footerLines) {
    drawCentered(line, y, 8.5, false, 0.35)
    y -= 12
  }
  y -= 4
  drawCentered("SAC 996331 - Printed via Restro POS", y, 7.5, false, 0.45)

  const streamContent = cmds.join("\n")

  const objects: string[] = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n`,
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n",
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>\nendobj\n",
    `6 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
  ]

  let pdf = "%PDF-1.4\n"
  const offsets: number[] = [0]
  for (const obj of objects) {
    offsets.push(pdf.length)
    pdf += obj
  }

  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += "0000000000 65535 f \n"
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`

  return new Blob([pdf], { type: "application/pdf" })
}
