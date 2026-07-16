# 📟 Matrix Portfolio: Ultra-Low Latency & In-Browser AI Showcase

A retro-terminal themed portfolio showcasing advanced systems engineering, high-frequency trading (HFT) infrastructure, custom memory allocators, and an innovative **Dual-Mode AI Assistant** that operates both locally in-browser via WebGPU/WASM and via a FastAPI smart backend.

---

## 🏗️ Architecture Overview

The system is partitioned into two primary layers to demonstrate modern web engineering combined with hardware-level systems design:

```
                  ┌──────────────────────────────────────────────┐
                  │               Visitor Browser                │
                  └──────────────────────┬───────────────────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    │               React App                 │
                    │      (Terminal UI & Scroll Reveal)      │
                    └─────────┬──────────────────────┬────────┘
                              │                      │
                   (Local LLM Mode)            (Light Mode / Api)
                              │                      │
                              ▼                      ▼
                    ┌───────────────────┐  ┌───────────────────┐
                    │    Web Worker     │  │  FastAPI Backend  │
                    │ (Transformers.js) │  │ (Smart Keyword &  │
                    │   Qwen 2.5 0.5B   │  │   Regex Matcher)  │
                    │   [WebGPU/WASM]   │  │  Port 5001 (Local)│
                    └───────────────────┘  └───────────────────┘
```

1. **Frontend (Vite + React 19)**: Implements a highly responsive retro terminal interface equipped with interactive CLI consoles, custom viewport-reveals using `IntersectionObserver`, and dynamic floating states.
2. **In-Browser Local LLM (Web Worker + Transformers.js)**: Runs a 4-bit quantized `Qwen2.5-0.5B-Instruct` model 100% locally in the browser. It compiles weights through WebGPU (with WASM fallback) and runs inside a dedicated browser Web Worker thread (`src/worker.js`) to guarantee zero main-thread UI blockage.
3. **Backend microservice (FastAPI)**: Serves a Python REST API on port `5001` with regex normalization and smart mapping, serving as a zero-download instant fallback agent.

---

## ⚡ Technical Highlights of Featured Projects

This portfolio highlights projects focused on low-level performance constraints:

### 1. SafeMem Allocator (C++)
A custom, slab-based memory allocator designed to replace the standard memory allocator (`glibc malloc`) for performance-critical engines.
* **Latency**: **4.5ns average allocation latency** (translating to ~18-20 CPU cycles on a 4.0GHz core). Benches **27x faster** than `malloc`.
* **Lock-Free Concurrency**: Leverages Thread-Local Storage (TLS) on the fast path. Thread allocation pools operate with zero mutex locks, enabling linear multi-threaded scalability.
* **TLB Optimization**: Utilizes Linux Hugepages (`MAP_HUGETLB` via `mmap`) to allocate 2MB chunks. This reduces Translation Lookaside Buffer (TLB) misses by **99.8%**, preventing costly OS page-table walks.
* **Cache Alignment**: Rigidly aligns internal data structures to 64-byte boundaries (CPU cache line size) to eliminate **false sharing** between adjacent cores.
* **Inter-Thread Communication**: Employs a low-latency Single-Producer Single-Consumer (SPSC) ring queue (~50ns latency) for cross-thread memory deallocations.
* **Interfaces**: Integrates Python `ctypes` bindings allowing high-level Python modules to utilize the raw performance of the allocator.

### 2. NanoTrade HFT Engine (C++)
An ultra-low latency simulated High-Frequency Trading execution pipeline.
* **Latency**: **17.5µs deterministic tick-to-trade latency** (end-to-end traversal from market data packet parsing to strategy evaluation and order ack).
* **Zero OS Context Switches**: Employs busy-spinning UDP sockets configured with `O_NONBLOCK`. Instead of yielding execution time to the kernel scheduler, the processing thread spins continuously, saving 10-50µs in kernel wake-ups.
* **Cache Pinning**: Applies hard CPU affinity bindings via `sched_setaffinity`. Keeps L1 and L2 caches hot by enforcing execution on dedicated isolated cores.
* **Zero-Copy Parser**: Parses incoming integer values (order volumes, prices) directly from binary UDP payloads without string allocation, string-to-float conversions, or intermediate buffers.
* **Branch Hints**: Embeds compile-time hints (`likely()` / `unlikely()` compiler macros mapped to `__builtin_expect`) to maximize pipeline efficiency by instructing the CPU's branch predictor.

