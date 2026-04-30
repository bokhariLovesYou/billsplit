# BillSplit — Paras & Mishal

A local bill splitting tracker with monthly history, charts, and stats.

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:5173

## How to add a month

1. Click **Add Month** in the top right
2. Select the month and year
3. Paste your bill text following the template format below
4. Click **Save Month**

## Bill text template

```
=== HOUSING ===
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
Paras EV credit 30.78
```

### Template rules
- **HOUSING**: Mortgage + HOA — split 50/50
- **UTILITIES**: Line items — split 50/50
- **MISC**: Memberships, dental, anything else — split 50/50
- **EV**: Rate is $/kWh, Paras/Mishal are kWh used. Added individually per person.
- **CREDITS**: Subtracted from that person's share. Format: [Name] [description] [amount]

### Notes
- Data saved in browser localStorage — nothing sent anywhere
- ← → arrows navigate between months
- Dashboard tab shows trends once you have 2+ months
