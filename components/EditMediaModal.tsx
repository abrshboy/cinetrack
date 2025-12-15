import React, { useState, useEffect } from 'react';
import { X, Trash2, Save, Tv, Film, Ticket, MonitorPlay, Minus, Plus as PlusIcon, CheckCircle2 } from 'lucide-react';
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
  const [isDeleting, setIsDeleting] = useState(false);
  
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
      setIsDeleting(false);
    }
  }, [item, isOpen]);

  // Handle closing animation/logic if needed, but for now direct render check
  if (!isOpen || !item) return null;

  const handleSave = () => {
    const updated: MediaItem = {
      ...item,
      status,
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
    { value: 'Excellent', color: 'bg-green-500 text-white border-none' },
    { value: 'Good', color: 'bg-blue-500 text-white border-none' },
    { value: 'Average', color: 'bg-yellow-500 text-black border-none' },
    { value: 'Bad', color: 'bg-orange-600 text-white border-none' },
    { value: 'Terrible', color: 'bg-red-600 text-white border-none' },
  ];

  const vodProviders: VodProvider[] = ['Netflix', 'Hulu', 'Prime Video', 'Disney+', 'HBO Max', 'Apple TV+', 'Peacock', 'Paramount+', 'Other'];

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal Content - Bottom Sheet on Mobile, Center Card on Desktop */}
      <div className="relative w-full max-w-lg bg-[#111] md:rounded-2xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh] animate-in slide-in-from-bottom-10 duration-300">
        
        {/* Mobile Pull Indicator */}
        <div className="md:hidden w-full flex justify-center pt-3 pb-1 absolute top-0 z-20 pointer-events-none">
            <div className="w-12 h-1.5 bg-gray-700 rounded-full"></div>
        </div>

        {/* Header Image */}
        <div className="relative h-48 md:h-56 flex-shrink-0">
             {item.backdropPath ? (
                 <>
                    <img src={`https://image.tmdb.org/t/p/w780${item.backdropPath}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-[#111]/40 to-transparent"></div>
                 </>
             ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-black"></div>
             )}

            <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-black/30 hover:bg-black/50 rounded-full text-white backdrop-blur-md z-30 md:block hidden"
            >
                <X size={20} />
            </button>

            <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                <div className="flex items-center gap-2 text-white/70 text-xs font-bold uppercase tracking-wider mb-2">
                    {isSeries ? <Tv size={12} /> : <Film size={12} />}
                    <span>{item.type}</span>
                    <span>•</span>
                    <span>{item.year || 'N/A'}</span>
                </div>
                <h2 className="text-3xl font-bold text-white leading-tight line-clamp-2 shadow-black drop-shadow-lg" title={item.title}>{item.title}</h2>
            </div>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar flex-1 pb-safe">
            
            {/* Watch Status Segmented Control */}
            <div className="bg-[#1c1c1e] p-1 rounded-xl flex">
                {(['watchlist', 'in-progress', 'watched'] as WatchStatus[]).map((s) => (
                    <button
                        key={s}
                        onClick={() => setStatus(s)}
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                            status === s 
                            ? 'bg-[#636366] text-white shadow-md' 
                            : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        {s === 'in-progress' ? 'Watching' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                ))}
            </div>

            {/* SERIES PROGRESS UI */}
            {isSeries && status === 'in-progress' && (
                <div className="space-y-3 animate-in slide-in-from-top-4 fade-in">
                    {/* Season Row */}
                    <div className="flex items-center justify-between bg-[#1c1c1e] p-4 pr-2 rounded-2xl border border-white/5">
                        <div className="flex flex-col pl-2">
                            <span className="text-white font-semibold text-lg">Season</span>
                            <span className="text-gray-500 text-xs uppercase tracking-wide">Current</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setSeason(Math.max(1, season - 1))} className="w-12 h-12 rounded-full bg-[#2c2c2e] text-white flex items-center justify-center active:scale-90 transition-transform touch-manipulation">
                                <Minus size={22} />
                            </button>
                            <span className="w-10 text-center text-2xl font-bold font-mono text-white tabular-nums">{season}</span>
                            <button onClick={() => setSeason(season + 1)} className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center active:scale-90 transition-transform shadow-lg shadow-white/10 touch-manipulation">
                                <PlusIcon size={24} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                    
                    {/* Episode Row */}
                    <div className="flex items-center justify-between bg-[#1c1c1e] p-4 pr-2 rounded-2xl border border-white/5">
                        <div className="flex flex-col pl-2">
                            <span className="text-white font-semibold text-lg">Episode</span>
                            <span className="text-gray-500 text-xs uppercase tracking-wide">Current</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setEpisode(Math.max(1, episode - 1))} className="w-12 h-12 rounded-full bg-[#2c2c2e] text-white flex items-center justify-center active:scale-90 transition-transform touch-manipulation">
                                <Minus size={22} />
                            </button>
                            <span className="w-10 text-center text-2xl font-bold font-mono text-white tabular-nums">{episode}</span>
                            <button onClick={() => {
                                setEpisode(episode + 1);
                                // Optional haptic feedback logic here if using Web Vibrate API
                                if (navigator.vibrate) navigator.vibrate(10);
                            }} className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center active:scale-90 transition-transform shadow-lg shadow-white/10 touch-manipulation">
                                <PlusIcon size={24} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

             {/* MOVIE SPECIFIC: Release Source */}
             {isMovie && (
                <div className="bg-[#1c1c1e] p-4 rounded-2xl border border-white/5">
                    <label className="block text-gray-400 text-xs font-bold uppercase tracking-wide mb-3">Release Type</label>
                    <div className="flex gap-3 mb-4">
                        <button 
                            onClick={() => setReleaseSource('Theater')}
                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all border flex items-center justify-center gap-2 ${
                                releaseSource === 'Theater' 
                                ? 'bg-blue-600/20 border-blue-500 text-blue-400' 
                                : 'bg-[#2c2c2e] border-transparent text-gray-400'
                            }`}
                        >
                            <Ticket size={18} /> Theater
                        </button>
                        <button 
                            onClick={() => setReleaseSource('VOD')}
                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all border flex items-center justify-center gap-2 ${
                                releaseSource === 'VOD' 
                                ? 'bg-purple-600/20 border-purple-500 text-purple-400' 
                                : 'bg-[#2c2c2e] border-transparent text-gray-400'
                            }`}
                        >
                            <MonitorPlay size={18} /> Original VOD
                        </button>
                    </div>

                    {/* VOD Provider Selector */}
                    {releaseSource === 'VOD' && (
                        <div className="animate-in slide-in-from-top-2">
                             <label className="block text-gray-500 text-xs font-medium mb-2 uppercase tracking-wide">Platform</label>
                             <div className="flex flex-wrap gap-2">
                                {vodProviders.map(provider => (
                                    <button
                                        key={provider}
                                        onClick={() => setVodProvider(provider)}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all border ${
                                            vodProvider === provider 
                                            ? 'bg-purple-500 text-white border-purple-500' 
                                            : 'bg-[#2c2c2e] border-transparent text-gray-400'
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

            {/* MOVIE SPECIFIC: Personal Rating */}
            {isMovie && status === 'watched' && (
                <div className="animate-in fade-in">
                     <label className="block text-gray-400 text-xs font-bold uppercase tracking-wide mb-3">Rating</label>
                     <div className="flex flex-wrap gap-2">
                        {ratingOptions.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setPersonalRating(opt.value)}
                                className={`px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 ${
                                    personalRating === opt.value
                                    ? `${opt.color} shadow-lg scale-105 ring-2 ring-white/20`
                                    : 'bg-[#2c2c2e] text-gray-400 hover:bg-[#3a3a3c]'
                                }`}
                            >
                                {opt.value}
                            </button>
                        ))}
                     </div>
                </div>
            )}

            {/* Footer Actions */}
            <div className="flex gap-4 pt-4 mt-auto">
                 <button 
                    onClick={() => {
                        if (isDeleting) {
                            onDelete(item.id);
                        } else {
                            setIsDeleting(true);
                            setTimeout(() => setIsDeleting(false), 3000);
                        }
                    }}
                    className={`p-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                        isDeleting 
                        ? 'flex-1 bg-red-600 text-white animate-pulse' 
                        : 'w-14 bg-[#2c2c2e] text-gray-400 hover:text-red-500'
                    }`}
                >
                    <Trash2 size={20} />
                    {isDeleting && <span>Confirm</span>}
                </button>
                
                <button 
                    onClick={handleSave}
                    className="flex-1 bg-white text-black p-4 rounded-xl font-bold text-lg hover:bg-gray-200 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl"
                >
                    <Save size={20} /> Save
                </button>
            </div>
            
            {/* Safe Area Spacer for bottom sheet */}
            <div className="h-6 md:hidden"></div>
        </div>
      </div>
    </div>
  );
};

export default EditMediaModal;