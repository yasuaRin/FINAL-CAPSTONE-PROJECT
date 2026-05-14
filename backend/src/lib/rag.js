import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// Step 1: Embed the user question using fetch (same as ingest.js)
async function getQueryEmbedding(question) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text: question }] }
      })
    }
  );
  const data = await response.json();
  return data.embedding.values;
}

// Step 2: Find relevant chunks from Supabase
async function retrieveContext(question) {
  try {
    const embedding = await getQueryEmbedding(question);

    const { data, error } = await supabase.rpc('match_knowledge', {
      query_embedding: embedding,
      match_threshold: 0.45,
      match_count: 4,
    });

    if (error) {
      console.error('Retrieval error:', error.message);
      return '';
    }

    if (!data || data.length === 0) return '';

    return data.map(row => row.content).join('\n\n---\n\n');

  } catch (err) {
    console.error('retrieveContext failed:', err.message);
    return '';
  }
}

// Step 3: Generate answer with Gemini
export async function askVidHelp(question, chatHistory = []) {
  const context = await retrieveContext(question);

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const systemPrompt = `You are "VidBot", the friendly and professional AI Sales Assistant for VidHelp Agency.

VidHelp is Indonesia's Top 3 TikTok Shop Partner & Top 2 Shopee Shop Partner. Your goal is to help visitors understand VidHelp's services and convert them into clients.

RULES:
- Answer ONLY based on the CONTEXT provided below. Never make up information.
- If the answer is not in the context, say you don't have that specific detail and suggest the user contact VidHelp directly via WhatsApp at +62 89530702882.
- Always match the language of the user (Bahasa Indonesia or English).
- Be warm, enthusiastic, and professional.
- Keep answers concise and easy to read (max 3 paragraphs).
- When relevant, end your answer with a soft call-to-action mentioning consultation.

CONTEXT FROM KNOWLEDGE BASE:
${context || 'No specific context found. Direct user to WhatsApp.'}`;

  const formattedHistory = chatHistory
    .filter((_, i) => i > 0)
    .map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));

  const chat = model.startChat({
    history: formattedHistory,
    generationConfig: {
      maxOutputTokens: 600,
      temperature: 0.3,
    },
  });

  const fullQuestion = `${systemPrompt}\n\nUser question: ${question}`;
  const result = await chat.sendMessage(fullQuestion);
  return result.response.text();
}