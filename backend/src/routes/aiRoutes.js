import express from 'express';
import multer from 'multer';
import { handleAISettings, handleKnowledgeIngest, handleSecureChat } from '../controllers/aiController.js';

const router = express.Router();

// Setup Multer for reading the .md file from memory without writing physical temporary files to the server
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.md')) {
      cb(null, true);
    } else {
      cb(new Error('Extension rejected. Only structural .md files are accepted.'));
    }
  }
});

// Endpoint 1:  Ingest Matrix new uploaded knowledge base into Supabase pgvector
router.post('/upload-knowledge', upload.single('file'), handleKnowledgeIngest);

// Endpoint 2: Secure Chat Bot Route (Moving RAG Brain to Backend)
router.post('/chat', handleSecureChat);

// Endpoint 3: Active knowledge-base metadata for the admin settings UI.
router.get('/settings', handleAISettings);

export default router;
