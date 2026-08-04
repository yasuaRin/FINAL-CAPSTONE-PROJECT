import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const NO_CONTEXT_FALLBACK = 'Mohon maaf, informasi tersebut belum tersedia di sistem kami. Silakan hubungi tim VidHelp via WhatsApp: https://wa.me/6289530702882';
const DEFAULT_CHAT_MODEL = 'gemini-1.5-flash';
const modelCacheByApiKey = new Map();

function cleanModelName(model) {
  const cleaned = String(model || DEFAULT_CHAT_MODEL)
    .trim()
    .replace(/^(?:models\/)+/i, '');

  return /^gemini-[a-z0-9.-]+$/i.test(cleaned) ? cleaned : DEFAULT_CHAT_MODEL;
}

async function getSettings() {
  const res = await supabaseAdmin.from('ai_settings').select('*').eq('id', 1).single();
  if (res.error || !res.data) {
    return {
      provider: 'gemini',
      model_chat: DEFAULT_CHAT_MODEL,
      model_embedding: 'gemini-embedding-001',
      api_key: process.env.GEMINI_API_KEY || '',
    };
  }
  return {
    ...res.data,
    provider: 'gemini',
    model_chat: cleanModelName(res.data.model_chat),
  };
}

function maskApiKey(apiKey) {
  if (!apiKey) return 'missing';
  if (apiKey.length <= 9) return `${apiKey.slice(0, 3)}...`;
  return `${apiKey.slice(0, 6)}...${apiKey.slice(-3)}`;
}

function getGeminiApiKeyCandidates(settings) {
  const databaseKey = settings.api_key?.trim();
  const environmentKey = process.env.GEMINI_API_KEY?.trim();
  const candidates = [];

  if (databaseKey) candidates.push({ source: 'DATABASE', key: databaseKey });
  if (environmentKey && environmentKey !== databaseKey) candidates.push({ source: 'ENV', key: environmentKey });

  return candidates;
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
  const apiKeyCandidates = getGeminiApiKeyCandidates(settings);
  if (apiKeyCandidates.length === 0) throw new Error('Gemini embedding API key is not configured.');

  const errors = [];
  for (let index = 0; index < apiKeyCandidates.length; index++) {
    const candidate = apiKeyCandidates[index];
    const apiKey = candidate.key;
    if (index > 0 && apiKeyCandidates[index - 1].source === 'DATABASE') {
      console.warn('[AI FALLBACK] Database key failed. Retrying with .env GEMINI_API_KEY...');
    }
    try {
      return { embedding: await requestGeminiEmbedding(text, apiKey), apiKey };
    } catch (error) {
      errors.push(error.message);
      console.error(`[RAG] ${candidate.source} Gemini embedding key failed:`, error.message);
    }
  }

  throw new Error(`Gemini embedding request failed for all configured API keys: ${errors.join(' | ')}`);
}

async function retrieveContext(question, settings) {
  console.log('[RAG] Generating query vector.', { questionLength: question.length, provider: settings.provider });

  try {
    const { embedding } = await getQueryEmbedding(question, settings);
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

    return {
      context: chunks.map(row => row.content).filter(Boolean).join('\n\n---\n\n'),
    };
  } catch (error) {
    console.error('[RAG] Retrieval failed:', {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

async function getChatModelCandidates(apiKey, configuredModel, refresh = false) {
  if (!refresh && modelCacheByApiKey.has(apiKey)) return [modelCacheByApiKey.get(apiKey)];

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  if (!res.ok) {
    const responseBody = await res.text().catch(() => 'Unable to read Gemini model-list error response.');
    throw new Error(`Gemini model lookup failed (${res.status} ${res.statusText}): ${responseBody}`);
  }

  const data = await res.json();
  const chatModels = (data.models || []).filter(model =>
    model.supportedGenerationMethods?.includes('generateContent')
  );
  const preferredModel = cleanModelName(configuredModel);
  if (chatModels.length === 0) {
    throw new Error('No Gemini model with generateContent support is available for this API key.');
  }

  return chatModels
    .map(model => cleanModelName(model.name))
    .filter((modelName, index, names) => names.indexOf(modelName) === index)
    .sort((firstModel, secondModel) => {
      const score = modelName => {
        if (modelName === preferredModel) return 0;
        if (/flash/i.test(modelName) && !/image|live|tts/i.test(modelName)) return 1;
        return 2;
      };
      return score(firstModel) - score(secondModel);
    });
}

async function requestGeminiAnswerWithModel(contents, cleanModelNameForRequest, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModelNameForRequest}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 600 } })
  });

  if (!res.ok) {
    const responseBody = await res.text().catch(() => 'Unable to read Gemini error response.');
    const error = new Error(`Gemini generation request failed (${res.status} ${res.statusText}): ${responseBody}`);
    error.status = res.status;
    throw error;
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'System anomaly. Please retry.';
}

