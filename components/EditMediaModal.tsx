import React, { useState, useEffect } from 'react';
import { X, Trash2, Save, Tv, Film, Ticket, MonitorPlay, Minus, Plus as PlusIcon, CheckCircle2, Play, ChevronRight } from 'lucide-react';
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

  const handleNextEpisode = () => {
    setEpisode(prev => prev + 1);
    if (navigator.vibrate) navigator.vibrate(15);
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
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose}></div>

      <div className="relative w-full max-w-lg bg-[#111] md:rounded-2xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh] animate-in slide-in-from-bottom-10 duration-300 border-t md:border border-white/10">
        
        <div className="md:hidden w-full flex justify-center pt-3 pb-1 absolute top-0 z-20 pointer-events-none">
            <div className="w-12 h-1.5 bg-gray-700 rounded-full"></div>
        </div>

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
                className="absolute top-4 right-4 p-2 bg-black/30 hover:bg-black/50 rounded-full text-white backdrop-blur-md z-30 md:flex hidden items-center justify-center"
            >
                <X size={20} />
            </button>

            <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                <div className="flex items-center gap-2 text-white/70 text-[10px] font-black uppercase tracking-[0.1em] mb-1.5">
                    {isSeries ? <Tv size={12} /> : <Film size={12} />}
                    <span>{item.type}</span>
                    <span>•</span>
                    <span>{item.year || 'N/A'}</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-white leading-tight line-clamp-2 drop-shadow-md" title={item.title}>{item.title}</h2>
            </div>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1 pb-safe bg-gradient-to-b from-[#111] to-black">
            
            <div className="bg-[#1c1c1e] p-1 rounded-xl flex border border-white/5">
                {(['watchlist', 'in-progress', 'watched'] as WatchStatus[]).map((s) => (
                    <button
                        key={s}
                        onClick={() => setStatus(s)}
                        className={`flex-1 py-2 text-[13px] font-bold rounded-lg transition-all ${
                            status === s 
                            ? 'bg-[#3a3a3c] text-white shadow-lg' 
                            : 'text-gray-500 hover:text-white'
                        }`}
                    >
                        {s === 'in-progress' ? 'Watching' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                ))}
            </div>

            {isSeries && status === 'in-progress' && (
                <div className="space-y-4 animate-in slide-in-from-top-4 fade-in">
                    {/* Big "Up Next" Dashboard */}
                    <div className="bg-gradient-to-br from-blue-600/20 to-indigo-900/40 p-5 rounded-2xl border border-blue-500/20 shadow-xl group">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-blue-400 text-xs font-black uppercase tracking-[0.1em] mb-1">Up Next</h3>
                                <p className="text-white text-2xl font-black tracking-tight">S{season} E{episode}</p>
                            </div>
                            <div className="bg-blue-600 p-3 rounded-full shadow-lg group-active:scale-90 transition-transform">
                                <Play size={20} fill="white" className="text-white" />
                            </div>
                        </div>
                        <button 
                            onClick={handleNextEpisode}
                            className="w-full bg-white text-black py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-gray-100 active:scale-[0.98] transition-all shadow-xl"
                        >
                            Mark Episode {episode} Finished <ChevronRight size={16} strokeWidth={3} />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#1c1c1e] p-4 rounded-xl border border-white/5 flex flex-col items-center">
                            <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">Season</span>
                            <div className="flex items-center gap-4">
                                <button onClick={() => setSeason(Math.max(1, season - 1))} className="text-gray-400 hover:text-white transition-colors"><Minus size={18}/></button>
                                <span className="text-xl font-black text-white w-6 text-center">{season}</span>
                                <button onClick={() => setSeason(season + 1)} className="text-gray-400 hover:text-white transition-colors"><PlusIcon size={18}/></button>
                            </div>
                        </div>
                        <div className="bg-[#1c1c1e] p-4 rounded-xl border border-white/5 flex flex-col items-center">
                            <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">Episode</span>
                            <div className="flex items-center gap-4">
                                <button onClick={() => setEpisode(Math.max(1, episode - 1))} className="text-gray-400 hover:text-white transition-colors"><Minus size={18}/></button>
                                <span className="text-xl font-black text-white w-6 text-center">{episode}</span>
                                <button onClick={() => setEpisode(episode + 1)} className="text-gray-400 hover:text-white transition-colors"><PlusIcon size={18}/></button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

             {isMovie && (
                <div className="space-y-4">
                    <div className="bg-[#1c1c1e] p-1 rounded-xl flex border border-white/5">
                        <button 
                            onClick={() => setReleaseSource('Theater')}
                            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                                releaseSource === 'Theater' 
                                ? 'bg-[#3a3a3c] text-blue-400 shadow-md' 
                                : 'text-gray-500'
                            }`}
                        >
                            <Ticket size={16} /> Theater
                        </button>
                        <button 
                            onClick={() => setReleaseSource('VOD')}
                            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                                releaseSource === 'VOD' 
                                ? 'bg-[#3a3a3c] text-purple-400 shadow-md' 
                                : 'text-gray-500'
                            }`}
                        >
                            <MonitorPlay size={16} /> VOD / Digital
                        </button>
                    </div>

                    {releaseSource === 'VOD' && (
                        <div className="p-4 bg-[#1c1c1e] rounded-xl border border-white/5 animate-in fade-in slide-in-from-top-2">
                             <label className="block text-gray-500 text-[9px] font-black uppercase tracking-widest mb-3">Platform</label>
                             <div className="flex flex-wrap gap-1.5">
                                {vodProviders.map(provider => (
                                    <button
                                        key={provider}
                                        onClick={() => setVodProvider(provider)}
                                        className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all border ${
                                            vodProvider === provider 
                                            ? 'bg-purple-600/20 border-purple-500 text-purple-300' 
                                            : 'bg-black/20 border-white/5 text-gray-500'
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

            {isMovie && status === 'watched' && (
                <div className="animate-in fade-in p-4 bg-[#1c1c1e] rounded-xl border border-white/5">
                     <label className="block text-gray-500 text-[9px] font-black uppercase tracking-widest mb-3">Review</label>
                     <div className="flex flex-wrap gap-2">
                        {ratingOptions.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setPersonalRating(opt.value)}
                                className={`px-4 py-2 rounded-lg text-[11px] font-black transition-all active:scale-95 ${
                                    personalRating === opt.value
                                    ? `${opt.color} shadow-lg ring-2 ring-white/10`
                                    : 'bg-black/30 text-gray-500 border border-white/5'
                                }`}
                            >
                                {opt.value}
                            </button>
                        ))}
                     </div>
                </div>
            )}

            <div className="flex gap-4 pt-4 mt-auto">
                 <button 
                    onClick={() => {
                        if (isDeleting) onDelete(item.id);
                        else {
                            setIsDeleting(true);
                            setTimeout(() => setIsDeleting(false), 3000);
                        }
                    }}
                    className={`h-14 px-5 rounded-xl font-black transition-all flex items-center justify-center gap-2 ${
                        isDeleting 
                        ? 'flex-1 bg-red-600 text-white animate-pulse' 
                        : 'bg-[#1c1c1e] text-gray-500 border border-white/5 hover:text-red-500'
                    }`}
                >
                    <Trash2 size={20} />
                    {isDeleting && <span className="text-xs">Confirm Delete</span>}
                </button>
                
                <button 
                    onClick={handleSave}
                    className="flex-1 bg-white text-black h-14 rounded-xl font-black text-base hover:bg-gray-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-2xl"
                >
                    <Save size={20} /> Save Changes
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default EditMediaModal;