import React, { useState } from 'react';
import { Star, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient } from '../api/client';

interface ReviewModalProps {
  booking: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({ booking, onClose, onSuccess }) => {
  const [rating, setRating] = useState(5);
  const [cleanliness, setCleanliness] = useState(5);
  const [communication, setCommunication] = useState(5);
  const [location, setLocation] = useState(5);
  const [accuracy, setAccuracy] = useState(5);
  const [value, setValue] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError('Please provide a brief review comment describing your stay.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await apiClient.post('/reviews', {
        bookingId: booking.id,
        rating,
        cleanliness,
        communication,
        location,
        accuracy,
        value,
        comment,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (currentVal: number, setter: (val: number) => void) => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setter(star)}
          className="p-1 hover:scale-110 transition-transform focus:outline-none"
        >
          <Star
            className={`w-5 h-5 ${
              star <= currentVal ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
            }`}
          />
        </button>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div>
            <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest block">GUEST REVIEW</span>
            <h3 className="text-xl font-extrabold text-white">{booking.property?.title || 'Luxury Stay'}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-bold">&times;</button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-200 mb-1">Overall Experience Rating</label>
            {renderStars(rating, setRating)}
          </div>

          <div className="grid grid-cols-2 gap-4 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Cleanliness</label>
              {renderStars(cleanliness, setCleanliness)}
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Host Communication</label>
              {renderStars(communication, setCommunication)}
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Location & Neighborhood</label>
              {renderStars(location, setLocation)}
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Value for Money</label>
              {renderStars(value, setValue)}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-200 mb-1">Your Review Comment</label>
            <textarea
              rows={4}
              required
              placeholder="Share details of your stay, amenities, host hospitality, and recommendations for future guests..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
          >
            {submitting ? 'Submitting Review...' : 'Post Public Review'}
          </button>
        </form>
      </div>
    </div>
  );
};
