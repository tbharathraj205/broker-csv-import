import { z } from 'zod';

// Trade validation schema
export const TradeSchema = z.object({
  symbol: z.string().min(1),
  side: z.enum(['BUY', 'SELL']),
  quantity: z.number().positive(),
  price: z.number().positive(),
  totalAmount: z.number(),
  currency: z.string().length(3),
  executedAt: z.string().datetime(),
  broker: z.string().min(1),
  rawData: z.record(z.string(), z.unknown()),
});

// Type for a trade
export type Trade = z.infer<typeof TradeSchema>;

export interface ParseResult {
  trades: Trade[];
  errors: Array<{
    row: number;
    reason: string;
  }>;
}

export interface ImportResponse {
  broker: string;
  summary: {
    total: number;
    valid: number;
    skipped: number;
  };
  trades: Trade[];
  errors: Array<{
    row: number;
    reason: string;
  }>;
}
