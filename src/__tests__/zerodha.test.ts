import { parseZerodhaCSV } from '../parsers/zerodha';

describe('Zerodha Parser', () => {
  it('should parse valid Zerodha CSV rows', () => {
    const rows = [
      {
        symbol: 'RELIANCE',
        isin: 'INE002A01018',
        trade_date: '01-04-2026',
        trade_type: 'buy',
        quantity: '10',
        price: '2450.50',
        trade_id: 'TRD001',
        order_id: 'ORD001',
        exchange: 'NSE',
        segment: 'EQ',
      },
    ];

    const result = parseZerodhaCSV(rows);
    expect(result.trades).toHaveLength(1);
    expect(result.errors).toHaveLength(0);

    const trade = result.trades[0];
    expect(trade.symbol).toBe('RELIANCE');
    expect(trade.side).toBe('BUY');
    expect(trade.quantity).toBe(10);
    expect(trade.price).toBe(2450.50);
    expect(trade.totalAmount).toBe(24505);
    expect(trade.currency).toBe('INR');
    expect(trade.broker).toBe('zerodha');
  });

  it('should handle uppercase trade_type', () => {
    const rows = [
      {
        symbol: 'SBIN',
        isin: 'INE062A01020',
        trade_date: '03-04-2026',
        trade_type: 'SELL',
        quantity: '30',
        price: '820.45',
        trade_id: 'TRD005',
        order_id: 'ORD005',
        exchange: 'NSE',
        segment: 'EQ',
      },
    ];

    const result = parseZerodhaCSV(rows);
    expect(result.trades).toHaveLength(1);
    expect(result.trades[0].side).toBe('SELL');
    expect(result.trades[0].totalAmount).toBe(-24613.5);
  });

  it('should reject invalid dates', () => {
    const rows = [
      {
        symbol: 'RELIANCE',
        isin: 'INE002A01018',
        trade_date: 'invalid_date',
        trade_type: 'buy',
        quantity: '10',
        price: '2480.00',
        trade_id: 'TRD006',
        order_id: 'ORD006',
        exchange: 'NSE',
        segment: 'EQ',
      },
    ];

    const result = parseZerodhaCSV(rows);
    expect(result.trades).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].reason).toContain('Invalid date');
  });

  it('should reject negative quantities', () => {
    const rows = [
      {
        symbol: 'WIPRO',
        isin: 'INE075A01022',
        trade_date: '05-04-2026',
        trade_type: 'buy',
        quantity: '-5',
        price: '450.00',
        trade_id: 'TRD007',
        order_id: 'ORD007',
        exchange: 'NSE',
        segment: 'EQ',
      },
    ];

    const result = parseZerodhaCSV(rows);
    expect(result.trades).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].reason).toContain('Quantity must be positive');
  });

  it('should handle empty isin field (optional)', () => {
    const rows = [
      {
        symbol: 'HDFCBANK',
        isin: '',
        trade_date: '03-04-2026',
        trade_type: 'buy',
        quantity: '15',
        price: '1680.30',
        trade_id: 'TRD004',
        order_id: 'ORD004',
        exchange: 'NSE',
        segment: 'EQ',
      },
    ];

    const result = parseZerodhaCSV(rows);
    expect(result.trades).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });

  it('should infer currency as INR from NSE/BSE exchange', () => {
    const zerodhaRow = {
      symbol: 'RELIANCE',
      isin: 'INE002A01018',
      trade_date: '01-04-2026',
      trade_type: 'buy',
      quantity: '10',
      price: '2450.50',
      trade_id: 'TRD001',
      order_id: 'ORD001',
      exchange: 'BSE',
      segment: 'EQ',
    };

    const result = parseZerodhaCSV([zerodhaRow]);
    expect(result.trades[0].currency).toBe('INR');
  });

  it('should process multiple rows and separate valid from invalid', () => {
    const rows = [
      {
        symbol: 'RELIANCE',
        isin: 'INE002A01018',
        trade_date: '01-04-2026',
        trade_type: 'buy',
        quantity: '10',
        price: '2450.50',
        trade_id: 'TRD001',
        order_id: 'ORD001',
        exchange: 'NSE',
        segment: 'EQ',
      },
      {
        symbol: 'INFY',
        isin: 'INE009A01021',
        trade_date: 'bad_date',
        trade_type: 'sell',
        quantity: '25',
        price: '1520.75',
        trade_id: 'TRD002',
        order_id: 'ORD002',
        exchange: 'NSE',
        segment: 'EQ',
      },
      {
        symbol: 'TATAMOTORS',
        isin: 'INE155A01022',
        trade_date: '02-04-2026',
        trade_type: 'buy',
        quantity: '50',
        price: '650.00',
        trade_id: 'TRD003',
        order_id: 'ORD003',
        exchange: 'BSE',
        segment: 'EQ',
      },
    ];

    const result = parseZerodhaCSV(rows);
    expect(result.trades).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
  });
});
