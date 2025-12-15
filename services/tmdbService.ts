import { SearchResult } from "../types";

const ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJhZTFkMTExODBkOThhYzhjYjM3OTQ0MjQ0NmFiOTQ1MyIsIm5iZiI6MTYxNDM1NTAxMC44MzUsInN1YiI6IjYwMzkxYTQyYWQ1MGYwMDAyOGZjNzI3NSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.siFu94mwJ3Gwtdp1OOhW4UmbMPKDjFKVihwLguXqnrI';

const HEADERS = {
  Authorization: `Bearer ${ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
};

export const searchMedia = async (query: string): Promise<SearchResult[]> => {
  if (!query) return [];

  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`,
      { headers: HEADERS }
    );

    if (!response.ok) {
        throw new Error('TMDB API Error');
    }

    const data = await response.json();
    
    // Filter and map results
    return data.results
      .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
      .map((item: any) => ({
        tmdbId: item.id,
        title: item.title || item.name, // Movies use title, TV uses name
        type: item.media_type === 'tv' ? 'series' : 'movie',
        year: (item.release_date || item.first_air_date || '').split('-')[0],
        description: item.overview,
        posterPath: item.poster_path,
        backdropPath: item.backdrop_path,
        voteAverage: item.vote_average
      }));

  } catch (error) {
    console.error("TMDB Search Error:", error);
    return [];
  }
};

export const getMediaDetails = async (tmdbId: number, type: 'movie' | 'series'): Promise<{ runtime?: number }> => {
    try {
      // Map 'series' to 'tv' for API endpoint
      const endpoint = type === 'series' ? 'tv' : 'movie';
      
      const response = await fetch(
        `https://api.themoviedb.org/3/${endpoint}/${tmdbId}`,
        { headers: HEADERS }
      );
  
      if (!response.ok) {
          // Instead of throwing, we return a default object so the flow continues
          console.warn(`TMDB Details Fetch Failed for ID ${tmdbId}: ${response.statusText}`);
          return { runtime: 0 };
      }
  
      const data = await response.json();
      let runtime = 0;
  
      if (type === 'movie') {
          runtime = data.runtime || 0;
      } else {
          // TV shows: episode_run_time is an array of runtimes for episodes
          // Sometimes it's empty, or null.
          if (data.episode_run_time && Array.isArray(data.episode_run_time) && data.episode_run_time.length > 0) {
              runtime = data.episode_run_time[0];
          }
      }
      return { runtime };
    } catch (error) {
        console.error("TMDB Details Error:", error);
        // Fallback to prevent app crash
        return { runtime: 0 };
    }
  };