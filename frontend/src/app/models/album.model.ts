export interface Album {
  id: number;
  name: string;
  description: string;
  cover_photo_id: number | null;
  cover_filename?: string;
  cover_thumbnail?: string;
  photo_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Photo {
  id: number;
  album_id: number;
  filename: string;
  original_name: string;
  file_path: string;
  thumbnail_path?: string;
  file_size: number;
  width?: number;
  height?: number;
  description: string;
  tags: string;
  taken_at?: string;
  created_at: string;
}

export interface SystemStats {
  album_count: number;
  photo_count: number;
  total_storage: number;
  actual_storage: number;
  albums_by_storage: AlbumStorage[];
}

export interface AlbumStorage {
  id: number;
  name: string;
  photo_count: number;
  storage_used: number;
}

export interface SystemLog {
  id: number;
  level: string;
  action: string;
  message: string;
  created_at: string;
}
