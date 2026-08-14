import { useState, useEffect, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { getAllMonths, saveMonth, deleteMonth, monthLabel, formatMonthKey, parseMonthKey } from "@/lib/store"
import MonthSummary from "@/components/MonthSummary"
import Dashboard from "@/components/Dashboard"
import EntryDialog from "@/components/EntryDialog"
import BillTrendModal from "@/components/BillTrendModal"
import { Plus, Trash2, BarChart3, Receipt, ChevronLeft, ChevronRight, Pencil, Loader2 } from "lucide-react"

export default function App() {
  const [months, setMonths] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedKey, setSelectedKey] = useState(null)
  const [showEntry, setShowEntry] = useState(false)
  const [editingData, setEditingData] = useState(null)
  const [tab, setTab] = useState("summary")
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selectedBill, setSelectedBill] = useState(null)

  const refresh = useCallback(async (keepSelected = false) => {
    setError("")
    try {
      const all = await getAllMonths()
      setMonths(all)
      if (all.length > 0 && !keepSelected) {
        const params = new URLSearchParams(window.location.search)
        const sharedNoorMonth = params.get("view") === "noor" ? params.get("month") : null
        const sharedMonthExists = sharedNoorMonth && all.some(m => m.monthKey === sharedNoorMonth)
        const now = new Date()
        const currentKey = formatMonthKey(now.getFullYear(), now.getMonth() + 1)
        const currentExists = all.find(m => m.monthKey === currentKey)
        setSelectedKey(prev => sharedMonthExists
          ? sharedNoorMonth
          : prev && all.find(m => m.monthKey === prev)
            ? prev
            : (currentExists ? currentKey : all[0].monthKey))
      }
    } catch (e) {
      setError("Could not load data. Check your API URL or connection.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  function handleSaved(monthKey) {
    refresh(true)
    setSelectedKey(monthKey)
    setTab("summary")
    setEditingData(null)
  }

  function handleCloseEntry() {
    setShowEntry(false)
    setEditingData(null)
  }

  async function handleConfirmDelete() {
    if (!selectedKey || deleting) return
    setDeleting(true)
    try {
      await deleteMonth(selectedKey)
      const remaining = months.filter(m => m.monthKey !== selectedKey)
      setMonths(remaining)
      setSelectedKey(remaining[0]?.monthKey || null)
      setShowDeleteModal(false)
    } catch {
      setError("Could not delete month. Try again.")
    } finally {
      setDeleting(false)
    }
  }

  function handleEditMonth() {
    if (!selectedData) return
    setEditingData(selectedData)
    setShowEntry(true)
  }

  async function handleSaveNoorDetails(details) {
    if (!selectedData) return
    await saveMonth({
      ...selectedData,
      ...details,
      savedAt: new Date().toISOString(),
    })
    await refresh(true)
  }

  const selectedData = months.find(m => m.monthKey === selectedKey) || null
  const selectedIdx = months.findIndex(m => m.monthKey === selectedKey)
  const sharedNoorParams = new URLSearchParams(window.location.search)
  const openNoorFromLink = sharedNoorParams.get("view") === "noor" && sharedNoorParams.get("month") === selectedKey

  // months sorted descending: Left = older (higher index), Right = newer (lower index)
  function navigate(dir) {
    const next = selectedIdx + dir
    if (next >= 0 && next < months.length) setSelectedKey(months[next].monthKey)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Receipt className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-sm leading-none">BillSplit</h1>
              <p className="text-xs text-muted-foreground leading-none mt-0.5">Paras & Mishal</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowEntry(true)} disabled={loading}>
            <Plus className="h-4 w-4" />
            Add Month
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Global error banner */}
        {error && (
          <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : months.length === 0 ? (
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
            <div className="flex items-center justify-between mb-5">
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
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-5">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => navigate(1)}
                  disabled={selectedIdx >= months.length - 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{selectedKey ? monthLabel(selectedKey) : "—"}</span>
                  <Badge variant="outline" className="text-xs">
                    {selectedKey ? parseMonthKey(selectedKey).month : "—"} / 12
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => navigate(-1)}
                  disabled={selectedIdx <= 0}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {months.length > 3 && (
                <div className="mb-5">
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

              {selectedData && (
                <MonthSummary
                  key={selectedData.monthKey}
                  data={selectedData}
                  prevData={months[selectedIdx + 1] || null}
                  onSelectBill={(section, label) => setSelectedBill({ section, label })}
                  onSaveNoorDetails={handleSaveNoorDetails}
                  openNoorFromLink={openNoorFromLink}
                />
              )}

              {selectedKey && (
                <div className="mt-6 flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={handleEditMonth}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Edit month
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setShowDeleteModal(true)}
                  >
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

      {/* Delete confirmation modal */}
      <Dialog open={showDeleteModal} onOpenChange={v => !deleting && setShowDeleteModal(v)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {selectedKey ? monthLabel(selectedKey) : "month"}?</DialogTitle>
            <DialogDescription>
              This will permanently remove all bill data for this month. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleting}>
              {deleting ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Deleting…</> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EntryDialog
        open={showEntry}
        onClose={handleCloseEntry}
        onSaved={handleSaved}
        initialData={editingData}
        existingKeys={months.map(m => m.monthKey)}
      />

      {selectedBill && (
        <BillTrendModal
          bill={selectedBill}
          months={months}
          onClose={() => setSelectedBill(null)}
        />
      )}
    </div>
  )
}
