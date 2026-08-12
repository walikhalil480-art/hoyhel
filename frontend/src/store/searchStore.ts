import { create } from 'zustand';

interface SearchFilters {
  city: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string;
  amenities: string[];
  setFilter: (key: string, value: any) => void;
  resetFilters: () => void;
}

export const useSearchStore = create<SearchFilters>((set) => ({
  city: '',
  checkIn: '',
  checkOut: '',
  guests: 1,
  amenities: [],
  setFilter: (key, value) => set((state) => ({ ...state, [key]: value })),
  resetFilters: () =>
    set({
      city: '',
      checkIn: '',
      checkOut: '',
      guests: 1,
      minPrice: undefined,
      maxPrice: undefined,
      propertyType: undefined,
      amenities: [],
    }),
}));
