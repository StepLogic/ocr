from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import requests
import base64
import os
from typing import Optional

app = FastAPI(title="EduMetrics OCR API", version="1.0.0")

# CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:4b")
OLLAMA_API_KEY = os.getenv("OLLAMA_API_KEY", None)


def get_ollama_headers():
    """Build headers for Ollama requests, including optional API key."""
    headers = {"Content-Type": "application/json"}
    if OLLAMA_API_KEY:
        headers["Authorization"] = f"Bearer {OLLAMA_API_KEY}"
    return headers


class OCRResponse(BaseModel):
    success: bool
    text: Optional[str] = None
    error: Optional[str] = None


def encode_image(image_bytes: bytes) -> str:
    """Encode image bytes to base64 string."""
    return base64.b64encode(image_bytes).decode("utf-8")


def perform_ocr(image_bytes: bytes) -> str:
    """Send image to Ollama Gemma model for OCR."""
    base64_image = encode_image(image_bytes)

    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {
                "role": "system",
                "content": "You are an OCR assistant. Extract all readable text from the image. Return only the extracted text, no explanations."
            },
            {
                "role": "user",
                "content": "Extract all text from this image:",
                "images": [base64_image]
            }
        ],
        "stream": False
    }

    try:
        response = requests.post(
            f"{OLLAMA_URL}/api/chat",
            json=payload,
            headers=get_ollama_headers(),
            timeout=300
        )
        response.raise_for_status()
        result = response.json()

        # Extract text from Ollama response
        if "message" in result and "content" in result["message"]:
            return result["message"]["content"].strip()
        elif "response" in result:
            return result["response"].strip()
        else:
            return str(result)

    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=503,
            detail=f"Ollama service error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"OCR processing failed: {str(e)}"
        )


@app.get("/")
async def root():
    return {"message": "EduMetrics OCR API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    """Check if Ollama service is reachable."""
    try:
        response = requests.get(
            f"{OLLAMA_URL}/api/tags",
            headers=get_ollama_headers(),
            timeout=10
        )
        ollama_status = "connected" if response.status_code == 200 else "unavailable"
    except Exception as e:
        ollama_status = "unavailable"

    return {
        "status": "healthy",
        "ollama": ollama_status,
        "model": OLLAMA_MODEL,
        "ollama_url": OLLAMA_URL
    }


@app.post("/ocr", response_model=OCRResponse)
async def ocr_endpoint(file: UploadFile = File(...)):
    """
    Upload an image file and perform OCR using Ollama Gemma model.
    Supports: PNG, JPG, JPEG, GIF, BMP, WebP
    """
    # Validate file type
    allowed_types = {"image/png", "image/jpeg", "image/jpg", "image/gif", "image/bmp", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}"
        )

    try:
        image_bytes = await file.read()

        # Validate image size (max 10MB)
        if len(image_bytes) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="File too large. Maximum size is 10MB."
            )

        # Perform OCR
        extracted_text = perform_ocr(image_bytes)

        return OCRResponse(success=True, text=extracted_text)

    except HTTPException:
        raise
    except Exception as e:
        return OCRResponse(success=False, error=f"Processing failed: {str(e)}")


@app.post("/ocr/base64", response_model=OCRResponse)
async def ocr_base64_endpoint(image_data: dict):
    """
    Receive a base64-encoded image and perform OCR.
    JSON body: {"image": "base64encodedstring", "mime_type": "image/png"}
    """
    try:
        if "image" not in image_data:
            raise HTTPException(status_code=400, detail="Missing 'image' field in request body")

        image_bytes = base64.b64decode(image_data["image"])

        # Validate image size (max 10MB)
        if len(image_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image too large. Maximum size is 10MB.")

        extracted_text = perform_ocr(image_bytes)

        return OCRResponse(success=True, text=extracted_text)

    except HTTPException:
        raise
    except base64.binascii.Error:
        raise HTTPException(status_code=400, detail="Invalid base64 encoding")
    except Exception as e:
        return OCRResponse(success=False, error=f"Processing failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
