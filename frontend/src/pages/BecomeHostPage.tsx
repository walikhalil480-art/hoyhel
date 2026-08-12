import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, DollarSign, Sparkles, Building2, CheckCircle2, Clock, ArrowRight, UserCheck } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';

export const BecomeHostPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    businessName: '',
    experienceYears: 1,
    propertyType: 'VILLA',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await apiClient.post('/users/apply-host', {
        businessName: formData.businessName || `${user.firstName}'s Luxury Stays`,
        experienceYears: Number(formData.experienceYears) || 1,
        propertyType: formData.propertyType,
        notes: formData.notes,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit host application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Hero Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold mb-4 uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5" /> HoyHel Host Partnership Program
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-4">
          Turn Your Luxury Property Into Extra Income
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          Join our curated network of global luxury hosts. Enjoy premium guest matchings, comprehensive host insurance, and direct payouts with only a 10% platform fee.
        </p>
      </div>

      {/* Host Benefits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 text-left">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/30">
            <DollarSign className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-white text-base mb-1">Competitive Earnings</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Set your own nightly prices and keep 90% of every reservation. Automatic electronic payouts directly to your account.
          </p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800 text-left">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-4 border border-sky-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-white text-base mb-1">$1,000,000 Host Protection</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Every booking includes comprehensive property damage coverage and liability protection for ultimate peace of mind.
          </p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800 text-left">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4 border border-amber-500/30">
            <UserCheck className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-white text-base mb-1">Verified Guests Only</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            All LuxeHaven guests undergo identity verification and review checks before booking your high-end property.
          </p>
        </div>
      </div>

      {/* Application Form or Success State */}
      {submitted ? (
        <div className="glass-panel p-10 rounded-3xl border border-amber-500/30 text-center max-w-xl mx-auto bg-gradient-to-b from-slate-900 to-amber-950/20">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-500/40">
            <Clock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-white mb-2">Host Application Submitted!</h2>
          <p className="text-xs text-slate-300 mb-6 leading-relaxed">
            Your host profile is under review by the LuxeHaven Administrator team. Once approved, your account will instantly gain full Host privileges to list properties and manage bookings.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span> Application Status: PENDING VERIFICATION
          </div>
        </div>
      ) : (
        <div className="glass-panel p-8 rounded-3xl border border-slate-800 max-w-xl mx-auto shadow-2xl">
          <h2 className="text-xl font-extrabold text-white mb-1">Host Application Form</h2>
          <p className="text-xs text-slate-400 mb-6">Complete your profile to request host accreditation from platform administration.</p>

          {error && (
            <div className="p-3 mb-6 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 text-left text-xs">
            <div>
              <label className="block text-slate-300 font-bold mb-1.5">Business or Host Brand Name</label>
              <input
                type="text"
                placeholder="e.g. Elena Luxury Estates or Coastal Retreats"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Primary Property Type</label>
                <select
                  value={formData.propertyType}
                  onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="VILLA">Luxury Villa</option>
                  <option value="APARTMENT">Apartment / Suite</option>
                  <option value="HOUSE">Detached House</option>
                  <option value="PENTHOUSE">Penthouse</option>
                  <option value="RESORT">Resort Suite</option>
                  <option value="COTTAGE">Cottage / Cabin</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Hosting Experience (Years)</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={formData.experienceYears}
                  onChange={(e) => setFormData({ ...formData, experienceYears: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">Host Bio & Property Description</label>
              <textarea
                rows={3}
                placeholder="Describe your hospitality background, property locations, or guest service philosophy..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Submitting Application...' : 'Submit Host Application'} <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
