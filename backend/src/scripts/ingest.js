import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// use SERVICE_KEY secret to safely bypass RLS on the backend server
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function chunkText(text) {
  // chunking markdown document based on clustering by headings (##) and filter out small segments
  const chunks = text.split(/\n(?=##\s)/);
  return chunks
    .map(chunk => chunk.trim())
    .filter(chunk => chunk.length > 50);
}

function getEmbeddingApiKey(currentApiKey) {
  return currentApiKey || GEMINI_API_KEY || '';
}

async function requestGeminiEmbedding(text, apiKey) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text }] }
      })
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Gemini Embedding Error: ${JSON.stringify(err)}`);
  }

  const data = await response.json();
  return data.embedding.values;
}

async function getEmbedding(text, currentApiKey) {
  const primaryKey = getEmbeddingApiKey(currentApiKey);
  if (!primaryKey) throw new Error('Gemini embedding API key is not configured.');

  try {
    return await requestGeminiEmbedding(text, primaryKey);
  } catch (error) {
    if (GEMINI_API_KEY && GEMINI_API_KEY !== primaryKey) {
      console.error('[Ingest] Primary Gemini embedding key failed; retrying with GEMINI_API_KEY:', error.message);
      return requestGeminiEmbedding(text, GEMINI_API_KEY);
    }
    throw error;
  }
}

// ─── EXPORT PIPELINE FUNCTION ───────────────────────────────────────────────────────────────
export async function runAutoIngest(markdownContent, currentApiKey) {
  const chunks = chunkText(markdownContent);
  if (chunks.length === 0) throw new Error('No valid structural segments found in the markdown file.');

  const { error: deleteError } = await supabase
    .from('vidhelp_knowledge')
    .delete()
    .neq('id', 0);

  if (deleteError) throw new Error(`Failed to purge legacy vector records: ${deleteError.message}`);

  let successCount = 0;

  // 2. Generate embeddings for each chunk and insert into Supabase pgvector table
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      const embedding = await getEmbedding(chunk, currentApiKey);
      console.log(`[Ingest] Generated embedding for chunk ${i}.`, { dimensions: embedding.length });

      const { data, error } = await supabase
        .from('vidhelp_knowledge')
        .insert({
          content: chunk,
          embedding,
          metadata: { source: 'company_profile', chunk_index: i }
        })
        .select('id, metadata');

      console.log(`[Ingest] Supabase insert response for chunk ${i}:`, { data, error });
      if (error) {
        throw new Error(`Supabase insert failed for chunk ${i}: ${error.message}`);
      }
      if (!data || data.length !== 1) {
        throw new Error(`Supabase insert returned no created row for chunk ${i}.`);
      }

      successCount++;
    } catch (err) {
      console.error(`[Ingest] Failed at chunk ${i}:`, err);
      throw err;
    }
    // Delay between inserts to avoid overwhelming the Supabase service with rapid requests
    await new Promise(r => setTimeout(r, 250));
  }

  if (successCount !== chunks.length) {
    throw new Error(`Ingestion incomplete: inserted ${successCount} of ${chunks.length} chunks.`);
  }

  return { totalChunks: chunks.length, insertedChunks: successCount };
}
