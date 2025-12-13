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
      case 'watched': return 'bg-green-600';
      case 'in-progress': return 'bg-blue-600';
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
      className="group flex flex-col gap-3 cursor-pointer w-full"
      onClick={() => onClick(item)}
    >
      {/* Poster Container - Clean, no text overlay */}
      <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-gray-900 shadow-md transition-all duration-300 ease-in-out group-hover:scale-[1.02] group-hover:shadow-xl group-hover:ring-2 group-hover:ring-white/20">
        
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
                <div className="bg-black/70 backdrop-blur-md text-[10px] font-bold text-white px-2 py-1 rounded border border-white/20 shadow-lg flex items-center gap-1">
                    <MonitorPlay size={10} className="text-purple-400"/>
                    {item.vodProvider || 'VOD'}
                </div>
            </div>
        )}

        {/* Status Bar (Thin line at bottom) */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800/50">
             <div 
                 className={`h-full ${getStatusColor()}`} 
                 style={{ width: item.status === 'watched' ? '100%' : item.status === 'in-progress' ? '50%' : '0%'}} 
             />
        </div>

        {/* Hover Overlay Actions */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3 backdrop-blur-[2px]">
            <button className="p-3 bg-white/90 rounded-full text-black hover:bg-white hover:scale-110 transition-all shadow-lg">
                <MoreVertical size={20} fill="currentColor" />
            </button>
            {item.status !== 'watched' && (
                <button 
                    className="p-3 bg-red-600/90 rounded-full text-white hover:bg-red-600 hover:scale-110 transition-all shadow-lg"
                    onClick={(e) => {
                        e.stopPropagation();
                        onQuickAction?.(item, 'watched');
                    }}
                    title="Mark as Watched"
                >
                    <Check size={20} strokeWidth={3} />
                </button>
            )}
             {isSeries && item.status === 'in-progress' && (
                <button 
                    className="p-3 bg-blue-600/90 rounded-full text-white hover:bg-blue-600 hover:scale-110 transition-all shadow-lg"
                    onClick={(e) => {
                        e.stopPropagation();
                        onQuickAction?.(item, 'increment');
                    }}
                    title="Next Episode"
                >
                    <Play size={20} fill="currentColor" />
                </button>
            )}
        </div>
      </div>

      {/* Info Below Card */}
      <div className="flex flex-col gap-1 px-1">
        <div className="flex justify-between items-start gap-2">
            <h3 className="font-semibold text-white leading-tight line-clamp-1 group-hover:text-red-500 transition-colors" title={item.title}>
                {item.title}
            </h3>
            
            {/* Show Personal Rating if exists, otherwise TMDB rating */}
            {isMovie && item.status === 'watched' && item.personalRating ? (
                 <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 uppercase ${getPersonalRatingColor(item.personalRating)}`}>
                    {item.personalRating}
                 </div>
            ) : (
                item.voteAverage !== undefined && item.voteAverage > 0 && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded flex-shrink-0">
                        <Star size={10} fill="currentColor" />
                        <span>{item.voteAverage.toFixed(1)}</span>
                    </div>
                )
            )}
        </div>
        
        <div className="flex items-center text-xs text-gray-500 font-medium gap-2">
             <span>{item.year || 'N/A'}</span>
             {item.runtime ? (
                 <>
                    <span className="text-gray-700">•</span>
                    <span>{formatRuntime(item.runtime)}</span>
                 </>
             ) : null}
             
             {/* Show Series specific info if watching */}
             {isSeries && item.status === 'in-progress' && (
                 <>
                    <span className="text-gray-700">•</span>
                    <span className="text-blue-500 flex items-center gap-1">
                        S{item.progress.season} E{item.progress.episode}
                    </span>
                 </>
             )}
        </div>
      </div>
    </div>
  );
};

export default MediaCard;
