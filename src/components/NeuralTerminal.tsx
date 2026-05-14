"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
    Terminal as TerminalIcon, X, Trash2, ChevronDown, ChevronUp, 
    AlertCircle, Info, ExternalLink, Activity, ShieldAlert, 
    Database, Cpu, Zap, Search
} from "lucide-react";

export interface LogEntry {
    message: string;
    type: 'info' | 'error' | 'warn' | 'system' | 'mem' | 'perf';
    timestamp: string;
    source?: string;
}

export interface NeuralTerminalProps {
    logs: LogEntry[];
    onClear: () => void;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    activeFile?: {
        name: string;
        content: string;
        language: string;
    };
}

export default function NeuralTerminal({ logs, onClear, isOpen, setIsOpen, activeFile }: NeuralTerminalProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<'all' | 'errors' | 'system'>('all');
    const [isAutoScrollEnabled, setAutoScroll] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Estatísticas de Sessão
    const stats = useMemo(() => ({
        total: logs.length,
        errors: logs.filter(l => l.type === 'error').length,
        warnings: logs.filter(l => l.type === 'warn').length,
        system: logs.filter(l => ['system', 'mem', 'perf'].includes(l.type)).length
    }), [logs]);

    useEffect(() => {
        if (isAutoScrollEnabled && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs, isAutoScrollEnabled]);

    const filteredLogs = logs.filter(log => {
        const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase());
        if (activeTab === 'errors') return log.type === 'error' && matchesSearch;
        if (activeTab === 'system') return ['system', 'mem', 'perf'].includes(log.type) && matchesSearch;
        return matchesSearch;
    });

    const handleOpenPopup = () => {
        if (!activeFile) return;
        const popup = window.open("", "_blank", "width=900,height=700");
        if (!popup) return alert("Bloqueador de popups ativo!");

        const isPython = activeFile.language === "python";
        const themeColor = isPython ? "#00ff88" : "#00f2ff";

        const content = `
            <html>
            <head>
                <title>Neural Runtime: ${activeFile.name}</title>
                ${isPython ? '<script src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"></script>' : ''}
                <style>
                    body { background: #020202; color: ${themeColor}; font-family: 'JetBrains Mono', monospace; padding: 30px; line-height: 1.6; }
                    .header { border-bottom: 2px solid ${themeColor}33; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; }
                    .log { border-left: 2px solid ${themeColor}44; padding-left: 15px; margin-bottom: 8px; font-size: 13px; animation: slideIn 0.2s ease-out; }
                    @keyframes slideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
                    .error { color: #ff4444; border-color: #ff4444; }
                </style>
            </head>
            <body>
                <div class="header">
                    <span>CORE_RUNTIME_ACTIVE: ${activeFile.language.toUpperCase()}</span>
                    <span style="opacity: 0.5">V.2.5.0</span>
                </div>
                <div id="output"></div>
                <script>
                    const output = document.getElementById('output');
                    const append = (msg, type='') => {
                        const div = document.createElement('div');
                        div.className = 'log ' + type;
                        div.innerText = \`[\${new Date().toLocaleTimeString()}] \${msg}\`;
                        output.appendChild(div);
                    };
                    console.log = (...args) => append(args.join(' '));
                    console.error = (...args) => append(args.join(' '), 'error');

                    (async () => {
                        try {
                            ${isPython ? `
                                let py = await loadPyodide();
                                append("Pyodide Kernel Loaded", "");
                                await py.runPythonAsync(\`${activeFile.content.replace(/`/g, '\\`').replace(/\n/g, '\\n')}\`);
                            ` : `
                                ${activeFile.content}
                            `}
                        } catch (err) {
                            append(err.message || err, 'error');
                        }
                    })();
                </script>
            </body>
            </html>
        `;
        popup.document.write(content);
        popup.document.close();
    };

    return (
        <div className={`fixed bottom-0 left-0 right-0 bg-[#050505] border-t border-white/5 transition-all duration-500 z-50 flex flex-col ${isOpen ? 'h-80 shadow-[0_-20px_50px_rgba(0,0,0,0.8)]' : 'h-9'}`}>
            {/* TERMINAL HEADER */}
            <div className="flex items-center justify-between px-4 min-h-9 bg-[#0a0a0a] border-b border-white/5 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                <div className="flex items-center gap-6 h-full">
                    <div className="flex items-center gap-2 text-[10px] font-black text-cyan-500 uppercase tracking-widest">
                        <TerminalIcon size={14} className={isOpen ? "animate-pulse" : ""} />
                        Neural_Terminal_v2
                    </div>

                    {isOpen && (
                        <div className="flex items-center gap-1 bg-black/40 rounded-full px-3 py-1 border border-white/5">
                            <Activity size={10} className="text-emerald-500" />
                            <span className="text-[9px] text-slate-400 font-bold uppercase">Uptime: 99.9%</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {isOpen && (
                        <div className="flex gap-3 text-[10px] font-bold mr-4">
                            <span className="text-emerald-500">INF:{stats.total}</span>
                            <span className="text-red-500">ERR:{stats.errors}</span>
                            <span className="text-amber-500">WRN:{stats.warnings}</span>
                        </div>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); handleOpenPopup(); }} className="p-1.5 hover:bg-white/10 rounded-md text-cyan-600 transition-colors">
                        <ExternalLink size={14} />
                    </button>
                    {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </div>
            </div>

            {isOpen && (
                <>
                    {/* CONTROLS BAR */}
                    <div className="flex items-center justify-between px-4 py-2 bg-[#080808] border-b border-white/5">
                        <div className="flex gap-2">
                            <button onClick={() => setActiveTab('all')} className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${activeTab === 'all' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-500 hover:text-slate-300'}`}>ALL_STREAMS</button>
                            <button onClick={() => setActiveTab('errors')} className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${activeTab === 'errors' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-slate-500 hover:text-slate-300'}`}>DIAGNOSTICS</button>
                            <button onClick={() => setActiveTab('system')} className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${activeTab === 'system' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-slate-500 hover:text-slate-300'}`}>KERNEL</button>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <div className="relative group">
                                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600" />
                                <input 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Filter logs..."
                                    className="bg-black/50 border border-white/5 rounded px-8 py-1 text-[10px] outline-none focus:border-cyan-500/50 w-40 transition-all"
                                />
                            </div>
                            <div className="h-4 w-px bg-white/10" />
                            <Trash2 size={14} className="text-slate-600 hover:text-red-500 cursor-pointer transition-colors" onClick={onClear} />
                            <div 
                                className={`flex items-center gap-1 cursor-pointer ${isAutoScrollEnabled ? 'text-cyan-500' : 'text-slate-600'}`}
                                onClick={() => setAutoScroll(!isAutoScrollEnabled)}
                            >
                                <Zap size={12} fill={isAutoScrollEnabled ? "currentColor" : "none"} />
                                <span className="text-[9px] font-black">AUTO_LOCK</span>
                            </div>
                        </div>
                    </div>

                    {/* LOG CONTENT */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 font-mono text-[12px] bg-[#020202] custom-scrollbar">
                        {filteredLogs.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-800 opacity-30 select-none">
                                <Database size={40} className="mb-2" />
                                <span className="text-[10px] font-black uppercase tracking-tighter">No Neural Data Found</span>
                            </div>
                        )}
                        {filteredLogs.map((log, i) => (
                            <div key={i} className="group flex gap-4 py-1.5 border-b border-white/2 hover:bg-white/2 transition-colors">
                                <span className="text-[10px] text-slate-700 min-w-17.5 select-none">{log.timestamp}</span>
                                <div className={`px-1.5 py-0.5 rounded-xs text-[8px] font-black h-fit min-w-13.75 text-center tracking-tighter uppercase
                                    ${log.type === 'error' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 
                                      log.type === 'warn' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                      log.type === 'system' ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20' :
                                      log.type === 'mem' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                      'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20'}`}
                                >
                                    {log.type}
                                </div>
                                <div className="flex-1">
                                    <span className="text-slate-300 leading-relaxed break-all whitespace-pre-wrap">{log.message}</span>
                                    {log.source && <span className="ml-2 text-[10px] text-slate-700 italic">@ {log.source}</span>}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* FOOTER METRICS */}
                    <div className="h-6 bg-[#0a0a0a] border-t border-white/5 flex items-center px-4 justify-between text-[9px] font-bold text-slate-600">
                        <div className="flex gap-4">
                            <span className="flex items-center gap-1"><Cpu size={10} /> BUS_LOAD: 0.02%</span>
                            <span className="flex items-center gap-1"><ShieldAlert size={10} /> SECURITY: ENCRYPTED</span>
                        </div>
                        <div className="text-cyan-900 tracking-widest">
                            STREAMING_ACTIVE // 2048-BIT_RSA
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}