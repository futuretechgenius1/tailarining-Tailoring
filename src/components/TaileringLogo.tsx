import React, { useState } from 'react';

interface TaileringLogoProps {
  compact?: boolean;
  inverted?: boolean;
  className?: string;
}

const TAILERING_LOGO_SRC = '/assets/aistudio/image_256e2dfa.png';

export const TaileringLogo: React.FC<TaileringLogoProps> = ({
  compact = false,
  inverted = false,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  if (imgError) {
    return (
      <span
        className={`inline-flex items-baseline font-serif-accent font-bold tracking-tight whitespace-nowrap shrink-0 select-none ${
          compact ? 'text-xl' : 'text-2xl'
        } ${className}`}
      >
        <span className={inverted ? 'text-white' : 'text-[#0B1F3A]'}>Tailer</span>
        <span className="text-[#C8922A]">ing</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center shrink-0 select-none ${
        inverted ? 'bg-white/95 px-2.5 py-1 rounded-xl shadow-xs' : ''
      } ${className}`}
    >
      <img
        src={TAILERING_LOGO_SRC}
        alt="Tailering"
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`${
          compact ? 'h-8 sm:h-9' : 'h-10 sm:h-11'
        } w-auto object-contain block`}
      />
    </span>
  );
};
