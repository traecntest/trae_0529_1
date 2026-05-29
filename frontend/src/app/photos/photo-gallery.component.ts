import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../services/api.service';
import { Album, Photo } from '../models/album.model';

@Component({
  selector: 'app-photo-gallery',
  standalone: true,
  imports: [
    CommonModule, MatButtonModule, MatIconModule, MatProgressBarModule,
    MatDialogModule, MatInputModule, MatFormFieldModule, FormsModule,
    MatSelectModule, MatChipsModule, MatSnackBarModule, MatCheckboxModule,
    MatMenuModule, MatTooltipModule
  ],
  template: `
    <div class="gallery-header">
      <button mat-icon-button routerLink="/albums">
        <mat-icon>arrow_back</mat-icon>
      </button>
      <h2>{{ album?.name || '照片库' }}</h2>
      <span class="spacer"></span>
      
      <mat-form-field appearance="fill" class="filter-field">
        <mat-label>按标签筛选</mat-label>
        <mat-select [(ngModel)]="selectedTag" (selectionChange)="filterPhotos()">
          <mat-option value="">全部照片</mat-option>
          @for (tag of allTags; track tag) {
            <mat-option [value]="tag">{{ tag }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      
      <button mat-raised-button (click)="fileInput.click()" [disabled]="!album">
        <mat-icon>upload</mat-icon>
        上传照片
      </button>
      <input #fileInput type="file" multiple accept="image/*" hidden (change)="onFileSelect($event)">
      
      @if (selectedPhotos.length > 0) {
        <button mat-raised-button color="warn" (click)="batchDelete()">
          <mat-icon>delete</mat-icon>
          删除 ({{ selectedPhotos.length }})
        </button>
        <button mat-raised-button [matMenuTriggerFor]="moveMenu">
          <mat-icon>drive_file_move</mat-icon>
          移动
        </button>
        <button mat-raised-button (click)="batchDownload()">
          <mat-icon>download</mat-icon>
          下载
        </button>
      }
    </div>
    
    @if (uploading) {
      <div class="upload-progress">
        <span>上传中... {{ uploadProgress }}%</span>
        <mat-progress-bar mode="determinate" [value]="uploadProgress"></mat-progress-bar>
      </div>
    }
    
    <div 
      class="drop-zone"
      [class.drag-over]="isDragOver"
      (dragover)="onDragOver($event)"
      (dragleave)="isDragOver = false"
      (drop)="onDrop($event)"
    >
      <div class="photo-grid">
        @for (photo of filteredPhotos; track photo.id) {
          <div class="photo-card" [class.selected]="isSelected(photo.id)">
            <mat-checkbox 
              class="photo-checkbox" 
              [checked]="isSelected(photo.id)"
              (change)="toggleSelection(photo.id)"
              (click)="$event.stopPropagation()"
            ></mat-checkbox>
            <img 
              [src]="api.getThumbnailUrl(photo.filename)" 
              [alt]="photo.original_name"
              (click)="openLightbox(photo)"
            >
            <div class="photo-overlay">
              <button mat-icon-button (click)="$event.stopPropagation(); openEditDialog(photo)">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button (click)="$event.stopPropagation(); setCover(photo)">
                <mat-icon>star</mat-icon>
              </button>
              <button mat-icon-button (click)="$event.stopPropagation(); api.downloadPhoto(photo.id)">
                <mat-icon>download</mat-icon>
              </button>
            </div>
          </div>
        }
        
        @if (filteredPhotos.length === 0 && !loading) {
          <div class="empty-state">
            <mat-icon>photo</mat-icon>
            <p>{{ selectedTag ? '没有匹配的照片' : '还没有照片，上传一些吧！' }}</p>
            <p class="hint">拖拽照片到这里也可以上传</p>
          </div>
        }
      </div>
    </div>
    
    <mat-menu #moveMenu="matMenu">
      @for (alb of allAlbums; track alb.id) {
        @if (alb.id !== albumId) {
          <button mat-menu-item (click)="batchMove(alb.id)">
            {{ alb.name }}
          </button>
        }
      }
    </mat-menu>
  `,
  styles: [`
    .gallery-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
    .spacer { flex: 1 1 auto; }
    .filter-field { width: 200px; }
    .upload-progress { margin-bottom: 20px; }
    .drop-zone { min-height: 400px; border: 2px dashed transparent; border-radius: 8px; transition: all 0.3s; }
    .drag-over { border-color: #3f51b5; background: rgba(63, 81, 181, 0.05); }
    .photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; padding: 16px; }
    .photo-card { position: relative; aspect-ratio: 1; overflow: hidden; border-radius: 8px; cursor: pointer; }
    .photo-card img { width: 100%; height: 100%; object-fit: cover; }
    .photo-card.selected { outline: 3px solid #3f51b5; }
    .photo-checkbox { position: absolute; top: 8px; left: 8px; z-index: 10; }
    .photo-overlay { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.7)); padding: 8px; display: none; justify-content: flex-end; gap: 8px; }
    .photo-card:hover .photo-overlay { display: flex; }
    .photo-overlay button { color: white; }
    .empty-state { grid-column: 1 / -1; text-align: center; padding: 60px; color: #999; }
    .empty-state mat-icon { font-size: 80px; width: 80px; height: 80px; }
    .hint { font-size: 12px; }
  `]
})
export class PhotoGalleryComponent implements OnInit {
  albumId: number = 0;
  album: Album | null = null;
  photos: Photo[] = [];
  filteredPhotos: Photo[] = [];
  allAlbums: Album[] = [];
  allTags: string[] = [];
  selectedTag = '';
  selectedPhotos: number[] = [];
  loading = true;
  uploading = false;
  uploadProgress = 0;
  isDragOver = false;

