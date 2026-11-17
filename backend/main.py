from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import httpx
import json
import base64
import io
import os
import platform
import logging
from PIL import Image
import pytesseract
from database import get_cached_response, set_cached_response

logger = logging.getLogger(__name__)

# Configure Tesseract OCR path (cross-platform)
def configure_tesseract():
    if platform.system() == "Windows":
        default_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
        pytesseract.pytesseract.tesseract_cmd = os.getenv("TESSERACT_PATH", default_path)
    elif platform.system() == "Darwin":  # macOS
        pytesseract.pytesseract.tesseract_cmd = os.getenv("TESSERACT_PATH", "/usr/local/bin/tesseract")
    else:  # Linux
        pytesseract.pytesseract.tesseract_cmd = os.getenv("TESSERACT_PATH", "/usr/bin/tesseract")

configure_tesseract()

app = FastAPI(title="Local LLM Engine", version="1.0")

# CORS restricted to localhost only
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000", "http://127.0.0.1:3000", "http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

OLLAMA_URL = "http://localhost:11434/v1/chat/completions"
OLLAMA_TIMEOUT = 60.0
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB max image size

# Reusable async HTTP client
http_client = httpx.AsyncClient(timeout=OLLAMA_TIMEOUT)

@app.get("/health")
async def health_check():
    """Check if Ollama service is running"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get("http://localhost:11434/api/tags")
            return {"status": "online", "ollama": "connected"}
    except Exception as e:
        logger.error(f"Ollama health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail="Ollama service not available")

@app.get("/")
def read_root():
    return {"status": "online", "engine": "Ollama qwen2.5-coder:1.5b + OCR"}

def normalize_prompt(text: str) -> str:
    """Normalize prompt for better cache hits"""
    return " ".join(text.strip().split())

@app.post("/api/generate")
async def generate(payload: dict):
    prompt = payload.get("prompt", "").strip()
    image_base64 = payload.get("image", None)

    if not prompt and not image_base64:
        raise HTTPException(status_code=400, detail="Prompt or image is required")

    # 1. OCR processing if screenshot is pasted
    if image_base64:
        try:
            # Validate image size
            if len(image_base64) > MAX_IMAGE_SIZE:
                raise HTTPException(status_code=413, detail=f"Image too large (max {MAX_IMAGE_SIZE/1024/1024}MB)")
            
            if "," in image_base64:
                image_base64 = image_base64.split(",")[1]
            
            image_bytes = base64.b64decode(image_base64)
            image = Image.open(io.BytesIO(image_bytes))
            
            extracted_text = pytesseract.image_to_string(image).strip()
            if extracted_text:
                prompt = f"Solve the following problem extracted from an image:\n\n{extracted_text}\n\n{prompt}".strip()
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"OCR processing failed: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Image processing failed: {str(e)}")

    # Normalize prompt for better cache matching
    normalized_prompt = normalize_prompt(prompt)

    # 2. Check Cache (with normalized key)
    cached = get_cached_response(normalized_prompt)
    if cached:
        async def cached_stream():
            yield f"data: {json.dumps({'text': cached, 'cached': True})}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(cached_stream(), media_type="text/event-stream")

    # 3. Forward to Ollama with connection pooling
    req_body = {
        "model": "qwen2.5-coder:1.5b",
        "messages": [
            {
                "role": "system",
                "content": "Provide direct, concise, step-by-step solutions without filler."
            },
            {
                "role": "user", 
                "content": normalized_prompt
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
        try:
            async with http_client.stream("POST", OLLAMA_URL, json=req_body) as response:
                if response.status_code != 200:
                    logger.error(f"Ollama error: {response.status_code}")
                    yield f"data: {json.dumps({'text': 'Error: Ollama service unavailable', 'cached': False})}\n\n"
                    return
                
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
            
            # Save to cache only if generation succeeded
            if full_response:
                set_cached_response(normalized_prompt, full_response)
        except Exception as e:
            logger.error(f"Ollama request failed: {str(e)}")
            yield f"data: {json.dumps({'text': f'Error: Connection failed - {str(e)}', 'cached': False})}\n\n"

    return StreamingResponse(ollama_proxy(), media_type="text/event-stream")

@app.on_event("shutdown")
async def shutdown_event():
    """Close HTTP client on shutdown"""
    await http_client.aclose()