import { Trade, TradeSchema, ParseResult } from '../types';
import { parseIBKRDate } from '../utils';

export interface IBKRRow {
  [key: string]: string;
}

// Helper to get field value case-insensitively
function getField(row: IBKRRow, fieldName: string): string {
  const lowerFieldName = fieldName.toLowerCase();
  for (const key in row) {
    if (key.toLowerCase() === lowerFieldName) {
      return row[key];
    }
  }
  return '';
}

// Parse Interactive Brokers CSV file
export function parseIBKRCSV(rows: IBKRRow[]): ParseResult {
  const trades: Trade[] = [];
  const errors: Array<{ row: number; reason: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2;

    try {
      let symbol = getField(row, 'symbol').trim();
      if (!symbol) {
        errors.push({ row: rowNumber, reason: 'Missing symbol' });
        continue;
      }

      symbol = symbol.replace('.', '/');

      const buySellRaw = getField(row, 'buy/sell').trim().toUpperCase();
      if (buySellRaw !== 'BOT' && buySellRaw !== 'SLD') {
        errors.push({ row: rowNumber, reason: `Invalid buy/sell: '${getField(row, 'buy/sell')}'` });
        continue;
      }

      const quantityNum = Number(getField(row, 'quantity'));
      if (isNaN(quantityNum) || quantityNum <= 0) {
        errors.push({ row: rowNumber, reason: `Quantity must be positive, got ${quantityNum}` });
        continue;
      }

      const priceNum = Number(getField(row, 'tradeprice'));
      if (isNaN(priceNum) || priceNum <= 0) {
        errors.push({ row: rowNumber, reason: `Price must be positive, got ${priceNum}` });
        continue;
      }

      const dateStr = getField(row, 'datetime').trim();
      const parsedDate = parseIBKRDate(dateStr);
      if (!parsedDate) {
        errors.push({ row: rowNumber, reason: `Invalid datetime: '${dateStr}'` });
        continue;
      }

      const currency = getField(row, 'currency').trim().toUpperCase();
      if (!currency || currency.length !== 3) {
        errors.push({ row: rowNumber, reason: 'Invalid currency' });
        continue;
      }

      const side = buySellRaw === 'BOT' ? 'BUY' : 'SELL';

      let totalAmount = quantityNum * priceNum;
      if (side === 'SELL') {
        totalAmount = -totalAmount;
      }

      const trade: Trade = {
        symbol: symbol,
        side: side,
        quantity: quantityNum,
        price: priceNum,
        totalAmount: totalAmount,
        currency: currency,
        executedAt: parsedDate.toISOString(),
        broker: 'ibkr',
        rawData: row,
      };

      const validated = TradeSchema.parse(trade);
      trades.push(validated);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      errors.push({ row: rowNumber, reason: msg });
    }
  }

  return { trades, errors };
}
