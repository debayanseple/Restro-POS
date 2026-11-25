import { NextResponse } from "next/server"
import os from "os"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const hostHeader = request.headers.get("x-forwarded-host") || request.headers.get("host") || ""
    const protoHeader = request.headers.get("x-forwarded-proto") || (process.env.VERCEL ? "https" : "http")
    const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_URL)

    // Check if the current request is coming via localhost or LAN
    const isLocalhost =
      !hostHeader ||
      hostHeader.includes("localhost") ||
      hostHeader.includes("127.0.0.1") ||
      hostHeader.includes("0.0.0.0")

    const isLanIp =
      hostHeader.startsWith("192.168.") ||
      hostHeader.startsWith("10.") ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostHeader)

    // If running on Vercel or accessed via a public custom domain, use the public domain for QR & URLs
    if (isVercel || (!isLocalhost && !isLanIp)) {
      const publicDomain =
        hostHeader ||
        process.env.VERCEL_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "localhost:3000"
      const cleanDomain = publicDomain.replace(/^https?:\/\//, "").replace(/\/$/, "")
      const fullUrl = `${protoHeader}://${cleanDomain}`

      return NextResponse.json({
        success: true,
        isVercel: true,
        ip: cleanDomain,
        port: protoHeader === "https" ? "443" : "80",
        networkUrl: fullUrl,
        localUrl: fullUrl,
        interfaces: [],
      })
    }

    // Local LAN detection
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
      isVercel: false,
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
        isVercel: false,
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
