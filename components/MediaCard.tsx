import React from 'react';
import { MediaItem } from '../types';
import { Play, Check, MoreVertical, Tv, Film, Star, MonitorPlay } from 'lucide-react';

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

  const formatRuntime = (minutes?: number) => {
    if (!minutes) return '';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const getPersonalRatingColor = (rating: string) => {
     switch(rating) {
         case 'Excellent': return 'bg-green-500 text-black';
         case 'Good': return 'bg-blue-500 text-white';
         case 'Average': return 'bg-yellow-500 text-black';
         case 'Bad': return 'bg-orange-600 text-white';
         case 'Terrible': return 'bg-red-600 text-white';
         default: return 'bg-gray-500 text-white';
     }
  };

  // Generate a deterministic gradient based on ID if no image
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
      className="group flex flex-col gap-3 cursor-pointer w-full touch-manipulation active:scale-95 transition-transform duration-200"
      onClick={() => onClick(item)}
    >
      {/* Poster Container - iOS rounded corners */}
      <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-[#1c1c1e] shadow-lg ring-1 ring-white/5 group-hover:ring-white/20">
        
        {/* Image or Gradient Fallback */}
        {posterUrl ? (
            <img 
                src={posterUrl} 
                alt={item.title} 
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
            />
        ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${gradients[gradientSeed]} flex items-center justify-center`}>
                 {isSeries ? <Tv size={48} className="opacity-20 text-white"/> : <Film size={48} className="opacity-20 text-white"/>}
            </div>
        )}

        {/* VOD Provider Badge (Top Right) */}
        {isMovie && item.releaseSource === 'VOD' && (
            <div className="absolute top-2 right-2 z-10">
                <div className="bg-black/60 backdrop-blur-md text-[9px] font-bold text-white px-2 py-0.5 rounded-full border border-white/10 shadow-sm flex items-center gap-1">
                    <MonitorPlay size={9} className="text-purple-400"/>
                    {item.vodProvider || 'VOD'}
                </div>
            </div>
        )}

        {/* Status Bar (Thin line at bottom) */}
        {item.status !== 'watchlist' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40 backdrop-blur-sm">
                <div 
                    className={`h-full ${getStatusColor()} shadow-[0_0_10px_currentColor]`} 
                    style={{ width: item.status === 'watched' ? '100%' : '50%'}} 
                />
            </div>
        )}

        {/* Series Progress Badge overlay */}
        {isSeries && item.status === 'in-progress' && (
             <div className="absolute bottom-2 right-2 z-10">
                 <div className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg border border-blue-400/30">
                     S{item.progress.season} E{item.progress.episode}
                 </div>
             </div>
        )}
      </div>

      {/* Info Below Card */}
      <div className="flex flex-col gap-0.5 px-0.5">
        <div className="flex justify-between items-start gap-2">
            <h3 className="font-semibold text-white text-[15px] leading-tight line-clamp-1" title={item.title}>
                {item.title}
            </h3>
            
            {/* Rating */}
            {isMovie && item.status === 'watched' && item.personalRating ? (
                 <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                     item.personalRating === 'Excellent' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 
                     item.personalRating === 'Good' ? 'bg-blue-500' : 'bg-gray-500'
                 }`} />
            ) : (
                item.voteAverage !== undefined && item.voteAverage > 0 && (
                    <div className="flex items-center gap-1 text-[11px] font-medium text-gray-400">
                        <Star size={10} className="text-yellow-500 fill-yellow-500" />
                        <span>{item.voteAverage.toFixed(1)}</span>
                    </div>
                )
            )}
        </div>
        
        <div className="flex items-center text-[13px] text-gray-500 font-normal">
             <span>{item.year || 'N/A'}</span>
        </div>
      </div>
    </div>
  );
};

export default MediaCard;