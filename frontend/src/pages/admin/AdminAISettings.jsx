import React, { useState, useEffect } from 'react';
import { Database, Cpu, Save, Upload, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
// ─── FIX PROBLEM 1: IMPORT SUPABASE CLIENT MILIK TIM KAMU ───
import { supabase } from '../../services/supabase';

const AdminAISettings = () => {
  const [activeTab, setActiveTab] = useState('provider');
  const [provider, setProvider] = useState('gemini');
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  const providerDetails = {
    gemini: {
      label: 'Gemini Server Token',
      placeholder: 'AIzaSy...'
    },
    groq: {
      label: 'Groq Acceleration Key',
      placeholder: 'gsk_...'
    }
  };

  useEffect(() => {
    if (provider === 'gemini') {
      setApiKey(import.meta.env.VITE_GEMINI_API_KEY || '');
    } else {
      setApiKey('');
    }
    // Bersihkan banner notifikasi setiap kali admin pindah provider agar rapi
    setStatusMsg({ type: '', text: '' });
  }, [provider]);

  // Bersihkan banner notifikasi jika admin berpindah tab menu
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
          id: 1, // Menimpa data ID 1 (pancingan awal kita)
          provider: provider,
          api_key: apiKey,
          model_chat: provider === 'gemini' ? 'gemini-2.5-flash' : 'llama-3.1-8b-instant',
          is_active: true
        });

      if (error) throw error;

      setIsLoading(false);
      setStatusMsg({ 
        type: 'success', 
        text: `AI Cluster updated successfully using ${provider === 'gemini' ? 'Gemini' : 'Groq'} Gateway!` 
      });
    } catch (err) {
      setIsLoading(false);
      setStatusMsg({ type: 'error', text: `Failed to sync database: ${err.message}` });
    }
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

      {/* Wrapper Sentralisasi Konten */}
      <div className="w-full flex flex-col items-center pt-4">
        
        {/* Tab CONTENT 1: Provider Settings */}
        {activeTab === 'provider' && (
          <div className="w-full max-w-2xl space-y-6">
            
            {/* FIX PROBLEM 2: Banner Notifikasi Dipindahkan ke SINI (Hanya di dalam tab Provider) */}
            {statusMsg.text && (
              <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-medium tracking-wide w-full ${
                statusMsg.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                  : 'bg-destructive/10 border-destructive/20 text-destructive'
              }`}>
                {statusMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                {statusMsg.text}
              </div>
            )}

            <div className="bg-white dark:bg-card border border-border/50 rounded-2xl p-6 shadow-md w-full">
              <div className="mb-6">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Active LLM Gateway</label>
                <select 
                  value={provider} 
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full p-3 border border-border bg-background rounded-xl text-sm focus:outline-none focus:border-primary transition-colors text-foreground"
                >
                  <option value="gemini">Google Gemini (Default RAG Engine)</option>
                  <option value="groq">Groq High-Speed Cloud SDK</option>
                </select>
              </div>

              <div className="mb-8">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  {providerDetails[provider].label}
                </label>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={providerDetails[provider].placeholder}
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
            <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center mb-6 bg-background/40">
              <Upload className="mx-auto text-muted-foreground/40 mb-4" size={36} />
              <p className="text-xs font-bold mb-1 text-foreground">Drop new VidHelp Matrix Document</p>
              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mb-4">Accepts structural .md files</p>
              <input type="file" accept=".md" className="hidden" id="md-upload" />
              <label htmlFor="md-upload" className="cursor-pointer border border-border px-4 py-2 text-[9px] font-bold uppercase tracking-widest bg-background hover:bg-foreground hover:text-background transition-all rounded-lg inline-block shadow-sm">
                Select Matrix File
              </label>
            </div>
            
            <div className="border-t border-border/40 pt-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Active Knowledge Matrix</h3>
              <div className="flex items-center justify-between p-3.5 bg-background rounded-xl border border-border/40">
                <div>
                  <p className="text-xs font-bold text-foreground">vidhelp_knowledge_base.md</p>
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">Vector Source: company_profile</p>
                </div>
                <button className="text-muted-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-muted">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminAISettings;