export type MediaType = 'movie' | 'series';
export type WatchStatus = 'watchlist' | 'in-progress' | 'watched';
export type PersonalRating = 'Excellent' | 'Good' | 'Average' | 'Bad' | 'Terrible';
export type ReleaseSource = 'Theater' | 'VOD';
export type VodProvider = 'Netflix' | 'Hulu' | 'Prime Video' | 'Disney+' | 'HBO Max' | 'Apple TV+' | 'Peacock' | 'Paramount+' | 'Other';

export interface MediaProgress {
  season?: number;
  episode?: number;
  // Percentage for movies or general progress notes
  notes?: string;
}

export interface MediaItem {
  id: string;
  tmdbId?: number;
  title: string;
  type: MediaType;
  status: WatchStatus;
  year?: string;
  description?: string;
  posterPath?: string;
  backdropPath?: string;
  runtime?: number; // In minutes
  voteAverage?: number; // TMDB rating
  progress: MediaProgress;
  rating?: number; // Star rating (kept for compatibility or general use)
  personalRating?: PersonalRating; // New tag based rating for movies
  releaseSource?: ReleaseSource; // New theatrical vs VOD
  vodProvider?: VodProvider; // Specific provider if VOD
  addedAt: number;
}

export interface SearchResult {
  tmdbId: number;
  title: string;
  type: MediaType;
  year: string;
  description: string;
  posterPath?: string;
  backdropPath?: string;
  voteAverage?: number;
}
