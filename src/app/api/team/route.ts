import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { MASTER_TEAM_MEMBERS, TeamMember, StaffRole } from "@/lib/team-catalog"

const DATA_DIR = path.join(process.cwd(), "data")
const TEAM_FILE = path.join(DATA_DIR, "team.json")

function getTeamMembers(): TeamMember[] {
  try {
    if (fs.existsSync(TEAM_FILE)) {
      const data = fs.readFileSync(TEAM_FILE, "utf-8")
      const parsed = JSON.parse(data)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (err) {
    console.warn("Failed to read team.json, using master catalog fallback:", err)
  }
  return MASTER_TEAM_MEMBERS
}

function saveTeamMembers(members: TeamMember[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    fs.writeFileSync(TEAM_FILE, JSON.stringify(members, null, 2), "utf-8")
  } catch (err) {
    console.warn("Failed to save team.json:", err)
  }
}

// GET: Return all team members
export async function GET() {
  const members = getTeamMembers()
  return NextResponse.json({ success: true, members })
}

// POST: Add a new staff member or bulk replace
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Bulk replace check
    if (Array.isArray(body.members)) {
      saveTeamMembers(body.members)
      return NextResponse.json({ success: true, members: body.members })
    }

    const members = getTeamMembers()
    const memberData = body.member || body

    if (!memberData.name || !memberData.name.trim()) {
      return NextResponse.json({ error: "Staff name is required" }, { status: 400 })
    }

    const role: StaffRole = memberData.role || "pos-orders"
    const roleLabels: Record<StaffRole, string> = {
      admin: "Restaurant Admin & Owner",
      manager: "Restaurant Operations Manager",
      "pos-orders": "POS Cashier / Order Taker",
      "pos-kitchen": "Chef / Kitchen Cook",
      "pos-reception": "Front Desk & Hostess",
      bartender: "Mixologist & Bartender",
      inventory: "Inventory & Store Keeper",
    }

    const departmentMap: Record<StaffRole, TeamMember["department"]> = {
      admin: "Management",
      manager: "Management",
      "pos-orders": "Front of House",
      "pos-kitchen": "Kitchen & Bar",
      "pos-reception": "Front of House",
      bartender: "Kitchen & Bar",
      inventory: "Operations",
    }

    const avatarColors = [
      "bg-[#C46B4E]",
      "bg-amber-600",
      "bg-orange-600",
      "bg-blue-600",
      "bg-cyan-600",
      "bg-emerald-600",
      "bg-purple-600",
      "bg-indigo-600",
      "bg-rose-600",
    ]
    const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)]

    const newMember: TeamMember = {
      id: memberData.id || `staff_${Date.now()}`,
      name: memberData.name.trim(),
      email: memberData.email?.trim() || `${memberData.name.toLowerCase().replace(/\s+/g, ".")}@nodedrbistro.com`,
      role,
      roleLabel: memberData.roleLabel || roleLabels[role] || "Staff Member",
      department: memberData.department || departmentMap[role] || "Operations",
      station: memberData.station || "General Outlet Floor",
      phone: memberData.phone?.trim() || "+91 98200 00000",
      pin: memberData.pin?.trim() || String(Math.floor(1000 + Math.random() * 9000)),
      status: memberData.status === "off-duty" ? "off-duty" : "active",
      shift: memberData.shift || "Morning (7 AM - 3 PM)",
      joinedDate: new Date().toISOString().split("T")[0],
      lastActive: "Just added",
      avatarColor: memberData.avatarColor || randomColor,
    }

    members.unshift(newMember)
    saveTeamMembers(members)

    return NextResponse.json({ success: true, member: newMember, members })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to add team member" }, { status: 500 })
  }
}

// PATCH: Update member details or toggle on-shift status
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, updates, toggleStatus } = body

    if (!id) {
      return NextResponse.json({ error: "Member ID is required" }, { status: 400 })
    }

    const members = getTeamMembers()
    const index = members.findIndex((m) => m.id === id)

    if (index === -1) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 })
    }

    if (toggleStatus) {
      const current = members[index].status
      members[index].status = current === "active" ? "off-duty" : "active"
      members[index].lastActive = members[index].status === "active" ? "Active Now" : "Shift Ended"
    } else if (updates && typeof updates === "object") {
      members[index] = {
        ...members[index],
        ...updates,
      }
    }

    saveTeamMembers(members)
    return NextResponse.json({ success: true, member: members[index], members })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update member" }, { status: 500 })
  }
}

// DELETE: Remove a team member
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Member ID is required" }, { status: 400 })
    }

    const members = getTeamMembers()
    const target = members.find((m) => m.id === id)
    if (target?.role === "admin" && members.filter((m) => m.role === "admin").length <= 1) {
      return NextResponse.json({ error: "Cannot delete the primary restaurant administrator" }, { status: 400 })
    }

    const filtered = members.filter((m) => m.id !== id)
    saveTeamMembers(filtered)

    return NextResponse.json({ success: true, members: filtered })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete member" }, { status: 500 })
  }
}
