const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { db, logAction } = require('../models/database');

const UPLOADS_DIR = path.join(__dirname, '../uploads');

router.get('/stats', (req, res) => {
  db.serialize(() => {
    const stats = {};
    
    db.get('SELECT COUNT(*) as count FROM albums', [], (err, row) => {
      if (err) {
        logAction('error', 'get_stats', err.message);
        return res.status(500).json({ error: err.message });
      }
      stats.album_count = row.count;
    });
    
    db.get('SELECT COUNT(*) as count FROM photos', [], (err, row) => {
      if (err) {
        logAction('error', 'get_stats', err.message);
        return res.status(500).json({ error: err.message });
      }
      stats.photo_count = row.count;
    });
    
    db.get('SELECT SUM(file_size) as total FROM photos', [], (err, row) => {
      if (err) {
        logAction('error', 'get_stats', err.message);
        return res.status(500).json({ error: err.message });
      }
      stats.total_storage = row.total || 0;
      
      const getDirectorySize = (dirPath) => {
        let total = 0;
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);
          files.forEach(file => {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            if (stats.isFile()) {
              total += stats.size;
            } else if (stats.isDirectory()) {
              total += getDirectorySize(filePath);
            }
          });
        }
        return total;
      };
      
      stats.actual_storage = getDirectorySize(UPLOADS_DIR);
      
      db.all('SELECT a.id, a.name, COUNT(p.id) as photo_count, COALESCE(SUM(p.file_size), 0) as storage_used FROM albums a LEFT JOIN photos p ON a.id = p.album_id GROUP BY a.id ORDER BY storage_used DESC', [], (err, rows) => {
        if (err) {
          logAction('error', 'get_stats', err.message);
          return res.status(500).json({ error: err.message });
        }
        stats.albums_by_storage = rows;
        logAction('info', 'get_stats', 'Retrieved system statistics');
        res.json(stats);
      });
    });
  });
});

router.get('/logs', (req, res) => {
  const { limit = 100, offset = 0, level } = req.query;
  
  let sql = 'SELECT * FROM system_logs';
  const params = [];
  
  if (level) {
    sql += ' WHERE level = ?';
    params.push(level);
  }
  
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  
  db.all(sql, params, (err, rows) => {
    if (err) {
      logAction('error', 'get_logs', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

router.get('/download/:photoId', (req, res) => {
  const { photoId } = req.params;
  
  db.get('SELECT file_path, original_name FROM photos WHERE id = ?', [photoId], (err, photo) => {
    if (err) {
      logAction('error', 'download_photo', err.message);
      return res.status(500).json({ error: err.message });
    }
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    if (!fs.existsSync(photo.file_path)) {
      return res.status(404).json({ error: 'File not found on server' });
    }
    
    logAction('info', 'download_photo', `Downloaded photo ${photoId}: ${photo.original_name}`);
    res.download(photo.file_path, photo.original_name);
  });
});

router.post('/download/batch', (req, res) => {
  const { photo_ids } = req.body;
  
  if (!photo_ids || !Array.isArray(photo_ids) || photo_ids.length === 0) {
    return res.status(400).json({ error: 'Photo IDs array is required' });
  }
  
  const placeholders = photo_ids.map(() => '?').join(',');
  
  db.all(`SELECT file_path, original_name FROM photos WHERE id IN (${placeholders})`, photo_ids, (err, photos) => {
    if (err) {
      logAction('error', 'batch_download', err.message);
      return res.status(500).json({ error: err.message });
    }
    
    if (photos.length === 0) {
      return res.status(404).json({ error: 'No photos found' });
    }
    
    const archive = archiver('zip', { zlib: { level: 9 } });
    const filename = `photos_${Date.now()}.zip`;
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    archive.pipe(res);
    
    photos.forEach(photo => {
      if (fs.existsSync(photo.file_path)) {
        archive.file(photo.file_path, { name: photo.original_name });
      }
    });
    
    archive.finalize();
    
    logAction('info', 'batch_download', `Downloaded ${photos.length} photos as zip`);
  });
});

router.get('/download/album/:albumId', (req, res) => {
  const { albumId } = req.params;
  
  db.get('SELECT name FROM albums WHERE id = ?', [albumId], (err, album) => {
    if (err) {
      logAction('error', 'download_album', err.message);
      return res.status(500).json({ error: err.message });
    }
    if (!album) {
      return res.status(404).json({ error: 'Album not found' });
    }
    
    db.all('SELECT file_path, original_name FROM photos WHERE album_id = ?', [albumId], (err, photos) => {
      if (err) {
        logAction('error', 'download_album', err.message);
        return res.status(500).json({ error: err.message });
      }
      
      if (photos.length === 0) {
        return res.status(404).json({ error: 'No photos in album' });
      }
      
      const archive = archiver('zip', { zlib: { level: 9 } });
      const filename = `${album.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.zip`;
      
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      archive.pipe(res);
      
      photos.forEach(photo => {
        if (fs.existsSync(photo.file_path)) {
          archive.file(photo.file_path, { name: photo.original_name });
        }
      });
      
      archive.finalize();
      
      logAction('info', 'download_album', `Downloaded album ${albumId} (${photos.length} photos)`);
    });
  });
});

module.exports = router;
