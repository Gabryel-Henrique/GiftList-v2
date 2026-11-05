import { createRepository } from '../../shared/lib/storage';
import { callRpc } from '../../shared/lib/rpc';
import type { CoupleRequest } from './types';

// Read-only through the table (RLS shows only requests to/from me); every
// change goes through the database functions, which enforce who may do what.
export const coupleRequestRepo = createRepository<CoupleRequest>('couple_requests');

export const coupleApi = {
  send: (partnerUsername: string) =>
    callRpc('send_couple_request', { partner_username: partnerUsername }),
  accept: (requestId: string) => callRpc('accept_couple_request', { request_id: requestId }),
  decline: (requestId: string) => callRpc('decline_couple_request', { request_id: requestId }),
  cancel: (requestId: string) => callRpc('cancel_couple_request', { request_id: requestId }),
};
