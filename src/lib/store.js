const STORAGE_KEY = "billsplit_months"

export function getAllMonths() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function getMonth(monthKey) {
  const all = getAllMonths()
  return all.find(m => m.monthKey === monthKey) || null
}

export function saveMonth(data) {
  const all = getAllMonths()
  const idx = all.findIndex(m => m.monthKey === data.monthKey)
  if (idx >= 0) {
    all[idx] = data
  } else {
    all.push(data)
  }
  // sort descending by monthKey
  all.sort((a, b) => b.monthKey.localeCompare(a.monthKey))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export function deleteMonth(monthKey) {
  const all = getAllMonths().filter(m => m.monthKey !== monthKey)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

// monthKey format: "2026-04"
export function formatMonthKey(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`
}

export function parseMonthKey(key) {
  const [year, month] = key.split("-")
  return { year: parseInt(year), month: parseInt(month) }
}

export function monthLabel(key) {
  const { year, month } = parseMonthKey(key)
  const d = new Date(year, month - 1, 1)
  return d.toLocaleString("default", { month: "long", year: "numeric" })
}
