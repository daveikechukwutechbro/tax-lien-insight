import { z } from "zod";

// Common reusable schemas
export const idParam = z.object({ id: z.string().uuid() });
export const stringParam = (name: string) => z.object({ [name]: z.string().min(1).max(128) });

export function enumSchema<T extends readonly [string, ...string[]]>(values: T) {
  return z.enum(values);
}

export const dateSchema = z.string().datetime().or(z.string().refine((s) => !Number.isNaN(Date.parse(s))));
export const isoDate = z.coerce.date();

// DTO: user summary (safe public subset)
export const UserSummarySchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string().nullable(),
  status: z.string(),
  roles: z.array(z.string()),
  createdAt: z.string(),
});
export type UserSummary = z.infer<typeof UserSummarySchema>;

export const AuctionSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  jurisdictionId: z.string().uuid().nullable(),
  state: z.string(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  lotCount: z.number().int().nonnegative(),
  registeredCount: z.number().int().nonnegative(),
});
export type AuctionSummary = z.infer<typeof AuctionSummarySchema>;

export const AuctionLotSummarySchema = z.object({
  id: z.string().uuid(),
  auctionId: z.string().uuid(),
  parcelId: z.string().nullable(),
  propertyId: z.string().uuid().nullable(),
  state: z.string(),
  startingRate: z.number(),
  currentRate: z.number().nullable(),
  minimumRate: z.number(),
  winningBidId: z.string().uuid().nullable(),
});
export type AuctionLotSummary = z.infer<typeof AuctionLotSummarySchema>;

export const BidSummarySchema = z.object({
  id: z.string().uuid(),
  lotId: z.string().uuid(),
  userId: z.string().uuid(),
  state: z.string(),
  rate: z.number().nullable(),
  amount: z.number().nullable(),
  createdAt: z.string(),
});
export type BidSummary = z.infer<typeof BidSummarySchema>;

export const FundsSummarySchema = z.object({
  accountId: z.string().uuid(),
  available: z.number(),
  held: z.number(),
  pending: z.number(),
  total: z.number(),
});
export type FundsSummary = z.infer<typeof FundsSummarySchema>;

export const InvoiceSummarySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  status: z.string(),
  total: z.number(),
  dueAt: z.string().nullable(),
});
export type InvoiceSummary = z.infer<typeof InvoiceSummarySchema>;

export const CertificateSummarySchema = z.object({
  id: z.string().uuid(),
  certificateNumber: z.string(),
  jurisdictionId: z.string().uuid(),
  holderId: z.string().uuid(),
  principalAmount: z.number(),
  winningInterestRate: z.number(),
  status: z.string(),
  issueDate: z.string().nullable(),
});
export type CertificateSummary = z.infer<typeof CertificateSummarySchema>;

export const RedemptionSummarySchema = z.object({
  id: z.string().uuid(),
  certificateId: z.string().uuid(),
  holderId: z.string().uuid(),
  status: z.string(),
  totalDue: z.number(),
  deadline: z.string().nullable(),
});
export type RedemptionSummary = z.infer<typeof RedemptionSummarySchema>;

export const NotificationSummarySchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  title: z.string(),
  read: z.boolean(),
  createdAt: z.string(),
});
export type NotificationSummary = z.infer<typeof NotificationSummarySchema>;

// Dashboard payload (spec §66)
export const DashboardSchema = z.object({
  bids: z.object({
    count: z.number(),
    active: z.number(),
    winning: z.number(),
    outbid: z.number(),
    lost: z.number(),
  }),
  awards: z.object({ count: z.number(), principalValue: z.number() }),
  funds: z.object({ available: z.number(), held: z.number(), pending: z.number() }),
  payments: z.object({ pending: z.number(), paid: z.number() }),
  certificates: z.object({ issued: z.number(), active: z.number(), redeemed: z.number() }),
  redemptions: z.object({
    active: z.number(),
    completed: z.number(),
    realizedInterest: z.number(),
  }),
});
export type Dashboard = z.infer<typeof DashboardSchema>;
