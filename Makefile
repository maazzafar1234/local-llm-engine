.PHONY: all sglang backend frontend

sglang:
	bash scripts/start-sglang.sh

backend:
	cd backend && uvicorn main:app --reload --port 8000

frontend:
	cd frontend && npm run dev