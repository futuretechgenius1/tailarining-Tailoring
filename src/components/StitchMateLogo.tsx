import React from 'react';

interface StitchMateLogoProps {
  compact?: boolean;
  showSubtext?: boolean;
  className?: string;
}

export const StitchMateLogo: React.FC<StitchMateLogoProps> = ({
  compact = false,
  showSubtext = true,
  className = '',
}) => {
  return (
    <div className={`inline-flex items-center gap-2 select-none shrink-0 ${className}`}>
      <svg
        width={compact ? 30 : 34}
        height={compact ? 30 : 34}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="smRibbonTop" x1="4" y1="4" x2="36" y2="20" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E11D48" />
            <stop offset="55%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#FBBF24" />
          </linearGradient>
          <linearGradient id="smRibbonBottom" x1="6" y1="18" x2="34" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#EA580C" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
        </defs>
        {/* Dynamic stylized tailor-ribbon S mark inspired by the reference brand mark */}
        <path
          d="M29.5 7.5C24.8 4.8 15.8 5.2 11.4 9.2C8.2 12.1 8.8 16.8 13.6 18.6L25.4 22.8C27.8 23.7 28.4 26.2 26.6 28.1C24.2 30.6 18.4 31.1 13.2 28.8"
          stroke="url(#smRibbonTop)"
          strokeWidth="4.6"
          strokeLinecap="round"
        />
        <path
          d="M11 32.5C15.7 35.1 24.4 34.7 28.9 30.8C32.2 27.9 31.5 23.2 26.7 21.4L15 17.2C12.5 16.3 12 13.7 13.9 11.9"
          stroke="url(#smRibbonBottom)"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeOpacity="0.9"
        />
        {/* Subtle needle eye & stitch accent */}
        <circle cx="31" cy="8.5" r="2.2" fill="#E11D48" />
        <path d="M16 20H24" stroke="#FFF7ED" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="2 2.5" />
      </svg>

      <div className="flex flex-col leading-none">
        <span
          className={`font-extrabold tracking-tight text-[#1C1917] whitespace-nowrap ${
            compact ? 'text-[19px]' : 'text-[22px]'
          }`}
        >
          Stitch<span className="text-[#EA580C]">Mate</span>
        </span>
        {showSubtext && (
          <span className="text-[8.5px] font-semibold tracking-[0.22em] text-[#78716C] uppercase mt-0.5 whitespace-nowrap">
            PREMIUM TAILORING
          </span>
        )}
      </div>
    </div>
  );
};
