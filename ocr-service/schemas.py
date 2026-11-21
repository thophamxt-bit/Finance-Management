from typing import List, Optional
from pydantic import BaseModel, Field

class ReceiptItem(BaseModel):
    name: str = Field(..., description="Tên sản phẩm hoặc dịch vụ")
    quantity: Optional[float] = Field(default=1.0, description="Số lượng")
    unit_price: Optional[float] = Field(default=None, description="Đơn giá (VNĐ)")
    total_price: Optional[float] = Field(default=None, description="Thành tiền (VNĐ)")

class ReceiptScanResult(BaseModel):
    success: bool = True
    merchant_name: Optional[str] = Field(default="Cửa hàng / Dịch vụ", description="Tên cửa hàng, nhà hàng hoặc đơn vị phát hành hoá đơn")
    total_amount: float = Field(default=0.0, description="Tổng số tiền thanh toán (VNĐ)")
    transaction_date: Optional[str] = Field(default=None, description="Ngày giờ giao dịch theo định dạng YYYY-MM-DDTHH:mm:ss")
    suggested_category: Optional[str] = Field(default="Ăn uống", description="Danh mục chi tiêu gợi ý")
    suggested_jar: Optional[str] = Field(default="NECESSITIES", description="Chiếc lọ tài chính gợi ý (NECESSITIES, PLAY, EDUCATION, FINANCIAL_FREE, LONG_TERM_SAVE, GIVE)")
    items: List[ReceiptItem] = Field(default_factory=list, description="Chi tiết các mục trong hoá đơn")
    note: Optional[str] = Field(default="", description="Ghi chú tổng hợp cho giao dịch")
    raw_text: Optional[str] = Field(default="", description="Văn bản bóc tách thô từ hoá đơn")
    confidence: float = Field(default=0.9, description="Độ tin cậy của AI (0.0 - 1.0)")
    source: str = Field(default="gemini-vision", description="Nguồn trích xuất (gemini-vision hoặc mock-engine)")

class ErrorResponse(BaseModel):
    success: bool = False
    message: str

class TextParseRequest(BaseModel):
    text: str = Field(..., description="Văn bản hoặc câu nói cần bóc tách giao dịch (VD: Mua trứng gà hết 50 nghìn)")
    categories: Optional[List[str]] = Field(default=None, description="Danh sách danh mục có sẵn của người dùng để ưu tiên đối soát")

class TextParseResult(BaseModel):
    success: bool = True
    amount: float = Field(default=0.0, description="Số tiền giao dịch (VNĐ)")
    transaction_type: str = Field(default="EXPENSE", description="EXPENSE (chi tiêu) hoặc INCOME (thu nhập)")
    suggested_category: str = Field(default="Ăn uống", description="Tên danh mục phù hợp nhất")
    suggested_jar: str = Field(default="NECESSITIES", description="Chiếc lọ tài chính gợi ý (NECESSITIES, PLAY, EDUCATION, FINANCIAL_FREE, LONG_TERM_SAVE, GIVE)")
    note: str = Field(default="", description="Nội dung/ghi chú giao dịch")
    merchant_name: Optional[str] = Field(default=None, description="Cửa hàng hoặc người nhận nếu có")
    transaction_date: Optional[str] = Field(default=None, description="Ngày giờ giao dịch theo định dạng YYYY-MM-DDTHH:mm:ss")
    confidence: float = Field(default=0.95, description="Độ tin cậy của AI (0.0 - 1.0)")
    source: str = Field(default="gemini-ai", description="Nguồn phân tích (gemini-ai hoặc rule-engine)")
    raw_text: str = Field(default="", description="Câu nói/văn bản gốc của người dùng")

class AdvisorChatRequest(BaseModel):
    question: str = Field(..., description="Câu hỏi tư vấn tài chính của người dùng")
    context: Optional[dict] = Field(default=None, description="Ngữ cảnh tài chính thực tế từ tài khoản người dùng")
    history: Optional[List[dict]] = Field(default=None, description="Lịch sử hội thoại gần đây")

