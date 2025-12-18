import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Film, Tv, LayoutGrid, ListFilter, Search, Clapperboard, Ticket, MonitorPlay, LogOut, Loader2, UserCircle, Database, CloudOff, Play, CheckCircle2, ArrowUpDown, ChevronDown, Filter, X } from 'lucide-react';
import { MediaItem, SearchResult, WatchStatus, PersonalRating } from './types';
import MediaCard from './components/MediaCard';
import AddMediaModal from './components/AddMediaModal';
import EditMediaModal from './components/EditMediaModal';
import LoginScreen from './components/LoginScreen';
import { getMediaDetails } from './services/tmdbService';
import { auth, db, logout } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, setDoc, doc, deleteDoc } from 'firebase/firestore';

const App: React.FC = () => {
  // --- State ---
  const [user, setUser] = useState<User | null>(null);
  
  // Modes
  const [isGuest, setIsGuest] = useState(false);
  const [isPersonalLocal, setIsPersonalLocal] = useState(false);
  
  const [authLoading, setAuthLoading] = useState(true);
  const [library, setLibrary] = useState<MediaItem[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);

  // Filters & Sorting
  const [activeTab, setActiveTab] = useState<WatchStatus | 'all'>('all');
  const [activeType, setActiveType] = useState<'all' | 'movie' | 'series'>('all');
  const [sortBy, setSortBy] = useState<'addedAt' | 'title' | 'rating'>('addedAt');
  const [ratingFilter, setRatingFilter] = useState<PersonalRating | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);

  // --- Auth & Data Sync ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
          setIsGuest(false);
          setIsPersonalLocal(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (isPersonalLocal) {
        setLibraryLoading(true);
        const saved = localStorage.getItem('cine_library_personal');
        if (saved) {
            try { setLibrary(JSON.parse(saved)); } catch (e) { setLibrary([]); }
        } else { setLibrary([]); }
        setLibraryLoading(false);
        return;
    }

    if (isGuest) {
        setLibraryLoading(true);
        const saved = localStorage.getItem('cine_library');
        if (saved) {
            try { setLibrary(JSON.parse(saved)); } catch (e) { setLibrary([]); }
        } else { setLibrary([]); }
        setLibraryLoading(false);
        return;
    }

    if (!user) {
        setLibrary([]);
        return;
    }

    setLibraryLoading(true);
    const libraryRef = collection(db, 'users', user.uid, 'library');
    const q = query(libraryRef);

    const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const items: MediaItem[] = [];
        snapshot.forEach((doc) => {
            items.push(doc.data() as MediaItem);
        });
        setLibrary(items);
        setLibraryLoading(false);
    }, (error) => {
        console.error("Error fetching library:", error);
        setLibraryLoading(false);
    });

    return () => unsubscribeSnapshot();
  }, [user, isGuest, isPersonalLocal]);

  // --- Sorting Logic Mapping ---
  const ratingValueMap: Record<string, number> = {
    'Excellent': 5,
    'Good': 4,
    'Average': 3,
    'Bad': 2,
    'Terrible': 1
  };

  // --- Derived State (Filtering & Sorting) ---
  const filteredLibrary = useMemo(() => {
    return library
      .filter(item => {
        // Tab Filter (Watchlist/Watching/Watched)
        if (activeTab !== 'all' && item.status !== activeTab) return false;
        
        // Type Filter (Movie/Series)
        if (activeType !== 'all' && item.type !== activeType) return false;
        
        // Rating Filter (Specific to Movies + Watched tab)
        if (activeTab === 'watched' && activeType === 'movie' && ratingFilter !== 'all') {
            if (item.personalRating !== ratingFilter) return false;
        }

        // Search Query
        if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        
        return true;
      })
      .sort((a, b) => {
        // Sort Logic
        if (sortBy === 'title') {
            return a.title.localeCompare(b.title);
        }
        if (sortBy === 'rating') {
            // Prioritize Personal Rating value, then TMDB rating
            const aVal = ratingValueMap[a.personalRating || ''] || a.voteAverage || 0;
            const bVal = ratingValueMap[b.personalRating || ''] || b.voteAverage || 0;
            return bVal - aVal;
        }
        // Default: addedAt (Recency)
        return b.addedAt - a.addedAt;
      });
  }, [library, activeTab, activeType, searchQuery, sortBy, ratingFilter]);

  // Sections for Movies view
  const movieSections = useMemo(() => {
    if (activeType !== 'movie') return null;
    const theatrical = filteredLibrary.filter(item => !item.releaseSource || item.releaseSource === 'Theater');
    const vod = filteredLibrary.filter(item => item.releaseSource === 'VOD');
    return { theatrical, vod };
  }, [filteredLibrary, activeType]);

  const saveToLocal = (items: MediaItem[], key: string) => {
      setLibrary(items);
      localStorage.setItem(key, JSON.stringify(items));
  };

  const sanitizeForFirestore = (data: any) => JSON.parse(JSON.stringify(data));

  // --- Handlers ---
  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  const handleAddItem = async (result: SearchResult) => {
    if (!user && !isGuest && !isPersonalLocal) return;

    try {
        const details = await getMediaDetails(result.tmdbId, result.type);
        const id = generateId();

        const newItem: MediaItem = {
            id,
            tmdbId: result.tmdbId,
            title: result.title,
            type: result.type,
            status: 'watchlist',
            year: result.year,
            description: result.description,
            posterPath: result.posterPath,
            backdropPath: result.backdropPath,
            voteAverage: result.voteAverage,
            runtime: details.runtime,
            addedAt: Date.now(),
            progress: { season: 1, episode: 1 },
            releaseSource: result.type === 'movie' ? 'Theater' : undefined,
        };
        
        setIsAddModalOpen(false);
        setEditingItem(newItem);

        if (isPersonalLocal) saveToLocal([newItem, ...library], 'cine_library_personal');
        else if (isGuest) saveToLocal([newItem, ...library], 'cine_library');
        else if (user) await setDoc(doc(db, 'users', user.uid, 'library', id), sanitizeForFirestore(newItem));

    } catch (e) {
        console.error("Error adding item:", e);
    }
  };

  const handleUpdateItem = async (updated: MediaItem) => {
    if (!user && !isGuest && !isPersonalLocal) return;
    setEditingItem(null);

    if (isPersonalLocal) saveToLocal(library.map(item => item.id === updated.id ? updated : item), 'cine_library_personal');
    else if (isGuest) saveToLocal(library.map(item => item.id === updated.id ? updated : item), 'cine_library');
    else if (user) await setDoc(doc(db, 'users', user.uid, 'library', updated.id), sanitizeForFirestore(updated));
  };

  const handleDeleteItem = async (id: string) => {
    if (!user && !isGuest && !isPersonalLocal) return;
    setEditingItem(null);
    try {
        if (isPersonalLocal) saveToLocal(library.filter(item => item.id !== id), 'cine_library_personal');
        else if (isGuest) saveToLocal(library.filter(item => item.id !== id), 'cine_library');
        else if (user) await deleteDoc(doc(db, 'users', user.uid, 'library', id));
    } catch (error) {
        console.error("Error deleting item:", error);
    }
  };

  const handleQuickAction = async (item: MediaItem, action: 'watched' | 'increment') => {
    if (!user && !isGuest && !isPersonalLocal) return;
    let updated = { ...item };
    if (action === 'watched') updated.status = 'watched' as WatchStatus;
    else if (action === 'increment') {
        const currentEp = item.progress.episode || 1;
        updated.progress = { ...item.progress, episode: currentEp + 1 };
    }
    if (isPersonalLocal) saveToLocal(library.map(l => l.id === item.id ? updated : l), 'cine_library_personal');
    else if (isGuest) saveToLocal(library.map(l => l.id === item.id ? updated : l), 'cine_library');
    else if (user) await setDoc(doc(db, 'users', user.uid, 'library', item.id), sanitizeForFirestore(updated));
  };

  const handleLogout = () => {
      setIsGuest(false);
      setIsPersonalLocal(false);
      setLibrary([]);
      if (user) logout();
  };

  if (authLoading) {
      return (
          <div className="min-h-screen bg-black flex items-center justify-center">
              <Loader2 className="animate-spin text-white" size={48} />
          </div>
      );
  }

  if (!user && !isGuest && !isPersonalLocal) {
      return (
        <LoginScreen 
            onGuestLogin={() => setIsGuest(true)} 
            onPersonalLocalLogin={() => setIsPersonalLocal(true)}
        />
      );
  }

  const ratingOptions: PersonalRating[] = ['Excellent', 'Good', 'Average', 'Bad', 'Terrible'];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans pb-safe">
      
      {/* --- Header / Navigation --- */}
      <nav className="fixed top-0 left-0 right-0 z-40 pt-safe px-4 md:px-10 flex flex-col backdrop-blur-xl bg-black/70 border-b border-white/5">
        <div className="h-16 flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight cursor-pointer flex items-center gap-2" onClick={() => {setActiveTab('all'); setActiveType('all')}}>
                <span className="text-red-600">
                    <Clapperboard size={24} fill="currentColor" strokeWidth={0} />
                </span>
                <span>CineTrack</span>
            </h1>

            <div className="flex items-center gap-3">
                <div className={`hidden md:flex items-center bg-[#1c1c1e] rounded-xl px-3 py-1.5`}>
                    <Search size={16} className="text-gray-400" />
                    <input 
                        type="search" 
                        placeholder="Filter list..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none focus:outline-none text-sm px-2 w-48 text-white placeholder-gray-500"
                    />
                </div>
                
                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-white text-black px-4 py-1.5 rounded-full text-sm font-bold active:scale-95 transition-all flex items-center gap-1 shadow-lg"
                >
                    <Plus size={18} strokeWidth={3} /> Add
                </button>

                <button
                    onClick={handleLogout}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white bg-[#1c1c1e] rounded-full transition-colors active:scale-95"
                >
                    <LogOut size={16} />
                </button>
            </div>
        </div>

        <div className="hidden md:flex items-center gap-8 pb-3 text-sm font-medium">
             {(['all', 'watchlist', 'in-progress', 'watched'] as const).map(tab => (
                    <button 
                        key={tab}
                        onClick={() => {
                            setActiveTab(tab);
                            setRatingFilter('all'); // Reset specific rating filter on tab change
                        }}
                        className={`transition-all duration-200 relative py-1 ${
                            activeTab === tab 
                            ? 'text-white' 
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                    >
                        {tab === 'all' ? 'Home' : tab === 'in-progress' ? 'Watching' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                        {activeTab === tab && (
                            <div className="absolute -bottom-3.5 left-0 right-0 h-[3px] bg-red-600 rounded-t-full shadow-[0_-2px_8px_rgba(220,38,38,0.5)]"></div>
                        )}
                    </button>
            ))}
        </div>
      </nav>

      {/* --- Main Content --- */}
      <main className="flex-1 px-4 md:px-10 pt-[100px] md:pt-[140px] pb-24 w-full max-w-[1920px] mx-auto">
        
        {/* Sorting & Advanced Filter Bar */}
        <div className="mb-6 space-y-4">
            {/* Main Sorting Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex bg-[#1c1c1e] p-1 rounded-lg w-full sm:w-auto">
                    {(['all', 'movie', 'series'] as const).map((type) => (
                         <button 
                            key={type}
                            onClick={() => {
                                setActiveType(type);
                                setRatingFilter('all');
                            }}
                            className={`flex-1 sm:flex-none px-5 py-1.5 rounded-[6px] text-[13px] font-semibold transition-all ${
                                activeType === type ? 'bg-[#3a3a3c] text-white shadow' : 'text-gray-400'
                            }`}
                        >
                            {type === 'all' ? 'Everything' : type === 'movie' ? 'Movies' : 'TV Shows'}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar">
                    <span className="text-gray-500 text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5 whitespace-nowrap">
                        <ArrowUpDown size={12} /> Sort By
                    </span>
                    <div className="flex bg-[#1c1c1e] p-1 rounded-lg">
                        {(['addedAt', 'title', 'rating'] as const).map((s) => (
                            <button
                                key={s}
                                onClick={() => setSortBy(s)}
                                className={`px-4 py-1.5 rounded-[6px] text-[12px] font-bold transition-all whitespace-nowrap ${
                                    sortBy === s ? 'bg-[#3a3a3c] text-white shadow' : 'text-gray-500'
                                }`}
                            >
                                {s === 'addedAt' ? 'Recent' : s === 'title' ? 'A-Z' : 'Rating'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Contextual Filter Chips (iOS Style) */}
            {activeTab === 'watched' && activeType === 'movie' && (
                <div className="animate-in slide-in-from-left-4 fade-in flex items-center gap-3 py-1 border-t border-white/5 pt-4 overflow-x-auto hide-scrollbar">
                    <span className="text-gray-500 text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5 whitespace-nowrap">
                        <Filter size={12} /> Filter Rating
                    </span>
                    <button
                        onClick={() => setRatingFilter('all')}
                        className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all border whitespace-nowrap ${
                            ratingFilter === 'all' 
                            ? 'bg-white text-black border-white' 
                            : 'bg-transparent border-white/10 text-gray-400 hover:border-white/30'
                        }`}
                    >
                        All
                    </button>
                    {ratingOptions.map(opt => (
                         <button
                            key={opt}
                            onClick={() => setRatingFilter(opt)}
                            className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all border whitespace-nowrap ${
                                ratingFilter === opt 
                                ? 'bg-red-600 text-white border-red-600 shadow-[0_0_10px_rgba(220,38,38,0.4)]' 
                                : 'bg-transparent border-white/10 text-gray-400 hover:border-white/30'
                            }`}
                        >
                            {opt}
                        </button>
                    ))}
                    {ratingFilter !== 'all' && (
                         <button
                            onClick={() => setRatingFilter('all')}
                            className="flex items-center gap-1.5 text-[11px] font-bold text-red-500 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20"
                         >
                            <X size={10} /> Clear
                         </button>
                    )}
                </div>
            )}
        </div>

        {/* Content Grid */}
        {filteredLibrary.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] text-gray-500 mx-auto max-w-sm text-center px-6">
                <div className="bg-[#1c1c1e] p-6 rounded-full mb-6">
                    <ListFilter size={48} className="opacity-30" />
                </div>
                <p className="text-lg font-medium text-white mb-2">
                    {searchQuery || ratingFilter !== 'all' ? 'No results found' : 'Library is Empty'}
                </p>
                <p className="text-sm text-gray-500 leading-relaxed">
                    Try adjusting your filters or adding something new to your collection.
                </p>
            </div>
        ) : (
             <>
                {activeType === 'movie' && movieSections && sortBy === 'addedAt' ? (
                    <div className="space-y-12 animate-in fade-in duration-500">
                        <section>
                             <div className="flex items-center gap-3 mb-4 px-1">
                                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                    <Ticket size={20} className="text-blue-500" />
                                    Theatrical
                                </h2>
                                <div className="h-px bg-gray-800 flex-1"></div>
                                <span className="text-xs font-bold text-gray-500">{movieSections.theatrical.length}</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6">
                                {movieSections.theatrical.map(item => (
                                    <MediaCard key={item.id} item={item} onClick={() => setEditingItem(item)} onQuickAction={handleQuickAction} />
                                ))}
                            </div>
                        </section>

                        <section>
                             <div className="flex items-center gap-3 mb-4 px-1">
                                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                    <MonitorPlay size={20} className="text-purple-500" />
                                    Streaming Originals
                                </h2>
                                <div className="h-px bg-gray-800 flex-1"></div>
                                <span className="text-xs font-bold text-gray-500">{movieSections.vod.length}</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6">
                                {movieSections.vod.map(item => (
                                    <MediaCard key={item.id} item={item} onClick={() => setEditingItem(item)} onQuickAction={handleQuickAction} />
                                ))}
                            </div>
                        </section>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6 animate-in fade-in duration-500">
                        {filteredLibrary.map(item => (
                            <MediaCard key={item.id} item={item} onClick={() => setEditingItem(item)} onQuickAction={handleQuickAction} />
                        ))}
                    </div>
                )}
             </>
        )}
      </main>

      {/* Mobile Bottom Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-[80px] bg-black/90 backdrop-blur-xl border-t border-white/5 flex items-start pt-2 justify-around z-50 pb-safe">
        {(['all', 'watchlist', 'in-progress', 'watched'] as const).map(tab => (
            <button 
                key={tab}
                onClick={() => {
                    setActiveTab(tab);
                    setRatingFilter('all');
                }}
                className={`flex flex-col items-center gap-1 w-16 transition-colors ${
                    activeTab === tab ? 'text-white' : 'text-gray-500'
                }`}
            >
                {tab === 'all' && <LayoutGrid size={24} strokeWidth={activeTab === tab ? 2.5 : 2} />}
                {tab === 'watchlist' && <Plus size={24} strokeWidth={activeTab === tab ? 2.5 : 2} />}
                {tab === 'in-progress' && <Play size={24} strokeWidth={activeTab === tab ? 2.5 : 2} />}
                {tab === 'watched' && <CheckCircle2 size={24} strokeWidth={activeTab === tab ? 2.5 : 2} />}
                <span className="text-[10px] font-medium">
                    {tab === 'all' ? 'Home' : tab === 'in-progress' ? 'Watching' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </span>
            </button>
        ))}
      </div>

      <AddMediaModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdd={handleAddItem} />
      <EditMediaModal item={editingItem} isOpen={!!editingItem} onClose={() => setEditingItem(null)} onSave={handleUpdateItem} onDelete={handleDeleteItem} />
    </div>
  );
};

export default App;