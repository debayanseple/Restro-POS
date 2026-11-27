import { NextResponse } from "next/server"
import { readStore, writeStore } from "@/lib/serverless-store"

export const dynamic = "force-dynamic"

export interface ExpenseEntry {
  id: string
  title: string
  category:
    | "Vendor Procurement"
    | "Staff Payroll"
    | "Rent & Lease"
    | "Utilities & Gas"
    | "Packaging & Delivery"
    | "Maintenance & Misc"
    | string
  vendor: string
  amount: number
  gstIncluded: boolean
  paymentMode: "UPI" | "Bank Transfer" | "Cash" | "Corporate Card" | string
  status: "Paid" | "Scheduled"
  date: string
  notes?: string
}

const DEFAULT_EXPENSES: ExpenseEntry[] = [
  {
    id: "exp_1",
    title: "Monthly Outlet Rent — Downtown Main",
    category: "Rent & Lease",
    vendor: "Skyline Commercial Estates Pvt Ltd",
    amount: 45000,
    gstIncluded: true,
    paymentMode: "Bank Transfer",
    status: "Paid",
    date: "2026-11-01",
    notes: "November 2026 lease invoice #INV-8821",
  },
  {
    id: "exp_2",
    title: "Commercial LPG & Kitchen Piped Gas",
    category: "Utilities & Gas",
    vendor: "Mahanagar Gas Commercial",
    amount: 6450,
    gstIncluded: true,
    paymentMode: "UPI",
    status: "Paid",
    date: "2026-11-18",
    notes: "Kitchen cooking line cylinders & meter billing",
  },
  {
    id: "exp_3",
    title: "Dairy & Fresh Produce Weekly Settlement",
    category: "Vendor Procurement",
    vendor: "Valley Dairy Farms & Fresh Grocers",
    amount: 12800,
    gstIncluded: false,
    paymentMode: "UPI",
    status: "Paid",
    date: "2026-11-22",
    notes: "Bocconcini, cream, tomatoes & herbs batch",
  },
  {
    id: "exp_4",
    title: "Biodegradable Takeaway Containers & Bags",
    category: "Packaging & Delivery",
    vendor: "EcoPack India",
    amount: 3200,
    gstIncluded: true,
    paymentMode: "Corporate Card",
    status: "Paid",
    date: "2026-11-20",
    notes: "500 kraft boxes + tamper-evident seals",
  },
  {
    id: "exp_5",
    title: "Electricity & Walk-in Chiller Power Bill",
    category: "Utilities & Gas",
    vendor: "Tata Power Commercial",
    amount: 9120,
    gstIncluded: false,
    paymentMode: "Bank Transfer",
    status: "Scheduled",
    date: "2026-11-26",
    notes: "Auto-debit scheduled",
  },
]

function getExpenses(): ExpenseEntry[] {
  return readStore<ExpenseEntry[]>("expenses.json", DEFAULT_EXPENSES)
}

function saveExpenses(items: ExpenseEntry[]) {
  writeStore("expenses.json", items)
}

export async function GET() {
  const expenses = getExpenses()
  return NextResponse.json({ success: true, expenses })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.title || !String(body.title).trim()) {
      return NextResponse.json({ error: "Expense title is required" }, { status: 400 })
    }
    const amount = Number(body.amount)
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Valid positive amount is required" }, { status: 400 })
    }

    const expenses = getExpenses()
    const newEntry: ExpenseEntry = {
      id: `exp_${Date.now()}`,
      title: String(body.title).trim(),
      category: body.category || "Maintenance & Misc",
      vendor: body.vendor ? String(body.vendor).trim() : "General Vendor",
      amount,
      gstIncluded: Boolean(body.gstIncluded),
      paymentMode: body.paymentMode || "UPI",
      status: body.status === "Scheduled" ? "Scheduled" : "Paid",
      date: body.date || new Date().toISOString().split("T")[0],
      notes: body.notes ? String(body.notes).trim() : undefined,
    }

    const updated = [newEntry, ...expenses]
    saveExpenses(updated)
    return NextResponse.json({ success: true, expense: newEntry, expenses: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to create expense" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "Expense ID is required" }, { status: 400 })
    }
    const expenses = getExpenses()
    const updated = expenses.filter((e) => e.id !== id)
    saveExpenses(updated)
    return NextResponse.json({ success: true, expenses: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to delete expense" }, { status: 500 })
  }
}
