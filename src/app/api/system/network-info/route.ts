import { NextResponse } from "next/server"
import os from "os"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const interfaces = os.networkInterfaces()
    const addresses: Array<{ name: string; address: string }> = []

    for (const name of Object.keys(interfaces)) {
      const ifaceList = interfaces[name]
      if (!ifaceList) continue
      for (const iface of ifaceList) {
        if (iface.family === "IPv4" && !iface.internal) {
          addresses.push({ name, address: iface.address })
        }
      }
    }

    // Pick best LAN IP: 192.168.*, 10.*, 172.16-31.*
    let primaryIp = ""
    const privateMatch = addresses.find((a) =>
      a.address.startsWith("192.168.") ||
      a.address.startsWith("10.") ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(a.address)
    )

    if (privateMatch) {
      primaryIp = privateMatch.address
    } else if (addresses.length > 0) {
      primaryIp = addresses[0].address
    } else {
      primaryIp = "127.0.0.1"
    }

    const port = process.env.PORT || "3000"
    const networkUrl = `http://${primaryIp}:${port}`
    const localUrl = `http://localhost:${port}`

    return NextResponse.json({
      success: true,
      ip: primaryIp,
      port,
      networkUrl,
      localUrl,
      interfaces: addresses,
    })
  } catch (error) {
    console.error("Failed to detect network info:", error)
    return NextResponse.json(
      {
        success: false,
        ip: "127.0.0.1",
        port: "3000",
        networkUrl: "http://localhost:3000",
        localUrl: "http://localhost:3000",
        interfaces: [],
      },
      { status: 500 }
    )
  }
}
