import os
from typing import Optional
from dotenv import load_dotenv, set_key
from fastapi import FastAPI, File, UploadFile, HTTPException, Header, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from schemas import ReceiptScanResult, ErrorResponse, TextParseRequest, TextParseResult, AdvisorChatRequest
from ocr_engine import extract_receipt_data, parse_text_transaction
from financial_advisor import generate_advisor_reply

load_dotenv()

app = FastAPI(
    title="Receipt OCR Microservice",
    description="Microservice trích xuất hoá đơn & biên lai thực tế bằng Gemini Vision AI",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

ENV_FILE_PATH = os.path.join(os.path.dirname(__file__), ".env")

@app.get("/health", summary="Kiểm tra trạng thái Microservice")
def health_check():
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    return {
        "status": "UP",
        "service": "receipt-ocr-microservice",
        "has_api_key": bool(gemini_key),
        "ai_engine": "gemini-vision-real" if gemini_key else "waiting-for-api-key"
    }

@app.post("/api/v1/config/api-key", summary="Cấu hình GEMINI_API_KEY cho hệ thống")
def save_api_key(payload: dict = Body(...)):
    new_key = payload.get("api_key", "").strip()
    if not new_key:
        raise HTTPException(status_code=400, detail="API Key không được để trống!")
    
    os.environ["GEMINI_API_KEY"] = new_key
    try:
        if not os.path.exists(ENV_FILE_PATH):
            with open(ENV_FILE_PATH, "w", encoding="utf-8") as f:
                f.write(f"GEMINI_API_KEY={new_key}\nPORT=8001\n")
        else:
            set_key(ENV_FILE_PATH, "GEMINI_API_KEY", new_key)
    except Exception as e:
        print(f"Không thể ghi file .env: {e}")
    
    return {"success": True, "message": "Đã lưu GEMINI_API_KEY thành công! Hệ thống sẵn sàng quét ảnh thực tế."}

@app.post(
    "/api/v1/scan-receipt",
    response_model=ReceiptScanResult,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
    summary="Quét và trích xuất hoá đơn thực tế từ hình ảnh"
)
async def scan_receipt(
    file: UploadFile = File(...),
    x_gemini_api_key: Optional[str] = Header(None),
    api_key: Optional[str] = Form(None)
):
    content_type = file.content_type or ""
    if not (content_type.startswith("image/") or file.filename.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".bmp"))):
        raise HTTPException(
            status_code=400,
            detail="File tải lên phải là định dạng hình ảnh (JPEG, PNG, WebP, BMP)"
        )
    
    try:
        image_bytes = file.file.read()
        if len(image_bytes) == 0:
            raise HTTPException(status_code=400, detail="File ảnh rỗng!")
        
        effective_key = x_gemini_api_key or api_key
        result = extract_receipt_data(image_bytes, custom_api_key=effective_key)
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except RuntimeError as re:
        raise HTTPException(status_code=500, detail=str(re))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi xử lý hoá đơn: {e}")

@app.post(
    "/api/v1/parse-text",
    response_model=TextParseResult,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
    summary="Phân tích câu nói hoặc văn bản giao dịch bằng AI"
)
async def parse_text_endpoint(
    payload: TextParseRequest,
    x_gemini_api_key: Optional[str] = Header(None)
):
    try:
        clean_text = (payload.text or "").strip()
        if not clean_text:
            raise HTTPException(status_code=400, detail="Văn bản/câu nói giao dịch không được để trống!")
        
        effective_key = x_gemini_api_key
        result = parse_text_transaction(
            text=clean_text,
            custom_api_key=effective_key,
            user_categories=payload.categories
        )
        return result
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi phân tích câu giao dịch: {e}")

@app.post(
    "/api/v1/chat-advisor",
    summary="Chatbot Cố vấn Tài chính & Tích sản Sinh lời (Hybrid Math + Gemini AI)"
)
async def chat_advisor_endpoint(
    payload: AdvisorChatRequest,
    x_gemini_api_key: Optional[str] = Header(None)
):
    clean_q = (payload.question or "").strip()
    if not clean_q:
        raise HTTPException(status_code=400, detail="Câu hỏi không được để trống!")
    try:
        return generate_advisor_reply(
            question=clean_q,
            context=payload.context,
            history=payload.history,
            custom_api_key=x_gemini_api_key
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý tư vấn tài chính: {e}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
