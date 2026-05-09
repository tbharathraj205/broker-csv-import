# How It Works Internally - Detailed Explanation

This document explains **exactly what happens** when you upload a CSV file, step by step.

---

## Overview: The Journey of a CSV File

```
CSV Upload
    ↓
[Step 1] Detect Broker from Headers
    ↓
[Step 2] Parse CSV into Rows
    ↓
[Step 3] Validate Each Row
    ↓
[Step 4] Handle Errors
    ↓
[Step 5] Return Results
```

---

## STEP 1: How It Detects Which Broker

### File: `src/brokerDetection.ts`

**The Problem:** Every broker uses different column names. How do we know which one?

**The Solution:** Look at the column headers!

### Code Example:

```typescript
// Example CSV headers from Zerodha
symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment

// Example CSV headers from Interactive Brokers  
TradeID,AccountID,Symbol,DateTime,Buy/Sell,Quantity,TradePrice,Currency,Commission,NetAmount,AssetClass
```

### How Detection Works:

```typescript
export function detectBroker(headers: string[]): 'zerodha' | 'ibkr' | null {
  // Convert all headers to lowercase for comparison
  const lowerHeaders = headers.map(h => h.toLowerCase());

  // Check for Zerodha-specific headers
  if (lowerHeaders.includes('trade_date') && 
      lowerHeaders.includes('trade_type') && 
      lowerHeaders.includes('exchange')) {
    return 'zerodha';
  }

  // Check for Interactive Brokers-specific headers
  if (lowerHeaders.includes('tradeid') && 
      lowerHeaders.includes('datetime') && 
      lowerHeaders.includes('buy/sell')) {
    return 'ibkr';
  }

  // Unknown format
  return null;
}
```

**What it does:**
1. Takes column headers (like `["symbol", "trade_date", "trade_type", ...]`)
2. Converts them to lowercase (handles `Symbol` vs `symbol`)
3. Checks if Zerodha headers exist
4. Checks if Interactive Brokers headers exist
5. Returns which broker it is (or `null` if unknown)

**Why lowercase?** Real CSV files might have `Symbol` or `SYMBOL` or `symbol` - we want to match all of them.

---

## STEP 2: How It Parses the CSV

### File: `src/csvParser.ts`

**The Problem:** CSV files are just text. We need to convert them into structured data.

**The Solution:** Use the `csv-parse` library.

### What CSV Text Looks Like:

```
symbol,trade_date,trade_type,quantity,price
RELIANCE,01-04-2026,buy,10,2450.50
INFY,01-04-2026,sell,25,1520.75
```

### How Parsing Works:

```typescript
import { parse } from 'csv-parse/sync';

export function parseCSVText(csvText: string) {
  // Parse CSV into array of objects
  const records = parse(csvText, {
    columns: true,           // Use first row as column names
    skip_empty_lines: true,  // Ignore blank rows
    trim: false              // Don't trim spaces (we do it manually)
  });

  return records;
}
```

**Output after parsing:**

```javascript
[
  {
    symbol: "RELIANCE",
    trade_date: "01-04-2026",
    trade_type: "buy",
    quantity: "10",
    price: "2450.50"
  },
  {
    symbol: "INFY",
    trade_date: "01-04-2026",
    trade_type: "sell",
    quantity: "25",
    price: "1520.75"
  }
]
```

**Notice:** Everything is a STRING at this point! (`"10"`, not `10`)

---

## STEP 3: How It Validates Each Row

### File: `src/parsers/zerodha.ts` and `src/parsers/ibkr.ts`

**The Problem:** Data from CSV is text and might be garbage. We need to check:
- Are dates in the right format?
- Are quantities positive numbers?
- Are required fields present?

**The Solution:** Validate each field one by one.

### Example: Zerodha Validation

