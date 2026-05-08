"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Brain, Sparkles, ArrowLeft, History } from "lucide-react";
import { get, save } from "@/lib/db"; // Assumindo que seus helpers estão aqui

export default function ReviewPage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  // Carrega histórico de revisões do IndexedDB ao montar
  useEffect(() => {
    async function loadHistory() {
      const data = await get("review_history", "main");
      if (data) setHistory(data);
    }
    loadHistory();
  }, []);

  const handleStartReview = async () => {
    if (!topic.trim()) return;

    setIsGenerating(true);
    
    // Simulação de início de sessão de IA
    // Aqui você chamaria o seu webllm ou a lógica de prompt
    setTimeout(async () => {
      const newEntry = {
        id: Date.now(),
        topic,
        date: new Date().toLocaleDateString(),
      };
      
      const updatedHistory = [newEntry, ...history];
      await save("review_history", updatedHistory);
      setHistory(updatedHistory);
      
      setIsGenerating(false);
      setTopic("");
      alert("Sessão de reforço iniciada! (Integração com LLM aqui)");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-black text-cyan-400 p-6 font-mono">
      {/* Header */}
      <div className="max-w-4xl mx-auto flex items-center justify-between mb-12 border-b border-cyan-900 pb-4">
        <button 
          onClick={() => router.push("/")}
          className="flex items-center gap-2 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} /> VOLTAR_AO_NEXUS
        </button>
        <div className="flex items-center gap-3">
          <Brain className="animate-pulse" />
          <h1 className="text-2xl font-bold tracking-tighter">MIND_PALACE_v1.0</h1>
        </div>
      </div>

      <main className="max-w-2xl mx-auto space-y-12">
        {/* Input Area */}
        <section className="bg-cyan-950/20 border border-cyan-500/30 p-8 rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.1)]">
          <h2 className="text-white mb-4 flex items-center gap-2">
            <Sparkles size={18} className="text-cyan-400" /> O QUE VOCÊ DESEJA REFORÇAR?
          </h2>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ex: 'Quero revisar conceitos de Mutex e Fila de Execução em Node.js'..."
            className="w-full bg-black/50 border border-cyan-900 p-4 text-cyan-100 outline-none focus:border-cyan-400 min-h-[120px] transition-all resize-none"
          />
          <button
            onClick={handleStartReview}
            disabled={isGenerating || !topic.trim()}
            className="w-full mt-4 bg-cyan-600 hover:bg-cyan-400 text-black font-bold py-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? "SINCRONIZANDO NEURÔNIOS..." : "GERAR PRÁTICA DE REVISÃO"}
          </button>
        </section>

        {/* History Area */}
        <section>
          <h3 className="text-cyan-800 text-sm font-bold mb-4 flex items-center gap-2">
            <History size={16} /> LOGS_DE_REVISÃO_RECENTES
          </h3>
          <div className="space-y-2">
            {history.length === 0 ? (
              <p className="text-cyan-900 italic text-sm">Nenhum dado encontrado no buffer.</p>
            ) : (
              history.map((item) => (
                <div key={item.id} className="border border-cyan-900/50 p-3 flex justify-between items-center hover:bg-cyan-900/10 transition-colors">
                  <span className="text-cyan-200">{item.topic}</span>
                  <span className="text-cyan-700 text-xs">{item.date}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}