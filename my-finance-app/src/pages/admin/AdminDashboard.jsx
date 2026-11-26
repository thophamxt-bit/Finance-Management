import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const AdminDashboard = () => {
    const navigate = useNavigate();

    // --- State Tab chính ---
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'access_logs' | 'audit_logs' | 'announcements'
    const [loading, setLoading] = useState(true);
    const [adminProfile, setAdminProfile] = useState(null);

    // --- State Thống kê ---
    const [stats, setStats] = useState(null);

    // --- State Danh sách người dùng & Tìm kiếm ---
    const [usersPage, setUsersPage] = useState({ content: [], totalPages: 0, totalElements: 0, number: 0 });
    const [searchKeyword, setSearchKeyword] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedRole, setSelectedRole] = useState('');
    const [usersCurrentPage, setUsersCurrentPage] = useState(0);

    // --- State Modal Chi tiết người dùng ---
    const [selectedUserDetail, setSelectedUserDetail] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // --- State Modal Đổi trạng thái ---
    const [statusModalUser, setStatusModalUser] = useState(null);
    const [statusChangeValue, setStatusChangeValue] = useState('ACTIVE');
    const [statusReason, setStatusReason] = useState('');
    const [submittingStatus, setSubmittingStatus] = useState(false);

    // --- State Logs ---
    const [accessLogs, setAccessLogs] = useState({ content: [], totalPages: 0, number: 0 });
    const [auditLogs, setAuditLogs] = useState({ content: [], totalPages: 0, number: 0 });
    const [logsPage, setLogsPage] = useState(0);

    // --- State Thông báo hệ thống (Admin Announcements) ---
    const [announcements, setAnnouncements] = useState([]);
    const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
    const [submittingAnnouncement, setSubmittingAnnouncement] = useState(false);
    const [announcementFeedback, setAnnouncementFeedback] = useState(null);
    const [newAnnouncement, setNewAnnouncement] = useState({
        title: '',
        content: '',
        type: 'INFO',
        isActive: true
    });

    // Format tiền tệ
    const formatMoney = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
            .format(amount || 0)
            .replace('₫', 'đ');
    };

    // Format ngày giờ
    const formatDateTime = (dateStr) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleString('vi-VN', {
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    };

    // 1. Kiểm tra xác thực Admin & Lấy thông tin
    useEffect(() => {
        const verifyAdmin = async () => {
            const token = localStorage.getItem("token");
            if (!token) return navigate("/login");

            try {
                const res = await api.get("/api/auth/profile");
                const user = res.data;
                if (!user || user.role !== 'ROLE_ADMIN') {
                    alert("Bạn không có quyền truy cập trang Quản trị viên!");
                    return navigate("/dashboard");
                }
                setAdminProfile(user);
                localStorage.setItem("role", user.role);
                fetchStats();
            } catch (err) {
                console.error("Lỗi xác thực quyền admin:", err);
                alert("Phiên đăng nhập hết hạn hoặc bạn không có quyền Quản trị viên.");
                navigate("/login");
            }
        };

        verifyAdmin();
    }, [navigate]);

    // 2. Tải thống kê Dashboard
    const fetchStats = async () => {
        try {
            setLoading(true);
            const res = await api.get("/api/admin/dashboard/stats");
            setStats(res.data);
        } catch (err) {
            console.error("Lỗi lấy dữ liệu thống kê admin:", err);
        } finally {
            setLoading(false);
        }
    };

    // 3. Tải danh sách người dùng
    const fetchUsers = async (page = 0) => {
        try {
            setLoading(true);
            const params = {
                page,
                size: 10,
                sortBy: 'createdAt',
                direction: 'desc'
            };
            if (searchKeyword.trim()) params.keyword = searchKeyword.trim();
            if (selectedStatus) params.status = selectedStatus;
            if (selectedRole) params.role = selectedRole;

            const res = await api.get("/api/admin/users", { params });
            setUsersPage(res.data || { content: [], totalPages: 0, totalElements: 0, number: 0 });
            setUsersCurrentPage(page);
        } catch (err) {
            console.error("Lỗi lấy danh sách người dùng:", err);
        } finally {
            setLoading(false);
        }
    };

    // 4. Tải Nhật ký truy cập
    const fetchAccessLogs = async (page = 0) => {
        try {
            setLoading(true);
            const res = await api.get("/api/admin/access-logs", { params: { page, size: 15 } });
            setAccessLogs(res.data || { content: [], totalPages: 0, number: 0 });
            setLogsPage(page);
        } catch (err) {
            console.error("Lỗi lấy lịch sử truy cập:", err);
        } finally {
            setLoading(false);
        }
    };

    // 5. Tải Nhật ký kiểm toán
    const fetchAuditLogs = async (page = 0) => {
        try {
            setLoading(true);
            const res = await api.get("/api/admin/audit-logs", { params: { page, size: 15 } });
            setAuditLogs(res.data || { content: [], totalPages: 0, number: 0 });
            setLogsPage(page);
        } catch (err) {
            console.error("Lỗi lấy nhật ký kiểm toán:", err);
        } finally {
            setLoading(false);
        }
    };

    // 6. Tải danh sách Thông báo hệ thống
    const fetchAnnouncements = async () => {
        try {
            setLoadingAnnouncements(true);
            const res = await api.get("/api/admin/announcements");
            setAnnouncements(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Lỗi tải danh sách thông báo:", err);
        } finally {
            setLoadingAnnouncements(false);
        }
    };

    // Tạo thông báo mới (POST /api/admin/announcements)
    const handleCreateAnnouncement = async (e) => {
        e.preventDefault();
        if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
            setAnnouncementFeedback({ type: 'error', text: 'Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo!' });
            return;
        }
        setSubmittingAnnouncement(true);
        setAnnouncementFeedback(null);
        try {
            await api.post("/api/admin/announcements", {
                title: newAnnouncement.title.trim(),
                content: newAnnouncement.content.trim(),
                type: newAnnouncement.type,
                isActive: newAnnouncement.isActive
            });
            setNewAnnouncement({ title: '', content: '', type: 'INFO', isActive: true });
            setAnnouncementFeedback({ type: 'success', text: 'Đã phát hành thông báo hệ thống thành công!' });
            await fetchAnnouncements();
            setTimeout(() => setAnnouncementFeedback(null), 3500);
        } catch (err) {
            setAnnouncementFeedback({
                type: 'error',
                text: err.response?.data?.message || 'Lỗi khi tạo thông báo mới!'
            });
        } finally {
            setSubmittingAnnouncement(false);
        }
    };

    // Bật / tắt thông báo (PUT /api/admin/announcements/{id}/toggle)
    const handleToggleAnnouncement = async (id) => {
        try {
            await api.put(`/api/admin/announcements/${id}/toggle`);
            await fetchAnnouncements();
        } catch (err) {
            alert(err.response?.data?.message || 'Lỗi khi đổi trạng thái thông báo!');
        }
    };

    // Xoá thông báo (DELETE /api/admin/announcements/{id})
    const handleDeleteAnnouncement = async (ann) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xoá thông báo "${ann.title}" không?`)) return;
        try {
            await api.delete(`/api/admin/announcements/${ann.id}`);
            await fetchAnnouncements();
        } catch (err) {
            alert(err.response?.data?.message || 'Lỗi khi xoá thông báo!');
        }
    };

    // Kích hoạt nạp dữ liệu khi chuyển tab
    useEffect(() => {
        if (activeTab === 'overview') fetchStats();
        else if (activeTab === 'users') fetchUsers(0);
        else if (activeTab === 'access_logs') fetchAccessLogs(0);
        else if (activeTab === 'audit_logs') fetchAuditLogs(0);
        else if (activeTab === 'announcements') fetchAnnouncements();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    // Xem chi tiết người dùng
    const handleViewUserDetail = async (userId) => {
        try {
            setLoadingDetail(true);
            setShowDetailModal(true);
            const res = await api.get(`/api/admin/users/${userId}`);
            setSelectedUserDetail(res.data);
        } catch (err) {
            console.error("Lỗi lấy chi tiết người dùng:", err);
            alert("Không thể tải thông tin chi tiết người dùng.");
            setShowDetailModal(false);
        } finally {
            setLoadingDetail(false);
        }
    };

    // Mở modal đổi trạng thái
    const handleOpenStatusModal = (user) => {
        setStatusModalUser(user);
        setStatusChangeValue(user.status || 'ACTIVE');
        setStatusReason('');
    };

    // Xác nhận đổi trạng thái
    const handleConfirmStatusChange = async () => {
        if (!statusModalUser) return;
        try {
            setSubmittingStatus(true);
            await api.put(`/api/admin/users/${statusModalUser.id}/status`, {
                status: statusChangeValue,
                reason: statusReason.trim() || 'Cập nhật bởi Quản trị viên'
            });
            alert(`Đã cập nhật trạng thái người dùng thành công!`);
            setStatusModalUser(null);
            fetchUsers(usersCurrentPage);
            if (activeTab === 'overview') fetchStats();
        } catch (err) {
            console.error("Lỗi cập nhật trạng thái:", err);
            alert(err.response?.data?.message || "Lỗi khi cập nhật trạng thái người dùng");
        } finally {
            setSubmittingStatus(false);
        }
    };

    // Thay đổi phân quyền (Role)
    const handleToggleRole = async (user) => {
        const targetRole = user.role === 'ROLE_ADMIN' ? 'ROLE_USER' : 'ROLE_ADMIN';
        const confirmMsg = targetRole === 'ROLE_ADMIN'
            ? `Bạn có chắc muốn nâng cấp người dùng "${user.fullName || user.username}" lên quyền Quản Trị Viên (ROLE_ADMIN)?`
            : `Bạn có chắc muốn chuyển quyền người dùng "${user.fullName || user.username}" về Người Dùng Tiêu Chuẩn (ROLE_USER)?`;

        if (!window.confirm(confirmMsg)) return;

        try {
            await api.put(`/api/admin/users/${user.id}/role`, { role: targetRole });
            alert("Đã cập nhật phân quyền người dùng thành công!");
            fetchUsers(usersCurrentPage);
        } catch (err) {
            console.error("Lỗi phân quyền:", err);
            alert(err.response?.data?.message || "Lỗi khi cập nhật phân quyền");
        }
    };

    // Đăng xuất
    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    return (
        <div className="bg-[#fcf8f4] min-h-screen text-slate-800 font-sans antialiased">
            {/* ========================================================
                1. TOP BAR QUẢN TRỊ VIÊN CHUYÊN NGHIỆP
                ======================================================== */}
            <header className="bg-white border-b border-amber-200/80 sticky top-0 z-40 shadow-xs px-6 py-3.5">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3.5">
                        <img src="/Teemoney.png" alt="Temoney Logo" className="w-10 h-10 object-contain drop-shadow-sm cursor-pointer" onClick={() => navigate('/dashboard')} />
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-black text-amber-950 tracking-tight">Temoney Admin</h1>
                                <span className="inline-flex items-center gap-1 bg-amber-500 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs shadow-amber-500/20">
                                    <span className="material-symbols-outlined text-[13px]">shield_person</span>
                                    Quản trị hệ thống
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium">Bảng điều khiển phân quyền & giám sát toàn diện</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 transition-all cursor-pointer shadow-xs active:scale-95"
                            title="Chuyển sang giao diện chi tiêu cá nhân"
                        >
                            <span className="material-symbols-outlined text-base">dashboard</span>
                            <span>Giao diện Người dùng</span>
                        </button>

                        <button
                            onClick={() => {
                                if (activeTab === 'overview') fetchStats();
                                else if (activeTab === 'users') fetchUsers(usersCurrentPage);
                                else if (activeTab === 'access_logs') fetchAccessLogs(logsPage);
                                else if (activeTab === 'audit_logs') fetchAuditLogs(logsPage);
                                else if (activeTab === 'announcements') fetchAnnouncements();
                            }}
                            className="p-2 rounded-xl text-slate-500 hover:text-amber-900 hover:bg-amber-50 border border-slate-200 transition-all cursor-pointer"
                            title="Làm mới dữ liệu"
                        >
                            <span className="material-symbols-outlined text-lg">refresh</span>
                        </button>

                        <div className="h-6 w-px bg-slate-200 mx-1"></div>

                        <div className="flex items-center gap-2 pl-1">
                            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white font-black flex items-center justify-center text-sm shadow-xs">
                                {(adminProfile?.fullName || 'A').charAt(0).toUpperCase()}
                            </div>
                            <div className="hidden sm:block text-left">
                                <p className="text-xs font-bold text-amber-950 leading-tight">{adminProfile?.fullName || 'Admin'}</p>
                                <p className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">{adminProfile?.email}</p>
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-100 transition-all cursor-pointer"
                            title="Đăng xuất khỏi hệ thống"
                        >
                            <span className="material-symbols-outlined text-lg">logout</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* ========================================================
                2. THANH ĐIỀU HƯỚNG TAB
                ======================================================== */}
            <div className="bg-white/80 backdrop-blur-md border-b border-amber-100 px-6 py-2.5">
                <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto scrollbar-none">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'overview'
                                ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                                : 'text-slate-600 hover:bg-amber-50 hover:text-amber-900'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[18px]">dashboard</span>
                        <span>Tổng quan hệ thống</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('users')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'users'
                                ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                                : 'text-slate-600 hover:bg-amber-50 hover:text-amber-900'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
                        <span>Quản lý người dùng ({stats?.totalUsers || 0})</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('access_logs')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'access_logs'
                                ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                                : 'text-slate-600 hover:bg-amber-50 hover:text-amber-900'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[18px]">history</span>
                        <span>Nhật ký truy cập</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('audit_logs')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'audit_logs'
                                ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                                : 'text-slate-600 hover:bg-amber-50 hover:text-amber-900'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[18px]">policy</span>
                        <span>Nhật ký kiểm toán (Audit)</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('announcements')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'announcements'
                                ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                                : 'text-slate-600 hover:bg-amber-50 hover:text-amber-900'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[18px]">campaign</span>
                        <span>Thông báo ứng dụng</span>
                    </button>
                </div>
            </div>

            {/* ========================================================
                3. NỘI DUNG CHÍNH (MAIN CONTENT)
                ======================================================== */}
            <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
                {/* TAB 1: TỔNG QUAN HỆ THỐNG */}
                {activeTab === 'overview' && (
                    <div className="space-y-8 animate-in fade-in duration-200">
                        {/* Hàng 1: 4 Thẻ KPI chính */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                            <div className="bg-white p-5 rounded-2xl border border-amber-100/80 shadow-xs flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-2xl">group</span>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng Người Dùng</p>
                                    <p className="text-2xl font-black text-amber-950 mt-0.5">{stats?.totalUsers || 0}</p>
                                    <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                                        +{stats?.newUsersThisWeek || 0} tuần này
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-amber-100/80 shadow-xs flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-2xl">bolt</span>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hoạt Động Hôm Nay</p>
                                    <p className="text-2xl font-black text-amber-950 mt-0.5">{stats?.activeUsersToday || 0}</p>
                                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                                        Tháng này: {stats?.activeUsersThisMonth || 0}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-amber-100/80 shadow-xs flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-2xl">receipt_long</span>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng Giao Dịch</p>
                                    <p className="text-2xl font-black text-amber-950 mt-0.5">{stats?.totalTransactions || 0}</p>
                                    <p className="text-[11px] text-blue-600 font-semibold mt-0.5">
                                        +{stats?.transactionsToday || 0} phát sinh hôm nay
                                    </p>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 p-5 rounded-2xl text-white shadow-sm flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 text-white">
                                    <span className="material-symbols-outlined text-2xl">account_balance</span>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider opacity-85">Tổng Tiền Hệ Thống</p>
                                    <p className="text-xl font-black mt-0.5">{formatMoney(stats?.totalBalance || 0)}</p>
                                    <p className="text-[11px] font-semibold mt-0.5 opacity-90">
                                        Khối lượng: {formatMoney(stats?.totalVolume || 0)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Hàng 2: Trạng thái & Phân quyền */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Phân bổ Trạng thái Tài khoản */}
                            <div className="bg-white p-6 rounded-2xl border border-amber-100/80 shadow-xs">
                                <h3 className="font-black text-amber-950 text-base mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-amber-600">verified_user</span>
                                    Trạng thái Tài khoản Người dùng
                                </h3>
                                <div className="space-y-3.5">
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                                        <div className="flex items-center gap-2.5">
                                            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                                            <span className="text-xs font-bold text-emerald-900">Đang hoạt động (ACTIVE)</span>
                                        </div>
                                        <span className="text-sm font-black text-emerald-700">{stats?.userStatusCounts?.ACTIVE || 0}</span>
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/60 border border-amber-100">
                                        <div className="flex items-center gap-2.5">
                                            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                                            <span className="text-xs font-bold text-amber-900">Tạm đình chỉ (SUSPENDED)</span>
                                        </div>
                                        <span className="text-sm font-black text-amber-700">{stats?.userStatusCounts?.SUSPENDED || 0}</span>
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50/60 border border-rose-100">
                                        <div className="flex items-center gap-2.5">
                                            <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                                            <span className="text-xs font-bold text-rose-900">Bị khóa vĩnh viễn (BANNED)</span>
                                        </div>
                                        <span className="text-sm font-black text-rose-700">{stats?.userStatusCounts?.BANNED || 0}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Phân bổ Vai trò Người dùng */}
                            <div className="bg-white p-6 rounded-2xl border border-amber-100/80 shadow-xs">
                                <h3 className="font-black text-amber-950 text-base mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-amber-600">badge</span>
                                    Phân bổ Vai trò Hệ thống (Roles)
                                </h3>
                                <div className="space-y-3.5">
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <div className="flex items-center gap-2.5">
                                            <span className="w-3 h-3 rounded-full bg-slate-400"></span>
                                            <span className="text-xs font-bold text-slate-800">Người dùng cá nhân (ROLE_USER)</span>
                                        </div>
                                        <span className="text-sm font-black text-slate-700">{stats?.userRoleCounts?.ROLE_USER || 0}</span>
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/80 border border-amber-200">
                                        <div className="flex items-center gap-2.5">
                                            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                                            <span className="text-xs font-bold text-amber-950">Quản trị viên (ROLE_ADMIN)</span>
                                        </div>
                                        <span className="text-sm font-black text-amber-800">{stats?.userRoleCounts?.ROLE_ADMIN || 0}</span>
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/60 border border-indigo-100">
                                        <div className="flex items-center gap-2.5">
                                            <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                                            <span className="text-xs font-bold text-indigo-950">Nhân viên hỗ trợ (ROLE_SUPPORT)</span>
                                        </div>
                                        <span className="text-sm font-black text-indigo-700">{stats?.userRoleCounts?.ROLE_SUPPORT || 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Thẻ Cảnh báo Bảo mật */}
                        <div className="bg-white p-6 rounded-2xl border border-amber-100/80 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-xl">gpp_maybe</span>
                                </div>
                                <div>
                                    <h4 className="font-extrabold text-amber-950 text-sm">Cảnh báo An ninh & Đăng nhập thất bại</h4>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Hôm nay ghi nhận <strong className="text-rose-600">{stats?.failedLoginsToday || 0}</strong> lần đăng nhập thất bại.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setActiveTab('access_logs')}
                                className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            >
                                Xem Nhật ký Truy cập →
                            </button>
                        </div>
                    </div>
                )}

                {/* TAB 2: QUẢN LÝ NGƯỜI DÙNG */}
                {activeTab === 'users' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        {/* Bộ lọc & Tìm kiếm */}
                        <div className="bg-white p-5 rounded-2xl border border-amber-100/80 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
                            <div className="flex-1 relative">
                                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm theo Tên, Email, Username hoặc Mã User..."
                                    value={searchKeyword}
                                    onChange={(e) => setSearchKeyword(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') fetchUsers(0); }}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-amber-200/80 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-xs font-medium"
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <select
                                    value={selectedStatus}
                                    onChange={(e) => { setSelectedStatus(e.target.value); }}
                                    className="px-3 py-2.5 rounded-xl border border-amber-200/80 text-xs font-bold text-slate-700 bg-white outline-none cursor-pointer"
                                >
                                    <option value="">Tất cả trạng thái</option>
                                    <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                                    <option value="SUSPENDED">Tạm đình chỉ (SUSPENDED)</option>
                                    <option value="BANNED">Khóa (BANNED)</option>
                                </select>

                                <select
                                    value={selectedRole}
                                    onChange={(e) => { setSelectedRole(e.target.value); }}
                                    className="px-3 py-2.5 rounded-xl border border-amber-200/80 text-xs font-bold text-slate-700 bg-white outline-none cursor-pointer"
                                >
                                    <option value="">Tất cả vai trò</option>
                                    <option value="ROLE_USER">Người dùng (USER)</option>
                                    <option value="ROLE_ADMIN">Quản trị viên (ADMIN)</option>
                                    <option value="ROLE_SUPPORT">Hỗ trợ viên (SUPPORT)</option>
                                </select>

                                <button
                                    onClick={() => fetchUsers(0)}
                                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-sm shadow-amber-500/20 transition-all cursor-pointer active:scale-95 shrink-0"
                                >
                                    Tìm kiếm
                                </button>
                            </div>
                        </div>

                        {/* Bảng Danh sách Người dùng */}
                        <div className="bg-white rounded-2xl border border-amber-100/80 shadow-xs overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-amber-50/60 border-b border-amber-100 text-amber-950 font-bold uppercase tracking-wider text-[11px]">
                                            <th className="p-4">ID</th>
                                            <th className="p-4">Người dùng</th>
                                            <th className="p-4">Email / Mã User</th>
                                            <th className="p-4">Vai trò</th>
                                            <th className="p-4">Trạng thái</th>
                                            <th className="p-4">Ngày tham gia</th>
                                            <th className="p-4 text-right">Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {usersPage.content.length > 0 ? (
                                            usersPage.content.map((u) => (
                                                <tr key={u.id} className="hover:bg-amber-50/20 transition-colors">
                                                    <td className="p-4 font-mono font-bold text-slate-400">#{u.id}</td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 font-bold flex items-center justify-center shrink-0 overflow-hidden border border-amber-200">
                                                                {u.avatarUrl ? (
                                                                    <img src={u.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span>{(u.fullName || u.username || 'U').charAt(0).toUpperCase()}</span>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="font-extrabold text-amber-950 text-xs">{u.fullName || 'Chưa đặt tên'}</p>
                                                                <p className="text-[10px] text-slate-400 font-medium font-mono">@{u.username}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <p className="font-semibold text-slate-800">{u.email}</p>
                                                        {u.userCode && (
                                                            <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                                                                Mã: #{u.userCode}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                                            u.role === 'ROLE_ADMIN'
                                                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                                                : u.role === 'ROLE_SUPPORT'
                                                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                                                : 'bg-slate-100 text-slate-700'
                                                        }`}>
                                                            <span className="material-symbols-outlined text-[12px]">
                                                                {u.role === 'ROLE_ADMIN' ? 'admin_panel_settings' : 'person'}
                                                            </span>
                                                            {u.role === 'ROLE_ADMIN' ? 'Quản trị viên' : u.role === 'ROLE_SUPPORT' ? 'Hỗ trợ' : 'Người dùng'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                                            u.status === 'ACTIVE'
                                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                                : u.status === 'SUSPENDED'
                                                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                        }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                                u.status === 'ACTIVE' ? 'bg-emerald-500' : u.status === 'SUSPENDED' ? 'bg-amber-500' : 'bg-rose-500'
                                                            }`}></span>
                                                            {u.status || 'ACTIVE'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-slate-500 font-medium">
                                                        {formatDateTime(u.createdAt)}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="inline-flex items-center gap-1.5">
                                                            <button
                                                                onClick={() => handleViewUserDetail(u.id)}
                                                                className="p-1.5 rounded-lg text-slate-500 hover:text-amber-900 hover:bg-amber-50 border border-slate-200 transition-colors"
                                                                title="Xem hồ sơ & tài khoản chi tiết"
                                                            >
                                                                <span className="material-symbols-outlined text-base">visibility</span>
                                                            </button>

                                                            <button
                                                                onClick={() => handleOpenStatusModal(u)}
                                                                className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-50 border border-amber-200 transition-colors"
                                                                title="Khóa / Mở khóa / Đình chỉ tài khoản"
                                                            >
                                                                <span className="material-symbols-outlined text-base">lock_reset</span>
                                                            </button>

                                                            <button
                                                                onClick={() => handleToggleRole(u)}
                                                                className="p-1.5 rounded-lg text-indigo-700 hover:bg-indigo-50 border border-indigo-200 transition-colors"
                                                                title="Phân quyền Admin / User"
                                                            >
                                                                <span className="material-symbols-outlined text-base">manage_accounts</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="7" className="p-8 text-center text-slate-400">
                                                    Không tìm thấy người dùng phù hợp với điều kiện tìm kiếm.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Phân trang */}
                            {usersPage.totalPages > 1 && (
                                <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs">
                                    <p className="text-slate-500">
                                        Trang <b>{usersCurrentPage + 1}</b> / <b>{usersPage.totalPages}</b> (Tổng số: {usersPage.totalElements} người dùng)
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            disabled={usersCurrentPage === 0}
                                            onClick={() => fetchUsers(usersCurrentPage - 1)}
                                            className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer font-bold"
                                        >
                                            Trước
                                        </button>
                                        <button
                                            disabled={usersCurrentPage >= usersPage.totalPages - 1}
                                            onClick={() => fetchUsers(usersCurrentPage + 1)}
                                            className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer font-bold"
                                        >
                                            Sau
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 3: NHẬT KÝ TRUY CẬP (ACCESS LOGS) */}
                {activeTab === 'access_logs' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl border border-amber-100/80 shadow-xs overflow-hidden">
                            <div className="p-5 border-b border-amber-100/80 flex justify-between items-center">
                                <div>
                                    <h3 className="font-black text-amber-950 text-base">Nhật ký Truy cập Hệ thống</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Theo dõi lịch sử đăng nhập, địa chỉ IP và thiết bị người dùng</p>
                                </div>
                                <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
                                    Thời gian thực
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-amber-50/60 border-b border-amber-100 text-amber-950 font-bold uppercase tracking-wider text-[11px]">
                                            <th className="p-4">Người dùng</th>
                                            <th className="p-4">Địa chỉ IP</th>
                                            <th className="p-4">Thiết bị</th>
                                            <th className="p-4">Phương thức</th>
                                            <th className="p-4">Kết quả</th>
                                            <th className="p-4">Thời gian</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {accessLogs.content.length > 0 ? (
                                            accessLogs.content.map((log, idx) => (
                                                <tr key={idx} className="hover:bg-amber-50/20 transition-colors">
                                                    <td className="p-4">
                                                        <p className="font-extrabold text-amber-950">{log.user?.fullName || log.user?.username || 'Khách'}</p>
                                                        <p className="text-[10px] text-slate-400 font-mono">{log.user?.email || 'N/A'}</p>
                                                    </td>
                                                    <td className="p-4 font-mono font-bold text-slate-700">{log.ipAddress || '127.0.0.1'}</td>
                                                    <td className="p-4">
                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                                                            <span className="material-symbols-outlined text-[13px]">
                                                                {log.deviceType === 'Mobile' ? 'smartphone' : 'computer'}
                                                            </span>
                                                            {log.deviceType || 'Desktop'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 font-mono font-bold text-slate-600">{log.authMethod || 'LOCAL'}</td>
                                                    <td className="p-4">
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                            log.isSuccess
                                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                        }`}>
                                                            {log.isSuccess ? 'Thành công' : 'Thất bại'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-slate-500 font-medium">
                                                        {formatDateTime(log.loginAt)}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className="p-8 text-center text-slate-400">
                                                    Chưa ghi nhận dữ liệu lịch sử đăng nhập.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Phân trang logs */}
                            {accessLogs.totalPages > 1 && (
                                <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs">
                                    <p className="text-slate-500">Trang <b>{logsPage + 1}</b> / <b>{accessLogs.totalPages}</b></p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            disabled={logsPage === 0}
                                            onClick={() => fetchAccessLogs(logsPage - 1)}
                                            className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer font-bold"
                                        >
                                            Trước
                                        </button>
                                        <button
                                            disabled={logsPage >= accessLogs.totalPages - 1}
                                            onClick={() => fetchAccessLogs(logsPage + 1)}
                                            className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer font-bold"
                                        >
                                            Sau
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 4: NHẬT KÝ KIỂM TOÁN (AUDIT LOGS) */}
                {activeTab === 'audit_logs' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl border border-amber-100/80 shadow-xs overflow-hidden">
                            <div className="p-5 border-b border-amber-100/80 flex justify-between items-center">
                                <div>
                                    <h3 className="font-black text-amber-950 text-base">Nhật ký Kiểm toán Hoạt động Quản trị (Audit Trail)</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Lưu vết mọi thao tác đổi quyền, khóa tài khoản hoặc can thiệp hệ thống của Admin</p>
                                </div>
                                <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
                                    Minh bạch & Bảo mật
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-amber-50/60 border-b border-amber-100 text-amber-950 font-bold uppercase tracking-wider text-[11px]">
                                            <th className="p-4">Admin thực hiện</th>
                                            <th className="p-4">Hành động</th>
                                            <th className="p-4">Đối tượng</th>
                                            <th className="p-4">Chi tiết mô tả</th>
                                            <th className="p-4">Địa chỉ IP</th>
                                            <th className="p-4">Thời gian</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {auditLogs.content.length > 0 ? (
                                            auditLogs.content.map((a, idx) => (
                                                <tr key={idx} className="hover:bg-amber-50/20 transition-colors">
                                                    <td className="p-4">
                                                        <p className="font-extrabold text-amber-950">{a.admin?.fullName || a.admin?.username || 'Hệ thống'}</p>
                                                        <p className="text-[10px] text-slate-400 font-mono">{a.admin?.email || ''}</p>
                                                    </td>
                                                    <td className="p-4 font-mono font-bold text-amber-800">
                                                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px]">
                                                            {a.action}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 font-mono text-slate-700">{a.targetEntity} #{a.targetId}</td>
                                                    <td className="p-4 text-slate-700 max-w-sm truncate" title={a.detailDescription}>
                                                        {a.detailDescription}
                                                    </td>
                                                    <td className="p-4 font-mono text-slate-600">{a.ipAddress || '127.0.0.1'}</td>
                                                    <td className="p-4 text-slate-500 font-medium">
                                                        {formatDateTime(a.timestamp)}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className="p-8 text-center text-slate-400">
                                                    Chưa ghi nhận nhật ký kiểm toán nào.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Phân trang audit logs */}
                            {auditLogs.totalPages > 1 && (
                                <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs">
                                    <p className="text-slate-500">Trang <b>{logsPage + 1}</b> / <b>{auditLogs.totalPages}</b></p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            disabled={logsPage === 0}
                                            onClick={() => fetchAuditLogs(logsPage - 1)}
                                            className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer font-bold"
                                        >
                                            Trước
                                        </button>
                                        <button
                                            disabled={logsPage >= auditLogs.totalPages - 1}
                                            onClick={() => fetchAuditLogs(logsPage + 1)}
                                            className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer font-bold"
                                        >
                                            Sau
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 5: QUẢN LÝ THÔNG BÁO ỨNG DỤNG (ADMIN ANNOUNCEMENTS) */}
                {activeTab === 'announcements' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
                        {/* Cột trái: Form phát hành thông báo mới (5 cols) */}
                        <div className="lg:col-span-5">
                            <div className="bg-white rounded-2xl border border-amber-100/80 shadow-xs p-6 space-y-5 sticky top-24">
                                <div className="flex items-center gap-3 pb-3 border-b border-amber-100">
                                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-2xl">campaign</span>
                                    </div>
                                    <div>
                                        <h3 className="font-black text-amber-950 text-base">Phát hành Thông báo mới</h3>
                                        <p className="text-xs text-slate-500">Hiển thị trực tiếp tới toàn bộ người dùng Temoney</p>
                                    </div>
                                </div>

                                {announcementFeedback && (
                                    <div className={`p-3 rounded-xl text-xs font-bold border ${
                                        announcementFeedback.type === 'success'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : 'bg-rose-50 text-rose-700 border-rose-200'
                                    }`}>
                                        {announcementFeedback.text}
                                    </div>
                                )}

                                <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 uppercase block mb-1.5">
                                            Tiêu đề thông báo *
                                        </label>
                                        <input
                                            type="text"
                                            value={newAnnouncement.title}
                                            onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                                            placeholder="VD: Thông báo bảo trì hệ thống hoặc Ra mắt tính năng mới..."
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-600 uppercase block mb-1.5">
                                            Phân loại thông báo
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { value: 'INFO', label: 'Thông tin', icon: 'info', activeCls: 'bg-blue-600 text-white border-blue-600' },
                                                { value: 'WARNING', label: 'Cảnh báo', icon: 'warning', activeCls: 'bg-amber-500 text-white border-amber-500' },
                                                { value: 'MAINTENANCE', label: 'Bảo trì', icon: 'build_circle', activeCls: 'bg-rose-600 text-white border-rose-600' },
                                                { value: 'PROMOTION', label: 'Cập nhật mới', icon: 'new_releases', activeCls: 'bg-emerald-600 text-white border-emerald-600' }
                                            ].map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => setNewAnnouncement({ ...newAnnouncement, type: opt.value })}
                                                    className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                                        newAnnouncement.type === opt.value
                                                            ? opt.activeCls
                                                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    <span className="material-symbols-outlined text-base">{opt.icon}</span>
                                                    <span>{opt.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-600 uppercase block mb-1.5">
                                            Nội dung chi tiết *
                                        </label>
                                        <textarea
                                            rows={4}
                                            value={newAnnouncement.content}
                                            onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                                            placeholder="Nhập nội dung thông báo sẽ gửi tới người dùng..."
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                                            required
                                        />
                                    </div>

                                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={newAnnouncement.isActive}
                                            onChange={(e) => setNewAnnouncement({ ...newAnnouncement, isActive: e.target.checked })}
                                            className="w-4 h-4 accent-amber-600 rounded"
                                        />
                                        <span className="text-xs font-bold text-slate-700">
                                            Kích hoạt hiển thị ngay cho người dùng
                                        </span>
                                    </label>

                                    <button
                                        type="submit"
                                        disabled={submittingAnnouncement}
                                        className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-base">send</span>
                                        <span>{submittingAnnouncement ? 'Đang phát hành...' : 'Phát hành thông báo'}</span>
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Cột phải: Danh sách thông báo đã tạo (7 cols) */}
                        <div className="lg:col-span-7">
                            <div className="bg-white rounded-2xl border border-amber-100/80 shadow-xs overflow-hidden">
                                <div className="p-5 border-b border-amber-100/80 flex flex-wrap justify-between items-center gap-3">
                                    <div>
                                        <h3 className="font-black text-amber-950 text-base">
                                            Danh sách Thông báo Hệ thống ({announcements.length})
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Đang bật: <b className="text-emerald-600">{announcements.filter(a => a.isActive).length}</b> • Đang ẩn: <b className="text-slate-600">{announcements.filter(a => !a.isActive).length}</b>
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={fetchAnnouncements}
                                        className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-sm">refresh</span>
                                        <span>Làm mới</span>
                                    </button>
                                </div>

                                <div className="p-5 space-y-3">
                                    {loadingAnnouncements ? (
                                        <p className="text-center text-xs text-slate-400 py-10">Đang tải danh sách thông báo...</p>
                                    ) : announcements.length > 0 ? (
                                        announcements.map((ann) => {
                                            const typeMap = {
                                                INFO: { label: 'Thông tin', cls: 'bg-blue-100 text-blue-800 border-blue-200' },
                                                WARNING: { label: 'Cảnh báo', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
                                                MAINTENANCE: { label: 'Bảo trì', cls: 'bg-rose-100 text-rose-700 border-rose-200' },
                                                PROMOTION: { label: 'Cập nhật mới', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
                                            };
                                            const typeMeta = typeMap[ann.type] || typeMap.INFO;

                                            return (
                                                <div
                                                    key={ann.id}
                                                    className={`p-4 rounded-2xl border transition-all ${
                                                        ann.isActive
                                                            ? 'bg-white border-amber-200/80 shadow-2xs'
                                                            : 'bg-slate-50/80 border-slate-200 opacity-75'
                                                    }`}
                                                >
                                                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${typeMeta.cls}`}>
                                                                {typeMeta.label}
                                                            </span>
                                                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                                                ann.isActive
                                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                                    : 'bg-slate-200 text-slate-600'
                                                            }`}>
                                                                {ann.isActive ? '● Đang hiển thị' : '○ Đang ẩn'}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleAnnouncement(ann.id)}
                                                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                                                    ann.isActive
                                                                        ? 'bg-amber-50 hover:bg-amber-500 text-amber-800 hover:text-white border-amber-200'
                                                                        : 'bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border-emerald-200'
                                                                }`}
                                                            >
                                                                {ann.isActive ? 'Tạm ẩn' : 'Bật hiển thị'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteAnnouncement(ann)}
                                                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 transition-all cursor-pointer"
                                                            >
                                                                Xoá
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <h4 className="font-extrabold text-sm text-slate-900">{ann.title}</h4>
                                                    <p className="text-xs text-slate-600 mt-1 whitespace-pre-line leading-relaxed">{ann.content}</p>
                                                    <p className="text-[10px] text-slate-400 mt-2">
                                                        Tạo lúc: {formatDateTime(ann.createdAt)}
                                                        {ann.createdBy?.fullName || ann.createdBy?.username
                                                            ? ` • Bởi: ${ann.createdBy.fullName || ann.createdBy.username}`
                                                            : ''}
                                                    </p>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                            <span className="material-symbols-outlined text-4xl text-slate-300">campaign</span>
                                            <p className="text-sm font-bold text-slate-600 mt-2">Chưa có thông báo hệ thống nào</p>
                                            <p className="text-xs text-slate-400 mt-1">Sử dụng biểu mẫu bên trái để phát hành thông báo đầu tiên cho người dùng.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* ========================================================
                MODAL 1: XEM CHI TIẾT NGƯỜI DÙNG
                ======================================================== */}
            {showDetailModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
                    <div className="bg-white rounded-3xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl border border-amber-100">
                        <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="text-lg font-black text-amber-950">Chi tiết Hồ sơ Người dùng</h3>
                                <p className="text-xs text-slate-500 mt-0.5">ID #{selectedUserDetail?.user?.id} — {selectedUserDetail?.user?.email}</p>
                            </div>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>

                        {loadingDetail ? (
                            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                                <span className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></span>
                                <p className="text-xs font-bold">Đang tải thông tin chi tiết...</p>
                            </div>
                        ) : selectedUserDetail ? (
                            <div className="space-y-6 text-xs">
                                {/* Thông tin cá nhân cơ bản */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="p-3 rounded-xl bg-slate-50">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Họ và tên</p>
                                        <p className="font-extrabold text-slate-800 text-sm mt-0.5">{selectedUserDetail.user?.fullName || 'Chưa đặt'}</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-slate-50">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Mã User</p>
                                        <p className="font-extrabold text-amber-900 font-mono text-sm mt-0.5">#{selectedUserDetail.user?.userCode || 'N/A'}</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-slate-50">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Tổng số ví</p>
                                        <p className="font-extrabold text-slate-800 text-sm mt-0.5">{selectedUserDetail.totalAccounts || 0}</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-amber-50">
                                        <p className="text-[10px] text-amber-700 font-bold uppercase">Tổng số dư</p>
                                        <p className="font-extrabold text-amber-950 text-sm mt-0.5">{formatMoney(selectedUserDetail.totalBalance || 0)}</p>
                                    </div>
                                </div>

                                {/* Danh sách tài khoản ví */}
                                <div>
                                    <h4 className="font-black text-amber-950 text-sm mb-2.5 flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-base text-amber-600">account_balance_wallet</span>
                                        Các tài khoản ví ({selectedUserDetail.accounts?.length || 0})
                                    </h4>
                                    <div className="space-y-2">
                                        {selectedUserDetail.accounts?.length > 0 ? (
                                            selectedUserDetail.accounts.map((acc) => (
                                                <div key={acc.id} className="p-3 rounded-xl bg-slate-50 flex justify-between items-center">
                                                    <div>
                                                        <p className="font-bold text-slate-800">{acc.name}</p>
                                                        <p className="text-[10px] text-slate-400 font-mono">{acc.type}</p>
                                                    </div>
                                                    <p className="font-black text-amber-950">{formatMoney(acc.balance)}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-slate-400 italic">Người dùng chưa tạo tài khoản ví nào.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Lịch sử truy cập gần đây */}
                                <div>
                                    <h4 className="font-black text-amber-950 text-sm mb-2.5 flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-base text-amber-600">history</span>
                                        Lịch sử đăng nhập gần nhất
                                    </h4>
                                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                        {selectedUserDetail.recentLoginHistory?.length > 0 ? (
                                            selectedUserDetail.recentLoginHistory.map((lh, idx) => (
                                                <div key={idx} className="p-2 rounded-lg bg-slate-50 flex justify-between items-center text-[11px]">
                                                    <span className="font-mono text-slate-600">{lh.ipAddress} ({lh.deviceType})</span>
                                                    <span className="text-slate-400">{formatDateTime(lh.loginAt)}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-slate-400 italic">Chưa ghi nhận lịch sử đăng nhập.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            {/* ========================================================
                MODAL 2: THAY ĐỔI TRẠNG THÁI NGƯỜI DÙNG (LOCK/UNLOCK)
                ======================================================== */}
            {statusModalUser && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-amber-100">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                            <h3 className="text-base font-black text-amber-950">Thay đổi Trạng thái Người dùng</h3>
                            <button
                                onClick={() => setStatusModalUser(null)}
                                className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>

                        <div className="space-y-4 text-xs">
                            <div>
                                <p className="font-medium text-slate-500">Người dùng:</p>
                                <p className="font-extrabold text-slate-800 text-sm mt-0.5">
                                    {statusModalUser.fullName} ({statusModalUser.email})
                                </p>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1.5">
                                    Chọn Trạng Thái Mới:
                                </label>
                                <select
                                    value={statusChangeValue}
                                    onChange={(e) => setStatusChangeValue(e.target.value)}
                                    className="w-full p-3 rounded-xl border border-amber-200 text-xs font-bold text-slate-800 outline-none"
                                >
                                    <option value="ACTIVE">Hoạt động bình thường (ACTIVE)</option>
                                    <option value="SUSPENDED">Tạm đình chỉ (SUSPENDED)</option>
                                    <option value="BANNED">Khóa vĩnh viễn (BANNED)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1.5">
                                    Lý do thay đổi (ghi vào Nhật ký kiểm toán):
                                </label>
                                <textarea
                                    rows="3"
                                    value={statusReason}
                                    onChange={(e) => setStatusReason(e.target.value)}
                                    placeholder="VD: Vi phạm điều khoản sử dụng hoặc yêu cầu từ người dùng..."
                                    className="w-full p-3 rounded-xl border border-amber-200 outline-none text-xs"
                                ></textarea>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2.5 pt-2">
                            <button
                                onClick={() => setStatusModalUser(null)}
                                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                disabled={submittingStatus}
                                onClick={handleConfirmStatusChange}
                                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm shadow-amber-500/25 cursor-pointer disabled:opacity-50"
                            >
                                {submittingStatus ? 'Đang cập nhật...' : 'Xác nhận cập nhật'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
