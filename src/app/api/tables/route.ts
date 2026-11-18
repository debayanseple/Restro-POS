import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const TABLES_FILE = path.join(DATA_DIR, "tables.json")
const ORDERS_FILE = path.join(DATA_DIR, "orders.json")

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
  let tables = [...DEFAULT_TABLES]
  try {
    if (fs.existsSync(TABLES_FILE)) {
      const content = fs.readFileSync(TABLES_FILE, "utf-8")
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed) && parsed.length > 0) {
        tables = parsed
      }
    } else {
      saveTables(tables)
    }
  } catch (err) {
    console.warn("Failed to load tables.json:", err)
  }

  return tables
}

function saveTables(tables: any[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    fs.writeFileSync(TABLES_FILE, JSON.stringify(tables, null, 2), "utf-8")
  } catch (err) {
    console.warn("Failed to save tables.json:", err)
  }
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
