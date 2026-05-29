import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'albums',
    pathMatch: 'full'
  },
  {
    path: 'albums',
    loadComponent: () => import('./albums/album-list.component').then(m => m.AlbumListComponent)
  },
  {
    path: 'album/:id',
    loadComponent: () => import('./photos/photo-gallery.component').then(m => m.PhotoGalleryComponent)
  },
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin-dashboard.component').then(m => m.AdminDashboardComponent)
  }
];
