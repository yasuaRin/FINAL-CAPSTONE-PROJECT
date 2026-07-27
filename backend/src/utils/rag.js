import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const NO_CONTEXT_FALLBACK = 'Mohon maaf, informasi tersebut belum tersedia di sistem kami. Silakan hubungi tim VidHelp via WhatsApp: https://wa.me/6289530702882';

async function getSettings() {
  const res = await supabaseAdmin.from('ai_settings').select('*').eq('id', 1).single();
  if (res.error || !res.data) {
    return {
      provider: 'gemini',
      model_chat: 'gemini-2.5-flash',
      model_embedding: 'gemini-embedding-001',
      api_key: process.env.GEMINI_API_KEY || '',
    };
  }
  return res.data;
}

function getEmbeddingApiKey(settings) {
  // Groq credentials must never be sent to the Google embedding endpoint.
  if (settings.provider === 'groq') return process.env.GEMINI_API_KEY || '';
  return settings.api_key || process.env.GEMINI_API_KEY || '';
}

async function requestGeminiEmbedding(text, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/gemini-embedding-001',
      content: { parts: [{ text }] }
    })
  });

  if (!res.ok) {
    const responseBody = await res.text().catch(() => 'Unable to read Gemini error response.');
    throw new Error(`Gemini embedding request failed (${res.status} ${res.statusText}): ${responseBody}`);
  }

  const data = await res.json();
  if (!Array.isArray(data?.embedding?.values) || data.embedding.values.length === 0) {
    throw new Error('Gemini embedding response did not contain a valid vector.');
  }
  return data.embedding.values;
}

async function getQueryEmbedding(text, settings) {
  if (settings.provider === 'gemini' || settings.provider === 'groq') {
    const primaryKey = getEmbeddingApiKey(settings);
    const fallbackKey = process.env.GEMINI_API_KEY || '';

    if (!primaryKey) throw new Error('Gemini embedding API key is not configured.');

    try {
      return await requestGeminiEmbedding(text, primaryKey);
    } catch (error) {
      // A database key can be stale/invalid. Retry only with the known Gemini environment key.
      if (fallbackKey && fallbackKey !== primaryKey) {
        console.error('[RAG] Primary Gemini embedding key failed; retrying with GEMINI_API_KEY:', error.message);
        return requestGeminiEmbedding(text, fallbackKey);
      }
      throw error;
    }
  }
  throw new Error(`Provider ${settings.provider} alignment issue.`);
}

async function retrieveContext(question, settings) {
  console.log('[RAG] Generating query vector.', { questionLength: question.length, provider: settings.provider });

  try {
    const embedding = await getQueryEmbedding(question, settings);
    console.log('[RAG] Query vector generated.', { dimensions: embedding.length });

    const { data, error } = await supabaseAdmin.rpc('match_knowledge', {
      query_embedding: embedding,
      match_threshold: 0.30,
      match_count: 4,
    });

    if (error) {
      console.error('[RAG] Supabase match_knowledge RPC failed:', error);
      throw new Error(`Supabase match_knowledge RPC failed: ${error.message}`);
    }

    const chunks = data || [];
    console.log('[RAG] match_knowledge RPC output:', chunks);
    console.log('[RAG] Retrieval summary:', {
      chunkCount: chunks.length,
      similarityScores: chunks.map(chunk => chunk.similarity ?? chunk.score ?? null),
    });

    return chunks.map(row => row.content).filter(Boolean).join('\n\n---\n\n');
  } catch (error) {
    console.error('[RAG] Retrieval failed:', {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

async function generateAnswer(question, context, chatHistory, settings) {
  const systemPrompt = `You are "VidBot", the friendly and professional AI Sales Assistant for VidHelp Agency.
Answer ONLY based on the CONTEXT below. Never invent facts or numbers. Match the user's language.

CONTEXT FROM KNOWLEDGE BASE:
${context || 'No context found. Route user to official WhatsApp: +62 89530702882.'}`;

  if (settings.provider === 'gemini') {
    const contents = chatHistory.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    }));
    contents.push({ role: 'user', parts: [{ text: `${systemPrompt}\n\nQuestion: ${question}` }] });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${settings.model_chat}:generateContent?key=${settings.api_key}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig: { temperature: 0.3, maxOutputTokens: 600 } })
    });
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'System anomaly. Please retry.';
  } 
  
  if (settings.provider === 'groq') {
    // Integration Llama 3.1 via Groq Gateway Cloud SDK
    const messages = [{ role: 'system', content: systemPrompt }];
    chatHistory.forEach(m => messages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));
    messages.push({ role: 'user', content: question });

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.api_key}`,
      },
      body: JSON.stringify({ model: settings.model_chat, messages, temperature: 0.3 })
    });
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || 'Groq response mapping failure.';
  }
}

export async function askVidHelpServerSide(question, chatHistory = []) {
  const settings = await getSettings();
  const context = await retrieveContext(question, settings);
  if (!context) {
    console.warn('[RAG] No knowledge chunks retrieved; returning deterministic fallback.');
    return NO_CONTEXT_FALLBACK;
  }
  return generateAnswer(question, context, chatHistory, settings);
}
