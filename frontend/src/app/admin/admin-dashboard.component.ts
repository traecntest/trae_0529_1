import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ApiService } from '../services/api.service';
import { SystemStats, SystemLog, AlbumStorage } from '../models/album.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatIconModule, MatTableModule,
    MatTabsModule, MatProgressBarModule
  ],
  template: `
    <h1>系统管理</h1>
    
    @if (stats) {
      <div class="stats-cards">
        <mat-card class="stat-card">
          <mat-icon>photo_album</mat-icon>
          <div class="stat-content">
            <h3>{{ stats.album_count }}</h3>
            <p>相册数量</p>
          </div>
        </mat-card>
        
        <mat-card class="stat-card">
          <mat-icon>photo</mat-icon>
          <div class="stat-content">
            <h3>{{ stats.photo_count }}</h3>
            <p>照片数量</p>
          </div>
        </mat-card>
        
        <mat-card class="stat-card">
          <mat-icon>storage</mat-icon>
          <div class="stat-content">
            <h3>{{ formatSize(stats.actual_storage) }}</h3>
            <p>已用存储空间</p>
          </div>
        </mat-card>
      </div>
      
      <mat-tab-group>
        <mat-tab label="存储空间统计">
          <div class="tab-content">
            <h3>各相册存储空间使用情况</h3>
            <table mat-table [dataSource]="stats.albums_by_storage" class="storage-table">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>相册名称</th>
                <td mat-cell *matCellDef="let album">{{ album.name }}</td>
              </ng-container>
              
              <ng-container matColumnDef="photo_count">
                <th mat-header-cell *matHeaderCellDef>照片数量</th>
                <td mat-cell *matCellDef="let album">{{ album.photo_count }}</td>
              </ng-container>
              
              <ng-container matColumnDef="storage_used">
                <th mat-header-cell *matHeaderCellDef>存储空间</th>
                <td mat-cell *matCellDef="let album">{{ formatSize(album.storage_used) }}</td>
              </ng-container>
              
              <ng-container matColumnDef="percentage">
                <th mat-header-cell *matHeaderCellDef>占比</th>
                <td mat-cell *matCellDef="let album">
                  <mat-progress-bar 
                    mode="determinate" 
                    [value]="getPercentage(album.storage_used)"
                  ></mat-progress-bar>
                  <span class="percentage-text">{{ getPercentage(album.storage_used).toFixed(1) }}%</span>
                </td>
              </ng-container>
              
              <tr mat-header-row *matHeaderRowDef="['name', 'photo_count', 'storage_used', 'percentage']"></tr>
              <tr mat-row *matRowDef="let row; columns: ['name', 'photo_count', 'storage_used', 'percentage']"></tr>
            </table>
          </div>
        </mat-tab>
        
        <mat-tab label="系统日志">
          <div class="tab-content">
            <h3>最近操作日志</h3>
            <table mat-table [dataSource]="logs" class="log-table">
              <ng-container matColumnDef="level">
                <th mat-header-cell *matHeaderCellDef>级别</th>
                <td mat-cell *matCellDef="let log">
                  <span class="log-level" [class]="log.level">{{ log.level }}</span>
                </td>
              </ng-container>
              
              <ng-container matColumnDef="action">
                <th mat-header-cell *matHeaderCellDef>操作</th>
                <td mat-cell *matCellDef="let log">{{ log.action }}</td>
              </ng-container>
              
              <ng-container matColumnDef="message">
                <th mat-header-cell *matHeaderCellDef>消息</th>
                <td mat-cell *matCellDef="let log">{{ log.message || '-' }}</td>
              </ng-container>
              
              <ng-container matColumnDef="created_at">
                <th mat-header-cell *matHeaderCellDef>时间</th>
                <td mat-cell *matCellDef="let log">{{ formatDate(log.created_at) }}</td>
              </ng-container>
              
              <tr mat-header-row *matHeaderRowDef="['level', 'action', 'message', 'created_at']"></tr>
              <tr mat-row *matRowDef="let row; columns: ['level', 'action', 'message', 'created_at']"></tr>
            </table>
          </div>
        </mat-tab>
      </mat-tab-group>
    }
  `,
  styles: [`
    .stats-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .stat-card { display: flex; align-items: center; gap: 16px; padding: 20px; }
    .stat-card mat-icon { font-size: 48px; width: 48px; height: 48px; color: #3f51b5; }
    .stat-content h3 { margin: 0; font-size: 28px; font-weight: bold; }
    .stat-content p { margin: 0; color: #666; }
    .tab-content { padding: 20px 0; }
    .storage-table, .log-table { width: 100%; }
    .percentage-text { display: block; text-align: center; margin-top: 4px; font-size: 12px; }
    .log-level { padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500; }
    .log-level.info { background: #e3f2fd; color: #1976d2; }
    .log-level.error { background: #ffebee; color: #d32f2f; }
    .log-level.warning { background: #fff3e0; color: #f57c00; }
  `]
})
export class AdminDashboardComponent implements OnInit {
  stats: SystemStats | null = null;
  logs: SystemLog[] = [];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadLogs();
  }

  loadStats(): void {
    this.api.getStats().subscribe({
      next: (data) => {
        this.stats = data;
      },
      error: () => {
        console.error('Failed to load stats');
      }
    });
  }

  loadLogs(): void {
    this.api.getLogs(100).subscribe({
      next: (data) => {
        this.logs = data;
      },
      error: () => {
        console.error('Failed to load logs');
      }
    });
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getPercentage(storageUsed: number): number {
    if (!this.stats || this.stats.actual_storage === 0) return 0;
    return (storageUsed / this.stats.actual_storage) * 100;
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN');
  }
}
