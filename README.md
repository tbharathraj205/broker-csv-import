# Broker CSV Trade Import Service

A service that reads CSV files from different brokers and converts them into a standard format.

## What it does

- Takes CSV files from two different brokers (Zerodha and Interactive Brokers)
- Converts them both to the same format
- Validates the data
- Returns the trades in JSON format
- Reports any errors found in the data

## Project Structure

```
src/
├── index.ts                 - Server
├── routes.ts               - API routes
├── types.ts                - Data types with validation
├── brokerDetection.ts      - Figure out which broker
├── csvParser.ts            - Parse CSV files
├── utils.ts                - Helper functions
├── importService.ts        - Main processing
├── parsers/
│   ├── zerodha.ts         - Zerodha parser
│   └── ibkr.ts            - IBKR parser
└── __tests__/              - Tests
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run tests:
```bash
npm test
```

3. Build:
```bash
npm run build
```

4. Start server:
```bash
npm run dev
```

Server runs on port 3000.

## How to use

Upload a CSV file to the `/import` endpoint.

Example:
```bash
curl -X POST http://localhost:3000/import -F "file=@trades.csv"
```

The API will return something like:
```json
{
  "broker": "zerodha",
  "summary": {
    "total": 10,
    "valid": 8,
    "skipped": 2
  },
  "trades": [
    {
      "symbol": "RELIANCE",
      "side": "BUY",
      "quantity": 10,
      "price": 2450.50,
      "totalAmount": 24505,
      "currency": "INR",
      "executedAt": "2026-04-01T00:00:00.000Z",
      "broker": "zerodha",
      "rawData": { ... }
    }
  ],
  "errors": [
    {
      "row": 5,
      "reason": "Invalid date format"
    }
  ]
}
```

## Supported Brokers

### Zerodha
CSV with these columns:
- symbol
- isin  
- trade_date (DD-MM-YYYY format)
- trade_type (buy/sell)
- quantity
- price
- trade_id
- order_id
- exchange (NSE/BSE)
- segment

Currency is set to INR based on the exchange.

### Interactive Brokers
CSV with these columns:
- TradeID
- AccountID
- Symbol
- DateTime (ISO 8601 or MM/DD/YYYY)
- Buy/Sell (BOT for buy, SLD for sell)
- Quantity
- TradePrice
- Currency
- Commission (optional)
- NetAmount (optional)
- AssetClass (optional)

## How it works

1. Read the CSV file
2. Check the headers to figure out which broker it is
3. Parse each row and validate the data
4. Return successful trades and error details
5. Store the original data in rawData field

## Error handling

When data is invalid, the API:
- Skips that row
- Records why it was skipped
- Continues processing other rows
- Returns summary with total rows, valid trades, and skipped count

Common errors:
- Invalid dates
- Negative quantities
- Missing required fields
- Invalid numbers

## Testing

Run tests:
```bash
npm test
```

Test coverage includes:
- Parsing both CSV formats correctly
- Detecting broker format from headers
- Handling bad dates
- Handling bad numbers
- Mixed valid and invalid rows

## Health check

Check if server is running:
```bash
curl http://localhost:3000/health
```

Returns:
```json
{
  "status": "ok",
  "timestamp": "2026-05-09T16:30:00.000Z"
}
```
