import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { calculateNoorShare, fmt } from "@/lib/parser"
import { monthLabel } from "@/lib/store"
import { Check, Copy, Loader2, Plus, Trash2 } from "lucide-react"

const DEFAULT_PERSONAL_BILLS = [
  { label: "Health insurance", amount: 107.83, percentage: 100 },
  { label: "Phone bill", amount: 120.66, percentage: 100 / 3 },
  { label: "Car insurance", amount: 186.32, percentage: 55 },
  { label: "EV car charging", amount: 0, percentage: 40, source: "parasEV" },
  { label: "Grocery share + Nestlé water", amount: 0, percentage: 100 / 6 },
]

const PERCENTAGE_OPTIONS = [
  { value: "100", label: "100%" },
  { value: "90", label: "90%" },
  { value: "80", label: "80%" },
  { value: "75", label: "75%" },
  { value: "70", label: "70%" },
  { value: "65", label: "65%" },
  { value: "60", label: "60%" },
  { value: "55", label: "55%" },
  { value: "50", label: "50%" },
  { value: "40", label: "40%" },
  { value: String(100 / 3), label: "1/3 (33.33%)" },
  { value: "25", label: "25%" },
  { value: "20", label: "20%" },
  { value: String(100 / 6), label: "1/6 (16.67%)" },
  { value: "10", label: "10%" },
  { value: "0", label: "0%" },
]

let nextDraftId = 0

function addDraftIds(items) {
  return items.map(item => ({ ...item, draftId: `noor-bill-${nextDraftId++}` }))
}

function initialPersonalBills(data) {
  const items = Array.isArray(data.noorPersonalBills) ? data.noorPersonalBills : DEFAULT_PERSONAL_BILLS
  return addDraftIds(items.map(item =>
    /^ev car charging$/i.test(item.label)
      ? { ...item, source: "parasEV" }
      : item,
  ))
}

