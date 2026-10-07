import { useState, useEffect, useRef } from 'react';
import './App.css';

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAiResponse, setShowAiResponse] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const heroChatContainerRef = useRef(null);
  const floatingChatContainerRef = useRef(null);

  const [useLocalLlm, setUseLocalLlm] = useState(false);

  // In-browser model states & performance telemetry
  const [modelLoading, setModelLoading] = useState(false);
  const [modelProgress, setModelProgress] = useState({});
  const [modelReady, setModelReady] = useState(false);
  const [inferenceDevice, setInferenceDevice] = useState(null);
  const [modelLoadTimeMs, setModelLoadTimeMs] = useState(null);
  const [lastMetrics, setLastMetrics] = useState(null);
  const [liveStreamingMetrics, setLiveStreamingMetrics] = useState(null);
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', content: "Hello! I am Rahul's AI assistant. How can I help you learn more about Rahul's work, low-latency projects, or engineering experience today?" }
  ]);
  const [isWorkerInitialized, setIsWorkerInitialized] = useState(false);
  const workerRef = useRef(null);
  const streamedResponseRef = useRef('');

  // Scroll reveal observer
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
    revealElements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (heroChatContainerRef.current) {
      heroChatContainerRef.current.scrollTop = heroChatContainerRef.current.scrollHeight;
    }
  }, [aiResponse, isLoading, chatHistory]);

  useEffect(() => {
    if (floatingChatContainerRef.current) {
      floatingChatContainerRef.current.scrollTop = floatingChatContainerRef.current.scrollHeight;
    }
  }, [aiResponse, isLoading, chatHistory]);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  // Floating chat visibility state
  const [showFloatingChat, setShowFloatingChat] = useState(false);

  // Monitor scroll to display floating chat widget when visitor scrolls past hero
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 450) {
        setShowFloatingChat(true);
      } else {
        setShowFloatingChat(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);



  const getLoadingPercentage = () => {
    let totalBytes = 0;
    let loadedBytes = 0;
    
    Object.values(modelProgress).forEach(file => {
      if (file.total) {
        totalBytes += file.total;
        loadedBytes += file.loaded;
      }
    });

    if (totalBytes === 0) return 0;
    return Math.round((loadedBytes / totalBytes) * 100);
  };

  const initializeWorker = () => {
    if (isWorkerInitialized) return;
    setIsWorkerInitialized(true);
    setModelLoading(true);

    // Create Web Worker using Vite-compatible URL syntax
    workerRef.current = new Worker(new URL('./worker.js', import.meta.url), {
      type: 'module'
    });

    // Trigger pre-loading model
    workerRef.current.postMessage({ type: 'load' });

    workerRef.current.onmessage = (event) => {
      const { type, data, text, error, metrics, tokenCount, elapsedMs, ttftMs } = event.data;

      if (type === 'progress') {
        if (data.status === 'downloading' || data.status === 'progress') {
          setModelProgress(prev => ({
            ...prev,
            [data.file]: { progress: data.progress, loaded: data.loaded, total: data.total }
          }));
        }
      } else if (type === 'ready') {
        setModelLoading(false);
        setModelReady(true);
        if (event.data.device) setInferenceDevice(event.data.device);
        if (event.data.loadTimeMs) setModelLoadTimeMs(event.data.loadTimeMs);
      } else if (type === 'token') {
        streamedResponseRef.current += text;
        setAiResponse(streamedResponseRef.current);
        if (tokenCount && elapsedMs) {
          const elapsedSec = elapsedMs / 1000;
          const liveSpeed = elapsedSec > 0 ? (tokenCount / elapsedSec).toFixed(1) : '0.0';
          setLiveStreamingMetrics({
            tokenCount,
            elapsedMs,
            liveSpeed,
            ttftMs
          });
        }
      } else if (type === 'done') {
        setIsLoading(false);
        const finalResponse = streamedResponseRef.current;
        setChatHistory(prev => [...prev, { role: 'assistant', content: finalResponse, metrics }]);
        if (metrics) setLastMetrics(metrics);
        setAiResponse('');
        setLiveStreamingMetrics(null);
        streamedResponseRef.current = '';
      } else if (type === 'error') {
        setIsLoading(false);
        setModelLoading(false);
        setLiveStreamingMetrics(null);
        console.error('Worker error:', error);
        setChatHistory(prev => [
          ...prev, 
          { role: 'assistant', content: `Error running AI locally: ${error}. Fallback mock activated.` }
        ]);
        setAiResponse('');
      }
    };
  };

  const toggleChat = () => {
    const nextState = !showAiResponse;
    setShowAiResponse(nextState);
    if (nextState) {
      initializeWorker();
    }
  };

  const handleAIQuery = async (e) => {
    e.preventDefault();
    if (!aiInput.trim() || isLoading) return;

    const query = aiInput;
    setAiInput('');
    setIsLoading(true);
    setShowAiResponse(true);
    setAiResponse('');
    setLiveStreamingMetrics(null);
    streamedResponseRef.current = '';

    const newHistory = [...chatHistory, { role: 'user', content: query }];
    setChatHistory(newHistory);

    if (useLocalLlm) {
      if (!isWorkerInitialized) {
        initializeWorker();
      }

      if (modelReady && workerRef.current) {
        workerRef.current.postMessage({
          type: 'generate',
          messages: newHistory
        });
      } else {
        // Model not loaded yet, use fast smart answer fallback
        setLoadingMessage("📥 Model downloading... Using smart fallback.");
        const startT = performance.now();
        setTimeout(() => {
          const answer = getSmartAnswer(query);
          const endT = performance.now();
          const latency = Number((endT - startT).toFixed(1));
          const wordCount = answer.trim().split(/\s+/).length;
          const fallbackMetrics = {
            ttftMs: latency,
            totalTimeMs: latency,
            tokenCount: Math.round(wordCount * 1.3),
            tokensPerSec: 'Instant (O(1))',
            device: 'FALLBACK REGEX',
          };
          setChatHistory(prev => [...prev, { role: 'assistant', content: answer, metrics: fallbackMetrics }]);
          setLastMetrics(fallbackMetrics);
          setIsLoading(false);
        }, 1000);
      }
    } else {
      // Light Mode (instant keyword matching, zero network download)
      setLoadingMessage("thinking...");
      const startT = performance.now();
      setTimeout(() => {
        const answer = getSmartAnswer(query);
        const endT = performance.now();
        const latency = Number((endT - startT).toFixed(1));
        const wordCount = answer.trim().split(/\s+/).length;
        const lightMetrics = {
          ttftMs: latency,
          totalTimeMs: latency,
          tokenCount: Math.round(wordCount * 1.3),
          tokensPerSec: 'Instant (O(1))',
          device: 'IN-MEMORY REGEX',
        };
        setChatHistory(prev => [...prev, { role: 'assistant', content: answer, metrics: lightMetrics }]);
        setLastMetrics(lightMetrics);
        setIsLoading(false);
      }, 400);
    }
  };

  const getSmartAnswer = (query) => {
    let q = query.toLowerCase().trim();
    q = q.replace("c++", "cpp");
    q = q.replace("c plus plus", "cpp");
    q = q.replace("c plus", "cpp");
    q = q.replace("wats", "what is");
    q = q.replace("whats", "what is");
    
    if (q === 'hi' || q === 'hello' || q === 'hey' || q.startsWith('hi ') || q.startsWith('hello ') || q.startsWith('hey ')) {
      return `Hello! I am Rahul's AI assistant. How can I help you learn more about Rahul's work, low-latency projects, or engineering experience today?`;
    }
    
    if (q.includes('weather') || q.includes('sports') || q.includes('news') || q.includes('time') || q.includes('joke')) {
      return `I am only programmed to answer questions about Rahul Sahu's projects, skills, and professional experience. Let me know if you'd like to hear about SafeMem, B2B Distribution Platform, or Matrix!`;
    }
    
    const answers = {
      "homoeosathi": `**HOMOEOSATHI // SGTYUG TECHNOLOGIES INTERNSHIP**

**Company:** Sgtyug Technologies Pvt Ltd
**Timeline:** May 2026 – June 2026
**Role:** Software Engineering Intern (Remote)

• Built high-availability backend services for the HomeoSathi pharmacy ERP, implementing a dual-storage caching layer with offline JSON fallbacks to preserve availability during network or MySQL outages, supporting [10,000+] daily active users.
• Designed transactional database workflows to prevent inventory race conditions during concurrent checkouts and structured automated schema migrations to avoid live production downtime, achieving [99.9%] uptime.
• Engineered optimized REST endpoints for a real-time revenue dashboard and developed a low-overhead invoice-generation rendering engine, reducing generation latency by [40%].
• **Stack:** PHP (OOP), MySQL, REST APIs, Python, Flutter, Dart`,

      "sgtyug": `**SGTYUG TECHNOLOGIES PVT LTD**

**Timeline:** May 2026 – June 2026
**Role:** Software Engineering Intern (Remote)

• Built high-availability backend services for the HomeoSathi pharmacy ERP with dual-storage caching & offline JSON fallbacks, supporting [10,000+] daily active users.
• Designed transactional database workflows preventing inventory race conditions during concurrent checkouts (99.9% uptime).
• Engineered optimized REST endpoints for real-time revenue dashboard & invoice generation (reduced latency by 40%).
• **Stack:** PHP (OOP), MySQL, REST APIs, Python, Flutter, Dart`,

      "internship": `**INTERNSHIP: Sgtyug Technologies Pvt Ltd**

**Timeline:** May 2026 – June 2026
**Role:** Software Engineering Intern (Remote)
**Core System:** HomeoSathi pharmacy ERP backend services supporting 10,000+ DAU.
🔧 **Stack:** PHP (OOP), MySQL, REST APIs, Python, Flutter, Dart`,

      "safemem": `**SAFEMEM – HIGH-PERFORMANCE THREAD-SAFE ALLOCATOR**
**Stack:** C++, Hugepages, SIMD, Google Benchmark

• 18 CPU cycles (~4.5 ns) average allocation latency and 12.55 GiB/s throughput across 100M allocations, verified with Google Benchmark.
• Eliminated mutex contention on the hot path through Thread Local Storage (TLS).
• 2 MB Hugepages, SIMD-safe alignment, cache-line isolation, ASAN/TSAN sanitization.
• Python ctypes integration for low-latency workloads.`,
      
      "b2b": `**B2B DISTRIBUTION PLATFORM – FOR REGIONAL DISTRIBUTORS**
**Stack:** Next.js, React, MongoDB, JWT

• End-to-end wholesale platform built on demands of regional distributors with GST/company verification and hidden wholesale prices until admin approval.
• Engineered a zero-fraud Cash-on-Delivery (COD) pipeline using the HTML5 Geolocation API to strictly capture and route physical device coordinates to the admin dashboard.
• Digitized wholesale operations by automating inventory tracking and strictly enforcing Minimum Order Quantities (MOQs), eliminating manual WhatsApp order processing and saving an estimated 15+ hours/week.
• Integrated a gated payment flow opening the gateway only after order confirmation.`,
      
      "matrix": `**MATRIX – IN-BROWSER AI & SYSTEMS SHOWCASE**
**Stack:** React, WebGPU, WASM, FastAPI

• Architected a dual-mode AI portfolio with a 100% in-browser 4-bit quantized Qwen2.5-0.5B model running locally through WebGPU/WASM inside a dedicated Web Worker, keeping the main UI thread responsive.
• Built a React terminal interface with a FastAPI smart fallback service using regex normalization and keyword mapping, combining browser-side AI inference with a lightweight backend microservice.`,

      "cpp": `**C++ Skills (Expert Level)**

- Zero-cost abstractions
- Manual memory control (placement new, custom allocators)
- Low-level access (inline assembly, memory barriers)
- Deterministic performance (no GC pauses)
- Lock-free concurrency with TLS

Applied in: SafeMem (4.5ns), NanoTrade (17.5µs)`,
      
      "python": `**Python Skills (Intermediate-Expert)**

- FastAPI - High-performance REST APIs
- Streamlit - Rapid AI/ML interfaces
- Pandas/NumPy - Data analysis
- Scikit-learn - Machine Learning
- Gemini API - Generative AI, RAG systems
- ctypes - C++ bindings for SafeMem

Applied in: AI Assistant, Data Analysis, Backend APIs`,
      
      "mern": `**MERN Stack Skills**

- MongoDB - Database design, indexing, aggregation
- Express.js - REST APIs, middleware
- React.js - Hooks, context, components
- Node.js - Event-driven architecture

Applied in: Chatter-Box (50+ users, real-time P2P)`,
      
      "docker": `**Docker Skills**

- Containerization with Dockerfile
- Multi-container with docker-compose
- CI/CD integration
- Deployment on Render

Applied in: Chatter-Box deployment`,
      
      "fpga": `**FPGA/Verilog/VHDL Skills**

- RTL coding (Verilog, VHDL)
- Digital logic design
- Timing analysis and constraints
- Simulation and testbenches

From: ECE curriculum at BIT Mesra`,
      
      "microcontroller": `**Microcontroller Skills (8051/ARM)**

- Embedded C programming
- GPIO, Timers, ADC, PWM, Interrupts
- Communication protocols (I2C, SPI, UART)
- Debugging with JTAG/SWD

From: Embedded systems coursework`,
      
      "rtos": `**RTOS Skills**

- Task scheduling and prioritization
- IPC (queues, semaphores, mutexes)
- Interrupt handling
- Memory management

From: Embedded systems projects`,
      
      "lock free": `**Lock-Free Programming (Expert)**

- Thread-Local Storage (TLS) - no mutex contention
- 4.5ns allocations vs 120ns with locks
- SPSC queues - 50ns cross-thread messaging
- Cache line padding - prevents false sharing

Applied in: SafeMem allocator`,
      
      "memory management": `**Memory Management (Expert)**

- Custom slab allocators
- 2MB Linux Hugepages (99.8% TLB miss reduction)
- 64-byte alignment (false sharing prevention)
- Lock-free TLS fast path

Applied in: SafeMem - 4.5ns, 27x faster than malloc`,

      "hugepages": `**WHY HUGEPAGES IN SAFEMEM?**

THE PROBLEM:
Linux uses 4KB pages. TLB holds ~64 entries. 
With 100M allocations → constant TLB misses → 100-200 cycle penalty each.

THE SOLUTION:
2MB Hugepages = 512x memory per TLB entry!

THE RESULT:
• 99.8% reduction in TLB misses
• No page-walk latency
• 4.5ns allocation latency

IMPLEMENTATION: mmap(..., MAP_HUGETLB)`,

      "education": `**EDUCATION**

**Birla Institute of Technology, Mesra, Ranchi**
Aug 2024 – Aug 2028
B.Tech, Electronics and Communication Engineering | CGPA: 8.17

**12th (ISC)** - St. Thomas School | 2022-2023 | 90%
**10th (ICSE)** - St. Thomas School | 2020-2021 | 91.5%`,

      "gdg": `**TECHNICAL TEAM MEMBER – GDG ON CAMPUS, BIT**
Timeline: Oct 2025 – Present
Conducted technical workshops on system design and clean architecture for 100+ students.`,

      "amazon": `**AMAZON ML CHALLENGE 2026 (TOP 100)**
Built a scalable entity matching pipeline using Python, XGBoost, and AWS SageMaker to process billions of candidate pairs.`,

      "paranox": `**PARANOX HACKATHON**
Ranked 52nd out of 1000+ competing teams.`,

      "sih": `**SMART INDIA HACKATHON**
Reached Top 10 institutional finals at BIT Mesra.`,

      "achievements": `**NOTABLE ACHIEVEMENTS**
• **Codeforces Specialist:** Peak rating 1477; solved 1000+ algorithmic problems.
• **Amazon ML Challenge 2026 (Top 100):** Built scalable entity matching pipeline with Python, XGBoost, & AWS SageMaker.
• **Paranox Hackathon:** Ranked 52nd out of 1000+ competing teams.
• **Smart India Hackathon:** Reached Top 10 institutional finals at BIT Mesra.
• **GDG On Campus, BIT:** Technical Team Member; conducted system design workshops for 100+ students.`,

      "codeforces": `**CODEFORCES SPECIALIST**

Handle: firstrahul39
Peak Rating: 1477 (Specialist)
Problems Solved: 1000+ algorithmic problems across dynamic programming, graph theory, trees, and math.`,

      "leetcode": `**LEETCODE PROFILE**
Profile: leetcode.com/u/firstrahul39
Extensive problem solving in data structures, algorithms, and systems design.`,

      "contact": `**CONTACT INFORMATION**

Email: firstrahul39@gmail.com
Phone: +91 8299302303
GitHub: github.com/cpsurfer
LinkedIn: linkedin.com/in/rahul-sahu-097874306
Codeforces: codeforces.com/profile/firstrahul39
LeetCode: leetcode.com/u/firstrahul39

Location: BIT Mesra, Ranchi, Jharkhand`,

      "skills": `**TECHNICAL SKILLS (FROM RESUME)**

• **Languages:** C++ (C++17/C++20), Python, TypeScript, JavaScript, SQL, PHP, Dart
• **Backend & Databases:** Node.js, Express.js, FastAPI, REST APIs, MongoDB, MySQL
• **Frontend & Cloud:** React, Next.js, Tailwind CSS, Flutter, Docker, AWS (SageMaker), Vercel, Git
• **Systems & Performance:** Memory allocators, Hugepages, SIMD, Multithreading, Thread-Local Storage
• **Tools:** GDB, Perf, Valgrind, Google Benchmark, ASAN, TSAN, WebGPU, WASM`
    };
    
    for (const [key, answer] of Object.entries(answers)) {
      if (q.includes(key)) {
        return `**Assistant:**\n\n${answer}\n\n---\nAsk me anything else about Rahul's projects, skills, or experience!`;
      }
    }
    
    if (q.includes("b2b") || q.includes("wholesale") || q.includes("distribution")) {
      return `**Assistant:**\n\n${answers["b2b"]}\n\n---\nAsk me about SafeMem or Matrix!`;
    }
    
    if (q.includes("matrix") || q.includes("showcase") || q.includes("qwen")) {
      return `**Assistant:**\n\n${answers["matrix"]}\n\n---\nAsk me about SafeMem or B2B Distribution Platform!`;
    }

    if (q.includes("homoeo") || q.includes("sathi") || q.includes("stocx") || q.includes("sgtyug") || q.includes("internship")) {
      return `**Assistant:**\n\n${answers["homoeosathi"]}\n\n---\nI can also tell you about SafeMem, B2B Distribution Platform, or Matrix!`;
    }
    
    if (q.includes("12th") || q.includes("10th") || q.includes("btech") || q.includes("college") || q.includes("education")) {
      return `**Assistant:**\n\n${answers["education"]}\n\n---\nWant to know about my projects or skills instead?`;
    }
    
    return `**Assistant:** I can answer questions about:

**PROJECTS & EXPERIENCE:**
• "Tell me about my Internship" at Sgtyug Technologies
• "What is SafeMem?" - 18 CPU cycles (~4.5ns) thread-safe allocator
• "B2B Distribution Platform" - Wholesale platform with zero-fraud COD
• "Matrix" - In-browser WebGPU AI portfolio with Qwen2.5
• "HomeoSathi ERP" - Pharmacy caching backend (10,000+ DAU)

**SKILLS & ACHIEVEMENTS:**
• "Technical skills" / "C++" / "Systems programming"
• "Amazon ML Challenge" - Top 100 ranking
• "Codeforces rating" - 1477 Specialist (1000+ solved)
• "Paranox Hackathon" / "Smart India Hackathon"

**EDUCATION & CONTACT:**
• "Education background" - BIT Mesra ECE
• "Contact information" - Email, LinkedIn, GitHub, LeetCode

**Try asking:** "What is SafeMem?" or "Tell me about B2B Platform" or "Internship experience"`;
  };

  return (
    <div className="portfolio animate-fade-in">
      <div className="matrix-bg"></div>
      
      <header className="terminal-header">
        <div className="header-content">
          <a href="#home" className="title" style={{ textDecoration: 'none' }}>
            <span className="brand-avatar">RS</span>
            <span>Rahul Sahu</span>
          </a>
          <button 
            className={`menu-toggle ${isMenuOpen ? 'open' : ''}`} 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            aria-label="Toggle menu"
          >
            <span className="bar"></span>
            <span className="bar"></span>
            <span className="bar"></span>
          </button>
          <nav className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
            <a href="#home" onClick={() => setIsMenuOpen(false)}>Home</a>
            <a href="#about" onClick={() => setIsMenuOpen(false)}>About</a>
            <a href="#experience" onClick={() => setIsMenuOpen(false)}>Experience</a>
            <a href="#projects" onClick={() => setIsMenuOpen(false)}>Projects</a>
            <a href="#achievements" onClick={() => setIsMenuOpen(false)}>Milestones</a>
            <a href="#contact" onClick={() => setIsMenuOpen(false)}>Contact</a>
          </nav>
        </div>
      </header>

      <main>
        {/* HERO SECTION */}
        <section id="home" className="hero">
          <div className="hero-grid">
            <div className="hero-left terminal-window reveal-left">
              <div className="terminal-line">Low-Latency Systems & Distributed Engineering</div>
              <h1 className="hero-title">Engineering High-Performance Systems</h1>
              <h2 className="hero-subtitle">Single-Digit Nanosecond Allocators & Scalable Web Platforms</h2>
              <p className="hero-desc">
                Electronics & Communication Engineering student at <span className="highlight">BIT Mesra</span> (CGPA: 8.17) specializing in 
                thread-safe custom memory allocators, regional B2B wholesale platforms, and local-first in-browser WebGPU inference engines.
              </p>

              <div className="hero-cta-group">
                <a href="#projects" className="btn-primary">
                  <span>View Projects</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M12 5l7 7-7 7"></path></svg>
                </a>
                <a href="#about" className="btn-secondary">
                  <span>Technical Philosophy</span>
                </a>
              </div>
              
              <div className="hero-metrics">
                <div className="hero-metric-card reveal-scale stagger-1">
                  <span className="metric-val">4.5ns</span>
                  <span className="metric-lbl">SafeMem Latency (18 cycles)</span>
                </div>
                <div className="hero-metric-card reveal-scale stagger-2">
                  <span className="metric-val">1477</span>
                  <span className="metric-lbl">Codeforces Specialist (1000+ Solved)</span>
                </div>
                <div className="hero-metric-card reveal-scale stagger-3">
                  <span className="metric-val">Top 100</span>
                  <span className="metric-lbl">Amazon ML Challenge 2026</span>
                </div>
              </div>
            </div>
            
            <div className="hero-right reveal-right">
              {/* EMBEDDED AI CONSOLE */}
              <div className="hero-ai-console">
                <div className="console-header">
                  <div className="console-title">
                    <span className={`pulse-indicator ${useLocalLlm ? (modelReady ? 'online' : 'loading') : 'offline'}`}></span>
                    <span>Rahul AI Copilot</span>
                  </div>
                  <button 
                    onClick={() => {
                      if (!useLocalLlm) {
                        setUseLocalLlm(true);
                        initializeWorker();
                      } else {
                        setUseLocalLlm(false);
                      }
                    }}
                    className="console-toggle-btn"
                  >
                    {useLocalLlm ? 'Local WebGPU Active' : 'Switch to Local WebGPU (0.5B)'}
                  </button>
                </div>
                
                {/* INFERENCE TELEMETRY HUD BAR */}
                <div className="console-telemetry-hud">
                  <div className="hud-metric">
                    <span className="hud-lbl">DEVICE</span>
                    <span className={`hud-val ${useLocalLlm ? 'online' : ''}`}>
                      {useLocalLlm ? (modelReady ? (inferenceDevice || 'WEBGPU') : 'INITIALIZING') : 'FAST PATH'}
                    </span>
                  </div>
                  <div className="hud-metric">
                    <span className="hud-lbl">TTFT</span>
                    <span className="hud-val">{lastMetrics?.ttftMs !== undefined ? `${lastMetrics.ttftMs}ms` : '--'}</span>
                  </div>
                  <div className="hud-metric">
                    <span className="hud-lbl">THROUGHPUT</span>
                    <span className="hud-val highlight">
                      {lastMetrics?.tokensPerSec 
                        ? (typeof lastMetrics.tokensPerSec === 'number' ? `${lastMetrics.tokensPerSec} tok/s` : lastMetrics.tokensPerSec) 
                        : '--'}
                    </span>
                  </div>
                  <div className="hud-metric">
                    <span className="hud-lbl">LATENCY</span>
                    <span className="hud-val">
                      {lastMetrics?.totalTimeMs !== undefined 
                        ? (lastMetrics.totalTimeMs < 1000 ? `${lastMetrics.totalTimeMs}ms` : `${(lastMetrics.totalTimeMs / 1000).toFixed(2)}s`) 
                        : '--'}
                    </span>
                  </div>
                  <div className="hud-metric">
                    <span className="hud-lbl">TOKENS</span>
                    <span className="hud-val">{lastMetrics?.tokenCount ?? '--'}</span>
                  </div>
                </div>

                <div className="console-screen">
                  <div className="console-sys-log">
                    <span className="log-line system">AI Telemetry Active</span>
                    <span className="log-line">Dual-Mode Architecture: WebGPU / WASM Local LLM with In-Memory FastPath.</span>
                  </div>

                  <div className="console-chat-history" ref={heroChatContainerRef}>
                    {chatHistory.map((msg, index) => (
                      <div key={index} className={`console-msg ${msg.role}`}>
                        <span className="msg-prefix">{msg.role === 'user' ? 'Visitor: ' : 'AI Copilot: '}</span>
                        <div className="msg-txt">{msg.content}</div>
                        {msg.metrics && (
                          <div className="msg-telemetry-badge">
                            <span className="metric-chip chip-device">⚡ {msg.metrics.device}</span>
                            <span className="metric-chip">⏱️ TTFT: {msg.metrics.ttftMs}ms</span>
                            {typeof msg.metrics.tokensPerSec === 'number' && (
                              <span className="metric-chip chip-speed">🚀 {msg.metrics.tokensPerSec} tok/s</span>
                            )}
                            <span className="metric-chip">
                              ⌛ {msg.metrics.totalTimeMs < 1000 ? `${msg.metrics.totalTimeMs}ms` : `${(msg.metrics.totalTimeMs / 1000).toFixed(2)}s`}
                            </span>
                            <span className="metric-chip">📊 {msg.metrics.tokenCount} tokens</span>
                          </div>
                        )}
                      </div>
                    ))}
                    {aiResponse && (
                      <div className="console-msg assistant">
                        <span className="msg-prefix">AI Copilot: </span>
                        <div className="msg-txt">{aiResponse}</div>
                        {liveStreamingMetrics && (
                          <div className="live-stream-badge">
                            <span className="pulse-dot"></span>
                            <span>STREAMING: {liveStreamingMetrics.tokenCount} tokens</span>
                            <span>• {liveStreamingMetrics.liveSpeed} tok/s</span>
                            <span>• {(liveStreamingMetrics.elapsedMs / 1000).toFixed(1)}s</span>
                            {liveStreamingMetrics.ttftMs ? <span>• TTFT: {liveStreamingMetrics.ttftMs}ms</span> : null}
                          </div>
                        )}
                      </div>
                    )}
                    {isLoading && aiResponse === '' && !modelLoading && (
                      <div className="console-msg assistant thinking">
                        <span className="msg-prefix">AI Copilot: </span>
                        <div className="msg-txt">{loadingMessage || "Generating response..."}</div>
                      </div>
                    )}
                  </div>

                  {modelLoading && (
                    <div className="console-progress-track">
                      <div className="track-label">LOADING WEIGHTS: {getLoadingPercentage()}%</div>
                      <div className="progress-bar-container">
                        <div className="progress-bar-fill" style={{ width: `${getLoadingPercentage()}%` }}></div>
                      </div>
                      <div className="track-subtext">Runs 100% locally in your browser (~300MB download)</div>
                    </div>
                  )}

                  <form onSubmit={handleAIQuery} className="console-input-area">
                    <input 
                      type="text" 
                      value={aiInput} 
                      onChange={(e) => setAiInput(e.target.value)} 
                      placeholder={modelReady ? "Ask about SafeMem, B2B Platform, Matrix, Codeforces..." : "Ask anything (smart fallback ready)..."}
                      disabled={isLoading && modelReady}
                      className="console-text-input"
                    />
                    <button type="submit" className="console-submit-btn">Send</button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ABOUT SECTION */}
        <section id="about" className="about">
          <div className="section-header">
            <span className="section-badge">CORE PRINCIPLES</span>
            <h2>Engineering High-Performance Systems & Scalable Platforms</h2>
          </div>
          <div className="about-grid">
            <div className="about-card reveal-left stagger-1"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="about-icon" style={{color: "var(--accent-primary)", marginBottom: "16px", display: "inline-block"}}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg><h3>Systems & Performance</h3><p>Engineered SafeMem achieving 18 CPU cycles (~4.5 ns) latency, 12.55 GiB/s throughput, and zero mutex contention via Thread Local Storage.</p></div>
            <div className="about-card reveal-left stagger-2"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="about-icon" style={{color: "var(--accent-primary)", marginBottom: "16px", display: "inline-block"}}><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="15" x2="23" y2="15"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="15" x2="4" y2="15"></line></svg><h3>B2B Platforms</h3><p>Built regional wholesale distribution platform with zero-fraud COD geolocation tracking, automated MOQ enforcement, and 99.9% uptime.</p></div>
            <div className="about-card reveal-left stagger-3"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="about-icon" style={{color: "var(--accent-primary)", marginBottom: "16px", display: "inline-block"}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M12 2v9"></path><path d="M8 5h8"></path></svg><h3>Local AI & WebGPU</h3><p>Architected dual-mode in-browser Qwen2.5-0.5B inference running locally via WebGPU/WASM inside dedicated Web Workers.</p></div>
          </div>
          <div className="terminal-quote">
            "My mission is to build software that operates at the absolute limits of hardware — where every nanosecond matters and every byte is accounted for."
          </div>
        </section>

        {/* SKILLS SECTION */}
        <section className="skills">
          <div className="section-header">
            <span className="section-badge">TECHNICAL CAPABILITIES</span>
            <h2>Technical Skills</h2>
          </div>
          <div className="skills-grid">
            <div className="skill-category reveal stagger-1"><h3>LANGUAGES</h3><div className="skill-items"><span>C++ (C++17/C++20)</span><span>Python</span><span>TypeScript</span><span>JavaScript</span><span>SQL</span><span>PHP</span><span>Dart</span></div></div>
            <div className="skill-category reveal stagger-2"><h3>BACKEND & DATABASES</h3><div className="skill-items"><span>Node.js</span><span>Express.js</span><span>FastAPI</span><span>REST APIs</span><span>MongoDB</span><span>MySQL</span></div></div>
            <div className="skill-category reveal stagger-3"><h3>FRONTEND & CLOUD</h3><div className="skill-items"><span>React</span><span>Next.js</span><span>Tailwind CSS</span><span>Flutter</span><span>Docker</span><span>AWS (SageMaker)</span><span>Vercel</span><span>Git</span></div></div>
            <div className="skill-category reveal stagger-4"><h3>SYSTEMS & PERFORMANCE</h3><div className="skill-items"><span>Memory Allocators</span><span>Hugepages</span><span>SIMD</span><span>Multithreading</span><span>Thread-Local Storage</span></div></div>
            <div className="skill-category reveal stagger-5"><h3>TOOLS & PROFILING</h3><div className="skill-items"><span>GDB</span><span>Perf</span><span>Valgrind</span><span>Google Benchmark</span><span>ASAN</span><span>TSAN</span><span>WebGPU</span><span>WASM</span></div></div>
            <div className="skill-category reveal stagger-6"><h3>DSA & ALGORITHMS</h3><div className="skill-items"><span>Codeforces 1477 (Specialist)</span><span>1000+ Algorithmic Problems</span><span>DP / Graphs / Trees</span></div></div>
          </div>
        </section>

        {/* EXPERIENCE SECTION */}
        <section id="experience" className="experience">
          <div className="section-header">
            <span className="section-badge">INDUSTRY EXPERIENCE</span>
            <h2>Professional Experience</h2>
          </div>
          <div className="experience-cards">
            <div className="experience-card reveal-left stagger-1">
              <h3>Software Engineering Intern (Remote)</h3>
              <p className="role">Sgtyug Technologies Pvt Ltd | May 2026 – June 2026</p>
              <div className="project-details">
                <h4>HomeoSathi Pharmacy ERP</h4>
                <p>
                  Built high-availability backend services for the HomeoSathi pharmacy ERP, implementing a dual-storage caching layer with offline JSON fallbacks to preserve availability during network or MySQL outages, supporting [10,000+] daily active users.
                </p>
                <ul>
                  <li><strong>Dual Storage Architecture:</strong> Implemented dual-storage caching layer with offline JSON fallbacks to preserve availability during network or MySQL outages, supporting [10,000+] daily active users.</li>
                  <li><strong>Transactional Integrity:</strong> Designed transactional database workflows to prevent inventory race conditions during concurrent checkouts and structured automated schema migrations to avoid live production downtime, achieving [99.9%] uptime.</li>
                  <li><strong>Engineered REST Endpoints:</strong> Developed optimized REST endpoints for a real-time revenue dashboard and created a low-overhead invoice-generation rendering engine, reducing generation latency by [40%].</li>
                </ul>
              </div>
              <div className="project-tech" style={{ marginTop: '16px', marginBottom: '0' }}>
                <span>PHP (OOP)</span>
                <span>MySQL</span>
                <span>REST APIs</span>
                <span>Python</span>
                <span>Flutter</span>
                <span>Dart</span>
              </div>
            </div>
          </div>
        </section>

        {/* PROJECTS SECTION */}
        <section id="projects" className="projects">
          <div className="section-header">
            <span className="section-badge">ENGINEERING PROJECTS</span>
            <h2>Featured Projects</h2>
          </div>
          <div className="projects-grid">
            {/* PROJECT 1: SAFEMEM */}
            <div className="project-card reveal stagger-1">
              <div className="project-header">
                <span className="project-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: "var(--accent-primary)"}}><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line><line x1="10" y1="6" x2="10.01" y2="6"></line><line x1="10" y1="18" x2="10.01" y2="18"></line></svg>
                </span>
                <h3>SafeMem – High-Performance Thread-Safe Allocator</h3>
              </div>
              <p>
                Engineered a slab-based allocator achieving 18 CPU cycles (~4.5 ns) average allocation latency and 12.55 GiB/s throughput across 100M allocations, verified with Google Benchmark. Eliminated mutex contention on the hot path through Thread Local Storage, while using 2 MB Hugepages, SIMD-safe alignment, cache-line isolation, ASAN/TSAN, and Python ctypes integration for low-latency workloads.
              </p>
              <div className="project-tech">
                <span>C++</span>
                <span>Hugepages</span>
                <span>SIMD</span>
                <span>Thread-Local Storage</span>
                <span>Google Benchmark</span>
                <span>ctypes</span>
              </div>
              <div className="project-stats">
                <span>18 CPU Cycles (~4.5ns)</span>
                <span>12.55 GiB/s</span>
                <span>100M Allocations</span>
              </div>
              <div className="project-footer" style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                <a href="https://github.com/cpsurfer" target="_blank" rel="noopener noreferrer" className="contact-link" style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span>GitHub Repository</span> →
                </a>
              </div>
            </div>

            {/* PROJECT 2: B2B DISTRIBUTION PLATFORM */}
            <div className="project-card reveal stagger-2">
              <div className="project-header">
                <span className="project-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: "var(--accent-cyan)"}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                </span>
                <h3>B2B Distribution Platform – For Regional Distributors</h3>
              </div>
              <p>
                Built an end-to-end wholesale platform on demands of regional distributors where businesses register with GST/company details and wholesale prices stay hidden until an admin approves the account, using JWT authentication and role-based access. Engineered a zero-fraud Cash-on-Delivery (COD) pipeline using HTML5 Geolocation API, digitized wholesale operations enforcing Minimum Order Quantities (MOQs) saving 15+ hours/week, and integrated a gated payment gateway.
              </p>
              <div className="project-tech">
                <span>Next.js</span>
                <span>React</span>
                <span>MongoDB</span>
                <span>JWT</span>
                <span>HTML5 Geolocation API</span>
                <span>Gated Payments</span>
              </div>
              <div className="project-stats">
                <span>Zero-Fraud COD</span>
                <span>15+ hrs/wk Saved</span>
                <span>Automated MOQs</span>
              </div>
              <div className="project-footer" style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                <a href="https://github.com/cpsurfer" target="_blank" rel="noopener noreferrer" className="contact-link" style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span>GitHub Repository</span> →
                </a>
              </div>
            </div>

            {/* PROJECT 3: MATRIX */}
            <div className="project-card reveal stagger-3">
              <div className="project-header">
                <span className="project-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: "var(--accent-indigo)"}}><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                </span>
                <h3>Matrix – In-Browser AI & Systems Showcase</h3>
              </div>
              <p>
                Architected a dual-mode AI portfolio with a 100% in-browser 4-bit quantized Qwen2.5-0.5B model running locally through WebGPU/WASM inside a dedicated Web Worker, keeping the main UI thread responsive. Built a React terminal interface with a FastAPI smart fallback service using regex normalization and keyword mapping, combining browser-side AI inference with a lightweight backend microservice.
              </p>
              <div className="project-tech">
                <span>React</span>
                <span>WebGPU</span>
                <span>WASM</span>
                <span>FastAPI</span>
                <span>Web Workers</span>
                <span>Transformers.js</span>
              </div>
              <div className="project-stats">
                <span>100% In-Browser</span>
                <span>WebGPU Acceleration</span>
                <span>Sub-50ms TTFT</span>
              </div>
              <div className="project-footer" style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                <a href="https://github.com/cpsurfer/Matrix-folio" target="_blank" rel="noopener noreferrer" className="contact-link" style={{ fontSize: '0.78rem', color: 'var(--accent-indigo)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span>GitHub Repository</span> →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ACHIEVEMENTS SECTION */}
        <section id="achievements" className="achievements">
          <div className="section-header">
            <span className="section-badge">VERIFIED MILESTONES</span>
            <h2>Achievements</h2>
          </div>
          <div className="achievements-grid">
            <div className="achievement-item reveal-left stagger-1"><span className="achievement-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg></span><div><h4>Codeforces Specialist</h4><p>Peak rating 1477; solved 1000+ algorithmic problems.</p></div></div>
            <div className="achievement-item reveal-left stagger-2"><span className="achievement-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg></span><div><h4>Amazon ML Challenge 2026 (Top 100)</h4><p>Built a scalable entity matching pipeline using Python, XGBoost, and AWS SageMaker to process billions of candidate pairs.</p></div></div>
            <div className="achievement-item reveal-left stagger-3"><span className="achievement-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg></span><div><h4>Paranox Hackathon</h4><p>Ranked 52nd out of 1000+ competing teams.</p></div></div>
            <div className="achievement-item reveal-left stagger-4"><span className="achievement-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M12 2v9"></path><path d="M8 5h8"></path></svg></span><div><h4>Smart India Hackathon</h4><p>Reached Top 10 institutional finals at BIT Mesra.</p></div></div>
            <div className="achievement-item reveal-left stagger-5"><span className="achievement-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg></span><div><h4>Technical Team Member – GDG On Campus, BIT</h4><p>Conducted technical workshops on system design and clean architecture for 100+ students (Oct 2025 – Present).</p></div></div>
          </div>
        </section>

        {/* EDUCATION SECTION */}
        <section className="education">
          <div className="section-header">
            <span className="section-badge">ACADEMIC FOUNDATION</span>
            <h2>Education</h2>
          </div>
          <div className="education-cards">
            <div className="education-card reveal-right stagger-1">
              <h3>Birla Institute of Technology, Mesra, Ranchi</h3>
              <p className="role" style={{ color: 'var(--accent-primary)', fontWeight: '600' }}>Aug 2024 – Aug 2028</p>
              <p>B.Tech, Electronics and Communication Engineering | <strong>CGPA: 8.17</strong></p>
            </div>
            <div className="education-card reveal-right stagger-2">
              <h3>12th (ISC)</h3>
              <p className="role">St. Thomas School | 2022-2023</p>
              <p>Percentage: <strong>90%</strong></p>
            </div>
            <div className="education-card reveal-right stagger-3">
              <h3>10th (ICSE)</h3>
              <p className="role">St. Thomas School | 2020-2021</p>
              <p>Percentage: <strong>91.5%</strong></p>
            </div>
          </div>
        </section>

        {/* CONTACT SECTION */}
        <section id="contact" className="contact">
          <div className="section-header">
            <span className="section-badge">GET IN TOUCH</span>
            <h2>Contact & Social</h2>
          </div>
          <div className="contact-links">
            <a href="mailto:firstrahul39@gmail.com" className="contact-link reveal stagger-1"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: "8px", verticalAlign: "middle"}}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>firstrahul39@gmail.com</a>
            <a href="tel:+918299302303" className="contact-link reveal stagger-2"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: "8px", verticalAlign: "middle"}}><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>+91 8299302303</a>
            <a href="https://github.com/cpsurfer" target="_blank" rel="noopener noreferrer" className="contact-link reveal stagger-3"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: "8px", verticalAlign: "middle"}}><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>github.com/cpsurfer</a>
            <a href="https://linkedin.com/in/rahul-sahu-097874306" target="_blank" rel="noopener noreferrer" className="contact-link reveal stagger-4"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: "8px", verticalAlign: "middle"}}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>LinkedIn</a>
            <a href="https://codeforces.com/profile/firstrahul39" target="_blank" rel="noopener noreferrer" className="contact-link reveal stagger-5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: "8px", verticalAlign: "middle"}}><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>Codeforces</a>
            <a href="https://leetcode.com/u/firstrahul39" target="_blank" rel="noopener noreferrer" className="contact-link reveal stagger-6"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: "8px", verticalAlign: "middle"}}><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>LeetCode</a>
          </div>
        </section>
      </main>

      {/* AI ASSISTANT (FLOATING PANEL - VISIBLE PAST HERO) */}
      <div className={`ai-assistant ${showFloatingChat ? 'visible' : ''}`}>
        <div className="ai-header" onClick={toggleChat}>
          <span className="ai-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: "inline-block", verticalAlign: "middle"}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M12 2v9"></path><path d="M8 5h8"></path></svg></span>
          <span>Rahul AI Copilot</span>
          <span className="ai-status">
            ● {useLocalLlm ? (modelReady ? 'ONLINE' : 'DOWNLOADING') : 'FAST PATH'}
          </span>
        </div>
        <div className="ai-floating-toggle-bar">
          <button 
            onClick={(e) => {
              e.stopPropagation(); // Stop from toggling chat collapse
              if (!useLocalLlm) {
                setUseLocalLlm(true);
                initializeWorker();
              } else {
                setUseLocalLlm(false);
              }
            }}
            className="floating-toggle-btn"
          >
            {useLocalLlm ? 'LOCAL AI ACTIVE' : 'ENABLE LOCAL AI (300MB)'}
          </button>
        </div>
        <div className={`ai-body ${showAiResponse ? 'expanded' : ''}`}>
          <form onSubmit={handleAIQuery} className="ai-form">
            <span className="prompt">➜</span>
            <input 
              type="text" 
              value={aiInput} 
              onChange={(e) => setAiInput(e.target.value)} 
              placeholder={modelReady ? "Ask about SafeMem, B2B Platform, Matrix, Codeforces..." : "Downloading model... Ask anyway (fallback ready)"}
              disabled={isLoading && modelReady} 
              className="command-input" 
              style={{ caretColor: '#00ff41', fontWeight: 'bold' }}
            />
            <button type="submit" disabled={isLoading && modelReady}>{isLoading && modelReady ? '...' : 'Send'}</button>
          </form>

          {modelLoading && (
            <div className="ai-loading-smooth">
              <div className="loading-message">
                📥 Loading AI Model in-browser ({getLoadingPercentage()}%)...
              </div>
              <div className="loading-progress">
                <div className="progress-bar" style={{ width: `${getLoadingPercentage()}%` }}></div>
              </div>
              <div className="loading-subtext">
                Runs 100% locally in your browser. First run loads ~300MB.
              </div>
            </div>
          )}

          {(chatHistory.length > 0 || aiResponse || (isLoading && !modelLoading)) && (
            <div className="ai-response" ref={floatingChatContainerRef}>
              {chatHistory.map((msg, index) => (
                <div key={index} className={`chat-message ${msg.role}`}>
                  <span className="msg-role">{msg.role === 'user' ? '➜ Visitor: ' : '🤖 Assistant: '}</span>
                  <span className="msg-content">{msg.content}</span>
                  {msg.metrics && (
                    <div className="msg-telemetry-badge mini">
                      <span className="metric-chip chip-device">⚡ {msg.metrics.device}</span>
                      <span className="metric-chip">⏱️ {msg.metrics.ttftMs}ms TTFT</span>
                      {typeof msg.metrics.tokensPerSec === 'number' && (
                        <span className="metric-chip chip-speed">🚀 {msg.metrics.tokensPerSec} tok/s</span>
                      )}
                      <span className="metric-chip">
                        ⌛ {msg.metrics.totalTimeMs < 1000 ? `${msg.metrics.totalTimeMs}ms` : `${(msg.metrics.totalTimeMs / 1000).toFixed(2)}s`}
                      </span>
                      <span className="metric-chip">📊 {msg.metrics.tokenCount} tok</span>
                    </div>
                  )}
                </div>
              ))}
              {aiResponse && (
                <div className="chat-message assistant">
                  <span className="msg-role">🤖 Assistant: </span>
                  <span className="msg-content">{aiResponse}</span>
                  {liveStreamingMetrics && (
                    <div className="live-stream-badge mini">
                      <span className="pulse-dot"></span>
                      <span>STREAMING: {liveStreamingMetrics.tokenCount} tokens • {liveStreamingMetrics.liveSpeed} tok/s</span>
                    </div>
                  )}
                </div>
              )}
              {isLoading && aiResponse === '' && !modelLoading && (
                <div className="chat-message assistant">
                  <span className="msg-role">🤖 Assistant: </span>
                  <span className="msg-content">{loadingMessage || "thinking..."}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-line">$ SYSTEM_STATUS: ACTIVE // AI_ASSISTANT: READY // PORTFOLIO_V2.5</div>
          <div className="footer-line">© 2025 Rahul Sahu | Engineered for ultra-low latency</div>
        </div>
      </footer>
    </div>
  );
}
