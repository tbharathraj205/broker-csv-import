import { detectBroker } from '../brokerDetection';

describe('Broker Detection', () => {
  it('should detect Zerodha format by headers', () => {
    const headers = ['symbol', 'isin', 'trade_date', 'trade_type', 'quantity', 'price'];
    expect(detectBroker(headers)).toBe('zerodha');
  });

  it('should detect IBKR format by headers', () => {
    const headers = ['TradeID', 'AccountID', 'Symbol', 'DateTime', 'Buy/Sell', 'Quantity'];
    expect(detectBroker(headers)).toBe('ibkr');
  });

  it('should be case-insensitive', () => {
    const headers = ['SYMBOL', 'TRADE_DATE', 'TRADE_TYPE', 'QUANTITY', 'PRICE'];
    expect(detectBroker(headers)).toBe('zerodha');

    const ibkrHeaders = ['tradeid', 'datetime', 'buy/sell', 'quantity'];
    expect(detectBroker(ibkrHeaders)).toBe('ibkr');
  });

  it('should return null for unrecognized format', () => {
    const headers = ['col1', 'col2', 'col3', 'col4'];
    expect(detectBroker(headers)).toBeNull();
  });

  it('should return null for empty headers', () => {
    expect(detectBroker([])).toBeNull();
  });
});
