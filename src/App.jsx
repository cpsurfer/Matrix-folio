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

  // In-browser model states
  const [modelLoading, setModelLoading] = useState(false);
  const [modelProgress, setModelProgress] = useState({});
  const [modelReady, setModelReady] = useState(false);
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
      const { type, data, text, error } = event.data;

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
      } else if (type === 'token') {
        streamedResponseRef.current += text;
        setAiResponse(streamedResponseRef.current);
      } else if (type === 'done') {
        setIsLoading(false);
        const finalResponse = streamedResponseRef.current;
        setChatHistory(prev => [...prev, { role: 'assistant', content: finalResponse }]);
        setAiResponse('');
        streamedResponseRef.current = '';
      } else if (type === 'error') {
        setIsLoading(false);
        setModelLoading(false);
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
        setTimeout(() => {
          const answer = getSmartAnswer(query);
          setChatHistory(prev => [...prev, { role: 'assistant', content: answer }]);
          setIsLoading(false);
        }, 1000);
      }
    } else {
      // Light Mode (instant keyword matching, zero network download)
      setLoadingMessage("thinking...");
      setTimeout(() => {
        const answer = getSmartAnswer(query);
        setChatHistory(prev => [...prev, { role: 'assistant', content: answer }]);
        setIsLoading(false);
      }, 500);
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
      return `I am only programmed to answer questions about Rahul Sahu's projects, skills, and professional experience. Let me know if you'd like to hear about SafeMem, NanoTrade, or his competitive programming achievements!`;
    }
    
    const answers = {
      "homoeosathi": `**HOMOEOSATHI (Homoeo-Stocx) // INTERNSHIP EXPERIENCE**

**Company:** Sgtyug Technologies Pvt Ltd
**Timeline:** May 13, 2026 - June 13, 2026
**Role:** Software Engineering Intern

**PROJECT OVERVIEW:**
A premium, comprehensive pharmacy inventory management and billing system pre-configured for Awadhpuri Homoeopathic Medical Store (920, Awadhpuri Phase-2, Ayodhya) under Drug Licenses CMS(YEAR2023)/21 & CMS(YEAR2023)/13.

**KEY FEATURES & IMPLEMENTATIONS:**
• Dual Storage (Online Mode via PHP REST API & Offline Mode fallback using JSON persistence in Flutter)
• Smart Dashboard displaying Revenue, Bills count, Low Stock, Near Expiry, and Expired Stock Alerts
• Advanced Billing System with MySQL transactions and automatic rollback on failure to prevent data corruption
• A4/Thermal printing template (print_bill.php) with multi-row auto-formatting
• CRUD inventory tracking (Syrup, Dilution, Globules, Mother Tincture, Trituration, etc.)

**TECH STACK:**
Flutter (Dart), PHP (OOP, REST API), MySQL, Python`,

      "sgtyug": `**SGTYUG TECHNOLOGIES INTERNSHIP**

**Timeline:** May 13, 2026 - June 13, 2026
**Role:** Software Engineering Intern
**Core Project:** HomoeoSathi (Homoeo-Stocx)

Key Achievements:
• Designed dual-storage offline fallback mode in Flutter
• Built secure PHP REST API with transactional rollback database checks
• Configured dashboard visual reporting for store metrics`,

      "internship": `**INTERNSHIP: Sgtyug Technologies Pvt Ltd**

**Timeline:** May 13, 2026 - June 13, 2026
**Role:** Software Engineering Intern
**Project:** HomoeoSathi (Homoeo-Stocx) — a dual-mode pharmacy billing and inventory app pre-configured for Awadhpuri Homoeopathic Medical Store.
🔧 **Tech Stack:** Flutter, Dart, PHP (OOP), MySQL, Python`,

      "safemem": `**SAFE-MEM ALLOCATOR**

METRICS:
• 4.5ns average latency
• 27x faster than glibc malloc
• 12.55 GiB/s throughput
• Zero memory loss

FEATURES:
• Slab allocation
• Thread-local storage (lock-free)
• 2MB hugepages
• 64-byte alignment
• SIMD optimization
• Python ctypes bindings

USE CASES: HFT engines, game servers, real-time systems`,
      
      "nanotrade": `**NANOTRADE HFT ENGINE**

PERFORMANCE: 17.5µs tick-to-trade latency (12x faster!)

TECHNIQUES:
• Busy-spinning UDP (no context switches)
• CPU pinning (cache always hot)
• Zero-copy integer parsing
• Branch prediction hints
• 64-byte cache line alignment

Production-grade HFT engineering!`,
      
      "ai assistant": `**PERSONAL AI ASSISTANT (RAG-Based)**

📅 Timeline: Sep 2025 - Dec 2025

WHAT IT DOES:
RAG-based AI using Gemini 1.5 Pro for document Q&A

FEATURES:
• Vector embeddings for semantic search
• Multi-format files (PDF, TXT, DOCX)
• Privacy-focused (no external data sharing)
• Streamlit web interface
• Automated CI/CD pipeline

🔧 TECH STACK:
Python, Google Gemini API, LangChain, Streamlit, ChromaDB

USE CASE: Resume Q&A, document search, knowledge base`,
      
      "chatterbox": `**CHATTER-BOX: Language Learning Platform**

📅 Timeline: Aug 2025 - Dec 2025
Active Users: 50+ (Alpha Release)

WHAT IT DOES:
Real-time language learning platform connecting native speakers

FEATURES:
• WebRTC P2P voice/video calls
• Socket.io instant messaging
• JWT authentication
• Custom matching algorithm
• Automated CI/CD pipeline
• Docker containerization

🔧 TECH STACK:
MERN (MongoDB, Express, React, Node.js), WebRTC, Socket.io, Docker, Render

IMPACT: Successfully bridging language gaps with real-time communication`,

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

**BTech - Electronics & Communication Engineering**
BIT Mesra, Ranchi | 2024 - 2028
CGPA: 8.17 | Roll No: BTECH/10679/24

**12th (ISC)** - St. Thomas School | 2022-2023
Percentage: 90%

**10th (ICSE)** - St. Thomas School | 2020-2021
Percentage: 91.5%`,

      "gdg": `**GDG ON CAMPUS BIT MESRA**

ROLE: Technical Community Member (Oct 2025 - Present)

ACHIEVEMENTS:
• Led workshops on DSA & System Design
• 40+ students participated
• Mentored 10 juniors in competitive programming
• Presented "Building SafeMem - A 4.5ns Allocator"

IMPACT: Created thriving developer ecosystem`,

      "nss": `**NATIONAL SERVICE SCHEME (NSS)**

ROLE: NSS Volunteer (Aug 2024 - Present)

RESPONSIBILITIES:
• Orchestrated resource allocation for community campaigns
• Managed cross-functional coordination
• Resolved critical bottlenecks under tight timelines
• Ensured zero operational downtime

SKILLS: Operations Management, Logistics, Incident Management`,

      "codeforces": `**CODEFORCES PROFILE**

Handle: firstrahul39
Max Rating: 1477 (Specialist)
Problems Solved: 1000+
Global Percentile: Top 20%
Contests: 20+ participated

PROGRESSION:
2025: 900 (Newbie) → 1200 (Pupil)
2026: 1200 → 1477 (Specialist)

MASTERED: DP, Graph Theory, Segment Trees, String Algorithms`,

      "contact": `**CONTACT INFORMATION**

Email: firstrahul39@gmail.com
Phone: +91 8299302303
GitHub: github.com/cpsurfer
LinkedIn: linkedin.com/in/rahul-sahu-097874306/
Codeforces: codeforces.com/profile/firstrahul39

Location: BIT Mesra, Ranchi, Jharkhand
Roll No: BTECH/10679/24`,

      "skills": `**COMPLETE TECHNICAL SKILLS**

⭐⭐⭐ EXPERT (Production Ready):
• C++, Memory Management, Lock-Free Concurrency
• SIMD, Linux Kernel Optimization
• 2MB Hugepages, CPU Pinning

⭐⭐ INTERMEDIATE (Active Projects):
• Python, FastAPI, MERN Stack
• WebRTC, Socket.io, Docker
• RAG, Vector Databases, Gemini API

HARDWARE:
• FPGA (Verilog/VHDL)
• Microcontrollers (8051/ARM)
• RTOS, I2C/SPI/UART Protocols

DSA:
• Codeforces 1477 (Specialist)
• 1000+ problems solved`
    };
    
    for (const [key, answer] of Object.entries(answers)) {
      if (q.includes(key)) {
        return `**Assistant:**\n\n${answer}\n\n---\nAsk me anything else about Rahul's projects, skills, or experience!`;
      }
    }
    
    if (q.includes("chatter") || q.includes("language")) {
      return `**Assistant:**\n\n${answers["chatterbox"]}\n\n---\nAsk me about other projects like SafeMem or NanoTrade!`;
    }
    
    if (q.includes("ai") && (q.includes("assistant") || q.includes("personal"))) {
      return `**Assistant:**\n\n${answers["ai assistant"]}\n\n---\nI can also tell you about SafeMem, NanoTrade, and Chatter-Box!`;
    }

    if (q.includes("homoeo") || q.includes("sathi") || q.includes("stocx") || q.includes("sgtyug") || q.includes("internship")) {
      return `**Assistant:**\n\n${answers["homoeosathi"]}\n\n---\nI can also tell you about my C++ systems projects like SafeMem and NanoTrade!`;
    }
    
    if (q.includes("12th") || q.includes("10th") || q.includes("btech") || q.includes("college")) {
      return `**Assistant:**\n\n${answers["education"]}\n\n---\nWant to know about my projects or skills instead?`;
    }
    
    return `**Assistant:** I can answer questions about:

PROJECTS & EXPERIENCE:**
• "Tell me about my Internship" at Sgtyug Technologies
• "What is HomoeoSathi?" - Pharmacy billing system
• "What is SafeMem?" - 4.5ns memory allocator
• "Tell me about NanoTrade" - 17.5µs HFT engine
• "Personal AI Assistant" - RAG with Gemini
• "Chatter-Box" - 50+ user language platform

SKILLS:
• "C++ skills" / "Python skills" / "MERN stack"
• "Lock-free programming" / "Docker" / "FPGA"
• "Memory management" / "RTOS" / "Microcontrollers"

EDUCATION:
• "Education background" / "BTech" / "10th percentage"

LEADERSHIP:
• "GDG experience" / "NSS volunteer"

ACHIEVEMENTS:
• "Codeforces rating" / "Competitive programming"

CONTACT:
• "Contact information" / "Email" / "GitHub"

TECH CONCEPTS:
• "Why hugepages?" / "Why C++?" / "Lock-free explained"

**Try asking:** "Tell me about my Internship" or "What is HomoeoSathi?" or "Why hugepages?"`;
  };

  return (
    <div className="portfolio animate-fade-in">
      <div className="matrix-bg"></div>
      
      <header className="terminal-header">
        <div className="header-content">
          <div className="title">
            <span className="blink">$</span> RAHUL_SAHU@portfolio:~$
          </div>
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
            <a href="#home" onClick={() => setIsMenuOpen(false)}>[HOME]</a>
            <a href="#about" onClick={() => setIsMenuOpen(false)}>[ABOUT]</a>
            <a href="#experience" onClick={() => setIsMenuOpen(false)}>[EXPERIENCE]</a>
            <a href="#projects" onClick={() => setIsMenuOpen(false)}>[PROJECTS]</a>
            <a href="#achievements" onClick={() => setIsMenuOpen(false)}>[ACHIEVEMENTS]</a>
            <a href="#contact" onClick={() => setIsMenuOpen(false)}>[CONTACT]</a>
          </nav>
        </div>
      </header>

      <main>
        {/* HERO SECTION */}
        <section id="home" className="hero">
          <div className="hero-grid">
            <div className="hero-left terminal-window reveal-left">
              <div className="terminal-line">// SYSTEMS & ALGORITHMIC PROGRAMMER</div>
              <h1 className="hero-title">Rahul Sahu</h1>
              <h2 className="hero-subtitle">Building Low-Latency Infrastructure</h2>
              <p className="hero-desc">
                Electronics & Communication Engineering student at <span className="highlight">BIT Mesra</span> specializing in 
                systems programming, high-frequency trading engines, and memory allocators. Working at the intersection 
                of hardware and software to push latency boundaries to absolute minimums.
              </p>
              
              <div className="hero-metrics">
                <div className="hero-metric-card reveal-scale">
                  <span className="metric-val">4.5ns</span>
                  <span className="metric-lbl">SafeMem Latency</span>
                </div>
                <div className="hero-metric-card reveal-scale">
                  <span className="metric-val">17.5µs</span>
                  <span className="metric-lbl">NanoTrade Latency</span>
                </div>
                <div className="hero-metric-card reveal-scale">
                  <span className="metric-val">1477</span>
                  <span className="metric-lbl">Codeforces Rating</span>
                </div>
              </div>
            </div>
            
            <div className="hero-right reveal-right">
              {/* EMBEDDED AI CONSOLE */}
              <div className="hero-ai-console">
                <div className="console-header">
                  <div className="console-title">
                    <span className={`pulse-indicator ${useLocalLlm ? (modelReady ? 'online' : 'loading') : 'offline'}`}></span>
                    assistant_core_v2.exe
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
                    {useLocalLlm ? 'LOCAL AI ACTIVE' : 'ACTIVATE LOCAL AI (300MB)'}
                  </button>
                </div>
                
                <div className="console-screen">
                  <div className="console-sys-log">
                    <span className="log-line system">[SYSTEM INITIALIZED OK]</span>
                    <span className="log-line">Local 0.5B Parameter model loaded via WebGPU/WASM.</span>
                  </div>

                  <div className="console-chat-history" ref={heroChatContainerRef}>
                    {chatHistory.map((msg, index) => (
                      <div key={index} className={`console-msg ${msg.role}`}>
                        <span className="msg-prefix">{msg.role === 'user' ? 'guest@visitor:~$ ' : 'assistant@rahul_ai:~$ '}</span>
                        <div className="msg-txt">{msg.content}</div>
                      </div>
                    ))}
                    {aiResponse && (
                      <div className="console-msg assistant">
                        <span className="msg-prefix">assistant@rahul_ai:~$ </span>
                        <div className="msg-txt">{aiResponse}</div>
                      </div>
                    )}
                    {isLoading && aiResponse === '' && !modelLoading && (
                      <div className="console-msg assistant thinking">
                        <span className="msg-prefix">assistant@rahul_ai:~$ </span>
                        <div className="msg-txt">{loadingMessage || "thinking..."}</div>
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
                    <span className="input-prompt">&gt;</span>
                    <input 
                      type="text" 
                      value={aiInput} 
                      onChange={(e) => setAiInput(e.target.value)} 
                      placeholder={modelReady ? "Ask about SafeMem, NanoTrade, C++, Codeforces..." : "Ask anyway (fallback ready)..."}
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
            <span className="section-badge">// TECHNICAL_IDENTITY</span>
            <h2>Engineering Intelligent Systems at the Hardware Level</h2>
          </div>
          <div className="about-grid">
            <div className="about-card reveal-left"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="about-icon" style={{color: "var(--accent-color)", marginBottom: "16px", display: "inline-block"}}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg><h3>Scale First</h3><p>Building for production from day one with 4.5ns allocation latency and zero memory loss.</p></div>
            <div className="about-card reveal-left"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="about-icon" style={{color: "var(--accent-color)", marginBottom: "16px", display: "inline-block"}}><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="15" x2="23" y2="15"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="15" x2="4" y2="15"></line></svg><h3>Low-Level Mastery</h3><p>C/C++, Memory Management, Lock-Free Concurrency, SIMD, and Linux Kernel optimization.</p></div>
            <div className="about-card reveal-left"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="about-icon" style={{color: "var(--accent-color)", marginBottom: "16px", display: "inline-block"}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M12 2v9"></path><path d="M8 5h8"></path></svg><h3>AI Integration</h3><p>RAG-based systems with Gemini 1.5 Pro and vector embeddings for intelligent assistants.</p></div>
          </div>
          <div className="terminal-quote">
            <span className="prompt">&gt;&gt;&gt;</span> "My mission is to build software that operates at the absolute limits of hardware — where every nanosecond matters and every byte is accounted for."
          </div>
        </section>

        {/* SKILLS SECTION */}
        <section className="skills">
          <div className="section-header">
            <span className="section-badge">// SYSTEM_CAPABILITIES</span>
            <h2>Technical Stack</h2>
          </div>
          <div className="skills-grid">
            <div className="skill-category reveal"><h3>SYSTEMS</h3><div className="skill-items"><span>C</span><span>C++</span><span>Memory Management</span><span>Lock-Free Concurrency</span><span>SIMD</span><span>Linux Kernel</span><span>GDB/Perf</span></div></div>
            <div className="skill-category reveal"><h3>WEB</h3><div className="skill-items"><span>MERN Stack</span><span>FastAPI</span><span>WebRTC</span><span>Socket.io</span><span>Tailwind CSS</span><span>REST APIs</span></div></div>
            <div className="skill-category reveal"><h3>AI/ML</h3><div className="skill-items"><span>RAG</span><span>Vector Databases</span><span>Gemini API</span><span>LangChain</span><span>Streamlit</span></div></div>
            <div className="skill-category reveal"><h3>HARDWARE</h3><div className="skill-items"><span>FPGA/Verilog</span><span>Microcontrollers</span><span>RTOS</span><span>I2C/SPI/UART</span><span>VLSI Design</span></div></div>
            <div className="skill-category reveal"><h3>DEVOPS</h3><div className="skill-items"><span>Docker</span><span>Git/GitHub</span><span>CI/CD</span><span>Linux CLI</span></div></div>
            <div className="skill-category reveal"><h3>DSA</h3><div className="skill-items"><span>1000+ Problems</span><span>Codeforces 1477</span><span>DP/Graphs/Trees</span></div></div>
          </div>
        </section>

        {/* EXPERIENCE SECTION */}
        <section id="experience" className="experience">
          <div className="section-header">
            <span className="section-badge">// INDUSTRY_EXPERIENCE</span>
            <h2>Professional Experience</h2>
          </div>
          <div className="experience-cards">
            <div className="experience-card reveal-left">
              <h3>Software Engineering Intern</h3>
              <p className="role">Sgtyug Technologies Pvt Ltd | May 13, 2026 - June 13, 2026</p>
              <div className="project-details">
                <h4>HomoeoSathi (Homoeo-Stocx)</h4>
                <p>
                  Built a premium, comprehensive pharmacy inventory management and billing system pre-configured for Awadhpuri Homoeopathic Medical Store (920, Awadhpuri Phase-2, Ayodhya), complying with Drug Licenses CMS(YEAR2023)/21 & CMS(YEAR2023)/13.
                </p>
                <ul>
                  <li><strong>Dual Storage Architecture:</strong> Designed automatic offline fallback to local JSON database (`products.json`, `bills.json`, `users.json`) with data persistence when connection to the live MySQL API is lost.</li>
                  <li><strong>Metrics Dashboard:</strong> Integrated dynamic calculation of revenue, total bills, low stock alerts, near-expiry warnings, and expired stock notifications.</li>
                  <li><strong>Advanced Billing & Security:</strong> Implemented checkout transaction rollbacks to prevent stock discrepancies, automated ALTER TABLE migrations, and CORS compatibility.</li>
                  <li><strong>Print template:</strong> Structured thermal/A4-friendly invoice template supporting dynamic rendering with drug license credentials.</li>
                </ul>
              </div>
              <div className="project-tech" style={{ marginTop: '16px', marginBottom: '0' }}>
                <span>Flutter</span>
                <span>Dart</span>
                <span>PHP (OOP)</span>
                <span>MySQL</span>
                <span>REST API</span>
                <span>Python</span>
              </div>
            </div>
          </div>
        </section>

        {/* PROJECTS SECTION */}
        <section id="projects" className="projects">
          <div className="section-header">
            <span className="section-badge">// DEPLOYED_SYSTEMS</span>
            <h2>Flagship Projects</h2>
          </div>
          <div className="projects-grid">
            <div className="project-card reveal"><div className="project-header"><span className="project-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: "var(--accent-color)"}}><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line><line x1="10" y1="6" x2="10.01" y2="6"></line><line x1="10" y1="18" x2="10.01" y2="18"></line></svg></span><h3>[01] SAFE-MEM ALLOCATOR</h3></div><p>Ultra-low-latency slab-based memory allocator achieving 4.5ns average latency, 27x faster than glibc malloc with 12.55 GiB/s throughput.</p><div className="project-tech"><span>C++</span><span>SIMD</span><span>Hugepages</span><span>Lock-Free</span></div><div className="project-stats"><span>4.5ns</span><span>27x faster</span><span>0% loss</span></div></div>
            <div className="project-card reveal"><div className="project-header"><span className="project-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: "var(--accent-color)"}}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg></span><h3>[02] NANOTRADE HFT ENGINE</h3></div><p>High-frequency trading engine with 17.5µs deterministic tick-to-trade latency, achieving 12x latency reduction through hardware-level optimizations.</p><div className="project-tech"><span>C++</span><span>UDP</span><span>CPU Pinning</span><span>Zero-Copy</span></div><div className="project-stats"><span>17.5µs</span><span>12x faster</span><span>Deterministic</span></div></div>
            <div className="project-card reveal"><div className="project-header"><span className="project-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: "var(--accent-color)"}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></span><h3>[03] PERSONAL AI ASSISTANT</h3></div><p>RAG-based generative AI system using Gemini 1.5 Pro with vector embeddings and semantic search for privacy-focused document Q&A.</p><div className="project-tech"><span>Python</span><span>Gemini API</span><span>RAG</span><span>Streamlit</span></div><div className="project-stats"><span>RAG</span><span>Multi-format</span><span>Privacy-first</span></div></div>
            <div className="project-card reveal"><div className="project-header"><span className="project-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: "var(--accent-color)"}}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></span><h3>[04] CHATTER-BOX</h3></div><p>Real-time language learning platform with 50+ active users, featuring WebRTC P2P calls and Socket.io instant messaging.</p><div className="project-tech"><span>MERN</span><span>WebRTC</span><span>Socket.io</span><span>Docker</span></div><div className="project-stats"><span>50+ users</span><span>P2P calls</span><span>Real-time</span></div></div>
          </div>
        </section>

        {/* ACHIEVEMENTS SECTION */}
        <section id="achievements" className="achievements">
          <div className="section-header">
            <span className="section-badge">// RECOGNITION_LOGS</span>
            <h2>Verified Milestones</h2>
          </div>
          <div className="achievements-grid">
            <div className="achievement-item reveal-left"><span className="achievement-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: "var(--accent-color)"}}><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg></span><div><h4>Codeforces Specialist</h4><p>Max Rating: 1477 | Solved 1000+ problems</p></div></div>
            <div className="achievement-item reveal-left"><span className="achievement-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: "var(--accent-color)"}}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg></span><div><h4>SafeMem Allocator</h4><p>4.5ns latency, 27x faster than malloc</p></div></div>
            <div className="achievement-item reveal-left"><span className="achievement-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: "var(--accent-color)"}}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg></span><div><h4>NanoTrade HFT</h4><p>17.5µs tick-to-trade, 12x faster</p></div></div>
            <div className="achievement-item reveal-left"><span className="achievement-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: "var(--accent-color)"}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M12 2v9"></path><path d="M8 5h8"></path></svg></span><div><h4>RAG AI Assistant</h4><p>Gemini 1.5 Pro document Q&A</p></div></div>
            <div className="achievement-item reveal-left"><span className="achievement-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: "var(--accent-color)"}}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg></span><div><h4>Academic Excellence</h4><p>10th:91.5% | 12th:90% | BTech:81%</p></div></div>
            <div className="achievement-item reveal-left"><span className="achievement-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: "var(--accent-color)"}}><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg></span><div><h4>GDG Technical Member</h4><p>Workshops for 40+ students</p></div></div>
            <div className="achievement-item reveal-left"><span className="achievement-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: "var(--accent-color)"}}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></span><div><h4>NSS Volunteer</h4><p>Community campaigns, zero downtime</p></div></div>
          </div>
        </section>

        {/* LEADERSHIP SECTION */}
        <section className="leadership">
          <div className="section-header">
            <span className="section-badge">// OPERATIONAL_LOGS</span>
            <h2>Positions of Responsibility</h2>
          </div>
          <div className="leadership-cards">
            <div className="leadership-card reveal-right"><h3>GDG on Campus, BIT Mesra</h3><p className="role">Technical Community Member | Oct 2025 - Present</p><ul><li>Co-led technical workshops for 40+ students</li><li>Conducted live debugging labs</li><li>Presented "Building SafeMem" case study</li></ul></div>
            <div className="leadership-card reveal-right"><h3>National Service Scheme (NSS), BIT Mesra</h3><p className="role">NSS Volunteer | Aug 2024 - Present</p><ul><li>Orchestrated resource allocation for campaigns</li><li>Managed cross-functional coordination</li><li>Ensured zero operational downtime</li></ul></div>
          </div>
        </section>

        {/* EDUCATION SECTION */}
        <section className="education">
          <div className="section-header">
            <span className="section-badge">// ACADEMIC_FOUNDATION</span>
            <h2>Education</h2>
          </div>
          <div className="education-cards">
            <div className="education-card reveal-right"><h3>BTech Electronics & Communication Engineering</h3><p>BIT Mesra, Ranchi | 2024 - 2028 | CGPA: 8.17</p></div>
            <div className="education-card reveal-right"><h3>12th (ISC)</h3><p>St. Thomas School | 2022-2023 | 90%</p></div>
            <div className="education-card reveal-right"><h3>10th (ICSE)</h3><p>St. Thomas School | 2020-2021 | 91.5%</p></div>
          </div>
        </section>

        {/* CONTACT SECTION */}
        <section id="contact" className="contact">
          <div className="section-header">
            <span className="section-badge">// CONNECTION_NODES</span>
            <h2>Contact & Social</h2>
          </div>
          <div className="contact-links">
            <a href="mailto:firstrahul39@gmail.com" className="contact-link reveal"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: "8px", verticalAlign: "middle"}}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>firstrahul39@gmail.com</a>
            <a href="tel:+918299302303" className="contact-link reveal"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: "8px", verticalAlign: "middle"}}><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>+91 8299302303</a>
            <a href="https://github.com/cpsurfer" target="_blank" className="contact-link reveal"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: "8px", verticalAlign: "middle"}}><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>github.com/cpsurfer</a>
            <a href="https://linkedin.com/in/rahul-sahu-097874306" target="_blank" className="contact-link reveal"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: "8px", verticalAlign: "middle"}}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>LinkedIn</a>
            <a href="https://codeforces.com/profile/firstrahul39" target="_blank" className="contact-link reveal"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: "8px", verticalAlign: "middle"}}><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>Codeforces</a>
          </div>
        </section>
      </main>

      {/* AI ASSISTANT (FLOATING PANEL - VISIBLE PAST HERO) */}
      <div className={`ai-assistant ${showFloatingChat ? 'visible' : ''}`}>
        <div className="ai-header" onClick={toggleChat}>
          <span className="ai-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: "inline-block", verticalAlign: "middle"}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M12 2v9"></path><path d="M8 5h8"></path></svg></span>
          <span>RAHUL'S ASSISTANT</span>
          <span className="ai-status">
            ● {useLocalLlm ? (modelReady ? 'ONLINE' : 'DOWNLOADING') : 'LIGHT MODE'}
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
              placeholder={modelReady ? "Ask about SafeMem, NanoTrade, C++, Codeforces..." : "Downloading model... Ask anyway (fallback ready)"}
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
                </div>
              ))}
              {aiResponse && (
                <div className="chat-message assistant">
                  <span className="msg-role">🤖 Assistant: </span>
                  <span className="msg-content">{aiResponse}</span>
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
