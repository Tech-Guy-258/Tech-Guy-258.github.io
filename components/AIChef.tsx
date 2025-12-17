
import React, { useState, useEffect } from 'react';
import { InventoryItem } from '../types';
import { chatWithInventoryAssistant } from '../services/geminiService';
import { Bot, Send, Loader2, WifiOff } from 'lucide-react';

interface AIChefProps {
  items: InventoryItem[];
}

const AIChef: React.FC<AIChefProps> = ({ items }) => {
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !isOnline) return;

    const userMsg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    
    setIsChatting(true);
    const response = await chatWithInventoryAssistant(userMsg, items);
    setIsChatting(false);
    
    setChatHistory(prev => [...prev, { role: 'ai', text: response }]);
  };

  if (!isOnline) {
    return (
      <div className="p-6 h-full flex flex-col items-center justify-center text-center">
        <div className="bg-gray-100 p-6 rounded-full mb-6">
           <WifiOff size={48} className="text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Modo Offline</h2>
        <p className="text-gray-500 max-w-md">
          O Assistente Inteligente precisa de uma conexão à internet para responder a perguntas. 
          Por favor, verifique a sua conexão para usar esta funcionalidade.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center space-x-2 mb-6">
        <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
           <Bot size={28} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Assistente de Gestão</h2>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {chatHistory.length === 0 && (
                <div className="text-center text-gray-400 mt-10">
                  <p>Olá! Pergunte-me qualquer coisa sobre o stock da sua mercearia.</p>
                  <p className="text-sm mt-2">Ex: "Que produtos estão a acabar?" ou "Como posso organizar melhor a secção de frutas?"</p>
                </div>
              )}
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg ${
                    msg.role === 'user' 
                      ? 'bg-emerald-600 text-white rounded-br-none' 
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm'
                  }`}>
                    <p className="whitespace-pre-wrap text-sm">{msg.text}</p>
                  </div>
                </div>
              ))}
              {isChatting && (
                <div className="flex justify-start">
                  <div className="bg-white p-3 rounded-lg border border-gray-200 rounded-bl-none shadow-sm flex items-center">
                    <Loader2 className="animate-spin text-emerald-500 mr-2" size={16} />
                    <span className="text-sm text-gray-500">A escrever...</span>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 bg-white border-t border-gray-100">
              <form onSubmit={handleChatSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Escreva a sua mensagem..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isChatting}
                  className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </div>
      </div>
    </div>
  );
};

export default AIChef;