### 3. HomoeoSathi: Dual-Storage Pharmacy System (Flutter / PHP / MySQL)
A production-grade pharmacy inventory management system containing specialized high-availability mechanics.
* **Dual Storage Fallback**: Implements local database state synchronization. If the PHP REST API is unreachable, the Flutter app switches instantly to local JSON persistent stores (`products.json`, `bills.json`), queues operations, and syncs upon reconnection.
* **MySQL Transaction Integrity**: Implements automated transaction rollbacks upon partial billing failures to guarantee database consistency and eliminate inventory leaks.

---

## 🛠️ Tech Stack & Dependencies

* **Frontend**: React 19, Vite 8, Vanilla CSS3 (Terminal Theme)
* **Client-Side AI**: `@huggingface/transformers` (^4.2.0)
* **Backend**: FastAPI, Uvicorn, Python 3
* **System/HFT Stack (referenced)**: C++20, Linux Syscalls (`mmap`, `sched_setaffinity`), Thread-Local Storage, SIMD, GDB/Perf

---

## 📁 Project Directory Structure

```text
matrix-portfolio/
├── backend/
│   ├── main.py            # FastAPI smart matcher API & Q&A knowledge base
│   └── requirements.txt   # Backend requirements (FastAPI, Uvicorn)
├── src/
│   ├── assets/            # UI Icons and SVGs
│   ├── App.css            # Matrix Green Terminal & animation styles
│   ├── App.jsx            # Core React UI component with Dual-Mode AI selection
│   ├── main.jsx           # App mounting entrypoint
│   └── worker.js          # HuggingFace Web Worker for browser-based LLM execution
├── index.html             # Terminal viewport metadata
├── package.json           # Frontend dependencies (React 19, Transformers.js)
└── vite.config.js         # Vite configuration
```

---

## 🚀 Running the Project Locally

### 1. Start the FastAPI Backend
```bash
cd backend
# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start backend server
python main.py
```
*The backend will boot up at `http://localhost:5001`.*

### 2. Start the Frontend Dev Server
```bash
# In the project root directory
npm install
npm run dev
```
*Access the terminal interface locally (usually `http://localhost:5173`).*

---

## 🧠 Technical Nuances Decoded

### Why Web Workers for the Local LLM?
Standard LLM execution in JavaScript is extremely CPU/GPU intensive. By utilizing Vite's native module worker syntax (`new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })`), the pipeline token generation runs asynchronously. The main browser thread remains 100% free to handle high-frame-rate CSS matrix rain animations and UI rendering without stuttering.

### Glibc Malloc vs. SafeMem Allocator
| Metric / Feature | `glibc malloc` | `SafeMem Allocator` | Technical Nuance |
| :--- | :--- | :--- | :--- |
| **Avg Latency** | ~120ns | **4.5ns** | Slab caching bypasses general heap searches |
| **Concurrency** | Mutex Locking | **Lock-Free (TLS)** | Thread-local caches eliminate lock contention |
| **Virtual Memory** | 4KB standard pages | **2MB Linux Hugepages** | Bypasses translation lookaside buffer (TLB) pressure |
| **Cache Behavior** | Subject to false sharing | **64-byte Aligned** | Prevents concurrent write cache-line invalidations |

### Deterministic UDP vs. TCP in NanoTrade
TCP's three-way handshake, congestion control, and packet retransmission (HOL blocking) introduce unpredictable latency spikes (jitters). NanoTrade enforces **UDP sockets** combined with **raw byte-level serialization** to ensure that market data is processed immediately upon physical packet arrival. If a packet is lost, the strategy handles state reconciliation out-of-band to prevent blocking the hot trading loop.
