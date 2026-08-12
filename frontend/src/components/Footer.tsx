import React from 'react';
import { ShieldCheck, Award, Globe } from 'lucide-react';
import { HoyHelLogo } from './HoyHelLogo';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#05070a] border-t border-slate-800/80 mt-auto pt-16 pb-12 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800/60">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <HoyHelLogo variant="full" size="md" />
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            Find Home Anywhere. The trusted marketplace for curated rental properties, staycations, oceanfront villas, and penthouses.
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-sky-400" /> Verified Host</span>
            <span className="flex items-center gap-1"><Award className="w-4 h-4 text-amber-400" /> Concierge</span>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">Top Destinations</h4>
          <ul className="space-y-2.5 text-xs text-slate-400">
            <li className="hover:text-sky-400 cursor-pointer">Malibu Beach, California</li>
            <li className="hover:text-sky-400 cursor-pointer">Nairobi Penthouses, Kenya</li>
            <li className="hover:text-sky-400 cursor-pointer">Aspen Mountain Chalets</li>
            <li className="hover:text-sky-400 cursor-pointer">Amalfi Coast Villas, Italy</li>
            <li className="hover:text-sky-400 cursor-pointer">Santorini Estate Pools</li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">Platform</h4>
          <ul className="space-y-2.5 text-xs text-slate-400">
            <li className="hover:text-sky-400 cursor-pointer">Host Your Home on HoyHel</li>
            <li className="hover:text-sky-400 cursor-pointer">Cancellation Protection</li>
            <li className="hover:text-sky-400 cursor-pointer">Trust & Safety Standard</li>
            <li className="hover:text-sky-400 cursor-pointer">API & Developer Portal</li>
            <li className="hover:text-sky-400 cursor-pointer">API Documentation (Swagger)</li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">Newsletter</h4>
          <p className="text-xs text-slate-400 mb-4">Subscribe for curated stay invitations and off-market homes.</p>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Enter your email"
              className="bg-slate-900 border border-slate-800 text-xs text-white px-3 py-2 rounded-lg focus:outline-none focus:border-sky-500 flex-1"
            />
            <button className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-lg">
              Join
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
        <p>&copy; 2026 HoyHel Inc. Find Home Anywhere.</p>
        <div className="flex items-center gap-6 mt-4 sm:mt-0">
          <span className="hover:text-slate-400 cursor-pointer flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> English (US)</span>
          <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
          <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
        </div>
      </div>
    </footer>
  );
};
