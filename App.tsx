import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Film, Tv, LayoutGrid, ListFilter, Search, Clapperboard, Ticket, MonitorPlay, LogOut, Loader2, UserCircle, Database, CloudOff } from 'lucide-react';
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
    if (activeType !== 'movie') return null;
    const theatrical = filteredLibrary.filter(item => !item.releaseSource || item.releaseSource === 'Theater');
    const vod = filteredLibrary.filter(item => item.releaseSource === 'VOD');
    return { theatrical, vod };
  }, [filteredLibrary, activeType]);

  const saveToLocal = (items: MediaItem[], key: string) => {
      setLibrary(items);
      localStorage.setItem(key, JSON.stringify(items));
  };

  // --- Handlers ---
  const handleAddItem = async (result: SearchResult) => {
    if (!user && !isGuest && !isPersonalLocal) return;

    try {
        // Fetch details safely. If it fails, it returns { runtime: 0 }
        const details = await getMediaDetails(result.tmdbId, result.type);
        const id = crypto.randomUUID();

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
            // Default to Theater for movies, undefined for Series
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
            await setDoc(doc(db, 'users', user.uid, 'library', id), newItem);
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
        await setDoc(doc(db, 'users', user.uid, 'library', updated.id), updated);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!user && !isGuest && !isPersonalLocal) return;
    if (confirm('Remove this from your library?')) {
        setEditingItem(null);

        if (isPersonalLocal) {
            saveToLocal(library.filter(item => item.id !== id), 'cine_library_personal');
        } else if (isGuest) {
            saveToLocal(library.filter(item => item.id !== id), 'cine_library');
        } else if (user) {
            await deleteDoc(doc(db, 'users', user.uid, 'library', id));
        }
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
        await setDoc(doc(db, 'users', user.uid, 'library', item.id), updated);
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
          <div className="min-h-screen bg-[#141414] flex items-center justify-center">
              <Loader2 className="animate-spin text-red-600" size={48} />
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
    <div className="min-h-screen bg-[#141414] text-white flex flex-col font-sans pb-safe">
      
      {/* --- Navbar --- */}
      <nav className="fixed top-0 left-0 right-0 z-40 h-20 pt-safe px-4 md:px-10 flex items-center justify-between backdrop-blur-md bg-black/80 border-b border-white/5 shadow-lg">
        <div className="flex items-center gap-6">
            <h1 className="text-2xl md:text-3xl font-bold text-red-600 tracking-tighter cursor-pointer flex items-center gap-2" onClick={() => {setActiveTab('all'); setActiveType('all')}}>
                <Clapperboard size={26} className="text-red-600" />
                CINETRACK
            </h1>
            
            <div className="hidden md:flex items-center gap-6 text-sm font-medium ml-4">
                {(['all', 'watchlist', 'in-progress', 'watched'] as const).map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`transition-all duration-200 relative py-2 ${
                            activeTab === tab 
                            ? 'text-white font-bold' 
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        {tab === 'all' ? 'Home' : tab === 'in-progress' ? 'Watching' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                        {activeTab === tab && (
                            <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-red-600 rounded-full shadow-[0_0_8px_rgba(220,38,38,0.8)]"></div>
                        )}
                    </button>
                ))}
            </div>
        </div>

        <div className="flex items-center gap-3">
            <div className={`hidden md:flex items-center bg-[#222] border border-transparent focus-within:border-gray-500 transition-colors px-3 py-1.5 rounded-full`}>
                <Search size={16} className="text-gray-400" />
                <input 
                    type="search" 
                    placeholder="Filter..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none focus:outline-none text-sm px-2 w-32 lg:w-48 text-white placeholder-gray-500"
                />
            </div>
            
            <button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-white hover:bg-gray-200 active:bg-gray-300 text-black px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 shadow-lg active:scale-95"
            >
                <Plus size={18} strokeWidth={3} /> <span className="hidden sm:inline">Add</span>
            </button>

            {/* Mobile Logout / Status */}
            <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
            >
                <LogOut size={20} />
            </button>
        </div>
      </nav>

      {/* --- Main Content --- */}
      <main className="flex-1 px-4 md:px-10 pt-24 md:pt-28 pb-12 w-full max-w-[1920px] mx-auto">
        
        {/* Mobile Filter Bar */}
        <div className="md:hidden flex flex-col gap-3 mb-6">
             <div className="flex items-center bg-[#222] rounded-xl px-4 py-3">
                <Search size={18} className="text-gray-400" />
                <input 
                    type="search" 
                    placeholder="Search library..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none focus:outline-none text-base px-3 w-full text-white"
                />
            </div>
            <div className="flex overflow-x-auto gap-2 pb-1 hide-scrollbar -mx-4 px-4">
                {(['all', 'watchlist', 'in-progress', 'watched'] as const).map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                            activeTab === tab 
                            ? 'bg-red-600 text-white border-red-600 shadow-md' 
                            : 'bg-[#222] text-gray-400 border-transparent'
                        }`}
                    >
                        {tab === 'in-progress' ? 'Watching' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>
        </div>

        {/* Type Toggles & Stats */}
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-8 gap-4">
            <div className="flex bg-[#1a1a1a] p-1 rounded-xl border border-gray-800 w-full md:w-auto">
                <button 
                    onClick={() => setActiveType('all')}
                    className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
                        activeType === 'all' 
                        ? 'bg-[#333] text-white shadow-lg ring-1 ring-white/10' 
                        : 'text-gray-400 hover:text-white hover:bg-[#252525]'
                    }`}
                >
                    <LayoutGrid size={18} /> All
                </button>
                <button 
                    onClick={() => setActiveType('movie')}
                    className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
                        activeType === 'movie' 
                        ? 'bg-blue-900/40 text-blue-400 shadow-lg ring-1 ring-blue-500/20' 
                        : 'text-gray-400 hover:text-white hover:bg-[#252525]'
                    }`}
                >
                    <Film size={18} /> Movies
                </button>
                <button 
                    onClick={() => setActiveType('series')}
                    className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
                        activeType === 'series' 
                        ? 'bg-purple-900/40 text-purple-400 shadow-lg ring-1 ring-purple-500/20' 
                        : 'text-gray-400 hover:text-white hover:bg-[#252525]'
                    }`}
                >
                    <Tv size={18} /> TV
                </button>
            </div>

            <div className="text-gray-400 text-xs font-medium px-2">
                {libraryLoading ? (
                    <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={12}/> Syncing...</span>
                ) : (
                    <span>{filteredLibrary.length} items</span>
                )}
            </div>
        </div>

        {/* Content Grid */}
        {filteredLibrary.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] text-gray-500 bg-[#1a1a1a] rounded-3xl border border-dashed border-gray-800 mx-auto max-w-2xl p-6 text-center">
                <div className="bg-[#222] p-6 rounded-full mb-4">
                    <ListFilter size={48} className="opacity-50" />
                </div>
                <p className="text-xl font-medium text-gray-300">
                    {libraryLoading ? 'Loading Library...' : 'Nothing here yet'}
                </p>
                <p className="text-sm mt-2 opacity-60">
                    Start by adding movies or TV shows to your collection.
                </p>
                {!libraryLoading && library.length === 0 && (
                    <button onClick={() => setIsAddModalOpen(true)} className="mt-6 text-black bg-white px-8 py-3 rounded-full font-bold hover:scale-105 active:scale-95 transition-all shadow-xl">
                        Add Content
                    </button>
                )}
            </div>
        ) : (
             <>
                {/* MOVIE SPLIT VIEW: Specifically requested to show distinct sections */}
                {activeType === 'movie' && movieSections ? (
                    <div className="space-y-12 animate-in fade-in duration-500">
                        
                        {/* THEATRICAL SECTION */}
                        <section className="bg-[#1a1a1a]/30 p-4 rounded-2xl border border-white/5">
                             <div className="flex items-center gap-3 mb-6 pb-2 border-b border-white/5">
                                <div className="p-2 bg-blue-900/30 text-blue-400 rounded-lg">
                                    <Ticket size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Theatrical / Standard</h2>
                                    <p className="text-xs text-gray-500">Movies released in theaters</p>
                                </div>
                                <span className="ml-auto text-sm font-medium text-gray-400 bg-white/5 px-2 py-1 rounded-md">{movieSections.theatrical.length}</span>
                            </div>
                            
                            {movieSections.theatrical.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
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
                                <div className="text-center py-8 text-gray-600 text-sm italic">No theatrical movies found.</div>
                            )}
                        </section>

                        {/* VOD SECTION */}
                        <section className="bg-[#1a1a1a]/30 p-4 rounded-2xl border border-white/5">
                             <div className="flex items-center gap-3 mb-6 pb-2 border-b border-white/5">
                                 <div className="p-2 bg-purple-900/30 text-purple-400 rounded-lg">
                                    <MonitorPlay size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Streaming Originals</h2>
                                    <p className="text-xs text-gray-500">Netflix, Amazon, Hulu, etc.</p>
                                </div>
                                <span className="ml-auto text-sm font-medium text-gray-400 bg-white/5 px-2 py-1 rounded-md">{movieSections.vod.length}</span>
                            </div>

                            {movieSections.vod.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
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
                                <div className="text-center py-8 text-gray-600 text-sm italic">No streaming originals found. Edit a movie to change its source.</div>
                            )}
                        </section>
                    </div>
                ) : (
                    // STANDARD GRID FOR ALL / SERIES
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6 animate-in fade-in duration-500">
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