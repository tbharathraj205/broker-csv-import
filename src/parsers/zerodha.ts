import { Trade, TradeSchema, ParseResult } from '../types';
import { parseZerodhaDate } from '../utils';

export interface ZerodhaRow {
  [key: string]: string;
}

export function parseZerodhaCSV(rows: ZerodhaRow[]): ParseResult {
  const trades: Trade[] = [];
  const errors: Array<{ row: number; reason: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2;

    try {
      const symbol = row.symbol ? row.symbol.trim() : '';
      if (!symbol) {
        errors.push({ row: rowNumber, reason: 'Missing symbol' });
        continue;
      }

      const tradeTypeRaw = row.trade_type ? row.trade_type.trim().toUpperCase() : '';
      if (tradeTypeRaw !== 'BUY' && tradeTypeRaw !== 'SELL') {
        errors.push({ row: rowNumber, reason: `Invalid trade_type: '${row.trade_type}'` });
        continue;
      }

      const quantityNum = Number(row.quantity);
      if (isNaN(quantityNum) || quantityNum <= 0) {
        errors.push({ row: rowNumber, reason: `Quantity must be positive, got ${quantityNum}` });
        continue;
      }

      const priceNum = Number(row.price);
      if (isNaN(priceNum) || priceNum <= 0) {
        errors.push({ row: rowNumber, reason: `Price must be positive, got ${priceNum}` });
        continue;
      }

      const dateStr = row.trade_date ? row.trade_date.trim() : '';
      const parsedDate = parseZerodhaDate(dateStr);
      if (!parsedDate) {
        errors.push({ row: rowNumber, reason: `Invalid date: '${dateStr}'` });
        continue;
      }

      const exchange = row.exchange ? row.exchange.trim() : '';
      if (!exchange) {
        errors.push({ row: rowNumber, reason: 'Missing exchange' });
        continue;
      }

      let currency = 'USD';
      if (exchange === 'NSE' || exchange === 'BSE') {
        currency = 'INR';
      }

      let totalAmount = quantityNum * priceNum;
      if (tradeTypeRaw === 'SELL') {
        totalAmount = -totalAmount;
      }

      const trade: Trade = {
        symbol: symbol,
        side: tradeTypeRaw as 'BUY' | 'SELL',
        quantity: quantityNum,
        price: priceNum,
        totalAmount: totalAmount,
        currency: currency,
        executedAt: parsedDate.toISOString(),
        broker: 'zerodha',
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
