import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Inject } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../services/api.service';
import { Album } from '../models/album.model';

@Component({
  selector: 'app-album-list',
  standalone: true,
  imports: [
    CommonModule, MatButtonModule, MatCardModule, MatIconModule,
    MatDialogModule, MatInputModule, MatFormFieldModule, FormsModule,
    MatMenuModule, MatSnackBarModule
  ],
  template: `
    <div class="header">
      <h1>我的相册</h1>
      <button mat-raised-button color="primary" (click)="openCreateDialog()">
        <mat-icon>add</mat-icon>
        创建相册
      </button>
    </div>
    
    <div class="album-grid">
      @for (album of albums; track album.id) {
        <mat-card class="album-card" (click)="viewAlbum(album.id)">
          <div class="album-cover">
            @if (album.cover_filename) {
              <img [src]="api.getThumbnailUrl(album.cover_filename)" alt="{{ album.name }}">
            } @else {
              <mat-icon class="default-cover">photo_library</mat-icon>
            }
          </div>
          <mat-card-content>
            <h3>{{ album.name }}</h3>
            <p>{{ album.photo_count || 0 }} 张照片</p>
          </mat-card-content>
          <mat-card-actions>
            <button mat-icon-button (click)="$event.stopPropagation(); openEditDialog(album)">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button (click)="$event.stopPropagation(); deleteAlbum(album)">
              <mat-icon>delete</mat-icon>
            </button>
            <button mat-icon-button (click)="$event.stopPropagation(); api.downloadAlbum(album.id)">
              <mat-icon>download</mat-icon>
            </button>
          </mat-card-actions>
        </mat-card>
      }
      
      @if (albums.length === 0 && !loading) {
        <div class="empty-state">
          <mat-icon>photo_library</mat-icon>
          <p>还没有相册，创建一个吧！</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .album-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; }
    .album-card { cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
    .album-card:hover { transform: translateY(-5px); box-shadow: 0 8px 25px rgba(0,0,0,0.15); }
    .album-cover { height: 200px; display: flex; align-items: center; justify-content: center; background: #f5f5f5; overflow: hidden; }
    .album-cover img { width: 100%; height: 100%; object-fit: cover; }
    .default-cover { font-size: 80px; width: 80px; height: 80px; color: #ccc; }
    .empty-state { grid-column: 1 / -1; text-align: center; padding: 60px; color: #999; }
    .empty-state mat-icon { font-size: 80px; width: 80px; height: 80px; }
  `]
})
export class AlbumListComponent implements OnInit {
  albums: Album[] = [];
  loading = true;

  constructor(
    public api: ApiService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadAlbums();
  }

  loadAlbums(): void {
    this.api.getAlbums().subscribe({
      next: (data) => {
        this.albums = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('加载相册失败', '关闭', { duration: 3000 });
      }
    });
  }

  viewAlbum(id: number): void {
    this.router.navigate(['/album', id]);
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(AlbumDialogComponent, {
      width: '400px',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadAlbums();
    });
  }

  openEditDialog(album: Album): void {
    const dialogRef = this.dialog.open(AlbumDialogComponent, {
      width: '400px',
      data: { mode: 'edit', album }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadAlbums();
    });
  }

  deleteAlbum(album: Album): void {
    if (confirm(`确定要删除相册"${album.name}"吗？所有照片也会被删除。`)) {
      this.api.deleteAlbum(album.id).subscribe({
        next: () => {
          this.loadAlbums();
          this.snackBar.open('相册已删除', '关闭', { duration: 3000 });
        },
        error: () => {
          this.snackBar.open('删除失败', '关闭', { duration: 3000 });
        }
      });
    }
  }
}

@Component({
  selector: 'app-album-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatInputModule, MatFormFieldModule, FormsModule],
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'create' ? '创建相册' : '编辑相册' }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="fill" style="width: 100%;">
        <mat-label>相册名称</mat-label>
        <input matInput [(ngModel)]="name" required>
      </mat-form-field>
      <mat-form-field appearance="fill" style="width: 100%;">
        <mat-label>描述</mat-label>
        <textarea matInput [(ngModel)]="description" rows="3"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>取消</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="!name">保存</button>
    </mat-dialog-actions>
  `
})
export class AlbumDialogComponent {
  name = '';
  description = '';

  constructor(
    public dialog: MatDialog,
    private api: ApiService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    if (data.mode === 'edit' && data.album) {
      this.name = data.album.name;
      this.description = data.album.description;
    }
  }

  save(): void {
    const action = this.data.mode === 'create' 
      ? this.api.createAlbum({ name: this.name, description: this.description })
      : this.api.updateAlbum(this.data.album.id, { name: this.name, description: this.description });

    action.subscribe({
      next: () => {
        this.snackBar.open(this.data.mode === 'create' ? '相册创建成功' : '相册更新成功', '关闭', { duration: 3000 });
        this.dialog.closeAll();
      },
      error: () => {
        this.snackBar.open('操作失败', '关闭', { duration: 3000 });
      }
    });
  }
}
