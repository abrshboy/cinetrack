import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Film, Tv, LayoutGrid, ListFilter, Search, Clapperboard, Ticket, MonitorPlay, LogOut, Loader2, UserCircle, Database, CloudOff, Play, CheckCircle2 } from 'lucide-react';
import { MediaItem, SearchResult, WatchStatus } from './types';
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
  
  // Modes: Guest (public local), Personal Local (owner but offline/config error), Authenticated (Firebase)
  const [isGuest, setIsGuest] = useState(false);
  const [isPersonalLocal, setIsPersonalLocal] = useState(false);
  
  const [authLoading, setAuthLoading] = useState(true);
  const [library, setLibrary] = useState<MediaItem[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<WatchStatus | 'all'>('all');
  const [activeType, setActiveType] = useState<'all' | 'movie' | 'series'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);

  // --- Auth & Data Sync Effects ---
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
    // 1. Personal Local Mode
    if (isPersonalLocal) {
        setLibraryLoading(true);
        const saved = localStorage.getItem('cine_library_personal');
        if (saved) {
            try { setLibrary(JSON.parse(saved)); } catch (e) { setLibrary([]); }
        } else { setLibrary([]); }
        setLibraryLoading(false);
        return;
    }

    // 2. Guest Mode
    if (isGuest) {
        setLibraryLoading(true);
        const saved = localStorage.getItem('cine_library');
        if (saved) {
            try { setLibrary(JSON.parse(saved)); } catch (e) { setLibrary([]); }
        } else { setLibrary([]); }
        setLibraryLoading(false);
        return;
    }

    // 3. Not logged in
    if (!user) {
        setLibrary([]);
        return;
    }

    // 4. Firebase Sync
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

  // --- Derived State (Filtering) ---
  const filteredLibrary = useMemo(() => {
    return library
      .filter(item => {
        if (activeTab !== 'all' && item.status !== activeTab) return false;
        if (activeType !== 'all' && item.type !== activeType) return false;
        if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => b.addedAt - a.addedAt);
  }, [library, activeTab, activeType, searchQuery]);

  // Calculate sections for Movies view
  const movieSections = useMemo(() => {
    // We only calculate sections if we are specifically in the 'movie' tab
    if (activeType !== 'movie') return null;
    
    // Items with explicit 'Theater' or undefined (legacy/default) go to Theatrical
    const theatrical = filteredLibrary.filter(item => !item.releaseSource || item.releaseSource === 'Theater');
    const vod = filteredLibrary.filter(item => item.releaseSource === 'VOD');
    return { theatrical, vod };
  }, [filteredLibrary, activeType]);

  const saveToLocal = (items: MediaItem[], key: string) => {
      setLibrary(items);
      localStorage.setItem(key, JSON.stringify(items));
  };

  // Helper to remove undefined values which Firebase hates
  const sanitizeForFirestore = (data: any) => {
    return JSON.parse(JSON.stringify(data));
  };

  // --- Handlers ---
  const generateId = () => {
    // Fallback for environments where crypto.randomUUID is not available (e.g. non-secure contexts on mobile)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  const handleAddItem = async (result: SearchResult) => {
    if (!user && !isGuest && !isPersonalLocal) return;

    try {
        // Fetch details safely.
        const details = await getMediaDetails(result.tmdbId, result.type);
        const id = generateId();

        const newItem: MediaItem = {
            id,
            tmdbId: result.tmdbId,
            title: result.title,
            type: result.type, // 'movie' or 'series'
            status: 'watchlist',
            year: result.year,
            description: result.description,
            posterPath: result.posterPath,
            backdropPath: result.backdropPath,
            voteAverage: result.voteAverage,
            runtime: details.runtime,
            addedAt: Date.now(),
            progress: { season: 1, episode: 1 },
            // Only set releaseSource for movies. Series is undefined.
            releaseSource: result.type === 'movie' ? 'Theater' : undefined,
        };
        
        setIsAddModalOpen(false);
        setEditingItem(newItem);

        // Save based on mode
        if (isPersonalLocal) {
            saveToLocal([newItem, ...library], 'cine_library_personal');
        } else if (isGuest) {
            saveToLocal([newItem, ...library], 'cine_library');
        } else if (user) {
            await setDoc(doc(db, 'users', user.uid, 'library', id), sanitizeForFirestore(newItem));
        }

        // UX: If adding a Series while looking at Movies, switch to Series tab so user sees it
        if (activeType === 'movie' && result.type === 'series') {
            setActiveType('series');
        } else if (activeType === 'series' && result.type === 'movie') {
            setActiveType('movie');
        }

    } catch (e) {
        console.error("Error adding item:", e);
        alert("Could not add item. Please try again.");
    }
  };

  const handleUpdateItem = async (updated: MediaItem) => {
    if (!user && !isGuest && !isPersonalLocal) return;
    setEditingItem(null);

    if (isPersonalLocal) {
        saveToLocal(library.map(item => item.id === updated.id ? updated : item), 'cine_library_personal');
    } else if (isGuest) {
        saveToLocal(library.map(item => item.id === updated.id ? updated : item), 'cine_library');
    } else if (user) {
        await setDoc(doc(db, 'users', user.uid, 'library', updated.id), sanitizeForFirestore(updated));
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!user && !isGuest && !isPersonalLocal) return;
    
    // Optimistically close modal to feel snappy
    setEditingItem(null);

    try {
        if (isPersonalLocal) {
            saveToLocal(library.filter(item => item.id !== id), 'cine_library_personal');
        } else if (isGuest) {
            saveToLocal(library.filter(item => item.id !== id), 'cine_library');
        } else if (user) {
            await deleteDoc(doc(db, 'users', user.uid, 'library', id));
        }
    } catch (error) {
        console.error("Error deleting item:", error);
        alert("Failed to delete item. It may have already been removed.");
    }
  };

  const handleQuickAction = async (item: MediaItem, action: 'watched' | 'increment') => {
    if (!user && !isGuest && !isPersonalLocal) return;

    let updated = { ...item };
    if (action === 'watched') {
        updated.status = 'watched' as WatchStatus;
    } else if (action === 'increment') {
        const currentEp = item.progress.episode || 1;
        updated.progress = { ...item.progress, episode: currentEp + 1 };
    }
    
    if (isPersonalLocal) {
        saveToLocal(library.map(l => l.id === item.id ? updated : l), 'cine_library_personal');
    } else if (isGuest) {
        saveToLocal(library.map(l => l.id === item.id ? updated : l), 'cine_library');
    } else if (user) {
        await setDoc(doc(db, 'users', user.uid, 'library', item.id), sanitizeForFirestore(updated));
    }
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

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans pb-safe">
      
      {/* --- Header / Navigation --- */}
      <nav className="fixed top-0 left-0 right-0 z-40 pt-safe px-4 md:px-10 flex flex-col backdrop-blur-xl bg-black/70 border-b border-white/5">
        <div className="h-16 flex items-center justify-between">
            {/* Logo */}
            <h1 className="text-2xl font-bold tracking-tight cursor-pointer flex items-center gap-2" onClick={() => {setActiveTab('all'); setActiveType('all')}}>
                <span className="text-red-600">
                    <Clapperboard size={24} fill="currentColor" strokeWidth={0} />
                </span>
                <span>CineTrack</span>
            </h1>

            {/* Actions */}
            <div className="flex items-center gap-3">
                 {/* Desktop Search */}
                <div className={`hidden md:flex items-center bg-[#1c1c1e] rounded-xl px-3 py-1.5`}>
                    <Search size={16} className="text-gray-400" />
                    <input 
                        type="search" 
                        placeholder="Filter..." 
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

        {/* Desktop Tab Bar (Integrated into header) */}
        <div className="hidden md:flex items-center gap-8 pb-3 text-sm font-medium">
             {(['all', 'watchlist', 'in-progress', 'watched'] as const).map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
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
      <main className="flex-1 px-4 md:px-10 pt-[100px] md:pt-[130px] pb-24 w-full max-w-[1920px] mx-auto">
        
        {/* Mobile Search & Type Filter Row */}
        <div className="md:hidden flex flex-col gap-4 mb-6 sticky top-[80px] z-30 -mx-4 px-4 pb-2 bg-gradient-to-b from-black via-black to-transparent">
             {/* Search */}
             <div className="flex items-center bg-[#1c1c1e] rounded-xl px-3 py-2.5">
                <Search size={18} className="text-gray-500" />
                <input 
                    type="search" 
                    placeholder="Search library..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none focus:outline-none text-[15px] px-3 w-full text-white placeholder-gray-600"
                />
            </div>

            {/* Segmented Control for Type */}
            <div className="flex bg-[#1c1c1e] p-1 rounded-lg">
                {(['all', 'movie', 'series'] as const).map((type) => (
                     <button 
                        key={type}
                        onClick={() => setActiveType(type)}
                        className={`flex-1 py-1.5 rounded-[6px] text-[13px] font-semibold transition-all ${
                            activeType === type 
                            ? 'bg-[#636366] text-white shadow' 
                            : 'text-gray-400'
                        }`}
                    >
                        {type === 'all' ? 'All' : type === 'movie' ? 'Movies' : 'TV'}
                    </button>
                ))}
            </div>
        </div>

        {/* Desktop Type Filter & Stats */}
        <div className="hidden md:flex justify-between items-center mb-8">
            <div className="flex bg-[#1c1c1e] p-1 rounded-xl">
                 {(['all', 'movie', 'series'] as const).map((type) => (
                     <button 
                        key={type}
                        onClick={() => setActiveType(type)}
                        className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                            activeType === type 
                            ? 'bg-[#3a3a3c] text-white shadow-md' 
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                    >
                        {type === 'all' && <LayoutGrid size={16} />}
                        {type === 'movie' && <Film size={16} />}
                        {type === 'series' && <Tv size={16} />}
                        {type === 'all' ? 'All Items' : type === 'movie' ? 'Movies' : 'TV Shows'}
                    </button>
                ))}
            </div>
             <div className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                {libraryLoading ? (
                    <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={12}/> Syncing...</span>
                ) : (
                    <span>{filteredLibrary.length} Titles</span>
                )}
            </div>
        </div>

        {/* Content Grid */}
        {filteredLibrary.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] text-gray-500 mx-auto max-w-sm text-center px-6">
                <div className="bg-[#1c1c1e] p-6 rounded-full mb-6">
                    <ListFilter size={48} className="opacity-30" />
                </div>
                <p className="text-lg font-medium text-white mb-2">
                    {libraryLoading ? 'Loading Library...' : 'Library is Empty'}
                </p>
                <p className="text-sm text-gray-500 leading-relaxed mb-8">
                    Tap the + button to start tracking your movies and TV shows.
                </p>
                {!libraryLoading && library.length === 0 && (
                    <button onClick={() => setIsAddModalOpen(true)} className="text-black bg-white px-8 py-3 rounded-full font-bold active:scale-95 transition-transform shadow-xl">
                        Start Collection
                    </button>
                )}
            </div>
        ) : (
             <>
                {/* MOVIE SPLIT VIEW: Explicit sections for VOD vs Theatrical */}
                {activeType === 'movie' && movieSections ? (
                    <div className="space-y-12 animate-in fade-in duration-500">
                        
                        {/* THEATRICAL SECTION */}
                        <section>
                             <div className="flex items-center gap-3 mb-4 px-1">
                                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                    <Ticket size={20} className="text-blue-500" />
                                    Theatrical
                                </h2>
                                <div className="h-px bg-gray-800 flex-1"></div>
                                <span className="text-xs font-bold text-gray-500">{movieSections.theatrical.length}</span>
                            </div>
                            
                            {movieSections.theatrical.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6">
                                    {movieSections.theatrical.map(item => (
                                        <MediaCard 
                                            key={item.id} 
                                            item={item} 
                                            onClick={() => setEditingItem(item)}
                                            onQuickAction={handleQuickAction}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-600 text-sm font-medium border border-dashed border-gray-800 rounded-xl bg-[#111]">
                                    No theatrical movies found.
                                </div>
                            )}
                        </section>

                        {/* VOD SECTION */}
                        <section>
                             <div className="flex items-center gap-3 mb-4 px-1">
                                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                    <MonitorPlay size={20} className="text-purple-500" />
                                    Streaming Originals
                                </h2>
                                <div className="h-px bg-gray-800 flex-1"></div>
                                <span className="text-xs font-bold text-gray-500">{movieSections.vod.length}</span>
                            </div>

                            {movieSections.vod.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6">
                                    {movieSections.vod.map(item => (
                                        <MediaCard 
                                            key={item.id} 
                                            item={item} 
                                            onClick={() => setEditingItem(item)}
                                            onQuickAction={handleQuickAction}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-600 text-sm font-medium border border-dashed border-gray-800 rounded-xl bg-[#111]">
                                    No streaming originals found.
                                </div>
                            )}
                        </section>
                    </div>
                ) : (
                    // STANDARD GRID FOR ALL / SERIES
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6 animate-in fade-in duration-500">
                        {filteredLibrary.map(item => (
                            <MediaCard 
                                key={item.id} 
                                item={item} 
                                onClick={() => setEditingItem(item)}
                                onQuickAction={handleQuickAction}
                            />
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
                onClick={() => setActiveTab(tab)}
                className={`flex flex-col items-center gap-1 w-16 transition-colors ${
                    activeTab === tab 
                    ? 'text-white' 
                    : 'text-gray-500'
                }`}
            >
                {tab === 'all' && <LayoutGrid size={24} strokeWidth={activeTab === tab ? 2.5 : 2} />}
                {tab === 'watchlist' && <Plus size={24} strokeWidth={activeTab === tab ? 2.5 : 2} />}
                {tab === 'in-progress' && <Play size={24} strokeWidth={activeTab === tab ? 2.5 : 2} />}
                {tab === 'watched' && <CheckCircle2 size={24} strokeWidth={activeTab === tab ? 2.5 : 2} />}
                <span className="text-[10px] font-medium">
                    {tab === 'all' ? 'Library' : tab === 'in-progress' ? 'Watching' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </span>
            </button>
        ))}
      </div>

      <AddMediaModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdd={handleAddItem} 
      />
      
      <EditMediaModal 
        item={editingItem} 
        isOpen={!!editingItem} 
        onClose={() => setEditingItem(null)} 
        onSave={handleUpdateItem}
        onDelete={handleDeleteItem}
      />
      
    </div>
  );
};

export default App;