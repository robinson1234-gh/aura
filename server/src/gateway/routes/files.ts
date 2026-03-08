import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { v4 as uuid } from 'uuid';
import { getDatabase } from '../../db/database.js';

const UPLOAD_DIR = path.join(os.homedir(), '.workagent', 'files');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const id = uuid();
    const ext = path.extname(file.originalname);
    cb(null, `${id}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const router = Router();

router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const db = getDatabase();
    const id = uuid();
    const sessionId = req.body.sessionId || null;

    db.prepare(
      'INSERT INTO files (id, session_id, filename, mimetype, size, path) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, sessionId, req.file.originalname, req.file.mimetype, req.file.size, req.file.path);

    res.status(201).json({
      id,
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'File not found' });

    res.download(row.path, row.filename);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
