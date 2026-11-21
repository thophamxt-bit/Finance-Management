import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import UserProfileBadge from '../../components/personal/UserProfileBadge';
import { useLanguage } from '../../context/LanguageContext';

const Activity = () => {
    const navigate = useNavigate();
    const { t, openSettings } = useLanguage();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    // STATE TÌM KIẾM
    const [searchTerm, setSearchTerm] = useState('');

    // Helper lấy ngày & tháng hiện tại theo chuẩn YYYY-MM-DD và YYYY-MM
    const getTodayStr = () => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const getCurrentMonthStr = () => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
    };

    // STATE LỌC THỜI GIAN
    // filterMode: 'ALL' | 'TODAY' | 'THIS_MONTH' | 'DATE' | 'MONTH'
    const [filterMode, setFilterMode] = useState('ALL');
    const [selectedDate, setSelectedDate] = useState(getTodayStr());
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthStr());

    // STATE PHÂN TRANG
    const [currentPage, setCurrentPage] = useState(1);
    const [transactionsPerPage] = useState(10);

    // Trích xuất chuẩn xác YYYY-MM-DD và YYYY-MM từ transactionDate
    const extractDateParts = (rawDate) => {
        if (!rawDate) return { dateStr: '', monthStr: '' };
        if (Array.isArray(rawDate)) {
            const y = String(rawDate[0]);
            const m = String(rawDate[1]).padStart(2, '0');
            const d = String(rawDate[2] || 1).padStart(2, '0');
            return { dateStr: `${y}-${m}-${d}`, monthStr: `${y}-${m}` };
        }
        if (typeof rawDate === 'string') {
            const isoMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (isoMatch) {
                return {
                    dateStr: `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`,
                    monthStr: `${isoMatch[1]}-${isoMatch[2]}`
                };
            }
        }
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) return { dateStr: '', monthStr: '' };
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return { dateStr: `${y}-${m}-${day}`, monthStr: `${y}-${m}` };
    };

    // Điều hướng ngày trước / sau
    const stepDate = (offsetDays) => {
        const base = selectedDate ? selectedDate.split('-').map(Number) : null;
        const d = base ? new Date(base[0], base[1] - 1, base[2]) : new Date();
        d.setDate(d.getDate() + offsetDays);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        setSelectedDate(`${y}-${m}-${day}`);
    };

    // Điều hướng tháng trước / sau
    const stepMonth = (offsetMonths) => {
        const base = selectedMonth ? selectedMonth.split('-').map(Number) : null;
        const d = base ? new Date(base[0], base[1] - 1 + offsetMonths, 1) : new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        setSelectedMonth(`${y}-${m}`);
    };

    // Định dạng hiển thị ngày tiếng Việt (Thứ ..., ngày dd/mm/yyyy)
    const formatDisplayDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            const [y, m, d] = dateStr.split('-');
            const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
            return dateObj.toLocaleDateString('vi-VN', {
                weekday: 'long',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch {
            return dateStr;
        }
    };

    // Định dạng hiển thị tháng tiếng Việt (Tháng mm/yyyy)
    const formatDisplayMonth = (monthStr) => {
        if (!monthStr) return '';
        try {
            const [y, m] = monthStr.split('-');
            return `Tháng ${m}/${y}`;
        } catch {
            return monthStr;
        }
    };

    // Reset bộ lọc
    const handleResetFilter = () => {
        setFilterMode('ALL');
        setSearchTerm('');
        setSelectedDate(getTodayStr());
        setSelectedMonth(getCurrentMonthStr());
    };

    // Reset về trang 1 mỗi khi đổi tìm kiếm hoặc bộ lọc thời gian
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterMode, selectedDate, selectedMonth]);

    // GỌI API LẤY LỊCH SỬ GIAO DỊCH
    useEffect(() => {
        const fetchTransactions = async () => {
            const token = localStorage.getItem('token');
            if (!token) return navigate('/login');

            try {
                const res = await axios.get('http://localhost:8080/api/transactions', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.data && Array.isArray(res.data)) {
                    const sortedData = res.data.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));
                    setTransactions(sortedData);
                } else {
                    setTransactions([]);
                }
            } catch (error) {
                console.error('Lỗi tải giao dịch:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchTransactions();
    }, [navigate]);

    // Format tiền Việt Nam
    const formatMoney = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
            .format(amount || 0)
            .replace('₫', 'VND');
    };

    const formatTime = (dateString) => {
        const d = new Date(dateString);
        const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        return timeStr === '00:00' ? '--:--' : timeStr;
    };

    // 1. LỌC TÌM KIẾM & THỜI GIAN
    const filteredTransactions = transactions.filter(t => {
        // Lọc theo từ khóa tìm kiếm
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            const noteMatch = (t.note || '').toLowerCase().includes(searchLower);
            const categoryMatch = (t.categoryName || '').toLowerCase().includes(searchLower);
            const amountMatch = (t.amount || '').toString().includes(searchLower);
            if (!noteMatch && !categoryMatch && !amountMatch) return false;
        }

        // Lọc theo chế độ thời gian
        const { dateStr, monthStr } = extractDateParts(t.transactionDate);
        if (filterMode === 'TODAY') {
            return dateStr === getTodayStr();
        }
        if (filterMode === 'THIS_MONTH') {
            return monthStr === getCurrentMonthStr();
        }
        if (filterMode === 'DATE') {
            return dateStr === selectedDate;
        }
        if (filterMode === 'MONTH') {
            return monthStr === selectedMonth;
        }
        return true; // 'ALL'
    });

    // 2. TÍNH TOÁN TỔNG HỢP (SUMMARY STATS) THEO BỘ LỌC HIỆN TẠI
    const summaryStats = filteredTransactions.reduce((acc, t) => {
        const amt = parseFloat(t.amount || 0);
        if (t.type === 'INCOME' || t.transactionType === 'INCOME') {
            acc.income += amt;
        } else {
            acc.expense += amt;
        }
        return acc;
    }, { income: 0, expense: 0 });

    const netFlow = summaryStats.income - summaryStats.expense;

    // 3. TÍNH TOÁN PHÂN TRANG
    const indexOfLastTransaction = currentPage * transactionsPerPage;
    const indexOfFirstTransaction = indexOfLastTransaction - transactionsPerPage;
    const currentTransactions = filteredTransactions.slice(indexOfFirstTransaction, indexOfLastTransaction);
    const totalPages = Math.ceil(filteredTransactions.length / transactionsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    // 4. NHÓM DỮ LIỆU CỦA TRANG HIỆN TẠI THEO NGÀY
    const groupedTransactions = currentTransactions.reduce((groups, t) => {
        const d = new Date(t.transactionDate);
        const dateKey = d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
        if (!groups[dateKey]) {
            groups[dateKey] = [];
        }
        groups[dateKey].push(t);
        return groups;
    }, {});

    // Nhãn mô tả trạng thái lọc hiện tại
    const getFilterLabel = () => {
        if (filterMode === 'TODAY') return `Hôm nay (${formatDisplayDate(getTodayStr())})`;
        if (filterMode === 'THIS_MONTH') return `Tháng này (${formatDisplayMonth(getCurrentMonthStr())})`;
        if (filterMode === 'DATE') return `Ngày: ${formatDisplayDate(selectedDate)}`;
        if (filterMode === 'MONTH') return `Tháng: ${formatDisplayMonth(selectedMonth)}`;
        return 'Tất cả giao dịch';
    };

    return (
        <div className="bg-[#fcf8f4] text-slate-800 antialiased flex min-h-screen">
            {/* Sidebar Navigation tông màu ấm Temoney */}
            <aside className="h-full w-64 fixed left-0 top-0 bg-white border-r border-amber-100 flex flex-col p-4 z-40 hidden md:flex shadow-xs">
                <div className="mb-8 px-4 pt-2">
                    <div className="flex items-center gap-3">
                        <img src="/Teemoney.png" alt="Temoney Logo" className="w-10 h-10 object-contain drop-shadow-sm" />
                        <div>
                            <h1 className="font-extrabold text-amber-950 text-xl tracking-tight">Temoney</h1>
                            <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">GÓI PREMIUM</p>
                        </div>
                    </div>
                </div>
                <nav className="space-y-1">
                    <SideNavItem icon="dashboard" label={t('nav.dashboard', 'Trang chủ')} to="/dashboard" />
                    <SideNavItem icon="receipt_long" label={t('nav.activity', 'Lịch sử giao dịch')} to="/activity" active />
                    <SideNavItem icon="add_circle" label={t('nav.addNew', 'Thêm giao dịch')} to="/addnew" />
                    <SideNavItem icon="pie_chart" label={t('nav.analytics', 'Phân tích')} to="/analyst" />
                    <SideNavItem icon="account_balance_wallet" label={t('nav.budgets', 'Ngân sách')} to="/budget" />
                    <div className="my-3 border-t border-amber-100"></div>
                    <SideNavItem icon="groups" label={t('nav.group', 'Chi tiêu nhóm')} to="/group" />
                    {localStorage.getItem('role') === 'ROLE_ADMIN' && (
                        <SideNavItem
                            icon="shield_person"
                            label="Quản trị hệ thống"
                            to="/admin"
                        />
                    )}
                </nav>
                <div className="mt-auto pt-4 border-t border-amber-100 flex flex-col gap-2">
                    <SideNavItem icon="settings" label={t('nav.settings', 'Cài đặt')} onClick={openSettings} />
                    <UserProfileBadge />
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 min-h-screen bg-[#fcf8f4]">
                {/* Header tông Cam ấm */}
                <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-amber-100/80 px-6 py-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-extrabold text-amber-950 tracking-tight">
                            {t('activity.title', 'Lịch sử giao dịch')}
                        </h2>
                        <p className="text-xs text-slate-500 font-medium">
                            {t('activity.subtitle', 'Xem lại toàn bộ lịch sử chi tiêu và thu nhập chi tiết')}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/addnew')}
                            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-600/20 active:scale-95 transition-all cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-base">add</span>
                            {t('activity.quickAdd', 'Thêm nhanh')}
                        </button>
                        <button className="p-2 text-slate-500 hover:bg-amber-50 rounded-full transition-colors cursor-pointer" title="Thông báo">
                            <span className="material-symbols-outlined text-xl">notifications</span>
                        </button>
                    </div>
                </header>

                {/* Filters Section - Đúng theo ảnh 2 */}
                <section className="p-6">
                    <div className="bg-white rounded-3xl p-6 space-y-5 shadow-sm border border-amber-100/80">
                        {/* Hàng 1: Search Input & 5 Tabs Lọc Thời Gian */}
                        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
                            <div className="relative flex-1 max-w-md">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                                <input
                                    className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-xs font-medium placeholder:text-slate-400"
                                    placeholder="Tìm theo ghi chú, danh mục..."
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* 5 Tabs: Tất cả, Hôm nay, Tháng này, Theo ngày, Theo tháng */}
                            <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1 rounded-2xl border border-slate-200/60">
                                <button
                                    onClick={() => setFilterMode('ALL')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        filterMode === 'ALL'
                                            ? 'bg-white text-amber-800 shadow-xs'
                                            : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    Tất cả
                                </button>
                                <button
                                    onClick={() => setFilterMode('TODAY')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        filterMode === 'TODAY'
                                            ? 'bg-white text-amber-800 shadow-xs'
                                            : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    Hôm nay
                                </button>
                                <button
                                    onClick={() => setFilterMode('THIS_MONTH')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        filterMode === 'THIS_MONTH'
                                            ? 'bg-white text-amber-800 shadow-xs'
                                            : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    Tháng này
                                </button>
                                <button
                                    onClick={() => setFilterMode('DATE')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                        filterMode === 'DATE'
                                            ? 'bg-white text-amber-800 shadow-xs border border-amber-300'
                                            : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-sm">calendar_month</span>
                                    Theo ngày
                                </button>
                                <button
                                    onClick={() => setFilterMode('MONTH')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                        filterMode === 'MONTH'
                                            ? 'bg-white text-amber-800 shadow-xs border border-amber-300'
                                            : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-sm">calendar_today</span>
                                    Theo tháng
                                </button>
                            </div>
                        </div>

                        {/* Hàng 2: Thanh Chọn Ngày / Tháng (khi chọn 'Theo ngày' hoặc 'Theo tháng') */}
                        {filterMode === 'DATE' && (
                            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">CHỌN NGÀY:</span>
                                    <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 px-2 py-1">
                                        <button
                                            onClick={() => stepDate(-1)}
                                            className="p-1 text-slate-500 hover:text-amber-800 rounded-lg hover:bg-white transition-colors cursor-pointer"
                                            title="Ngày trước"
                                        >
                                            <span className="material-symbols-outlined text-sm">chevron_left</span>
                                        </button>
                                        <input
                                            type="date"
                                            value={selectedDate}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                            className="bg-transparent border-none text-xs font-bold text-slate-800 px-2 focus:outline-none cursor-pointer"
                                        />
                                        <button
                                            onClick={() => stepDate(1)}
                                            className="p-1 text-slate-500 hover:text-amber-800 rounded-lg hover:bg-white transition-colors cursor-pointer"
                                            title="Ngày sau"
                                        >
                                            <span className="material-symbols-outlined text-sm">chevron_right</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 bg-slate-100/80 px-3 py-1.5 rounded-xl text-slate-700 text-xs font-bold">
                                    <span className="material-symbols-outlined text-sm text-amber-700">calendar_month</span>
                                    <span>{formatDisplayDate(selectedDate)}</span>
                                </div>
                            </div>
                        )}

                        {filterMode === 'MONTH' && (
                            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">CHỌN THÁNG:</span>
                                    <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 px-2 py-1">
                                        <button
                                            onClick={() => stepMonth(-1)}
                                            className="p-1 text-slate-500 hover:text-amber-800 rounded-lg hover:bg-white transition-colors cursor-pointer"
                                            title="Tháng trước"
                                        >
                                            <span className="material-symbols-outlined text-sm">chevron_left</span>
                                        </button>
                                        <input
                                            type="month"
                                            value={selectedMonth}
                                            onChange={(e) => setSelectedMonth(e.target.value)}
                                            className="bg-transparent border-none text-xs font-bold text-slate-800 px-2 focus:outline-none cursor-pointer"
                                        />
                                        <button
                                            onClick={() => stepMonth(1)}
                                            className="p-1 text-slate-500 hover:text-amber-800 rounded-lg hover:bg-white transition-colors cursor-pointer"
                                            title="Tháng sau"
                                        >
                                            <span className="material-symbols-outlined text-sm">chevron_right</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 bg-slate-100/80 px-3 py-1.5 rounded-xl text-slate-700 text-xs font-bold">
                                    <span className="material-symbols-outlined text-sm text-amber-700">calendar_today</span>
                                    <span>{formatDisplayMonth(selectedMonth)}</span>
                                </div>
                            </div>
                        )}

                        {/* Hàng 3: Thanh Quick Stats Pill (Tổng thu, Tổng chi, Chênh lệch) */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                <span className="font-bold text-slate-700">{getFilterLabel()}</span>
                                <span className="text-slate-400 font-medium">({filteredTransactions.length} giao dịch)</span>
                                {filterMode !== 'ALL' && (
                                    <button
                                        onClick={handleResetFilter}
                                        className="ml-2 text-amber-700 hover:text-amber-900 font-bold text-[11px] flex items-center gap-1 hover:underline cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-xs">refresh</span>
                                        Xem tất cả
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <div className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">arrow_downward</span>
                                    <span>Tổng thu: +{formatMoney(summaryStats.income)}</span>
                                </div>
                                <div className="bg-rose-50 text-rose-700 border border-rose-200/80 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">arrow_upward</span>
                                    <span>Tổng chi: -{formatMoney(summaryStats.expense)}</span>
                                </div>
                                <div className="bg-blue-50 text-blue-700 border border-blue-200/80 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1">
                                    <span>Chênh lệch: {netFlow >= 0 ? '+' : ''}{formatMoney(netFlow)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Transactions Table & Pagination */}
                <section className="px-6 pb-20">
                    <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-amber-100/80 flex flex-col">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">THỜI GIAN</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">NỘI DUNG GIAO DỊCH</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">DANH MỤC</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">SỐ TIỀN</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">TÁC VỤ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="5" className="text-center py-12 text-slate-400 font-medium">
                                                Đang tải dữ liệu giao dịch...
                                            </td>
                                        </tr>
                                    ) : filteredTransactions.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="text-center py-16 px-4">
                                                <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                                                    <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
                                                        <span className="material-symbols-outlined text-3xl">event_busy</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-700 mb-1">
                                                        {filterMode === 'DATE'
                                                            ? `Không có giao dịch nào trong ngày ${formatDisplayDate(selectedDate)}!`
                                                            : filterMode === 'MONTH'
                                                            ? `Không có giao dịch nào trong ${formatDisplayMonth(selectedMonth)}!`
                                                            : searchTerm
                                                            ? 'Không tìm thấy giao dịch nào phù hợp với từ khóa!'
                                                            : 'Chưa có giao dịch nào được ghi nhận!'}
                                                    </p>
                                                    <p className="text-xs text-slate-400 mb-4">
                                                        Hãy thử chọn ngày khác hoặc bấm "Xem tất cả" để xem toàn bộ lịch sử.
                                                    </p>
                                                    <button
                                                        onClick={handleResetFilter}
                                                        className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                                    >
                                                        Xem tất cả
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        Object.keys(groupedTransactions).map(dateKey => (
                                            <React.Fragment key={dateKey}>
                                                <DateHeader label={dateKey} />
                                                {groupedTransactions[dateKey].map(t => {
                                                    const isExpense = t.type === 'EXPENSE' || t.transactionType === 'EXPENSE';
                                                    const amountPrefix = isExpense ? '-' : '+';
                                                    const displayIcon = t.categoryIcon || (isExpense ? 'payments' : 'account_balance_wallet');
                                                    const displayTitle = t.categoryName || (isExpense ? 'Chi tiêu' : 'Thu nhập');
                                                    const displayCategory = isExpense ? 'CHI TIÊU' : 'THU NHẬP';

                                                    return (
                                                        <TransactionRow
                                                            key={t.id}
                                                            time={formatTime(t.transactionDate)}
                                                            icon={displayIcon}
                                                            title={displayTitle}
                                                            desc={t.note || (isExpense ? 'Không có ghi chú' : 'Tiền vào ví')}
                                                            category={displayCategory}
                                                            amount={`${amountPrefix}${formatMoney(t.amount)}`}
                                                            isExpense={isExpense}
                                                            receiptImageUrl={t.receiptImageUrl}
                                                        />
                                                    );
                                                })}
                                            </React.Fragment>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* THANH ĐIỀU HƯỚNG PHÂN TRANG */}
                        {totalPages > 0 && (
                            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white">
                                <span className="text-xs font-medium text-slate-500">
                                    Hiển thị <span className="font-bold text-slate-800">{indexOfFirstTransaction + 1}</span> đến <span className="font-bold text-slate-800">{Math.min(indexOfLastTransaction, filteredTransactions.length)}</span> trong số <span className="font-bold text-slate-800">{filteredTransactions.length}</span> giao dịch
                                </span>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => paginate(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-sm">chevron_left</span>
                                    </button>

                                    <div className="flex items-center gap-1">
                                        {[...Array(totalPages)].map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => paginate(i + 1)}
                                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                    currentPage === i + 1
                                                        ? 'bg-amber-600 text-white shadow-xs'
                                                        : 'text-slate-600 hover:bg-amber-50 hover:text-amber-800'
                                                }`}
                                            >
                                                {i + 1}
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => paginate(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
};

// Item menu thanh bên
const SideNavItem = ({ icon, label, to, active, onClick }) => {
    const content = (
        <div
            onClick={onClick}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                active
                    ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                    : 'text-slate-600 hover:bg-amber-50 hover:text-amber-900'
            }`}
        >
            <span className="material-symbols-outlined text-lg">{icon}</span>
            <span>{label}</span>
        </div>
    );

    return to ? <Link to={to}>{content}</Link> : content;
};

// Header gom nhóm theo ngày
const DateHeader = ({ label }) => (
    <tr className="bg-amber-50/50">
        <td colSpan="5" className="px-6 py-2 text-[11px] font-bold text-amber-900 uppercase tracking-wider">
            {label}
        </td>
    </tr>
);

// Hàng hiển thị 1 giao dịch
const TransactionRow = ({ time, icon, title, desc, category, amount, isExpense, receiptImageUrl }) => (
    <tr className="hover:bg-slate-50/80 transition-colors">
        <td className="px-6 py-4 text-xs font-bold text-slate-500 whitespace-nowrap">
            {time}
        </td>
        <td className="px-6 py-4">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isExpense ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                }`}>
                    <span className="material-symbols-outlined text-xl">{icon}</span>
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{title}</p>
                    <p className="text-[11px] text-slate-400 truncate">{desc}</p>
                </div>
            </div>
        </td>
        <td className="px-6 py-4">
            <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                isExpense ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
            }`}>
                {category}
            </span>
        </td>
        <td className={`px-6 py-4 text-right font-black text-xs whitespace-nowrap ${
            isExpense ? 'text-rose-600' : 'text-emerald-600'
        }`}>
            {amount}
        </td>
        <td className="px-6 py-4 text-right whitespace-nowrap">
            <div className="flex items-center justify-end gap-1">
                {receiptImageUrl && (
                    <a
                        href={`http://localhost:8080${receiptImageUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-slate-400 hover:text-amber-800 rounded-lg hover:bg-slate-100 transition-colors"
                        title="Xem ảnh hoá đơn"
                    >
                        <span className="material-symbols-outlined text-base">receipt</span>
                    </a>
                )}
                <button
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Tùy chọn"
                >
                    <span className="material-symbols-outlined text-base">more_vert</span>
                </button>
            </div>
        </td>
    </tr>
);

export default Activity;