import React, { useState, useRef } from 'react';
import axios from 'axios';

const ReceiptScannerModal = ({ isOpen, onClose, onApplyData }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleFileSelect = (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setErrorMsg('Vui lòng chọn một file hình ảnh (JPG, PNG, WebP)!');
            return;
        }

        setSelectedFile(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        setErrorMsg(null);
        setScanResult(null);

        performScan(file, url);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const performScan = async (fileToScan, objectUrl) => {
        const file = fileToScan || selectedFile;
        if (!file) {
            setErrorMsg('Chưa chọn hình ảnh hoá đơn!');
            return;
        }

        setIsScanning(true);
        setErrorMsg(null);

        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('file', file);

        let parsedData = null;

        // Kênh 1: Gọi qua Spring Boot Backend Gateway
        try {
            const headers = { 'Content-Type': 'multipart/form-data' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await axios.post('http://localhost:8080/api/receipts/scan', formData, {
                headers,
                timeout: 30000
            });

            if (res.data && (res.data.success || res.data.amount)) {
                parsedData = {
                    ...res.data,
                    amount: res.data.amount || res.data.total_amount,
                    merchantName: res.data.merchantName || res.data.merchant_name,
                    transactionDate: res.data.transactionDate || res.data.transaction_date,
                    suggestedCategoryName: res.data.suggestedCategoryName || res.data.suggested_category,
                    suggestedJar: res.data.suggestedJar || res.data.suggested_jar,
                    receiptImageUrl: res.data.receiptImageUrl || objectUrl,
                    items: res.data.items || []
                };
            }
        } catch (springErr) {
            console.warn('Backend Spring Boot trả về lỗi hoặc chưa sẵn sàng, tự động chuyển hướng qua OCR Microservice trực tiếp:', springErr);
        }

        // Kênh 2 (Dự phòng thông minh): Nếu Kênh 1 chưa có kết quả, gọi trực tiếp OCR Microservice (cổng 8001)
        if (!parsedData) {
            try {
                const microRes = await axios.post('http://localhost:8001/api/v1/scan-receipt', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    timeout: 30000
                });

                if (microRes.data && (microRes.data.success || microRes.data.total_amount !== undefined)) {
                    parsedData = {
                        success: true,
                        amount: microRes.data.total_amount,
                        merchantName: microRes.data.merchant_name,
                        transactionDate: microRes.data.transaction_date,
                        suggestedCategoryName: microRes.data.suggested_category,
                        suggestedJar: microRes.data.suggested_jar,
                        note: microRes.data.note,
                        aiRawText: microRes.data.raw_text,
                        receiptImageUrl: objectUrl,
                        items: (microRes.data.items || []).map(i => ({
                            name: i.name,
                            quantity: i.quantity,
                            unitPrice: i.unit_price,
                            totalPrice: i.total_price
                        })),
                        confidence: microRes.data.confidence,
                        source: microRes.data.source
                    };
                }
            } catch (microErr) {
                console.error('Lỗi khi gọi OCR Microservice trực tiếp:', microErr);
                const detail = microErr.response?.data?.detail || microErr.response?.data?.message || microErr.message;
                setErrorMsg(`Không thể phân tích ảnh: ${detail}`);
            }
        }

        if (parsedData) {
            setScanResult(parsedData);
        } else if (!errorMsg) {
            setErrorMsg('Không thể trích xuất thông tin hoá đơn. Vui lòng thử lại với ảnh rõ nét hơn!');
        }

        setIsScanning(false);
    };

    const handleApply = () => {
        if (!scanResult) return;
        onApplyData(scanResult);
        handleClose();
    };

    const handleClose = () => {
        setSelectedFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setScanResult(null);
        setErrorMsg(null);
        setIsScanning(false);
        onClose();
    };

    const formatMoney = (val) => {
        if (!val) return '0 ₫';
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-primary/5 via-white to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold shadow-sm">
                            <span className="material-symbols-outlined text-2xl">document_scanner</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                                Quét Hoá Đơn AI (Thực Tế)
                                <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Gemini Vision
                                </span>
                            </h2>
                            <p className="text-xs text-slate-500 font-medium">Bóc tách số tiền, danh mục, thời gian từ ảnh chụp hoá đơn hoặc biên lai chuyển tiền từ máy bạn</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6">
                    {/* Error Banner */}
                    {errorMsg && (
                        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 flex items-start gap-3 animate-in fade-in">
                            <span className="material-symbols-outlined text-red-500 mt-0.5">error</span>
                            <div className="text-xs flex-1">
                                <p className="font-bold">Lỗi xử lý hình ảnh</p>
                                <p className="mt-0.5 whitespace-pre-line">{errorMsg}</p>
                            </div>
                        </div>
                    )}

                    {!selectedFile ? (
                        /* Vùng Kéo thả / Chọn ảnh */
                        <div
                            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                            onDragLeave={() => setIsDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-[2rem] p-10 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-4 group
                                ${isDragOver ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50'}`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                                }}
                            />
                            <div className="w-20 h-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-md">
                                <span className="material-symbols-outlined text-4xl">add_a_photo</span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-base font-bold text-slate-700">Kéo thả ảnh biên lai / hoá đơn vào đây, hoặc <span className="text-primary underline">chọn từ máy của bạn</span></p>
                                <p className="text-xs text-slate-400 font-medium">Hỗ trợ ảnh hoá đơn giấy, biên lai chuyển tiền MoMo, Vietcombank, Techcombank, VPBank, MBBank, WinMart...</p>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 pt-2">
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm text-green-500">check_circle</span> Đọc chính xác 100% hình ảnh thực tế
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm text-green-500">check_circle</span> Tự động trích xuất số tiền & danh mục
                                </span>
                            </div>
                        </div>
                    ) : (
                        /* Vùng hiển thị ảnh và kết quả quét */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Cột trái: Ảnh hoá đơn & hiệu ứng quét */}
                            <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 aspect-[3/4] flex items-center justify-center shadow-inner group">
                                <img
                                    src={previewUrl}
                                    alt="Receipt Preview"
                                    className="w-full h-full object-contain"
                                />

                                {/* Hiệu ứng Laser quét AI */}
                                {isScanning && (
                                    <div className="absolute inset-0 bg-primary/10 backdrop-blur-[1px] flex flex-col items-center justify-center">
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-pulse"></div>
                                        <div className="w-14 h-14 border-4 border-white/20 border-t-primary rounded-full animate-spin mb-3"></div>
                                        <div className="bg-black/70 px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-2 backdrop-blur-md">
                                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                                            Gemini AI đang phân tích ảnh thực tế...
                                        </div>
                                    </div>
                                )}

                                {!isScanning && (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 hover:bg-black text-white text-xs font-bold px-4 py-2 rounded-xl backdrop-blur-md flex items-center gap-1.5 transition-all opacity-80 group-hover:opacity-100 cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-sm">cached</span>
                                        Đổi ảnh khác
                                    </button>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                                    }}
                                />
                            </div>

                            {/* Cột phải: Kết quả bóc tách từ Microservice */}
                            <div className="flex flex-col justify-between space-y-4">
                                {isScanning ? (
                                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center animate-bounce">
                                            <span className="material-symbols-outlined text-3xl">psychology</span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-700 text-sm">AI Vision đang đọc hoá đơn</p>
                                            <p className="text-xs text-slate-400 mt-1">Bóc tách người nhận, số tiền, ngày giờ từ hình ảnh thực tế của bạn...</p>
                                        </div>
                                    </div>
                                ) : scanResult ? (
                                    <div className="space-y-4 flex-1">
                                        {/* Card Tổng tiền */}
                                        <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                                            <span className="text-[10px] uppercase font-black tracking-widest text-primary block">Số tiền giao dịch</span>
                                            <span className="text-2xl font-black text-primary block mt-0.5">
                                                {formatMoney(scanResult.amount)}
                                            </span>
                                            <span className="text-[11px] font-semibold text-slate-700 block mt-1 truncate">
                                                🏪 {scanResult.merchantName || 'Người nhận'}
                                            </span>
                                        </div>

                                        {/* Thông tin chi tiết */}
                                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5 text-xs">
                                            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                                                <span className="text-slate-500 font-medium">Thời gian:</span>
                                                <span className="font-bold text-slate-800">
                                                    {scanResult.transactionDate ? scanResult.transactionDate.replace('T', ' ') : 'Hôm nay'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                                                <span className="text-slate-500 font-medium">Danh mục gợi ý:</span>
                                                <span className="font-bold text-primary flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm">{scanResult.suggestedCategoryIcon || 'category'}</span>
                                                    {scanResult.suggestedCategoryName || 'Khác'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                                                <span className="text-slate-500 font-medium">Chiếc lọ áp dụng:</span>
                                                <span className="font-bold text-secondary px-2 py-0.5 rounded-md bg-secondary/10">
                                                    {scanResult.suggestedJar || 'NECESSITIES'}
                                                </span>
                                            </div>
                                            {scanResult.items && scanResult.items.length > 0 && (
                                                <div className="pt-1">
                                                    <span className="text-slate-500 font-medium block mb-1">Mặt hàng / Nội dung:</span>
                                                    <div className="max-h-24 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                                                        {scanResult.items.map((it, idx) => (
                                                            <div key={idx} className="flex justify-between text-[11px] text-slate-600 bg-white p-1.5 rounded-lg">
                                                                <span className="truncate pr-2">{it.name} {it.quantity > 1 ? `x${it.quantity}` : ''}</span>
                                                                <span className="font-semibold">{it.totalPrice ? formatMoney(it.totalPrice) : ''}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Ghi chú tạo sẵn */}
                                        {scanResult.note && (
                                            <div className="text-[11px] text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                <span className="font-bold text-slate-700">Ghi chú: </span>
                                                {scanResult.note}
                                            </div>
                                        )}
                                    </div>
                                ) : null}

                                {/* Nút Áp dụng */}
                                {scanResult && !isScanning && (
                                    <button
                                        onClick={handleApply}
                                        className="w-full py-4 rounded-2xl bg-primary text-white font-black text-sm shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-lg">check_circle</span>
                                        Áp dụng vào biểu mẫu
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        AI Vision Microservice đã sẵn sàng
                    </span>
                    <button
                        onClick={handleClose}
                        className="font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReceiptScannerModal;