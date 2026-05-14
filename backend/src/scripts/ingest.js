import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://zzfghscdyvwecxrjzqrn.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_iOUCxEy43pQNarDNBUoDFw_4Dq2lITX';
const GEMINI_KEY = 'AIzaSyDL18_8TjUVBz2v5VU2DP1uZ27MD6Jo_zA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const knowledgeBase = fs.readFileSync('./src/data/vidhelp_knowledge_base.md', 'utf-8');

function chunkText(text) {
  const chunks = text.split(/\n(?=##\s)/);
  return chunks
    .map(chunk => chunk.trim())
    .filter(chunk => chunk.length > 50);
}

async function getEmbedding(text) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_KEY}`,
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
    const err = await response.json();
    throw new Error(`Gemini error ${response.status}: ${JSON.stringify(err)}`);
  }

  const data = await response.json();
  return data.embedding.values;
}

async function ingest() {
  const chunks = chunkText(knowledgeBase);
  console.log(`\nFound ${chunks.length} chunks to embed...\n`);

  const { error: deleteError } = await supabase
    .from('vidhelp_knowledge')
    .delete()
    .neq('id', 0);

  if (deleteError) {
    console.warn('⚠️  Could not clear old data:', deleteError.message);
  } else {
    console.log('Cleared old data ✓\n');
  }

  let successCount = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const preview = chunk.substring(0, 60).replace(/\n/g, ' ');
    console.log(`[${i + 1}/${chunks.length}] Embedding: "${preview}..."`);

    try {
      const embedding = await getEmbedding(chunk);

      const { error } = await supabase
        .from('vidhelp_knowledge')
        .insert({
          content: chunk,
          embedding,
          metadata: { source: 'company_profile', chunk_index: i }
        });

      if (error) {
        console.error(`  ✗ Insert failed: ${error.message}`);
      } else {
        successCount++;
        console.log(`  ✓ Inserted (${embedding.length} dimensions)`);
      }
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}`);
    }

    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n${'─'.repeat(50)}`);
  if (successCount === chunks.length) {
    console.log(`✅ Ingestion complete! All ${successCount}/${chunks.length} chunks inserted.`);
  } else {
    console.log(`⚠️  Ingestion done with issues: ${successCount}/${chunks.length} chunks inserted.`);
  }
  console.log(`${'─'.repeat(50)}\n`);
}

ingest();