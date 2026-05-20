# Code Ascension

## Overview

Code Ascension is a modular local development environment and browser-native workspace operating system developed under an offline-first hybrid architecture. The platform integrates localized artificial intelligence inference, adaptive curriculum generation, and an isolated multi-engine code execution pipeline. 

The system relies on browser-native protocols to execute software and run large language models directly on the client device: WebGPU handles Large Language Model (LLM) inference without remote API communication overhead, the Origin Private File System (OPFS) processes persistent file input/output tasks directly inside the host browser's private directory allocation, and Web3 protocols manage cryptographic workspace state identity tracking.

---

## Core Goals

* Provide AI-assisted programming education without recurring cloud inference operational costs.
* Eliminate structural dependency on centralized remote server providers for core educational workflows.
* Enforce absolute client privacy by maintaining and processing interaction contexts fully on-device.
* Deliver a fully offline development workspace featuring native file-tree traversal, isolated code execution, and terminal process emulation.
* Bridge client-side sandboxed runtimes with blockchain verification layers to preserve immutable project snapshots and identifier tracking.

---

## Architecture

Code Ascension functions as a split architecture composed of a browser-native client workspace layer and an automated containerized remote runtime gateway.

### 1. Workspace & Persistent Filesystem Subsystem

The application utilizes a persistent local filesystem layer built over the Origin Private File System (OPFS) via the `navigator.storage.getDirectory()` browser standard, replacing volatile in-memory file abstractions.

The system architecture located within `src/lib/sandbox/workspace/` encompasses:
* `workspaceStorage.ts`: Handles low-level directory creation, recursive folder parsing, and file read/write operations utilizing native `FileSystemDirectoryHandle` references.
* `workspaceManager.ts`: Governs the runtime active file states, folder tree updates, and synchronization pipelines fed into the `fileExplorer.tsx` tree component.
* `workspaceSnapshot.ts` and `workspaceManifest.ts`: Document structural changes, version histories, and track file integrity verification hashes across project states.
* `exportProject.ts` and `importProject.ts`: Coordinate the compilation and decompression of full OPFS workspace volumes into standard exportable `.zip` structures via `jszip`.

### 2. Sandbox Execution Engine Architecture

Code execution sequences are completely decoupled via a strictly defined typed execution abstraction implemented under the `IEngineExecutor` interface. Every executor handles code evaluation via the `execute` methodology, consuming the target code stream, language identifier string, and an optional `AbortSignal` to terminate runaway executions or loops before they block the UI. All executors return a promise resolving to a uniform typed `SandboxResult` payload.

The execution framework runs four distinct executor modules located in `src/lib/sandbox/`:
* **`LocalExecutor`**: Evaluates interpreted client environments (such as JavaScript and TypeScript) natively using the core browser engine or isolated thread contexts.
* **`WasmExecutor`**: Directs code evaluation through client-side WebAssembly environments, running isolated languages (such as Python code blocks via Pyodide) locally.
* **`RemoteExecutor`**: Proxies execution steps across secure connections to containerized servers when native browser execution is unavailable for a target language.
* **`NeuralExecutor`**: Provides model-driven fallback runtime simulations and syntactic feedback mechanisms for complex syntax structures.

### 3. Remote Runtime Container Infrastructure

