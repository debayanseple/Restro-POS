// Realistic restaurant service desk bell chime (Web Audio API) + Female Indian Voice Alerts (Web Speech API)

let sharedAudioCtx: AudioContext | null = null
let speechDelayTimer: ReturnType<typeof setTimeout> | null = null
let kitchenSpeechDelayTimer: ReturnType<typeof setTimeout> | null = null
let cachedVoices: SpeechSynthesisVoice[] = []

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  if (!sharedAudioCtx) {
    sharedAudioCtx = new Ctx()
  }
  return sharedAudioCtx
}

function refreshVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return []
  try {
    const list = window.speechSynthesis.getVoices()
    if (list && list.length > 0) {
      cachedVoices = list
    }
  } catch {}
  return cachedVoices
}

// Subscribe once to browser voiceschanged event (needed in Chrome/Edge where voices load async)
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  try {
    refreshVoices()
    window.speechSynthesis.addEventListener?.("voiceschanged", refreshVoices)
  } catch {}
}

/**
 * Selects the best available Female Indian English voice across macOS (Veena),
 * Windows/Edge (Neerja, Heera), Chrome/Android (Aditi, Raveena, Google en-IN),
 * falling back to non-male en-IN or female English voices.
 */
function pickFemaleIndianVoice(voices: SpeechSynthesisVoice[]): {
  voice: SpeechSynthesisVoice | null
  isNativeIndianFemale: boolean
} {
  if (!voices || voices.length === 0) {
    return { voice: null, isNativeIndianFemale: false }
  }

  const femaleIndianHints = [
    "veena",
    "neerja",
    "heera",
    "aditi",
    "raveena",
    "swara",
    "kajal",
    "lekha",
    "ananya",
    "priya",
    "india female",
    "en-in-x-enc",
    "en-in-x-ene",
    "female",
    "woman",
  ]
  const maleHints = ["rishi", "prabhat", "ravi", "hemant", "madhur", "male", "man", "daniel", "alex"]
  const generalFemaleHints = [
    "samantha",
    "karen",
    "moira",
    "tessa",
    "victoria",
    "serena",
    "zira",
    "susan",
    "jenny",
    "aria",
    "sonia",
    "libby",
    "uk english female",
    "female",
  ]

  const isEnIN = (v: SpeechSynthesisVoice) => {
    const lang = (v.lang || "").toLowerCase().replace("_", "-")
    const name = (v.name || "").toLowerCase()
    return lang === "en-in" || lang.startsWith("en-in-") || name.includes("india")
  }

  const hasAny = (str: string, list: string[]) => list.some((k) => str.includes(k))

  // 1. Explicit Female Indian English voice (e.g. Veena on macOS, Neerja/Heera on Windows/Edge, Aditi/Raveena)
  const exactFemaleIndian = voices.find((v) => {
    const name = v.name.toLowerCase()
    return isEnIN(v) && hasAny(name, femaleIndianHints) && !hasAny(name, maleHints)
  })
  if (exactFemaleIndian) {
    return { voice: exactFemaleIndian, isNativeIndianFemale: true }
  }

  // 2. Known female Indian voice name regardless of lang tag formatting
  const byFemaleIndianName = voices.find((v) => {
    const name = v.name.toLowerCase()
    return ["veena", "neerja", "heera", "aditi", "raveena", "lekha", "swara", "kajal"].some((k) =>
      name.includes(k)
    )
  })
  if (byFemaleIndianName) {
    return { voice: byFemaleIndianName, isNativeIndianFemale: true }
  }

  // 3. Any en-IN voice that isn't explicitly male
  const neutralIndian = voices.find((v) => isEnIN(v) && !hasAny(v.name.toLowerCase(), maleHints))
  if (neutralIndian) {
    return { voice: neutralIndian, isNativeIndianFemale: true }
  }

  // 4. Fallback: Female English voice (warm pitch)
  const femaleEnglish = voices.find((v) => {
    const lang = (v.lang || "").toLowerCase()
    const name = v.name.toLowerCase()
    return lang.startsWith("en") && hasAny(name, generalFemaleHints) && !hasAny(name, maleHints)
  })
  if (femaleEnglish) {
    return { voice: femaleEnglish, isNativeIndianFemale: false }
  }

  // 5. Any remaining non-male English voice or first en-IN voice
  const anyEnIn = voices.find((v) => isEnIN(v))
  if (anyEnIn) return { voice: anyEnIn, isNativeIndianFemale: false }

  const anyEn = voices.find((v) => (v.lang || "").toLowerCase().startsWith("en"))
  return { voice: anyEn || voices[0], isNativeIndianFemale: false }
}

/**
 * Normalizes "Table 01" -> "Table 1" so text-to-speech pronounces numbers naturally.
 */
