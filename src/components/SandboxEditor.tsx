"use client";

import React, { useState, useEffect } from "react";
import { Play, FileCode, Download, X, Menu, Folder, Settings, Terminal as TerminalIcon } from "lucide-react";
import NeuralTerminal, { LogEntry } from "./NeuralTerminal";
import { executeSandboxCode } from "@/lib/sandbox/sandboxRunner";
import { Language } from "@/lib/sandbox/types";

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
  file: SandboxFile;
  onExecute: (code: string, lang: Language) => Promise<ExecutionResult>;
  onContentChange: (id: string, newContent: string) => void;
}) {
  const [localContent, setLocalContent] = useState(file.content);
  const [localOutput, setLocalOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    setLocalContent(file.content);
  }, [file.id, file.content]);

  const handleRun = async () => {
    setIsRunning(true);
    setLocalOutput(["[SYSTEM] Kernel inicializado...", `[LANG] ${file.language.toUpperCase()} ENGINE READY`]);
    try {
      const result = await onExecute(localContent, file.language);
      const formatted = (result.output || []).map(l => typeof l === 'object' ? JSON.stringify(l) : String(l));
      setLocalOutput(prev => [...prev, ...formatted, ...(result.error ? [`[ERR] ${result.error}`] : [])]);
    } catch (err: any) {
      setLocalOutput(prev => [...prev, `[FATAL] ${err.message}`]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#050505]">
      <div className="flex-1 flex overflow-hidden font-mono relative">
        <div className="w-12 bg-[#080808] text-[#333] text-right pr-3 pt-4 select-none border-r border-white/5 text-[11px]">
          {localContent.split("\n").map((_, i) => <div key={i} className="h-6">{i + 1}</div>)}
        </div>
        <textarea
          value={localContent}
          onChange={(e) => {
            setLocalContent(e.target.value);
            onContentChange(file.id, e.target.value);
          }}
          className="flex-1 bg-transparent text-cyan-50 p-4 resize-none outline-none text-[13px] leading-6 selection:bg-cyan-500/30 custom-scrollbar"
          spellCheck={false}
        />
      </div>
      
      <div className="flex items-center justify-between px-4 py-2 bg-[#0a0a0a] border-y border-white/5">
        <div className="flex gap-4 items-center">
          <button
            onClick={handleRun}
            disabled={isRunning}
            className={`flex items-center gap-2 px-6 py-1.5 rounded-sm text-[10px] font-bold tracking-widest transition-all ${
              isRunning ? "bg-amber-500/10 text-amber-500 border border-amber-500/30 animate-pulse" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/20 active:scale-95"
            }`}
          >
            <Play size={12} fill={isRunning ? "none" : "currentColor"} />
            {isRunning ? "PROCESSING..." : "EXECUTE_SCRIPT"}
          </button>
          <span className="text-[10px] text-slate-600 uppercase tracking-widest">Runtime: {file.language}</span>
        </div>
      </div>

      <div className="h-48 bg-[#020202] border-t border-cyan-900/20 overflow-y-auto p-4 font-mono">
        <div className="flex items-center gap-2 text-[10px] text-cyan-900 mb-3 uppercase font-black tracking-tighter">
          <TerminalIcon size={12} /> Local_Stream::{file.name}
        </div>
        {localOutput.map((line, i) => (
          <div key={i} className="text-[11px] py-0.5 flex gap-3">
            <span className="text-slate-700 w-8">[{i}]</span>
            <span className={line.includes('[ERR]') || line.includes('[FATAL]') ? 'text-red-500' : 'text-cyan-400/80'}>{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SandboxEditor() {
  const [files, setFiles] = useState<SandboxFile[]>([
    { id: "1", name: "main.ts", content: "console.log('Neural Interface Active');", language: "typescript" },
    { id: "2", name: "logic.py", content: "print('Python Core Online')", language: "python" }
  ]);
  const [activeFileId, setActiveFileId] = useState("1");
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [terminalLogs, setTerminalLogs] = useState<LogEntry[]>([]);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);

  const activeFile = files.find(f => f.id === activeFileId) || files[0];

  const pushLog = (msg: any, type: LogEntry['type']) => {
    setTerminalLogs(prev => [...prev, {
      message: String(msg),
      type,
      timestamp: new Date().toLocaleTimeString().split(' ')[0]
    }]);
  };

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-slate-300 font-mono overflow-hidden">
      <div className="h-12 flex items-center justify-between px-4 bg-[#0a0a0a] border-b border-white/5 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-1.5 hover:bg-white/5 rounded text-cyan-500 border border-transparent hover:border-cyan-500/20">
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse shadow-[0_0_8px_#06b6d4]" />
            <span className="text-[11px] font-black tracking-[0.2em] text-white">NEURAL_EDITOR [SANDBOX]</span>
          </div>
        </div>
        <button
          onClick={() => {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(new Blob([activeFile.content], { type: "text/plain" }));
            a.download = activeFile.name;
            a.click();
          }}
          className="flex items-center gap-2 bg-white/5 text-[10px] text-slate-400 px-3 py-1.5 rounded border border-white/10 hover:border-cyan-500/40 hover:text-cyan-400 transition-all"
        >
          <Download size={14} /> EXPORT_BUFFER
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {isSidebarOpen && (
          <div className="w-56 bg-[#080808] border-r border-white/5 flex flex-col shrink-0 animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-white/5 text-[10px] uppercase font-black text-slate-500 tracking-widest flex items-center gap-2">
              <Folder size={12} /> Project_Files
            </div>
            <div className="flex-1 py-2 overflow-y-auto">
              {files.map(f => (
                <div
                  key={f.id}
                  onClick={() => setActiveFileId(f.id)}
                  className={`group flex items-center gap-3 px-4 py-2 cursor-pointer transition-all ${activeFileId === f.id ? 'bg-cyan-500/5 text-cyan-400 border-r-2 border-cyan-500' : 'text-slate-500 hover:bg-white/5'}`}
                >
                  <FileCode size={14} className={activeFileId === f.id ? "text-cyan-400" : "text-slate-600"} />
                  <span className="text-xs truncate flex-1">{f.name}</span>
                  {files.length > 1 && (
                    <X size={12} className="opacity-0 group-hover:opacity-100 hover:text-red-500" onClick={(e) => {
                      e.stopPropagation();
                      const filtered = files.filter(x => x.id !== f.id);
                      setFiles(filtered);
                      if (activeFileId === f.id) setActiveFileId(filtered[0].id);
                    }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div className="flex bg-[#0a0a0a] border-b border-white/5 overflow-x-auto no-scrollbar">
            {files.map(f => (
              <div
                key={f.id}
                onClick={() => setActiveFileId(f.id)}
                className={`px-4 py-2.5 flex items-center gap-3 cursor-pointer text-[10px] min-w-35 border-r border-white/5 transition-all ${activeFileId === f.id ? 'bg-[#050505] text-cyan-400 border-t-2 border-t-cyan-500' : 'opacity-50 bg-[#0c0c0c]'}`}
              >
                <span className="font-bold tracking-tight">{f.name.toUpperCase()}</span>
              </div>
            ))}
          </div>

          <NeuralRuntime
            key={activeFileId}
            file={activeFile}
            onExecute={async (code, lang) => {
              pushLog(`Invocando kernel para: ${activeFile.name}`, 'system');
              const result = await executeSandboxCode(code, lang) as ExecutionResult;
              if (result.error) pushLog(result.error, 'error');
              return result;
            }}
            onContentChange={(id, val) => setFiles(prev => prev.map(f => f.id === id ? { ...f, content: val } : f))}
          />
        </div>
      </div>

      <NeuralTerminal logs={terminalLogs} onClear={() => setTerminalLogs([])} isOpen={isTerminalOpen} setIsOpen={setIsTerminalOpen} activeFile={activeFile} />
    </div>
  );
}