import { importTrades } from '../importService';

describe('Import Service', () => {
  describe('CSV Parsing and Broker Detection', () => {
    it('should parse Zerodha CSV correctly', async () => {
      const csv = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
RELIANCE,INE002A01018,01-04-2026,buy,10,2450.50,TRD001,ORD001,NSE,EQ
INFY,INE009A01021,01-04-2026,sell,25,1520.75,TRD002,ORD002,NSE,EQ`;

      const result = await importTrades(csv);
      expect(result.broker).toBe('zerodha');
      expect(result.summary.total).toBe(2);
      expect(result.summary.valid).toBe(2);
      expect(result.summary.skipped).toBe(0);
      expect(result.trades).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should parse IBKR CSV correctly', async () => {
      const csv = `TradeID,AccountID,Symbol,DateTime,Buy/Sell,Quantity,TradePrice,Currency,Commission,NetAmount,AssetClass
U1234-001,U1234567,AAPL,2026-04-01T14:30:00Z,BOT,100,185.50,USD,-1.00,18549.00,STK
U1234-002,U1234567,MSFT,2026-04-01T15:45:00Z,SLD,50,420.25,USD,-1.00,-21011.50,STK`;

      const result = await importTrades(csv);
      expect(result.broker).toBe('ibkr');
      expect(result.summary.total).toBe(2);
      expect(result.summary.valid).toBe(2);
      expect(result.summary.skipped).toBe(0);
      expect(result.trades).toHaveLength(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty CSV', async () => {
      const result = await importTrades('');
      expect(result.broker).toBe('unknown');
      expect(result.summary.valid).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].reason).toContain('Empty');
    });

    it('should handle unrecognized format', async () => {
      const csv = `col1,col2,col3
value1,value2,value3`;

      const result = await importTrades(csv);
      expect(result.broker).toBe('unknown');
      expect(result.summary.valid).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle single valid row', async () => {
      const csv = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
RELIANCE,INE002A01018,01-04-2026,buy,10,2450.50,TRD001,ORD001,NSE,EQ`;

      const result = await importTrades(csv);
      expect(result.broker).toBe('zerodha');
      expect(result.summary.valid).toBe(1);
      expect(result.trades).toHaveLength(1);
    });

    it('should handle all invalid rows', async () => {
      const csv = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
RELIANCE,INE002A01018,invalid_date,buy,10,2450.50,TRD001,ORD001,NSE,EQ
INFY,INE009A01021,bad_date,sell,-5,1520.75,TRD002,ORD002,NSE,EQ`;

      const result = await importTrades(csv);
      expect(result.broker).toBe('zerodha');
      expect(result.summary.valid).toBe(0);
      expect(result.summary.skipped).toBe(2);
      expect(result.errors).toHaveLength(2);
    });

    it('should handle CSV with only headers', async () => {
      const csv = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment`;

      const result = await importTrades(csv);
      expect(result.broker).toBe('zerodha');
      expect(result.summary.valid).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should mix valid and invalid rows', async () => {
      const csv = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
RELIANCE,INE002A01018,01-04-2026,buy,10,2450.50,TRD001,ORD001,NSE,EQ
INFY,INE009A01021,bad_date,sell,25,1520.75,TRD002,ORD002,NSE,EQ
TATAMOTORS,INE155A01022,02-04-2026,buy,50,650.00,TRD003,ORD003,BSE,EQ`;

      const result = await importTrades(csv);
      expect(result.broker).toBe('zerodha');
      expect(result.summary.total).toBe(3);
      expect(result.summary.valid).toBe(2);
      expect(result.summary.skipped).toBe(1);
      expect(result.trades).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('Response Structure', () => {
    it('should include all required fields in response', async () => {
      const csv = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
RELIANCE,INE002A01018,01-04-2026,buy,10,2450.50,TRD001,ORD001,NSE,EQ`;

      const result = await importTrades(csv);
      expect(result).toHaveProperty('broker');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('trades');
      expect(result).toHaveProperty('errors');
      expect(result.summary).toHaveProperty('total');
      expect(result.summary).toHaveProperty('valid');
      expect(result.summary).toHaveProperty('skipped');
    });

    it('should include rawData for each trade', async () => {
      const csv = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
RELIANCE,INE002A01018,01-04-2026,buy,10,2450.50,TRD001,ORD001,NSE,EQ`;

      const result = await importTrades(csv);
      expect(result.trades[0].rawData).toBeDefined();
      expect(result.trades[0].rawData.symbol).toBe('RELIANCE');
      expect(result.trades[0].rawData.trade_id).toBe('TRD001');
    });
  });
});
