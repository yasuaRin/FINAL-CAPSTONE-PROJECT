const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Cache settings for 5 minutes so we don't fetch on every message
let settingsCache = null;
let cacheExpiry = 0;

async function getSettings() {
  if (settingsCache && Date.now() < cacheExpiry) return settingsCache;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/ai_settings?limit=1`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    }
  });

  if (!res.ok) {
    // Fallback to env var if Supabase fails
    return {
      provider: 'gemini',
      model_chat: 'gemini-2.5-flash',
      model_embedding: 'embedding-001',
      api_key: import.meta.env.VITE_GEMINI_API_KEY,
    };
  }

  const data = await res.json();
  const s = data[0];

  // If no API key stored in DB yet, fall back to env var
  if (!s.api_key) {
    s.api_key = import.meta.env.VITE_GEMINI_API_KEY || '';
  }

  settingsCache = s;
  cacheExpiry = Date.now() + 5 * 60 * 1000; // 5 min cache
  return s;
}

// ─── Embed text using current provider settings ───────────────
async function getQueryEmbedding(text, settings) {
  if (settings.provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${settings.model_embedding}:embedContent?key=${settings.api_key}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${settings.model_embedding}`,
        content: { parts: [{ text }] }
      })
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(`Gemini embed ${res.status}: ${e?.error?.message}`);
    }
    const data = await res.json();
    return data.embedding.values;

  } else if (settings.provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.api_key}`,
      },
      body: JSON.stringify({ model: settings.model_embedding, input: text })
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(`OpenAI embed ${res.status}: ${e?.error?.message}`);
    }
    const data = await res.json();
    return data.data[0].embedding;

  } else {
    throw new Error(`Provider "${settings.provider}" does not support embeddings. Use Gemini or OpenAI.`);
  }
}

// ─── Search Supabase vector store ────────────────────────────
async function retrieveContext(question, settings) {
  try {
    const embedding = await getQueryEmbedding(question, settings);

    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_knowledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query_embedding: embedding,
        match_threshold: 0.45,
        match_count: 4,
      })
    });

    if (!res.ok) {
      console.error('Supabase RPC error:', res.status);
      return '';
    }

    const data = await res.json();
    if (!data || data.length === 0) return '';
    return data.map(row => row.content).join('\n\n---\n\n');

  } catch (err) {
    console.error('retrieveContext error:', err.message);
    return '';
  }
}

// ─── Generate answer using current provider ───────────────────
async function generateAnswer(question, context, chatHistory, settings) {
  const systemPrompt = `You are "VidBot", the friendly and professional AI Sales Assistant for VidHelp Agency.

VidHelp is Indonesia's Top 3 TikTok Shop Partner & Top 2 Shopee Shop Partner. Your goal is to help visitors understand VidHelp's services and convert them into clients.

RULES:
- Answer ONLY based on the CONTEXT below. Never invent facts or numbers.
- If info not in context, say you don't have that detail and suggest WhatsApp: +62 89530702882.
- Match the user's language (Bahasa Indonesia or English).
- Be warm, enthusiastic, and professional.
- Max 3 paragraphs per answer.
- End with a soft CTA mentioning consultation when relevant.

CONTEXT FROM KNOWLEDGE BASE:
${context || 'No specific context found. Direct user to WhatsApp +62 89530702882.'}`;

  const filtered = chatHistory.filter((_, i) => i > 0);

  if (settings.provider === 'gemini') {
    const contents = [];
    for (const m of filtered) {
      contents.push({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: `${systemPrompt}\n\nUser question: ${question}` }]
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${settings.model_chat}:generateContent?key=${settings.api_key}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: { temperature: 0.3, maxOutputTokens: 600 }
      })
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(`Gemini chat ${res.status}: ${e?.error?.message}`);
    }
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';

  } else if (settings.provider === 'openai') {
    const messages = [{ role: 'system', content: systemPrompt }];
    for (const m of filtered) {
      messages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text });
    }
    messages.push({ role: 'user', content: question });

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.api_key}`,
      },
      body: JSON.stringify({
        model: settings.model_chat,
        messages,
        temperature: 0.3,
        max_tokens: 600,
      })
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(`OpenAI chat ${res.status}: ${e?.error?.message}`);
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || 'No response';

  } else if (settings.provider === 'anthropic') {
    const messages = [];
    for (const m of filtered) {
      messages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text });
    }
    messages.push({ role: 'user', content: question });

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.api_key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: settings.model_chat,
        max_tokens: 600,
        system: systemPrompt,
        messages,
      })
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(`Anthropic chat ${res.status}: ${e?.error?.message}`);
    }
    const data = await res.json();
    return data?.content?.[0]?.text || 'No response';

  } else {
    throw new Error(`Unknown provider: ${settings.provider}`);
  }
}

// ─── Main export ──────────────────────────────────────────────
export async function askVidHelp(question, chatHistory = []) {
  const settings = await getSettings();
  const context = await retrieveContext(question, settings);
  return generateAnswer(question, context, chatHistory, settings);
}