For software environments requiring native host compilation or system-level binary execution, the project incorporates a standalone server component located in `runtime-server/`.
* **Server Orchestration**: Implements a dedicated execution queue (`queue.js`) and a runtime instance engine (`factory.js`) running a secure WebSocket/HTTP gateway server (`server.js`) to process tasks without container collision.
* **Container Environment**: Built via an Ubuntu-based Dockerfile (`node:20-bookworm`) that isolates development tooling natively.
* **Supported Environment Runtimes**: Configured via explicit platform targets inside `runtime-server/languages/`, mapping native runtime binaries including:
  * Systems & Compiled: Java (OpenJDK 17), Kotlin (1.9.23 via manual kotlinc deployment), Rust (rustc/cargo), Go, C/C++ (GCC/G++), .NET 8 (C#, F#, VB.NET), Free Pascal, Assembly (NASM), GNU COBOL, Haskell (GHC).
  * Scripting & Logic: Node.js/TypeScript, Python 3, PHP CLI, Ruby, Perl, Lua 5.4, Tcl, Clojure, Common Lisp (SBCL), R, Julia, Elixir, Erlang.
  * Domain/Database: Solidity (`solc`), SWI-Prolog, SQLite3.

### 4. Cryptographic Identity & Web3 Layer

The project maintains secure workspaces by enforcing identity abstraction over core cryptographic APIs inside `src/lib/web3/`:
* `workspaceIdentity.ts`: Compiles deterministic structural tracking hashes representing the complete physical layout of the OPFS storage tree.
* `bridge.ts` and `wallet.ts`: Interface with external decentralized wallet infrastructures and blockchain environments, creating a verification bridge between sandboxed states and on-chain record tracking.

### 5. Learn Mode & Adaptive Subsystems

The educational system runs fully decentralized on the client device after resource instantiation:
* **Local Inference Pipeline**: Executes model instructions directly over WebGPU via WebLLM (`@mlc-ai/web-llm`) enclosed inside an isolated background Web Worker (`webllm.worker.ts`) to isolate heavy compute steps from UI drawing routines.
* **Structured Local Storage**: Application settings, knowledge graphs, and progression trees map to IndexedDB through a Dexie data access layer (`src/lib/lib/db.ts`).
* **Input and Environment Sanitation**: Validates student inputs via strict heuristic pipelines, utilizing statistical validation arrays, a gibberish verification subsystem (`gibberish-detector.ts`), and concept constraint validation models to enforce system consistency.

---

## Technical Stack

### Core Frontend & Layout
* React 18 / Next.js 15 (Configured with standalone distribution output (`output: "standalone"`) and webpack optimization paths)
* TypeScript 5.8
* TailwindCSS 4.3 (Leveraging `@tailwindcss/postcss`)

### Local AI & Client Runtime
* WebLLM v0.2.83 (WebGPU model orchestration)
* Pyodide v0.29.4 (WebAssembly compiled Python execution layer)
* Web Workers API (`webllm.worker.ts`, `pythonWorker.ts`, `sandbox.worker.ts`, `logic.worker.ts`)

### Persistent Data Abstractions
* Native File System Access API (Origin Private File System handles via `FileSystemDirectoryHandle`)
* Dexie v4.4 / IndexedDB / `idb` v8.0 (Relational schema modeling and progress cache)
* JSZip v3.10 & FileSaver v2.0 (Workspace data packing and archive generation)

### Remote Infrastructure
* Docker Core Engine / Ubuntu bookworm system images
* Node.js v20 (Runtime microserver engine)
* Azure Cloud Services Infrastructure VM instances
* Azure Cosmos DB SDK (`@azure/cosmos`)

### Web3 Identity Verification
* Ethers v6.16 / Viem v2.50
* Wagmi v3.6 / WalletConnect Ethereum Provider

---

## Subsystems and Features

The application environment splits operational context across multiple interface routers found under `src/app/`:
* `course/` & `review/`: Generates and reviews localized curricula dynamically based on underlying mastery vectors.
* `factions/` & `skills/`: Tracks user-selected educational focuses and progression graphs.
* `sandbox/`: Contains the IDE terminal and multi-tab code surface (`EditorTabs.tsx`, `SandboxTerminal.tsx`).
* `hub/` & `leaderboard/`: Aggregates structural completion metrics and decentralized progression scaling.
* `vault/`: Interfaces with secure Web3 wallets and structural identity components.

---

## Privacy & Operational Limits

### Hardware Constraints
Features depend strictly on active hardware support profiles:
* WebGPU functionality requires compatible graphic driver extensions and assigned client VRAM profiles.
* Thermal status tracking (`thermal.ts`) dynamically gauges execution parameters under mobile workloads to match system-level constraints.

### Isolated Pipeline Compliance
* Client prompt data remains entirely inside the localized browser sandbox and is not transmitted to external cloud systems.
* Network access requirements are constrained entirely to remote runtime execution commands for non-native languages, initial deep model caching procedures, and Web3 consensus calls.

---

## References

* [WebLLM GitHub Repository](https://github.com/mlc-ai/web-llm)
* [WebLLM Research Paper (arXiv)](https://arxiv.org/abs/2412.15803)
* [WebGPU Specification (W3C)](https://www.w3.org/TR/webgpu/)