export default function NoorShareModal({ data, onClose, onSave }) {
  const [excludedUtilities, setExcludedUtilities] = useState(data.noorExcludedUtilities || [])
  const [personalBills, setPersonalBills] = useState(() => initialPersonalBills(data))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const noor = calculateNoorShare(data, excludedUtilities, personalBills)

  function toggleUtility(index) {
    setExcludedUtilities(current =>
      current.includes(index)
        ? current.filter(itemIndex => itemIndex !== index)
        : [...current, index],
    )
  }

  function updatePersonalBill(draftId, field, value) {
    setPersonalBills(current => current.map(item =>
      item.draftId === draftId ? { ...item, [field]: value } : item,
    ))
  }

  function addPersonalBill() {
    setPersonalBills(current => [
      ...current,
      { label: "", amount: "", percentage: 100, draftId: `noor-bill-${nextDraftId++}` },
    ])
  }

  function removePersonalBill(draftId) {
    setPersonalBills(current => current.filter(item => item.draftId !== draftId))
  }

  async function handleSave() {
    const cleanedPersonalBills = personalBills
      .filter(item => item.label.trim() && item.amount !== "")
      .map(item => ({
        label: item.label.trim(),
        amount: item.source === "parasEV"
          ? noor.personalBillItems.find(calculated => calculated.draftId === item.draftId)?.amount || 0
          : Number(item.amount) || 0,
        percentage: Number(item.percentage) || 0,
        ...(item.source ? { source: item.source } : {}),
      }))

    setSaving(true)
    setError("")
    try {
      await onSave({
        noorPersonalBills: cleanedPersonalBills,
        noorExcludedUtilities: excludedUtilities,
      })
      onClose()
    } catch {
      setError("Could not save Noor's details. Check your connection and try again.")
    } finally {
      setSaving(false)
    }
  }

  async function handleCopyLink() {
    const url = new URL(window.location.href)
    url.searchParams.set("view", "noor")
    url.searchParams.set("month", data.monthKey)
    url.hash = ""

    try {
      await navigator.clipboard.writeText(url.toString())
      setCopied(true)
    } catch {
      setError("Could not copy the link. Your browser may not allow clipboard access.")
    }
  }

  return (
    <Dialog open onOpenChange={value => !value && !saving && onClose()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-6xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Noor&apos;s Share — {monthLabel(data.monthKey)}</DialogTitle>
          <DialogDescription>
            Housing is split four ways. Included shared utilities are split six ways after removing the EV portion of ComEd.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={handleCopyLink}>
            {copied
              ? <><Check className="h-3.5 w-3.5 mr-1.5" />URL copied</>
              : <><Copy className="h-3.5 w-3.5 mr-1.5" />Copy URL</>}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-2">
              <p className="text-sm font-semibold">Housing</p>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Housing total</span>
                <span className="font-mono">{fmt(noor.housingTotal)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span>Housing share (÷ 4)</span>
                <span className="font-mono">{fmt(noor.housingShare)}</span>
              </div>
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Mortgage credit</span>
                <span className="font-mono">-{fmt(noor.mortgageCredit)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-medium">
                <span>Housing after credit</span>
                <span className="font-mono">{fmt(noor.housingAfterCredit)}</span>
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <div>
                <p className="text-sm font-semibold">Shared Utilities</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select a utility to exclude it. Select it again to restore it.
                </p>
              </div>
              <div className="divide-y rounded-md border">
                {noor.utilityItems.map(item => (
                  <button
                    type="button"
                    key={`${item.label}-${item.index}`}
                    aria-pressed={item.isExcluded}
                    onClick={() => toggleUtility(item.index)}
                    className={`w-full px-3 py-2 text-left transition-colors hover:bg-muted/60 ${item.isExcluded ? "bg-muted/40 text-muted-foreground" : ""}`}
                  >
                    <span className={`flex items-center justify-between gap-3 text-sm ${item.isExcluded ? "line-through" : ""}`}>
                      <span>{item.label}</span>
                      <span className="font-mono shrink-0">{fmt(item.amount)}</span>
                    </span>
                    {!item.isExcluded && item.evDeduction > 0 && (
                      <span className="mt-1 flex items-center justify-between gap-3 text-xs text-emerald-600">
                        <span>Less EV portion</span>
                        <span className="font-mono shrink-0">-{fmt(item.evDeduction)}</span>
                      </span>
                    )}
                    {!item.isExcluded && (
                      <span className="mt-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span>Noor&apos;s share (÷ 6)</span>
                        <span className="font-mono shrink-0">{fmt(item.noorShare)}</span>
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Included utilities</span>
                <span className="font-mono">{fmt(noor.includedUtilitiesTotal)}</span>
              </div>
              {noor.evDeduction > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Less EV in ComEd</span>
                  <span className="font-mono">-{fmt(noor.evDeduction)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-sm font-medium">
                <span>Utilities share (÷ 6)</span>
                <span className="font-mono">{fmt(noor.utilitiesShare)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-4">
            <div>
              <p className="text-sm font-semibold">Noor&apos;s Personal Bills</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enter the full bill and choose the percentage Noor pays.
              </p>
            </div>

            {personalBills.length === 0 ? (
              <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                No personal bills added for this month.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_7rem_8.5rem_6.5rem_2.25rem] gap-2 px-1 text-xs font-medium text-muted-foreground">
                  <span>Bill</span>
                  <span>Amount</span>
                  <span>Noor pays</span>
                  <span className="text-right">Share</span>
                  <span />
                </div>
                {personalBills.map(item => {
                  const calculatedItem = noor.personalBillItems.find(calculated => calculated.draftId === item.draftId)
                  const percentageValue = String(item.percentage)
                  const isPreset = PERCENTAGE_OPTIONS.some(option => option.value === percentageValue)
                  return (
                    <div key={item.draftId} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_7rem_8.5rem_6.5rem_2.25rem] gap-2 items-center rounded-md border p-2 sm:border-0 sm:p-0">
                      <Input
                        value={item.label}
                        onChange={event => updatePersonalBill(item.draftId, "label", event.target.value)}
                        placeholder="Bill name"
                        className="h-9"
                      />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.source === "parasEV" ? calculatedItem?.amount || 0 : item.amount}
                        onChange={event => updatePersonalBill(item.draftId, "amount", event.target.value)}
                        placeholder="$0.00"
                        className="h-9 font-mono disabled:opacity-100 disabled:bg-muted"
                        disabled={item.source === "parasEV"}
                        title={item.source === "parasEV" ? "Calculated from Paras's EV usage and rate" : undefined}
                      />
                      <Select
                        value={percentageValue}
                        onValueChange={value => updatePersonalBill(item.draftId, "percentage", Number(value))}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {!isPreset && <SelectItem value={percentageValue}>{Number(percentageValue).toFixed(2)}%</SelectItem>}
                          {PERCENTAGE_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="font-mono text-sm font-medium text-right sm:text-right">
                        {fmt(calculatedItem?.noorShare || 0)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-destructive justify-self-end"
                        onClick={() => removePersonalBill(item.draftId)}
                        aria-label={`Remove ${item.label || "personal bill"}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}

            <Button type="button" variant="outline" size="sm" onClick={addPersonalBill}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add personal bill
            </Button>

            <Separator />
            <div className="flex justify-between text-sm font-semibold">
              <span>Personal bills total</span>
              <span className="font-mono">{fmt(noor.personalBillsTotal)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center rounded-lg bg-muted/50 px-4 py-3">
          <span className="font-semibold">Noor pays</span>
          <span className="font-mono text-xl font-bold">{fmt(noor.total)}</span>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving…</> : "Save Noor's Details"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
