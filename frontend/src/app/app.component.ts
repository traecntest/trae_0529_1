import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, MatToolbarModule, MatButtonModule, MatIconModule],
  template: `
    <mat-toolbar color="primary">
      <button mat-icon-button routerLink="/albums">
        <mat-icon>photo_album</mat-icon>
      </button>
      <span>相册管理系统</span>
      <span class="spacer"></span>
      <button mat-button routerLink="/albums">
        <mat-icon>library_books</mat-icon>
        相册
      </button>
      <button mat-button routerLink="/admin">
        <mat-icon>settings</mat-icon>
        管理
      </button>
    </mat-toolbar>
    <main>
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [`
    main { padding: 20px; }
    .spacer { flex: 1 1 auto; }
  `]
})
export class AppComponent {
  title = 'photo-album';
}
