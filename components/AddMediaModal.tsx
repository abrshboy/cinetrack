import React, { useState } from 'react';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#181818] w-full max-w-3xl rounded-lg shadow-2xl border border-gray-800 overflow-hidden flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#181818]">
            <h2 className="text-xl font-bold text-white">Add to Library</h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded-full transition-colors">
                <X size={24} className="text-gray-400" />
            </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-[#141414]">
            <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search for movies or TV series..."
                    className="w-full bg-[#2b2b2b] text-white pl-10 pr-4 py-3 rounded-md border border-transparent focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 transition-all"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                />
                <button 
                    type="submit" 
                    disabled={isLoading || !query.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={16}/> : 'Search'}
                </button>
            </form>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-500 gap-3">
                    <Loader2 className="animate-spin text-red-600" size={32} />
                    <p>Searching TMDB...</p>
                </div>
            ) : results.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {results.map((result, idx) => (
                        <div key={idx} className="flex gap-3 bg-[#2b2b2b] p-3 rounded-md hover:bg-[#333] transition-colors group">
                            {/* Poster Thumbnail */}
                            <div className={`w-16 h-24 flex-shrink-0 rounded overflow-hidden bg-gray-800 relative`}>
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
                                        <span className="flex-shrink-0 text-[10px] uppercase font-bold text-gray-400 border border-gray-600 px-1 rounded">
                                            {result.type === 'movie' ? 'MOV' : 'TV'}
                                        </span>
                                    </div>
                                    <span className="text-xs text-gray-400">{result.year}</span>
                                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{result.description}</p>
                                </div>
                                <button 
                                    onClick={() => onAdd(result)}
                                    className="mt-2 w-full py-1.5 flex items-center justify-center gap-2 bg-white text-black text-xs font-bold rounded hover:bg-gray-200 transition-colors"
                                >
                                    <Plus size={14} /> Add to List
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
                    <Search size={48} className="mb-4 opacity-20" />
                    <p>Search specifically (e.g., "Inception", "Breaking Bad")</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default AddMediaModal;
