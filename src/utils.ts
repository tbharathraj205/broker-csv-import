export function parseZerodhaDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    return null;
  }

  if (day < 1 || day > 31) return null;
  if (month < 1 || month > 12) return null;
  if (year < 1900 || year > 2100) return null;

  const date = new Date(year, month - 1, day);

  if (date.getDate() !== day || date.getMonth() !== month - 1) {
    return null;
  }

  return date;
}

export function parseIBKRDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  if (dateStr.includes('T')) {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return null;
      return date;
    } catch {
      return null;
    }
  }

  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;

  const month = parseInt(parts[0], 10);
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  if (isNaN(month) || isNaN(day) || isNaN(year)) {
    return null;
  }

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (year < 1900 || year > 2100) return null;

  const date = new Date(year, month - 1, day);

  if (date.getDate() !== day || date.getMonth() !== month - 1) {
    return null;
  }

  return date;
}
