import React, { useState } from 'react';
import { CardDeck, BlackCard, WhiteCard } from '../types/game';
import { DEFAULT_DECKS } from '../data/defaultDecks';
import { BlackCardView, WhiteCardView } from './CardView';
import { X, Search, Plus, Download, Upload, Layers, Check, Sparkles } from 'lucide-react';

interface DeckManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customDecks: CardDeck[];
  onAddCustomCard?: (isBlack: boolean, text: string, pick: 1 | 2) => void;
  isHost?: boolean;
}

export const DeckManagerModal: React.FC<DeckManagerModalProps> = ({
  isOpen,
  onClose,
  customDecks,
  onAddCustomCard
}) => {
  if (!isOpen) return null;

  const allDecks = [...DEFAULT_DECKS, ...customDecks];
  const [selectedDeckId, setSelectedDeckId] = useState<string>(allDecks[0].id);
  const [cardTypeFilter, setCardTypeFilter] = useState<'all' | 'black' | 'white'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Add custom card state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCardIsBlack, setNewCardIsBlack] = useState(true);
  const [newCardText, setNewCardText] = useState('');
  const [newCardPick, setNewCardPick] = useState<1 | 2>(1);
  const [importExportModal, setImportExportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const activeDeck = allDecks.find(d => d.id === selectedDeckId) || allDecks[0];

  // Filtering cards
  const query = searchQuery.toLowerCase().trim();
  const filteredBlackCards = activeDeck.blackCards.filter(c =>
    !query || c.text.toLowerCase().includes(query)
  );
  const filteredWhiteCards = activeDeck.whiteCards.filter(c =>
    !query || c.text.toLowerCase().includes(query)
  );

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardText.trim() || !onAddCustomCard) return;

    onAddCustomCard(newCardIsBlack, newCardText.trim(), newCardPick);
    setNewCardText('');
    setShowAddForm(false);
  };

  const handleExportDeck = () => {
    const exportData = JSON.stringify(activeDeck, null, 2);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sanskar-deck-${activeDeck.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(importJsonText);
      if (!parsed.blackCards || !parsed.whiteCards) {
        setImportStatus('Invalid deck format. Must include blackCards and whiteCards array.');
        return;
      }
      if (onAddCustomCard) {
        for (const bc of parsed.blackCards) {
          onAddCustomCard(true, bc.text, bc.pick || 1);
        }
        for (const wc of parsed.whiteCards) {
          onAddCustomCard(false, wc.text, 1);
        }
      }
      setImportStatus('Successfully imported deck into custom cards!');
      setTimeout(() => {
        setImportExportModal(false);
        setImportStatus(null);
        setImportJsonText('');
      }, 1500);
    } catch {
      setImportStatus('Failed to parse JSON. Please check syntax.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-100 flex items-center gap-2">
                <span>Sanskar Deck Manager</span>
                <span className="text-xs font-normal text-stone-400">
                  ({allDecks.length} packs)
                </span>
              </h2>
              <p className="text-xs text-stone-400">
                Explore cultural prompts, review punchlines, or add custom cards to your game.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onAddCustomCard && (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Card</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Deck Picker Tabs */}
        <div className="flex items-center gap-2 p-3 px-4 border-b border-stone-800/80 overflow-x-auto bg-stone-950/40 scrollbar-none">
          {allDecks.map(deck => {
            const isSelected = deck.id === selectedDeckId;
            return (
              <button
                key={deck.id}
                onClick={() => setSelectedDeckId(deck.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-sm'
                    : 'bg-stone-900 text-stone-300 border-stone-800 hover:border-stone-700'
                }`}
              >
                <span>{deck.icon}</span>
                <span>{deck.name}</span>
                <span className={`text-[10px] ${isSelected ? 'text-stone-950' : 'text-stone-400'}`}>
                  ({deck.blackCards.length + deck.whiteCards.length})
                </span>
              </button>
            );
          })}
        </div>

        {/* Deck Info Bar & Filter */}
        <div className="p-3 px-4 flex flex-wrap items-center justify-between gap-3 border-b border-stone-800/60 bg-stone-900/40 text-xs">
          <div className="text-stone-400">
            <span className="font-semibold text-stone-200">{activeDeck.name}:</span>{' '}
            <span>{activeDeck.description}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportDeck}
              className="flex items-center gap-1 text-stone-400 hover:text-amber-400 transition-colors"
              title="Download Deck JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
            <span className="text-stone-700">|</span>
            <button
              onClick={() => setImportExportModal(true)}
              className="flex items-center gap-1 text-stone-400 hover:text-amber-400 transition-colors"
              title="Import Deck JSON"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import</span>
            </button>
          </div>
        </div>

        {/* Search & Card Type Filter */}
        <div className="p-3 px-4 flex flex-wrap items-center justify-between gap-3 border-b border-stone-800/60">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search cards in this deck..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-stone-950 rounded-xl border border-stone-800 text-xs">
            <button
              onClick={() => setCardTypeFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                cardTypeFilter === 'all'
                  ? 'bg-stone-800 text-stone-100'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setCardTypeFilter('black')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                cardTypeFilter === 'black'
                  ? 'bg-stone-800 text-stone-100'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Prompts ({filteredBlackCards.length})
            </button>
            <button
              onClick={() => setCardTypeFilter('white')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                cardTypeFilter === 'white'
                  ? 'bg-stone-800 text-stone-100'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Answers ({filteredWhiteCards.length})
            </button>
          </div>
        </div>

        {/* Cards Content Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Black Prompts */}
          {(cardTypeFilter === 'all' || cardTypeFilter === 'black') && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <span>Black Prompts</span>
                <span className="text-stone-500">({filteredBlackCards.length})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredBlackCards.map(c => (
                  <BlackCardView key={c.id} card={c} size="compact" />
                ))}
              </div>
            </div>
          )}

          {/* White Answers */}
          {(cardTypeFilter === 'all' || cardTypeFilter === 'white') && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
                <span>White Punchline Cards</span>
                <span className="text-stone-500">({filteredWhiteCards.length})</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {filteredWhiteCards.map(c => (
                  <WhiteCardView key={c.id} card={c} size="compact" />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal: Add Custom Card Form */}
        {showAddForm && (
          <div className="absolute inset-0 bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-lg bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h3 className="text-base font-bold text-stone-100">
                    Add Custom Sanskar Card
                  </h3>
                </div>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="p-1 text-stone-400 hover:text-stone-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateCard} className="space-y-4 text-xs">
                {/* Type Selection */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewCardIsBlack(true)}
                    className={`py-2 px-3 rounded-xl border font-semibold text-center transition-all ${
                      newCardIsBlack
                        ? 'bg-stone-950 text-amber-300 border-amber-500 shadow-sm'
                        : 'bg-stone-800 text-stone-400 border-stone-700'
                    }`}
                  >
                    Black Prompt Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCardIsBlack(false)}
                    className={`py-2 px-3 rounded-xl border font-semibold text-center transition-all ${
                      !newCardIsBlack
                        ? 'bg-stone-100 text-stone-950 border-stone-200 shadow-sm'
                        : 'bg-stone-800 text-stone-400 border-stone-700'
                    }`}
                  >
                    White Answer Card
                  </button>
                </div>

                {/* Pick count if black */}
                {newCardIsBlack && (
                  <div className="flex items-center justify-between bg-stone-950 p-2.5 rounded-xl border border-stone-800">
                    <span className="text-stone-300">How many answers should players pick?</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setNewCardPick(1)}
                        className={`px-3 py-1 rounded-lg font-bold ${
                          newCardPick === 1 ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-300'
                        }`}
                      >
                        Pick 1
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewCardPick(2)}
                        className={`px-3 py-1 rounded-lg font-bold ${
                          newCardPick === 2 ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-300'
                        }`}
                      >
                        Pick 2
                      </button>
                    </div>
                  </div>
                )}

                {/* Card Text Input */}
                <div className="space-y-1">
                  <label className="text-stone-300 font-semibold">
                    {newCardIsBlack
                      ? 'Prompt Text (use "____" for the blank space)'
                      : 'Punchline / Answer Text'}
                  </label>
                  <textarea
                    rows={3}
                    placeholder={
                      newCardIsBlack
                        ? 'Why did Pandit Ji tell Mummy to throw away the microwave? ____.'
                        : 'Accidentally touching the wrong elder\'s feet at the crowded buffet'
                    }
                    value={newCardText}
                    onChange={e => setNewCardText(e.target.value)}
                    className="w-full p-3 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 rounded-xl text-stone-400 hover:text-stone-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold shadow-md transition-all active:scale-95"
                  >
                    Add to Game
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Import JSON */}
        {importExportModal && (
          <div className="absolute inset-0 bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-lg bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-stone-100">
                  Import Deck JSON
                </h3>
                <button
                  onClick={() => setImportExportModal(false)}
                  className="p-1 text-stone-400 hover:text-stone-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <p className="text-stone-400">
                  Paste a JSON object with `blackCards` and `whiteCards` arrays:
                </p>
                <textarea
                  rows={6}
                  value={importJsonText}
                  onChange={e => setImportJsonText(e.target.value)}
                  placeholder={`{\n  "blackCards": [{ "text": "What will Auntie whisper? ____.", "pick": 1 }],\n  "whiteCards": [{ "text": "Sharma ji ka beta's resume" }]\n}`}
                  className="w-full font-mono p-3 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                />
                {importStatus && (
                  <p className="text-amber-400 font-semibold">{importStatus}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setImportExportModal(false)}
                  className="px-4 py-2 rounded-xl text-stone-400 hover:text-stone-200 text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportJson}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-md transition-all active:scale-95"
                >
                  Import Deck
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