  constructor(
    public api: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.albumId = parseInt(this.route.snapshot.params['id']);
    this.loadData();
  }

  loadData(): void {
    this.api.getAlbums().subscribe(albums => {
      this.allAlbums = albums;
      this.album = albums.find(a => a.id === this.albumId) || null;
    });
    
    this.api.getPhotos(this.albumId).subscribe({
      next: (data) => {
        this.photos = data;
        this.filteredPhotos = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('加载照片失败', '关闭', { duration: 3000 });
      }
    });
    
    this.api.getAllTags().subscribe(tags => {
      this.allTags = tags;
    });
  }

  filterPhotos(): void {
    if (this.selectedTag) {
      this.filteredPhotos = this.photos.filter(p => 
        p.tags && p.tags.includes(this.selectedTag)
      );
    } else {
      this.filteredPhotos = this.photos;
    }
  }

  isSelected(id: number): boolean {
    return this.selectedPhotos.includes(id);
  }

  toggleSelection(id: number): void {
    const index = this.selectedPhotos.indexOf(id);
    if (index > -1) {
      this.selectedPhotos.splice(index, 1);
    } else {
      this.selectedPhotos.push(id);
    }
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.uploadPhotos(Array.from(input.files));
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    const files = Array.from(event.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      this.uploadPhotos(files);
    }
  }

  uploadPhotos(files: File[]): void {
    if (files.length === 0) return;
    
    this.uploading = true;
    this.uploadProgress = 0;
    
    this.api.uploadPhotos(this.albumId, files, (progress) => {
      this.uploadProgress = progress;
    }).subscribe({
      next: () => {
        this.uploading = false;
        this.snackBar.open('上传成功！', '关闭', { duration: 3000 });
        this.loadData();
      },
      error: () => {
        this.uploading = false;
        this.snackBar.open('上传失败', '关闭', { duration: 3000 });
      }
    });
  }

  openLightbox(photo: Photo): void {
    const index = this.filteredPhotos.findIndex(p => p.id === photo.id);
    this.dialog.open(LightboxComponent, {
      data: { photos: this.filteredPhotos, currentIndex: index },
      maxWidth: '90vw',
      maxHeight: '90vh'
    });
  }

  openEditDialog(photo: Photo): void {
    const dialogRef = this.dialog.open(PhotoEditDialogComponent, {
      width: '400px',
      data: { photo }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadData();
    });
  }