```typescript
export function parseZerodhaCSV(rows) {
  const trades = [];
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // +1 for header, +1 for 1-based indexing

    try {
      // 1️⃣ Check Symbol
      const symbol = row.symbol ? row.symbol.trim() : '';
      if (!symbol) {
        errors.push({ row: rowNumber, reason: 'Missing symbol' });
        continue; // Skip this row
      }

      // 2️⃣ Check Trade Type (buy/sell)
      const tradeTypeRaw = row.trade_type ? row.trade_type.trim().toUpperCase() : '';
      if (tradeTypeRaw !== 'BUY' && tradeTypeRaw !== 'SELL') {
        errors.push({ row: rowNumber, reason: `Invalid trade_type: '${row.trade_type}'` });
        continue;
      }

      // 3️⃣ Check Quantity (must be positive number)
      const quantityNum = Number(row.quantity);
      if (isNaN(quantityNum) || quantityNum <= 0) {
        errors.push({ row: rowNumber, reason: `Quantity must be positive, got ${quantityNum}` });
        continue;
      }

      // 4️⃣ Check Price (must be positive number)
      const priceNum = Number(row.price);
      if (isNaN(priceNum) || priceNum <= 0) {
        errors.push({ row: rowNumber, reason: `Price must be positive, got ${priceNum}` });
        continue;
      }

      // 5️⃣ Check Date Format (DD-MM-YYYY)
      const dateStr = row.trade_date ? row.trade_date.trim() : '';
      const parsedDate = parseZerodhaDate(dateStr);
      if (!parsedDate) {
        errors.push({ row: rowNumber, reason: `Invalid date: '${dateStr}'` });
        continue;
      }

      // ✅ All checks passed! Create trade object
      const totalAmount = quantityNum * priceNum;
      const trade = {
        symbol: symbol,
        side: tradeTypeRaw,
        quantity: quantityNum,
        price: priceNum,
        totalAmount: tradeTypeRaw === 'SELL' ? -totalAmount : totalAmount,
        currency: 'INR', // Zerodha is always INR
        executedAt: parsedDate.toISOString(),
        broker: 'zerodha',
        rawData: row
      };

      // Validate with Zod schema
      const validated = TradeSchema.parse(trade);
      trades.push(validated);

    } catch (error) {
      errors.push({ row: rowNumber, reason: error.message });
    }
  }

  return { trades, errors };
}
```

**What happens:**
1. Loop through each row
2. Check each field (symbol, quantity, date, price)
3. If any check fails → Add to errors, skip to next row
4. If all checks pass → Create trade object
5. Validate with Zod schema
6. Add to trades array

---

## STEP 4: How It Handles Garbage Data

### Key Principle: **Error Accumulation** (Not Fail-Fast)

**Bad approach:** Stop at first error ❌
```
Row 1: Good ✅
Row 2: Bad ❌ → CRASH! Don't process rows 3-7
User must fix, re-upload, finds next error...
```

**Good approach:** Collect ALL errors ✅
```
Row 1: Good ✅
Row 2: Bad → Record error, continue
Row 3: Good ✅
Row 4: Bad → Record error, continue
Row 5: Good ✅
Row 6: Bad → Record error, continue
Row 7: Good ✅

Return: [Good trades] + [All errors] → User fixes everything at once
```

### Example: Real Data with Garbage

**Input CSV:**
```
symbol,trade_date,trade_type,quantity,price
RELIANCE,01-04-2026,buy,10,2450.50          ← Row 2: Valid ✅
INFY,01-04-2026,sell,25,1520.75             ← Row 3: Valid ✅
TATAMOTORS,invalid_date,buy,50,650.00       ← Row 4: Invalid date ❌
HDFCBANK,03-04-2026,buy,-5,1680.30          ← Row 5: Negative quantity ❌
SBIN,03-04-2026,sell,30,820.45              ← Row 6: Valid ✅
```

**Processing:**

| Row | Data | Validation | Action |
|-----|------|-----------|--------|
| 2 | RELIANCE, 01-04-2026, buy, 10, 2450.50 | All fields OK | ✅ Add to trades |
| 3 | INFY, 01-04-2026, sell, 25, 1520.75 | All fields OK | ✅ Add to trades |
| 4 | TATAMOTORS, **invalid_date**, buy, 50, 650 | Date invalid | ❌ Add to errors |
| 5 | HDFCBANK, 03-04-2026, buy, **-5**, 1680.30 | Quantity < 0 | ❌ Add to errors |
| 6 | SBIN, 03-04-2026, sell, 30, 820.45 | All fields OK | ✅ Add to trades |

