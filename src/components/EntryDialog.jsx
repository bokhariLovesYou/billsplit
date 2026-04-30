import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  parseSectionItems, parseEvSection, parseCreditsSection,
  reconstructItems, reconstructEv, reconstructCredits,
} from "@/lib/parser"
import { saveMonth, formatMonthKey, parseMonthKey, monthLabel } from "@/lib/store"
import { ClipboardPaste, Check, Copy } from "lucide-react"

// ── Per-section templates ────────────────────────────────────────────────────

const TEMPLATES = {
  housing: `Mortgage $2336.28\nHOA $392.63`,
  utilities: `Comcast 120\nComed 338.49\nNicor 85.81\nNestle 154.56\nWater and Sewer 187.86\nFlood Brothers - 98.32\nMaid - 0\nWalmart membership - paid annual`,
  misc: `Mom dental insurance 77`,
  ev: `Rate: $0.17199695122/kwh\nMishal EV usage: 550\nParas EV usage: 317`,
  credits: `Paras Washer/Dryer Credit: $10`,
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
]

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 9 }, (_, i) => String(CURRENT_YEAR - 2 + i))

// ── Section textarea component ───────────────────────────────────────────────

function SectionArea({ title, value, onChange, section, minRows = 4 }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(TEMPLATES[section])
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied
            ? <><Check className="h-3 w-3" />Copied!</>
            : <><Copy className="h-3 w-3" />Template</>}
        </button>
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={minRows}
        placeholder={TEMPLATES[section]}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
      />
    </div>
  )
}

// ── Main dialog ──────────────────────────────────────────────────────────────

export default function EntryDialog({ open, onClose, onSaved, initialData, existingKeys = [] }) {
  const now = new Date()
  const [year,  setYear]  = useState(String(now.getFullYear()))
  const [month, setMonth] = useState(String(now.getMonth() + 1))
  const [housingText,   setHousingText]   = useState("")
  const [utilitiesText, setUtilitiesText] = useState("")
  const [miscText,      setMiscText]      = useState("")
  const [evText,        setEvText]        = useState("")
  const [creditsText,   setCreditsText]   = useState("")
  const [error,   setError]   = useState("")
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    if (!open) return
    setError("")
    setSaving(false)
    if (initialData) {
      const { year: y, month: m } = parseMonthKey(initialData.monthKey)
      setYear(String(y))
      setMonth(String(m))
      setHousingText(reconstructItems(initialData.housing))
      setUtilitiesText(reconstructItems(initialData.utilities))
      setMiscText(reconstructItems(initialData.misc))
      setEvText(reconstructEv(initialData.ev))
      setCreditsText(reconstructCredits(initialData.credits))
    } else {
      const n = new Date()
      setYear(String(n.getFullYear()))
      setMonth(String(n.getMonth() + 1))
      setHousingText("")
      setUtilitiesText("")
      setMiscText("")
      setEvText("")
      setCreditsText("")
    }
  }, [open, initialData])

  async function handleSave() {
    const monthKey = formatMonthKey(parseInt(year), parseInt(month))

    // Block duplicate months (only when adding, not editing)
    if (!initialData && existingKeys.includes(monthKey)) {
      setError(`${monthLabel(monthKey)} already has data. Use "Edit month" to update it.`)
      return
    }

    const housing   = parseSectionItems(housingText)
    const utilities = parseSectionItems(utilitiesText)
    const misc      = parseSectionItems(miscText)
    const ev        = parseEvSection(evText)
    const credits   = parseCreditsSection(creditsText)

    if (housing.length === 0 && utilities.length === 0) {
      setError("Please enter at least housing or utility bills.")
      return
    }

    setSaving(true)
    setError("")
    try {
      await saveMonth({ monthKey, housing, utilities, misc, ev, credits, savedAt: new Date().toISOString() })
      onSaved(monthKey)
      onClose()
    } catch {
      setError("Could not save. Check your connection and try again.")
    } finally {
      setSaving(false)
    }
  }

  const isEditing = !!initialData

  return (
    <Dialog open={open} onOpenChange={v => !saving && !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPaste className="h-5 w-5" />
            {isEditing ? "Edit Month Bills" : "Add Month Bills"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Month + Year */}
          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label>Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger><SelectValue placeholder="Select month" /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-36 space-y-1.5">
              <Label>Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>
                  {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Two-column bill entry */}
          <div className="grid grid-cols-2 gap-4">
            {/* Left column */}
            <div className="flex flex-col gap-4">
              <SectionArea title="Housing"   section="housing"   value={housingText}   onChange={setHousingText}   minRows={4} />
              <SectionArea title="Utilities" section="utilities" value={utilitiesText} onChange={setUtilitiesText} minRows={9} />
            </div>
            {/* Right column */}
            <div className="flex flex-col gap-4">
              <SectionArea title="Misc"    section="misc"    value={miscText}    onChange={setMiscText}    minRows={3} />
              <SectionArea title="EV"      section="ev"      value={evText}      onChange={setEvText}      minRows={4} />
              <SectionArea title="Credits" section="credits" value={creditsText} onChange={setCreditsText} minRows={3} />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : isEditing ? "Update Month" : "Save Month"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
