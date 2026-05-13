"use client";

import React, { useState, useEffect, useRef } from "react";
import { Terminal, X, Trash2, ChevronDown, ChevronUp, AlertCircle, Info, ExternalLink } from "lucide-react";

// Interfaces de Definição
export interface LogEntry {
    message: string;
    type: 'info' | 'error' | 'warn' | 'system';
    timestamp: string;
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
    const [activeTab, setActiveTab] = useState<'console' | 'errors'>('console');

    // Auto-scroll para as mensagens mais recentes
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    const filteredLogs = activeTab === 'errors'
        ? logs.filter(l => l.type === 'error')
        : logs;

    const handleOpenPopup = () => {
        if (!activeFile) return;

        const popup = window.open("", "_blank", "width=800,height=600");
        if (!popup) {
            alert("O bloqueador de popups impediu a abertura!");
            return;
        }

        let content = "";

        if (activeFile.language === "python") {
            content = `
            <html>
            <head>
                <title>Neural Runtime: Python</title>
                <script src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"></script>
                <style>
                    body { background: #050505; color: #00f2ff; font-family: monospace; padding: 20px; }
                    .log { border-left: 2px solid #004444; padding-left: 10px; margin-bottom: 5px; white-space: pre-wrap; }
                </style>
            </head>
            <body>
                <h3 style="color:#00ff88">NEURAL_PYTHON_INSTALLED</h3>
                <div id="output">Iniciando Pyodide Kernel...</div>
                <script>
                    async function main() {
                        let pyodide = await loadPyodide();
                        document.getElementById('output').innerHTML = "Kernel Online. Executando...<br>";
                        try {
                            pyodide.runPython(\`
                                import sys
                                from js import document
                                class ElementOutput:
                                    def write(self, text):
                                        if text.strip():
                                            div = document.createElement('div')
                                            div.className = 'log'
                                            div.innerText = text
                                            document.getElementById('output').appendChild(div)
                                    def flush(self): pass
                                sys.stdout = ElementOutput()
                            \`);
                            await pyodide.runPythonAsync(\`${activeFile.content.replace(/`/g, '\\`').replace(/\n/g, '\\n')}\`);
                        } catch (err) {
                            document.getElementById('output').innerHTML += '<span style="color:red">ERR: ' + err + '</span>';
                        }
                    }
                    main();
                </script>
            </body>
            </html>`;
        } else {
            content = `
            <html>
            <head>
                <title>Neural Runtime: JS/TS</title>
                <style>
                    body { background: #050505; color: #00f2ff; font-family: monospace; padding: 20px; }
                    .log { border-bottom: 1px solid #111; padding: 4px 0; }
                </style>
            </head>
            <body>
                <h3 style="color:#00f2ff">NEURAL_JS_RUNTIME</h3>
                <div id="output"></div>
                <script>
                    const output = document.getElementById('output');
                    console.log = (...args) => {
                        const div = document.createElement('div');
                        div.className = 'log';
                        div.innerText = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
                        output.appendChild(div);
                    };
                    try {
                        ${activeFile.language === 'typescript' ? '/* Transpiled Output */' : ''}
                        ${activeFile.content}
                    } catch (err) {
                        output.innerHTML += '<span style="color:red">' + err + '</span>';
                    }
                </script>
            </body>
            </html>`;
        }

        popup.document.write(content);
        popup.document.close();
    };

    return (
        <div className={`fixed bottom-0 left-0 right-0 bg-[#050505] border-t border-cyan-900/30 transition-all duration-300 z-50 ${isOpen ? 'h-64' : 'h-8'}`}>
            {/* HEADER */}
            <div
                className="flex items-center justify-between px-4 h-8 bg-[#0a0a0a] border-b border-white/5 cursor-pointer select-none"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-6 h-full">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-cyan-500 uppercase tracking-tighter">
                        <Terminal size={12} />
                        Output Terminal
                    </div>

                    {isOpen && (
                        <div className="flex gap-4 h-full items-center text-[10px] font-medium text-slate-500">
                            <button
                                onClick={(e) => { e.stopPropagation(); setActiveTab('console'); }}
                                className={`h-full px-2 ${activeTab === 'console' ? 'text-white border-b border-cyan-500' : 'hover:text-slate-300'}`}
                            >
                                CONSOLE ({logs.length})
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setActiveTab('errors'); }}
                                className={`h-full px-2 ${activeTab === 'errors' ? 'text-red-500 border-b border-red-500' : 'hover:text-slate-300'}`}
                            >
                                ERRORS ({logs.filter(l => l.type === 'error').length})
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {isOpen && activeFile && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleOpenPopup(); }}
                            className="flex items-center gap-1 text-[9px] text-cyan-600 hover:text-cyan-400 transition-colors uppercase font-bold"
                        >
                            <ExternalLink size={10} /> Popup Runtime
                        </button>
                    )}
                    {isOpen && (
                        <Trash2
                            size={12}
                            className="text-slate-600 hover:text-red-500 transition-colors"
                            onClick={(e) => { e.stopPropagation(); onClear(); }}
                        />
                    )}
                    <div className="text-slate-500">
                        {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            {isOpen && (
                <div
                    ref={scrollRef}
                    className="p-3 h-[calc(100%-32px)] overflow-y-auto font-mono text-[11px] custom-scrollbar bg-[#050505]"
                >
                    {filteredLogs.length === 0 && (
                        <div className="text-slate-700 italic flex items-center gap-2 py-2">
                            <Info size={12} /> No logs to display. Initialize your neural core.
                        </div>
                    )}
                    {filteredLogs.map((log, i) => (
                        <div key={i} className={`flex gap-3 py-1 border-b border-white/5 last:border-0 ${log.type === 'error' ? 'text-red-400 bg-red-500/5' : 'text-slate-300'}`}>
                            <span className="text-[9px] text-slate-600 min-w-[65px] font-sans">{log.timestamp}</span>
                            <span className={`text-[9px] font-bold min-w-[50px] ${log.type === 'error' ? 'text-red-500' : 'text-cyan-800'}`}>
                                [{log.type.toUpperCase()}]
                            </span>
                            <span className="flex-1 whitespace-pre-wrap leading-relaxed">{log.message}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}