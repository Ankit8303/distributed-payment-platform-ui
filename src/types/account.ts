export type AccountType =
  | 'CUSTOMER'
  | 'MERCHANT'
  | 'FEES'
  | 'INTERNAL_SETTLEMENT'
  | 'ESCROW';

export type AccountStatus =
  | 'ACTIVE'
  | 'FROZEN'
  | 'CLOSED'
  | 'PENDING_VERIFICATION';

export interface AccountResponse {
  accountId: string;
  accountNumber: string;
  ownerId: string;
  accountType: AccountType;
  currency: string;
  status: AccountStatus;
  createdAt: string;
}

export interface AccountSummaryVM {
  accountId: string;
  accountNumber: string;
  ownerId: string;
  accountType: AccountType;
  currency: string;
  status: AccountStatus;
  createdAtFormatted: string;
}
