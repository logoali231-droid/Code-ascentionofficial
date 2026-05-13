"use client";

import React, { useState, useEffect } from "react";
import { Play, FileCode, Terminal, Download, Cpu, X, Menu, ChevronRight, Folder } from "lucide-react";
import { executeSandboxCode, Language } from "@/lib/sandboxRunner";
import NeuralTerminal, { LogEntry } from "./NeuralTerminal";

export interface SandboxFile {
    id: string;
    name: string;
    content: string;
    language: Language;
}

interface ExecutionResult {
    output: any[];
    error?: string;
}

function NeuralRuntime({
    file,
    onExecute,
    onContentChange
}: {
    file: SandboxFile,
    onExecute: (code: string, lang: Language) => Promise<ExecutionResult>,
    onContentChange: (id: string, newContent: string) => void
}) {
    const [localContent, setLocalContent] = useState(file.content);
    const [localOutput, setLocalOutput] = useState<string[]>([]);
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
        setLocalContent(file.content);
    }, [file.id, file.content]);

    const handleRun = async () => {
        setIsRunning(true);
        setLocalOutput(["[SYSTEM] Inicializando kernel...", `[LANG] ${file.language.toUpperCase()}`]);

        try {
            const result = await onExecute(localContent, file.language);
            const formattedOutput = (result.output || []).map(line =>
                typeof line === 'object' ? JSON.stringify(line) : String(line)
            );

            setLocalOutput(formattedOutput);
            if (result.error) setLocalOutput(prev => [...prev, `[ERR] ${result.error}`]);
        } catch (err: any) {
            setLocalOutput(prev => [...prev, `[SYSTEM_FATAL] ${err.message}`]);
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <textarea
                value={localContent}
                onChange={(e) => {
                    setLocalContent(e.target.value);
                    onContentChange(file.id, e.target.value);
                }}
                className="flex-1 bg-[#050505] text-cyan-50 p-4 resize-none outline-none font-mono text-sm leading-relaxed selection:bg-cyan-500/30"
                spellCheck={false}
            />
            
            <div className="flex gap-2 p-2 bg-[#0a0a0a] border-y border-cyan-900/20">
                <button
                    onClick={handleRun}
                    disabled={isRunning}
                    className="flex items-center gap-2 bg-green-600/20 text-green-400 px-4 py-1.5 rounded border border-green-500/30 hover:bg-green-600/30 disabled:opacity-50 transition-all text-xs font-bold"
                >
                    <Play size={14} fill="currentColor" /> {isRunning ? "RUNNING..." : "EXECUTE"}
                </button>
            </div>

            <div className="h-44 bg-black border-t border-cyan-900/30 overflow-y-auto p-3 font-mono">
                <div className="flex items-center gap-2 text-[9px] text-slate-500 mb-2 sticky top-0 bg-black">
                    <Terminal size={12} /> CONSOLE::{file.name.toUpperCase()}
                </div>
                {localOutput.length === 0 && <div className="text-[10px] text-slate-800 italic">Kernel ocioso...</div>}
                {localOutput.map((line, i) => (
                    <div key={i} className="text-[11px] py-0.5 border-l border-cyan-900/20 pl-2 mb-1">
                        <span className="text-cyan-900 mr-2">[{i}]</span>
                        <span className={line.includes('[ERR]') ? 'text-red-500' : 'text-slate-300'}>{line}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function SandboxEditor() {
    const [files, setFiles] = useState<SandboxFile[]>([
        { id: "1", name: "main.ts", content: "console.log('Neural Sandbox Active');", language: "typescript" },
        { id: "2", name: "utils.js", content: "console.log('JavaScript Module Loaded');", language: "javascript" },
        { id: "3", name: "logic.py", content: "print('Python Kernel Online')", language: "python" }
    ]);
    
    const [activeFileId, setActiveFileId] = useState("1");
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    
    // --- ESTADOS DO TERMINAL ---
    const [terminalLogs, setTerminalLogs] = useState<LogEntry[]>([]);
    const [isTerminalOpen, setIsTerminalOpen] = useState(false); // Estado para isOpen

    const pushLog = (msg: any, type: LogEntry['type']) => {
        const entry: LogEntry = {
            message: Array.isArray(msg) ? msg.join(' ') : String(msg),
            type,
            timestamp: new Date().toLocaleTimeString().split(' ')[0]
        };
        setTerminalLogs(prev => [...prev, entry]);
    };

    const activeFile = files.find(f => f.id === activeFileId) || files[0];

    const handleContentChange = (id: string, newContent: string) => {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, content: newContent } : f));
    };

    const handleExport = () => {
        const blob = new Blob([activeFile.content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = activeFile.name;
        link.click();
        URL.revokeObjectURL(url);
    };

    const updateFileLanguage = (id: string, lang: Language) => {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, language: lang } : f));
    };

    const closeFile = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (files.length > 1) {
            const newFiles = files.filter(f => f.id !== id);
            setFiles(newFiles);
            if (activeFileId === id) setActiveFileId(newFiles[0].id);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-[#050505] text-slate-300 font-mono overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-[#0a0a0a] border-b border-cyan-900/30">
                <div className="flex items-center gap-3">
                    <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-white/5 rounded text-cyan-500 transition-colors">
                        <Menu size={18} />
                    </button>
                    <div className="flex items-center gap-2">
                        <Cpu size={18} className="text-cyan-400 animate-pulse" />
                        <span className="text-[10px] font-bold tracking-tighter text-cyan-400">NEURAL_IDE_v2.5</span>
                    </div>
                </div>
                <button onClick={handleExport} className="flex items-center gap-2 bg-cyan-600/10 text-cyan-400 px-3 py-1 rounded text-xs border border-cyan-500/20 hover:bg-cyan-600/20 transition-all">
                    <Download size={14} /> EXPORT
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {isSidebarOpen && (
                    <div className="w-48 bg-[#080808] border-r border-cyan-900/10 flex flex-col pt-4 shrink-0 shadow-xl">
                        <div className="px-4 mb-4 flex items-center justify-between opacity-50">
                            <span className="text-[10px] uppercase font-bold tracking-widest">Explorer</span>
                            <Folder size={14} />
                        </div>
                        {files.map(file => (
                            <div
                                key={file.id}
                                onClick={() => setActiveFileId(file.id)}
                                className={`flex items-center gap-2 px-4 py-1.5 cursor-pointer text-xs transition-all ${
                                    activeFileId === file.id 
                                    ? 'bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-500' 
                                    : 'text-slate-500 hover:bg-white/5'
                                }`}
                            >
                                <FileCode size={14} />
                                <span className="truncate">{file.name}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex justify-between items-center bg-[#0d0d0d] border-b border-cyan-900/10">
                        <div className="flex overflow-x-auto no-scrollbar">
                            {files.map(file => (
                                <div
                                    key={file.id}
                                    onClick={() => setActiveFileId(file.id)}
                                    className={`px-4 py-2 border-r border-cyan-900/10 flex items-center gap-2 cursor-pointer text-[10px] min-w-[120px] transition-all ${
                                        activeFileId === file.id 
                                        ? 'bg-[#050505] text-cyan-400 border-t-2 border-t-cyan-500' 
                                        : 'opacity-40 hover:opacity-100 bg-[#0a0a0a]'
                                    }`}
                                >
                                    <FileCode size={12} className={activeFileId === file.id ? "text-cyan-400" : ""} />
                                    <span className="truncate">{file.name}</span>
                                    <X 
                                        size={10} 
                                        className="ml-auto hover:text-red-500 hover:bg-red-500/10 rounded transition-colors" 
                                        onClick={(e) => closeFile(file.id, e)}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="px-3">
                            <select
                                value={activeFile.language}
                                onChange={(e) => updateFileLanguage(activeFile.id, e.target.value as Language)}
                                className="bg-transparent text-[9px] text-cyan-600 border border-cyan-900/30 rounded px-1 outline-none font-bold hover:border-cyan-500 transition-colors"
                            >
                                <option value="typescript">TS</option>
                                <option value="javascript">JS</option>
                                <option value="python">PY</option>
                            </select>
                        </div>
                    </div>

                    <NeuralRuntime
                        key={activeFileId}
                        file={activeFile}
                        onExecute={async (code, lang) => {
                            pushLog(`Iniciando execução de ${activeFile.name}...`, 'info');
                            const result = await executeSandboxCode(code, lang) as ExecutionResult;
                            if (result.error) pushLog(result.error, 'error');
                            return {
                                output: result?.output || [],
                                error: result?.error
                            };
                        }}
                        onContentChange={handleContentChange}
                    />
                </div>
                
                {/* --- COMPONENTE CORRIGIDO --- */}
                <NeuralTerminal 
                    logs={terminalLogs} 
                    onClear={() => setTerminalLogs([])} // Mapeado de clearLogs para onClear
                    isOpen={isTerminalOpen}             // Adicionado
                    setIsOpen={setIsTerminalOpen}       // Adicionado
                />
            </div>
        </div>
    );
}