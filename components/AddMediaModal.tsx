import React, { useState, useEffect } from 'react';
import { Search, Loader2, Plus, X, Film, Tv } from 'lucide-react';
import { searchMedia } from '../services/tmdbService';
import { SearchResult } from '../types';

interface AddMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (result: SearchResult) => void;
}

const AddMediaModal: React.FC<AddMediaModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Reset state when modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      // Small delay to prevent flickering while closing
      const timer = setTimeout(() => {
        setQuery('');
        setResults([]);
        setHasSearched(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setHasSearched(true);
    const data = await searchMedia(query);
    setResults(data);
    setIsLoading(false);
  };

  const handleAddClick = (result: SearchResult) => {
    onAdd(result);
    // We do not close automatically here because the parent component handles logic, 
    // but usually user might want to add multiple. 
    // However, per request to "clear for next search", we reset query if we want to stay open,
    // OR if the parent closes the modal, the useEffect above handles it.
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#181818] w-full max-w-3xl rounded-xl shadow-2xl border border-gray-800 overflow-hidden flex flex-col max-h-[85vh] mt-10 md:mt-0">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#181818]">
            <h2 className="text-lg md:text-xl font-bold text-white">Add to Library</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full transition-colors active:scale-95">
                <X size={24} className="text-gray-400" />
            </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-[#141414]">
            <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="search"
                    enterKeyHint="search"
                    placeholder="Search movies or TV..."
                    className="w-full bg-[#2b2b2b] text-white pl-10 pr-16 py-3.5 rounded-lg border border-transparent focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 transition-all text-base"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                />
                <button 
                    type="submit" 
                    disabled={isLoading || !query.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={18}/> : 'Search'}
                </button>
            </form>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-black/20">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-500 gap-3">
                    <Loader2 className="animate-spin text-red-600" size={32} />
                    <p>Searching TMDB...</p>
                </div>
            ) : results.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {results.map((result, idx) => (
                        <div key={idx} className="flex gap-3 bg-[#222] p-3 rounded-lg border border-gray-800/50 hover:bg-[#2a2a2a] transition-colors group">
                            {/* Poster Thumbnail */}
                            <div className={`w-16 h-24 flex-shrink-0 rounded overflow-hidden bg-gray-800 relative shadow-sm`}>
                                {result.posterPath ? (
                                    <img 
                                        src={`https://image.tmdb.org/t/p/w200${result.posterPath}`} 
                                        alt={result.title} 
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                                        {result.type === 'movie' ? <Film size={20}/> : <Tv size={20}/>}
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 flex flex-col justify-between overflow-hidden">
                                <div>
                                    <div className="flex justify-between items-start gap-2">
                                        <h4 className="font-bold text-white text-sm line-clamp-1" title={result.title}>{result.title}</h4>
                                        <span className={`flex-shrink-0 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                                            result.type === 'movie' ? 'text-blue-400 border-blue-900 bg-blue-900/10' : 'text-purple-400 border-purple-900 bg-purple-900/10'
                                        }`}>
                                            {result.type === 'movie' ? 'MOV' : 'TV'}
                                        </span>
                                    </div>
                                    <span className="text-xs text-gray-400 block mt-0.5">{result.year}</span>
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{result.description}</p>
                                </div>
                                <button 
                                    onClick={() => handleAddClick(result)}
                                    className="mt-3 w-full py-2 flex items-center justify-center gap-2 bg-white text-black text-xs font-bold rounded hover:bg-gray-200 active:scale-95 transition-all"
                                >
                                    <Plus size={14} /> Add to Library
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : hasSearched ? (
                 <div className="text-center text-gray-500 py-10">
                    No results found. Try a different query.
                </div>
            ) : (
                <div className="text-center text-gray-600 py-10 flex flex-col items-center">
                    <Search size={48} className="mb-4 opacity-10" />
                    <p className="text-sm">Search specifically (e.g., "Inception")</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default AddMediaModal;