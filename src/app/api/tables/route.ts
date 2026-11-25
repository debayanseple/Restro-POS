import { NextResponse } from "next/server"
import { readStore, writeStore } from "@/lib/serverless-store"

export const dynamic = "force-dynamic"

const DEFAULT_TABLES = [
  { id: 1, name: "Table 1", seats: 4, status: "available", isOpen: false },
  { id: 2, name: "Table 2", seats: 4, status: "available", isOpen: false },
  { id: 3, name: "Table 3", seats: 6, status: "available", isOpen: false },
  { id: 4, name: "Table 4", seats: 4, status: "available", isOpen: false },
  { id: 6, name: "Table 6", seats: 6, status: "available", isOpen: false },
  { id: 7, name: "Table 7", seats: 4, status: "available", isOpen: false },
  { id: 8, name: "Table 8", seats: 4, status: "available", isOpen: false },
]

function getTables(): any[] {
  return readStore<any[]>("tables.json", DEFAULT_TABLES)
}

function saveTables(tables: any[]) {
  writeStore("tables.json", tables)
}

export async function GET() {
  const tables = getTables()
  return NextResponse.json({ success: true, tables })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { table_id, status, isOpen } = body

    let tables = getTables()
    tables = tables.map((t) => {
      const matches =
        t.id === Number(table_id) ||
        t.name.toLowerCase() === String(table_id).toLowerCase() ||
        `table ${t.id}` === String(table_id).toLowerCase() ||
        `table 0${t.id}` === String(table_id).toLowerCase()

      if (matches) {
        return {
          ...t,
          status: status || t.status,
          isOpen: typeof isOpen === "boolean" ? isOpen : t.isOpen,
        }
      }
      return t
    })

    saveTables(tables)
    return NextResponse.json({ success: true, tables })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
