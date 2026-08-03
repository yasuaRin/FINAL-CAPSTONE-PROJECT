import { runAutoIngest } from '../scripts/ingest.js';
import { askVidHelpServerSide } from '../utils/rag.js';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export const handleKnowledgeIngest = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Payload empty. No markdown file uploaded.' });
    }

    // 1. extract markdown content fron uploaded file to string
    const markdownText = req.file.buffer.toString('utf-8');

    // 2. Get Active API Key that store in ai_settings table (supabase)
    const { data: currentSettings } = await supabaseAdmin
      .from('ai_settings')
      .select('api_key, provider')
      .eq('id', 1)
      .single();

    const currentApiKey = currentSettings?.api_key || '';
    const currentProvider = currentSettings?.provider || 'gemini';

    // 3. Run pipeline auto-ingest
    const logs = await runAutoIngest(markdownText, currentApiKey, currentProvider);

    // Record the source name only after ingestion succeeds, so refreshes show
    // the knowledge base that is actually active.
    const { data: savedSettings, error: settingsError } = await supabaseAdmin
      .from('ai_settings')
      .upsert(
        {
          id: 1,
          provider: 'gemini',
          active_filename: req.file.originalname,
        },
        { onConflict: 'id' }
      )
      .select('active_filename')
      .single();

    if (settingsError) {
      throw new Error(`Failed to save active knowledge filename: ${settingsError.message}`);
    }

    return res.json({
      message: 'Knowledge base cluster updated and vectorized successfully!',
      details: logs,
      active_filename: savedSettings.active_filename,
    });

  } catch (error) {
    console.error('Controller Ingest Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};

export const handleAISettings = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('ai_settings')
      .select('active_filename')
      .eq('id', 1)
      .maybeSingle();

    if (error) throw error;

    return res.json({ settings: data || { active_filename: null } });
  } catch (error) {
    console.error('Controller AI Settings Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};

export const handleSecureChat = async (req, res) => {
  try {
    const { question, chatHistory } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question parameters cannot be blank.' });
    }

    // Running RAG Function internally to get the answer from VidHelp knowledge base
    const aiAnswer = await askVidHelpServerSide(question, chatHistory);
    
    return res.json({ answer: aiAnswer });

  } catch (error) {
    console.error('Controller Chat Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};
