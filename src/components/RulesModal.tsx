import React from 'react';
import { X, BookOpen, Crown, RefreshCw, Flame, CheckCircle } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-100">
                How to Play Cards Against Sanskar
              </h2>
              <p className="text-xs text-stone-400">
                Rules of Engagement for the Indian Living Room
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs sm:text-sm text-stone-300">
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-stone-950/60 border border-stone-800">
            <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 text-sm">
              1
            </div>
            <div>
              <h3 className="font-bold text-stone-100">The Sanskari Judge (Czar)</h3>
              <p className="text-stone-400 mt-0.5">
                Every round, one player is chosen as the Judge (rotating clockwise). The Judge reads the Black Prompt Card (e.g. <em>"Why did the Rishta get rejected within 5 seconds?"</em>).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-stone-950/60 border border-stone-800">
            <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 text-sm">
              2
            </div>
            <div>
              <h3 className="font-bold text-stone-100">Play Your Funniest Punchline</h3>
              <p className="text-stone-400 mt-0.5">
                All other players hold 7 White Answer Cards in their hand. Pick the funniest card (or 2 cards if the prompt says <em>PICK 2</em>) to fill in the blank and click <strong>Submit</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-stone-950/60 border border-stone-800">
            <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 text-sm">
              3
            </div>
            <div>
              <h3 className="font-bold text-stone-100">The Anonymous Reveal</h3>
              <p className="text-stone-400 mt-0.5">
                Submissions are shuffled completely anonymously on the server! The Judge flips the cards one by one, reads them with full Bollywood drama, and crowns the winning answer.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-stone-950/60 border border-stone-800">
            <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 text-sm">
              4
            </div>
            <div>
              <h3 className="font-bold text-stone-100 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span>Sacrifice Sanskar (Redraw Power)</span>
              </h3>
              <p className="text-stone-400 mt-0.5">
                Stuck with weak cards? Once per game during the submission phase, you can invoke <em>Sacrifice Sanskar</em> to discard up to 3 cards and immediately redraw new ones!
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30">
            <div className="w-7 h-7 rounded-xl bg-amber-500 text-stone-950 font-bold flex items-center justify-center shrink-0 text-sm">
              👑
            </div>
            <div>
              <h3 className="font-bold text-amber-300">Victory & "Log Kya Kahenge"</h3>
              <p className="text-amber-100/80 mt-0.5">
                Winning a round awards 1 Sanskar Point. The first player to reach the target score (default 5 points) wins the match and earns the title of <strong>Sanskar Supreme</strong>!
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-stone-800 bg-stone-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-md transition-colors"
          >
            Chalo, Samajh Gaya! (Got It)
          </button>
        </div>
      </div>
    </div>
  );
};
