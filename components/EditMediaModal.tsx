import React, { useState, useEffect } from 'react';
import { X, Trash2, Save, Tv, Film, Ticket, MonitorPlay } from 'lucide-react';
import { MediaItem, WatchStatus, PersonalRating, ReleaseSource, VodProvider } from '../types';

interface EditMediaModalProps {
  item: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedItem: MediaItem) => void;
  onDelete: (id: string) => void;
}

const EditMediaModal: React.FC<EditMediaModalProps> = ({ item, isOpen, onClose, onSave, onDelete }) => {
  const [status, setStatus] = useState<WatchStatus>('watchlist');
  const [season, setSeason] = useState<number>(1);
  const [episode, setEpisode] = useState<number>(1);
  
  // Specific for Movies
  const [personalRating, setPersonalRating] = useState<PersonalRating | undefined>(undefined);
  const [releaseSource, setReleaseSource] = useState<ReleaseSource>('Theater');
  const [vodProvider, setVodProvider] = useState<VodProvider>('Netflix');

  useEffect(() => {
    if (item) {
      setStatus(item.status);
      setSeason(item.progress.season || 1);
      setEpisode(item.progress.episode || 1);
      setPersonalRating(item.personalRating);
      setReleaseSource(item.releaseSource || 'Theater');
      setVodProvider(item.vodProvider || 'Netflix');
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSave = () => {
    const updated: MediaItem = {
      ...item,
      status,
      // Only save movie-specific fields if it's a movie
      personalRating: item.type === 'movie' ? personalRating : undefined,
      releaseSource: item.type === 'movie' ? releaseSource : undefined,
      vodProvider: (item.type === 'movie' && releaseSource === 'VOD') ? vodProvider : undefined,
      
      progress: {
        ...item.progress,
        season: item.type === 'series' ? season : undefined,
        episode: item.type === 'series' ? episode : undefined,
      }
    };
    onSave(updated);
  };

  const isSeries = item.type === 'series';
  const isMovie = item.type === 'movie';

  const ratingOptions: { value: PersonalRating; color: string }[] = [
    { value: 'Excellent', color: 'bg-green-500 border-green-500 text-black' },
    { value: 'Good', color: 'bg-blue-500 border-blue-500 text-white' },
    { value: 'Average', color: 'bg-yellow-500 border-yellow-500 text-black' },
    { value: 'Bad', color: 'bg-orange-600 border-orange-600 text-white' },
    { value: 'Terrible', color: 'bg-red-600 border-red-600 text-white' },
  ];

  const vodProviders: VodProvider[] = ['Netflix', 'Hulu', 'Prime Video', 'Disney+', 'HBO Max', 'Apple TV+', 'Peacock', 'Paramount+', 'Other'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#181818] w-full max-w-lg rounded-lg shadow-2xl border border-gray-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="relative h-32 flex-shrink-0 bg-gradient-to-r from-gray-900 to-black p-6 flex flex-col justify-end overflow-hidden">
             {item.backdropPath ? (
                 <div className="absolute inset-0 opacity-40">
                    <img src={`https://image.tmdb.org/t/p/w780${item.backdropPath}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#181818] to-transparent"></div>
                 </div>
             ) : (
                <div className="absolute inset-0 bg-gradient-to-r from-red-900 to-black opacity-50"></div>
             )}

            <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors backdrop-blur-md z-10"
            >
                <X size={20} />
            </button>
            <div className="relative z-10 flex items-center gap-2 text-gray-300 text-xs font-bold uppercase tracking-wider mb-1">
                {isSeries ? <Tv size={12} /> : <Film size={12} />}
                {item.type}
            </div>
            <h2 className="relative z-10 text-2xl md:text-3xl font-bold text-white leading-tight line-clamp-1" title={item.title}>{item.title}</h2>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
            
            {/* Status Selector */}
            <div>
                <label className="block text-gray-400 text-sm font-medium mb-3">Watch Status</label>
                <div className="grid grid-cols-3 gap-2">
                    {(['watchlist', 'in-progress', 'watched'] as WatchStatus[]).map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatus(s)}
                            className={`py-2 px-3 rounded-md text-sm font-semibold capitalize transition-all border ${
                                status === s 
                                ? 'bg-red-600 border-red-600 text-white shadow-lg' 
                                : 'bg-[#2b2b2b] border-transparent text-gray-400 hover:bg-[#333]'
                            }`}
                        >
                            {s === 'in-progress' ? (isSeries ? 'Watching' : 'In Progress') : s}
                        </button>
                    ))}
                </div>
            </div>

             {/* MOVIE SPECIFIC: Release Source (Theatrical vs VOD) */}
             {isMovie && (
                <div className="bg-[#222] p-4 rounded-lg border border-gray-700">
                    <label className="block text-gray-300 text-sm font-medium mb-3">Release Source</label>
                    <div className="flex gap-2 mb-4">
                        <button 
                            onClick={() => setReleaseSource('Theater')}
                            className={`flex-1 py-2 flex items-center justify-center gap-2 rounded text-sm font-bold transition-colors ${
                                releaseSource === 'Theater' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#333]'
                            }`}
                        >
                            <Ticket size={16} /> Theater
                        </button>
                        <button 
                            onClick={() => setReleaseSource('VOD')}
                            className={`flex-1 py-2 flex items-center justify-center gap-2 rounded text-sm font-bold transition-colors ${
                                releaseSource === 'VOD' 
                                ? 'bg-purple-600 text-white' 
                                : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#333]'
                            }`}
                        >
                            <MonitorPlay size={16} /> Original VOD
                        </button>
                    </div>

                    {/* VOD Provider Selector */}
                    {releaseSource === 'VOD' && (
                        <div className="animate-in slide-in-from-top-2">
                             <label className="block text-gray-500 text-xs font-medium mb-2 uppercase tracking-wide">Streaming Service</label>
                             <div className="grid grid-cols-2 gap-2">
                                {vodProviders.map(provider => (
                                    <button
                                        key={provider}
                                        onClick={() => setVodProvider(provider)}
                                        className={`px-2 py-1.5 text-xs rounded text-left truncate transition-colors border ${
                                            vodProvider === provider 
                                            ? 'bg-purple-900/30 border-purple-500 text-purple-200' 
                                            : 'bg-[#1a1a1a] border-transparent text-gray-400 hover:border-gray-600'
                                        }`}
                                    >
                                        {provider}
                                    </button>
                                ))}
                             </div>
                        </div>
                    )}
                </div>
            )}


            {/* SERIES SPECIFIC: Progress */}
            {isSeries && status === 'in-progress' && (
                <div className="bg-[#222] p-4 rounded-lg border border-gray-700 animate-in slide-in-from-top-2">
                    <label className="block text-gray-300 text-sm font-medium mb-3">Current Progress</label>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <span className="text-xs text-gray-500 mb-1 block">Season</span>
                            <div className="flex items-center bg-[#111] rounded border border-gray-700">
                                <button onClick={() => setSeason(Math.max(1, season - 1))} className="px-3 py-2 text-gray-400 hover:text-white">-</button>
                                <input 
                                    type="number" 
                                    value={season} 
                                    onChange={(e) => setSeason(parseInt(e.target.value) || 1)}
                                    className="w-full bg-transparent text-center text-white font-mono focus:outline-none"
                                />
                                <button onClick={() => setSeason(season + 1)} className="px-3 py-2 text-gray-400 hover:text-white">+</button>
                            </div>
                        </div>
                        <div className="flex-1">
                             <span className="text-xs text-gray-500 mb-1 block">Episode</span>
                            <div className="flex items-center bg-[#111] rounded border border-gray-700">
                                <button onClick={() => setEpisode(Math.max(1, episode - 1))} className="px-3 py-2 text-gray-400 hover:text-white">-</button>
                                <input 
                                    type="number" 
                                    value={episode} 
                                    onChange={(e) => setEpisode(parseInt(e.target.value) || 1)}
                                    className="w-full bg-transparent text-center text-white font-mono focus:outline-none"
                                />
                                <button onClick={() => setEpisode(episode + 1)} className="px-3 py-2 text-gray-400 hover:text-white">+</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MOVIE SPECIFIC: Personal Rating (Only if Watched) */}
            {isMovie && status === 'watched' && (
                <div className="animate-in fade-in">
                     <label className="block text-gray-400 text-sm font-medium mb-3">My Rating</label>
                     <div className="flex flex-wrap gap-2">
                        {ratingOptions.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setPersonalRating(opt.value)}
                                className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                                    personalRating === opt.value
                                    ? `${opt.color} shadow-lg scale-105`
                                    : 'bg-[#2b2b2b] border-transparent text-gray-400 hover:bg-[#333]'
                                }`}
                            >
                                {opt.value}
                            </button>
                        ))}
                     </div>
                </div>
            )}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 p-6 pt-4 border-t border-gray-800 bg-[#181818]">
            <button 
                onClick={() => onDelete(item.id)}
                className="px-4 py-2 bg-transparent border border-gray-700 text-gray-400 hover:text-red-500 hover:border-red-500 rounded-md transition-colors flex items-center gap-2 text-sm font-medium"
            >
                <Trash2 size={16} /> <span className="hidden sm:inline">Delete</span>
            </button>
            <div className="flex-1"></div>
            <button 
                onClick={handleSave}
                className="px-6 py-2 bg-white text-black hover:bg-gray-200 rounded-md font-bold transition-colors flex items-center gap-2 shadow-lg shadow-white/10"
            >
                <Save size={16} /> Save Changes
            </button>
        </div>

      </div>
    </div>
  );
};

export default EditMediaModal;
