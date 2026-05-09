import { parseZerodhaDate } from '../utils';

describe('Utils - Date Parsing', () => {
  describe('parseZerodhaDate', () => {
    it('should parse valid DD-MM-YYYY date', () => {
      const date = parseZerodhaDate('01-04-2026');
      expect(date).toBeDefined();
      expect(date?.getDate()).toBe(1);
      expect(date?.getMonth()).toBe(3); // 0-indexed
      expect(date?.getFullYear()).toBe(2026);
    });

    it('should handle dates with leading zeros', () => {
      const date = parseZerodhaDate('05-04-2026');
      expect(date).toBeDefined();
      expect(date?.getDate()).toBe(5);
    });

    it('should return null for invalid date string', () => {
      expect(parseZerodhaDate('invalid_date')).toBeNull();
      expect(parseZerodhaDate('2026-04-01')).toBeNull(); // Wrong format
      expect(parseZerodhaDate('32-04-2026')).toBeNull(); // Invalid day
      expect(parseZerodhaDate('01-13-2026')).toBeNull(); // Invalid month
    });

    it('should validate Feb 29 on leap years', () => {
      const leapYear = parseZerodhaDate('29-02-2024');
      expect(leapYear).toBeDefined();

      const nonLeapYear = parseZerodhaDate('29-02-2025');
      expect(nonLeapYear).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(parseZerodhaDate('')).toBeNull();
    });
  });
});
