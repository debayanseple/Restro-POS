export interface PrinterConfig {
  id: string
  name: string
  station: "Counter POS" | "Hot Kitchen" | "Bar & Drinks" | string
  ipOrPort: string
  paperWidth: "80mm" | "58mm"
  status: "online" | "standby"
}

export interface FloorConfig {
  id: string
  name: string
  tableCount: number
  defaultSeats: number
}

export interface RestaurantSettings {
  // 1. Outlet & Profile
  restaurantName: string
  legalName: string
  outletName: string
  cuisineType: string
  fssaiNumber: string
  phone: string
  email: string
  address: string
  cityState: string
  pinCode: string
  currency: string
  timezone: string
  openingTime: string
  closingTime: string
  isAcceptingOrders: boolean

  // 2. GST, Tax & Billing
  gstin: string
  sacCode: string
  cgstRate: number
  sgstRate: number
  serviceChargeEnabled: boolean
  serviceChargeRate: number
  packagingFeeInr: number
  roundOffBills: boolean
  invoicePrefix: string
  receiptHeaderNote: string
  receiptFooterNote: string

  // 3. QR Menu & Floor
  totalFloors: number
  totalTables: number
  floors: FloorConfig[]
  qrOrderingEnabled: boolean
  qrRequireTable: boolean
  qrWaiterCallEnabled: boolean
  qrCleanTableEnabled: boolean
  qrBillRequestEnabled: boolean
  autoOccupyTableOnOrder: boolean
  autoAcceptQrToKds: boolean
  prepTimeSlaMins: number
  waiterCallSlaMins: number

  // 4. Payments & UPI
  upiEnabled: boolean
  upiVpa: string
  upiMerchantName: string
  cashEnabled: boolean
  cardEnabled: boolean
  payLaterEnabled: boolean
  gatewayMode: "live" | "sandbox"

  // 5. KDS & Printers
  splitKitchenBarTickets: boolean
  kdsSoundAlerts: boolean
  autoPrintKot: boolean
  receiptPaperSize: "80mm" | "58mm"
  printers: PrinterConfig[]

  // 6. Alerts & Notifications
  lowStockAlertEnabled: boolean
  expiryAlertDays: number
  dailyDigestEmail: boolean
  whatsappAlertsEnabled: boolean
  whatsappAlertNumber: string
  updatedAt: string
}

export const DEFAULT_RESTAURANT_SETTINGS: RestaurantSettings = {
  restaurantName: "Nodedr Bistro",
  legalName: "Nodedr Hospitality Pvt. Ltd.",
  outletName: "Downtown Main Outlet",
  cuisineType: "Modern European, Artisan Wood-Fired & Indian Fusion",
  fssaiNumber: "11526035000482",
  phone: "+91 22 4890 1122",
  email: "hello@nodedrbistro.in",
  address: "14 Horniman Circle, Kala Ghoda, Fort",
  cityState: "Mumbai, Maharashtra",
  pinCode: "400001",
  currency: "INR (₹)",
  timezone: "Asia/Kolkata (IST +05:30)",
  openingTime: "11:00",
  closingTime: "23:30",
  isAcceptingOrders: true,

  gstin: "27AABCN1234F1Z5",
  sacCode: "996331",
  cgstRate: 2.5,
  sgstRate: 2.5,
  serviceChargeEnabled: false,
  serviceChargeRate: 5,
  packagingFeeInr: 20,
  roundOffBills: true,
  invoicePrefix: "ORD-",
  receiptHeaderNote: "GST Invoice · Dine-In & Takeaway",
  receiptFooterNote: "Thank you for dining at Nodedr Bistro! Follow @nodedrbistro",

  totalFloors: 1,
  totalTables: 8,
  floors: [
    {
      id: "floor_1",
      name: "Ground Floor",
      tableCount: 8,
      defaultSeats: 4,
    },
  ],
  qrOrderingEnabled: true,
  qrRequireTable: true,
  qrWaiterCallEnabled: true,
  qrCleanTableEnabled: true,
  qrBillRequestEnabled: true,
  autoOccupyTableOnOrder: true,
  autoAcceptQrToKds: true,
  prepTimeSlaMins: 15,
  waiterCallSlaMins: 3,

  upiEnabled: true,
  upiVpa: "nodedrbistro@icici",
  upiMerchantName: "Nodedr Bistro Mumbai",
  cashEnabled: true,
  cardEnabled: true,
  payLaterEnabled: true,
  gatewayMode: "live",

  splitKitchenBarTickets: true,
  kdsSoundAlerts: true,
  autoPrintKot: true,
  receiptPaperSize: "80mm",
  printers: [
    {
      id: "prt_counter",
      name: "Epson TM-T88VI Counter",
      station: "Counter POS",
      ipOrPort: "192.168.1.41:9100",
      paperWidth: "80mm",
      status: "online",
    },
    {
      id: "prt_kitchen",
      name: "Star TSP143 Hot Kitchen KOT",
      station: "Hot Kitchen",
      ipOrPort: "192.168.1.42:9100",
      paperWidth: "80mm",
      status: "online",
    },
    {
      id: "prt_bar",
      name: "Thermal Bar Printer #1",
      station: "Bar & Drinks",
      ipOrPort: "192.168.1.43:9100",
      paperWidth: "58mm",
      status: "standby",
    },
  ],

  lowStockAlertEnabled: true,
  expiryAlertDays: 3,
  dailyDigestEmail: true,
  whatsappAlertsEnabled: true,
  whatsappAlertNumber: "+91 98201 23456",
  updatedAt: "2026-11-27T00:00:00.000Z",
}

