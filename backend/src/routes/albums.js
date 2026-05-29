const express = require('express');
const router = express.Router();
const { db, logAction } = require('../models/database');

router.get('/', (req, res) => {
  const sql = `
    SELECT a.*, 
           p.filename as cover_filename,
           p.thumbnail_path as cover_thumbnail,
           COUNT(ph.id) as photo_count
    FROM albums a
    LEFT JOIN photos p ON a.cover_photo_id = p.id
    LEFT JOIN photos ph ON a.id = ph.album_id
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      logAction('error', 'get_albums', err.message);
      return res.status(500).json({ error: err.message });
    }
    logAction('info', 'get_albums', `Retrieved ${rows.length} albums`);
    res.json(rows);
  });
});

router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM albums WHERE id = ?', [id], (err, album) => {
    if (err) {
      logAction('error', 'get_album', err.message);
      return res.status(500).json({ error: err.message });
    }
    if (!album) {
      return res.status(404).json({ error: 'Album not found' });
    }
    logAction('info', 'get_album', `Retrieved album ${id}`);
    res.json(album);
  });
});

router.post('/', (req, res) => {
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Album name is required' });
  }
  
  const sql = 'INSERT INTO albums (name, description) VALUES (?, ?)';
  
  db.run(sql, [name, description || ''], function(err) {
    if (err) {
      logAction('error', 'create_album', err.message);
      return res.status(500).json({ error: err.message });
    }
    logAction('info', 'create_album', `Created album ${name}`);
    res.json({ id: this.lastID, name, description });
  });
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, cover_photo_id } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Album name is required' });
  }
  
  const sql = `
    UPDATE albums 
    SET name = ?, description = ?, cover_photo_id = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  
  db.run(sql, [name, description || '', cover_photo_id || null, id], function(err) {
    if (err) {
      logAction('error', 'update_album', err.message);
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Album not found' });
    }
    logAction('info', 'update_album', `Updated album ${id}`);
    res.json({ id, name, description, cover_photo_id });
  });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  db.serialize(() => {
    db.all('SELECT file_path, thumbnail_path FROM photos WHERE album_id = ?', [id], (err, photos) => {
      if (err) {
        logAction('error', 'delete_album', err.message);
        return res.status(500).json({ error: err.message });
      }
      
      const fs = require('fs');
      const path = require('path');
      
      photos.forEach(photo => {
        if (photo.file_path && fs.existsSync(photo.file_path)) {
          fs.unlinkSync(photo.file_path);
        }
        if (photo.thumbnail_path && fs.existsSync(photo.thumbnail_path)) {
          fs.unlinkSync(photo.thumbnail_path);
        }
      });
    });
    
    db.run('DELETE FROM albums WHERE id = ?', [id], function(err) {
      if (err) {
        logAction('error', 'delete_album', err.message);
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Album not found' });
      }
      logAction('info', 'delete_album', `Deleted album ${id}`);
      res.json({ message: 'Album deleted successfully' });
    });
  });
});

router.put('/:id/cover', (req, res) => {
  const { id } = req.params;
  const { photo_id } = req.body;
  
  const sql = 'UPDATE albums SET cover_photo_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
  
  db.run(sql, [photo_id, id], function(err) {
    if (err) {
      logAction('error', 'set_album_cover', err.message);
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Album not found' });
    }
    logAction('info', 'set_album_cover', `Set cover for album ${id} to photo ${photo_id}`);
    res.json({ message: 'Cover updated successfully' });
  });
});

module.exports = router;
