import type { Priority } from '../../shared/lib/priority';

export type GiftType = 'WishList' | 'ToGive';

export const MAX_GIFT_IMAGES = 6;

export interface GiftImage {
  id: string;
  path: string; // `<couple_id>/<gift_id>/<uuid>.jpg` in the gift-images bucket
  sortOrder: number;
  url?: string; // short-lived signed URL (the bucket is private)
}

export interface Gift {
  id: string;
  name: string;
  description?: string;
  link?: string;
  price?: number;
  priority: Priority;
  type: GiftType;
  ownerUserId: string;
  createdAt: string;
  isPurchased: boolean;
  purchasedAt?: string;
  purchasedByUserId?: string;
  images: GiftImage[];
}

// The four screens built on GiftBoard.
export type GiftListKind = 'myWishList' | 'myGiftsToGive' | 'partnerWishList' | 'purchased';

export interface SaveGiftInput {
  name: string;
  description?: string;
  link?: string;
  price?: number;
  priority: Priority;
  newImages: Blob[]; // already resized to JPEG in the browser
  removeImages: GiftImage[];
}
