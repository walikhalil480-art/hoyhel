import React from 'react';

interface HoyHelLogoProps {
  variant?: 'full' | 'icon' | 'wordmark';
  theme?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTagline?: boolean;
}

export const HoyHelLogo: React.FC<HoyHelLogoProps> = ({
  variant = 'full',
  theme = 'dark',
  size = 'md',
  className = '',
  showTagline = true,
}) => {
  const iconSizeMap = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
    xl: 'w-14 h-14',
  };

  const textSizeMap = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  const taglineSizeMap = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
    xl: 'text-sm',
  };

  const isDarkTheme = theme === 'dark';

  const iconElement = (
    <div className={`relative shrink-0 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-600 to-indigo-700 p-0.5 shadow-lg shadow-sky-500/20 ${iconSizeMap[size]}`}>
      <div className="w-full h-full bg-slate-950/80 backdrop-blur-sm rounded-[10px] flex items-center justify-center relative overflow-hidden">
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-3/5 h-3/5">
          <rect x="22" y="30" width="12" height="46" rx="6" fill="#38BDF8" />
          <rect x="66" y="30" width="12" height="46" rx="6" fill="#6366F1" />
          <path d="M28 44 C28 32 72 32 72 44 V56 H28 V44 Z" fill="#F59E0B" />
          <circle cx="50" cy="44" r="7" fill="#FFFFFF" />
        </svg>
      </div>
    </div>
  );

  const wordmarkElement = (
    <div className="flex flex-col leading-tight">
      <span className={`font-black tracking-tight ${textSizeMap[size]} ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
        Hoy<span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">Hel</span>
      </span>
      {variant === 'full' && showTagline && (
        <span className={`font-bold uppercase tracking-widest text-sky-400/90 ${taglineSizeMap[size]}`}>
          Find Home Anywhere.
        </span>
      )}
    </div>
  );

  if (variant === 'icon') {
    return <div className={`inline-flex items-center ${className}`}>{iconElement}</div>;
  }

  if (variant === 'wordmark') {
    return <div className={`inline-flex items-center ${className}`}>{wordmarkElement}</div>;
  }

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {iconElement}
      {wordmarkElement}
    </div>
  );
};
