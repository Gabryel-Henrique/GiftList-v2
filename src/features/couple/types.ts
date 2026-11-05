export type CoupleRequestStatus = 'Proposed' | 'Accepted' | 'Declined' | 'Cancelled';

export interface CoupleRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: CoupleRequestStatus;
  createdAt: string;
  respondedAt?: string;
}