async function requestGeminiAnswer(contents, configuredModel, apiKey) {
  const attemptedModels = new Set();
  let candidates = await getChatModelCandidates(apiKey, configuredModel);
  let refreshedCandidates = false;
  let lastError;

  while (true) {
    const modelName = candidates.find(candidate => !attemptedModels.has(candidate));
    if (!modelName) {
      if (refreshedCandidates) break;
      refreshedCandidates = true;
      candidates = await getChatModelCandidates(apiKey, configuredModel, true);
      continue;
    }

    attemptedModels.add(modelName);
    try {
      const answer = await requestGeminiAnswerWithModel(contents, modelName, apiKey);
      modelCacheByApiKey.set(apiKey, modelName);
      return answer;
    } catch (error) {
      lastError = error;
      if (error.status !== 404) throw error;
      modelCacheByApiKey.delete(apiKey);
      console.warn(`[RAG] Model ${modelName} is unavailable for this key; trying the next listed model.`);
    }
  }

  throw lastError || new Error('No usable Gemini chat model is available for this API key.');
}

async function generateAnswer(question, context, chatHistory, settings) {
  const systemPrompt = `You are "VidBot", the friendly and professional AI Sales Assistant for VidHelp Agency.
Answer ONLY based on the CONTEXT below. Never invent facts or numbers. Match the user's language.

CRITICAL FORMATTING RULES:
1. Do NOT use asterisks (*) anywhere in your response.
2. Never use "**" for bold text.
3. If you need to make a list or bullet points, use plain dashes (-) instead of asterisks (*).
4. Keep responses brief, direct, and engaging (maximum 3 to 4 short bullet points or 2 concise paragraphs).
5. Summarize key data points instead of listing every single client case study from the context.
6. Always end responses with a complete sentence.
7. Do NOT use conversational filler intro phrases like 'Sebagai VidBot, saya bisa...' or 'Berikut adalah...'. Answer DIRECTLY.
8. Ensure every response is a COMPLETE thought and finishes with a proper full stop.
CONTEXT FROM KNOWLEDGE BASE:
${context || 'No context found. Route user to official WhatsApp: +62 89530702882.'}`;

  const contents = chatHistory.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.text }]
  }));
  contents.push({ role: 'user', parts: [{ text: `${systemPrompt}\n\nQuestion: ${question}` }] });

  const apiKeyCandidates = getGeminiApiKeyCandidates(settings);
  if (apiKeyCandidates.length === 0) throw new Error('Gemini API key is not configured.');

  const firstCandidate = apiKeyCandidates[0];
  console.log(`[AI REQUEST] Starting chat with ${firstCandidate.source === 'DATABASE' ? 'DATABASE' : '.env GEMINI'} API Key (${maskApiKey(firstCandidate.key)})`);

  const errors = [];
  for (let index = 0; index < apiKeyCandidates.length; index++) {
    const candidate = apiKeyCandidates[index];
    const apiKey = candidate.key;
    if (index > 0 && apiKeyCandidates[index - 1].source === 'DATABASE') {
      console.warn('[AI FALLBACK] Database key failed. Retrying with .env GEMINI_API_KEY...');
    }
    try {
      const answer = await requestGeminiAnswer(contents, settings.model_chat, apiKey);
      console.log(`[AI SUCCESS] Answer generated using ${candidate.source === 'DATABASE' ? 'DATABASE' : '.env GEMINI'} API Key`);
      return answer.replace(/\*\*/g, '');
    } catch (error) {
      errors.push(error.message);
      console.error(`[RAG] ${candidate.source} Gemini chat key failed:`, error.message);
    }
  }

  throw new Error(`Gemini generation request failed for all configured API keys: ${errors.join(' | ')}`);
}

export async function askVidHelpServerSide(question, chatHistory = []) {
  const settings = await getSettings();
  const { context } = await retrieveContext(question, settings);
  if (!context) {
    console.warn('[RAG] No knowledge chunks retrieved; returning deterministic fallback.');
    return NO_CONTEXT_FALLBACK;
  }
  return generateAnswer(question, context, chatHistory, settings);
}