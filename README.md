# Local LLM Engine - Ultrafast AI

A privacy-first, offline web application for AI-powered code assistance with OCR support and intelligent caching.

## Features

- **100% Local & Offline** - No cloud dependencies, runs entirely on your machine
- **Fast Inference** - Lightweight 1.5B parameter model (qwen2.5-coder) with optimized CPU execution
- **Smart Caching** - SQLite cache with instant responses for repeated queries
- **OCR Support** - Paste screenshots directly for problem solving
- **Real-time Streaming** - See responses as they're generated via Server-Sent Events
- **Cross-Platform** - Works on Windows, macOS, and Linux
- **Restricted Security** - CORS limited to localhost only

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Python 3.11+ with FastAPI |
| Frontend | Next.js 14 + React 18 + TypeScript |
| LLM | Ollama with qwen2.5-coder:1.5b |
| Database | SQLite3 (caching) |
| Streaming | Server-Sent Events (SSE) |

## Prerequisites

Before starting, install:

### 1. Python 3.11+
- **Windows/macOS/Linux:** Download from [python.org](https://www.python.org/downloads/)
- Verify: `python --version`

### 2. Node.js 18+
- **Windows/macOS/Linux:** Download from [nodejs.org](https://nodejs.org/)
- Verify: `node --version && npm --version`

### 3. Ollama (Local LLM Runtime)
- **Windows/macOS:** Download from [ollama.ai](https://ollama.ai)
- **Linux:** 
  ```bash
  curl https://ollama.ai/install.sh | sh
  ```
- After installation, download the model:
  ```bash
  ollama pull qwen2.5-coder:1.5b
  ```

### 4. Tesseract OCR (For screenshot processing)
- **Windows:** 
  - Download installer from [GitHub](https://github.com/UB-Mannheim/tesseract/wiki)
  - Install to `C:\Program Files\Tesseract-OCR\` (default location)
  - Or set environment variable: `TESSERACT_PATH=<your-install-path>`
  
- **macOS:**
  ```bash
  brew install tesseract
  ```
  
- **Linux (Ubuntu/Debian):**
  ```bash
  sudo apt-get install tesseract-ocr
  ```
  
- **Linux (Fedora/RHEL):**
  ```bash
  sudo dnf install tesseract
  ```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/maazzafar1234/local-llm-engine.git
cd local-llm-engine
```

2. Install dependencies:
```bash
make install
```

This will:
- Create Python virtual environment for backend
- Install backend dependencies (FastAPI, httpx, pytesseract, Pillow, etc.)
- Install frontend dependencies (Next.js, React, Tailwind CSS, etc.)

## Running the Application

You need **3 terminal windows**:

### Terminal 1: Start Ollama LLM Server
```bash
make ollama
# or directly:
ollama serve
```
Ollama will start on `http://localhost:11434`

### Terminal 2: Start Backend API
```bash
make backend
```
Backend runs on `http://localhost:8000`
- API endpoint: `http://localhost:8000/api/generate`
- Health check: `http://localhost:8000/health`
- Swagger docs: `http://localhost:8000/docs`

### Terminal 3: Start Frontend Web App
```bash
make frontend
```
Frontend runs on `http://localhost:3000`

## Usage

1. **Text Queries:**
   - Type a question in the textarea
   - Press `Ctrl+Enter` (or `Cmd+Enter` on macOS) or click "Generate ⚡"
   - Response streams in real-time with markdown formatting

2. **Screenshot/Image Queries:**
   - `Ctrl+V` (or `Cmd+V`) to paste a screenshot
   - Optionally add context in the textarea
   - Click "Generate ⚡"
   - OCR extracts text from image and solves the problem

3. **Quick Suggestions:**
   - Click any suggestion chip for instant queries
   - Examples: Binary Search, Dijkstra's Algorithm, React debugging, etc.

4. **Code Copy:**
   - Code blocks display with language-specific syntax highlighting
   - Click "Copy Code" to copy to clipboard

5. **Cache Hits:**
   - Identical queries return instant results (0ms) from cache
   - Green "Cache Hit" badge appears at top

## API Endpoints

### GET `/health`
Check if Ollama service is connected.
```bash
curl http://localhost:8000/health
```
Response:
```json
{"status": "online", "ollama": "connected"}
```

### GET `/`
Get service status.
```bash
curl http://localhost:8000/
```
Response:
```json
{"status": "online", "engine": "Ollama qwen2.5-coder:1.5b + OCR"}
```

### POST `/api/generate`
Generate response from prompt (with optional screenshot).
```bash
curl -X POST http://localhost:8000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Write a binary search in Python", "image": null}'
```

Request body:
```json
{
  "prompt": "Your question here",
  "image": "data:image/png;base64,..." // optional, base64 encoded image
}
```

Response: Server-Sent Events stream
```
data: {"text": "def", "cached": false}
data: {"text": " binary", "cached": false}
data: [DONE]
```

## Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Tesseract OCR path (optional, uses defaults if not set)
TESSERACT_PATH=C:\Program Files\Tesseract-OCR\tesseract.exe

# Ollama endpoint (optional, defaults to localhost:11434)
OLLAMA_URL=http://localhost:11434/v1/chat/completions
```

## Development Workflow

### Add a dependency
```bash
# Backend
cd backend && pip install <package-name>

# Frontend
cd frontend && npm install <package-name>
```

### Format and lint code
```bash
# Backend (Python)
pip install black flake8
black backend/

# Frontend (TypeScript)
npm run lint
```

### Clean build artifacts
```bash
make clean
```

## Troubleshooting

### "Ollama service not available"
- Ensure Ollama is running: `ollama serve`
- Check it's accessible: `curl http://localhost:11434/api/tags`
- Verify model is installed: `ollama list`

### "Tesseract not found"
- **Windows:** Install from [GitHub releases](https://github.com/UB-Mannheim/tesseract/wiki)
- **macOS:** `brew install tesseract`
- **Linux:** `apt-get install tesseract-ocr` or equivalent

### "Cannot connect to localhost:3000/8000"
- Check ports 3000 and 8000 are not in use
- Firewall may be blocking - whitelist `localhost`
- Restart the services

### "Cache not working"
- Database file `backend/cache.db` should exist
- Check database with: `sqlite3 backend/cache.db "SELECT COUNT(*) FROM cache;"`
- Clear cache: `rm backend/cache.db` (will rebuild on first query)

### High memory usage or slow inference
- Model runs on CPU; GPU acceleration would require different setup
- Reduce context window in `main.py` if needed
- 1.5B model is optimized for balance between speed and accuracy

## Architecture

```
User Browser (React)
    ↓
Frontend API (Next.js)
    ↓
Backend API (FastAPI)
    ├─ OCR Processing (if image)
    ├─ SQLite Cache (prompt → response lookup)
    └─ Ollama LLM (if cache miss)
    ↓
Server-Sent Events (streaming response)
```

## Caching Strategy

- **Exact-match SQLite cache** - Identical prompts return cached responses
- **Fast lookups** - O(1) database queries
- **Persistent** - Cache survives application restarts
- **No expiration** - Responses cached indefinitely (acceptable for coding queries)

Prompts are normalized (whitespace trimmed) for better cache hits:
- "What is X?" → cached
- "What is X? " → hits cache (extra space trimmed)
- "What is X??" → cache miss (different prompt)

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Open a Pull Request

## Limitations

- **No conversation history** - Each query is independent
- **Single-threaded model** - One request at a time (can be improved with async workers)
- **CPU inference only** - GPU support would require additional setup
- **1.5B model capacity** - Works well for coding tasks, limited for complex reasoning

## Future Enhancements

- [ ] GPU acceleration (CUDA/Metal)
- [ ] Multi-turn conversation history
- [ ] Multiple model selection
- [ ] Response export (PDF, Markdown)
- [ ] Dark/Light theme toggle
- [ ] API authentication
- [ ] Docker deployment

## License

MIT License - see LICENSE file for details

## Support

- **Issues:** Report bugs at [GitHub Issues](https://github.com/maazzafar1234/local-llm-engine/issues)
- **Documentation:** See `/docs` folder for detailed guides
- **Q&A:** Check existing issues before creating new ones

---

**Happy coding! ⚡**
