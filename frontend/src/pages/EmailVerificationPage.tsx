import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

export const EmailVerificationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setSuccess(false);
      setMessage('Missing or invalid email verification token.');
      return;
    }

    apiClient
      .post('/auth/verify-email', { token })
      .then((res) => {
        setLoading(false);
        setSuccess(true);
        setMessage(res.data.message || 'Your email has been verified successfully!');
      })
      .catch((err) => {
        setLoading(false);
        setSuccess(false);
        setMessage(err.response?.data?.message || 'Failed to verify email. The token may be expired or already used.');
      });
  }, [token]);

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-[#121824] border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
        {loading ? (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="w-12 h-12 text-amber-400 animate-spin mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Verifying Your Email</h2>
            <p className="text-slate-400 text-sm">Please wait while we confirm your account details...</p>
          </div>
        ) : success ? (
          <div className="flex flex-col items-center py-4">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Email Verified!</h2>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">{message}</p>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-semibold rounded-xl transition-all shadow-lg shadow-amber-500/20"
            >
              Proceed to Login
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center py-4">
            <div className="w-16 h-16 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Verification Failed</h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">{message}</p>
            <div className="flex flex-col gap-3 w-full">
              <Link
                to="/login"
                className="w-full py-3 px-6 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors"
              >
                Return to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
