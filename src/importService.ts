import { ImportResponse, ParseResult } from './types';
import { detectBroker } from './brokerDetection';
import { parseCSVText, getCSVHeaders } from './csvParser';
import { parseZerodhaCSV } from './parsers/zerodha';
import { parseIBKRCSV } from './parsers/ibkr';

export async function importTrades(csvText: string): Promise<ImportResponse> {
  if (!csvText || csvText.trim().length === 0) {
    return {
      broker: 'unknown',
      summary: { total: 0, valid: 0, skipped: 0 },
      trades: [],
      errors: [{ row: 0, reason: 'Empty CSV file' }],
    };
  }

  let headers;
  try {
    headers = getCSVHeaders(csvText);
  } catch (error) {
    return {
      broker: 'unknown',
      summary: { total: 0, valid: 0, skipped: 0 },
      trades: [],
      errors: [{ row: 0, reason: `Failed to extract headers: ${error instanceof Error ? error.message : 'Unknown error'}` }],
    };
  }

  const broker = detectBroker(headers);

  if (!broker) {
    return {
      broker: 'unknown',
      summary: { total: 0, valid: 0, skipped: 0 },
      trades: [],
      errors: [{ row: 0, reason: 'Unrecognized CSV format. Unable to detect broker.' }],
    };
  }

  let rows;
  try {
    rows = parseCSVText(csvText);
  } catch (error) {
    return {
      broker,
      summary: { total: 0, valid: 0, skipped: 0 },
      trades: [],
      errors: [{ row: 0, reason: `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}` }],
    };
  }

  if (rows.length === 0) {
    return {
      broker,
      summary: { total: 0, valid: 0, skipped: 0 },
      trades: [],
      errors: [{ row: 0, reason: 'No data rows found in CSV' }],
    };
  }

  let result: ParseResult;

  if (broker === 'zerodha') {
    result = parseZerodhaCSV(rows);
  } else if (broker === 'ibkr') {
    result = parseIBKRCSV(rows);
  } else {
    return {
      broker: 'unknown',
      summary: { total: 0, valid: 0, skipped: 0 },
      trades: [],
      errors: [{ row: 0, reason: 'Unknown broker type' }],
    };
  }

  return {
    broker,
    summary: {
      total: rows.length,
      valid: result.trades.length,
      skipped: result.errors.length,
    },
    trades: result.trades,
    errors: result.errors,
  };
}
