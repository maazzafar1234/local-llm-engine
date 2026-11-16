from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import httpx
import json
from database import get_cached_response, set_cached_response

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ollama local OpenAI-compatible endpoint
OLLAMA_URL = "http://localhost:11434/v1/chat/completions"

@app.post("/api/generate")
async def generate(payload: dict):
    prompt = payload.get("prompt", "")

    # 1. Check Exact-Match SQLite Cache
    cached = get_cached_response(prompt)
    if cached:
        async def cached_stream():
            yield f"data: {json.dumps({'text': cached, 'cached': True})}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(cached_stream(), media_type="text/event-stream")

    # 2. Forward to Ollama local server
    req_body = {
        "model": "qwen2.5-coder:7b",
        "messages": [{"role": "user", "content": prompt}],
        "stream": True,
        "options": {
            "temperature": 0.1
        }
    }

    async def ollama_proxy():
        full_response = ""
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream("POST", OLLAMA_URL, json=req_body) as response:
                async for chunk in response.aiter_lines():
                    if chunk.startswith("data: "):
                        data_str = chunk[6:]
                        if data_str.strip() != "[DONE]":
                            try:
                                data = json.loads(data_str)
                                token = data.get("choices", [{}])[0].get("delta", {}).get("content", "")
                                if token:
                                    full_response += token
                                    yield f"data: {json.dumps({'text': token, 'cached': False})}\n\n"
                            except json.JSONDecodeError:
                                pass
        
        # Save complete generation to cache
        set_cached_response(prompt, full_response)

    return StreamingResponse(ollama_proxy(), media_type="text/event-stream")