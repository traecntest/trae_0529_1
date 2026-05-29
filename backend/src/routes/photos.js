const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const { db, logAction } = require('../models/database');

const UPLOADS_DIR = path.join(__dirname, '../uploads');
const THUMBNAILS_DIR = path.join(UPLOADS_DIR, 'thumbnails');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(THUMBNAILS_DIR)) fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) cb(null, true);
  else cb(new Error('Only image files are allowed!'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }
});

const createThumbnail = async (filePath, filename) => {
  const thumbnailPath = path.join(THUMBNAILS_DIR, `thumb_${filename}`);
  await sharp(filePath)
    .resize(300, 300, { fit: 'cover', withoutEnlargement: true })
    .toFile(thumbnailPath);
  return thumbnailPath;
};

const getImageDimensions = async (filePath) => {
  const metadata = await sharp(filePath).metadata();
  return { width: metadata.width, height: metadata.height };
};

router.post('/upload/:albumId', upload.array('photos', 50), async (req, res) => {
  const { albumId } = req.params;
  const results = [];
  
  try {
    for (const file of req.files) {
      const thumbnailPath = await createThumbnail(file.path, file.filename);
      const { width, height } = await getImageDimensions(file.path);
      
      const sql = `
        INSERT INTO photos (album_id, filename, original_name, file_path, thumbnail_path, file_size, width, height)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await new Promise((resolve, reject) => {
        db.run(sql, [
          albumId,
          file.filename,
          file.originalname,
          file.path,
          thumbnailPath,
          file.size,
          width,
          height
        ], function(err) {
          if (err) reject(err);
          else {
            results.push({
              id: this.lastID,
              filename: file.filename,
              original_name: file.originalname,
              width,
              height,
              size: file.size
            });
            resolve();
          }
        });
      });
    }
    
    logAction('info', 'upload_photos', `Uploaded ${results.length} photos to album ${albumId}`);
    res.json({ success: true, photos: results });
  } catch (err) {
    logAction('error', 'upload_photos', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/', (req, res) => {
  const { album_id, tag, sort_by = 'created_at', sort_order = 'DESC', limit, offset } = req.query;
  
  let sql = 'SELECT * FROM photos';
  const params = [];
  const conditions = [];
  
  if (album_id) {
    conditions.push('album_id = ?');
    params.push(album_id);
  }
  
  if (tag) {
    conditions.push('tags LIKE ?');
    params.push(`%${tag}%`);
  }
  
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  
  sql += ` ORDER BY ${sort_by} ${sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}`;
  
  if (limit) {
    sql += ' LIMIT ?';
    params.push(parseInt(limit));
  }
  
  if (offset) {
    sql += ' OFFSET ?';
    params.push(parseInt(offset));
  }
  
  db.all(sql, params, (err, rows) => {
    if (err) {
      logAction('error', 'get_photos', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM photos WHERE id = ?', [id], (err, photo) => {
    if (err) {
      logAction('error', 'get_photo', err.message);
      return res.status(500).json({ error: err.message });
    }
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    res.json(photo);
  });
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { original_name, description, tags } = req.body;
  
  const sql = `
    UPDATE photos 
    SET original_name = ?, description = ?, tags = ?
    WHERE id = ?
  `;
  
  db.run(sql, [original_name, description || '', tags || '', id], function(err) {
    if (err) {
      logAction('error', 'update_photo', err.message);
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    logAction('info', 'update_photo', `Updated photo ${id}`);
    res.json({ message: 'Photo updated successfully' });
  });
});

router.put('/:id/move', (req, res) => {
  const { id } = req.params;
  const { album_id } = req.body;
  
  const sql = 'UPDATE photos SET album_id = ? WHERE id = ?';
  
  db.run(sql, [album_id, id], function(err) {
    if (err) {
      logAction('error', 'move_photo', err.message);
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    logAction('info', 'move_photo', `Moved photo ${id} to album ${album_id}`);
    res.json({ message: 'Photo moved successfully' });
  });
});

router.post('/batch/move', (req, res) => {
  const { photo_ids, album_id } = req.body;
  
  if (!photo_ids || !Array.isArray(photo_ids) || photo_ids.length === 0) {
    return res.status(400).json({ error: 'Photo IDs array is required' });
  }
  
  const placeholders = photo_ids.map(() => '?').join(',');
  const sql = `UPDATE photos SET album_id = ? WHERE id IN (${placeholders})`;
  const params = [album_id, ...photo_ids];
  
  db.run(sql, params, function(err) {
    if (err) {
      logAction('error', 'batch_move_photos', err.message);
      return res.status(500).json({ error: err.message });
    }
    logAction('info', 'batch_move_photos', `Moved ${this.changes} photos to album ${album_id}`);
    res.json({ message: `${this.changes} photos moved successfully` });
  });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT file_path, thumbnail_path FROM photos WHERE id = ?', [id], (err, photo) => {
    if (err) {
      logAction('error', 'delete_photo', err.message);
      return res.status(500).json({ error: err.message });
    }
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    if (photo.file_path && fs.existsSync(photo.file_path)) {
      fs.unlinkSync(photo.file_path);
    }
    if (photo.thumbnail_path && fs.existsSync(photo.thumbnail_path)) {
      fs.unlinkSync(photo.thumbnail_path);
    }
    
    db.run('DELETE FROM photos WHERE id = ?', [id], function(err) {
      if (err) {
        logAction('error', 'delete_photo', err.message);
        return res.status(500).json({ error: err.message });
      }
      logAction('info', 'delete_photo', `Deleted photo ${id}`);
      res.json({ message: 'Photo deleted successfully' });
    });
  });
});

router.post('/batch/delete', (req, res) => {
  const { photo_ids } = req.body;
  
  if (!photo_ids || !Array.isArray(photo_ids) || photo_ids.length === 0) {
    return res.status(400).json({ error: 'Photo IDs array is required' });
  }
  
  const placeholders = photo_ids.map(() => '?').join(',');
  
  db.all(`SELECT file_path, thumbnail_path FROM photos WHERE id IN (${placeholders})`, photo_ids, (err, photos) => {
    if (err) {
      logAction('error', 'batch_delete_photos', err.message);
      return res.status(500).json({ error: err.message });
    }
    
    photos.forEach(photo => {
      if (photo.file_path && fs.existsSync(photo.file_path)) {
        fs.unlinkSync(photo.file_path);
      }
      if (photo.thumbnail_path && fs.existsSync(photo.thumbnail_path)) {
        fs.unlinkSync(photo.thumbnail_path);
      }
    });
    
    db.run(`DELETE FROM photos WHERE id IN (${placeholders})`, photo_ids, function(err) {
      if (err) {
        logAction('error', 'batch_delete_photos', err.message);
        return res.status(500).json({ error: err.message });
      }
      logAction('info', 'batch_delete_photos', `Deleted ${this.changes} photos`);
      res.json({ message: `${this.changes} photos deleted successfully` });
    });
  });
});

router.get('/image/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(UPLOADS_DIR, filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Image not found' });
  }
});

router.get('/thumbnail/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(THUMBNAILS_DIR, `thumb_${filename}`);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Thumbnail not found' });
  }
});

router.get('/tags/all', (req, res) => {
  db.all('SELECT DISTINCT tags FROM photos WHERE tags IS NOT NULL AND tags != ""', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const allTags = new Set();
    rows.forEach(row => {
      if (row.tags) {
        row.tags.split(',').forEach(tag => {
          const trimmed = tag.trim();
          if (trimmed) allTags.add(trimmed);
        });
      }
    });
    
    res.json(Array.from(allTags).sort());
  });
});

module.exports = router;
