
# Code Ascension 🧠

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![WebLLM](https://img.shields.io/badge/WebLLM-0.2.83-cyan)](https://github.com/mlc-ai/web-llm)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](https://github.com/Logoali231/code-ascention/pulls)

> **Browser-native AI‑assisted learning workspace**  
> Local‑first, hybrid execution, and on‑device LLM inference.

---

## 📖 Overview

Code Ascension is a research‑grade platform that combines:

- **On‑device LLM inference** (WebLLM, WebGPU)  
- **Adaptive educational engine** (curriculum state, mastery tracking)  
- **Multi‑language sandbox** (local, Wasm, remote containers)  
- **Persistent offline storage** (OPFS + IndexedDB)

All core interactions run directly in the browser, minimising cloud dependency. Remote infrastructure (Azure containers) is used only for workloads that require system‑level binaries or isolation beyond the browser’s capabilities.

---

## ✨ Features

| Mode | Description |
|------|-------------|
| **Learn Mode** | AI explanations, adaptive exercises, offline curriculum, WebLLM inference, IndexedDB persistence |
| **Sandbox Mode** | Isolated execution for 20+ languages (JS, TS, Python, Java, C++, Rust, etc.) via local, Wasm, or remote backends |

**Stable components**  
- OPFS workspace & file management  
- Dexie‑based IndexedDB state  
- Curriculum & progression engine  
- ZIP import/export  
- WebLLM pipeline  

**Evolving / experimental**  
- Mobile WebGPU reliability  
- Thermal‑aware execution  
- Python (Pyodide) stability on low‑end devices  
- Long‑context inference under memory pressure  

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+  
- npm 9+  
- Modern browser with **WebGPU**, **OPFS**, **SharedArrayBuffer** and **WebAssembly** support.

### Installation

```bash
git clone https://github.com/Logoali231/code-ascention.git
cd code-ascention
npm install
```

Development

```bash
npm run dev
```

Open http://localhost:3001 – the app runs fully client‑side.

Production Build

```bash
npm run build
npm run start
```

Docker (optional – for remote runtime server)

```bash
cd runtime-server
docker build -t code-ascention-runtime .
docker run -p 3001:3001 code-ascention-runtime
```

The remote runtime server is optional – local execution works without it.

---

🧠 Architecture

The system is split into two layers:

1. Browser‑native client runtime (Next.js, Web Workers, OPFS, WebLLM)
2. Optional remote execution gateway (Docker + Azure)

Core modules

· src/lib/sandbox/ – execution abstraction (LocalExecutor, WasmExecutor, RemoteExecutor, NeuralExecutor)
· src/lib/others/ – curriculum, mastery, reinforcement, vector memory, AI prompts
· src/lib/workers/ – dedicated workers for WebLLM, Python, logic evaluation, sandbox
· runtime-server/ – containerised multi‑language executor (Node.js + Docker)

Execution routing

```typescript
// Engine selection based on language & hardware
LocalExecutor → JS/TS
WasmExecutor  → Python (Pyodide)
RemoteExecutor→ Java, C#, C++, Go, Rust, etc.
NeuralExecutor→ heuristic fallback for unsupported runtimes
```

Model routing (adaptive)

Tier Model RAM (min) Mobile safe
LOW Qwen2.5 Coder 0.5B 3 GB ✅
MID Phi‑3 Mini (exp.) 4 GB ✅
HIGH Phi‑3.5 Mini (desktop) 8 GB ❌

---

📦 Technology Stack

Layer Technologies
Frontend React 18, Next.js 15, TypeScript 5, TailwindCSS 4
Local AI WebLLM, WebGPU, Pyodide
Persistence OPFS, IndexedDB, Dexie, JSZip
Remote Docker, Node.js 20, Azure VMs, Cosmos DB
Web3 Ethers, Viem, Wagmi, WalletConnect

---

📁 Project Structure (highlights)

```
├── src/
│   ├── app/              # Next.js pages (Learn, Sandbox, Profile, Shop, etc.)
│   ├── components/       # UI components (CodeEditor, ExerciseRenderer, NeuralTerminal)
│   ├── lib/              # Core logic
│   │   ├── sandbox/      # Execution engines & workspace management
│   │   ├── others/       # Curriculum, mastery, AI prompts, vector memory
│   │   └── workers/      # WebLLM, compute, logic, Python workers
│   └── providers/        # Web3, session providers
├── public/               # Static assets, service worker
├── runtime-server/       # Remote execution gateway (Docker)
└── .github/workflows/    # CI (deploy to Docker Hub)
```

---

🔧 Configuration

System limits can be tuned in src/config/system.ts:

· Model list, memory limits, context window sizes
· Cleanup thresholds, queue concurrency
· Mobile‑specific optimisations

Environment variables (optional):

Variable Purpose
COSMOS_DB_CONNECTION_STRING Azure Cosmos DB (leaderboard sync)
NEXT_PUBLIC_SUPABASE_URL/ANON_KEY Cloud backup (profile import/export)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID Web3 wallet integration

---

🤝 Contributing

Contributions are welcome! Please follow the existing code style (TypeScript, Tailwind, "use client" for components).
Open an issue or PR – we use GitHub Actions for type‑checking and builds.

```bash
npm run lint
npm run type-check
```

---

📄 License

MIT – see LICENSE file.

---

🙏 Acknowledgements

· WebLLM – in‑browser LLM inference
· Pyodide – Python in WebAssembly
· Dexie.js – IndexedDB wrapper
· Lucide – Icons

---

Code Ascension is a research‑driven exploration of browser‑native AI and distributed execution.
For detailed internals, see the architecture deep‑dive or the system constraints section.
