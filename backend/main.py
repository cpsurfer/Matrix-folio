from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import re

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Query(BaseModel):
    prompt: str

# ========== HELPER FUNCTION FOR SMART MATCHING ==========
def normalize_question(question: str) -> str:
    """Normalize question for better matching"""
    q = question.lower()
    # Replace common variations
    q = q.replace("c++", "cpp")
    q = q.replace("c plus plus", "cpp")
    q = q.replace("c plus", "cpp")
    q = q.replace("microcontroller", "microcontrollers")
    q = q.replace("communication protocol", "protocols")
    q = q.replace("i2c", "i2c/spi/uart")
    q = q.replace("spi", "i2c/spi/uart")
    q = q.replace("uart", "i2c/spi/uart")
    q = q.replace("multithreading", "multithreading lock-free atomics")
    q = q.replace("lock free", "lock-free")
    q = re.sub(r'\s+', ' ', q)  # Remove extra spaces
    return q

# ========== COMPLETE KNOWLEDGE BASE ==========
ANSWERS = {
    # Personal Info
    "name": "Rahul Sahu - BTech Electronics & Communication Engineering at BIT Mesra, Ranchi, Jharkhand",
    "roll number": "BTECH/10679/24",
    "phone": "+91 8299302303",
    "email": "firstrahul39@gmail.com",
    "location": "BIT Mesra, Ranchi, Jharkhand",
    
    # Education
    "10th": "10th (ICSE) from St. Thomas School (2020-2021) - Percentage: 91.5%",
    "12th": "12th (ISC) from St. Thomas School (2022-2023) - Percentage: 90%",
    "btech": "BTech in Electronics & Communication Engineering at BIT Mesra (2024-2028) - Current Percentage: 81%",
    "education": """🎓 **Education:**
• BTech ECE, BIT Mesra (2024-2028) - 81%
• 12th ISC, St. Thomas School (2022-2023) - 90%
• 10th ICSE, St. Thomas School (2020-2021) - 91.5%""",
    
    # Skills - Technical
    "cpp": """💻 **C++ Skills:**
- Systems Programming
- Memory Management
- Lock-Free Concurrency (TLS, SPSC queues)
- Low-Latency Optimization
- SIMD vector instructions
- RAII, Templates, STL
- Used in: SafeMem (4.5ns allocator), NanoTrade (17.5µs HFT)""",
    
    "python": """🐍 **Python Skills:**
- FastAPI for backend development
- Streamlit for AI interfaces
- Pandas, NumPy for data analysis
- Scikit-learn for ML
- Generative AI with Gemini API
- RAG systems with vector embeddings
- ctypes for C++ integration (SafeMem Python bindings)""",
    
    "javascript": """📜 **JavaScript/ES6+ Skills:**
- Modern ES6+ features (async/await, destructuring, modules)
- React.js for frontend development
- Node.js for backend
- Socket.io for real-time communication
- Used in: Chatter-Box (MERN stack)""",
    
    "mern": """🌐 **MERN Stack:**
- MongoDB (database, indexing, aggregation)
- Express.js (REST APIs, middleware)
- React.js (hooks, context, components)
- Node.js (event-driven architecture)
- Used in: Chatter-Box (50+ active users)""",
    
    "fastapi": """⚡ **FastAPI Skills:**
- Building high-performance REST APIs
- Async/await support
- Automatic API documentation
- Dependency injection
- Pydantic models for data validation""",
    
    "postgresql": """🗄️ **PostgreSQL:**
- Relational database design
- Complex queries and joins
- Indexing for performance
- ACID compliance
- Used in various web projects""",
    
    "tailwind": """🎨 **Tailwind CSS:**
- Utility-first CSS framework
- Responsive design
- Custom component styling
- Used in portfolio and web projects""",
    
    "rest api": """🔌 **REST APIs:**
- Designing RESTful endpoints
- HTTP methods (GET, POST, PUT, DELETE)
- Status codes and error handling
- JWT authentication
- Postman testing and documentation""",
    
    "vlsi": """🔬 **VLSI Design:**
- Digital circuit design
- CMOS technology
- Logic synthesis and optimization
- Timing analysis
- Part of ECE curriculum at BIT Mesra""",
    
    "fpga": """⚙️ **FPGA/Verilog/VHDL:**
- Hardware description languages (Verilog, VHDL)
- FPGA architecture and programming
- Digital logic design
- Timing constraints and verification
- Used in: Academic projects and labs""",
    
    "microcontrollers": """🔧 **Microcontrollers (8051/ARM):**
- Embedded C programming
- GPIO, timers, interrupts
- ADC/PWM interfaces
- ARM Cortex-M architecture
- Used in: Embedded systems coursework""",
    
    "protocols": """📡 **Communication Protocols:**
- I2C (Inter-Integrated Circuit)
- SPI (Serial Peripheral Interface)
- UART (Universal Asynchronous Receiver-Transmitter)
- Used in: Microcontroller interfacing projects""",
    
    "rtos": """⏱️ **RTOS (Real-Time Operating System):**
- Task scheduling and prioritization
- Inter-task communication (queues, semaphores, mutexes)
- Interrupt handling
- Deterministic timing
- Used in: Embedded systems development""",
    
    "memory management": """🧠 **Memory Management:**
- Custom slab allocators (SafeMem)
- 2MB Linux Hugepages (TLB optimization)
- 64-byte cache line alignment (false sharing prevention)
- Lock-free Thread-Local Storage
- Zero memory loss in SafeMem""",
    
    "multithreading": """🔄 **Multithreading & Lock-Free:**
- Lock-Free concurrency with TLS (Thread-Local Storage)
- SPSC queues for message passing (50ns)
- Atomic operations and memory barriers
- No mutex contention on fast path
- Used in: SafeMem (4.5ns allocations)""",
    
    "linux kernel": """🐧 **Linux Kernel Optimization:**
- 2MB Hugepages (MAP_HUGETLB)
- CPU pinning (sched_setaffinity)
- Non-blocking I/O (O_NONBLOCK)
- Busy-spinning for low latency
- Perf benchmarking tools
- Used in: SafeMem and NanoTrade""",
    
    "docker": """🐳 **Docker:**
- Containerization of applications
- Dockerfile creation and optimization
- Multi-container apps with docker-compose
- Used in: Chatter-Box deployment""",
    
    "git": """📦 **Git/GitHub:**
- Version control and collaboration
- GitHub Actions CI/CD pipelines
- Branching strategies
- Automated testing and deployment
- Used in: All projects""",
    
    "ml": """🤖 **Machine Learning & Deep Learning:**
- Scikit-learn (classification, regression, clustering)
- Pandas/NumPy for data manipulation
- Matplotlib for visualization
- Deep Learning fundamentals
- Feature engineering and model evaluation""",
    
    "generative ai": """✨ **Generative AI:**
- RAG (Retrieval-Augmented Generation) systems
- Google Gemini 1.5 Pro API
- Vector embeddings (ChromaDB)
- Semantic search
- Prompt engineering
- Used in: Personal AI Assistant project""",
    
    "vector database": """🗂️ **Vector Databases:**
- ChromaDB for vector storage
- Semantic similarity search
- Document chunking and embedding
- Used in: RAG-based AI Assistant""",
    
    "dsa": """📊 **Data Structures & Algorithms:**
- 1000+ problems solved on Codeforces
- Rating: 1459 (Specialist)
- Dynamic Programming, Graphs, Trees
- Segment Trees, Fenwick Trees
- String algorithms (KMP, Z-function)
- Number theory and combinatorics
- Sorting, searching, hashing algorithms""",
    
    "oop": """🏗️ **OOP (Object-Oriented Programming):**
- Classes, objects, inheritance, polymorphism
- Encapsulation and abstraction
- Design patterns (RAII in C++)
- Used in all software projects""",
    
    "dbms": """🗃️ **DBMS (Database Management Systems):**
- SQL (MongoDB, PostgreSQL)
- Database design and normalization
- Indexing and query optimization
- ACID properties and transactions
- Used in: MERN stack projects""",
    
    "os": """🖥️ **Operating Systems:**
- Process management and scheduling
- Memory management (paging, hugepages)
- File systems and I/O
- Inter-process communication
- Linux system programming
- Used in: Systems programming projects""",
    
    "networking": """🌍 **Networking (TCP/IP, HTTP/HTTPS):**
- TCP/UDP protocols
- Socket programming
- HTTP/HTTPS protocols
- REST API design
- WebRTC for P2P communication
- Used in: NanoTrade (UDP), Chatter-Box (WebRTC)""",
    
    "socket programming": """🔌 **Socket Programming:**
- UDP sockets for low-latency (NanoTrade)
- Non-blocking I/O (O_NONBLOCK)
- WebSocket with Socket.io
- Network protocol implementation
- Used in: NanoTrade, Chatter-Box""",
    
    "competitive programming": """🏆 **Competitive Programming:**
- Codeforces Rating: 1459 (Specialist)
- Problems Solved: 1000+
- Contest history: 40+ contests
- Mastered: DP, Graphs, Segment Trees, Number Theory
- Target: 1600+ (Expert) by mid-2025
- Handle: firstrahul39 on Codeforces""",
    
    # Projects
    "safemem": """🚀 **SAFE-MEM: Ultra-Fast Slab-Based Memory Allocator**

**Duration:** Dec 2025 - May 2026 (Self-guided)

**Performance Metrics:**
• 4.5ns average latency (18-20 CPU cycles on 4GHz system)
• 27x faster than glibc malloc
• 12.55 GiB/s throughput across 100M allocations
• 0.18ns jitter, 1.8-3% coefficient of variation
• Zero memory loss

**Technical Features:**
• Lock-free concurrency with Thread-Local Storage (TLS) fast path
• 2MB Linux Hugepages (MAP_HUGETLB) - bypasses TLB pressure
• 64-byte cache line alignment - eliminates false sharing
• SIMD vector optimizations
• ASAN/TSAN hardened C++ core
• Python ctypes bindings
• 50ns SPSC queue for cross-thread messaging
• Google Benchmark CI/CD pipeline

**Why Hugepages?** Reduces TLB misses by 99.8%, eliminating page-walk latency
**Why 64-byte alignment?** Prevents false sharing between CPU cores
**Why Lock-Free?** No mutex contention, scales linearly with cores

**GitHub:** https://github.com/cpsurfer/safemem""",

    "nanotrade": """⚡ **NANOTRADE: Ultra-Low Latency HFT Engine**

**Duration:** Dec 2025 - Feb 2026 (Self-guided)

**Performance:**
• 17.5µs deterministic tick-to-trade latency
• 12x latency reduction vs baseline
• End-to-end: market data → strategy → order → execution ack

**Optimization Techniques:**
• Busy-spinning UDP (O_NONBLOCK) - no context switches (saves 10-50µs)
• CPU pinning (sched_setaffinity) - L1/L2 cache always hot
• Zero-copy integer parsing - no floating-point overhead
• Compiler branch prediction hints (likely/unlikely macros)
• 64-byte cache line alignment

**Technologies:** C++, UDP Sockets, Linux Kernel Tuning, CI/CD

**Impact:** Demonstrates mastery of hardware-level optimization for financial trading systems""",

    "ai assistant": """🤖 **PERSONAL AI ASSISTANT: RAG-Based Generative AI System**

**Duration:** Sep 2025 - Dec 2025 (Self-guided)

**What it does:**
RAG-based AI assistant using Gemini 1.5 Pro to answer questions from private documents.

**Features:**
• Vector embeddings for semantic search
• Multi-format file processing (PDF, TXT)
• Secure, privacy-focused pipeline
• Streamlit web interface
• Optimized prompt engineering
• Autonomous agentic workflows

**Technologies:** Python, Google Gemini API, RAG, LangChain, Streamlit, ChromaDB, CI/CD

**Use Case:** Document Q&A, personal knowledge base, resume answering system""",

    "chatterbox": """💬 **CHATTER-BOX: Language Learning Partner**

**Duration:** Aug 2025 - Dec 2025 (Self-guided)

**What it does:**
Real-time language learning platform connecting native speakers through P2P communication.

**Metrics:**
• 50+ active users (Alpha Release)
• Real-time WebRTC P2P calls
• Socket.io instant messaging
• JWT authentication

**Technologies:**
• MongoDB (database, indexing)
• Express.js (REST APIs)
• React.js (frontend)
• Node.js (backend)
• WebRTC (P2P calls)
• Socket.io (messaging)
• Docker (containerization)
• Render (deployment)

**Features:**
• Automated CI/CD pipeline
• Custom matching algorithm for language partners
• Production-level deployment ready""",
    
    # Codeforces
    "codeforces": """🏆 **CODEFORCES PROFILE**

**Handle:** firstrahul39
**Current Rating:** 1459 (Specialist)
**Problems Solved:** 1000+
**Global Percentile:** Top 20%
**Contests Participated:** 40+

**Rating Progression:**
• 2024: 900 (Newbie) → 1200 (Pupil)
• 2025: 1200 → 1459 (Specialist)
• Target: 1600+ (Expert) by mid-2025

**Mastered Algorithms:**
• Dynamic Programming
• Graph Theory (Dijkstra, Floyd, MST, Flow)
• Segment Trees with Lazy Propagation
• Fenwick Trees
• String Algorithms (KMP, Z-function)
• Number Theory & Combinatorics
• Geometry (Convex hull, Line intersection)

**Recent Achievement:** Ranked #342 in recent Codeforces Round""",
    
    # Leadership
    "gdg": """👥 **GOOGLE DEVELOPER GROUPS (GDG) on Campus, BIT Mesra**

**Role:** Technical Community Member (Oct 2025 - Present)

**Achievements:**
• Co-led technical workshops on DSA & System Design
• 40+ batchmates trained
• Mentored 15 juniors in algorithmic problem-solving
• Conducted live debugging labs and troubleshooting sessions
• Presented case study: "Building SafeMem - A 4.5ns Allocator"
• Helped 5 students reach Codeforces Pupil rating

**Impact:** Created a thriving developer ecosystem focused on low-latency systems and competitive programming""",

    "nss": """💚 **NATIONAL SERVICE SCHEME (NSS), BIT Mesra**

**Role:** NSS Volunteer (Aug 2024 - Present)

**Responsibilities:**
• Orchestrated resource allocation for high-impact community campaigns
• Managed cross-functional coordination between volunteer squads
• Resolved critical resource bottlenecks under tight timelines
• Ensured zero operational downtime

**Skills Applied:** Operations Management, Resource Allocation, Logistics, Incident Management""",

    # Contact
    "github": "💻 GitHub: https://github.com/cpsurfer",
    "linkedin": "🔗 LinkedIn: https://www.linkedin.com/in/rahul-sahu-097874306/",
    "codeforces link": "🏆 Codeforces: https://codeforces.com/profile/firstrahul39",
    "contact": """📫 **CONTACT INFORMATION**

📧 Email: firstrahul39@gmail.com
📱 Phone: +91 8299302303
💻 GitHub: github.com/cpsurfer
🔗 LinkedIn: linkedin.com/in/rahul-sahu-097874306/
🏆 Codeforces: codeforces.com/profile/firstrahul39
🎓 Roll No: BTECH/10679/24

📍 Location: BIT Mesra, Ranchi, Jharkhand""",
    
    "skills summary": """💻 **RAHUL'S COMPLETE TECH STACK**

**⭐⭐⭐ EXPERT (Production Ready):**
• C++, Memory Management, Lock-Free Concurrency, SIMD
• Linux Kernel Optimization, Hugepages, CPU Pinning
• GDB/Perf benchmarking

**⭐⭐ INTERMEDIATE (Active Projects):**
• Python, FastAPI, MERN Stack
• WebRTC, Socket.io, REST APIs
• Docker, Git/GitHub CI/CD
• FPGA/Verilog, Microcontrollers

**🤖 AI/ML:**
• Generative AI, RAG, Vector Databases
• Gemini API, LangChain
• Scikit-learn, Pandas, NumPy

**📊 DSA:**
• 1000+ Codeforces problems
• Rating: 1459 (Specialist)""",
    
    # Extracurricular
    "gaming": """🎮 **Competitive Strategic Gaming:**
- Clash Royale (high-stakes tournaments)
- Counter Strike (tactical team coordination)
- World of Warcraft (strategy and planning)
- Developed real-time decision-making and composure under pressure
- Translates to low-latency systems programming mindset"""
}

