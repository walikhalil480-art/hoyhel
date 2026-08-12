import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, MapPin, Users, Bed, Bath, ShieldCheck, Wifi, Waves, Snowflake, Utensils, Award, MessageSquare } from 'lucide-react';
import { BookingWidget } from '../components/BookingWidget';
import { apiClient } from '../api/client';

import { getImageUrl } from '../utils/imageUtils';

export const PropertyDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contacting, setContacting] = useState(false);

  const [reviews, setReviews] = useState<any[]>([]);

  const handleContactHost = async () => {
    if (!property?.hostId) return;
    try {
      setContacting(true);
      const res = await apiClient.post('/messaging/conversations', {
        hostId: property.hostId,
        propertyId: property.id,
      });
      const convId = res.data.data?.id;
      if (convId) {
        navigate(`/messages?conversationId=${convId}`);
      } else {
        navigate('/messages');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start conversation with host');
    } finally {
      setContacting(false);
    }
  };

  useEffect(() => {
    fetchPropertyDetails();
  }, [id]);

  const fetchPropertyDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const [propRes, revRes] = await Promise.all([
        apiClient.get(`/properties/${id}`),
        apiClient.get(`/reviews/property/${id}`),
      ]);
      setProperty(propRes.data.data);
      setReviews(revRes.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Property not found');
      setProperty(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center text-slate-400">
        <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        Loading Luxury Experience...
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h2 className="text-2xl font-extrabold text-white mb-2">Property Not Found</h2>
        <p className="text-xs text-slate-400 mb-6">{error || 'The requested luxury stay does not exist or has been unlisted.'}</p>
        <button
          onClick={() => window.history.back()}
          className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs"
        >
          &larr; Back to Stays
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Title Header */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">{property.title}</h1>
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
          <span className="flex items-center gap-1 font-bold text-amber-400">
            <Star className="w-4 h-4 fill-amber-400" /> {property.averageRating} ({property.reviewCount} reviews)
          </span>
          <span>&bull;</span>
          <span className="flex items-center gap-1 text-sky-400">
            <MapPin className="w-4 h-4" /> {property.address}, {property.city}, {property.country}
          </span>
        </div>
      </div>

      {/* Image Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12 rounded-3xl overflow-hidden shadow-2xl">
        <div className="md:col-span-2 aspect-[16/10] bg-slate-900 overflow-hidden">
          <img
            src={getImageUrl(property.images?.[0]?.url)}
            alt={property.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
          />
        </div>
        <div className="grid grid-rows-2 gap-4">
          <div className="aspect-[16/10] bg-slate-900 overflow-hidden">
            <img
              src={getImageUrl(property.images?.[1]?.url || property.images?.[0]?.url)}
              alt={property.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
            />
          </div>
          <div className="aspect-[16/10] bg-slate-900 overflow-hidden relative">
            <img
              src={getImageUrl(property.images?.[2]?.url || property.images?.[0]?.url)}
              alt={property.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
            />
          </div>
        </div>
      </div>

      {/* Main Content & Sticky Booking Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-16">
        <div className="lg:col-span-2 space-y-10">
          {/* Host Banner */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src={property.host?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
                alt="Host Avatar"
                className="w-14 h-14 rounded-full object-cover border-2 border-sky-400"
              />
              <div>
                <h3 className="text-base font-bold text-white">Hosted by {property.host?.firstName} {property.host?.lastName}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{property.host?.bio || 'Verified LuxeHaven Superhost'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleContactHost}
                disabled={contacting}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-sky-500/20 transition-all disabled:opacity-50"
              >
                <MessageSquare className="w-4 h-4" /> {contacting ? 'Connecting...' : 'Contact Host'}
              </button>
              <span className="hidden sm:flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-full border border-amber-400/20">
                <Award className="w-4 h-4" /> Superhost
              </span>
            </div>
          </div>

          {/* Key Specs */}
          <div className="grid grid-cols-4 gap-4 p-6 glass-panel rounded-2xl border border-slate-800 text-center">
            <div>
              <Users className="w-5 h-5 text-sky-400 mx-auto mb-1" />
              <span className="block text-xs font-bold text-white">{property.maxGuests} Guests</span>
            </div>
            <div>
              <Bed className="w-5 h-5 text-sky-400 mx-auto mb-1" />
              <span className="block text-xs font-bold text-white">{property.bedrooms} Bedrooms</span>
            </div>
            <div>
              <Bath className="w-5 h-5 text-sky-400 mx-auto mb-1" />
              <span className="block text-xs font-bold text-white">{property.bathrooms} Baths</span>
            </div>
            <div>
              <ShieldCheck className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
              <span className="block text-xs font-bold text-white">Verified</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xl font-bold text-white mb-3">About This Stay</h3>
            <p className="text-sm text-slate-300 leading-relaxed font-normal">{property.description}</p>
          </div>

          {/* Amenities */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Included Amenities</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {property.propertyAmenities?.map((pa: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3 p-3.5 glass-panel rounded-xl border border-slate-800 text-xs text-slate-200">
                  <Wifi className="w-4 h-4 text-sky-400" />
                  <span>{pa.amenity.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* House Rules & Policies */}
          <div className="space-y-4 pt-6 border-t border-slate-800/80">
            <h3 className="text-xl font-bold text-white">House Rules & Policies</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
              <div className="glass-panel p-4 rounded-xl border border-slate-800">
                <span className="font-bold text-white block mb-1">Cancellation Policy</span>
                <span className="text-amber-400 font-semibold">{property.cancellationPolicy}</span>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-slate-800">
                <span className="font-bold text-white block mb-1">Check-in / Check-out</span>
                <span>{property.checkInInstructions || 'Check-in: 3:00 PM'} &bull; {property.checkOutInstructions || 'Check-out: 11:00 AM'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sticky Booking Widget */}
        <div>
          <BookingWidget
            propertyId={property.id}
            basePrice={property.basePrice}
            maxGuests={property.maxGuests}
            cleaningFee={property.cleaningFee}
          />
        </div>
      </div>

      {/* Real Reviews Section */}
      <div className="border-t border-slate-800/80 pt-12">
        <div className="flex items-center gap-3 mb-8">
          <Star className="w-7 h-7 fill-amber-400 text-amber-400" />
          <h2 className="text-2xl font-extrabold text-white">
            {property.averageRating > 0 ? property.averageRating.toFixed(2) : 'New'} &bull; {property.reviewCount} Guest Reviews
          </h2>
        </div>

        {reviews.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl border border-slate-800 text-center text-xs text-slate-400">
            No guest reviews submitted for this property yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reviews.map((rev) => (
              <div key={rev.id} className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs border border-sky-500/30">
                      {rev.author?.firstName?.[0] || 'G'}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs">{rev.author?.firstName} {rev.author?.lastName}</h4>
                      <span className="text-[10px] text-slate-400">{new Date(rev.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20 text-amber-400 text-xs font-bold">
                    <Star className="w-3.5 h-3.5 fill-current" /> {rev.rating}.0
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-normal">{rev.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
