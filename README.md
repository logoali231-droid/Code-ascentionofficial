# Code Ascension

## Overview

Code Ascension is an experimental offline-first educational platform focused on programming learning through local AI inference, adaptive curriculum generation, and hybrid code execution.

The project explores the practical limits of running Large Language Models (LLMs) directly inside the browser using WebGPU, eliminating continuous dependency on cloud inference APIs while preserving responsiveness, privacy, and low operational cost.

Instead of treating AI as a remote service, Code Ascension treats the browser as a local cognitive runtime.

---

# Core Goals

* Provide AI-assisted programming education without recurring inference costs.
* Reduce dependency on centralized cloud providers.
* Preserve user privacy by processing educational interactions locally.
* Explore adaptive learning systems powered by local LLM inference.
* Investigate hybrid execution models combining browser-native runtimes and isolated remote containers.

---

# Architecture

Code Ascension follows a hybrid offline-first architecture.

## Learn Mode

The educational and cognitive layer operates primarily on-device.

After the initial model download, the platform can continue generating lessons, explanations, exercises, and adaptive feedback fully offline using WebLLM and WebGPU.

### Local Components

* WebLLM (`@mlc-ai/web-llm`)
* WebGPU accelerated inference
* IndexedDB persistence (Dexie)
* Context summarization and memory compression
* Adaptive curriculum generation
* Vector-based lightweight retrieval
* Reinforcement and spaced repetition systems

### Offline Capabilities

After models are cached locally, the following systems operate without network dependency:

* Lesson generation
* Theory explanations
* Adaptive difficulty
* Error analysis
* Reinforcement loops
* Progress persistence
* Knowledge graph traversal
* Local memory retrieval

---

## Sandbox Mode

The Sandbox subsystem uses a multi-engine execution architecture.

Depending on the selected language, execution may happen:

### Locally

* JavaScript / TypeScript via browser runtime
* Python via Pyodide + WebAssembly
* Neural execution fallback for unsupported languages
* SANDBOX MODE IS STILL ON BETA

### Remotely

Compiled and system-level languages are executed through isolated Docker containers hosted on Azure infrastructure.

Examples:

* Java
* C++
* Kotlin
* Rust
* Go

The remote runtime is only activated during Sandbox usage and is completely decoupled from the educational inference pipeline.

---

# Technical Stack

## Frontend

* React
* Next.js
* TypeScript
* TailwindCSS

## AI Runtime

* WebLLM
* WebGPU
* Web Workers
* WASM / Pyodide

## Persistence

* IndexedDB
* Dexie

## Remote Runtime

* Docker
* Azure Virtual Machines
* Containerized execution

---

# Adaptive Learning System

The platform includes multiple educational subsystems designed to dynamically adapt content generation and reinforcement.

Current systems include:

* Adaptive difficulty scaling
* Knowledge graph prerequisites
* Spaced repetition
* Reinforcement exercise generation
* Long-term local memory
* Context compression
* Curriculum synchronization
* Concept constraint heuristics
* AI-assisted code evaluation

The objective is to maintain longitudinal pedagogical consistency while minimizing cognitive overload.

---

# Performance Philosophy

Code Ascension is designed with low-end and mid-range hardware in mind.

The runtime includes:

* Hardware-aware model selection
* VRAM tier detection
* Worker-based task offloading
* Lazy runtime initialization
* Aggressive memory cleanup
* Mobile-oriented optimizations

The project is actively tested on intermediate Android devices to validate practical WebGPU inference viability outside high-end hardware environments.

---

# Privacy

Educational interactions are processed locally whenever possible.

Unlike traditional cloud-based AI platforms:

* prompts are not continuously transmitted to external inference APIs;
* lesson generation can operate fully offline after model caching;
* user memory and progress remain stored locally in the browser.

Remote infrastructure is only required for:

* initial model download;
* optional future synchronization systems;
* remote sandbox execution for compiled languages.

---

# Limitations

Because the platform depends heavily on modern browser capabilities, some features may be unavailable depending on:

* WebGPU support;
* available VRAM;
* browser implementation quality;
* mobile thermal constraints.

Certain Sandbox languages also require active internet connectivity due to remote container execution.

---

# Current Status

The project is currently in active development as:

* a research environment for local-first AI systems;
* a study platform for adaptive programming education;
* an experimental runtime for browser-native LLM inference.

The architecture and APIs are still evolving and may change frequently.

---

# References

* [WebLLM GitHub Repository](https://github.com/mlc-ai/web-llm?utm_source=chatgpt.com)
* [WebLLM Research Paper (arXiv)](https://arxiv.org/abs/2412.15803?utm_source=chatgpt.com)
* [WebGPU Specification (W3C)](https://www.w3.org/TR/webgpu/?utm_source=chatgpt.com)
