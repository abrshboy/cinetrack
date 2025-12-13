import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Film, Tv, LayoutGrid, ListFilter, Search, Clapperboard, Ticket, MonitorPlay, LogOut, Loader2 } from 'lucide-react';
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
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
        setLibrary([]);
        return;
    }

    setLibraryLoading(true);
    // Reference: users/{userId}/library
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
  }, [user]);

  // --- Derived State (Filtering) ---
  const filteredLibrary = useMemo(() => {
    return library
      .filter(item => {
        // Filter by Tab (Status)
        if (activeTab !== 'all' && item.status !== activeTab) return false;
        // Filter by Type (Movie/Series)
        if (activeType !== 'all' && item.type !== activeType) return false;
        // Filter by Search
        if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => b.addedAt - a.addedAt); // Newest first
  }, [library, activeTab, activeType, searchQuery]);

  // Split logic for Movies (Theater vs VOD)
  const movieSections = useMemo(() => {
    if (activeType !== 'movie') return null;

    const theatrical = filteredLibrary.filter(item => !item.releaseSource || item.releaseSource === 'Theater');
    const vod = filteredLibrary.filter(item => item.releaseSource === 'VOD');
    return { theatrical, vod };
  }, [filteredLibrary, activeType]);

  // --- Handlers ---
  const handleAddItem = async (result: SearchResult) => {
    if (!user) return;

    // Fetch additional details (Runtime)
    const details = await getMediaDetails(result.tmdbId, result.type);
    const id = crypto.randomUUID();

    const newItem: MediaItem = {
      id,
      tmdbId: result.tmdbId,
      title: result.title,
      type: result.type,
      status: 'watchlist', // Default status
      year: result.year,
      description: result.description,
      posterPath: result.posterPath,
      backdropPath: result.backdropPath,
      voteAverage: result.voteAverage,
      runtime: details.runtime,
      addedAt: Date.now(),
      progress: { season: 1, episode: 1 },
      releaseSource: result.type === 'movie' ? 'Theater' : undefined, // Default to theater for movies
    };
    
    // Optimistic UI update (though snapshot is fast)
    setIsAddModalOpen(false);
    setEditingItem(newItem);

    // Save to Firestore
    try {
        await setDoc(doc(db, 'users', user.uid, 'library', id), newItem);
    } catch (e) {
        console.error("Error adding document: ", e);
        alert("Failed to save item to database.");
    }
  };

  const handleUpdateItem = async (updated: MediaItem) => {
    if (!user) return;
    setEditingItem(null);
    try {
        await setDoc(doc(db, 'users', user.uid, 'library', updated.id), updated);
    } catch (e) {
        console.error("Error updating document: ", e);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!user) return;
    if (confirm('Are you sure you want to remove this from your library?')) {
        setEditingItem(null);
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'library', id));
        } catch (e) {
            console.error("Error deleting document: ", e);
        }
    }
  };

  const handleQuickAction = async (item: MediaItem, action: 'watched' | 'increment') => {
    if (!user) return;

    let updated = { ...item };
    if (action === 'watched') {
        updated.status = 'watched' as WatchStatus;
    } else if (action === 'increment') {
        // Only for series in progress
        const currentEp = item.progress.episode || 1;
        updated.progress = { ...item.progress, episode: currentEp + 1 };
    }
    
    try {
        await setDoc(doc(db, 'users', user.uid, 'library', item.id), updated);
    } catch (e) {
        console.error("Error updating quick action: ", e);
    }
  };

  // --- Render Loading / Auth / App ---

  if (authLoading) {
      return (
          <div className="min-h-screen bg-[#141414] flex items-center justify-center">
              <Loader2 className="animate-spin text-red-600" size={48} />
          </div>
      );
  }

  if (!user) {
      return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-[#141414] text-white flex flex-col font-sans">
      
      {/* --- Navbar --- */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/90 to-black/0 h-24 px-6 md:px-10 flex items-center justify-between backdrop-blur-md bg-black/60 border-b border-white/5">
        <div className="flex items-center gap-10">
            <h1 className="text-3xl font-bold text-red-600 tracking-tighter cursor-pointer flex items-center gap-2" onClick={() => {setActiveTab('all'); setActiveType('all')}}>
                <Clapperboard size={28} />
                CINETRACK
            </h1>
            
            {/* Desktop Navigation */}
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

        <div className="flex items-center gap-4">
             {/* Search Input (Desktop) */}
            <div className={`hidden md:flex items-center bg-[#222] border border-transparent focus-within:border-gray-500 transition-colors px-3 py-2 rounded-full`}>
                <Search size={18} className="text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Search library..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none focus:outline-none text-sm px-2 w-48 text-white placeholder-gray-500"
                />
            </div>
            
            <button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-white hover:bg-gray-200 text-black px-5 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105"
            >
                <Plus size={18} strokeWidth={3} /> <span className="hidden sm:inline">Add</span>
            </button>

            <button
                onClick={logout}
                title="Sign Out"
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
            >
                <LogOut size={20} />
            </button>
        </div>
      </nav>

      {/* --- Main Content --- */}
      <main className="flex-1 px-4 md:px-10 pt-28 pb-12 overflow-y-auto w-full max-w-[1920px] mx-auto">
        
        {/* Mobile Filters */}
        <div className="md:hidden flex flex-col gap-4 mb-8">
             <div className="flex items-center bg-[#222] rounded-full px-4 py-2.5">
                <Search size={18} className="text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Search library..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none focus:outline-none text-sm px-3 w-full text-white"
                />
            </div>
            <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar">
                {(['all', 'watchlist', 'in-progress', 'watched'] as const).map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-semibold border transition-all ${
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

        {/* Large Mode Switcher & Counter */}
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-10 gap-4">
            
            {/* Prominent Mode Toggle */}
            <div className="flex bg-[#1a1a1a] p-1.5 rounded-xl border border-gray-800 w-full md:w-auto">
                <button 
                    onClick={() => setActiveType('all')}
                    className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
                        activeType === 'all' 
                        ? 'bg-[#333] text-white shadow-lg ring-1 ring-white/10' 
                        : 'text-gray-400 hover:text-white hover:bg-[#252525]'
                    }`}
                >
                    <LayoutGrid size={18} /> All Media
                </button>
                <div className="w-px bg-gray-800 my-2 mx-1"></div>
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
                <div className="w-px bg-gray-800 my-2 mx-1"></div>
                <button 
                    onClick={() => setActiveType('series')}
                    className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
                        activeType === 'series' 
                        ? 'bg-purple-900/40 text-purple-400 shadow-lg ring-1 ring-purple-500/20' 
                        : 'text-gray-400 hover:text-white hover:bg-[#252525]'
                    }`}
                >
                    <Tv size={18} /> TV Series
                </button>
            </div>

            <div className="text-gray-400 text-sm font-medium px-2">
                {libraryLoading ? (
                    <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={14}/> Syncing...</span>
                ) : (
                    <span>Showing {filteredLibrary.length} {filteredLibrary.length === 1 ? 'item' : 'items'}</span>
                )}
            </div>
        </div>

        {/* Content Render Logic */}
        {filteredLibrary.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-gray-500 bg-[#1a1a1a] rounded-3xl border border-dashed border-gray-800">
                <div className="bg-[#222] p-6 rounded-full mb-4">
                    <ListFilter size={48} className="opacity-50" />
                </div>
                <p className="text-xl font-medium text-gray-300">
                    {libraryLoading ? 'Loading Library...' : 'No media found'}
                </p>
                <p className="text-sm mt-2 opacity-60">
                    {libraryLoading ? 'Syncing with cloud database...' : 'Try adjusting your filters or search query.'}
                </p>
                {!libraryLoading && library.length === 0 && (
                    <button onClick={() => setIsAddModalOpen(true)} className="mt-6 text-black bg-white px-6 py-2 rounded-full font-bold hover:scale-105 transition-transform">
                        Add your first movie
                    </button>
                )}
            </div>
        ) : (
             <>
                {/* Specific Layout for Movies Mode */}
                {activeType === 'movie' && movieSections ? (
                    <div className="space-y-16 animate-in fade-in duration-500">
                        {/* Theatrical Section */}
                        {movieSections.theatrical.length > 0 && (
                            <section>
                                <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
                                    <div className="p-2 bg-blue-900/30 text-blue-400 rounded-lg">
                                        <Ticket size={24} />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white">Theatrical Releases</h2>
                                    <span className="text-sm font-medium text-gray-500 bg-gray-900 px-2 py-1 rounded-md">{movieSections.theatrical.length}</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-x-6 gap-y-10">
                                    {movieSections.theatrical.map(item => (
                                        <MediaCard 
                                            key={item.id} 
                                            item={item} 
                                            onClick={() => setEditingItem(item)}
                                            onQuickAction={handleQuickAction}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* VOD Section */}
                        {movieSections.vod.length > 0 && (
                             <section>
                                <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
                                     <div className="p-2 bg-purple-900/30 text-purple-400 rounded-lg">
                                        <MonitorPlay size={24} />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white">Streaming Originals</h2>
                                    <span className="text-sm font-medium text-gray-500 bg-gray-900 px-2 py-1 rounded-md">{movieSections.vod.length}</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-x-6 gap-y-10">
                                    {movieSections.vod.map(item => (
                                        <MediaCard 
                                            key={item.id} 
                                            item={item} 
                                            onClick={() => setEditingItem(item)}
                                            onQuickAction={handleQuickAction}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Fallback if logic matches nothing (shouldn't happen if length > 0) */}
                         {movieSections.theatrical.length === 0 && movieSections.vod.length === 0 && (
                            <div className="text-center py-12 text-gray-500">No movies match the current filters.</div>
                        )}
                    </div>
                ) : (
                    /* Default Grid for All / Series */
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-x-6 gap-y-10 animate-in fade-in duration-500">
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

      {/* --- Modals --- */}
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