function normalizeTableForSpeech(table: string): string {
  const cleaned = (table || "A table").trim()
  return cleaned.replace(/\b0+(\d+)\b/g, "$1")
}

export function formatServiceSpeechText(
  table: string,
  type: "waiter" | "clean" | "bill"
): string {
  const spokenTable = normalizeTableForSpeech(table)
  if (type === "bill") {
    return `${spokenTable} asked for the bill.`
  }
  if (type === "clean") {
    return `${spokenTable} requested table cleaning.`
  }
  return `${spokenTable} is calling for a waiter.`
}

/**
 * Unlocks Web Audio context on any user gesture so background bell rings play reliably.
 */
export function unlockBellAudio(): void {
  const ctx = getAudioContext()
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {})
  }
  refreshVoices()
}

/**
 * Stops any ongoing voice announcement and clears pending delayed speech.
 */
export function stopServiceVoice(): void {
  if (speechDelayTimer) {
    clearTimeout(speechDelayTimer)
    speechDelayTimer = null
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel()
    } catch {}
  }
}

/**
 * Speaks an announcement through browser Text-to-Speech using a Female Indian English voice.
 */
export function speakText(text: string): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return
  try {
    const synth = window.speechSynthesis
    synth.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    const voices = refreshVoices()
    const { voice, isNativeIndianFemale } = pickFemaleIndianVoice(voices)

    if (voice) {
      utterance.voice = voice
      utterance.lang = voice.lang || "en-IN"
    } else {
      utterance.lang = "en-IN"
    }

    utterance.rate = 0.96
    utterance.pitch = isNativeIndianFemale ? 1.04 : 1.1
    utterance.volume = 1.0
    synth.speak(utterance)
  } catch {
    // Ignore speech synthesis errors on unsupported browsers
  }
}

export function speakServiceAlert(
  table: string,
  type: "waiter" | "clean" | "bill"
): void {
  speakText(formatServiceSpeechText(table, type))
}

/**
 * Synthesizes a bright metallic service desk bell ring ("Ding! Ding!").
 */
export function playServiceBellRing(rings: number = 2): void {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {})
    }

    const now = ctx.currentTime
    const strikeOffsets = rings === 1 ? [0] : rings === 3 ? [0, 0.28, 0.56] : [0, 0.3]

    const harmonics: Array<{ freq: number; gain: number; decay: number }> = [
      { freq: 1174.66, gain: 0.32, decay: 1.3 }, // D6 fundamental
      { freq: 2349.32, gain: 0.18, decay: 0.9 }, // D7 octave
      { freq: 3520.0, gain: 0.1, decay: 0.65 }, // A7 3rd harmonic
      { freq: 4698.64, gain: 0.06, decay: 0.45 }, // D8 shimmer
    ]

    for (const offset of strikeOffsets) {
      const startTime = now + offset
      for (const h of harmonics) {
        const osc = ctx.createOscillator()
        const gainNode = ctx.createGain()

        osc.type = "sine"
        osc.frequency.setValueAtTime(h.freq, startTime)

        gainNode.gain.setValueAtTime(0.0001, startTime)
        gainNode.gain.exponentialRampToValueAtTime(h.gain, startTime + 0.012)
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + h.decay)

        osc.connect(gainNode)
        gainNode.connect(ctx.destination)

        osc.start(startTime)
        osc.stop(startTime + h.decay + 0.05)
      }
    }
  } catch {
    // Ignore audio context errors on restricted browsers
  }
}

/**
 * Rings the service bell chime and speaks the alert phrase right after the bell strike.
 */
export function playBellAndSpeak(
  table: string,
  type: "waiter" | "clean" | "bill",
  rings: number = 2
): void {
  playServiceBellRing(rings)
  if (speechDelayTimer) clearTimeout(speechDelayTimer)
  const delayMs = rings === 3 ? 750 : 550
  speechDelayTimer = setTimeout(() => {
    speakServiceAlert(table, type)
  }, delayMs)
}

/**
 * Synthesizes a crisp two-tone Kitchen Display (KDS) new order ticket chime.
 */
