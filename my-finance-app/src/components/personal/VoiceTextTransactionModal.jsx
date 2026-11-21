import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// Helper ánh xạ danh mục sang biểu tượng Material Symbols
const getCategoryIcon = (categoryName) => {
    if (!categoryName) return 'category';
    const name = categoryName.toLowerCase();
    if (name.includes('ăn') || name.includes('uống') || name.includes('nhà hàng') || name.includes('cafe') || name.includes('phở') || name.includes('trà')) return 'restaurant';
    if (name.includes('giáo dục') || name.includes('học') || name.includes('sách') || name.includes('khóa học')) return 'school';
    if (name.includes('giải trí') || name.includes('game') || name.includes('phim') || name.includes('du lịch')) return 'sports_esports';
    if (name.includes('mua sắm') || name.includes('siêu thị') || name.includes('chợ') || name.includes('quần') || name.includes('áo')) return 'shopping_cart';
    if (name.includes('đi lại') || name.includes('xe') || name.includes('xăng') || name.includes('grab') || name.includes('di chuyển')) return 'directions_car';
    if (name.includes('hoá đơn') || name.includes('hóa đơn') || name.includes('điện') || name.includes('nước') || name.includes('internet') || name.includes('nhà')) return 'receipt_long';
    if (name.includes('sức khỏe') || name.includes('thuốc') || name.includes('khám') || name.includes('bệnh')) return 'medical_services';
    if (name.includes('lương') || name.includes('thu nhập') || name.includes('thưởng')) return 'payments';
    if (name.includes('tiết kiệm') || name.includes('đầu tư')) return 'savings';
    if (name.includes('cho đi') || name.includes('từ thiện')) return 'volunteer_activism';
    return 'category';
};

