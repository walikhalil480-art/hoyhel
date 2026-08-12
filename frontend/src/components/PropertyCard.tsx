import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Heart, MapPin, Users, Bed, Bath } from 'lucide-react';
import { apiClient } from '../api/client';
import { getImageUrl } from '../utils/imageUtils';

export interface PropertyCardProps {
  property: {
    id: string;
    title: string;
    city: string;
    country: string;
    basePrice: number;
    bedrooms: number;
    bathrooms: number;
    maxGuests: number;
    averageRating: number;
    reviewCount: number;
    propertyType: string;
    images?: Array<{ url: string; isMain: boolean }>;
  };
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ property }) => {
  const [isFavorite, setIsFavorite] = useState(false);

  const rawImage =
    property.images?.find((img) => img.isMain)?.url ||
    property.images?.[0]?.url;

  const mainImage = getImageUrl(rawImage);

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await apiClient.post(`/favorites/${property.id}/toggle`);
      setIsFavorite(res.data.data.favorited);
    } catch {
      setIsFavorite(!isFavorite);
    }
  };

  return (
    <Link to={`/properties/${property.id}`} className="block group">
      <div className="glass-card rounded-2xl overflow-hidden border border-slate-800/80">
        {/* Image Container */}
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
          <img
            src={mainImage}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

          {/* Badge */}
          <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-sky-400 border border-slate-700">
            {property.propertyType}
          </div>

          {/* Favorite Button */}
          <button
            onClick={handleFavoriteToggle}
            className="absolute top-3 right-3 p-2 rounded-full bg-slate-900/70 backdrop-blur-md hover:bg-slate-900 border border-slate-700/80 text-white transition-colors"
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-300'}`} />
          </button>

          {/* Rating */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-xs font-bold text-amber-400">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            <span>{property.averageRating > 0 ? property.averageRating.toFixed(2) : 'New'}</span>
          </div>
        </div>

        {/* Details */}
        <div className="p-5">
          <div className="flex items-center gap-1 text-xs text-slate-400 mb-1.5">
            <MapPin className="w-3.5 h-3.5 text-sky-400" />
            <span>{property.city}, {property.country}</span>
          </div>

          <h3 className="text-base font-bold text-white line-clamp-1 group-hover:text-sky-400 transition-colors mb-3">
            {property.title}
          </h3>

          <div className="flex items-center gap-4 text-xs text-slate-400 pb-4 mb-4 border-b border-slate-800/80">
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {property.maxGuests} guests</span>
            <span className="flex items-center gap-1"><Bed className="w-3.5 h-3.5" /> {property.bedrooms} beds</span>
            <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5" /> {property.bathrooms} baths</span>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-xl font-extrabold text-white">${property.basePrice}</span>
              <span className="text-xs text-slate-400 ml-1">/ night</span>
            </div>
            <span className="text-xs font-semibold text-sky-400 group-hover:underline">View Stay &rarr;</span>
          </div>
        </div>
      </div>
    </Link>
  );
};
