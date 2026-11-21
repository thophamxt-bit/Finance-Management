import io
import sys
from PIL import Image, ImageDraw

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from ocr_engine import extract_receipt_data

def create_sample_receipt_image():
    img = Image.new('RGB', (400, 600), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    d.text((50, 40), 'HIGHLANDS COFFEE', fill=(0, 0, 0))
    d.text((50, 80), 'Dia chi: 123 Nguyen Hue, Q1, TP.HCM', fill=(100, 100, 100))
    d.text((50, 120), 'Ngay: 05/09/2026 14:30', fill=(0, 0, 0))
    d.text((50, 160), '--------------------------------', fill=(150, 150, 150))
    d.text((50, 200), '1. Tra Sen Vang (L)     65.000', fill=(0, 0, 0))
    d.text((50, 240), '2. Banh Mi Que Pate     20.000', fill=(0, 0, 0))
    d.text((50, 280), '--------------------------------', fill=(150, 150, 150))
    d.text((50, 320), 'TONG TIEN:              85.000 VND', fill=(0, 0, 0))
    d.text((50, 360), 'Cam on quy khach!', fill=(100, 100, 100))
    
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()

def run_test():
    img_bytes = create_sample_receipt_image()
    print('[TEST] Bat dau kiem thu trich xuat hoa don...')
    result = extract_receipt_data(img_bytes)
    print(f'[TEST] Ket qua thanh cong: {result.success}')
    print(f'[TEST] Ten cua hang: {result.merchant_name}')
    print(f'[TEST] Tong tien: {result.total_amount:,.0f} VND')
    print(f'[TEST] Ngay gio: {result.transaction_date}')
    print(f'[TEST] Danh muc goi y: {result.suggested_category}')
    print(f'[TEST] Chiec lo goi y: {result.suggested_jar}')
    print(f'[TEST] So luong mat hang: {len(result.items)}')
    print(f'[TEST] Nguon: {result.source}')
    assert result.success is True
    assert result.total_amount > 0
    print('[TEST] => KIEM THU OCR ENGINE HOAN TOAN THANH CONG!')

if __name__ == '__main__':
    run_test()
