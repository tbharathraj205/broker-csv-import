import { parse } from 'csv-parse/sync';

export function parseCSVText(csvText: string): Array<{ [key: string]: string }> {
  if (!csvText || csvText.trim().length === 0) {
    return [];
  }

  try {
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: false,
    }) as Array<{ [key: string]: string }>;

    return records;
  } catch (error) {
    throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function getCSVHeaders(csvText: string): string[] {
  if (!csvText || csvText.trim().length === 0) {
    return [];
  }

  try {
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: false,
    }) as Array<{ [key: string]: string }>;

    if (records.length > 0) {
      return Object.keys(records[0]);
    }

    const lines = csvText.trim().split('\n');
    if (lines.length === 0) return [];

    const headerLine = lines[0];
    const headers = headerLine.split(',').map(h => h.trim());
    return headers;
  } catch (error) {
    throw new Error(`Failed to extract headers: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
