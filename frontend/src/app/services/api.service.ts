import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Album, Photo, SystemStats, SystemLog } from '../models/album.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = 'http://localhost:3001/api';

  constructor(private http: HttpClient) {}

  getAlbums(): Observable<Album[]> {
    return this.http.get<Album[]>(`${this.baseUrl}/albums`);
  }

  getAlbum(id: number): Observable<Album> {
    return this.http.get<Album>(`${this.baseUrl}/albums/${id}`);
  }

  createAlbum(data: { name: string; description: string }): Observable<Album> {
    return this.http.post<Album>(`${this.baseUrl}/albums`, data);
  }

  updateAlbum(id: number, data: Partial<Album>): Observable<any> {
    return this.http.put(`${this.baseUrl}/albums/${id}`, data);
  }

  deleteAlbum(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/albums/${id}`);
  }

  setAlbumCover(albumId: number, photoId: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/albums/${albumId}/cover`, { photo_id: photoId });
  }

  getPhotos(albumId?: number, tag?: string): Observable<Photo[]> {
    let params = new HttpParams();
    if (albumId) params = params.set('album_id', albumId);
    if (tag) params = params.set('tag', tag);
    return this.http.get<Photo[]>(`${this.baseUrl}/photos`, { params });
  }

  getPhoto(id: number): Observable<Photo> {
    return this.http.get<Photo>(`${this.baseUrl}/photos/${id}`);
  }

  uploadPhotos(albumId: number, files: File[], onProgress?: (progress: number) => void): Observable<any> {
    const formData = new FormData();
    files.forEach(file => formData.append('photos', file));
    
    return new Observable(observer => {
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status === 200) {
          observer.next(JSON.parse(xhr.responseText));
          observer.complete();
        } else {
          observer.error(xhr.statusText);
        }
      };
      xhr.onerror = () => observer.error(xhr.statusText);
      xhr.open('POST', `${this.baseUrl}/photos/upload/${albumId}`);
      xhr.send(formData);
    });
  }

  updatePhoto(id: number, data: Partial<Photo>): Observable<any> {
    return this.http.put(`${this.baseUrl}/photos/${id}`, data);
  }

  movePhoto(id: number, albumId: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/photos/${id}/move`, { album_id: albumId });
  }

  batchMovePhotos(photoIds: number[], albumId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/photos/batch/move`, { photo_ids: photoIds, album_id: albumId });
  }

  deletePhoto(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/photos/${id}`);
  }

  batchDeletePhotos(photoIds: number[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/photos/batch/delete`, { photo_ids: photoIds });
  }

  getImageUrl(filename: string): string {
    return `${this.baseUrl}/photos/image/${filename}`;
  }

  getThumbnailUrl(filename: string): string {
    return `${this.baseUrl}/photos/thumbnail/${filename}`;
  }

  getAllTags(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/photos/tags/all`);
  }

  getStats(): Observable<SystemStats> {
    return this.http.get<SystemStats>(`${this.baseUrl}/admin/stats`);
  }

  getLogs(limit = 100): Observable<SystemLog[]> {
    return this.http.get<SystemLog[]>(`${this.baseUrl}/admin/logs?limit=${limit}`);
  }

  downloadPhoto(photoId: number): void {
    window.open(`${this.baseUrl}/admin/download/${photoId}`, '_blank');
  }

  downloadBatch(photoIds: number[]): void {
    this.http.post(`${this.baseUrl}/admin/download/batch`, { photo_ids: photoIds }, { responseType: 'blob' })
      .subscribe(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `photos_${Date.now()}.zip`;
        a.click();
      });
  }

  downloadAlbum(albumId: number): void {
    window.open(`${this.baseUrl}/admin/download/album/${albumId}`, '_blank');
  }
}