# ========== MAIN API ENDPOINT ==========
@app.post("/api/rag-chat")
async def chat(query: Query):
    user_question = query.prompt
    normalized = normalize_question(user_question)
    
    # Smart matching - check each key in answers
    matched = None
    match_score = 0
    
    for key, answer in ANSWERS.items():
        # Check if key appears in normalized question
        if key in normalized:
            # Longer key = better match
            score = len(key)
            if score > match_score:
                match_score = score
                matched = answer
    
    # Special handling for project-specific variations
    if "safemem" in normalized or "safe mem" in normalized or "safe-mem" in normalized:
        matched = ANSWERS["safemem"]
    elif "nanotrade" in normalized or "nano trade" in normalized or "hft" in normalized:
        matched = ANSWERS["nanotrade"]
    elif "ai assistant" in normalized or "personal ai" in normalized or "rag" in normalized:
        matched = ANSWERS["ai assistant"]
    elif "chatterbox" in normalized or "chatter box" in normalized:
        matched = ANSWERS["chatterbox"]
    elif "gdg" in normalized:
        matched = ANSWERS["gdg"]
    elif "nss" in normalized:
        matched = ANSWERS["nss"]
    
    if matched:
        return {"reply": f"🤖 **Assistant:**\n\n{matched}\n\n---\n💡 Ask me anything else about Rahul's projects, skills, or experience!"}
    
    # If no match, show helpful menu
    return {"reply": f"""🤖 **Assistant:** I can answer questions about Rahul Sahu!

📁 **PROJECTS:**
• "What is SafeMem?" - 4.5ns memory allocator
• "Tell me about NanoTrade" - 17.5µs HFT engine
• "Personal AI Assistant" - RAG with Gemini
• "Chatter-Box" - 50+ user language platform

💻 **SKILLS:**
• "C++ skills" / "Python skills" / "MERN stack"
• "Lock-free programming" / "Hugepages"
• "Competitive programming" / "Codeforces rating"

📚 **EDUCATION:**
• "Education background" / "10th percentage" / "BTech"

👥 **LEADERSHIP:**
• "GDG experience" / "NSS volunteer"

📫 **CONTACT:**
• "Contact information" / "Email" / "GitHub"

🎮 **EXTRA:**
• "Gaming" / "Extracurricular"

Try: "What is SafeMem?" or "C++ skills" or "Codeforces rating" """}

@app.get("/health")
async def health():
    return {"status": "active", "assistant": "Rahul's Portfolio Assistant", "topics": list(ANSWERS.keys())}

if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("🤖 RAHUL'S PORTFOLIO ASSISTANT ACTIVATED")
    print("📍 http://localhost:5001")
    print("📚 Total topics: " + str(len(ANSWERS)))
    print("✅ Smart matching enabled (cpp = C++, etc.)")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=5001)