// Client-side NLP Rule Fallback nếu mọi backend đều đang bận
const clientNlpParse = (text) => {
    const rawLower = text.toLowerCase().trim();
    let amount = 0;

    const compoundMatch = rawLower.match(/(\d+(?:[\.,]\d+)?)\s*(?:triệu|tr)\s*(\d+)(?:\s*(?:trăm|k|nghìn|ngàn))?/);
    if (compoundMatch) {
        const millions = parseFloat(compoundMatch[1].replace(',', '.'));
        const fractionStr = compoundMatch[2];
        let fraction = 0;
        if (fractionStr.length === 1) fraction = parseFloat(fractionStr) * 100000;
        else if (fractionStr.length === 2) fraction = parseFloat(fractionStr) * 10000;
        else if (fractionStr.length === 3) fraction = parseFloat(fractionStr) * 1000;
        else fraction = parseFloat(fractionStr);
        amount = millions * 1000000 + fraction;
    } else if (rawLower.includes("nửa triệu")) {
        amount = 500000;
    } else if (rawLower.includes("vài chục")) {
        amount = 50000;
    }

    if (amount === 0) {
        const mTr = rawLower.match(/(\d+(?:[\.,]\d+)?)\s*(?:triệu|tr)\b/);
        if (mTr) amount = parseFloat(mTr[1].replace(',', '.')) * 1000000;
    }

    if (amount === 0) {
        const mK = rawLower.match(/(\d+(?:[\.,]\d+)?)\s*(?:nghìn|ngàn|k)\b/);
        if (mK) amount = parseFloat(mK[1].replace(',', '.')) * 1000;
    }

    if (amount === 0) {
        const mNum = rawLower.match(/(\d{1,3}(?:[\.,]\d{3})+|\d{4,12})\s*(?:đ|vnd|dong|đồng)?\b/);
        if (mNum) amount = parseFloat(mNum[1].replace(/[^\d]/g, ''));
    }

    if (amount === 0) {
        const mSmall = rawLower.match(/(?:hết|tốn|mất|cho|là)\s*(\d+)\b/);
        if (mSmall) {
            const v = parseFloat(mSmall[1]);
            amount = v < 1000 ? v * 1000 : v;
        }
    }

    const isIncome = rawLower.includes('lương') || rawLower.includes('thưởng') || rawLower.includes('thu nhập')
        || rawLower.includes('được cho') || rawLower.includes('lì xì') || rawLower.includes('tiền về');
    const transactionType = isIncome ? 'INCOME' : 'EXPENSE';

    let catName = 'Khác';
    let jarName = 'NECESSITIES';

    if (/trứng|gà|thịt|bò|cá|cơm|phở|bún|bánh|mì|lẩu|nướng|trà sữa|cafe|cà phê|nước|ăn|uống|quán|nhà hàng/.test(rawLower)) {
        catName = 'Ăn uống';
        jarName = 'NECESSITIES';
    } else if (/xăng|đổ xăng|xe|gửi xe|rửa xe|grab|gojek|be|taxi|vé xe|bus/.test(rawLower)) {
        catName = 'Đi lại';
        jarName = 'NECESSITIES';
    } else if (/quần|áo|giày|dép|mua sắm|siêu thị|chợ|mỹ phẩm|shopee|lazada|tiki/.test(rawLower)) {
        catName = 'Mua sắm';
        jarName = 'NECESSITIES';
    } else if (/học|học phí|sách|vở|khóa học|tiếng anh|ielts|toeic|bút/.test(rawLower)) {
        catName = 'Giáo dục';
        jarName = 'EDUCATION';
    } else if (/xem phim|phim|cgv|netflix|spotify|game|du lịch|karaoke|bar|pub/.test(rawLower)) {
        catName = 'Giải trí';
        jarName = 'PLAY';
    } else if (/tiền điện|tiền nước|điện|nước|internet|wifi|tiền nhà|tiền phòng|tiền trọ/.test(rawLower)) {
        catName = 'Hoá đơn';
        jarName = 'NECESSITIES';
    } else if (/thuốc|khám|bệnh viện|bác sĩ|nha khoa|răng|long châu/.test(rawLower)) {
        catName = 'Sức khỏe';
        jarName = 'NECESSITIES';
    } else if (isIncome) {
        catName = 'Thu nhập';
        jarName = 'FINANCIAL_FREE';
    }

    let note = rawLower.replace(/(?:hết|tốn|mất|khoảng|tầm|khoản|được|giá|cho)?\s*\d+[\.,]?\d*\s*(?:triệu|tr|nghìn|ngàn|k|đ|vnd|dong|đồng)?.*$/, '').trim();
    note = note.replace(/^(?:sáng nay|chiều nay|tối qua|hôm qua|hôm nay|vừa|mới|mình|tôi|em|anh|chị)\s*/, '').trim();
    if (!note) {
        note = (isIncome ? "Khoản thu " : "Chi tiêu ") + catName.toLowerCase();
    } else {
        note = note.charAt(0).toUpperCase() + note.slice(1);
    }

    return {
        amount,
        transactionType,
        suggestedCategoryName: catName,
        suggestedCategoryIcon: getCategoryIcon(catName),
        suggestedJar: jarName,
        note,
        source: 'client-nlp-fast',
        confidence: 0.95
    };
};