**Output:**
```json
{
  "broker": "zerodha",
  "summary": {
    "total": 5,
    "valid": 3,
    "skipped": 2
  },
  "trades": [
    { "symbol": "RELIANCE", ... },
    { "symbol": "INFY", ... },
    { "symbol": "SBIN", ... }
  ],
  "errors": [
    { "row": 4, "reason": "Invalid date: 'invalid_date'" },
    { "row": 5, "reason": "Quantity must be positive, got -5" }
  ]
}
```

### How Date Validation Works (Example)

```typescript
export function parseZerodhaDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Split by '-'
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null; // Must be DD-MM-YYYY

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  // Check day (1-31)
  if (day < 1 || day > 31) return null;
  
  // Check month (1-12)
  if (month < 1 || month > 12) return null;
  
  // Check year (reasonable range)
  if (year < 1900 || year > 2100) return null;

  // Create date object
  const date = new Date(year, month - 1, day);

  // Check if date is valid (catches invalid dates like Feb 30)
  if (date.getDate() !== day || date.getMonth() !== month - 1) {
    return null;
  }

  return date;
}
```

**What it catches:**
- `invalid_date` → Not 3 parts → ❌ null
- `32-04-2026` → Day > 31 → ❌ null
- `31-02-2026` → Feb 31 doesn't exist → ❌ null
- `01-04-2026` → Valid → ✅ Date object

---

## STEP 5: How It Returns Results

### File: `src/routes.ts`

```typescript
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file provided'
      });
    }

    // Convert file buffer to text
    const csvText = req.file.buffer.toString('utf-8');

    // Import trades (this does all the magic!)
    const result = await importTrades(csvText);

    // Return JSON response
    return res.status(200).json(result);

  } catch (error) {
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});
```

**Response Structure:**
```json
{
  "broker": "zerodha",                    ← Detected broker
  "summary": {                            ← Statistics
    "total": 7,                           ← Total rows processed
    "valid": 5,                           ← Rows that passed validation
    "skipped": 2                          ← Rows that failed
  },
  "trades": [ ... ],                      ← Array of valid Trade objects
  "errors": [                             ← Array of errors with details
    { "row": 7, "reason": "..." },
    { "row": 8, "reason": "..." }
  ]
}
```

---

## Complete Example: Step-by-Step

### Input: Upload this file

```csv
symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
RELIANCE,INE002A01018,01-04-2026,buy,10,2450.50,TRD001,ORD001,NSE,EQ
INFY,INE009A01021,02-04-2026,sell,25,1520.75,TRD002,ORD002,NSE,EQ
BADTRADE,INE123A01022,invalid_date,buy,50,650.00,TRD003,ORD003,NSE,EQ
WIPRO,INE075A01022,03-04-2026,buy,-5,450.00,TRD004,ORD004,NSE,EQ
```

### STEP 1: Detect Broker
```
Headers: [symbol, isin, trade_date, trade_type, ...]
Check: Does it have trade_date, trade_type, exchange?
Result: YES → "zerodha" ✅
```

### STEP 2: Parse CSV
```
Result:
[
  { symbol: "RELIANCE", trade_date: "01-04-2026", quantity: "10", ... },
  { symbol: "INFY", trade_date: "02-04-2026", quantity: "25", ... },
  { symbol: "BADTRADE", trade_date: "invalid_date", quantity: "50", ... },
  { symbol: "WIPRO", trade_date: "03-04-2026", quantity: "-5", ... }
]
```

### STEP 3: Validate Each Row
```
Row 1 (RELIANCE):
  - Symbol: "RELIANCE" ✅
  - Quantity: 10 ✅
  - Price: 2450.50 ✅
  - Date: "01-04-2026" ✅
  Result: VALID ✅

Row 2 (INFY):
  - Symbol: "INFY" ✅
  - Quantity: 25 ✅
  - Price: 1520.75 ✅
  - Date: "02-04-2026" ✅
  Result: VALID ✅

Row 3 (BADTRADE):
  - Symbol: "BADTRADE" ✅
  - Quantity: 50 ✅
  - Price: 650.00 ✅
  - Date: "invalid_date" ❌
  Result: ERROR - Invalid date

Row 4 (WIPRO):
  - Symbol: "WIPRO" ✅
  - Quantity: -5 ❌
  - Result: ERROR - Quantity must be positive
```

