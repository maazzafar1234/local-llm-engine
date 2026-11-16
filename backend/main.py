from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import httpx
import json
import base64
import io
from PIL import Image
import pytesseract
from database import get_cached_response, set_cached_response

# Configure Tesseract OCR path for Windows
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_URL = "http://localhost:11434/v1/chat/completions"

@app.get("/")
def read_root():
    return {"status": "online", "engine": "Ollama qwen2.5-coder:1.5b + OCR"}

@app.post("/api/generate")
async def generate(payload: dict):
    prompt = payload.get("prompt", "")
    image_base64 = payload.get("image", None)

    # 1. OCR processing if screenshot is pasted
    if image_base64:
        try:
            if "," in image_base64:
                image_base64 = image_base64.split(",")[1]
            
            image_bytes = base64.b64decode(image_base64)
            image = Image.open(io.BytesIO(image_bytes))
            
            extracted_text = pytesseract.image_to_string(image).strip()
            prompt = f"Solve the following problem extracted from an image:\n\n{extracted_text}\n\n{prompt}".strip()
        except Exception as e:
            prompt = f"Error processing image OCR: {str(e)}"

    # 2. Check Exact-Match SQLite Cache
    cached = get_cached_response(prompt)
    if cached:
        async def cached_stream():
            yield f"data: {json.dumps({'text': cached, 'cached': True})}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(cached_stream(), media_type="text/event-stream")

    # 3. Forward to Ollama local server (Ultrafast 1.5B config)
    req_body = {
        "model": "qwen2.5-coder:1.5b",
        "messages": [
            {
                "role": "system",
                "content": "Provide direct, concise, step-by-step solutions without filler."
            },
            {
                "role": "user", 
                "content": prompt
            }
        ],
        "stream": True,
        "options": {
            "temperature": 0.1,
            "num_predict": 512,
            "num_ctx": 2048,
            "num_thread": 8
        }
    }

    async def ollama_proxy():
        full_response = ""
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST", OLLAMA_URL, json=req_body) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:].strip()
                        if data_str == "[DONE]":
                            break
                        if data_str:
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