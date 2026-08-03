import React, { useState, useEffect } from 'react';
import { Database, Cpu, Save, Upload, Trash2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../services/supabase';

const CHAT_MODEL = 'gemini-1.5-flash';

const AdminAISettings = () => {
  const [activeTab, setActiveTab] = useState('provider');
  const provider = 'gemini';
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // ─── NEW STATE FOR SIMULATION MANAGEMENT MD FILE──
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    setApiKey(import.meta.env.VITE_GEMINI_API_KEY || '');
    setStatusMsg({ type: '', text: '' });

    const loadSettings = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/ai/settings');
        if (!response.ok) throw new Error(`Settings request failed (${response.status}).`);

        const data = await response.json();
        setFileName(data.settings?.active_filename || '');
      } catch (error) {
        console.error('Unable to load active knowledge filename:', error);
      }
    };

    loadSettings();
  }, []);

  useEffect(() => {
    setStatusMsg({ type: '', text: '' });
  }, [activeTab]);

  const handleSaveConfig = async () => {
    setIsLoading(true);
    setStatusMsg({ type: '', text: '' });
    
    try {
      const { error } = await supabase
        .from('ai_settings')
        .upsert({
          id: 1,
          provider: 'gemini',
          api_key: apiKey,
          model_chat: CHAT_MODEL,
          is_active: true
        });

      if (error) throw error;

      setIsLoading(false);
      setStatusMsg({ 
        type: 'success', 
        text: 'AI Cluster updated successfully using Gemini.'
      });
    } catch (err) {
      setIsLoading(false);
      setStatusMsg({ type: 'error', text: `Failed to sync database: ${err.message}` });
    }
  };

  // ─── NEW FUNCTION: CAPTURE AND SIMULATE .MD UPLOAD ───
const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setStatusMsg({ type: '', text: '' });

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Send the file to the backend for ingestion and vectorization
      const response = await fetch('http://localhost:3001/api/ai/upload-knowledge', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server ingestion integration failure.');
      }

      setFileName(data.active_filename || file.name);
      setStatusMsg({
        type: 'success',
        text: `Success! ${data.message} (${data.details.insertedChunks}/${data.details.totalChunks} document segments successfully synchronized).`
      });
    } catch (err) {
      console.error('Upload Error:', err);
      setStatusMsg({
        type: 'error',
        text: `Pipeline Interrupted: ${err.message}`
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteMatrix = () => {
    setFileName('');
    setStatusMsg({
      type: 'error',
      text: 'Active Knowledge Matrix source has been detached from cluster.'
    });
  };

  return (
    <div className="space-y-6 font-sans text-foreground pb-24">
      
      {/* Header Info */}
      <div className="flex flex-col">
        <p className="text-[11px] text-muted-foreground font-light uppercase tracking-widest">Management / AI Center</p>
        <h2 className="text-xl font-bold capitalize text-foreground tracking-tight">AI Settings</h2>
      </div>

      {/* Tabs Switcher System */}
      <div className="flex gap-6 border-b border-border/60">
        <button 
          onClick={() => setActiveTab('provider')}
          className={`pb-3 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all duration-200 ${
            activeTab === 'provider' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Cpu size={14} /> Provider & API Keys
        </button>
        <button 
          onClick={() => setActiveTab('knowledge')}
          className={`pb-3 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all duration-200 ${
            activeTab === 'knowledge' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Database size={14} /> Knowledge Base (.MD)
        </button>
      </div>

      {/* Banner Notifikasi Global (Dipindah ke luar agar dinamis membaca tab mana pun) */}
      {statusMsg.text && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-medium tracking-wide w-full max-w-2xl mx-auto ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
            : 'bg-destructive/10 border-destructive/20 text-destructive'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {statusMsg.text}
        </div>
      )}

      {/* Wrapper Sentralisasi Konten */}
      <div className="w-full flex flex-col items-center pt-4">
        
        {/* Tab CONTENT 1: Provider Settings */}
        {activeTab === 'provider' && (
          <div className="w-full max-w-2xl space-y-6">
            <div className="bg-white dark:bg-card border border-border/50 rounded-2xl p-6 shadow-md w-full">
              <div className="mb-6">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Active LLM Gateway</label>
                <div className="w-full p-3 border border-border bg-muted/40 rounded-xl text-sm text-foreground">
                  Google Gemini (Default RAG Engine)
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  Gemini Server Token
                </label>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full p-3 border border-border bg-background rounded-xl text-sm focus:outline-none focus:border-primary transition-colors text-foreground tracking-widest"
                />
              </div>

              <button 
                onClick={handleSaveConfig}
                disabled={isLoading}
                className="w-full primary-gradient text-white p-3.5 font-bold text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.99] transition-all"
              >
                <Save size={14} /> {isLoading ? 'Synchronizing...' : 'Save LLM Cluster'}
              </button>
            </div>
          </div>
        )}

        {/* Tab CONTENT 2: Knowledge Base Management */}
        {activeTab === 'knowledge' && (
          <div className="bg-white dark:bg-card border border-border/50 rounded-2xl p-6 shadow-md w-full max-w-2xl">
            
            {/* Area Drag / Drop Input */}
            <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center mb-6 bg-background/40 relative">
              {isUploading ? (
                <div className="flex flex-col items-center justify-center py-4">
                  <Loader2 className="animate-spin text-primary mb-3" size={36} />
                  <p className="text-xs font-bold text-foreground animate-pulse">Parsing Knowledge Matrix...</p>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mt-1">Generating vectors via Gemini Embedding</p>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto text-muted-foreground/40 mb-4" size={36} />
                  <p className="text-xs font-bold mb-1 text-foreground">Drop new VidHelp Matrix Document</p>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mb-4">Accepts structural .md files</p>
                  
                  {/* FUNCTIONAL CHANGE EVENT ATTACHED DISINI */}
                  <input 
                    type="file" 
                    accept=".md" 
                    className="hidden" 
                    id="md-upload" 
                    onChange={handleFileChange}
                  />
                  
                  <label htmlFor="md-upload" className="cursor-pointer border border-border px-4 py-2 text-[9px] font-bold uppercase tracking-widest bg-background hover:bg-foreground hover:text-background transition-all rounded-lg inline-block shadow-sm">
                    Select Matrix File
                  </label>
                </>
              )}
            </div>
            
            {/* Status Berkas Pengetahuan Aktif */}
            <div className="border-t border-border/40 pt-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Active Knowledge Matrix</h3>
              
              {fileName ? (
                <div className="flex items-center justify-between p-3.5 bg-background rounded-xl border border-border/40 transition-all">
                  <div>
                    <p className="text-xs font-bold text-foreground">{fileName}</p>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">Vector Source: company_profile</p>
                  </div>
                  <button 
                    onClick={handleDeleteMatrix}
                    className="text-muted-foreground hover:text-destructive transition-colors p-2 rounded-lg hover:bg-muted"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic py-2">No active knowledge matrix deployed. Chatbot will use fallback responses.</p>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminAISettings;
