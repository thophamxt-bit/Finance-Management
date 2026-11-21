import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReceiptScannerModal from '../../components/personal/ReceiptScannerModal';
import VoiceTextTransactionModal from '../../components/personal/VoiceTextTransactionModal';
import CategoryIconPickerModal from '../../components/personal/CategoryIconPickerModal';
import { useLanguage } from '../../context/LanguageContext';

const AddTransaction = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();

    // HÀM LẤY GIỜ HIỆN TẠI (Theo chuẩn ISO 8601 YYYY-MM-DDTHH:mm để nhét vào thẻ input)
    const getVNDateTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    };

    // --- State Giao dịch ---
    const [amount, setAmount] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [selectedAccountId, setSelectedAccountId] = useState(null);

    // ĐÃ SỬA: Lấy sẵn cả ngày lẫn giờ lúc người dùng mới mở trang
    const [date, setDate] = useState(getVNDateTime());

    const [note, setNote] = useState('');
    const [transactionType, setTransactionType] = useState('EXPENSE');

    // --- State Quét Hoá Đơn (AI OCR) & Giọng Nói (AI Voice) ---
    const [showScanModal, setShowScanModal] = useState(false);
    const [showVoiceModal, setShowVoiceModal] = useState(false);
    const [receiptImageUrl, setReceiptImageUrl] = useState('');
    const [aiRawText, setAiRawText] = useState('');

    // --- State Người dùng & Dropdown ---
    const [profileData, setProfileData] = useState({ fullName: '', email: '' });
    const [showDropdown, setShowDropdown] = useState(false);

    // --- State Dữ liệu hệ thống ---
    const [categories, setCategories] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [newCat, setNewCat] = useState({ name: '', jarType: 'NECESSITIES', icon: 'home' });

    // --- State Bill Mặc Định & Thói Quen Hằng Ngày (Quick Bills / Habit Templates) ---
    const DEFAULT_QUICK_BILLS = [
        { id: 'def-coffee', title: 'Cà phê sáng', amount: 25000, type: 'EXPENSE', categoryKeyword: 'ăn uống', icon: 'local_cafe', note: 'Cà phê sáng', timeSlot: 'MORNING', badge: 'Buổi sáng' },
        { id: 'def-breakfast', title: 'Ăn sáng', amount: 35000, type: 'EXPENSE', categoryKeyword: 'ăn uống', icon: 'ramen_dining', note: 'Ăn sáng hằng ngày', timeSlot: 'MORNING', badge: 'Buổi sáng' },
        { id: 'def-lunch', title: 'Cơm trưa văn phòng', amount: 45000, type: 'EXPENSE', categoryKeyword: 'ăn uống', icon: 'lunch_dining', note: 'Cơm trưa văn phòng', timeSlot: 'NOON', badge: 'Buổi trưa' },
        { id: 'def-parking', title: 'Gửi xe / Di chuyển', amount: 10000, type: 'EXPENSE', categoryKeyword: 'di chuyển', icon: 'two_wheeler', note: 'Tiền gửi xe', timeSlot: 'ALL', badge: 'Hằng ngày' },
        { id: 'def-fuel', title: 'Đổ xăng xe máy', amount: 70000, type: 'EXPENSE', categoryKeyword: 'di chuyển', icon: 'local_gas_station', note: 'Đổ xăng xe máy', timeSlot: 'ALL', badge: 'Định kỳ' },
        { id: 'def-snack', title: 'Trà sữa / Ăn vặt', amount: 45000, type: 'EXPENSE', categoryKeyword: 'giải trí', icon: 'icecream', note: 'Trà sữa / ăn vặt chiều', timeSlot: 'AFTERNOON', badge: 'Buổi chiều' },
        { id: 'def-market', title: 'Đi chợ / Siêu thị', amount: 120000, type: 'EXPENSE', categoryKeyword: 'tiền nhà', icon: 'shopping_cart', note: 'Đi chợ mua đồ nấu ăn', timeSlot: 'EVENING', badge: 'Buổi tối' },
        { id: 'def-salary', title: 'Lương hàng tháng', amount: 10000000, type: 'INCOME', categoryKeyword: 'lương', icon: 'payments', note: 'Nhận lương tháng', timeSlot: 'ALL', badge: 'Thu nhập' },
        { id: 'def-bonus', title: 'Thưởng / Làm thêm', amount: 1000000, type: 'INCOME', categoryKeyword: 'thu nhập phụ', icon: 'redeem', note: 'Tiền thưởng / freelance', timeSlot: 'ALL', badge: 'Thu nhập' }
    ];

    const [customBills, setCustomBills] = useState([]);
    const [learnedBills, setLearnedBills] = useState([]);
    const [activeBillTab, setActiveBillTab] = useState('ALL'); // 'ALL' | 'SMART' | 'CUSTOM'
    const [selectedBillId, setSelectedBillId] = useState(null);
    const [saveAsTemplate, setSaveAsTemplate] = useState(false);
    const [templateTitle, setTemplateTitle] = useState('');
    const [showBillModal, setShowBillModal] = useState(false);
    const [quickSavingId, setQuickSavingId] = useState(null);
    const [newBill, setNewBill] = useState({
        title: '',
        amount: '',
        categoryId: '',
        note: '',
        icon: 'bolt'
    });

    const getCurrentTimeSlot = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 10) return 'MORNING';
        if (hour >= 10 && hour < 14) return 'NOON';
        if (hour >= 14 && hour < 18) return 'AFTERNOON';
        return 'EVENING';
    };

    const getStorageKey = (email) => `temoney_quick_bills_${email || localStorage.getItem('username') || 'default'}`;

    // Tự động trích xuất thói quen từ lịch sử giao dịch thực tế của người dùng
    const analyzeHabitTransactions = (txList) => {
        if (!Array.isArray(txList) || txList.length === 0) return;
        const counter = {};
        txList.forEach(tx => {
            const txType = tx.type || tx.transactionType || 'EXPENSE';
            const cleanNote = (tx.note || tx.categoryName || '').trim();
            const amt = Number(tx.amount || 0);
            if (!cleanNote || amt <= 0) return;
            const key = `${txType}_${cleanNote.toLowerCase()}_${amt}`;
            if (!counter[key]) {
                counter[key] = {
                    id: `learned-${key}`,
                    title: cleanNote,
                    amount: amt,
                    type: txType,
                    categoryId: tx.categoryId || null,
                    categoryKeyword: (tx.categoryName || '').toLowerCase(),
                    accountId: tx.accountId || null,
                    icon: tx.categoryIcon || (txType === 'EXPENSE' ? 'history' : 'savings'),
                    note: cleanNote,
                    count: 0,
                    isLearned: true
                };
            }
            counter[key].count += 1;
        });

        const habits = Object.values(counter)
            .sort((a, b) => b.count - a.count)
            .slice(0, 6)
            .map(item => ({
                ...item,
                badge: item.count > 1 ? `Thói quen (${item.count} lần)` : 'Gần đây'
            }));
        setLearnedBills(habits);
    };

    const jarOptions = [
        { label: 'Thiết yếu (55%)', val: 'NECESSITIES', icon: 'home' },
        { label: 'Giáo dục (10%)', val: 'EDUCATION', icon: 'school' },
        { label: 'Hưởng thụ (10%)', val: 'PLAY', icon: 'movie' },
        { label: 'Đầu tư (10%)', val: 'FINANCIAL_FREE', icon: 'trending_up' },
        { label: 'Tiết kiệm (10%)', val: 'LONG_TERM_SAVE', icon: 'savings' },
        { label: 'Cho đi (5%)', val: 'GIVE', icon: 'volunteer_activism' },
    ];

    const fetchData = async () => {
        const token = localStorage.getItem("token");
        if (!token) return navigate("/login");

        const headers = { Authorization: `Bearer ${token}` };

        try {
            const [resCat, resAcc, profileRes, txRes] = await Promise.all([
                axios.get("http://localhost:8080/api/categories", { headers }),
                axios.get("http://localhost:8080/api/accounts", { headers }),
                axios.get("http://localhost:8080/api/auth/profile", { headers }).catch(() => ({ data: {} })),
                axios.get("http://localhost:8080/api/transactions", { headers }).catch(() => ({ data: [] }))
            ]);

            if (resCat.data && Array.isArray(resCat.data)) setCategories(resCat.data);

            if (resAcc.data && Array.isArray(resAcc.data)) {
                setAccounts(resAcc.data);
                if (resAcc.data.length > 0 && !selectedAccountId) {
                    setSelectedAccountId(resAcc.data[0].id);
                }
            }

            if (profileRes.data) {
                const userEmail = profileRes.data.email || 'Chưa cập nhật email';
                setProfileData({
                    fullName: profileRes.data.fullName || profileRes.data.username || 'Người dùng',
                    email: userEmail
                });
                const savedCustom = localStorage.getItem(getStorageKey(userEmail));
                if (savedCustom) {
                    try {
                        setCustomBills(JSON.parse(savedCustom));
                    } catch {
                        setCustomBills([]);
                    }
                }
            }

            if (txRes.data && Array.isArray(txRes.data)) {
                analyzeHabitTransactions(txRes.data);
            }

        } catch (err) {
            console.error("Lỗi lấy dữ liệu:", err);
            if (err.response?.status === 401) {
                localStorage.removeItem("token");
                navigate("/login");
            }
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/login");
    };

    const handleJarChange = (val) => {
        const selectedOption = jarOptions.find(opt => opt.val === val);
        setNewCat({ ...newCat, jarType: val, icon: selectedOption.icon });
    };

    const handleCreateCategory = async () => {
        if (!newCat.name) return alert("Vui lòng nhập tên danh mục!");
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            await axios.post("http://localhost:8080/api/categories", {
                ...newCat,
                type: transactionType
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowModal(false);
            setNewCat({ name: '', jarType: 'NECESSITIES', icon: 'home' });
            await fetchData();
        } catch (err) {
            console.error(err);
            alert("Lỗi: Không thể tạo danh mục.");
        } finally {
            setLoading(false);
        }
    };

    // Tìm categoryId khớp với Bill mẫu
    const resolveCategoryForBill = (bill) => {
        if (bill.categoryId && categories.some(c => c.id === Number(bill.categoryId))) {
            return Number(bill.categoryId);
        }
        const typeFiltered = categories.filter(c =>
            bill.type === 'INCOME' ? c.type === 'INCOME' : (!c.type || c.type === 'EXPENSE')
        );
        if (bill.categoryKeyword) {
            const matched = typeFiltered.find(c =>
                (c.name || '').toLowerCase().includes(bill.categoryKeyword.toLowerCase()) ||
                bill.categoryKeyword.toLowerCase().includes((c.name || '').toLowerCase())
            );
            if (matched) return matched.id;
        }
        return typeFiltered[0]?.id || null;
    };

    // 1. Chạm vào Bill mẫu -> Điền nhanh vào biểu mẫu
    const handleSelectQuickBill = (bill) => {
        setSelectedBillId(bill.id);
        setTransactionType(bill.type || 'EXPENSE');
        setAmount(String(bill.amount));
        setNote(bill.note || bill.title);
        setDate(getVNDateTime());
        if (bill.accountId && accounts.some(a => a.id === bill.accountId)) {
            setSelectedAccountId(bill.accountId);
        }
        const resolvedCatId = resolveCategoryForBill(bill);
        if (resolvedCatId) {
            setSelectedCategoryId(resolvedCatId);
        }
    };

    // 2. Bấm "Lưu 1 chạm" ngay trên thẻ Bill mẫu
    const handleOneTapSaveBill = async (e, bill) => {
        e.stopPropagation();
        const targetAccountId = (bill.accountId && accounts.some(a => a.id === bill.accountId))
            ? bill.accountId
            : (selectedAccountId || accounts[0]?.id);
        if (!targetAccountId) {
            return alert("Vui lòng tạo hoặc chọn ví thanh toán trước!");
        }
        const resolvedCatId = resolveCategoryForBill(bill);
        if ((bill.type || 'EXPENSE') === 'EXPENSE' && !resolvedCatId) {
            handleSelectQuickBill(bill);
            return alert("Vui lòng chọn danh mục chi tiêu cho bill này!");
        }

        setQuickSavingId(bill.id);
        try {
            const token = localStorage.getItem("token");
            await axios.post("http://localhost:8080/api/transactions", {
                amount: parseFloat(bill.amount),
                categoryId: (bill.type || 'EXPENSE') === 'EXPENSE' ? resolvedCatId : resolvedCatId,
                accountId: targetAccountId,
                transactionDate: getVNDateTime(),
                note: bill.note || bill.title,
                type: bill.type || 'EXPENSE'
            }, { headers: { Authorization: `Bearer ${token}` } });

            navigate("/activity");
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Lỗi khi lưu nhanh bill!");
        } finally {
            setQuickSavingId(null);
        }
    };

    // 3. Tạo mới một Bill mặc định của người dùng
    const handleCreateCustomBill = () => {
        if (!newBill.title.trim()) return alert("Vui lòng nhập tên Bill mẫu (VD: Tiền gửi xe, Cà phê...)!");
        if (!newBill.amount || Number(newBill.amount) <= 0) return alert("Vui lòng nhập số tiền hợp lệ!");

        const selectedCatObj = categories.find(c => c.id === Number(newBill.categoryId));
        const created = {
            id: `custom-${Date.now()}`,
            title: newBill.title.trim(),
            amount: Number(newBill.amount),
            type: transactionType,
            categoryId: newBill.categoryId ? Number(newBill.categoryId) : selectedCategoryId,
            categoryKeyword: selectedCatObj ? selectedCatObj.name.toLowerCase() : '',
            accountId: selectedAccountId,
            icon: selectedCatObj?.icon || selectedCatObj?.iconName || newBill.icon || 'bolt',
            note: (newBill.note || newBill.title).trim(),
            badge: 'Mẫu của tôi',
            isCustom: true
        };

        const updated = [created, ...customBills];
        setCustomBills(updated);
        localStorage.setItem(getStorageKey(profileData.email), JSON.stringify(updated));
        setNewBill({ title: '', amount: '', categoryId: '', note: '', icon: 'bolt' });
        setShowBillModal(false);
        handleSelectQuickBill(created);
    };

    // 4. Xoá Bill mẫu cá nhân
    const handleDeleteCustomBill = (e, id) => {
        e.stopPropagation();
        const updated = customBills.filter(b => b.id !== id);
        setCustomBills(updated);
        localStorage.setItem(getStorageKey(profileData.email), JSON.stringify(updated));
    };

    const handleDeleteCategory = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm("Bạn có chắc chắn muốn xóa danh mục này?")) return;
        try {
            const token = localStorage.getItem("token");
            await axios.delete(`http://localhost:8080/api/categories/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (selectedCategoryId === id) setSelectedCategoryId(null);
            await fetchData();
        } catch (err) {
            alert(err.response?.data?.message || "Không thể xóa danh mục này!");
        }
    };

    const handleApplyReceiptData = (data) => {
        if (data.amount) setAmount(String(data.amount));
        if (data.transactionDate) setDate(data.transactionDate);
        if (data.note) setNote(data.note);
        if (data.receiptImageUrl) setReceiptImageUrl(data.receiptImageUrl);
        if (data.aiRawText) setAiRawText(data.aiRawText);
        setTransactionType('EXPENSE');

        if (data.suggestedCategoryId) {
            setSelectedCategoryId(data.suggestedCategoryId);
        } else if (categories.length > 0 && data.suggestedCategoryName) {
            const match = categories.find(c =>
                c.name.toLowerCase().includes(data.suggestedCategoryName.toLowerCase()) ||
                data.suggestedCategoryName.toLowerCase().includes(c.name.toLowerCase())
            );
            if (match) setSelectedCategoryId(match.id);
        }
    };

    const handleApplyVoiceData = (data) => {
        if (data.amount) setAmount(String(data.amount));
        if (data.transactionDate) setDate(data.transactionDate);
        if (data.note) setNote(data.note);
        if (data.type) setTransactionType(data.type);
        if (data.accountId) setSelectedAccountId(data.accountId);
        if (data.categoryId) {
            setSelectedCategoryId(data.categoryId);
        } else if (categories.length > 0 && data.categoryName) {
            const match = categories.find(c =>
                c.name.toLowerCase().includes(data.categoryName.toLowerCase()) ||
                data.categoryName.toLowerCase().includes(c.name.toLowerCase())
            );
            if (match) setSelectedCategoryId(match.id);
        }
    };

    const handleSaveTransaction = async () => {
        if (!amount || amount <= 0) return alert("Vui lòng nhập số tiền hợp lệ!");
        if (!selectedAccountId) return alert("Vui lòng chọn nguồn tiền!");

        if (transactionType === 'EXPENSE' && !selectedCategoryId) {
            return alert("Vui lòng chọn danh mục (Icon)!");
        }

        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            await axios.post("http://localhost:8080/api/transactions", {
                amount: parseFloat(amount),
                categoryId: transactionType === 'EXPENSE' ? selectedCategoryId : null,
                accountId: selectedAccountId,
                transactionDate: date, // Chuỗi lúc này đã dài 16 ký tự, Backend sẽ tự cắt
                note: note,
                type: transactionType,
                receiptImageUrl: receiptImageUrl || null,
                aiRawText: aiRawText || null
            }, { headers: { Authorization: `Bearer ${token}` } });

            // Nếu người dùng tích "Lưu thành Bill mẫu cho lần sau"
            if (saveAsTemplate) {
                const selectedCatObj = categories.find(c => c.id === selectedCategoryId);
                const createdTemplate = {
                    id: `custom-${Date.now()}`,
                    title: (templateTitle || note || selectedCatObj?.name || 'Bill mặc định').trim(),
                    amount: parseFloat(amount),
                    type: transactionType,
                    categoryId: selectedCategoryId,
                    categoryKeyword: selectedCatObj ? selectedCatObj.name.toLowerCase() : '',
                    accountId: selectedAccountId,
                    icon: selectedCatObj?.icon || selectedCatObj?.iconName || 'bolt',
                    note: (note || templateTitle || selectedCatObj?.name || '').trim(),
                    badge: 'Mẫu của tôi',
                    isCustom: true
                };
                const updated = [createdTemplate, ...customBills];
                setCustomBills(updated);
                localStorage.setItem(getStorageKey(profileData.email), JSON.stringify(updated));
            }

            alert("Lưu giao dịch thành công!");
            navigate("/activity");
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Lỗi khi lưu giao dịch!");
        } finally {
            setLoading(false);
        }
    };

    const currentTimeSlot = getCurrentTimeSlot();
    const displayedQuickBills = (() => {
        const byType = (b) => (b.type || 'EXPENSE') === transactionType;
        if (activeBillTab === 'CUSTOM') {
            return customBills.filter(byType);
        }
        if (activeBillTab === 'SMART') {
            const smartDefaults = DEFAULT_QUICK_BILLS.filter(b =>
                byType(b) && (b.timeSlot === currentTimeSlot || b.timeSlot === 'ALL')
            );
            return [...learnedBills.filter(byType), ...smartDefaults];
        }
        // 'ALL': ưu tiên Mẫu cá nhân -> Thói quen tự học -> Bill mặc định
        return [
            ...customBills.filter(byType),
            ...learnedBills.filter(byType),
            ...DEFAULT_QUICK_BILLS.filter(byType)
        ];
    })();

    return (
        <div className="bg-[#fcf8f4] min-h-screen pb-10 font-body antialiased">
            <nav className="bg-white p-4 shadow-xs mb-8 border-b border-amber-100/80 relative z-40">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="w-10 h-10 flex items-center justify-center rounded-full text-slate-500 hover:bg-amber-50 hover:text-amber-800 transition-all active:scale-95"
                            title="Quay lại Dashboard"
                        >
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <div onClick={() => navigate('/dashboard')} className="flex items-center gap-2.5 cursor-pointer">
                            <img src="/Teemoney.png" alt="Temoney Logo" className="w-8 h-8 object-contain drop-shadow-sm" />
                            <span className="text-xl font-black text-amber-950 tracking-tight">
                                Temoney
                            </span>
                        </div>
                    </div>

                    <div className="relative">
                        <div
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold border-2 border-white shadow-sm cursor-pointer hover:scale-105 transition-all select-none"
                            title="Tùy chọn tài khoản"
                        >
                            {(profileData.fullName || 'U').charAt(0).toUpperCase()}
                        </div>

                        {showDropdown && (
                            <div className="absolute right-0 mt-3 w-60 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-slate-100 p-2 animate-in fade-in slide-in-from-top-2">
                                <div className="px-3 py-3 border-b border-slate-100 mb-2">
                                    <p className="text-sm font-bold text-slate-800 truncate">{profileData.fullName}</p>
                                    <p className="text-xs text-slate-500 truncate mt-0.5">{profileData.email}</p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-3 active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-sm">logout</span>
                                    Đăng xuất
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto px-4">
                {/* Header Tiêu đề & Nút Quét Hoá Đơn AI */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
                    <div>
                        <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                            Thêm Giao Dịch
                            <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">Mới</span>
                        </h1>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">Nhập tay hoặc quét ảnh hoá đơn tự động bóc tách bằng AI Microservice</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => setShowVoiceModal(true)}
                            className="flex-1 sm:flex-initial px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white font-black text-xs shadow-lg shadow-emerald-600/25 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 group cursor-pointer"
                            title="Nói để AI tự động trích xuất thông tin giao dịch"
                        >
                            <span className="material-symbols-outlined text-lg group-hover:scale-110 transition-transform">mic</span>
                            Giọng Nói (AI Voice)
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowScanModal(true)}
                            className="flex-1 sm:flex-initial px-4 py-3 rounded-2xl bg-gradient-to-r from-primary via-primary-container to-blue-700 text-white font-black text-xs shadow-lg shadow-primary/25 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 group cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-lg group-hover:rotate-12 transition-transform">document_scanner</span>
                            Quét Hoá Đơn (AI OCR)
                        </button>
                    </div>
                </div>

                <div className="flex bg-white p-1 rounded-2xl w-full max-w-sm mx-auto mb-6 shadow-sm border border-slate-100 relative">
                    <button
                        onClick={() => setTransactionType('EXPENSE')}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all z-10 ${transactionType === 'EXPENSE' ? 'text-white' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Khoản chi
                    </button>
                    <button
                        onClick={() => setTransactionType('INCOME')}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all z-10 ${transactionType === 'INCOME' ? 'text-white' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Khoản thu
                    </button>
                    <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl transition-all duration-300 ease-out ${transactionType === 'EXPENSE' ? 'left-1 bg-error' : 'left-[calc(50%+2px)] bg-secondary'}`}></div>
                </div>

                {/* THANH BILL MẶC ĐỊNH & THÓI QUEN HẰNG NGÀY (QUICK BILLS) */}
                <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-amber-100/80 mb-8 animate-in fade-in duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-sm font-black text-slate-800">Bill Mặc Định & Thói Quen Hằng Ngày</h2>
                                    <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                                        1 Chạm
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-400 font-medium">
                                    Chạm vào thẻ để điền nhanh biểu mẫu hoặc bấm <b>Lưu ngay</b> để ghi sổ tức thì
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                            <div className="flex bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
                                <button
                                    type="button"
                                    onClick={() => setActiveBillTab('ALL')}
                                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${activeBillTab === 'ALL' ? 'bg-white text-amber-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Tất cả
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveBillTab('SMART')}
                                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${activeBillTab === 'SMART' ? 'bg-white text-amber-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
                                    Theo giờ & Thói quen
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveBillTab('CUSTOM')}
                                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${activeBillTab === 'CUSTOM' ? 'bg-white text-amber-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Mẫu của tôi ({customBills.filter(b => (b.type || 'EXPENSE') === transactionType).length})
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setNewBill({
                                        title: note || '',
                                        amount: amount || '',
                                        categoryId: selectedCategoryId || '',
                                        note: note || '',
                                        icon: 'bolt'
                                    });
                                    setShowBillModal(true);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer active:scale-95"
                            >
                                <span className="material-symbols-outlined text-sm">add</span>
                                Tạo Bill mẫu
                            </button>
                        </div>
                    </div>

                    {displayedQuickBills.length === 0 ? (
                        <div className="text-center py-6 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                            <p className="text-xs font-bold text-slate-500">Chưa có Bill mẫu nào trong mục này</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Hãy bấm "+ Tạo Bill mẫu" để lưu các khoản chi tiêu lặp lại hằng ngày của bạn.</p>
                        </div>
                    ) : (
                        <div className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-hide">
                            {displayedQuickBills.map(bill => {
                                const isActive = selectedBillId === bill.id;
                                const isSavingThis = quickSavingId === bill.id;
                                return (
                                    <div
                                        key={bill.id}
                                        onClick={() => handleSelectQuickBill(bill)}
                                        className={`group relative shrink-0 w-48 p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                                            isActive
                                                ? 'border-amber-500 bg-amber-50/70 shadow-md shadow-amber-500/10'
                                                : 'border-slate-100 bg-slate-50/60 hover:border-amber-300 hover:bg-white hover:shadow-sm'
                                        }`}
                                    >
                                        {bill.isCustom && (
                                            <button
                                                type="button"
                                                onClick={(e) => handleDeleteCustomBill(e, bill.id)}
                                                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs hover:scale-110 z-10"
                                                title="Xóa mẫu này"
                                            >
                                                <span className="material-symbols-outlined text-[12px]">close</span>
                                            </button>
                                        )}

                                        <div>
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                                    bill.type === 'INCOME'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-amber-100 text-amber-800'
                                                }`}>
                                                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                                                        {bill.icon || 'receipt_long'}
                                                    </span>
                                                </div>
                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                                    bill.isCustom
                                                        ? 'bg-amber-200/70 text-amber-950'
                                                        : bill.isLearned
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : 'bg-slate-200/70 text-slate-600'
                                                }`}>
                                                    {bill.badge || 'Mặc định'}
                                                </span>
                                            </div>

                                            <p className="text-xs font-extrabold text-slate-800 truncate">{bill.title}</p>
                                            <p className={`text-sm font-black mt-0.5 ${
                                                bill.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'
                                            }`}>
                                                {Number(bill.amount).toLocaleString('vi-VN')} đ
                                            </p>
                                        </div>

                                        <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between gap-1">
                                            <span className="text-[10px] font-semibold text-slate-400 group-hover:text-amber-800 transition-colors">
                                                Chạm để điền
                                            </span>
                                            <button
                                                type="button"
                                                disabled={isSavingThis}
                                                onClick={(e) => handleOneTapSaveBill(e, bill)}
                                                className="px-2 py-1 rounded-lg bg-amber-600/10 hover:bg-amber-600 text-amber-800 hover:text-white text-[10px] font-extrabold flex items-center gap-0.5 transition-all cursor-pointer active:scale-95"
                                                title="Lưu thẳng giao dịch này ngay lập tức"
                                            >
                                                <span className="material-symbols-outlined text-[12px]">bolt</span>
                                                {isSavingThis ? 'Đang lưu...' : 'Lưu ngay'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-7 space-y-6">

                        <div className="bg-white p-10 rounded-[2.5rem] shadow-sm text-center border border-slate-100">
                            <input
                                className={`w-full text-6xl font-black text-center outline-none placeholder:text-slate-100 transition-colors ${transactionType === 'EXPENSE' ? 'text-error' : 'text-secondary'}`}
                                type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)}
                                autoFocus
                            />
                            <p className="text-[10px] text-slate-400 mt-4 font-bold uppercase tracking-[0.2em]">Số tiền {transactionType === 'EXPENSE' ? 'chi tiêu' : 'thu nhập'} (VNĐ)</p>
                        </div>

                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-4 tracking-widest px-2">{transactionType === 'EXPENSE' ? 'Nguồn tiền (Trừ từ)' : 'Chuyển vào ví'}</h3>
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                {accounts.length > 0 ? accounts.map(acc => (
                                    <button
                                        key={acc.id} onClick={() => setSelectedAccountId(acc.id)}
                                        className={`px-5 py-3 rounded-2xl border-2 whitespace-nowrap font-bold text-sm transition-all 
                                        ${selectedAccountId === acc.id ? 'border-primary bg-primary/5 text-primary' : 'border-slate-50 text-slate-400 hover:border-slate-200'}`}
                                    >
                                        <span className="material-symbols-outlined text-sm mr-1">payments</span>
                                        {acc.accountName}
                                    </button>
                                )) : (
                                    <p className="text-xs text-slate-400 italic">Chưa có tài khoản. Vui lòng thêm ở Dashboard.</p>
                                )}
                            </div>
                        </div>

                        {/* Danh mục giao dịch (Chi tiêu hoặc Thu nhập) */}
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex justify-between items-center mb-6 px-2">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {transactionType === 'EXPENSE' ? 'Danh mục chi tiêu' : 'Danh mục thu nhập'}
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setShowIconPicker(true)}
                                    className="text-[11px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer hover:underline"
                                    title="Mở kho icon Google Material Symbols"
                                >
                                    <span className="material-symbols-outlined text-sm">palette</span>
                                    <span>Kho icon mới</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-4 gap-y-8 min-h-[150px]">
                                {fetching ? (
                                    <div className="col-span-4 text-center py-4 text-slate-300 text-xs italic">Đang tải danh mục...</div>
                                ) : (
                                    <>
                                        {categories
                                            .filter(c => transactionType === 'INCOME' ? (c.type === 'INCOME') : (!c.type || c.type === 'EXPENSE'))
                                            .map(cat => {
                                                const isCore = ['ăn uống', 'học tập', 'giải trí', 'mua sắm', 'di chuyển', 'tiền nhà / sinh hoạt', 'tiền nhà', 'đầu tư', 'sách vở', 'lương', 'thưởng'].includes((cat.name || '').trim().toLowerCase());
                                                const isSelected = selectedCategoryId === cat.id;

                                                return (
                                                    <div key={cat.id} onClick={() => setSelectedCategoryId(cat.id)} className="flex flex-col items-center gap-2 cursor-pointer group relative">
                                                        {!isCore && (
                                                            <button
                                                                onClick={(e) => handleDeleteCategory(e, cat.id)}
                                                                className="absolute -top-2 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 z-10 shadow-sm"
                                                                title="Xóa danh mục"
                                                            >
                                                                <span className="material-symbols-outlined text-[12px] font-bold">close</span>
                                                            </button>
                                                        )}

                                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 
                                                            ${isSelected ? 'bg-amber-600 text-white scale-110 shadow-lg shadow-amber-600/20' : 'bg-slate-50 text-slate-600 group-hover:bg-amber-50 group-hover:text-amber-800'}`}>
                                                            <span className="material-symbols-outlined text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>
                                                                {cat.icon || cat.iconName || (transactionType === 'EXPENSE' ? 'category' : 'savings')}
                                                            </span>
                                                        </div>
                                                        <span className={`text-[10px] font-bold text-center tracking-tight truncate w-full px-1 ${isSelected ? 'text-amber-800' : 'text-slate-600'}`}>
                                                            {cat.name}
                                                        </span>
                                                    </div>
                                                );
                                            })
                                        }

                                        {/* Nút Tạo danh mục mới */}
                                        <div onClick={() => setShowModal(true)} className="flex flex-col items-center gap-2 cursor-pointer group">
                                            <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 group-hover:border-amber-600 group-hover:text-amber-600 transition-all">
                                                <span className="material-symbols-outlined text-2xl">add</span>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 group-hover:text-amber-800 tracking-tight">Thêm mới</span>
                                        </div>

                                        {/* Nút Mở kho icon mới */}
                                        <div onClick={() => setShowIconPicker(true)} className="flex flex-col items-center gap-2 cursor-pointer group">
                                            <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 flex items-center justify-center text-amber-700 group-hover:bg-amber-100 group-hover:border-amber-600 group-hover:scale-105 transition-all">
                                                <span className="material-symbols-outlined text-2xl">palette</span>
                                            </div>
                                            <span className="text-[10px] font-bold text-amber-800 tracking-tight text-center">Kho icon</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-5 space-y-6">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Thời gian giao dịch</label>
                                <input
                                    type="datetime-local"
                                    className="w-full bg-slate-50 p-4 rounded-xl font-bold border-none focus:ring-2 focus:ring-amber-500/20 transition-all cursor-pointer text-slate-800"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Ghi chú</label>
                                <textarea
                                    className="w-full bg-slate-50 p-4 rounded-xl resize-none border-none font-medium text-sm focus:ring-2 focus:ring-amber-500/20 transition-all text-slate-800"
                                    placeholder={transactionType === 'EXPENSE' ? 'Bạn đã chi cho việc gì?...' : 'Nguồn thu nhập từ đâu?...'}
                                    rows="4"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                />
                            </div>

                            {/* Hiển thị ảnh hoá đơn đã quét */}
                            {receiptImageUrl && (
                                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/60 space-y-2.5 animate-in fade-in">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-amber-900 uppercase tracking-widest flex items-center gap-1">
                                            <span className="material-symbols-outlined text-sm">receipt</span>
                                            Hoá đơn đính kèm
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => { setReceiptImageUrl(''); setAiRawText(''); }}
                                            className="text-red-500 hover:text-red-700 text-xs font-bold transition-colors cursor-pointer"
                                        >
                                            Gỡ ảnh
                                        </button>
                                    </div>
                                    <div className="relative rounded-xl overflow-hidden bg-slate-200 h-32 border border-slate-200 group">
                                        <img
                                            src={`http://localhost:8080${receiptImageUrl}`}
                                            alt="Receipt Attachment"
                                            className="w-full h-full object-cover"
                                        />
                                        <a
                                            href={`http://localhost:8080${receiptImageUrl}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity"
                                        >
                                            Xem ảnh phóng to
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Tùy chọn lưu giao dịch hiện tại thành Bill mẫu cho lần sau */}
                        <div className="bg-white px-5 py-4 rounded-2xl shadow-xs border border-slate-100 space-y-3">
                            <label className="flex items-center justify-between cursor-pointer select-none">
                                <div className="flex items-center gap-2.5">
                                    <input
                                        type="checkbox"
                                        checked={saveAsTemplate}
                                        onChange={(e) => setSaveAsTemplate(e.target.checked)}
                                        className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                                    />
                                    <span className="text-xs font-bold text-slate-700">
                                        Lưu thành Bill mẫu cho những lần sau
                                    </span>
                                </div>
                                <span className="material-symbols-outlined text-amber-600 text-base">bookmark_add</span>
                            </label>

                            {saveAsTemplate && (
                                <input
                                    type="text"
                                    value={templateTitle}
                                    onChange={(e) => setTemplateTitle(e.target.value)}
                                    placeholder="Đặt tên gợi nhớ (VD: Cà phê sáng, Tiền gửi xe...)"
                                    className="w-full bg-slate-50 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-800 border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                />
                            )}
                        </div>

                        <button
                            onClick={handleSaveTransaction}
                            disabled={loading || fetching}
                            className={`w-full py-5 rounded-2xl font-black text-lg shadow-xl transition-all cursor-pointer ${
                                loading || fetching ? 'bg-slate-300' : 'bg-amber-600 hover:bg-amber-700 text-white hover:scale-[1.01] active:scale-95 shadow-amber-600/20'
                            }`}
                        >
                            {loading ? 'Đang xử lý...' : 'Lưu giao dịch'}
                        </button>
                    </div>
                </div>
            </main>

            {/* MODAL TẠO BILL MẶC ĐỊNH (QUICK BILL) */}
            {showBillModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white p-7 rounded-[2.5rem] w-full max-w-md shadow-2xl space-y-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800">Tạo Bill Mặc Định Mới</h3>
                                    <p className="text-xs text-slate-400">Tiết kiệm thời gian cho các khoản thu/chi lặp lại</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowBillModal(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tên Bill thói quen</label>
                                <input
                                    type="text"
                                    placeholder="VD: Cà phê Highlands, Ăn trưa, Gửi xe..."
                                    value={newBill.title}
                                    onChange={(e) => setNewBill({ ...newBill, title: e.target.value })}
                                    className="w-full bg-slate-50 p-3.5 rounded-xl font-bold text-sm border border-slate-200/80 focus:outline-none focus:border-amber-500 mt-1 text-slate-800"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Số tiền mặc định (VNĐ)</label>
                                <input
                                    type="number"
                                    placeholder="VD: 35000"
                                    value={newBill.amount}
                                    onChange={(e) => setNewBill({ ...newBill, amount: e.target.value })}
                                    className="w-full bg-slate-50 p-3.5 rounded-xl font-black text-base border border-slate-200/80 focus:outline-none focus:border-amber-500 mt-1 text-amber-800"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Danh mục áp dụng</label>
                                <select
                                    value={newBill.categoryId}
                                    onChange={(e) => setNewBill({ ...newBill, categoryId: e.target.value })}
                                    className="w-full bg-slate-50 p-3.5 rounded-xl font-bold text-sm border border-slate-200/80 focus:outline-none focus:border-amber-500 mt-1 text-slate-800 cursor-pointer"
                                >
                                    <option value="">-- Tự động theo danh mục đang chọn --</option>
                                    {categories
                                        .filter(c => transactionType === 'INCOME' ? c.type === 'INCOME' : (!c.type || c.type === 'EXPENSE'))
                                        .map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Ghi chú mặc định</label>
                                <input
                                    type="text"
                                    placeholder="Để trống sẽ lấy theo tên Bill"
                                    value={newBill.note}
                                    onChange={(e) => setNewBill({ ...newBill, note: e.target.value })}
                                    className="w-full bg-slate-50 p-3.5 rounded-xl font-medium text-sm border border-slate-200/80 focus:outline-none focus:border-amber-500 mt-1 text-slate-800"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowBillModal(false)}
                                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-sm cursor-pointer"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={handleCreateCustomBill}
                                className="flex-1 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-amber-600/20 cursor-pointer"
                            >
                                Lưu Bill mẫu
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL TẠO DANH MỤC */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in transition-all">
                    <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl slide-in-from-bottom-4 transition-all">
                        <div className="text-center mb-6">
                            <button
                                type="button"
                                onClick={() => setShowIconPicker(true)}
                                className="w-20 h-20 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-3xl flex flex-col items-center justify-center mx-auto mb-2 border-2 border-dashed border-amber-300 hover:border-amber-600 hover:scale-105 active:scale-95 transition-all group cursor-pointer shadow-sm"
                                title="Bấm để chọn icon từ kho Google Material Symbols"
                            >
                                <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform" style={{fontVariationSettings: "'FILL' 1"}}>{newCat.icon || 'category'}</span>
                                <span className="text-[10px] font-bold text-amber-800 mt-1">Đổi icon</span>
                            </button>
                            <h3 className="text-xl font-black text-slate-800">Tạo danh mục mới</h3>
                            <p className="text-xs text-slate-400">Bấm vào biểu tượng phía trên để chọn icon từ kho</p>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tên danh mục</label>
                                <input
                                    className="w-full bg-slate-50 p-4 rounded-xl font-bold border border-slate-200/80 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 mt-1 text-slate-800"
                                    placeholder="Ăn sáng, Lương..."
                                    value={newCat.name}
                                    onChange={(e) => setNewCat({...newCat, name: e.target.value})}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Chiếc lọ áp dụng</label>
                                <select
                                    className="w-full bg-slate-50 p-4 rounded-xl font-bold border border-slate-200/80 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 mt-1 cursor-pointer text-slate-800"
                                    value={newCat.jarType}
                                    onChange={(e) => handleJarChange(e.target.value)}
                                >
                                    {jarOptions.map(jar => <option key={jar.val} value={jar.val}>{jar.label}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button onClick={() => setShowModal(false)} disabled={loading} className="flex-1 py-4 bg-slate-100 font-bold rounded-xl text-slate-500 hover:bg-slate-200 cursor-pointer">Hủy</button>
                                <button onClick={handleCreateCategory} disabled={loading} className="flex-1 py-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-lg shadow-amber-600/20 cursor-pointer">
                                    {loading ? 'Đang tạo...' : 'Tạo ngay'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL QUÉT HOÁ ĐƠN (AI OCR MICROSERVICE) */}
            <ReceiptScannerModal
                isOpen={showScanModal}
                onClose={() => setShowScanModal(false)}
                onApplyData={handleApplyReceiptData}
            />

            {/* MODAL NHẬP BẰNG GIỌNG NÓI (AI VOICE MICROSERVICE) */}
            <VoiceTextTransactionModal
                isOpen={showVoiceModal}
                onClose={() => setShowVoiceModal(false)}
                onApplyData={handleApplyVoiceData}
                onDirectSave={async () => {
                    await fetchData();
                    navigate('/dashboard');
                }}
                accounts={accounts}
            />

            {/* MODAL CHỌN ICON TỪ KHO (GOOGLE MATERIAL SYMBOLS) */}
            <CategoryIconPickerModal
                isOpen={showIconPicker}
                onClose={() => setShowIconPicker(false)}
                onSelectIcon={(iconName) => {
                    setNewCat(prev => ({ ...prev, icon: iconName, type: transactionType }));
                    setShowModal(true);
                }}
                selectedIcon={newCat.icon}
            />
        </div>
    );
};

export default AddTransaction;