const ORDINAL_FLOOR_NAMES = [
  "Ground Floor",
  "First Floor",
  "Second Floor",
  "Third Floor",
  "Fourth Floor",
  "Fifth Floor",
]

export function getDefaultFloorName(index: number): string {
  return ORDINAL_FLOOR_NAMES[index] || `Floor ${index + 1}`
}

export function resizeFloorsList(
  currentFloors: FloorConfig[],
  nextCount: number
): FloorConfig[] {
  const safeCount = Math.max(1, Math.min(10, Math.floor(nextCount || 1)))
  const base = Array.isArray(currentFloors) && currentFloors.length > 0
    ? currentFloors
    : DEFAULT_RESTAURANT_SETTINGS.floors

  if (base.length >= safeCount) {
    return base.slice(0, safeCount)
  }

  const next = [...base]
  for (let i = base.length; i < safeCount; i++) {
    next.push({
      id: `floor_${i + 1}`,
      name: getDefaultFloorName(i),
      tableCount: 4,
      defaultSeats: 4,
    })
  }
  return next
}

export function normalizeFloors(rawFloors?: FloorConfig[]): FloorConfig[] {
  const source =
    Array.isArray(rawFloors) && rawFloors.length > 0
      ? rawFloors
      : DEFAULT_RESTAURANT_SETTINGS.floors
  return source.map((f, idx) => ({
    id: f.id || `floor_${idx + 1}`,
    name: (f.name || "").trim() || getDefaultFloorName(idx),
    tableCount: Math.max(1, Math.min(50, Math.floor(Number(f.tableCount) || 1))),
    defaultSeats: Math.max(1, Math.min(20, Math.floor(Number(f.defaultSeats) || 4))),
  }))
}

export function buildTablesFromFloors(
  rawFloors: FloorConfig[],
  existingTables: any[] = []
): any[] {
  const floors = normalizeFloors(rawFloors)
  const existingMap = new Map<number, any>()
  for (const tbl of existingTables) {
    if (tbl && typeof tbl.id === "number") {
      existingMap.set(tbl.id, tbl)
    }
  }

  const result: any[] = []
  let tableCounter = 1
  for (let fIdx = 0; fIdx < floors.length; fIdx++) {
    const floor = floors[fIdx]
    const floorNumber = fIdx + 1
    for (let i = 0; i < floor.tableCount; i++) {
      const id = tableCounter++
      const existing = existingMap.get(id)
      result.push({
        id,
        name: `Table ${id}`,
        seats: floor.defaultSeats || existing?.seats || 4,
        status: existing?.status || "available",
        isOpen: typeof existing?.isOpen === "boolean" ? existing.isOpen : false,
        orderCode: existing?.orderCode,
        clearedAt: existing?.clearedAt,
        floorNumber,
        floorName: floor.name,
      })
    }
  }
  return result
}
