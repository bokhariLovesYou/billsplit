const API_URL = "/api/months"

async function apiFetch(path = "", options = {}) {
  const res = await fetch(`${API_URL}${path}`, options)
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw Object.assign(new Error(`API error ${res.status}: ${text}`), {status: res.status})
  }
  return res.json()
}

export async function getAllMonths() {
  return apiFetch()
}

export async function saveMonth(data) {
  return apiFetch("", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
}

export async function deleteMonth(monthKey) {
  return apiFetch(`?monthKey=${encodeURIComponent(monthKey)}`, {
    method: "DELETE",
  })
}

// ── Pure helpers (no I/O) ────────────────────────────────────────────────────

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
