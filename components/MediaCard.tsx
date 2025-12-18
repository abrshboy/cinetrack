import React from 'react';
import { MediaItem } from '../types';
import { Play, Check, MoreVertical, Tv, Film, Star, MonitorPlay, ChevronRight } from 'lucide-react';

interface MediaCardProps {
  item: MediaItem;
  onClick: (item: MediaItem) => void;
  onQuickAction?: (item: MediaItem, action: 'watched' | 'increment') => void;
}

const MediaCard: React.FC<MediaCardProps> = ({ item, onClick, onQuickAction }) => {
  const isSeries = item.type === 'series';
  const isMovie = item.type === 'movie';
  
  const getStatusColor = () => {
    switch (item.status) {
      case 'watched': return 'bg-green-500';
      case 'in-progress': return 'bg-blue-500';
      default: return 'bg-gray-600';
    }
  };

  const gradientSeed = item.title.length % 5;
  const gradients = [
    'from-red-900 to-gray-900',
    'from-blue-900 to-gray-900',
    'from-purple-900 to-gray-900',
    'from-emerald-900 to-gray-900',
    'from-orange-900 to-gray-900',
  ];

  const posterUrl = item.posterPath 
    ? `https://image.tmdb.org/t/p/w500${item.posterPath}` 
    : null;

  return (
    <div 
      className="group flex flex-col gap-2.5 cursor-pointer w-full touch-manipulation active:scale-[0.97] transition-all duration-200"
      onClick={() => onClick(item)}
    >
      <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-[#1c1c1e] shadow-2xl ring-1 ring-white/5 group-hover:ring-white/20">
        
        {posterUrl ? (
            <img 
                src={posterUrl} 
                alt={item.title} 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
            />
        ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${gradients[gradientSeed]} flex items-center justify-center`}>
                 {isSeries ? <Tv size={48} className="opacity-20 text-white"/> : <Film size={48} className="opacity-20 text-white"/>}
            </div>
        )}

        {isMovie && item.releaseSource === 'VOD' && (
            <div className="absolute top-2 right-2 z-10">
                <div className="bg-black/80 backdrop-blur-md text-[8px] font-black text-white px-2 py-0.5 rounded-full border border-white/10 shadow-lg flex items-center gap-1 uppercase tracking-wider">
                    <MonitorPlay size={9} className="text-purple-400"/>
                    {item.vodProvider || 'VOD'}
                </div>
            </div>
        )}

        {item.status !== 'watchlist' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40 backdrop-blur-sm overflow-hidden">
                <div 
                    className={`h-full ${getStatusColor()} shadow-[0_0_12px_currentColor] transition-all duration-700`} 
                    style={{ width: item.status === 'watched' ? '100%' : '60%'}} 
                />
            </div>
        )}

        {isSeries && item.status === 'in-progress' && (
             <div className="absolute bottom-3 right-3 z-10 pointer-events-none">
                 <div className="bg-white/10 backdrop-blur-md border border-white/10 text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg shadow-2xl flex items-center gap-1.5">
                     <span className="text-blue-400">S{item.progress.season}</span>
                     <span className="opacity-40">|</span>
                     <span>E{item.progress.episode}</span>
                 </div>
             </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
             <div className="w-full bg-white/20 backdrop-blur-md text-white text-[10px] font-black py-2 rounded-lg text-center flex items-center justify-center gap-1 uppercase tracking-widest">
                Details <ChevronRight size={12} strokeWidth={3} />
             </div>
        </div>
      </div>

      <div className="flex flex-col gap-0.5 px-1">
        <div className="flex justify-between items-start gap-2">
            <h3 className="font-black text-white text-[14px] leading-snug line-clamp-1 flex-1" title={item.title}>
                {item.title}
            </h3>
            
            {isMovie && item.status === 'watched' && item.personalRating ? (
                 <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                     item.personalRating === 'Excellent' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 
                     item.personalRating === 'Good' ? 'bg-blue-500 shadow-[0_0_8px_#3b82f6]' : 
                     'bg-gray-600'
                 }`} />
            ) : (
                item.voteAverage !== undefined && item.voteAverage > 0 && (
                    <div className="flex items-center gap-0.5 text-[10px] font-black text-gray-500 mt-1">
                        <Star size={10} className="text-yellow-500 fill-yellow-500" />
                        <span>{item.voteAverage.toFixed(1)}</span>
                    </div>
                )
            )}
        </div>
        
        <div className="flex items-center text-[12px] text-gray-500 font-bold opacity-80">
             <span>{item.year || 'N/A'}</span>
             <span className="mx-1.5 opacity-20">•</span>
             <span className="uppercase text-[9px] tracking-widest">{item.type === 'movie' ? 'Film' : 'Show'}</span>
        </div>
      </div>
    </div>
  );
};

export default MediaCard;