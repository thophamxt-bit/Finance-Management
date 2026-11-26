import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

const CATEGORY_OPTIONS = [
    { value: 'OCR_ISSUE', vi: 'Lỗi quét hóa đơn (OCR)', en: 'Receipt OCR Issue' },
    { value: 'TRANSACTION_ERROR', vi: 'Lỗi giao dịch / số dư ví', en: 'Transaction / Balance Error' },
    { value: 'ACCOUNT', vi: 'Tài khoản / Mật khẩu / OTP', en: 'Account / Password / OTP' },
    { value: 'GROUP', vi: 'Chi tiêu nhóm / Chia tiền', en: 'Group Expenses / Split Bill' },
    { value: 'FEEDBACK', vi: 'Góp ý tính năng mới', en: 'Feature Feedback' },
    { value: 'OTHER', vi: 'Khác', en: 'Other' }
];

const PRIORITY_OPTIONS = [
    { value: 'LOW', vi: 'Thấp', en: 'Low', badge: 'bg-slate-100 text-slate-700' },
    { value: 'MEDIUM', vi: 'Trung bình', en: 'Medium', badge: 'bg-blue-100 text-blue-800' },
    { value: 'HIGH', vi: 'Cao', en: 'High', badge: 'bg-amber-100 text-amber-800' },
    { value: 'URGENT', vi: 'Khẩn cấp', en: 'Urgent', badge: 'bg-rose-100 text-rose-700' }
];

