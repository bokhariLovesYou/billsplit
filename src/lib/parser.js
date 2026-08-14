function extractAmount(line) {
  const match = line.match(/\$?([\d,]+\.?\d*)/)
  if (match) return parseFloat(match[1].replace(/,/g, ""))
  if (/paid/i.test(line)) return 0
  return null
}

function extractLabel(line) {
  return line
    .replace(/[-–]\s*(paid|annual|0)?$/i, "")
    .replace(/\$?[\d,]+\.?\d*$/, "")
    .replace(/[-–]\s*$/, "")
    .replace(/:\s*$/, "")
    .trim()
}

function splitLines(text) {
  return text.split("\n").map(l => l.trim()).filter(Boolean).filter(l => !l.match(/^===.*===$/))
}

// ── Per-section parsers (used by the 5-textarea entry form) ─────────────────

export function parseSectionItems(text) {
  return splitLines(text)
    .map(line => ({ label: extractLabel(line), amount: extractAmount(line) ?? 0 }))
    .filter(item => item.label)
}

export function parseEvSection(text) {
  const result = { rate: null, paras: null, mishal: null }
  for (const line of splitLines(text)) {
    if (/rate/i.test(line))         result.rate   = extractAmount(line)
    else if (/paras/i.test(line))   result.paras  = extractAmount(line)
    else if (/mishal|shan/i.test(line)) result.mishal = extractAmount(line)
  }
  return result
}

export function parseCreditsSection(text) {
  const credits = { paras: [], mishal: [] }
  for (const line of splitLines(text)) {
    const amount = extractAmount(line)
    if (amount == null) continue
    const label = extractLabel(line)
    if (/paras/i.test(line)) {
      credits.paras.push({ label: label.replace(/paras/i, "").trim(), amount })
    } else if (/mishal|shan/i.test(line)) {
      credits.mishal.push({ label: label.replace(/mishal|shan/i, "").trim(), amount })
    }
  }
  return credits
}

// ── Reconstruct raw text from parsed data (for edit mode) ───────────────────

export function reconstructItems(items = []) {
  return items.map(item =>
    item.amount === 0 ? `${item.label} - paid` : `${item.label} $${item.amount}`
  ).join("\n")
}

export function reconstructEv(ev = {}) {
  const lines = []
  if (ev.rate  != null) lines.push(`Rate: $${ev.rate}/kwh`)
  if (ev.mishal != null) lines.push(`Mishal EV usage: ${ev.mishal}`)
  if (ev.paras  != null) lines.push(`Paras EV usage: ${ev.paras}`)
  return lines.join("\n")
}

export function reconstructCredits(credits = { paras: [], mishal: [] }) {
  const lines = []
  ;(credits.paras  || []).forEach(c => lines.push(`Paras ${c.label} $${c.amount}`))
  ;(credits.mishal || []).forEach(c => lines.push(`Mishal ${c.label} $${c.amount}`))
  return lines.join("\n")
}

// ── Main calculation ─────────────────────────────────────────────────────────

export function calculateSplit(data) {
  const housingTotal   = data.housing.reduce((s, i) => s + i.amount, 0)
  const utilitiesTotal = data.utilities.reduce((s, i) => s + i.amount, 0)
  const miscTotal      = data.misc.reduce((s, i) => s + i.amount, 0)
  const grandTotal     = housingTotal + utilitiesTotal + miscTotal

  const rate     = data.ev?.rate   || 0
  const parasEV  = data.ev?.paras  ? data.ev.paras  * rate : 0
  const mishalEV = data.ev?.mishal ? data.ev.mishal * rate : 0
  const evTotal  = parasEV + mishalEV

  // Split everything 50/50 (Comed is included in full).
  // The higher EV user contributed more to the electricity bill, so they get a credit
  // equal to the full difference; the lower user absorbs that difference as a charge.
  const splitBase   = grandTotal / 2
  const parasEvAdj  = parasEV  - mishalEV   // negative = Paras used less → he gets credit
  const mishalEvAdj = mishalEV - parasEV   // positive = Mishal used more → she pays offset

  const parasCredits  = (data.credits?.paras  || []).reduce((s, c) => s + c.amount, 0)
  const mishalCredits = (data.credits?.mishal || []).reduce((s, c) => s + c.amount, 0)

  // Credits cross-apply so grand total is always fully consumed.
  const parasFinal  = splitBase + parasEvAdj  - parasCredits  + mishalCredits
  const mishalFinal = splitBase + mishalEvAdj - mishalCredits + parasCredits

  return {
    housingTotal,
    utilitiesTotal,
    miscTotal,
    grandTotal,
    evTotal,
    splitBase,
    parasEV,
    mishalEV,
    parasEvAdj,
    mishalEvAdj,
    parasCredits,
    mishalCredits,
    parasAbsorbed:  mishalCredits,
    mishalAbsorbed: parasCredits,
    parasFinal,
    mishalFinal,
  }
}

export function calculateNoorShare(
  data,
  excludedUtilityIndexes = [],
  personalBills = data.noorPersonalBills || [],
) {
  const { housingTotal, utilitiesTotal, evTotal, parasEV } = calculateSplit(data)
  const excluded = new Set(excludedUtilityIndexes)
  const includedUtilitiesTotal = data.utilities.reduce(
    (sum, item, index) => excluded.has(index) ? sum : sum + item.amount,
    0,
  )
  const includedComedIndex = data.utilities.findIndex(
    (item, index) => !excluded.has(index) && /\bcomed\b/i.test(item.label),
  )
  const mortgageCredit = 60
  const housingShare = housingTotal / 4
  const housingAfterCredit = housingShare - mortgageCredit
  const evDeduction = includedComedIndex >= 0 ? evTotal : 0
  const sharedUtilities = includedUtilitiesTotal - evDeduction
  const utilitiesShare = sharedUtilities / 6

  const utilityItems = data.utilities.map((item, index) => {
    const isExcluded = excluded.has(index)
    const evDeductionForItem = index === includedComedIndex ? evDeduction : 0
    const sharedAmount = isExcluded ? 0 : item.amount - evDeductionForItem

    return {
      ...item,
      index,
      isExcluded,
      evDeduction: evDeductionForItem,
      sharedAmount,
      noorShare: sharedAmount / 6,
    }
  })

  const personalBillItems = personalBills.map(item => {
    const amount = item.source === "parasEV" ? parasEV : Number(item.amount) || 0
    const percentage = Number(item.percentage) || 0
    return {
      ...item,
      amount,
      percentage,
      noorShare: amount * (percentage / 100),
    }
  })
  const personalBillsTotal = personalBillItems.reduce((sum, item) => sum + item.noorShare, 0)

  return {
    housingTotal,
    housingShare,
    mortgageCredit,
    housingAfterCredit,
    utilitiesTotal,
    includedUtilitiesTotal,
    evDeduction,
    sharedUtilities,
    utilitiesShare,
    utilityItems,
    personalBillItems,
    personalBillsTotal,
    total: housingAfterCredit + utilitiesShare + personalBillsTotal,
  }
}

export function fmt(n) {
  if (n === null || n === undefined) return "—"
  return `$${n.toFixed(2)}`
}
