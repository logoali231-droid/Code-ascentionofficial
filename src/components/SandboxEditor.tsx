"use client";

import React, { useState, useEffect } from "react";
import { Play, FileCode, Terminal, Download, Cpu, X, Menu, Folder, Settings, Terminal as TerminalIcon } from "lucide-react";
import NeuralTerminal, { LogEntry } from "./NeuralTerminal";
import { executeSandboxCode } from "@/lib/sandbox/sandboxRunner";
import { Language } from "@/lib/sandbox/types";

// --- INTERFACES ---
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

// --- SUBCOMPONENTE: NEURAL RUNTIME (EDITOR + CONSOLE LOCAL) ---
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
        setLocalOutput(["[SYSTEM] Kernell inicializado...", `[LANG] ${file.language.toUpperCase()} ENGINE READY`]);

        try {
            const result = await onExecute(localContent, file.language);
            const formattedOutput = (result.output || []).map(line =>
                typeof line === 'object' ? JSON.stringify(line) : String(line)
            );

            setLocalOutput(prev => [...prev, ...formattedOutput]);
            if (result.error) setLocalOutput(prev => [...prev, `[ERR] ${result.error}`]);
        } catch (err: any) {
            setLocalOutput(prev => [...prev, `[FATAL] ${err.message}`]);
        } finally {
            setIsRunning(false);
        }
    };

    // Gera números de linha baseado no conteúdo
    const lineNumbers = localContent.split("\n").map((_, i) => i + 1);

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#050505]">
            {/* Editor Area */}
            <div className="flex-1 flex overflow-hidden font-mono relative">
                {/* Line Numbers */}
                <div className="w-12 bg-[#080808] text-[#333] text-right pr-3 pt-4 select-none border-r border-white/5 text-[11px]">
                    {lineNumbers.map(n => <div key={n} className="h-6">{n}</div>)}
                </div>
                
                <textarea
                    value={localContent}
                    onChange={(e) => {
                        setLocalContent(e.target.value);
                        onContentChange(file.id, e.target.value);
                    }}
                    className="flex-1 bg-transparent text-cyan-50 p-4 pt-4 resize-none outline-none text-[13px] leading-6 selection:bg-cyan-500/30 custom-scrollbar"
                    spellCheck={false}
                />
            </div>
            
            {/* Local Controls */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#0a0a0a] border-y border-white/5">
                <div className="flex gap-4 items-center">
                    <button
                        onClick={handleRun}
                        disabled={isRunning}
                        className={`group flex items-center gap-2 px-6 py-1.5 rounded-sm text-[10px] font-bold tracking-widest transition-all ${
                            isRunning 
                            ? "bg-amber-500/10 text-amber-500 border border-amber-500/30 animate-pulse" 
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/20 active:scale-95"
                        }`}
                    >
                        <Play size={12} fill={isRunning ? "none" : "currentColor"} />
                        {isRunning ? "PROCESSING..." : "EXECUTE_SCRIPT"}
                    </button>
                    <span className="text-[10px] text-slate-600 uppercase tracking-widest">Runtime: {file.language}</span>
                </div>
            </div>

            {/* Local Quick Console */}
            <div className="h-48 bg-[#020202] border-t border-cyan-900/20 overflow-y-auto p-4 font-mono scroll-smooth">
                <div className="flex items-center gap-2 text-[10px] text-cyan-900 mb-3 uppercase font-black tracking-tighter">
                    <TerminalIcon size={12} /> Local_Stream::{file.name}
                </div>
                {localOutput.map((line, i) => (
                    <div key={i} className="text-[11px] py-0.5 flex gap-3">
                        <span className="text-slate-700 w-8">[{i}]</span>
                        <span className={line.includes('[ERR]') || line.includes('[FATAL]') ? 'text-red-500' : 'text-cyan-400/80'}>
                            {line}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// --- COMPONENTE PRINCIPAL ---
export default function SandboxEditor() {
    const [files, setFiles] = useState<SandboxFile[]>([
        { id: "1", name: "main.ts", content: "console.log('Neural Interface Active');\n// Comece a codar aqui", language: "typescript" },
        { id: "2", name: "logic.py", content: "print('Python Core Online')\n# Execute no popup", language: "python" }
    ]);
    
    const [activeFileId, setActiveFileId] = useState("1");
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [terminalLogs, setTerminalLogs] = useState<LogEntry[]>([]);
    const [isTerminalOpen, setIsTerminalOpen] = useState(false);

    const activeFile = files.find(f => f.id === activeFileId) || files[0];

    const pushLog = (msg: any, type: LogEntry['type']) => {
        const entry: LogEntry = {
            message: Array.isArray(msg) ? msg.join(' ') : String(msg),
            type,
            timestamp: new Date().toLocaleTimeString().split(' ')[0]
        };
        setTerminalLogs(prev => [...prev, entry]);
    };

    const handleContentChange = (id: string, newContent: string) => {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, content: newContent } : f));
    };

    const handleExport = () => {
        const blob = new Blob([activeFile.content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = activeFile.name;
        a.click();
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
        <div className="flex flex-col h-screen bg-[#050505] text-slate-300 font-mono overflow-hidden selection:bg-cyan-500/30">
            {/* Top Navigation Bar */}
            <div className="h-12 flex items-center justify-between px-4 bg-[#0a0a0a] border-b border-white/5 z-20">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setSidebarOpen(!isSidebarOpen)} 
                        className="p-1.5 hover:bg-white/5 rounded text-cyan-500 transition-all border border-transparent hover:border-cyan-500/20"
                    >
                        <Menu size={18} />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse shadow-[0_0_8px_#06b6d4]" />
                        <span className="text-[11px] font-black tracking-[0.2em] text-white">NEURAL_EDITOR</span>
                        <span className="text-[9px] bg-cyan-500/10 text-cyan-500 px-1.5 py-0.5 rounded border border-cyan-500/20">V.2.5.0</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button 
                        onClick={handleExport}
                        className="flex items-center gap-2 bg-white/5 text-[10px] text-slate-400 px-3 py-1.5 rounded border border-white/10 hover:border-cyan-500/40 hover:text-cyan-400 transition-all"
                    >
                        <Download size={14} /> EXPORT_BUFFER
                    </button>
                    <Settings size={16} className="text-slate-600 hover:text-white cursor-pointer transition-colors" />
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar Explorer */}
                {isSidebarOpen && (
                    <div className="w-56 bg-[#080808] border-r border-white/5 flex flex-col shrink-0 animate-in slide-in-from-left duration-300">
                        <div className="p-4 flex items-center justify-between border-b border-white/5">
                            <span className="text-[10px] uppercase font-black text-slate-500 tracking-widest flex items-center gap-2">
                                <Folder size={12} /> Project_Files
                            </span>
                        </div>
                        <div className="flex-1 py-2 overflow-y-auto">
                            {files.map(file => (
                                <div
                                    key={file.id}
                                    onClick={() => setActiveFileId(file.id)}
                                    className={`group flex items-center gap-3 px-4 py-2 cursor-pointer transition-all ${
                                        activeFileId === file.id 
                                        ? 'bg-cyan-500/5 text-cyan-400 border-r-2 border-cyan-500' 
                                        : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                                    }`}
                                >
                                    <FileCode size={14} className={activeFileId === file.id ? "text-cyan-400" : "text-slate-600"} />
                                    <span className="text-xs truncate flex-1">{file.name}</span>
                                    {files.length > 1 && (
                                        <X 
                                            size={12} 
                                            className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                                            onClick={(e) => closeFile(file.id, e)}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Main Editor Section */}
                <div className="flex-1 flex flex-col overflow-hidden relative">
                    {/* Tabs Bar */}
                    <div className="flex bg-[#0a0a0a] border-b border-white/5 overflow-x-auto no-scrollbar">
                        {files.map(file => (
                            <div
                                key={file.id}
                                onClick={() => setActiveFileId(file.id)}
                                className={`px-4 py-2.5 flex items-center gap-3 cursor-pointer text-[10px] min-w-35 border-r border-white/5 transition-all ${
                                    activeFileId === file.id 
                                    ? 'bg-[#050505] text-cyan-400 border-t-2 border-t-cyan-500 shadow-[inset_0_4px_10px_rgba(6,182,212,0.05)]' 
                                    : 'opacity-50 hover:opacity-100 bg-[#0c0c0c]'
                                }`}
                            >
                                <span className={activeFileId === file.id ? "text-cyan-400" : "text-slate-600"}>
                                    {file.language === 'python' ? 'PY' : 'TS'}
                                </span>
                                <span className="truncate flex-1 font-bold tracking-tight">{file.name.toUpperCase()}</span>
                            </div>
                        ))}
                    </div>

                    {/* Runtime Engine */}
                    <NeuralRuntime
                        key={activeFileId}
                        file={activeFile}
                        onExecute={async (code, lang) => {
                            pushLog(`Invocando kernel para: ${activeFile.name}`, 'system');
                            const result = await executeSandboxCode(code, lang) as ExecutionResult;
                            if (result.error) pushLog(result.error, 'error');
                            return result;
                        }}
                        onContentChange={handleContentChange}
                    />
                </div>
            </div>

            {/* Global Terminal Component */}
            <NeuralTerminal 
                logs={terminalLogs} 
                onClear={() => setTerminalLogs([])} 
                isOpen={isTerminalOpen} 
                setIsOpen={setIsTerminalOpen}
                activeFile={activeFile}
            />
        </div>
    );
}