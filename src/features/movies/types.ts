export interface Movie {
  id: string;
  name: string;
  imageUrl?: string; // pasted link
  imagePath?: string; // photo picked from the device (item-images bucket)
  createdByUserId?: string; // set by the DB (auth.uid()) on insert
  createdAt?: string;
}

export interface MovieReview {
  id: string;
  movieId: string;
  userId?: string; // set by the DB (auth.uid()) on insert
  rating: number; // 1–5 in half steps
  review?: string;
  watchedDate?: string; // yyyy-mm-dd
  isFirstWatch: boolean;
  createdAt?: string;
  updatedAt?: string;
}
