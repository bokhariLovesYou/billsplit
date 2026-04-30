import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { parseBillText } from "@/lib/parser"
import { saveMonth, formatMonthKey } from "@/lib/store"
import { ClipboardPaste, FileText } from "lucide-react"

const TEMPLATE = `=== HOUSING ===
Mortgage 2336.28
HOA 392.63

=== UTILITIES ===
Comcast 120
Comed 293.43
Nicor 105.39
Nestle 154.56
Water and Sewer 119.11
Flood Brothers - paid
Maid - 0

=== MISC ===
Walmart membership - paid annual
Mom dental insurance 77

=== EV ===
Rate 0.1487
Paras 207
Mishal 432

=== CREDITS ===
Mishal EV credit 64.24
Mishal washer/dryer 10
Paras EV credit 30.78`

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
]

export default function EntryDialog({ open, onClose, onSaved }) {
  const now = new Date()
  const [year, setYear] = useState(String(now.getFullYear()))
  const [month, setMonth] = useState(String(now.getMonth() + 1))
  const [text, setText] = useState("")
  const [error, setError] = useState("")
  const [showTemplate, setShowTemplate] = useState(false)

  function handleSave() {
    if (!text.trim()) {
      setError("Please paste bill data.")
      return
    }
    try {
      const parsed = parseBillText(text)
      const monthKey = formatMonthKey(parseInt(year), parseInt(month))
      saveMonth({ monthKey, ...parsed, savedAt: new Date().toISOString() })
      onSaved(monthKey)
      onClose()
      setText("")
      setError("")
    } catch (e) {
      setError("Could not parse the bill text. Check the format.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPaste className="h-5 w-5" />
            Add Month Bills
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Month + Year */}
          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label>Month</Label>
              <select
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={String(i + 1)}>{m}</option>
                ))}
              </select>
            </div>
            <div className="w-28 space-y-1.5">
              <Label>Year</Label>
              <Input
                type="number"
                value={year}
                onChange={e => setYear(e.target.value)}
                min="2020"
                max="2035"
              />
            </div>
          </div>

          {/* Template toggle */}
          <div>
            <button
              onClick={() => setShowTemplate(s => !s)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              {showTemplate ? "Hide template" : "Show template / copy format"}
            </button>
            {showTemplate && (
              <div className="mt-2 relative">
                <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto font-mono leading-relaxed whitespace-pre">
                  {TEMPLATE}
                </pre>
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute top-2 right-2 h-7 text-xs"
                  onClick={() => navigator.clipboard.writeText(TEMPLATE)}
                >
                  Copy
                </Button>
              </div>
            )}
          </div>

          {/* Paste area */}
          <div className="space-y-1.5">
            <Label>Paste bill text</Label>
            <textarea
              value={text}
              onChange={e => { setText(e.target.value); setError("") }}
              placeholder="Paste your bill message here following the template format..."
              className="flex min-h-[280px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Month</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