const STATUS_BADGES = {
    OPEN: { vi: 'Đang mở', en: 'Open', cls: 'bg-blue-100 text-blue-800 border-blue-200' },
    IN_PROGRESS: { vi: 'Đang xử lý', en: 'In Progress', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
    RESOLVED: { vi: 'Đã giải quyết', en: 'Resolved', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    CLOSED: { vi: 'Đã đóng', en: 'Closed', cls: 'bg-slate-200 text-slate-600 border-slate-300' }
};

const ANNOUNCEMENT_STYLES = {
    INFO: {
        vi: 'Thông tin',
        en: 'Info',
        icon: 'campaign',
        card: 'bg-blue-50/90 border-blue-200 text-blue-950',
        badge: 'bg-blue-600 text-white'
    },
    WARNING: {
        vi: 'Cảnh báo',
        en: 'Warning',
        icon: 'warning',
        card: 'bg-amber-50/90 border-amber-200 text-amber-950',
        badge: 'bg-amber-600 text-white'
    },
    MAINTENANCE: {
        vi: 'Bảo trì',
        en: 'Maintenance',
        icon: 'build_circle',
        card: 'bg-rose-50/90 border-rose-200 text-rose-950',
        badge: 'bg-rose-600 text-white'
    },
    PROMOTION: {
        vi: 'Cập nhật mới',
        en: 'Update',
        icon: 'new_releases',
        card: 'bg-emerald-50/90 border-emerald-200 text-emerald-950',
        badge: 'bg-emerald-600 text-white'
    }
};

const HIDDEN_PATHS = ['/', '/login', '/register', '/forgot-password', '/admin', '/admin/dashboard'];

const UserSupportAndAnnouncementsWidget = () => {
    const location = useLocation();
    const { language } = useLanguage();
    const isEn = language === 'en';

    const isHidden =
        HIDDEN_PATHS.includes(location.pathname) ||
        !localStorage.getItem('token');

    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('TICKETS'); // 'TICKETS' | 'ANNOUNCEMENTS'

    // Announcements state
    const [announcements, setAnnouncements] = useState([]);
    const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
    const [dismissedBannerId, setDismissedBannerId] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('temoney_seen_announcements') || '[]');
        } catch {
            return [];
        }
    });

    // Support Tickets state
    const [tickets, setTickets] = useState([]);
    const [loadingTickets, setLoadingTickets] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [submittingTicket, setSubmittingTicket] = useState(false);
    const [newTicket, setNewTicket] = useState({
        subject: '',
        category: 'OTHER',
        priority: 'MEDIUM',
        description: ''
    });

    // Ticket detail & conversation state
    const [selectedTicketDetail, setSelectedTicketDetail] = useState(null); // { ticket, messages }
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [sendingReply, setSendingReply] = useState(false);
    const messagesEndRef = useRef(null);

    const fetchAnnouncements = async () => {
        setLoadingAnnouncements(true);
        try {
            const res = await api.get('/api/announcements/active');
            setAnnouncements(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Lỗi tải thông báo ứng dụng:', err);
        } finally {
            setLoadingAnnouncements(false);
        }
    };

    const fetchMyTickets = async () => {
        if (!localStorage.getItem('token')) return;
        setLoadingTickets(true);
        try {
            const res = await api.get('/api/support/my-tickets');
            setTickets(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Lỗi tải danh sách vé hỗ trợ:', err);
        } finally {
            setLoadingTickets(false);
        }
    };

    const fetchTicketDetail = async (ticketId) => {
        setLoadingDetail(true);
        try {
            const res = await api.get(`/api/support/tickets/${ticketId}`);
            setSelectedTicketDetail(res.data);
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 120);
        } catch (err) {
            alert(err.response?.data?.message || (isEn ? 'Failed to load ticket details.' : 'Không thể tải chi tiết vé hỗ trợ!'));
        } finally {
            setLoadingDetail(false);
        }
    };

    useEffect(() => {
        if (isHidden) return;
        fetchAnnouncements();
    }, [isHidden, location.pathname]);

    useEffect(() => {
        if (!isHidden && isOpen) {
            fetchAnnouncements();
            fetchMyTickets();
        }
    }, [isOpen, isHidden]);

    useEffect(() => {
        const handleOpenSupport = (e) => {
            const tab = e.detail?.tab || 'TICKETS';
            const openCreate = !!e.detail?.createNew;
            setActiveTab(tab);
            setSelectedTicketDetail(null);
            setShowCreateForm(openCreate);
            setIsOpen(true);
            if (tab === 'ANNOUNCEMENTS') {
                const allIds = Array.from(new Set([...dismissedBannerId, ...announcements.map((a) => a.id)]));
                setDismissedBannerId(allIds);
                localStorage.setItem('temoney_seen_announcements', JSON.stringify(allIds));
            }
        };
        window.addEventListener('temoney_open_support', handleOpenSupport);
        return () => window.removeEventListener('temoney_open_support', handleOpenSupport);
    }, [announcements, dismissedBannerId]);

    if (isHidden) return null;

    const unreadAnnouncements = announcements.filter((a) => !dismissedBannerId.includes(a.id));
    const unreadCount = unreadAnnouncements.length;

    const markAllAnnouncementsRead = () => {
        const allIds = Array.from(new Set([...dismissedBannerId, ...announcements.map((a) => a.id)]));
        setDismissedBannerId(allIds);
        localStorage.setItem('temoney_seen_announcements', JSON.stringify(allIds));
    };

    const handleCreateTicket = async (e) => {
        e.preventDefault();
        if (!newTicket.subject.trim() || !newTicket.description.trim()) {
            return alert(isEn ? 'Please enter both subject and description.' : 'Vui lòng nhập đầy đủ tiêu đề và nội dung mô tả!');
        }
        setSubmittingTicket(true);
        try {
            await api.post('/api/support/tickets', {
                subject: newTicket.subject.trim(),
                category: newTicket.category,
                priority: newTicket.priority,
                description: newTicket.description.trim()
            });
            setNewTicket({ subject: '', category: 'OTHER', priority: 'MEDIUM', description: '' });
            setShowCreateForm(false);
            await fetchMyTickets();
        } catch (err) {
            alert(err.response?.data?.message || (isEn ? 'Failed to submit support ticket.' : 'Lỗi khi gửi vé hỗ trợ!'));
        } finally {
            setSubmittingTicket(false);
        }
    };

    const handleSendReply = async (e) => {
        e.preventDefault();
        if (!replyText.trim() || !selectedTicketDetail?.ticket?.id) return;
        setSendingReply(true);
        try {
            await api.post(`/api/support/tickets/${selectedTicketDetail.ticket.id}/reply`, {
                content: replyText.trim(),
                isInternalNote: false
            });
            setReplyText('');
            await fetchTicketDetail(selectedTicketDetail.ticket.id);
            await fetchMyTickets();
        } catch (err) {
            alert(err.response?.data?.message || (isEn ? 'Failed to send reply.' : 'Lỗi khi gửi phản hồi!'));
        } finally {
            setSendingReply(false);
        }
    };

    const getCategoryLabel = (val) => {
        const found = CATEGORY_OPTIONS.find((c) => c.value === val);
        return found ? (isEn ? found.en : found.vi) : val;
    };

    const getPriorityMeta = (val) => {
        const found = PRIORITY_OPTIONS.find((p) => p.value === val) || PRIORITY_OPTIONS[1];
        return { label: isEn ? found.en : found.vi, badge: found.badge };
    };

    const getStatusMeta = (val) => {
        const found = STATUS_BADGES[val] || STATUS_BADGES.OPEN;
        return { label: isEn ? found.en : found.vi, cls: found.cls };
    };

    return (
        <>
            {/* Top Banner tự động khi có thông báo mới chưa đọc từ hệ thống */}
            {unreadCount > 0 && !isOpen && (
                <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[65] w-[calc(100vw-2rem)] max-w-xl animate-in fade-in slide-in-from-top-3 duration-200">
                    {(() => {
                        const latest = unreadAnnouncements[0];
                        const style = ANNOUNCEMENT_STYLES[latest.type] || ANNOUNCEMENT_STYLES.INFO;
                        return (
                            <div className={`px-4 py-2.5 rounded-2xl border shadow-lg backdrop-blur-md flex items-center justify-between gap-3 ${style.card}`}>
                                <div
                                    onClick={() => {
                                        setActiveTab('ANNOUNCEMENTS');
                                        setIsOpen(true);
                                        markAllAnnouncementsRead();
                                    }}
                                    className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                                >
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0 ${style.badge}`}>
                                        {isEn ? style.en : style.vi}
                                    </span>
                                    <p className="text-xs font-bold truncate">
                                        {latest.title}: <span className="font-normal opacity-90">{latest.content}</span>
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={markAllAnnouncementsRead}
                                    className="w-6 h-6 rounded-full hover:bg-black/10 flex items-center justify-center shrink-0 cursor-pointer"
                                    title={isEn ? 'Dismiss' : 'Đóng thông báo'}
                                >
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Drawer / Modal Hỗ trợ & Thông báo (mở từ phần Cài đặt hoặc từ banner thông báo) */}
            {isOpen && (
                <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-2xl text-amber-300">
                                        {activeTab === 'TICKETS' ? 'confirmation_number' : 'notifications_active'}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="font-headline font-black text-base md:text-lg leading-tight">
                                        {isEn ? 'Support Center & Announcements' : 'Trung tâm Hỗ trợ & Thông báo'}
                                    </h3>
                                    <p className="text-xs text-blue-200">
                                        {isEn
                                            ? 'Submit support tickets and view system updates'
                                            : 'Gửi vé hỗ trợ kỹ thuật và theo dõi thông báo mới từ Temoney'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="px-6 pt-3 pb-0 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveTab('TICKETS');
                                        setSelectedTicketDetail(null);
                                    }}
                                    className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                                        activeTab === 'TICKETS'
                                            ? 'border-blue-900 text-blue-950 bg-white'
                                            : 'border-transparent text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-base">confirmation_number</span>
                                    <span>{isEn ? 'My Tickets' : 'Vé hỗ trợ của tôi'} ({tickets.length})</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveTab('ANNOUNCEMENTS');
                                        markAllAnnouncementsRead();
                                    }}
                                    className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                                        activeTab === 'ANNOUNCEMENTS'
                                            ? 'border-blue-900 text-blue-950 bg-white'
                                            : 'border-transparent text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-base">campaign</span>
                                    <span>{isEn ? 'Announcements' : 'Thông báo ứng dụng'} ({announcements.length})</span>
                                </button>
                            </div>

                            {activeTab === 'TICKETS' && !selectedTicketDetail && (
                                <button
                                    type="button"
                                    onClick={() => setShowCreateForm(!showCreateForm)}
                                    className="mb-2 px-3 py-1.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-sm">
                                        {showCreateForm ? 'arrow_back' : 'add'}
                                    </span>
                                    <span>
                                        {showCreateForm
                                            ? (isEn ? 'Back' : 'Danh sách')
                                            : (isEn ? 'New Ticket' : 'Tạo vé mới')}
                                    </span>
                                </button>
                            )}
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 bg-white">
                            {/* TAB 1: VÉ HỖ TRỢ */}
                            {activeTab === 'TICKETS' && (
                                <>
                                    {/* Form tạo vé mới */}
                                    {showCreateForm ? (
                                        <form onSubmit={handleCreateTicket} className="space-y-4">
                                            <div>
                                                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                                                    {isEn ? 'Subject' : 'Tiêu đề yêu cầu'} *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={newTicket.subject}
                                                    onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                                                    placeholder={isEn ? 'e.g., OCR failed to read receipt amount' : 'VD: Không quét được hóa đơn hoặc cần hỗ trợ tài khoản...'}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
                                                    required
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                                                        {isEn ? 'Category' : 'Danh mục sự cố'}
                                                    </label>
                                                    <select
                                                        value={newTicket.category}
                                                        onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
                                                    >
                                                        {CATEGORY_OPTIONS.map((c) => (
                                                            <option key={c.value} value={c.value}>
                                                                {isEn ? c.en : c.vi}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                                                        {isEn ? 'Priority' : 'Mức độ ưu tiên'}
                                                    </label>
                                                    <select
                                                        value={newTicket.priority}
                                                        onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
                                                    >
                                                        {PRIORITY_OPTIONS.map((p) => (
                                                            <option key={p.value} value={p.value}>
                                                                {isEn ? p.en : p.vi}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                                                    {isEn ? 'Detailed Description' : 'Mô tả chi tiết'} *
                                                </label>
                                                <textarea
                                                    rows={4}
                                                    value={newTicket.description}
                                                    onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                                                    placeholder={isEn ? 'Describe your issue or feedback in detail...' : 'Mô tả rõ vấn đề bạn đang gặp phải để đội ngũ hỗ trợ xử lý nhanh nhất...'}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900 resize-none"
                                                    required
                                                />
                                            </div>

                                            <div className="flex justify-end gap-2 pt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCreateForm(false)}
                                                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                                                >
                                                    {isEn ? 'Cancel' : 'Hủy'}
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={submittingTicket}
                                                    className="px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                                                >
                                                    <span className="material-symbols-outlined text-base">send</span>
                                                    <span>{submittingTicket ? (isEn ? 'Submitting...' : 'Đang gửi...') : (isEn ? 'Submit Ticket' : 'Gửi vé hỗ trợ')}</span>
                                                </button>
                                            </div>
                                        </form>
                                    ) : selectedTicketDetail ? (
                                        /* Chi tiết 1 vé hỗ trợ + hội thoại phản hồi */
                                        <div className="flex flex-col h-full space-y-4">
                                            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedTicketDetail(null)}
                                                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-900 hover:underline cursor-pointer"
                                                >
                                                    <span className="material-symbols-outlined text-base">arrow_back</span>
                                                    <span>{isEn ? 'Back to list' : 'Quay lại danh sách'}</span>
                                                </button>
                                                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusMeta(selectedTicketDetail.ticket?.status).cls}`}>
                                                    {getStatusMeta(selectedTicketDetail.ticket?.status).label}
                                                </span>
                                            </div>

                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                                                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold mb-1">
                                                    <span className="font-mono text-blue-900 font-bold">{selectedTicketDetail.ticket?.ticketCode}</span>
                                                    <span>•</span>
                                                    <span>{getCategoryLabel(selectedTicketDetail.ticket?.category)}</span>
                                                </div>
                                                <h4 className="font-bold text-slate-900 text-base">{selectedTicketDetail.ticket?.subject}</h4>
                                                <p className="text-xs text-slate-600 mt-1.5 whitespace-pre-line">{selectedTicketDetail.ticket?.description}</p>
                                            </div>

                                            {/* Tin nhắn trao đổi */}
                                            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                                {loadingDetail ? (
                                                    <p className="text-center text-xs text-slate-400 py-6">{isEn ? 'Loading messages...' : 'Đang tải trao đổi...'}</p>
                                                ) : (selectedTicketDetail.messages || []).length > 0 ? (
                                                    selectedTicketDetail.messages.map((msg) => {
                                                        const isStaff = msg.sender?.role === 'ROLE_ADMIN' || msg.sender?.role === 'ROLE_SUPPORT';
                                                        return (
                                                            <div key={msg.id} className={`flex flex-col ${isStaff ? 'items-start' : 'items-end'}`}>
                                                                <span className="text-[10px] font-bold text-slate-400 mb-1 px-1">
                                                                    {isStaff ? (isEn ? 'Support Team' : 'Đội ngũ Hỗ trợ') : (isEn ? 'You' : 'Bạn')} •{' '}
                                                                    {msg.sentAt ? new Date(msg.sentAt).toLocaleString('vi-VN') : ''}
                                                                </span>
                                                                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                                                                    isStaff
                                                                        ? 'bg-slate-100 text-slate-800 border border-slate-200 rounded-tl-sm'
                                                                        : 'bg-blue-900 text-white rounded-tr-sm'
                                                                }`}>
                                                                    {msg.content}
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <p className="text-center text-xs text-slate-400 italic py-4">
                                                        {isEn ? 'No replies yet. Our support team will respond shortly.' : 'Chưa có phản hồi. Đội ngũ hỗ trợ sẽ phản hồi sớm nhất.'}
                                                    </p>
                                                )}
                                                <div ref={messagesEndRef} />
                                            </div>

                                            {selectedTicketDetail.ticket?.status !== 'CLOSED' && (
                                                <form onSubmit={handleSendReply} className="flex gap-2 pt-2 border-t border-slate-200">
                                                    <input
                                                        type="text"
                                                        value={replyText}
                                                        onChange={(e) => setReplyText(e.target.value)}
                                                        placeholder={isEn ? 'Write a follow-up message...' : 'Nhập nội dung phản hồi thêm...'}
                                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-900"
                                                    />
                                                    <button
                                                        type="submit"
                                                        disabled={sendingReply || !replyText.trim()}
                                                        className="px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer"
                                                    >
                                                        {sendingReply ? '...' : (isEn ? 'Send' : 'Gửi')}
                                                    </button>
                                                </form>
                                            )}
                                        </div>
                                    ) : (
                                        /* Danh sách vé hỗ trợ của user */
                                        <div className="space-y-3">
                                            {loadingTickets ? (
                                                <p className="text-center text-xs text-slate-400 py-10">{isEn ? 'Loading tickets...' : 'Đang tải danh sách vé hỗ trợ...'}</p>
                                            ) : tickets.length > 0 ? (
                                                tickets.map((tk) => {
                                                    const st = getStatusMeta(tk.status);
                                                    const pr = getPriorityMeta(tk.priority);
                                                    return (
                                                        <div
                                                            key={tk.id}
                                                            onClick={() => fetchTicketDetail(tk.id)}
                                                            className="p-4 rounded-2xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                                        >
                                                            <div className="min-w-0">
                                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                                    <span className="text-[11px] font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md">
                                                                        {tk.ticketCode}
                                                                    </span>
                                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${pr.badge}`}>
                                                                        {pr.label}
                                                                    </span>
                                                                    <span className="text-[11px] text-slate-400">
                                                                        {getCategoryLabel(tk.category)}
                                                                    </span>
                                                                </div>
                                                                <h4 className="font-bold text-sm text-slate-900 truncate">{tk.subject}</h4>
                                                                <p className="text-xs text-slate-500 truncate mt-0.5">{tk.description}</p>
                                                            </div>
                                                            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 shrink-0">
                                                                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${st.cls}`}>
                                                                    {st.label}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400">
                                                                    {tk.createdAt ? new Date(tk.createdAt).toLocaleDateString('vi-VN') : ''}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                                    <span className="material-symbols-outlined text-4xl text-slate-300">confirmation_number</span>
                                                    <p className="text-sm font-bold text-slate-600 mt-2">
                                                        {isEn ? 'No support tickets yet' : 'Bạn chưa gửi vé hỗ trợ nào'}
                                                    </p>
                                                    <p className="text-xs text-slate-400 mt-1">
                                                        {isEn ? 'Need help? Click "New Ticket" to reach our team.' : 'Gặp lỗi hoặc muốn góp ý? Bấm "Tạo vé mới" để gửi ngay cho quản trị viên.'}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}

                            {/* TAB 2: THÔNG BÁO ỨNG DỤNG */}
                            {activeTab === 'ANNOUNCEMENTS' && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-slate-500">
                                            {isEn ? 'Active system announcements' : 'Các thông báo đang phát hành'}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={fetchAnnouncements}
                                            className="text-xs font-bold text-blue-900 hover:underline flex items-center gap-1 cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-sm">refresh</span>
                                            <span>{isEn ? 'Refresh' : 'Làm mới'}</span>
                                        </button>
                                    </div>

                                    {loadingAnnouncements ? (
                                        <p className="text-center text-xs text-slate-400 py-10">{isEn ? 'Loading announcements...' : 'Đang tải thông báo...'}</p>
                                    ) : announcements.length > 0 ? (
                                        announcements.map((ann) => {
                                            const style = ANNOUNCEMENT_STYLES[ann.type] || ANNOUNCEMENT_STYLES.INFO;
                                            return (
                                                <div key={ann.id} className={`p-4 rounded-2xl border shadow-2xs ${style.card}`}>
                                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="material-symbols-outlined text-lg">{style.icon}</span>
                                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${style.badge}`}>
                                                                {isEn ? style.en : style.vi}
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] opacity-70 font-medium">
                                                            {ann.createdAt ? new Date(ann.createdAt).toLocaleString('vi-VN') : ''}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-sm">{ann.title}</h4>
                                                    <p className="text-xs mt-1 leading-relaxed whitespace-pre-line opacity-90">{ann.content}</p>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                            <span className="material-symbols-outlined text-4xl text-slate-300">notifications_off</span>
                                            <p className="text-sm font-bold text-slate-600 mt-2">
                                                {isEn ? 'No active announcements' : 'Hiện chưa có thông báo mới từ hệ thống'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default UserSupportAndAnnouncementsWidget;
