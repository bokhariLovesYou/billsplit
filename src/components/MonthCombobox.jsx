import { useRef } from "react"
import { Combobox } from "@base-ui/react/combobox"
import { Check, ChevronsUpDown } from "lucide-react"

export default function MonthCombobox({ items, value, onChange, label = "Month" }) {
  const anchor = useRef(null)
  return (
    <Combobox.Root items={items} value={items.find(item => item.value === value) ?? null}
      isItemEqualToValue={(a, b) => a.value === b.value}
      onValueChange={item => { if (item) onChange(item.value) }}>
      <div ref={anchor} className="flex h-10 items-center rounded-md border border-input bg-card px-3 shadow-sm focus-within:ring-2 focus-within:ring-ring">
        <Combobox.Input aria-label={label} placeholder="Search months…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        <Combobox.Trigger type="button" aria-label="Show months" className="grid size-8 place-items-center text-muted-foreground">
          <ChevronsUpDown className="size-4" />
        </Combobox.Trigger>
      </div>
      <Combobox.Portal container={anchor}>
        <Combobox.Positioner anchor={anchor} sideOffset={4} className="z-[60] w-[var(--anchor-width)]">
          <Combobox.Popup className="rounded-md border bg-popover p-1 text-sm text-popover-foreground shadow-md">
            <Combobox.Empty className="px-3 py-2 text-muted-foreground empty:p-0">No matching months.</Combobox.Empty>
            <Combobox.List className="max-h-64 overflow-y-auto">
              {item => <Combobox.Item key={item.value} value={item} className="flex cursor-pointer items-center justify-between rounded px-3 py-2 data-[highlighted]:bg-accent">
                {item.label}<Combobox.ItemIndicator><Check className="size-4" /></Combobox.ItemIndicator>
              </Combobox.Item>}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}
