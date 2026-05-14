import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, User, Loader2 } from 'lucide-react';
import { askVidHelp } from '../../../../backend/src/lib/rag.js';
// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────

const MAX_USER_MESSAGES = 6;

const FAREWELL_MESSAGE =
  "What a nice conversation to have with you! Lets discuss more on consultation? See you soon and lets talk business!";

const WA_LINK = "https://wa.me/6285121057706?text=Hi%20Admin!%20Mau%20Konsultasi%20Brand%20aku%20dong!";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function MessageLink(props) {
  return React.createElement(
    'a',
    {
      href: props.href,
      target: '_blank',
      rel: 'noopener noreferrer',
      className: 'font-semibold text-green-600 underline underline-offset-2 hover:text-green-700 transition-colors',
    },
    props.children
  );
}

function renderMessageText(text) {
  const parts = text.split(/(consultation)/gi);
  return parts.map(function(part, i) {
    if (part.toLowerCase() === 'consultation') {
      return React.createElement(MessageLink, { key: i, href: WA_LINK }, part);
    }
    return part;
  });
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Hello! I'm VidBot. How can I help boost your brand's live sales performance today?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [userMessageCount, setUserMessageCount] = useState(0);

  const isLimitReached = userMessageCount >= MAX_USER_MESSAGES;
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    const handleOpenChatbot = () => setIsOpen(true);
    window.addEventListener('open-chatbot', handleOpenChatbot);
    return () => window.removeEventListener('open-chatbot', handleOpenChatbot);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    if (isLimitReached) {
      setMessages(prev => [
        ...prev,
        { role: 'user', text: userMessage },
        { role: 'bot', text: FAREWELL_MESSAGE },
      ]);
      return;
    }

    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    const newCount = userMessageCount + 1;
    setUserMessageCount(newCount);
    setIsLoading(true);

    try {
      const botText = await askVidHelp(userMessage, messages);
      setMessages(prev => [...prev, { role: 'bot', text: botText }]);

      if (newCount >= MAX_USER_MESSAGES) {
        setTimeout(() => {
          setMessages(prev => [...prev, { role: 'bot', text: FAREWELL_MESSAGE }]);
        }, 800);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev,
        { role: 'bot', text: "Systems are currently busy. Please contact us directly at +62 89530702882." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-[72px] right-0 w-[320px] h-[460px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border-[0.5px] border-black origin-bottom-right"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-black via-[#00112b] to-black bg-[length:200%_auto] animate-gradient-slow p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="font-bold text-base leading-none text-left text-white font-sans">VH Assistant</h3>
                  <p className="text-[10px] mt-1 text-left text-white">Always here for you, Anything!</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-2 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 overflow-hidden ${m.role === 'user' ? 'bg-slate-200' : 'bg-transparent'}`}>
                      {m.role === 'user'
                        ? <User size={12} />
                        : <img src="/VH.png" alt="VH Bot" className="w-full h-full object-cover" />
                      }
                    </div>
                    <div className={`py-2 px-3 rounded-xl text-xs leading-relaxed ${m.role === 'user' ? 'bg-[#002147] text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none shadow-[0_1px_3px_rgba(0,0,0,0.06)]'}`}>
                      {m.role === 'bot' ? renderMessageText(m.text) : m.text}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-2 items-center bg-white py-2 px-3 rounded-xl rounded-tl-none shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                    <Loader2 size={14} className="animate-spin text-red-600" />
                    <span className="text-[10px] text-slate-400 font-medium">VidBot is typing...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-white border-t border-slate-100">
              <div className="relative text-left">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSend()}
                  placeholder={isLimitReached ? "Chat session ended — contact us!" : "Ask about pricing..."}
                  disabled={isLimitReached}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl py-2 pl-4 pr-12 text-xs focus:ring-2 focus:ring-red-600 transition-all outline-none disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading || isLimitReached}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-red-600 text-white rounded-lg flex items-center justify-center hover:bg-red-700 disabled:bg-slate-300 transition-all shadow-md shadow-red-200"
                >
                  <Send size={12} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-white border-[0.5px] border-black text-[#002147] rounded-full flex items-center justify-center shadow-xl relative group overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-red-600/0 via-red-600/10 to-red-600/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <AnimatePresence mode="wait">
          {isOpen
            ? <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}><X size={24} /></motion.div>
            : <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}><MessageSquare size={24} /></motion.div>
          }
        </AnimatePresence>
        {!isOpen && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-600 border-2 border-white rounded-full animate-bounce"></span>}
      </motion.button>
    </div>
  );
};

export default Chatbot;