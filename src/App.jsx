import React, { useState, useEffect, useRef } from 'react';
import './App.css';

export default function App() {
  const [aiInput, setAiInput] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAiResponse, setShowAiResponse] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const responseEndRef = useRef(null);

  // Add this inside your App component, after useState declarations
useEffect(() => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  // Select all elements to reveal
  const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
  revealElements.forEach(el => observer.observe(el));

  return () => observer.disconnect();
}, []);

  useEffect(() => {
    if (responseEndRef.current) {
      responseEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiResponse, isLoading]);

  const handleAIQuery = async (e) => {
    e.preventDefault();
    if (!aiInput.trim() || isLoading) return;

    const query = aiInput;
    setAiInput('');
    setIsLoading(true);
    setShowAiResponse(true);
    setAiResponse('');
    
    // Show different loading messages
    const messages = [
      "🔍 Searching knowledge base...",
      "📡 Connecting to RAG database...",
      "🧠 Processing your question...",
      "📚 Fetching relevant information...",
      "⚡ Generating response..."
    ];
    let msgIndex = 0;
    setLoadingMessage(messages[msgIndex]);
    
    const interval = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length;
      setLoadingMessage(messages[msgIndex]);
    }, 800);

    try {
      const response = await fetch('http://localhost:5001/api/rag-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: query }),
      });
      
      if (response.ok) {
        const data = await response.json();
        clearInterval(interval);
        setAiResponse(data.reply);
      } else {
        throw new Error('Backend not available');
      }
    } catch (error) {
      clearInterval(interval);
      const answer = getSmartAnswer(query);
      setAiResponse(answer);
    } finally {
      setIsLoading(false);
    }
  };

  const getSmartAnswer = (query) => {
    const q = query.toLowerCase();
    
    const answers = {
      // ===== PROJECTS =====
      "safemem": `🚀 **SAFE-MEM ALLOCATOR**

📊 METRICS:
• 4.5ns average latency
• 27x faster than glibc malloc
• 12.55 GiB/s throughput
• Zero memory loss

🏗️ FEATURES:
• Slab allocation
• Thread-local storage (lock-free)
• 2MB hugepages
• 64-byte alignment
• SIMD optimization
• Python ctypes bindings

🎯 USE CASES: HFT engines, game servers, real-time systems`,
      
      "nanotrade": `⚡ **NANOTRADE HFT ENGINE**

📊 PERFORMANCE: 17.5µs tick-to-trade latency (12x faster!)

🔧 TECHNIQUES:
• Busy-spinning UDP (no context switches)
• CPU pinning (cache always hot)
• Zero-copy integer parsing
• Branch prediction hints
• 64-byte cache line alignment

🎯 Production-grade HFT engineering!`,
      
      "ai assistant": `🤖 **PERSONAL AI ASSISTANT (RAG-Based)**

📅 Timeline: Sep 2025 - Dec 2025

🎯 WHAT IT DOES:
RAG-based AI using Gemini 1.5 Pro for document Q&A

✨ FEATURES:
• Vector embeddings for semantic search
• Multi-format files (PDF, TXT, DOCX)
• Privacy-focused (no external data sharing)
• Streamlit web interface
• Automated CI/CD pipeline

🔧 TECH STACK:
Python, Google Gemini API, LangChain, Streamlit, ChromaDB

🎯 USE CASE: Resume Q&A, document search, knowledge base`,
      
      "chatterbox": `💬 **CHATTER-BOX: Language Learning Platform**

📅 Timeline: Aug 2025 - Dec 2025
👥 Active Users: 50+ (Alpha Release)

🎯 WHAT IT DOES:
Real-time language learning platform connecting native speakers

✨ FEATURES:
• WebRTC P2P voice/video calls
• Socket.io instant messaging
• JWT authentication
• Custom matching algorithm
• Automated CI/CD pipeline
• Docker containerization

🔧 TECH STACK:
MERN (MongoDB, Express, React, Node.js), WebRTC, Socket.io, Docker, Render

🎯 IMPACT: Successfully bridging language gaps with real-time communication`,

      // ===== SKILLS =====
      "cpp": `💪 **C++ Skills (Expert Level)**

✅ Zero-cost abstractions
✅ Manual memory control (placement new, custom allocators)
✅ Low-level access (inline assembly, memory barriers)
✅ Deterministic performance (no GC pauses)
✅ Lock-free concurrency with TLS

🎯 Applied in: SafeMem (4.5ns), NanoTrade (17.5µs)`,
      
      "python": `🐍 **Python Skills (Intermediate-Expert)**

✅ FastAPI - High-performance REST APIs
✅ Streamlit - Rapid AI/ML interfaces
✅ Pandas/NumPy - Data analysis
✅ Scikit-learn - Machine Learning
✅ Gemini API - Generative AI, RAG systems
✅ ctypes - C++ bindings for SafeMem

🎯 Applied in: AI Assistant, Data Analysis, Backend APIs`,
      
      "mern": `🌐 **MERN Stack Skills**

✅ MongoDB - Database design, indexing, aggregation
✅ Express.js - REST APIs, middleware
✅ React.js - Hooks, context, components
✅ Node.js - Event-driven architecture

🎯 Applied in: Chatter-Box (50+ users, real-time P2P)`,
      
      "docker": `🐳 **Docker Skills**

✅ Containerization with Dockerfile
✅ Multi-container with docker-compose
✅ CI/CD integration
✅ Deployment on Render

🎯 Applied in: Chatter-Box deployment`,
      
      "fpga": `⚙️ **FPGA/Verilog/VHDL Skills**

✅ RTL coding (Verilog, VHDL)
✅ Digital logic design
✅ Timing analysis and constraints
✅ Simulation and testbenches

🎯 From: ECE curriculum at BIT Mesra`,
      
      "microcontroller": `🔧 **Microcontroller Skills (8051/ARM)**

✅ Embedded C programming
✅ GPIO, Timers, ADC, PWM, Interrupts
✅ Communication protocols (I2C, SPI, UART)
✅ Debugging with JTAG/SWD

🎯 From: Embedded systems coursework`,
      
      "rtos": `⏱️ **RTOS Skills**

✅ Task scheduling and prioritization
✅ IPC (queues, semaphores, mutexes)
✅ Interrupt handling
✅ Memory management

🎯 From: Embedded systems projects`,
      
      "lock free": `🔄 **Lock-Free Programming (Expert)**

✅ Thread-Local Storage (TLS) - no mutex contention
✅ 4.5ns allocations vs 120ns with locks
✅ SPSC queues - 50ns cross-thread messaging
✅ Cache line padding - prevents false sharing

🎯 Applied in: SafeMem allocator`,
      
      "memory management": `🧠 **Memory Management (Expert)**

✅ Custom slab allocators
✅ 2MB Linux Hugepages (99.8% TLB miss reduction)
✅ 64-byte alignment (false sharing prevention)
✅ Lock-free TLS fast path

🎯 Applied in: SafeMem - 4.5ns, 27x faster than malloc`,

      // ===== TECHNICAL CONCEPTS =====
      "hugepages": `🔧 **WHY HUGEPAGES IN SAFEMEM?**

📊 THE PROBLEM:
Linux uses 4KB pages. TLB holds ~64 entries. 
With 100M allocations → constant TLB misses → 100-200 cycle penalty each.

✅ THE SOLUTION:
2MB Hugepages = 512x memory per TLB entry!

🚀 THE RESULT:
• 99.8% reduction in TLB misses
• No page-walk latency
• 4.5ns allocation latency

💻 IMPLEMENTATION: mmap(..., MAP_HUGETLB)`,

      // ===== EDUCATION =====
      "education": `🎓 **EDUCATION**

**BTech - Electronics & Communication Engineering**
BIT Mesra, Ranchi | 2024 - 2028
Cgpa : 8.17 | Roll No: BTECH/10679/24

**12th (ISC)** - St. Thomas School | 2022-2023
Percentage: 90%

**10th (ICSE)** - St. Thomas School | 2020-2021
Percentage: 91.5%`,

      // ===== LEADERSHIP =====
      "gdg": `👥 **GDG ON CAMPUS BIT MESRA**

ROLE: Technical Community Member (Oct 2025 - Present)

📚 ACHIEVEMENTS:
• Led workshops on DSA & System Design
• 40+ students participated in the organized workshops
• Mentored 10 juniors in competitive programming
• Presented "Building SafeMem - A 4.5ns Allocator"

🎯 IMPACT: Created thriving developer ecosystem`,

      "nss": `💚 **NATIONAL SERVICE SCHEME (NSS)**

ROLE: NSS Volunteer (Aug 2024 - Present)

📊 RESPONSIBILITIES:
• Orchestrated resource allocation for community campaigns
• Managed cross-functional coordination
• Resolved critical bottlenecks under tight timelines
• Ensured zero operational downtime

🎯 SKILLS: Operations Management, Logistics, Incident Management`,

      // ===== ACHIEVEMENTS =====
      "codeforces": `🏆 **CODEFORCES PROFILE**

Handle: firstrahul39
Max Rating: 1459 (Specialist)
Problems Solved: 1000+
Global Percentile: Top 20%
Contests: 20+ participated accross various platforms

📈 PROGRESSION:
2025: 900 (Newbie) → 1200 (Pupil)
2026: 1200 → 1459 (Specialist)

💪 MASTERED: DP, Graph Theory, Segment Trees, String Algorithms`,

      // ===== CONTACT =====
      "contact": `📫 **CONTACT INFORMATION**

📧 Email: firstrahul39@gmail.com
📱 Phone: +91 8299302303
💻 GitHub: github.com/cpsurfer
🔗 LinkedIn: linkedin.com/in/rahul-sahu-097874306/
🏆 Codeforces: codeforces.com/profile/firstrahul39

📍 Location: BIT Mesra, Ranchi, Jharkhand
🎓 Roll No: BTECH/10679/24`,

      // ===== SKILLS SUMMARY =====
      "skills": `💻 **COMPLETE TECHNICAL SKILLS**

⭐⭐⭐ EXPERT (Production Ready):
• C++, Memory Management, Lock-Free Concurrency
• SIMD, Linux Kernel Optimization
• 2MB Hugepages, CPU Pinning

⭐⭐ INTERMEDIATE (Active Projects):
• Python, FastAPI, MERN Stack
• WebRTC, Socket.io, Docker
• RAG, Vector Databases, Gemini API

🔧 HARDWARE:
• FPGA (Verilog/VHDL)
• Microcontrollers (8051/ARM)
• RTOS, I2C/SPI/UART Protocols

📊 DSA:
• Codeforces 1459 (Specialist)
• 1000+ problems solved`
    };
    
    // Check for exact matches first
    for (const [key, answer] of Object.entries(answers)) {
      if (q.includes(key)) {
        return `🤖 **Assistant:**\n\n${answer}\n\n---\n💡 Ask me anything else about Rahul's projects, skills, or experience!`;
      }
    }
    
    // Check for partial matches
    if (q.includes("chatter") || q.includes("language")) {
      return `🤖 **Assistant:**\n\n${answers["chatterbox"]}\n\n---\n💡 Ask me about other projects like SafeMem or NanoTrade!`;
    }
    
    if (q.includes("ai") && (q.includes("assistant") || q.includes("personal"))) {
      return `🤖 **Assistant:**\n\n${answers["ai assistant"]}\n\n---\n💡 I can also tell you about SafeMem, NanoTrade, and Chatter-Box!`;
    }
    
    if (q.includes("12th") || q.includes("10th") || q.includes("btech") || q.includes("college")) {
      return `🤖 **Assistant:**\n\n${answers["education"]}\n\n---\n💡 Want to know about my projects or skills instead?`;
    }
    
    // Default response
    return `🤖 **Assistant:** I can answer questions about:

📁 **PROJECTS:**
• "What is SafeMem?" - 4.5ns memory allocator
• "Tell me about NanoTrade" - 17.5µs HFT engine
• "Personal AI Assistant" - RAG with Gemini
• "Chatter-Box" - 50+ user language platform

💻 **SKILLS:**
• "C++ skills" / "Python skills" / "MERN stack"
• "Lock-free programming" / "Docker" / "FPGA"
• "Memory management" / "RTOS" / "Microcontrollers"

📚 **EDUCATION:**
• "Education background" / "BTech" / "10th percentage"

👥 **LEADERSHIP:**
• "GDG experience" / "NSS volunteer"

🏆 **ACHIEVEMENTS:**
• "Codeforces rating" / "Competitive programming"

📫 **CONTACT:**
• "Contact information" / "Email" / "GitHub"

🔧 **TECH CONCEPTS:**
• "Why hugepages?" / "Why C++?" / "Lock-free explained"

**Try asking:** "What is Chatter-Box?" or "Python skills" or "GDG experience" or "Why hugepages?"`;
};

  return (
    <div className="portfolio">
      <div className="matrix-bg"></div>
      
      <header className="terminal-header">
        <div className="header-content">
          <div className="title">
            <span className="blink">$</span> RAHUL_SAHU@portfolio:~$
          </div>
          <nav className="nav-links">
            <a href="#home">[HOME]</a>
            <a href="#about">[ABOUT]</a>
            <a href="#projects">[PROJECTS]</a>
            <a href="#achievements">[ACHIEVEMENTS]</a>
            <a href="#contact">[CONTACT]</a>
          </nav>
        </div>
      </header>

      <main>
        <section id="home" className="hero">
          <div className="terminal-window">
            <div className="terminal-line">/* Systems Programmer & HFT Engineer */</div>
            <h1 className="glitch-text">Hi, I'm Rahul Sahu.</h1>
            <h2 className="green-glow">I build ultra-low latency systems</h2>
            <p className="desc">
              BTech Electronics & Communication Engineering student at <span className="highlight">BIT Mesra</span> specializing in 
              systems programming, high-frequency trading engines, and memory allocators. Working at the intersection 
              of hardware and software to push latency boundaries to absolute minimums.
            </p>
            <div className="metrics">
              <div className="metric">
                <span className="metric-value">4.5ns</span>
                <span className="metric-label">SAFEMEM LATENCY</span>
              </div>
              <div className="metric">
                <span className="metric-value">27x</span>
                <span className="metric-label">FASTER THAN MALLOC</span>
              </div>
              <div className="metric">
                <span className="metric-value">17.5µs</span>
                <span className="metric-label">NANOTRADE LATENCY</span>
              </div>
              <div className="metric">
                <span className="metric-value">1459</span>
                <span className="metric-label">CODEFORCES RATING</span>
              </div>
            </div>
            <div className="code-badge">
              <span>🖥️</span> cat /proc/rahul_info | grep specialty
              <span className="cursor">█</span>
            </div>
          </div>
        </section>

        <section id="about" className="about">
          <div className="section-header">
            <span className="section-badge">// TECHNICAL_IDENTITY</span>
            <h2>Engineering Intelligent Systems at the Hardware Level</h2>
          </div>
          <div className="about-grid">
            <div className="about-card reveal-left">
              <div className="card-icon">⚡</div>
              <h3>Scale First</h3>
              <p>Building for production from day one with 4.5ns allocation latency and zero memory loss.</p>
            </div>
            <div className="about-card">
              <div className="card-icon">🔧</div>
              <h3>Low-Level Mastery</h3>
              <p>C/C++, Memory Management, Lock-Free Concurrency, SIMD, and Linux Kernel optimization.</p>
            </div>
            <div className="about-card">
              <div className="card-icon">🤖</div>
              <h3>AI Integration</h3>
              <p>RAG-based systems with Gemini 1.5 Pro and vector embeddings for intelligent assistants.</p>
            </div>
          </div>
          <div className="terminal-quote">
            <span className="prompt">&gt;&gt;&gt;</span> "My mission is to build software that operates at the absolute limits of hardware — where every nanosecond matters and every byte is accounted for."
          </div>
        </section>

        <section className="skills">
          <div className="section-header">
            <span className="section-badge">// SYSTEM_CAPABILITIES</span>
            <h2>Technical Stack</h2>
          </div>
          <div className="skills-grid">
            <div className="skill-category">
              <h3>⚡ SYSTEMS</h3>
              <div className="skill-items">
                <span className="skill-tag">C</span>
                <span className="skill-tag">C++</span>
                <span className="skill-tag">Memory Management</span>
                <span className="skill-tag">Lock-Free Concurrency</span>
                <span className="skill-tag">SIMD</span>
                <span className="skill-tag">Linux Kernel</span>
                <span className="skill-tag">GDB/Perf</span>
              </div>
            </div>
            <div className="skill-category">
              <h3>🌐 WEB</h3>
              <div className="skill-items">
                <span className="skill-tag">MERN Stack</span>
                <span className="skill-tag">FastAPI</span>
                <span className="skill-tag">WebRTC</span>
                <span className="skill-tag">Socket.io</span>
                <span className="skill-tag">Tailwind CSS</span>
                <span className="skill-tag">REST APIs</span>
              </div>
            </div>
            <div className="skill-category">
              <h3>🤖 AI/ML</h3>
              <div className="skill-items">
                <span className="skill-tag">RAG</span>
                <span className="skill-tag">Vector Databases</span>
                <span className="skill-tag">Gemini API</span>
                <span className="skill-tag">LangChain</span>
                <span className="skill-tag">Streamlit</span>
              </div>
            </div>
            <div className="skill-category">
              <h3>🔧 HARDWARE</h3>
              <div className="skill-items">
                <span className="skill-tag">FPGA/Verilog</span>
                <span className="skill-tag">Microcontrollers</span>
                <span className="skill-tag">RTOS</span>
                <span className="skill-tag">I2C/SPI/UART</span>
                <span className="skill-tag">VLSI Design</span>
              </div>
            </div>
            <div className="skill-category">
              <h3>📦 DEVOPS</h3>
              <div className="skill-items">
                <span className="skill-tag">Docker</span>
                <span className="skill-tag">Git/GitHub</span>
                <span className="skill-tag">CI/CD</span>
                <span className="skill-tag">Linux CLI</span>
              </div>
            </div>
            <div className="skill-category">
              <h3>📊 DSA</h3>
              <div className="skill-items">
                <span className="skill-tag">1000+ Problems</span>
                <span className="skill-tag">Codeforces 1459</span>
                <span className="skill-tag">DP/Graphs/Trees</span>
              </div>
            </div>
          </div>
        </section>

        <section id="projects" className="projects">
          <div className="section-header">
            <span className="section-badge">// DEPLOYED_SYSTEMS</span>
            <h2>Flagship Projects</h2>
          </div>
          <div className="projects-grid">
            <div className="project-card reveal">
              <div className="project-header">
                <span className="project-icon">🚀</span>
                <h3>[01] SAFE-MEM ALLOCATOR</h3>
              </div>
              <p>Ultra-low-latency slab-based memory allocator achieving 4.5ns average latency, 27x faster than glibc malloc with 12.55 GiB/s throughput.</p>
              <div className="project-tech">
                <span>C++</span>
                <span>SIMD</span>
                <span>Hugepages</span>
                <span>Lock-Free</span>
              </div>
              <div className="project-stats">
                <span>⚡ 4.5ns</span>
                <span>📊 27x faster</span>
                <span>💾 0% loss</span>
              </div>
            </div>
            <div className="project-card">
              <div className="project-header">
                <span className="project-icon">💹</span>
                <h3>[02] NANOTRADE HFT ENGINE</h3>
              </div>
              <p>High-frequency trading engine with 17.5µs deterministic tick-to-trade latency, achieving 12x latency reduction through hardware-level optimizations.</p>
              <div className="project-tech">
                <span>C++</span>
                <span>UDP</span>
                <span>CPU Pinning</span>
                <span>Zero-Copy</span>
              </div>
              <div className="project-stats">
                <span>⚡ 17.5µs</span>
                <span>📊 12x faster</span>
                <span>🎯 Deterministic</span>
              </div>
            </div>
            <div className="project-card">
              <div className="project-header">
                <span className="project-icon">🤖</span>
                <h3>[03] PERSONAL AI ASSISTANT</h3>
              </div>
              <p>RAG-based generative AI system using Gemini 1.5 Pro with vector embeddings and semantic search for privacy-focused document Q&A.</p>
              <div className="project-tech">
                <span>Python</span>
                <span>Gemini API</span>
                <span>RAG</span>
                <span>Streamlit</span>
              </div>
              <div className="project-stats">
                <span>🧠 RAG</span>
                <span>📄 Multi-format</span>
                <span>🔒 Privacy-first</span>
              </div>
            </div>
            <div className="project-card">
              <div className="project-header">
                <span className="project-icon">💬</span>
                <h3>[04] CHATTER-BOX</h3>
              </div>
              <p>Real-time language learning platform with 50+ active users, featuring WebRTC P2P calls and Socket.io instant messaging.</p>
              <div className="project-tech">
                <span>MERN</span>
                <span>WebRTC</span>
                <span>Socket.io</span>
                <span>Docker</span>
              </div>
              <div className="project-stats">
                <span>👥 50+ users</span>
                <span>📹 P2P calls</span>
                <span>⚡ Real-time</span>
              </div>
            </div>
          </div>
        </section>

        <section id="achievements" className="achievements">
          <div className="section-header">
            <span className="section-badge">// RECOGNITION_LOGS</span>
            <h2>Verified Milestones</h2>
          </div>
          <div className="achievements-grid">
            <div className="achievement-item">
              <span className="achievement-icon">🏆</span>
              <div>
                <h4>Codeforces Specialist</h4>
                <p>Max Rating: 1459 | Solved 1000+ algorithmic problems</p>
              </div>
            </div>
            <div className="achievement-item">
              <span className="achievement-icon">⚡</span>
              <div>
                <h4>SafeMem Allocator</h4>
                <p>4.5ns latency, 27x faster than glibc malloc</p>
              </div>
            </div>
            <div className="achievement-item">
              <span className="achievement-icon">💹</span>
              <div>
                <h4>NanoTrade HFT</h4>
                <p>17.5µs tick-to-trade, 12x latency reduction</p>
              </div>
            </div>
            <div className="achievement-item">
              <span className="achievement-icon">🤖</span>
              <div>
                <h4>RAG AI Assistant</h4>
                <p>Gemini 1.5 Pro powered document Q&A system</p>
              </div>
            </div>
            <div className="achievement-item">
              <span className="achievement-icon">🎓</span>
              <div>
                <h4>Academic Excellence</h4>
                <p>10th: 91.5% | 12th: 90% | BTech: 81%</p>
              </div>
            </div>
            <div className="achievement-item">
              <span className="achievement-icon">👥</span>
              <div>
                <h4>GDG Technical Member</h4>
                <p>Workshops for 40+ students on DSA & system design</p>
              </div>
            </div>
            <div className="achievement-item">
              <span className="achievement-icon">💚</span>
              <div>
                <h4>NSS Volunteer</h4>
                <p>Large-scale community campaigns with zero downtime</p>
              </div>
            </div>
          </div>
        </section>

        <section className="leadership">
          <div className="section-header">
            <span className="section-badge">// OPERATIONAL_LOGS</span>
            <h2>Positions of Responsibility</h2>
          </div>
          <div className="leadership-cards reveal-right">
            <div className="leadership-card">
              <h3>GDG on Campus, BIT Mesra</h3>
              <p className="role">Technical Community Member | Oct 2025 - Present</p>
              <ul>
                <li>Co-led technical workshops on data structures and system design for 40+ students</li>
                <li>Conducted live debugging labs and algorithmic mentorship sessions</li>
                <li>Presented case study: "Building SafeMem - A 4.5ns Allocator"</li>
              </ul>
            </div>
            <div className="leadership-card">
              <h3>National Service Scheme (NSS), BIT Mesra</h3>
              <p className="role">NSS Volunteer | Aug 2024 - Present</p>
              <ul>
                <li>Orchestrated resource allocation for high-impact community service campaigns</li>
                <li>Managed cross-functional coordination between volunteer squads</li>
                <li>Resolved critical bottlenecks ensuring zero operational downtime</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="education">
          <div className="section-header">
            <span className="section-badge">// ACADEMIC_FOUNDATION</span>
            <h2>Education</h2>
          </div>
          <div className="education-cards">
            <div className="education-card">
              <h3>🎓 BTech Electronics & Communication Engineering</h3>
              <p>BIT Mesra, Ranchi | 2024 - 2028</p>
              <p>Percentage: 81% | Roll No: BTECH/10679/24</p>
            </div>
            <div className="education-card">
              <h3>📚 12th (ISC)</h3>
              <p>St. Thomas School | 2022 - 2023</p>
              <p>Percentage: 90%</p>
            </div>
            <div className="education-card">
              <h3>📚 10th (ICSE)</h3>
              <p>St. Thomas School | 2020 - 2021</p>
              <p>Percentage: 91.5%</p>
            </div>
          </div>
        </section>

        <section id="contact" className="contact">
          <div className="section-header">
            <span className="section-badge">// CONNECTION_NODES</span>
            <h2>Contact & Social</h2>
          </div>
          <div className="contact-links">
            <a href="mailto:firstrahul39@gmail.com" className="contact-link">📧 firstrahul39@gmail.com</a>
            <a href="tel:+918299302303" className="contact-link">📱 +91 8299302303</a>
            <a href="https://github.com/cpsurfer" target="_blank" rel="noopener noreferrer" className="contact-link">💻 github.com/cpsurfer</a>
            <a href="https://linkedin.com/in/rahul-sahu-097874306" target="_blank" rel="noopener noreferrer" className="contact-link">🔗 linkedin.com/in/rahul-sahu-097874306</a>
            <a href="https://codeforces.com/profile/firstrahul39" target="_blank" rel="noopener noreferrer" className="contact-link">🏆 codeforces.com/profile/firstrahul39</a>
          </div>
        </section>
      </main>

      {/* AI ASSISTANT FLOATING WIDGET - UPDATED WITH BETTER LOADING */}
      <div className="ai-assistant">
        <div className="ai-header" onClick={() => setShowAiResponse(!showAiResponse)}>
          <span className="ai-icon">🤖</span>
          <span>RAHUL'S ASSISTANT</span>
          <span className="ai-status">● ONLINE</span>
        </div>
        <div className={`ai-body ${showAiResponse ? 'expanded' : ''}`}>
          <form onSubmit={handleAIQuery} className="ai-form">
            <span className="prompt">➜</span>
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="Ask about SafeMem, NanoTrade, C++, Codeforces..."
              disabled={isLoading}
              className="command-input"  // Add this class
              style={{ caretColor: '#00ff41', fontWeight: 'bold' }}  // Add inline style
            />
            <button type="submit" disabled={isLoading}>
              {isLoading ? '⌛' : '⏎'}
            </button>
          </form>
          
          {/* Smooth Loading Animation */}
          {isLoading && (
            <div className="ai-loading-smooth">
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div className="loading-message">{loadingMessage || "🤔 Thinking..."}</div>
              <div className="loading-progress">
                <div className="progress-bar"></div>
              </div>
            </div>
          )}
          
          {showAiResponse && aiResponse && !isLoading && (
            <div className="ai-response">
              <pre>{aiResponse}</pre>
            </div>
          )}
        </div>
      </div>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-line">$ SYSTEM_STATUS: ACTIVE // AI_ASSISTANT: READY // PORTFOLIO_V2.4</div>
          <div className="footer-line">© 2025 Rahul Sahu | Built with ❤️ for ultra-low latency</div>
        </div>
      </footer>
    </div>
  );
}
