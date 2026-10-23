export interface TourismSpot {
  id: string;
  name: string;
  category: 'أثري' | 'طبيعة' | 'ترفيه' | 'ثقافة';
  image: string;
  description: string;
  location: string;
  googleMapsUrl: string;
  openingHours: string;
  entryFee: string;
  rating: number;
  tags: string[];
  tips: string[];
  createdAt?: number;
}

export const SEED_TOURISM_SPOTS: TourismSpot[] = [];
