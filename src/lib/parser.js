/**
 * Parse a pasted bill message into structured data.
 * 
 * Template format:
 * 
 * [Month Year]                          <- optional header line
 * 
 * === HOUSING ===
 * Mortgage 2336.28
 * HOA 392.63
 * 
 * === UTILITIES ===
 * Comcast 120
 * Comed 293.43
 * Nicor 105.39
 * Nestle 154.56
 * Water and Sewer 119.11
 * Flood Brothers - paid
 * Maid - 0
 * 
 * === MISC ===
 * Mom dental insurance 77
 * Walmart membership - paid annual
 * 
 * === EV ===
 * Rate 0.1487
 * Paras 207
 * Mishal 432
 * 
 * === CREDITS ===
 * Paras EV credit 30.78
 * Mishal EV credit 64.24
 * Mishal washer/dryer 10
 * 
 * Lines with "paid" and no number, or with "- 0" are treated as $0.
 * Numbers can be preceded by $ sign.
 */

function parseAmount(str) {
  if (!str) return null
  const cleaned = str.replace(/[$,]/g, "").trim()
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

function extractAmount(line) {
  // Look for a number (possibly with $ or ,) at the end or after last space/dash
  const match = line.match(/\$?([\d,]+\.?\d*)/)
  if (match) return parseFloat(match[1].replace(/,/g, ""))
  // "paid" or "- paid" means 0
  if (/paid/i.test(line)) return 0
  return null
}

function extractLabel(line) {
  // Remove trailing number + $ and dashes
  return line
    .replace(/[-–]\s*(paid|annual|0)?$/i, "")
    .replace(/\$?[\d,]+\.?\d*$/, "")
    .replace(/[-–]\s*$/, "")
    .trim()
}

export function parseBillText(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean)

  const result = {
    rawText: text,
    housing: [],
    utilities: [],
    misc: [],
    ev: { rate: null, paras: null, mishal: null },
    credits: { paras: [], mishal: [] },
  }

  let section = null

  for (const line of lines) {
    const upper = line.toUpperCase()

    // Section headers
    if (upper.includes("HOUSING") || upper.includes("MORTGAGE") && upper.includes("HOA")) {
      section = "housing"; continue
    }
    if (upper.includes("=== HOUSING") || upper.match(/^HOUSING\s*$/)) {
      section = "housing"; continue
    }
    if (upper.includes("=== UTILITIES") || upper.match(/^UTILITIES\s*$/)) {
      section = "utilities"; continue
    }
    if (upper.includes("=== MISC") || upper.match(/^MISC\s*$/)) {
      section = "misc"; continue
    }
    if (upper.includes("=== EV") || upper.match(/^EV\s*(CALCULATION)?\s*$/i)) {
      section = "ev"; continue
    }
    if (upper.includes("=== CREDITS") || upper.match(/^CREDITS\s*$/)) {
      section = "credits"; continue
    }

    // Auto-detect section from known keywords if no explicit header used
    if (section === null) {
      if (/mortgage|hoa/i.test(line)) section = "housing"
      else if (/comcast|comed|nicor|nestle|water|sewer|flood|maid/i.test(line)) section = "utilities"
    }

    if (!section) continue

    const amount = extractAmount(line)
    const label = extractLabel(line)

    if (section === "housing") {
      if (amount !== null && label) {
        result.housing.push({ label, amount })
      }
    } else if (section === "utilities") {
      if (label) {
        result.utilities.push({ label, amount: amount ?? 0 })
      }
    } else if (section === "misc") {
      if (label) {
        result.misc.push({ label, amount: amount ?? 0 })
      }
    } else if (section === "ev") {
      if (/rate/i.test(line)) {
        result.ev.rate = amount
      } else if (/paras/i.test(line)) {
        result.ev.paras = amount
      } else if (/mishal|shan/i.test(line)) {
        result.ev.mishal = amount
      }
    } else if (section === "credits") {
      if (/paras/i.test(line) && amount !== null) {
        result.credits.paras.push({ label: label.replace(/paras/i, "").trim(), amount })
      } else if (/mishal|shan/i.test(line) && amount !== null) {
        result.credits.mishal.push({ label: label.replace(/mishal|shan/i, "").trim(), amount })
      }
    }
  }

  return result
}

export function calculateSplit(data) {
  const housingTotal = data.housing.reduce((s, i) => s + i.amount, 0)
  const utilitiesTotal = data.utilities.reduce((s, i) => s + i.amount, 0)
  const miscTotal = data.misc.reduce((s, i) => s + i.amount, 0)

  // EV costs
  const rate = data.ev.rate || 0
  const parasEV = data.ev.paras ? data.ev.paras * rate : 0
  const mishalEV = data.ev.mishal ? data.ev.mishal * rate : 0

  const grandTotal = housingTotal + utilitiesTotal + miscTotal
  const splitBase = grandTotal / 2

  // Credits
  const parasCredits = data.credits.paras.reduce((s, c) => s + c.amount, 0)
  const mishalCredits = data.credits.mishal.reduce((s, c) => s + c.amount, 0)

  const parasFinal = splitBase + parasEV - parasCredits
  const mishalFinal = splitBase + mishalEV - mishalCredits

  return {
    housingTotal,
    utilitiesTotal,
    miscTotal,
    grandTotal,
    splitBase,
    parasEV,
    mishalEV,
    parasCredits,
    mishalCredits,
    parasFinal,
    mishalFinal,
  }
}

export function fmt(n) {
  if (n === null || n === undefined) return "—"
  return `$${n.toFixed(2)}`
}
