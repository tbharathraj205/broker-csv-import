export type BrokerType = 'zerodha' | 'ibkr' | null;

// Figure out which broker format this is
export function detectBroker(headers: string[]): BrokerType {
  // Make all headers lowercase for comparison
  const lowerHeaders = headers.map(h => h.toLowerCase());

  // Check if this is Zerodha format
  const hasZerodhaHeaders = lowerHeaders.includes('symbol') && 
                            lowerHeaders.includes('trade_date') && 
                            lowerHeaders.includes('trade_type');
  
  if (hasZerodhaHeaders) {
    return 'zerodha';
  }

  // Check if this is IBKR format
  const hasIBKRHeaders = lowerHeaders.includes('tradeid') && 
                         lowerHeaders.includes('datetime') && 
                         lowerHeaders.includes('buy/sell');
  
  if (hasIBKRHeaders) {
    return 'ibkr';
  }

  // Unknown format
  return null;
}
