export interface Restaurant {
  id: string;
  name: string;
  description?: string;
  link?: string;
  imageUrl?: string; // pasted link
  imagePath?: string; // photo picked from the device (item-images bucket)
  createdByUserId?: string; // set by the DB (auth.uid()) on insert
  createdAt?: string;
}

export interface RestaurantReview {
  id: string;
  restaurantId: string;
  userId?: string; // set by the DB (auth.uid()) on insert
  rating: number; // 0–10
  comment?: string;
  wouldReturn: boolean;
  createdAt?: string;
  updatedAt?: string;
}