export function playKitchenOrderChime(): void {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {})
    }

    const now = ctx.currentTime
    // Crisp ascending kitchen ticket chime: E6 -> A6, repeated once cleanly
    const notes: Array<{ offset: number; freq: number; gain: number; decay: number }> = [
      { offset: 0, freq: 1318.51, gain: 0.26, decay: 0.45 }, // E6
      { offset: 0.14, freq: 1760.0, gain: 0.3, decay: 0.7 }, // A6
      { offset: 0.48, freq: 1318.51, gain: 0.22, decay: 0.45 }, // E6
      { offset: 0.62, freq: 1760.0, gain: 0.28, decay: 0.85 }, // A6
    ]

    for (const n of notes) {
      const startTime = now + n.offset
      const osc = ctx.createOscillator()
      const overtone = ctx.createOscillator()
      const gainNode = ctx.createGain()

      osc.type = "triangle"
      osc.frequency.setValueAtTime(n.freq, startTime)

      overtone.type = "sine"
      overtone.frequency.setValueAtTime(n.freq * 2, startTime)

      gainNode.gain.setValueAtTime(0.0001, startTime)
      gainNode.gain.exponentialRampToValueAtTime(n.gain, startTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + n.decay)

      osc.connect(gainNode)
      overtone.connect(gainNode)
      gainNode.connect(ctx.destination)

      osc.start(startTime)
      overtone.start(startTime)
      osc.stop(startTime + n.decay + 0.04)
      overtone.stop(startTime + n.decay + 0.04)
    }
  } catch {
    // Ignore audio context errors on restricted browsers
  }
}

export interface KitchenOrderVoiceItem {
  name: string
  quantity?: number
  instructions?: string | null
}

export interface KitchenOrderVoiceTicket {
  table: string
  station?: "kitchen" | "bar"
  items: KitchenOrderVoiceItem[]
}

function formatKitchenItemsForSpeech(items: KitchenOrderVoiceItem[]): string {
  if (!items || items.length === 0) return "new items"
  const maxSpoken = 6
  const spokenParts = items.slice(0, maxSpoken).map((item) => {
    const qty = item.quantity && item.quantity > 0 ? item.quantity : 1
    const cleanName = (item.name || "item").replace(/\(([^)]+)\)/g, "$1").trim()
    const note = item.instructions?.trim()
    return note ? `${qty} ${cleanName}, ${note}` : `${qty} ${cleanName}`
  })

  if (items.length > maxSpoken) {
    const restCount = items.length - maxSpoken
    return `${spokenParts.join(", ")}, and ${restCount} more ${restCount === 1 ? "item" : "items"}`
  }

  if (spokenParts.length === 1) return spokenParts[0]
  if (spokenParts.length === 2) return `${spokenParts[0]} and ${spokenParts[1]}`
  return `${spokenParts.slice(0, -1).join(", ")}, and ${spokenParts[spokenParts.length - 1]}`
}

/**
 * Formats new Kitchen/Bar order tickets into a concise announcement for TTS.
 */
export function formatKitchenOrderSpeechText(
  tickets: KitchenOrderVoiceTicket[]
): string {
  if (!tickets || tickets.length === 0) return "New kitchen order received."

  if (tickets.length === 1) {
    const t = tickets[0]
    const spokenTable = normalizeTableForSpeech(t.table)
    const stationLabel = t.station === "bar" ? "bar" : "kitchen"
    const itemsText = formatKitchenItemsForSpeech(t.items)
    return `New ${stationLabel} order for ${spokenTable}: ${itemsText}.`
  }

  const normalizedTables = Array.from(
    new Set(tickets.map((t) => normalizeTableForSpeech(t.table)))
  )
  if (normalizedTables.length === 1) {
    const combinedItems = tickets.flatMap((t) => t.items || [])
    return `New order for ${normalizedTables[0]}: ${formatKitchenItemsForSpeech(combinedItems)}.`
  }

  const maxTickets = 3
  const clauses = tickets.slice(0, maxTickets).map((t) => {
    const spokenTable = normalizeTableForSpeech(t.table)
    const stationLabel = t.station === "bar" ? "bar" : "kitchen"
    return `New ${stationLabel} order for ${spokenTable}: ${formatKitchenItemsForSpeech(t.items)}`
  })
  if (tickets.length > maxTickets) {
    clauses.push(`and ${tickets.length - maxTickets} more orders`)
  }
  return `${clauses.join(". ")}.`
}

/**
 * Stops any pending or active Kitchen Display voice announcement.
 */
export function stopKitchenVoice(): void {
  if (kitchenSpeechDelayTimer) {
    clearTimeout(kitchenSpeechDelayTimer)
    kitchenSpeechDelayTimer = null
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel()
    } catch {}
  }
}

/**
 * Plays the KDS order chime and speaks the ordered items in the Female Indian English voice.
 */
export function playKitchenChimeAndSpeak(
  tickets: KitchenOrderVoiceTicket[]
): void {
  playKitchenOrderChime()
  if (kitchenSpeechDelayTimer) {
    clearTimeout(kitchenSpeechDelayTimer)
  }
  const speechText = formatKitchenOrderSpeechText(tickets)
  kitchenSpeechDelayTimer = setTimeout(() => {
    speakText(speechText)
  }, 780)
}