### STEP 4: Return Result
```json
{
  "broker": "zerodha",
  "summary": {
    "total": 4,
    "valid": 2,
    "skipped": 2
  },
  "trades": [
    {
      "symbol": "RELIANCE",
      "side": "BUY",
      "quantity": 10,
      "price": 2450.5,
      "totalAmount": 24505,
      "currency": "INR",
      "executedAt": "2026-04-01T00:00:00.000Z",
      "broker": "zerodha",
      "rawData": { ... }
    },
    {
      "symbol": "INFY",
      "side": "SELL",
      "quantity": 25,
      "price": 1520.75,
      "totalAmount": -38018.75,
      "currency": "INR",
      "executedAt": "2026-04-02T00:00:00.000Z",
      "broker": "zerodha",
      "rawData": { ... }
    }
  ],
  "errors": [
    {
      "row": 4,
      "reason": "Invalid date: 'invalid_date'"
    },
    {
      "row": 5,
      "reason": "Quantity must be positive, got -5"
    }
  ]
}
```

---

## Summary: The Five Steps

| Step | File | Purpose | Input | Output |
|------|------|---------|-------|--------|
| 1 | `brokerDetection.ts` | Identify broker from headers | CSV headers | "zerodha" \| "ibkr" |
| 2 | `csvParser.ts` | Convert text to objects | CSV text | Array of row objects |
| 3 | `parsers/zerodha.ts` or `parsers/ibkr.ts` | Validate and transform | Row objects | Validated Trade objects |
| 4 | Validation logic | Collect errors | Invalid rows | Error details with row numbers |
| 5 | `routes.ts` | Format response | Valid + Invalid data | JSON response |

---

## Key Design Decisions

### 1. Error Accumulation
**Why:** Financial data often has multiple issues. Better to fix all at once than re-upload multiple times.

### 2. Preserve Raw Data
**Why:** Keep original CSV row in `rawData` for audit trail and debugging.

### 3. Case-Insensitive Headers
**Why:** Real CSV files might have different capitalization (`Symbol` vs `symbol`).

### 4. Explicit Validation
**Why:** Financial data requires maximum safety. Each field validated individually.

### 5. Try-Catch Around Each Row
**Why:** One bad row shouldn't crash the entire import. Process all rows, report all errors.

---

## Testing These Steps

### Test Step 1: Broker Detection
```bash
npm test -- brokerDetection.test.ts
```

### Test Step 2: CSV Parsing
```bash
npm test -- csvParser.test.ts
```

### Test Step 3-4: Validation
```bash
npm test -- zerodha.test.ts
npm test -- ibkr.test.ts
```

### Test Step 5: Full Pipeline
```bash
npm test -- importService.test.ts
```

### Test Everything
```bash
npm test
```

---

## Visual Flow Diagram

```
┌─────────────────┐
│  CSV File       │
│  (text)         │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Step 1: Detect Broker               │
│ Look at column headers              │
│ Output: "zerodha" or "ibkr"        │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Step 2: Parse CSV                   │
│ Convert text to array of objects    │
│ Everything is still strings         │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Step 3-4: Validate Each Row         │
│ ┌─────────────────────────────────┐ │
│ │ For each row:                   │ │
│ │ - Check symbol exists           │ │
│ │ - Check quantity > 0            │ │
│ │ - Check date format             │ │
│ │ - Check price > 0               │ │
│ │ - Convert strings to numbers    │ │
│ │ - If ANY check fails → Error    │ │
│ │ - If ALL pass → Valid Trade     │ │
│ └─────────────────────────────────┘ │
│ Output: Valid trades + Errors       │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Step 5: Format Response             │
│ {                                   │
│   broker: "zerodha",                │
│   summary: { ... },                 │
│   trades: [ ... ],                  │
│   errors: [ ... ]                   │
│ }                                   │
└─────────────────────────────────────┘
```

---

## Need More Details?

- **How dates are parsed?** → See `src/utils.ts`
- **How Zerodha data is handled?** → See `src/parsers/zerodha.ts`
- **How IBKR data is handled?** → See `src/parsers/ibkr.ts`
- **How Zod validation works?** → See `src/types.ts`
- **How API endpoint works?** → See `src/routes.ts`

Happy learning! 🚀
