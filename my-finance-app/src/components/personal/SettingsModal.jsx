import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import { exportToExcel, exportToPdf, printReportView } from '../../services/exportService';

const SettingsModal = () => {
    const { isSettingsOpen, closeSettings, language, setLanguage, t } = useLanguage();
    const [currency, setCurrency] = useState(() => localStorage.getItem('app_currency') || 'VND');
    const [fontSize, setFontSize] = useState(() => localStorage.getItem('app_font_size') || 'normal');
    const [saveSuccess, setSaveSuccess] = useState(false);

    // ==========================================
    // STATE XUẤT DỮ LIỆU (EXCEL / PDF)
    // ==========================================
    const [transactions, setTransactions] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [profile, setProfile] = useState({});
    const [dataLoading, setDataLoading] = useState(false);

    const getTodayStr = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const getCurrentMonthStr = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };

    const getFirstDayOfMonthStr = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    };

    // Bộ lọc thời gian khi xuất: 'ALL' | 'THIS_MONTH' | 'BY_MONTH' | 'CUSTOM'
    const [timeFilter, setTimeFilter] = useState('ALL');
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthStr());
    const [fromDate, setFromDate] = useState(getFirstDayOfMonthStr());
    const [toDate, setToDate] = useState(getTodayStr());
    const [includeAccounts, setIncludeAccounts] = useState(true);

    const [isExporting, setIsExporting] = useState(false);
    const [exportToast, setExportToast] = useState(null); // { type: 'success' | 'error' | 'loading', message: '' }

    // Tự động tải dữ liệu cá nhân khi Modal Cài đặt được mở
    useEffect(() => {
        if (!isSettingsOpen) return;
        const token = localStorage.getItem('token');
        if (!token) return;

        setDataLoading(true);
        Promise.all([
            api.get('/api/transactions').catch(() => ({ data: [] })),
            api.get('/api/accounts').catch(() => ({ data: [] })),
            api.get('/api/auth/profile').catch(() => ({ data: {} })),
        ])
            .then(([txRes, accRes, profRes]) => {
                if (Array.isArray(txRes.data)) {
                    setTransactions(txRes.data);
                }
                if (Array.isArray(accRes.data)) {
                    setAccounts(accRes.data);
                }
                if (profRes.data) {
                    setProfile(profRes.data);
                }
            })
            .catch((err) => {
                console.error('Lỗi tải dữ liệu cho cài đặt:', err);
            })
            .finally(() => {
                setDataLoading(false);
            });
    }, [isSettingsOpen]);

    // Lọc danh sách giao dịch theo tùy chọn thời gian
    const filteredTransactions = useMemo(() => {
        if (!transactions.length) return [];
        return transactions.filter((t) => {
            if (!t.transactionDate) return true;
            let dateStr = '';
            if (Array.isArray(t.transactionDate)) {
                const y = String(t.transactionDate[0]);
                const m = String(t.transactionDate[1]).padStart(2, '0');
                const d = String(t.transactionDate[2] || 1).padStart(2, '0');
                dateStr = `${y}-${m}-${d}`;
            } else if (typeof t.transactionDate === 'string') {
                dateStr = t.transactionDate.substring(0, 10);
            } else {
                const d = new Date(t.transactionDate);
                if (!isNaN(d.getTime())) {
                    dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                }
            }

            if (timeFilter === 'ALL') return true;
            if (timeFilter === 'THIS_MONTH') {
                return dateStr.startsWith(getCurrentMonthStr());
            }
            if (timeFilter === 'BY_MONTH') {
                return dateStr.startsWith(selectedMonth);
            }
            if (timeFilter === 'CUSTOM') {
                if (fromDate && dateStr < fromDate) return false;
                if (toDate && dateStr > toDate) return false;
                return true;
            }
            return true;
        });
    }, [transactions, timeFilter, selectedMonth, fromDate, toDate]);

    // Xử lý xuất file
    const handleExport = async (format) => {
        const token = localStorage.getItem('token');
        if (!token) {
            setExportToast({
                type: 'error',
                message: t('settings.exportLoginRequired', 'Vui lòng đăng nhập để sử dụng tính năng xuất dữ liệu.')
            });
            setTimeout(() => setExportToast(null), 3500);
            return;
        }

        if (filteredTransactions.length === 0) {
            setExportToast({
                type: 'error',
                message: t('settings.exportNoData', 'Không tìm thấy giao dịch nào phù hợp với bộ lọc thời gian này.')
            });
            setTimeout(() => setExportToast(null), 3500);
            return;
        }

        setIsExporting(true);
        setExportToast({
            type: 'loading',
            message: t('settings.exporting', 'Đang tạo file xuất...')
        });

        // Delay nhỏ để UI hiển thị trạng thái loading mượt mà
        await new Promise((r) => setTimeout(r, 400));

        try {
            let timeLabel = t('settings.exportAllTime', 'Tất cả thời gian');
            if (timeFilter === 'THIS_MONTH') {
                timeLabel = `${t('settings.exportThisMonth', 'Tháng này')} (${getCurrentMonthStr()})`;
            } else if (timeFilter === 'BY_MONTH') {
                timeLabel = `${t('settings.exportByMonth', 'Tháng')} ${selectedMonth}`;
            } else if (timeFilter === 'CUSTOM') {
                timeLabel = `${fromDate} ~ ${toDate}`;
            }

            const exportPayload = {
                transactions: filteredTransactions,
                accounts,
                profile,
                timeFilterLabel: timeLabel,
                currency,
                includeAccounts,
                language
            };

            if (format === 'EXCEL') {
                const fileName = exportToExcel(exportPayload);
                setExportToast({
                    type: 'success',
                    message: `${t('settings.exportSuccess', 'Xuất file thành công!')} (${fileName})`
                });
            } else if (format === 'PDF') {
                const fileName = exportToPdf(exportPayload);
                setExportToast({
                    type: 'success',
                    message: `${t('settings.exportSuccess', 'Xuất file thành công!')} (${fileName})`
                });
            } else if (format === 'PRINT') {
                printReportView(exportPayload);
                setExportToast({
                    type: 'success',
                    message: t('settings.exportSuccess', 'Đã mở cửa sổ in / lưu PDF!')
                });
            }

            setTimeout(() => setExportToast(null), 4000);
        } catch (err) {
            console.error('Export error:', err);
            setExportToast({
                type: 'error',
                message: t('settings.exportFailed', 'Có lỗi khi xuất file. Vui lòng thử lại!')
            });
            setTimeout(() => setExportToast(null), 4000);
        } finally {
            setIsExporting(false);
        }
    };

    if (!isSettingsOpen) return null;

    const handleSelectLanguage = (newLang) => {
        setLanguage(newLang);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
    };

    const handleSelectCurrency = (cur) => {
        setCurrency(cur);
        localStorage.setItem('app_currency', cur);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
    };

    const handleSelectFontSize = (size) => {
        setFontSize(size);
        localStorage.setItem('app_font_size', size);
        if (size === 'large') {
            document.documentElement.classList.add('text-zoom-large');
        } else {
            document.documentElement.classList.remove('text-zoom-large');
        }
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col relative">

                {/* Header Gradient */}
                <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 p-6 text-white relative rounded-t-[2.5rem] flex items-center justify-between sticky top-0 z-20 shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                            <span className="material-symbols-outlined text-2xl">settings</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-black font-headline tracking-tight">
                                {t('settings.title', 'Cài đặt hệ thống')}
                            </h3>
                            <p className="text-xs text-blue-200">
                                {t('settings.subtitle', 'Tùy chỉnh ngôn ngữ hiển thị và cấu hình tài chính của bạn')}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={closeSettings}
                        className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all text-white cursor-pointer"
                        title={t('common.close', 'Đóng')}
                    >
                        <span className="material-symbols-outlined text-base">close</span>
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 md:p-8 space-y-6">

                    {/* Toast thông báo lưu thành công */}
                    {saveSuccess && (
                        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                            <span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span>
                            <span>{t('settings.savedSuccess', 'Đã lưu cài đặt thành công!')}</span>
                        </div>
                    )}

                    {/* ========================================================
                        PHẦN 1: XUẤT DỮ LIỆU RA EXCEL HOẶC PDF (DATA EXPORT)
                    ======================================================== */}
                    <div className="space-y-4 rounded-3xl bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-5 border border-blue-100/80 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <h4 className="text-xs font-black text-blue-950 uppercase tracking-widest flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-base text-blue-900">cloud_download</span>
                                    <span>{t('settings.exportSection', 'Xuất dữ liệu & Báo cáo')}</span>
                                </h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    {t('settings.exportDesc', 'Tải toàn bộ dữ liệu thu chi và số dư ví tài chính về máy dưới định dạng Excel hoặc PDF')}
                                </p>
                            </div>
                            <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full border border-emerald-200 uppercase tracking-wider shrink-0">
                                Excel / PDF
                            </span>
                        </div>

                        {/* Thông báo trạng thái xuất file */}
                        {exportToast && (
                            <div className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in ${
                                exportToast.type === 'error'
                                    ? 'bg-rose-50 border border-rose-200 text-rose-800'
                                    : exportToast.type === 'loading'
                                    ? 'bg-blue-50 border border-blue-200 text-blue-800'
                                    : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                            }`}>
                                <span className="material-symbols-outlined text-base">
                                    {exportToast.type === 'error' ? 'error' : exportToast.type === 'loading' ? 'sync' : 'check_circle'}
                                </span>
                                <span>{exportToast.message}</span>
                            </div>
                        )}

                        {/* Bộ lọc thời gian */}
                        <div className="space-y-2 pt-1">
                            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm text-slate-500">date_range</span>
                                <span>{t('settings.exportTimeFilter', 'Phạm vi thời gian')}</span>
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {[
                                    { key: 'ALL', label: t('settings.exportAllTime', 'Tất cả') },
                                    { key: 'THIS_MONTH', label: t('settings.exportThisMonth', 'Tháng này') },
                                    { key: 'BY_MONTH', label: t('settings.exportByMonth', 'Theo tháng') },
                                    { key: 'CUSTOM', label: t('settings.exportDateRange', 'Khoảng ngày') },
                                ].map((tab) => (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => setTimeFilter(tab.key)}
                                        className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer text-center ${
                                            timeFilter === tab.key
                                                ? 'bg-blue-900 text-white shadow-sm ring-2 ring-blue-900/20'
                                                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Trường chọn thời gian cụ thể */}
                            {timeFilter === 'BY_MONTH' && (
                                <div className="pt-2 animate-in fade-in flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-600 whitespace-nowrap">
                                        {t('settings.exportSelectMonth', 'Chọn tháng')}:
                                    </span>
                                    <input
                                        type="month"
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                        className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900 shadow-sm"
                                    />
                                </div>
                            )}

                            {timeFilter === 'CUSTOM' && (
                                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-in fade-in">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-600 w-16 whitespace-nowrap">
                                            {t('settings.exportFromDate', 'Từ ngày')}:
                                        </span>
                                        <input
                                            type="date"
                                            value={fromDate}
                                            onChange={(e) => setFromDate(e.target.value)}
                                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900 shadow-sm"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-600 w-16 whitespace-nowrap">
                                            {t('settings.exportToDate', 'Đến ngày')}:
                                        </span>
                                        <input
                                            type="date"
                                            value={toDate}
                                            onChange={(e) => setToDate(e.target.value)}
                                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900 shadow-sm"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Checkbox kèm danh sách ví */}
                        <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={includeAccounts}
                                    onChange={(e) => setIncludeAccounts(e.target.checked)}
                                    className="w-4 h-4 rounded text-blue-900 focus:ring-blue-900 border-slate-300 cursor-pointer"
                                />
                                <span className="text-xs font-bold text-slate-700">
                                    {t('settings.exportIncludeWallets', 'Kèm danh sách Ví & Số dư hiện tại')}
                                </span>
                            </label>

                            {/* Badge số lượng khớp */}
                            <span className="text-[11px] font-bold text-slate-600 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
                                {dataLoading ? (
                                    <span className="flex items-center gap-1 text-slate-400">
                                        <span className="material-symbols-outlined text-xs animate-spin">sync</span> Đang tải...
                                    </span>
                                ) : (
                                    <span>
                                        <strong>{filteredTransactions.length}</strong> {language === 'en' ? 'records' : 'giao dịch'}
                                    </span>
                                )}
                            </span>
                        </div>

                        {/* Các nút hành động xuất dữ liệu */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                            {/* Nút 1: Xuất Excel */}
                            <button
                                type="button"
                                disabled={isExporting || dataLoading}
                                onClick={() => handleExport('EXCEL')}
                                className="group relative overflow-hidden p-3 rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 hover:from-emerald-700 hover:to-teal-900 text-white shadow-md shadow-emerald-700/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex flex-col items-center justify-center gap-1 border border-emerald-500/30"
                            >
                                <div className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-lg">table_view</span>
                                    <span className="font-extrabold text-xs">Excel (.xlsx)</span>
                                </div>
                                <span className="text-[10px] text-emerald-100 font-medium">
                                    {t('settings.exportExcelDesc', 'Bảng tính đầy đủ')}
                                </span>
                            </button>

                            {/* Nút 2: Xuất PDF */}
                            <button
                                type="button"
                                disabled={isExporting || dataLoading}
                                onClick={() => handleExport('PDF')}
                                className="group relative overflow-hidden p-3 rounded-2xl bg-gradient-to-br from-rose-600 via-rose-700 to-red-800 hover:from-rose-700 hover:to-red-900 text-white shadow-md shadow-rose-700/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex flex-col items-center justify-center gap-1 border border-rose-500/30"
                            >
                                <div className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                                    <span className="font-extrabold text-xs">PDF (.pdf)</span>
                                </div>
                                <span className="text-[10px] text-rose-100 font-medium">
                                    {t('settings.exportPdfDesc', 'Tải tài liệu PDF')}
                                </span>
                            </button>

                            {/* Nút 3: Xem trước & In trực tiếp (Print Preview) */}
                            <button
                                type="button"
                                disabled={isExporting || dataLoading}
                                onClick={() => handleExport('PRINT')}
                                className="group relative overflow-hidden p-3 rounded-2xl bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 hover:from-blue-800 hover:to-indigo-950 text-white shadow-md shadow-blue-800/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex flex-col items-center justify-center gap-1 border border-blue-600/30"
                            >
                                <div className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-lg">print</span>
                                    <span className="font-extrabold text-xs">In / Lưu PDF</span>
                                </div>
                                <span className="text-[10px] text-blue-100 font-medium">
                                    {t('settings.exportPrintDesc', 'Chuẩn font 100%')}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Vạch ngăn cách */}
                    <div className="border-t border-slate-100"></div>

                    {/* PHẦN 2: CÀI ĐẶT NGÔN NGỮ (LANGUAGE) */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-base text-blue-900">language</span>
                                <span>{t('settings.languageSection', 'Ngôn ngữ hiển thị / Display Language')}</span>
                            </h4>
                            <span className="text-[11px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                                {language === 'vi' ? '🇻🇳 Tiếng Việt' : '🇬🇧 English'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500">
                            {t('settings.languageDesc', 'Chọn ngôn ngữ bạn muốn hiển thị xuyên suốt ứng dụng. Nút nhỏ trên góc phải sẽ tự động cập nhật đồng bộ.')}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            {/* Thẻ lựa chọn: Tiếng Việt */}
                            <button
                                type="button"
                                onClick={() => handleSelectLanguage('vi')}
                                className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between group cursor-pointer ${
                                    language === 'vi'
                                        ? 'border-blue-900 bg-blue-50/60 shadow-sm ring-2 ring-blue-900/10'
                                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl shrink-0">🇻🇳</span>
                                    <div>
                                        <p className="font-extrabold text-sm text-slate-900 group-hover:text-blue-950">
                                            Tiếng Việt
                                        </p>
                                        <p className="text-[11px] text-slate-500 font-medium">
                                            {t('settings.vietnameseDesc', 'Ngôn ngữ Tiếng Việt mặc định')}
                                        </p>
                                    </div>
                                </div>
                                {language === 'vi' ? (
                                    <span className="w-6 h-6 rounded-full bg-blue-900 text-white flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-sm font-bold">check</span>
                                    </span>
                                ) : (
                                    <span className="w-6 h-6 rounded-full border border-slate-300 group-hover:border-slate-400 shrink-0"></span>
                                )}
                            </button>

                            {/* Thẻ lựa chọn: English */}
                            <button
                                type="button"
                                onClick={() => handleSelectLanguage('en')}
                                className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between group cursor-pointer ${
                                    language === 'en'
                                        ? 'border-blue-900 bg-blue-50/60 shadow-sm ring-2 ring-blue-900/10'
                                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl shrink-0">🇬🇧</span>
                                    <div>
                                        <p className="font-extrabold text-sm text-slate-900 group-hover:text-blue-950">
                                            English
                                        </p>
                                        <p className="text-[11px] text-slate-500 font-medium">
                                            {t('settings.englishDesc', 'English (US & Global standard)')}
                                        </p>
                                    </div>
                                </div>
                                {language === 'en' ? (
                                    <span className="w-6 h-6 rounded-full bg-blue-900 text-white flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-sm font-bold">check</span>
                                    </span>
                                ) : (
                                    <span className="w-6 h-6 rounded-full border border-slate-300 group-hover:border-slate-400 shrink-0"></span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Vạch ngăn cách */}
                    <div className="border-t border-slate-100"></div>

                    {/* PHẦN 3: ĐƠN VỊ TIỀN TỆ (CURRENCY) */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-base text-blue-900">payments</span>
                            <span>{t('settings.currencySection', 'Đơn vị tiền tệ hiển thị')}</span>
                        </h4>
                        <p className="text-xs text-slate-500">
                            {t('settings.currencyDesc', 'Định dạng số tiền hiển thị trên các biểu đồ và báo cáo')}
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => handleSelectCurrency('VND')}
                                className={`p-3 rounded-2xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                                    currency === 'VND'
                                        ? 'border-blue-900 bg-blue-50/70 font-bold text-blue-950'
                                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-base font-black text-blue-900">₫</span>
                                    <div>
                                        <p className="text-xs font-bold">Việt Nam Đồng (VND)</p>
                                        <p className="text-[10px] text-slate-500">100.000 đ</p>
                                    </div>
                                </div>
                                {currency === 'VND' && (
                                    <span className="material-symbols-outlined text-blue-900 text-base">check_circle</span>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSelectCurrency('USD')}
                                className={`p-3 rounded-2xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                                    currency === 'USD'
                                        ? 'border-blue-900 bg-blue-50/70 font-bold text-blue-950'
                                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-base font-black text-blue-900">$</span>
                                    <div>
                                        <p className="text-xs font-bold">US Dollar (USD)</p>
                                        <p className="text-[10px] text-slate-500">$100.00</p>
                                    </div>
                                </div>
                                {currency === 'USD' && (
                                    <span className="material-symbols-outlined text-blue-900 text-base">check_circle</span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Vạch ngăn cách */}
                    <div className="border-t border-slate-100"></div>

                    {/* PHẦN 4: CỠ CHỮ & THU PHÓNG (APPEARANCE & FONT ZOOM) */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-base text-blue-900">format_size</span>
                            <span>{t('settings.appearanceSection', 'Cỡ chữ & Giao diện')}</span>
                        </h4>
                        <p className="text-xs text-slate-500">
                            {t('settings.appearanceDesc', 'Điều chỉnh kích thước hiển thị chữ trên màn hình')}
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => handleSelectFontSize('normal')}
                                className={`p-3 rounded-2xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                                    fontSize === 'normal'
                                        ? 'border-blue-900 bg-blue-50/70 font-bold text-blue-950'
                                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                }`}
                            >
                                <div>
                                    <p className="text-xs font-bold">{t('settings.fontSizeStandard', 'Tiêu chuẩn (100%)')}</p>
                                    <p className="text-[10px] text-slate-500">Mặc định hệ thống</p>
                                </div>
                                {fontSize === 'normal' && (
                                    <span className="material-symbols-outlined text-blue-900 text-base">check_circle</span>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSelectFontSize('large')}
                                className={`p-3 rounded-2xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                                    fontSize === 'large'
                                        ? 'border-blue-900 bg-blue-50/70 font-bold text-blue-950'
                                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                }`}
                            >
                                <div>
                                    <p className="text-xs font-bold">{t('settings.fontSizeLarge', 'Phóng to chữ (115%)')}</p>
                                    <p className="text-[10px] text-slate-500">{t('settings.fontSizeDesc', 'Rõ nét, dễ đọc số liệu')}</p>
                                </div>
                                {fontSize === 'large' && (
                                    <span className="material-symbols-outlined text-blue-900 text-base">check_circle</span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Section Buttons */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0 bg-white/95 backdrop-blur-sm py-2">
                        <button
                            type="button"
                            onClick={closeSettings}
                            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                            {t('settings.close', 'Đóng')}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setSaveSuccess(true);
                                setTimeout(() => {
                                    setSaveSuccess(false);
                                    closeSettings();
                                }, 600);
                            }}
                            className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-900/20 cursor-pointer flex items-center gap-1.5"
                        >
                            <span className="material-symbols-outlined text-sm">check</span>
                            <span>{t('settings.saveSettings', 'Lưu cài đặt')}</span>
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default SettingsModal;