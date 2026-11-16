.PHONY: all backend frontend ollama install clean

# Start the Ollama local LLM daemon
ollama:
	ollama serve

# Run the FastAPI backend server with hot-reloading
backend:
	cd backend && .venv\Scripts\activate && uvicorn main:app --reload --port 8000

# Run the Next.js frontend development server
frontend:
	cd frontend && npm run dev

# Install all backend and frontend dependencies
install:
	cd backend && python -m venv venv && .venv\Scripts\activate && pip install -r requirements.txt
	cd frontend && npm install

# Clean temporary cache and build files
clean:
	if exist backend\cache.db del backend\cache.db
	if exist backend\__pycache__ rmdir /s /q backend\__pycache__
	if exist frontend\.next rmdir /s /q frontend\.next