import React from 'react';
import { BlackCard, WhiteCard } from '../types/game';

interface BlackCardViewProps {
  card: BlackCard;
  className?: string;
  size?: 'normal' | 'large' | 'compact';
}

export const BlackCardView: React.FC<BlackCardViewProps> = ({ card, className = '', size = 'normal' }) => {
  const isLarge = size === 'large';
  const isCompact = size === 'compact';

  // Format blank spaces in prompt with highlighted underlines
  const formattedText = card.text.split('____').map((part, index, arr) => (
    <React.Fragment key={index}>
      {part}
      {index < arr.length - 1 && (
        <span className="inline-block border-b-2 border-amber-400 min-w-[70px] mx-1.5 text-amber-300 font-semibold align-baseline">
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        </span>
      )}
    </React.Fragment>
  ));

  return (
    <div
      className={`relative flex flex-col justify-between rounded-xl bg-stone-950 text-stone-100 border border-stone-800 shadow-2xl transition-all select-none overflow-hidden ${
        isLarge
          ? 'p-6 md:p-8 min-h-[260px] md:min-h-[300px] max-w-md w-full'
          : isCompact
          ? 'p-3 min-h-[140px] text-xs'
          : 'p-5 min-h-[210px] w-60'
      } ${className}`}
    >
      {/* Subtle mandala background accent */}
      <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-gradient-to-br from-amber-600/10 to-transparent pointer-events-none blur-xl" />
      <div className="absolute top-2 right-3 text-[10px] tracking-widest uppercase font-mono text-amber-400/80">
        Prompt
      </div>

      <div className="relative z-10">
        <p
          className={`font-semibold text-stone-100 leading-snug tracking-tight ${
            isLarge ? 'text-lg md:text-xl' : isCompact ? 'text-xs' : 'text-base'
          }`}
        >
          {formattedText}
        </p>
      </div>

      <div className="relative z-10 pt-4 flex items-center justify-between border-t border-stone-800/80 mt-auto text-[11px] text-stone-400">
        <div className="flex items-center gap-1.5 font-bold tracking-wider uppercase text-[10px] text-amber-400">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block animate-pulse"></span>
          <span>Cards Against Sanskar</span>
        </div>
        <div className="font-mono text-xs px-2 py-0.5 rounded bg-stone-900 border border-stone-700/60 text-amber-300">
          PICK {card.pick}
        </div>
      </div>
    </div>
  );
};

interface WhiteCardViewProps {
  card: WhiteCard;
  isSelected?: boolean;
  selectionOrder?: number;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  size?: 'normal' | 'large' | 'compact';
}

export const WhiteCardView: React.FC<WhiteCardViewProps> = ({
  card,
  isSelected,
  selectionOrder,
  onClick,
  disabled,
  className = '',
  size = 'normal'
}) => {
  const isLarge = size === 'large';
  const isCompact = size === 'compact';

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`relative flex flex-col justify-between rounded-xl bg-stone-50 text-stone-900 border transition-all duration-200 select-none ${
        onClick && !disabled
          ? 'cursor-pointer hover:-translate-y-1.5 hover:shadow-xl active:translate-y-0'
          : ''
      } ${
        isSelected
          ? 'border-amber-500 ring-2 ring-amber-400 shadow-amber-500/20 shadow-lg -translate-y-1 bg-amber-50/40'
          : 'border-stone-200/90 shadow-md hover:border-amber-300/80'
      } ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${
        isLarge
          ? 'p-6 min-h-[220px] max-w-sm w-full'
          : isCompact
          ? 'p-3 min-h-[130px] text-xs'
          : 'p-4 min-h-[180px] w-52'
      } ${className}`}
    >
      {/* Pick selection indicator */}
      {isSelected && selectionOrder !== undefined && (
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center shadow-md">
          {selectionOrder}
        </div>
      )}

      <div>
        <p
          className={`font-semibold text-stone-900 leading-snug tracking-tight ${
            isLarge ? 'text-base md:text-lg' : isCompact ? 'text-xs' : 'text-sm'
          }`}
        >
          {card.text}
        </p>
      </div>

      <div className="pt-3 flex items-center justify-between border-t border-stone-200/60 mt-auto text-[10px] text-stone-500 font-mono">
        <span className="uppercase tracking-wider font-sans font-bold text-stone-700">
          Sanskar Card
        </span>
        {card.author && (
          <span className="truncate max-w-[80px]" title={`By ${card.author}`}>
            by {card.author}
          </span>
        )}
      </div>
    </div>
  );
};
