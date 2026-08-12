import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, DollarSign, MapPin, Plus, AlertCircle, UploadCloud, X, Star, Check } from 'lucide-react';
import { apiClient } from '../api/client';

export const AddPropertyPage: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    propertyType: 'VILLA',
    basePrice: 500,
    cleaningFee: 100,
    bedrooms: 3,
    bathrooms: 3,
    maxGuests: 6,
    address: '',
    city: '',
    country: '',
    latitude: 34.0259,
    longitude: -118.7798,
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [mainIndex, setMainIndex] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setError(null);

    const newFiles = Array.from(e.target.files);
    const validFiles: File[] = [];
    const validPreviews: string[] = [];

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB limit

    for (const file of newFiles) {
      if (!allowedTypes.includes(file.type.toLowerCase()) && !file.name.match(/\.(jpg|jpeg|png|webp)$/i)) {
        setError(`"${file.name}" is not a supported image file. Only JPG, PNG, and WEBP are allowed.`);
        return;
      }
      if (file.size > maxSizeBytes) {
        setError(`"${file.name}" exceeds the maximum 5MB size limit.`);
        return;
      }
      validFiles.push(file);
      validPreviews.push(URL.createObjectURL(file));
    }

    if (selectedFiles.length + validFiles.length > 10) {
      setError('Maximum 10 images allowed per property.');
      return;
    }

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    setPreviewUrls((prev) => [...prev, ...validPreviews]);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));

    if (mainIndex === index) {
      setMainIndex(0);
    } else if (mainIndex > index) {
      setMainIndex(mainIndex - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setError('At least one property image is required before submitting.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Create property record
      const propertyRes = await apiClient.post('/properties', formData);
      const propertyId = propertyRes.data.data.id;

      // 2. Upload image files via multipart FormData
      const uploadData = new FormData();
      selectedFiles.forEach((file) => {
        uploadData.append('images', file);
      });
      uploadData.append('mainIndex', mainIndex.toString());

      await apiClient.post(`/properties/${propertyId}/images`, uploadData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      navigate(`/properties/${propertyId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit property listing or upload images.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl">
        <h1 className="text-2xl font-extrabold text-white mb-2">List A New Luxury Property</h1>
        <p className="text-xs text-slate-400 mb-8">Submit your property details and high-resolution images for LuxeHaven verification</p>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-400 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Property Title</label>
            <input
              type="text"
              required
              placeholder="e.g. The Obsidian Cliffside Villa & Infinity Pool"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Property Description</label>
            <textarea
              rows={4}
              required
              placeholder="Provide a detailed description of architectural highlights, views, and luxury features..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Property Type</label>
              <select
                value={formData.propertyType}
                onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="VILLA">Villa</option>
                <option value="APARTMENT">Apartment / Penthouse</option>
                <option value="HOUSE">House / Chalet</option>
                <option value="HOTEL">Bespoke Hotel Suite</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Nightly Base Price ($ USD)</label>
              <input
                type="number"
                required
                min={1}
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Bedrooms</label>
              <input
                type="number"
                required
                min={1}
                value={formData.bedrooms}
                onChange={(e) => setFormData({ ...formData, bedrooms: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Bathrooms</label>
              <input
                type="number"
                required
                min={1}
                value={formData.bathrooms}
                onChange={(e) => setFormData({ ...formData, bathrooms: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Max Guests</label>
              <input
                type="number"
                required
                min={1}
                value={formData.maxGuests}
                onChange={(e) => setFormData({ ...formData, maxGuests: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Street Address</label>
              <input
                type="text"
                required
                placeholder="e.g. 32100 Pacific Coast Highway"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">City</label>
              <input
                type="text"
                required
                placeholder="e.g. Malibu"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Country</label>
              <input
                type="text"
                required
                placeholder="e.g. United States"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Interactive Image Upload Section */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white">
                  Property Images (Required: 1 to 10 images)
                </label>
                <span className="text-[11px] text-slate-400">Accepted formats: JPG, JPEG, PNG, WEBP (Max 5MB per file)</span>
              </div>
              <span className="text-xs font-bold text-sky-400">{selectedFiles.length} / 10 Selected</span>
            </div>

            {/* Drag & Drop File Select Box */}
            <div className="relative border-2 border-dashed border-slate-700 hover:border-sky-500/60 rounded-2xl p-6 text-center transition-colors bg-slate-950/40 cursor-pointer">
              <input
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadCloud className="w-8 h-8 text-sky-400 mx-auto mb-2" />
              <div className="text-xs font-bold text-white mb-0.5">Click or drag images here to upload</div>
              <div className="text-[10px] text-slate-400">Select high-quality interior, exterior, living room, and bedroom photos</div>
            </div>

            {/* Thumbnail Previews Grid */}
            {previewUrls.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {previewUrls.map((url, idx) => (
                  <div key={idx} className={`relative rounded-xl overflow-hidden border ${mainIndex === idx ? 'border-sky-500 ring-2 ring-sky-500/40' : 'border-slate-800'} bg-slate-950 group`}>
                    <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-24 object-cover" />
                    
                    {/* Cover Image Indicator / Selector */}
                    <button
                      type="button"
                      onClick={() => setMainIndex(idx)}
                      className={`absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold flex items-center gap-1 ${
                        mainIndex === idx ? 'bg-sky-500 text-white shadow' : 'bg-slate-900/80 text-slate-300 hover:bg-sky-500 hover:text-white'
                      }`}
                    >
                      <Star className="w-2.5 h-2.5 fill-current" />
                      {mainIndex === idx ? 'Cover Image' : 'Set Cover'}
                    </button>

                    {/* Remove Image Button */}
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-950/80 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors"
                      title="Remove Image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 font-extrabold text-sm text-white shadow-xl shadow-sky-500/20 transition-all disabled:opacity-50"
          >
            {loading ? 'Uploading Images & Submitting Property...' : 'Submit Listing For Approval'}
          </button>
        </form>
      </div>
    </div>
  );
};
