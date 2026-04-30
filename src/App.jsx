import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getAllMonths, getMonth, deleteMonth, monthLabel } from "@/lib/store"
import MonthSummary from "@/components/MonthSummary"
import Dashboard from "@/components/Dashboard"
import EntryDialog from "@/components/EntryDialog"
import { Plus, Trash2, BarChart3, Receipt, ChevronLeft, ChevronRight } from "lucide-react"

export default function App() {
  const [months, setMonths] = useState([])
  const [selectedKey, setSelectedKey] = useState(null)
  const [showEntry, setShowEntry] = useState(false)
  const [tab, setTab] = useState("summary")

  useEffect(() => { refresh() }, [])

  function refresh() {
    const all = getAllMonths()
    setMonths(all)
    if (all.length > 0 && !selectedKey) setSelectedKey(all[0].monthKey)
  }

  function handleSaved(monthKey) {
    refresh()
    setSelectedKey(monthKey)
    setTab("summary")
  }

  function handleDelete() {
    if (!selectedKey) return
    if (!confirm(`Delete ${monthLabel(selectedKey)}? This cannot be undone.`)) return
    deleteMonth(selectedKey)
    const remaining = getAllMonths()
    setMonths(remaining)
    setSelectedKey(remaining[0]?.monthKey || null)
  }

  const selectedData = selectedKey ? getMonth(selectedKey) : null
  const selectedIdx = months.findIndex(m => m.monthKey === selectedKey)

  function navigate(dir) {
    const next = selectedIdx + dir
    if (next >= 0 && next < months.length) setSelectedKey(months[next].monthKey)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Receipt className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-sm leading-none">BillSplit</h1>
              <p className="text-xs text-muted-foreground leading-none mt-0.5">Paras & Mishal</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowEntry(true)}>
            <Plus className="h-4 w-4" />
            Add Month
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5">
        {months.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
              <Receipt className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">No bills yet</h2>
              <p className="text-muted-foreground text-sm mt-1">Add your first month to get started.</p>
            </div>
            <Button onClick={() => setShowEntry(true)}>
              <Plus className="h-4 w-4" />
              Add First Month
            </Button>
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="summary" className="flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5" />
                  Summary
                </TabsTrigger>
                <TabsTrigger value="dashboard" className="flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Dashboard
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="summary">
              <div className="flex items-center justify-between mb-4">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(-1)} disabled={selectedIdx <= 0}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{selectedKey ? monthLabel(selectedKey) : "—"}</span>
                  <Badge variant="outline" className="text-xs">{selectedIdx + 1} / {months.length}</Badge>
                </div>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(1)} disabled={selectedIdx >= months.length - 1}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {months.length > 3 && (
                <div className="mb-4">
                  <select
                    value={selectedKey || ""}
                    onChange={e => setSelectedKey(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {months.map(m => (
                      <option key={m.monthKey} value={m.monthKey}>{monthLabel(m.monthKey)}</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedData && <MonthSummary data={selectedData} />}

              {selectedKey && (
                <div className="mt-6 flex justify-end">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={handleDelete}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete month
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="dashboard">
              <Dashboard months={months} />
            </TabsContent>
          </Tabs>
        )}
      </main>

      <EntryDialog open={showEntry} onClose={() => setShowEntry(false)} onSaved={handleSaved} />
    </div>
  )
}