const VoiceTextTransactionModal = ({ isOpen, onClose, onApplyData, onDirectSave, accounts = [] }) => {
    const [inputText, setInputText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [speechSupported, setSpeechSupported] = useState(true);
    const [parsedResult, setParsedResult] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    const [selectedAccountId, setSelectedAccountId] = useState(accounts?.[0]?.id || null);
    const [saving, setSaving] = useState(false);

    const recognitionRef = useRef(null);
    const textareaRef = useRef(null);

    // Kiểm tra và khởi tạo Web Speech API
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setSpeechSupported(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'vi-VN';
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onstart = () => {
            setIsListening(true);
            setErrorMsg(null);
        };

        recognition.onresult = (event) => {
            let currentTranscript = '';
            for (let i = 0; i < event.results.length; i++) {
                currentTranscript += event.results[i][0].transcript;
            }
            if (currentTranscript) {
                setInputText(currentTranscript);
            }
        };

        recognition.onerror = (event) => {
            console.warn('Lỗi nhận dạng giọng nói:', event.error);
            setIsListening(false);
            if (event.error === 'not-allowed') {
                setErrorMsg('Quyền truy cập Micro bị từ chối! Vui lòng cho phép Micro trên trình duyệt hoặc gõ trực tiếp vào ô văn bản.');
            } else if (event.error === 'no-speech') {
                // Không nghe thấy tiếng nói, không báo lỗi quá mức
            } else {
                setErrorMsg(`Lỗi giọng nói: ${event.error}. Bạn hãy nhập bằng bàn phím nhé!`);
            }
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;

        return () => {
            try {
                if (recognitionRef.current) recognitionRef.current.abort();
            } catch (ignored) {}
        };
    }, []);

    // Tự động kích hoạt nhận diện AI khi người dùng nói xong
    useEffect(() => {
        if (!isListening && inputText.trim().length > 3 && !parsedResult && !isProcessing) {
            handleAnalyze(inputText.trim());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isListening]);

    useEffect(() => {
        if (accounts && accounts.length > 0 && !selectedAccountId) {
            setSelectedAccountId(accounts[0].id);
        }
    }, [accounts, selectedAccountId]);

    if (!isOpen) return null;

    const toggleListening = () => {
        if (!speechSupported) {
            setErrorMsg('Trình duyệt không hỗ trợ Web Speech API. Bạn vui lòng gõ nội dung vào ô văn bản.');
            return;
        }

        if (isListening) {
            try {
                recognitionRef.current?.stop();
            } catch (ignored) {}
            setIsListening(false);
        } else {
            setErrorMsg(null);
            setParsedResult(null);
            try {
                recognitionRef.current?.start();
            } catch (err) {
                console.error('Không thể bắt đầu thu âm:', err);
                setErrorMsg('Không thể mở Micro. Vui lòng kiểm tra quyền trên trình duyệt.');
            }
        }
    };

    const handleAnalyze = async (textToParse) => {
        const text = (textToParse || inputText).trim();
        if (!text) {
            setErrorMsg('Vui lòng nhập hoặc nói một câu chi tiêu (Ví dụ: "Mua trứng gà hết 50 nghìn")');
            return;
        }

        setIsProcessing(true);
        setErrorMsg(null);

        const token = localStorage.getItem('token');
        let parsed = null;

        // Kênh 1: Spring Boot Backend Gateway (/api/receipts/parse-text)
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await axios.post('http://localhost:8080/api/receipts/parse-text', { text }, {
                headers,
                timeout: 5000
            });

            if (res.data && (res.data.success || res.data.amount !== undefined)) {
                parsed = {
                    amount: res.data.amount || 0,
                    transactionType: res.data.transactionType || 'EXPENSE',
                    suggestedCategoryId: res.data.suggestedCategoryId,
                    suggestedCategoryName: res.data.suggestedCategoryName || 'Khác',
                    suggestedCategoryIcon: res.data.suggestedCategoryIcon || getCategoryIcon(res.data.suggestedCategoryName),
                    suggestedJar: res.data.suggestedJar || 'NECESSITIES',
                    note: res.data.note || text,
                    transactionDate: res.data.transactionDate,
                    source: res.data.source || 'spring-boot-ai'
                };
            }
        } catch (springErr) {
            console.warn('Backend Gateway chưa sẵn sàng, thử gọi trực tiếp Python Microservice:', springErr.message);
        }

        // Kênh 2: Python OCR/AI Microservice trực tiếp (port 8001)
        if (!parsed) {
            try {
                const microRes = await axios.post('http://localhost:8001/api/v1/parse-text', { text }, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 8000
                });

                if (microRes.data && (microRes.data.success || microRes.data.amount !== undefined)) {
                    parsed = {
                        amount: microRes.data.amount || 0,
                        transactionType: microRes.data.transaction_type || 'EXPENSE',
                        suggestedCategoryName: microRes.data.suggested_category || 'Khác',
                        suggestedCategoryIcon: getCategoryIcon(microRes.data.suggested_category),
                        suggestedJar: microRes.data.suggested_jar || 'NECESSITIES',
                        note: microRes.data.note || text,
                        transactionDate: microRes.data.transaction_date,
                        source: microRes.data.source || 'fastapi-gemini'
                    };
                }
            } catch (microErr) {
                console.warn('Python Microservice chưa sẵn sàng, chuyển sang bộ xử lý thông minh Client:', microErr.message);
            }
        }

        // Kênh 3: Client-side NLP Rule Fallback (Độ trễ 0ms - Luôn luôn thành công)
        if (!parsed) {
            parsed = clientNlpParse(text);
        }

        if (parsed) {
            setParsedResult(parsed);
        } else {
            setErrorMsg('Không thể bóc tách số tiền từ câu nói này. Bạn vui lòng thử lại câu rõ ràng hơn!');
        }

        setIsProcessing(false);
    };

    const handleApply = () => {
        if (!parsedResult) return;
        if (onApplyData) {
            onApplyData(parsedResult);
        }
        handleClose();
    };

    const handleDirectSave = async () => {
        if (!parsedResult) return;
        if (!selectedAccountId && accounts.length > 0) {
            return setErrorMsg('Vui lòng chọn ví/tài khoản để ghi nhận giao dịch!');
        }

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const nowIso = new Date().toISOString().slice(0, 16);

            await axios.post('http://localhost:8080/api/transactions', {
                amount: parsedResult.amount,
                categoryId: parsedResult.suggestedCategoryId || null,
                accountId: selectedAccountId || (accounts[0] ? accounts[0].id : null),
                transactionDate: parsedResult.transactionDate || nowIso,
                note: parsedResult.note || inputText,
                type: parsedResult.transactionType || 'EXPENSE',
                aiRawText: inputText
            }, { headers: { Authorization: `Bearer ${token}` } });

            if (onDirectSave) {
                onDirectSave(parsedResult);
            }
            alert(`Đã ghi nhận thành công ${parsedResult.transactionType === 'EXPENSE' ? 'khoản chi' : 'khoản thu'}: ${formatMoney(parsedResult.amount)}!`);
            handleClose();
        } catch (err) {
            console.error('Lỗi khi lưu giao dịch nhanh:', err);
            setErrorMsg(err.response?.data?.message || 'Không thể lưu giao dịch. Vui lòng kiểm tra lại!');
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        if (isListening) {
            try { recognitionRef.current?.stop(); } catch (ignored) {}
        }
        setIsListening(false);
        setInputText('');
        setParsedResult(null);
        setErrorMsg(null);
        setIsProcessing(false);
        onClose();
    };

    const formatMoney = (val) => {
        if (!val) return '0 ₫';
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
    };

    const sampleChips = [
        { label: '🥚 Mua trứng gà hết 50 nghìn', text: 'mua trứng gà hết 50 nghìn' },
        { label: '🍜 Ăn phở bò 45k', text: 'ăn phở bò 45k' },
        { label: '⛽ Đổ xăng xe máy 50k', text: 'đổ xăng xe máy 50k' },
        { label: '☕ Cà phê Highlands 65k', text: 'uống cà phê highland hết 65 nghìn' },
        { label: '📚 Mua sách tiếng Anh 250k', text: 'mua sách tiếng anh hết 250 ngàn' },
        { label: '🎬 Xem phim CGV 180k', text: 'đi xem phim cgv hết 180k' },
        { label: '⚡ Đóng tiền điện 650 ngàn', text: 'đóng tiền điện 650 ngàn' },
        { label: '💵 Nhận lương tháng này 15 triệu', text: 'tiền lương tháng này nhận 15 triệu' }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-violet-500/10 via-primary/5 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-violet-600 to-primary text-white flex items-center justify-center font-bold shadow-md shadow-primary/20">
                            <span className="material-symbols-outlined text-2xl">mic</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                                Nhập Giọng Nói & AI Text
                                <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 flex items-center gap-1 shadow-sm">
                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-ping"></span>
                                    ⚡ AI Voice
                                </span>
                            </h2>
                            <p className="text-xs text-slate-500 font-medium">Bấm micro để nói hoặc gõ tự nhiên, AI tự bóc tách số tiền & danh mục</p>
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
                    {/* Thông báo lỗi nếu có */}
                    {errorMsg && (
                        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 flex items-start gap-3 animate-in fade-in">
                            <span className="material-symbols-outlined text-red-500 mt-0.5">error</span>
                            <div className="text-xs flex-1">
                                <p className="font-bold">Thông báo</p>
                                <p className="mt-0.5 whitespace-pre-line">{errorMsg}</p>
                            </div>
                        </div>
                    )}

                    {/* Khung Micro & Sóng âm trực tiếp */}
                    <div className="flex flex-col items-center justify-center py-4 bg-gradient-to-b from-slate-50 to-white rounded-3xl border border-slate-100 p-6 relative overflow-hidden">
                        {/* Nút Micro to trung tâm */}
                        <div className="relative mb-3">
                            {isListening && (
                                <>
                                    <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping scale-150"></div>
                                    <div className="absolute -inset-3 rounded-full bg-red-500/10 animate-pulse scale-125"></div>
                                </>
                            )}
                            <button
                                type="button"
                                onClick={toggleListening}
                                className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer select-none
                                    ${isListening
                                        ? 'bg-gradient-to-tr from-red-500 to-rose-600 text-white scale-110 shadow-red-500/40 animate-pulse'
                                        : 'bg-gradient-to-tr from-violet-600 to-primary text-white hover:scale-105 shadow-primary/30'
                                    }`}
                                title={isListening ? "Bấm để dừng nói" : "Bấm để bắt đầu nói"}
                            >
                                <span className="material-symbols-outlined text-4xl">
                                    {isListening ? 'mic' : 'mic_none'}
                                </span>
                            </button>
                        </div>

                        {/* Trạng thái lắng nghe */}
                        <div className="text-center space-y-1">
                            {isListening ? (
                                <div className="space-y-1">
                                    <p className="text-sm font-black text-red-600 flex items-center justify-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                                        Đang lắng nghe bạn nói...
                                    </p>
                                    <p className="text-xs text-slate-400 font-medium">Hãy nói rõ số tiền & việc chi tiêu (Ví dụ: "Mua trứng gà 50 nghìn")</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-slate-700">
                                        {speechSupported ? 'Chạm vào micro để nói' : 'Micro chưa hỗ trợ trên trình duyệt này'}
                                    </p>
                                    <p className="text-xs text-slate-400 font-medium">Hoặc bạn có thể gõ nội dung câu vào ô bên dưới</p>
                                </div>
                            )}
                        </div>

                        {/* Visualizer sóng âm thanh khi đang nói */}
                        {isListening && (
                            <div className="flex items-center gap-1.5 mt-4 h-6">
                                {[40, 75, 55, 95, 60, 85, 45, 90, 70, 50, 80, 65].map((h, idx) => (
                                    <span
                                        key={idx}
                                        className="w-1 bg-gradient-to-t from-red-500 to-rose-400 rounded-full animate-pulse"
                                        style={{
                                            height: `${h}%`,
                                            animationDelay: `${(idx * 0.08).toFixed(2)}s`
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Ô nhập văn bản / Hiển thị câu nói thời gian thực */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Nội dung nhận diện hoặc bạn muốn nhập:
                            </label>
                            {inputText && (
                                <button
                                    type="button"
                                    onClick={() => { setInputText(''); setParsedResult(null); }}
                                    className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
                                >
                                    Xoá
                                </button>
                            )}
                        </div>
                        <div className="relative">
                            <textarea
                                ref={textareaRef}
                                rows={2}
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="Ví dụ: Mua trứng gà hết 50 nghìn, hoặc Đổ xăng 50k, hoặc Nhận lương 15 triệu..."
                                className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 rounded-2xl p-4 text-sm font-semibold text-slate-800 outline-none transition-all resize-none shadow-inner"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleAnalyze();
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => handleAnalyze()}
                                disabled={isProcessing || !inputText.trim()}
                                className={`absolute right-3 bottom-3 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm
                                    ${isProcessing || !inputText.trim()
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-violet-600 to-primary text-white hover:scale-105 active:scale-95'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-base">
                                    {isProcessing ? 'sync' : 'auto_awesome'}
                                </span>
                                {isProcessing ? 'Đang phân tích...' : 'Phân tích AI'}
                            </button>
                        </div>
                    </div>

                    {/* Các câu mẫu nhanh 1 chạm */}
                    <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 block">
                            Thử nhanh các câu mẫu phổ biến:
                        </span>
                        <div className="flex flex-wrap gap-2">
                            {sampleChips.map((chip, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                        setInputText(chip.text);
                                        handleAnalyze(chip.text);
                                    }}
                                    className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200 border border-slate-200/60 transition-all active:scale-95 cursor-pointer"
                                >
                                    {chip.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* KẾT QUẢ PHÂN TÍCH AI (Preview Card) */}
                    {parsedResult && (
                        <div className="p-5 rounded-3xl bg-gradient-to-br from-violet-50 via-slate-50 to-white border-2 border-violet-200/80 shadow-lg shadow-violet-500/5 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-center justify-between pb-3 border-b border-violet-100">
                                <span className="text-xs font-black uppercase tracking-wider text-violet-700 flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-base text-violet-600">verified</span>
                                    Kết quả AI bóc tách
                                </span>
                                <span className={`text-[11px] font-bold px-3 py-0.5 rounded-full ${parsedResult.transactionType === 'INCOME' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                    {parsedResult.transactionType === 'INCOME' ? '💰 Khoản thu' : '💸 Khoản chi'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Số tiền</span>
                                    <span className={`text-2xl font-black block mt-0.5 ${parsedResult.transactionType === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {formatMoney(parsedResult.amount)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Danh mục đề xuất</span>
                                    <span className="text-sm font-black text-slate-800 flex items-center gap-1.5 mt-1">
                                        <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                            <span className="material-symbols-outlined text-base">{parsedResult.suggestedCategoryIcon || 'category'}</span>
                                        </span>
                                        {parsedResult.suggestedCategoryName || 'Khác'}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 text-xs">
                                <div>
                                    <span className="text-slate-400 font-medium block">Chiếc lọ áp dụng:</span>
                                    <span className="font-bold text-slate-700 inline-block px-2 py-0.5 rounded bg-slate-100 mt-0.5">
                                        {parsedResult.suggestedJar || 'NECESSITIES'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 font-medium block">Ghi chú tạo sẵn:</span>
                                    <span className="font-bold text-slate-700 truncate block mt-0.5">
                                        {parsedResult.note || 'Chi tiêu'}
                                    </span>
                                </div>
                            </div>

                            {/* Lựa chọn tài khoản nếu lưu trực tiếp */}
                            {accounts && accounts.length > 0 && (
                                <div className="pt-2 border-t border-slate-100">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                                        {parsedResult.transactionType === 'INCOME' ? 'Cộng vào tài khoản / ví:' : 'Trừ tiền từ tài khoản / ví:'}
                                    </label>
                                    <select
                                        value={selectedAccountId || ''}
                                        onChange={(e) => setSelectedAccountId(Number(e.target.value))}
                                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 outline-none focus:border-primary"
                                    >
                                        {accounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>
                                                {acc.accountName} ({formatMoney(acc.balance)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Các nút hành động */}
                            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleApply}
                                    className="flex-1 py-3.5 rounded-2xl bg-white border-2 border-violet-200 hover:border-violet-400 text-violet-700 font-black text-xs shadow-sm hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-base">edit_note</span>
                                    Điền vào biểu mẫu
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDirectSave}
                                    disabled={saving || !parsedResult.amount}
                                    className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-primary text-white font-black text-xs shadow-lg shadow-violet-600/25 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-base">
                                        {saving ? 'sync' : 'check_circle'}
                                    </span>
                                    {saving ? 'Đang lưu...' : 'Lưu giao dịch ngay'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5 text-violet-600 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-violet-500"></span>
                        AI Voice & Text Assistant (~0.1s)
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

export default VoiceTextTransactionModal;