  setCover(photo: Photo): void {
    this.api.setAlbumCover(this.albumId, photo.id).subscribe({
      next: () => {
        this.snackBar.open('已设置为封面', '关闭', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('设置失败', '关闭', { duration: 3000 });
      }
    });
  }

  batchDelete(): void {
    if (confirm(`确定要删除选中的 ${this.selectedPhotos.length} 张照片吗？`)) {
      this.api.batchDeletePhotos(this.selectedPhotos).subscribe({
        next: () => {
          this.selectedPhotos = [];
          this.loadData();
          this.snackBar.open('删除成功', '关闭', { duration: 3000 });
        },
        error: () => {
          this.snackBar.open('删除失败', '关闭', { duration: 3000 });
        }
      });
    }
  }

  batchMove(targetAlbumId: number): void {
    this.api.batchMovePhotos(this.selectedPhotos, targetAlbumId).subscribe({
      next: () => {
        this.selectedPhotos = [];
        this.loadData();
        this.snackBar.open('移动成功', '关闭', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('移动失败', '关闭', { duration: 3000 });
      }
    });
  }

  batchDownload(): void {
    this.api.downloadBatch(this.selectedPhotos);
    this.selectedPhotos = [];
  }
}

@Component({
  selector: 'app-lightbox',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="lightbox">
      <button mat-icon-button class="close-btn" mat-dialog-close>
        <mat-icon>close</mat-icon>
      </button>
      
      <button mat-icon-button class="nav-btn prev" (click)="prev()" [disabled]="currentIndex === 0">
        <mat-icon>chevron_left</mat-icon>
      </button>
      
      <div class="image-container">
        <img [src]="api.getImageUrl(currentPhoto.filename)" [alt]="currentPhoto.original_name">
        <div class="photo-info">
          <h3>{{ currentPhoto.original_name }}</h3>
          <p>{{ currentPhoto.description }}</p>
          @if (currentPhoto.tags) {
            <div class="tags">
              @for (tag of currentPhoto.tags.split(','); track tag) {
                <span class="tag">{{ tag }}</span>
              }
            </div>
          }
        </div>
      </div>
      
      <button mat-icon-button class="nav-btn next" (click)="next()" [disabled]="currentIndex === photos.length - 1">
        <mat-icon>chevron_right</mat-icon>
      </button>
      
      <div class="controls">
        <button mat-icon-button (click)="toggleSlideshow()" matTooltip="幻灯片播放">
          <mat-icon>{{ slideshowPlaying ? 'pause' : 'play_arrow' }}</mat-icon>
        </button>
        <button mat-icon-button (click)="api.downloadPhoto(currentPhoto.id)" matTooltip="下载">
          <mat-icon>download</mat-icon>
        </button>
        <span class="counter">{{ currentIndex + 1 }} / {{ photos.length }}</span>
      </div>
    </div>
  `,
  styles: [`
    .lightbox { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.95); }
    .close-btn { position: absolute; top: 16px; right: 16px; color: white; z-index: 10; }
    .nav-btn { position: absolute; top: 50%; transform: translateY(-50%); color: white; }
    .prev { left: 16px; }
    .next { right: 16px; }
    .image-container { max-width: 80%; max-height: 80%; text-align: center; }
    .image-container img { max-width: 100%; max-height: 70vh; object-fit: contain; }
    .photo-info { color: white; margin-top: 16px; }
    .tags { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 8px; }
    .tag { background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 16px; font-size: 12px; }
    .controls { position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); display: flex; gap: 16px; align-items: center; color: white; }
    .counter { min-width: 60px; text-align: center; }
  `]
})
export class LightboxComponent implements OnInit, OnDestroy {
  photos: Photo[];
  currentIndex: number;
  slideshowPlaying = false;
  private slideshowInterval: any;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    public api: ApiService
  ) {
    this.photos = data.photos;
    this.currentIndex = data.currentIndex;
  }

  ngOnInit(): void {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.prev();
      if (e.key === 'ArrowRight') this.next();
    });
  }

  ngOnDestroy(): void {
    this.stopSlideshow();
  }

  get currentPhoto(): Photo {
    return this.photos[this.currentIndex];
  }

  prev(): void {
    if (this.currentIndex > 0) this.currentIndex--;
  }

  next(): void {
    if (this.currentIndex < this.photos.length - 1) this.currentIndex++;
  }

  toggleSlideshow(): void {
    this.slideshowPlaying = !this.slideshowPlaying;
    if (this.slideshowPlaying) {
      this.slideshowInterval = setInterval(() => {
        if (this.currentIndex < this.photos.length - 1) {
          this.currentIndex++;
        } else {
          this.currentIndex = 0;
        }
      }, 3000);
    } else {
      this.stopSlideshow();
    }
  }

  private stopSlideshow(): void {
    if (this.slideshowInterval) {
      clearInterval(this.slideshowInterval);
      this.slideshowInterval = null;
    }
  }
}

@Component({
  selector: 'app-photo-edit-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatInputModule, MatFormFieldModule, FormsModule],
  template: `
    <h2 mat-dialog-title>编辑照片</h2>
    <mat-dialog-content>
      <mat-form-field appearance="fill" style="width: 100%;">
        <mat-label>文件名</mat-label>
        <input matInput [(ngModel)]="original_name">
      </mat-form-field>
      <mat-form-field appearance="fill" style="width: 100%;">
        <mat-label>描述</mat-label>
        <textarea matInput [(ngModel)]="description" rows="3"></textarea>
      </mat-form-field>
      <mat-form-field appearance="fill" style="width: 100%;">
        <mat-label>标签（逗号分隔）</mat-label>
        <input matInput [(ngModel)]="tags" placeholder="风景, 旅行, 家人">
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>取消</button>
      <button mat-raised-button color="primary" (click)="save()">保存</button>
    </mat-dialog-actions>
  `
})
export class PhotoEditDialogComponent {
  original_name: string;
  description: string;
  tags: string;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private api: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.original_name = data.photo.original_name;
    this.description = data.photo.description || '';
    this.tags = data.photo.tags || '';
  }

  save(): void {
    this.api.updatePhoto(this.data.photo.id, {
      original_name: this.original_name,
      description: this.description,
      tags: this.tags
    }).subscribe({
      next: () => {
        this.snackBar.open('保存成功', '关闭', { duration: 3000 });
        this.dialog.closeAll();
      },
      error: () => {
        this.snackBar.open('保存失败', '关闭', { duration: 3000 });
      }
    });
  }
}
