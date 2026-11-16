# ⚡ Local Offline LLM Engine + OCR

A modular, ultra-fast local AI web application engineered for offline coding assistance, decision-making, and MCQ problem-solving. It runs 100% locally on your machine with zero cloud dependencies, leveraging GPU acceleration and exact-match caching for lightning-fast responses.

---

## 🌟 Use Cases & Target Scenarios

- **Offline Coding & Debugging:** Write, refactor, or debug code locally without relying on external internet connectivity or paid cloud APIs.
- **Instant Screenshot OCR Problem Solver:** Paste screenshots (`Ctrl + V`) of programming questions, error stack traces, or aptitude tests to instantly extract text via Tesseract OCR and solve them.
- **Zero-Latency Repeated Queries:** Retrieve previously generated answers instantly (0ms) using a local exact-match SQLite response caching mechanism.
- **Private & Secure AI Environment:** Keep all code snippets, prompts, and screenshots entirely on your local machine.

---

## 🏗️ System Architecture & Data Flow

The project follows a **Client-Server Architecture with Asynchronous Server-Sent Events (SSE)**, structured around a Backend-for-Frontend (BFF) gateway pattern:

```text
       [ User / Browser ]
               │
      (Ctrl + V / Input)
               ▼
┌─────────────────────────────┐
│  Next.js Frontend (Client)  │
└──────────────┬──────────────┘
               │ HTTP POST / SSE Stream
               ▼
┌─────────────────────────────┐
│ FastAPI Backend Gateway     │
│  ├── CORS & Middleware      │
│  ├── Tesseract OCR (Image)  │
│  └── SQLite Cache Lookup    │
└──────┬───────────────┬──────┘
       │               │
  (Cache Hit)    (Cache Miss)
       │               ▼
       │      ┌─────────────────┐
       │      │ Ollama Server   │
       │      │ (qwen2.5-1.5b)  │
       │      └────────┬────────┘
       │               │
       │        (GPU Execution)
       │               ▼
       └──────► [ SSE Token Stream ] ──► Render Markdown & Copy Code
```

### Data Flow Execution Paths:
- **Path A (Cache Hit):** If the user query or extracted OCR text matches an entry in `cache.db`, the FastAPI backend returns the response instantly via an SSE stream with 0ms latency.
- **Path B (Generation Flow):** 
  - Screenshots are parsed in-memory using base64 decoding and extracted via `pytesseract`.
  - Requests are forwarded to the local Ollama instance running `qwen2.5-coder:1.5b` offloaded to the local GPU.
  - Tokens stream back in real-time to the frontend via Server-Sent Events (SSE) and get cached automatically upon completion.

---

## ✨ Key Features

- **Ultrafast 1.5B Parameter Model:** Powered by `qwen2.5-coder:1.5b` for sub-second token generation speeds.
- **Instant Screenshot OCR:** Paste images directly into the chat input using `Ctrl + V` for automated text extraction.
- **Exact-Match SQLite Caching:** Zero-latency retrieval for frequent queries.
- **Modern Glassmorphic UI:** Built with Next.js App Router, Tailwind CSS, prompt suggestion chips, and keyboard shortcuts (`Ctrl + Enter`).
- **Isolated Code Copying:** Markdown rendering with dedicated syntax highlighting and one-click copy buttons for code blocks.

---

## 📁 Project Directory Structure

```text
local-llm-engine/
├── backend/
│   ├── main.py          # FastAPI application server & Ollama proxy
│   ├── database.py      # SQLite cache controller
│   ├── requirements.txt # Python dependencies
│   └── venv/            # Python virtual environment
├── frontend/
│   ├── app/
│   │   ├── layout.tsx   # Root layout with custom metadata & favicon
│   │   ├── page.tsx     # Main dashboard UI & clipboard handling
│   │   └── global.css   # Tailwind styling
│   ├── package.json     # Node dependencies & scripts
│   └── node_modules/    # Frontend packages (Git-ignored)
├── .gitignore           # Excludes build caches, venv, and node_modules
├── Makefile             # Command runner shortcuts
└── README.md            # Project documentation
```

---

## ⚙️ Prerequisites & Setup Guide

### 1. Prerequisites
- Python 3.10+ installed on your system.
- Node.js (v18+) and npm installed.
- Ollama installed locally ([Download Ollama](https://ollama.com)).
- Tesseract OCR installed on Windows (`C:\Program Files\Tesseract-OCR\tesseract.exe`).

### 2. Pull the LLM Model
Open your terminal and pull the optimized Coder model:
```powershell
ollama pull qwen2.5-coder:1.5b
```

### 3. Installation using Makefile
You can install and orchestrate the entire project using the provided Makefile:
```powershell
make install
```

---

## 🚀 Running the Application

Spin up your services in two separate terminal windows:

### 1. Start the Backend Server
```powershell
make backend
```
*(Runs FastAPI with hot-reloading on `http://localhost:8000`)*

### 2. Start the Frontend Development Server
```powershell
make frontend
```
*(Runs Next.js on `http://localhost:3000`)*

---

## 🛠️ Makefile Command Reference

| Command | Action Performed |
| :--- | :--- |
| `make ollama` | Boots up the local Ollama daemon service |
| `make backend` | Activates virtual environment and starts FastAPI with reload |
| `make frontend` | Launches the Next.js development server |
| `make install` | Automatically sets up Python venv, installs pip packages, and runs npm install |
| `make clean` | Removes temporary build caches (`.next`, `__pycache__`, and `cache.db`) |
