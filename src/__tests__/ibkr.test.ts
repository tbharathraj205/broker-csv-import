import { parseIBKRCSV } from '../parsers/ibkr';

describe('IBKR Parser', () => {
  it('should parse valid IBKR CSV rows', () => {
    const rows = [
      {
        tradeid: 'U1234-001',
        accountid: 'U1234567',
        symbol: 'AAPL',
        datetime: '2026-04-01T14:30:00Z',
        'buy/sell': 'BOT',
        quantity: '100',
        tradeprice: '185.50',
        currency: 'USD',
        commission: '-1.00',
        netamount: '18549.00',
        assetclass: 'STK',
      },
    ];

    const result = parseIBKRCSV(rows);
    expect(result.trades).toHaveLength(1);
    expect(result.errors).toHaveLength(0);

    const trade = result.trades[0];
    expect(trade.symbol).toBe('AAPL');
    expect(trade.side).toBe('BUY');
    expect(trade.quantity).toBe(100);
    expect(trade.price).toBe(185.50);
    expect(trade.totalAmount).toBe(18550);
    expect(trade.currency).toBe('USD');
    expect(trade.broker).toBe('ibkr');
  });

  it('should handle BOT/SLD instead of BUY/SELL', () => {
    const rows = [
      {
        tradeid: 'U1234-002',
        accountid: 'U1234567',
        symbol: 'MSFT',
        datetime: '2026-04-01T15:45:00Z',
        'buy/sell': 'SLD',
        quantity: '50',
        tradeprice: '420.25',
        currency: 'USD',
        commission: '-1.00',
        netamount: '-21011.50',
        assetclass: 'STK',
      },
    ];

    const result = parseIBKRCSV(rows);
    expect(result.trades).toHaveLength(1);
    expect(result.trades[0].side).toBe('SELL');
    expect(result.trades[0].totalAmount).toBe(-21012.5);
  });

  it('should normalize forex symbols', () => {
    const rows = [
      {
        tradeid: 'U1234-003',
        accountid: 'U1234567',
        symbol: 'EUR.USD',
        datetime: '2026-04-02T09:00:00Z',
        'buy/sell': 'BOT',
        quantity: '10000',
        tradeprice: '1.0850',
        currency: 'USD',
        commission: '-2.00',
        netamount: '10848.00',
        assetclass: 'CASH',
      },
    ];

    const result = parseIBKRCSV(rows);
    expect(result.trades).toHaveLength(1);
    expect(result.trades[0].symbol).toBe('EUR/USD');
  });

  it('should handle MM/DD/YYYY date format without time', () => {
    const rows = [
      {
        tradeid: 'U1234-004',
        accountid: 'U1234567',
        symbol: 'TSLA',
        datetime: '04/03/2026',
        'buy/sell': 'BOT',
        quantity: '25',
        tradeprice: '245.00',
        currency: 'USD',
        commission: '-1.00',
        netamount: '6124.00',
        assetclass: 'STK',
      },
    ];

    const result = parseIBKRCSV(rows);
    expect(result.trades).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject zero quantity', () => {
    const rows = [
      {
        tradeid: 'U1234-005',
        accountid: 'U1234567',
        symbol: 'AMZN',
        datetime: '2026-04-03T16:20:00Z',
        'buy/sell': 'SLD',
        quantity: '0',
        tradeprice: '190.75',
        currency: 'USD',
        commission: '-1.00',
        netamount: '0.00',
        assetclass: 'STK',
      },
    ];

    const result = parseIBKRCSV(rows);
    expect(result.trades).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].reason).toContain('Quantity must be positive');
  });

  it('should handle empty Commission field (optional)', () => {
    const rows = [
      {
        tradeid: 'U1234-006',
        accountid: 'U1234567',
        symbol: 'GOOGL',
        datetime: '2026-04-04T10:15:00Z',
        'buy/sell': 'BOT',
        quantity: '30',
        tradeprice: '175.50',
        currency: 'USD',
        commission: '',
        netamount: '5265.00',
        assetclass: 'STK',
      },
    ];

    const result = parseIBKRCSV(rows);
    expect(result.trades).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
    // rawData should contain all fields, including empty ones
    expect(result.trades[0].rawData.commission).toBe('');
  });

  it('should process multiple rows and separate valid from invalid', () => {
    const rows = [
      {
        tradeid: 'U1234-001',
        accountid: 'U1234567',
        symbol: 'AAPL',
        datetime: '2026-04-01T14:30:00Z',
        'buy/sell': 'BOT',
        quantity: '100',
        tradeprice: '185.50',
        currency: 'USD',
        commission: '-1.00',
        netamount: '18549.00',
        assetclass: 'STK',
      },
      {
        tradeid: 'U1234-002',
        accountid: 'U1234567',
        symbol: 'MSFT',
        datetime: 'invalid',
        'buy/sell': 'SLD',
        quantity: '50',
        tradeprice: '420.25',
        currency: 'USD',
        commission: '-1.00',
        netamount: '-21011.50',
        assetclass: 'STK',
      },
      {
        tradeid: 'U1234-003',
        accountid: 'U1234567',
        symbol: 'GOOGL',
        datetime: '2026-04-04T10:15:00Z',
        'buy/sell': 'BOT',
        quantity: '30',
        tradeprice: '175.50',
        currency: 'USD',
        commission: '-1.00',
        netamount: '5265.00',
        assetclass: 'STK',
      },
    ];

    const result = parseIBKRCSV(rows);
    expect(result.trades).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
  });
});
