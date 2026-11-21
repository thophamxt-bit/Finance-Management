import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ProfileOverlay from '../../components/personal/ProfileOverlay';
import GroupDashboardView from '../group/GroupDashboardView';
import VoiceTextTransactionModal from '../../components/personal/VoiceTextTransactionModal';
import UserProfileBadge from '../../components/personal/UserProfileBadge';
import { useLanguage } from '../../context/LanguageContext';

const Dashboard = () => {
    const navigate = useNavigate();
    const { t, openSettings } = useLanguage();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [showVoiceModal, setShowVoiceModal] = useState(false);

    // --- State Chế độ xem: 'personal' (Cá nhân) hoặc 'group' (Nhóm) ---
    const [viewMode, setViewMode] = useState('personal');

    // --- State Dữ liệu Cá nhân ---
    const [profileData, setProfileData] = useState({
        fullName: '',
        email: '',
        balance: 0,
        username: ''
    });
    const [accounts, setAccounts] = useState([]);
    const [allTransactions, setAllTransactions] = useState([]);
    const [recentTransactions, setRecentTransactions] = useState([]);

    // --- State Dữ liệu Nhóm ---
    const [groups, setGroups] = useState([]);
    const [recentGroupTransactions, setRecentGroupTransactions] = useState([]);
    const [groupStats, setGroupStats] = useState({
        youOwe: 0,
        youPaid: 0,
        totalGroupSpent: 0
    });

    // --- State Modal Tạo Nguồn tiền ---
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [newAccount, setNewAccount] = useState({ accountName: '', type: 'CASH', balance: '' });
    const [loading, setLoading] = useState(false);

    // Tab xem giao dịch nhanh: 'personal' | 'group'
    const [txTab, setTxTab] = useState('personal');

    // Hàm gọi API lấy dữ liệu cá nhân & nhóm
    const fetchData = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        try {
            const headers = { Authorization: `Bearer ${token}` };

            // 1. Tải thông tin cá nhân, ví và giao dịch
            const [profileRes, accountsRes, transactionsRes, groupsRes] = await Promise.all([
                axios.get('http://localhost:8080/api/auth/profile', { headers }),
                axios.get('http://localhost:8080/api/accounts', { headers }).catch(() => ({ data: [] })),
                axios.get('http://localhost:8080/api/transactions', { headers }).catch(() => ({ data: [] })),
                axios.get('http://localhost:8080/api/groups', { headers }).catch(() => ({ data: [] }))
            ]);

            const currentUsername = profileRes.data.username;
            const currentFullName = profileRes.data.fullName || profileRes.data.username || 'Người dùng';

            if (profileRes.data.role) {
                localStorage.setItem("role", profileRes.data.role);
            }

            setProfileData({
                fullName: currentFullName,
                email: profileRes.data.email || profileRes.data.username || 'Chưa cập nhật email',
                balance: profileRes.data.balance || 0,
                username: currentUsername,
                role: profileRes.data.role
            });

            if (accountsRes.data && Array.isArray(accountsRes.data)) {
                setAccounts(accountsRes.data);
            }

            if (transactionsRes.data && Array.isArray(transactionsRes.data)) {
                setAllTransactions(transactionsRes.data);
                setRecentTransactions(transactionsRes.data.slice(0, 6));
            }

            // 2. Tải giao dịch nhóm
            if (groupsRes.data && Array.isArray(groupsRes.data) && groupsRes.data.length > 0) {
                setGroups(groupsRes.data);

                const allGroupTxs = [];
                let totalOwe = 0;
                let totalPaid = 0;
                let totalSpent = 0;

                for (const grp of groupsRes.data.slice(0, 4)) {
                    try {
                        const txRes = await axios.get(`http://localhost:8080/api/groups/${grp.id}/transactions`, { headers });
                        if (txRes.data && Array.isArray(txRes.data)) {
                            txRes.data.forEach(gt => {
                                allGroupTxs.push({ ...gt, groupName: grp.name });
                                const amt = parseFloat(gt.amount || 0);
                                totalSpent += amt;

                                if (gt.payerName === currentFullName || gt.payerName === currentUsername) {
                                    totalPaid += amt;
                                }

                                if (gt.splits && Array.isArray(gt.splits)) {
                                    const mySplit = gt.splits.find(s => s.username === currentUsername || s.fullName === currentFullName);
                                    if (mySplit && !mySplit.isSettled) {
                                        totalOwe += parseFloat(mySplit.owedAmount || 0);
                                    }
                                }
                            });
                        }
                    } catch (e) {
                        console.error('Lỗi tải giao dịch nhóm:', grp.id, e);
                    }
                }

                allGroupTxs.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));
                setRecentGroupTransactions(allGroupTxs.slice(0, 6));
                setGroupStats({
                    youOwe: totalOwe,
                    youPaid: totalPaid,
                    totalGroupSpent: totalSpent
                });
            }

        } catch (error) {
            console.error('Lỗi lấy dữ liệu:', error);
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/login');
            }
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Tổng số dư cá nhân
    const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    const displayBalance = accounts.length > 0 ? totalBalance : profileData.balance;

    // Tính toán tổng thu nhập & tổng chi tiêu
    const totalIncome = allTransactions
        .filter(t => t.type === 'INCOME' || t.transactionType === 'INCOME')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const totalExpense = allTransactions
        .filter(t => t.type === 'EXPENSE' || t.transactionType === 'EXPENSE')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    const handleCreateAccount = async () => {
        if (!newAccount.accountName) return alert('Vui lòng nhập tên tài khoản/ngân hàng!');
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:8080/api/accounts', {
                accountName: newAccount.accountName,
                type: newAccount.type || 'CASH',
                balance: parseFloat(newAccount.balance) || 0
            }, { headers: { Authorization: `Bearer ${token}` } });
            setShowAccountModal(false);
            setNewAccount({ accountName: '', type: 'CASH', balance: '' });
            alert('Đã thêm nguồn tiền thành công!');
            await fetchData();
        } catch (error) {
            alert(error.response?.data?.message || 'Lỗi khi thêm nguồn tiền!');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm('Bạn có chắc chắn muốn xóa ví này không? Lịch sử giao dịch liên quan có thể bị ảnh hưởng.')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:8080/api/accounts/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Đã xóa ví thành công!');
            await fetchData();
        } catch (error) {
            alert(error.response?.data?.message || 'Lỗi khi xóa ví!');
        }
    };

    // Tính toán biểu đồ 12 tháng
    const currentYear = new Date().getFullYear();
    const monthlyStats = Array.from({ length: 12 }, (_, i) => ({
        label: `T${i + 1}`,
        income: 0,
        expense: 0
    }));

    allTransactions.forEach(t => {
        const d = new Date(t.transactionDate);
        if (d.getFullYear() === currentYear) {
            const monthIndex = d.getMonth();
            const amount = parseFloat(t.amount || 0);

            if (t.type === 'INCOME' || t.transactionType === 'INCOME') {
                monthlyStats[monthIndex].income += amount;
            } else {
                monthlyStats[monthIndex].expense += amount;
            }
        }
    });

    const maxAmount = Math.max(...monthlyStats.map(m => Math.max(m.income, m.expense)), 1000);

    return (
        <div className="bg-[#fcf8f4] text-slate-800 antialiased min-h-screen">
            {/* Sidebar Navigation */}
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
                <nav className="space-y-1 flex-1">
                    <NavItem icon="dashboard" label={t('nav.dashboard', 'Trang chủ')} to="/dashboard" active />
                    <NavItem icon="receipt_long" label={t('nav.activity', 'Lịch sử giao dịch')} to="/activity" />
                    <NavItem icon="add_circle" label={t('nav.addNew', 'Thêm giao dịch')} to="/addnew" />
                    <NavItem icon="pie_chart" label={t('nav.analytics', 'Phân tích')} to="/analyst" />
                    <NavItem icon="account_balance_wallet" label={t('nav.budgets', 'Ngân sách')} to="/budget" />
                    <div className="my-3 border-t border-amber-100"></div>
                    <NavItem icon="groups" label={t('nav.group', 'Chi tiêu nhóm')} to="/group" />
                    {(profileData?.role === 'ROLE_ADMIN' || localStorage.getItem('role') === 'ROLE_ADMIN') && (
                        <NavItem
                            icon="shield_person"
                            label="Quản trị hệ thống"
                            to="/admin"
                        />
                    )}
                </nav>

                <div className="pt-4 border-t border-amber-100 flex flex-col gap-2">
                    <NavItem icon="settings" label={t('nav.settings', 'Cài đặt')} onClick={openSettings} />
                    <div className="mt-1">
                        <UserProfileBadge
                            profileData={profileData}
                            onProfileUpdated={(updated) => setProfileData(prev => ({ ...prev, ...updated }))}
                        />
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="md:ml-64 p-6 lg:p-8">

                {/* NẾU ĐANG Ở CHẾ ĐỘ NHÓM RIÊNG BIỆT */}
                {viewMode === 'group' ? (
                    <GroupDashboardView
                        onSwitchToPersonal={() => setViewMode('personal')}
                        profileData={profileData}
                    />
                ) : (
                    /* CHẾ ĐỘ TRANG HOME CÁ NHÂN (CHUẨN ẢNH 1) */
                    <div className="space-y-6 animate-in fade-in duration-300 max-w-7xl mx-auto">
                        {/* Header Trang Home - Theo Ảnh 1 */}
                        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-amber-100/80 shadow-xs">
                            <div>
                                <h2 className="text-2xl lg:text-3xl font-extrabold text-amber-950 tracking-tight">
                                    Chào buổi sáng, {profileData.fullName || profileData.username || 'Bạn'}
                                </h2>
                                <p className="text-slate-500 text-xs md:text-sm mt-1">
                                    Dưới đây là tóm tắt tài chính cá nhân của bạn trong ngày hôm nay.
                                </p>
                            </div>

                            {/* Cụm công cụ hành động nhanh */}
                            <div className="flex items-center gap-2.5 flex-wrap">
                                {/* Nút Cá nhân / Nhóm */}


                                <button
                                    onClick={() => navigate('/addnew')}
                                    className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-amber-600/20 active:scale-95 transition-all text-xs cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-base">add</span>
                                    <span>Thêm giao dịch</span>
                                </button>
                            </div>
                        </header>

                        {/* Top Bento Grid: Thẻ Tổng số dư cá nhân & Thẻ Nguồn tiền & Ví (Chuẩn Ảnh 1) */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                            {/* Hero Card Cá nhân: Nền Trắng, 3 thẻ con KPI (Ảnh 1) */}
                            <section className="lg:col-span-8 bg-white p-6 lg:p-7 rounded-3xl border border-amber-100/80 shadow-xs flex flex-col justify-between relative overflow-hidden">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-600 font-extrabold text-xs tracking-wider uppercase flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                                            TỔNG SỐ DƯ CÁC VÍ
                                        </span>
                                        <span className="text-xs bg-amber-50 border border-amber-200 text-amber-800 font-bold px-3 py-1 rounded-xl flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-sm">credit_card</span>
                                            {accounts.length} Nguồn tiền & Ví
                                        </span>
                                    </div>
                                    <h1 className="text-3xl lg:text-4xl font-black mt-3 tracking-tight text-slate-900">
                                        {displayBalance.toLocaleString('vi-VN')} <span className="text-xl font-normal text-slate-400">VND</span>
                                    </h1>
                                </div>

                                {/* 3 Thẻ KPI con: Tổng thu nhập, Tổng chi tiêu, Nguồn tiền & ví */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-6 pt-5 border-t border-slate-100">
                                    {/* 1. Tổng thu nhập */}
                                    <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-3.5 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-xl">call_made</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TỔNG THU NHẬP</p>
                                            <p className="text-sm lg:text-base font-black text-emerald-600 truncate mt-0.5">
                                                +{totalIncome.toLocaleString('vi-VN')} <span className="text-[10px] font-normal">VND</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* 2. Tổng chi tiêu */}
                                    <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-3.5 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-xl">call_received</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TỔNG CHI TIÊU</p>
                                            <p className="text-sm lg:text-base font-black text-rose-600 truncate mt-0.5">
                                                -{totalExpense.toLocaleString('vi-VN')} <span className="text-[10px] font-normal">VND</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* 3. Nguồn tiền & ví */}
                                    <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-3.5 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-xl">account_balance</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NGUỒN TIỀN & VÍ</p>
                                            <p className="text-sm lg:text-base font-black text-slate-800 truncate mt-0.5">
                                                {accounts.length} Ví
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Cột phải: Thẻ Nguồn tiền & Ví (Chuẩn Ảnh 1) */}
                            <section className="lg:col-span-4 bg-white p-6 rounded-3xl border border-amber-100/80 shadow-xs flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Nguồn tiền & Ví</h3>
                                        <button
                                            onClick={() => setShowAccountModal(true)}
                                            className="w-7 h-7 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 flex items-center justify-center transition-all cursor-pointer"
                                            title="Thêm ví mới"
                                        >
                                            <span className="material-symbols-outlined text-sm font-bold">add</span>
                                        </button>
                                    </div>

                                    <div className="space-y-3 max-h-[190px] overflow-y-auto pr-1">
                                        {accounts.length > 0 ? accounts.map(acc => (
                                            <div key={acc.id} className="p-3 rounded-2xl bg-slate-50/80 hover:bg-amber-50/50 border border-slate-100 flex items-center justify-between transition-all group">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-amber-100/60 text-amber-800 flex items-center justify-center font-bold text-xs">
                                                        <span className="material-symbols-outlined text-base">credit_card</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-xs text-slate-900">{acc.accountName}</p>
                                                        <p className="text-[10px] text-slate-400 font-semibold uppercase">{acc.type || 'CASH'}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-black text-xs text-amber-900">{(acc.balance || 0).toLocaleString('vi-VN')}đ</p>
                                                    <button
                                                        onClick={(e) => handleDeleteAccount(e, acc.id)}
                                                        className="text-[10px] text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        Xóa
                                                    </button>
                                                </div>
                                            </div>
                                        )) : (
                                            <p className="text-xs text-slate-400 italic text-center py-6">Chưa có nguồn tiền nào.</p>
                                        )}
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Hàng Bento Dưới: Biểu đồ Thu & Chi và Giao dịch gần đây (Chuẩn Ảnh 1) */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                            {/* Cột trái: Thu & Chi trong năm */}
                            <section className="lg:col-span-7 bg-white p-6 rounded-3xl border border-amber-100/80 shadow-xs flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Thu & Chi trong năm ({currentYear})</h3>
                                            <p className="text-xs text-slate-400 font-medium">Biểu đồ so sánh 12 tháng</p>
                                        </div>
                                        <div className="flex gap-4 text-xs">
                                            <LegendItem color="bg-amber-600" label="Thu nhập" />
                                            <LegendItem color="bg-amber-300" label="Chi tiêu" />
                                        </div>
                                    </div>

                                    <div className="flex items-end justify-between h-48 gap-1 md:gap-1.5 pt-4">
                                        {monthlyStats.map(stat => {
                                            const h1 = (stat.income / maxAmount) * 100;
                                            const h2 = (stat.expense / maxAmount) * 100;

                                            return (
                                                <BarChartColumn
                                                    key={stat.label}
                                                    label={stat.label}
                                                    h1={h1}
                                                    h2={h2}
                                                    income={stat.income}
                                                    expense={stat.expense}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs">
                                    <span className="text-slate-400">Xem phân tích chi tiết</span>
                                    <Link to="/analyst" className="font-bold text-amber-800 hover:underline flex items-center gap-1">
                                        <span>Xem phân tích</span>
                                        <span className="material-symbols-outlined text-xs">chevron_right</span>
                                    </Link>
                                </div>
                            </section>

                            {/* Cột phải: Giao dịch gần đây */}
                            <section className="lg:col-span-5 bg-white p-6 rounded-3xl border border-amber-100/80 shadow-xs flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Giao dịch gần đây</h3>
                                        <Link to="/activity" className="text-xs font-bold text-amber-800 hover:text-amber-950 transition-colors">
                                            Xem tất cả
                                        </Link>
                                    </div>

                                    <div className="space-y-3">
                                        {recentTransactions.length > 0 ? recentTransactions.map(t => {
                                            const isExpense = t.type === 'EXPENSE' || t.transactionType === 'EXPENSE';
                                            const amountPrefix = isExpense ? '-' : '+';
                                            const txDate = new Date(t.transactionDate);
                                            const dateFormatted = `${txDate.getDate()}/${txDate.getMonth() + 1}/${txDate.getFullYear()}`;

                                            return (
                                                <div key={t.id} className="p-3 rounded-2xl bg-slate-50/70 hover:bg-slate-100/70 border border-slate-100 flex items-center justify-between transition-all">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isExpense ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                            <span className="material-symbols-outlined text-xl">{t.categoryIcon || (isExpense ? 'restaurant' : 'account_balance_wallet')}</span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-xs text-slate-900 truncate">{t.categoryName || (isExpense ? 'Chi tiêu' : 'Thu nhập')}</p>
                                                            <p className="text-[10px] text-slate-400 mt-0.5 truncate uppercase">
                                                                {t.accountName ? `${t.accountName} • ` : 'VÍ CHÍNH • '}{dateFormatted}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className={`font-black text-xs whitespace-nowrap ${isExpense ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                        {amountPrefix}{parseFloat(t.amount || 0).toLocaleString('vi-VN')} VND
                                                    </span>
                                                </div>
                                            );
                                        }) : (
                                            <p className="text-center py-10 text-xs text-slate-400 italic">Chưa có giao dịch gần đây.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs">
                                    <span className="text-slate-400">Xem toàn bộ lịch sử</span>
                                    <Link to="/activity" className="font-bold text-amber-800 hover:underline flex items-center gap-1">
                                        <span>Chi tiết giao dịch</span>
                                        <span className="material-symbols-outlined text-xs">chevron_right</span>
                                    </Link>
                                </div>
                            </section>
                        </div>
                    </div>
                )}

                {/* Voice Transaction Modal */}
                <VoiceTextTransactionModal
                    isOpen={showVoiceModal}
                    onClose={() => setShowVoiceModal(false)}
                    onApplyData={() => navigate('/addnew')}
                    onDirectSave={async () => {
                        await fetchData();
                    }}
                    accounts={accounts}
                />
            </main>

            <ProfileOverlay isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

            {/* MODAL TẠO TÀI KHOẢN NGÂN HÀNG / VÍ */}
            {showAccountModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in transition-all">
                    <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl slide-in-from-bottom-4 transition-all">
                        <div className="text-center mb-6">
                            <div className="w-14 h-14 bg-amber-50 text-amber-800 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-2xs">
                                <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
                            </div>
                            <h3 className="text-lg font-black text-slate-800">Thêm nguồn tiền mới</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Tạo ví tiền mặt hoặc tài khoản ngân hàng</p>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tên ví / Ngân hàng</label>
                                <input
                                    className="w-full bg-slate-50 p-3.5 rounded-xl font-bold border border-slate-200/80 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 mt-1 text-xs"
                                    placeholder="Ví MoMo, Vietcombank..."
                                    value={newAccount.accountName}
                                    onChange={(e) => setNewAccount({ ...newAccount, accountName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Loại ví</label>
                                <select
                                    className="w-full bg-slate-50 p-3.5 rounded-xl font-bold border border-slate-200/80 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 mt-1 text-xs cursor-pointer"
                                    value={newAccount.type}
                                    onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value })}
                                >
                                    <option value="CASH">Tiền mặt (CASH)</option>
                                    <option value="BANK">Tài khoản Ngân hàng (BANK)</option>
                                    <option value="E_WALLET">Ví điện tử (E-WALLET)</option>
                                    <option value="CREDIT_CARD">Thẻ tín dụng (CREDIT CARD)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Số dư ban đầu (VNĐ)</label>
                                <input
                                    type="number"
                                    className="w-full bg-slate-50 p-3.5 rounded-xl font-bold border border-slate-200/80 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 mt-1 text-xs"
                                    placeholder="0"
                                    value={newAccount.balance}
                                    onChange={(e) => setNewAccount({ ...newAccount, balance: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-2.5 pt-3">
                                <button onClick={() => setShowAccountModal(false)} disabled={loading} className="flex-1 py-3 bg-slate-100 font-bold rounded-xl text-slate-600 hover:bg-slate-200 transition-all text-xs cursor-pointer">Hủy</button>
                                <button onClick={handleCreateAccount} disabled={loading} className="flex-1 py-3 bg-amber-600 text-white font-bold rounded-xl shadow-md shadow-amber-600/20 hover:bg-amber-700 transition-all text-xs cursor-pointer">
                                    {loading ? 'Đang lưu...' : 'Thêm ngay'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Helper Components ---
const NavItem = ({ icon, label, to = '#', active = false, onClick }) => {
    if (onClick) {
        return (
            <button
                type="button"
                onClick={onClick}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 hover:translate-x-1 cursor-pointer text-left ${active ? 'bg-amber-500 text-white font-bold shadow-sm shadow-amber-500/20' : 'text-slate-600 hover:bg-amber-50 hover:text-amber-900 font-medium'}`}
            >
                <span className="material-symbols-outlined text-[20px]">{icon}</span>
                <span className="text-xs font-semibold">{label}</span>
            </button>
        );
    }
    return (
        <Link to={to} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 hover:translate-x-1 ${active ? 'bg-amber-500 text-white font-bold shadow-sm shadow-amber-500/20' : 'text-slate-600 hover:bg-amber-50 hover:text-amber-900 font-medium'}`}>
            <span className="material-symbols-outlined text-[20px]">{icon}</span>
            <span className="text-xs font-semibold">{label}</span>
        </Link>
    );
};

const LegendItem = ({ color, label }) => (
    <div className="flex items-center gap-1.5">
        <span className={`w-2.5 h-2.5 rounded-full ${color}`}></span>
        <span className="text-[10px] text-slate-600 font-bold uppercase">{label}</span>
    </div>
);

const BarChartColumn = ({ label, h1, h2, income, expense }) => (
    <div className="flex-1 flex flex-col items-center gap-2 group relative">
        <div className="w-full flex items-end justify-center gap-1 h-36">
            <div
                style={{ height: `${Math.max(h1, 4)}%` }}
                className="w-1.5 md:w-2.5 bg-amber-600 rounded-t-full transition-all group-hover:brightness-125"
            ></div>
            <div
                style={{ height: `${Math.max(h2, 4)}%` }}
                className="w-1.5 md:w-2.5 bg-amber-300 rounded-t-full transition-all group-hover:brightness-125"
            ></div>
        </div>
        <span className="text-[10px] text-slate-400 font-semibold">{label}</span>

        {/* Tooltip khi hover */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-2.5 py-1.5 rounded-xl text-[9px] font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30">
            <div>Thu: ₫{income.toLocaleString('vi-VN')}</div>
            <div>Chi: ₫{expense.toLocaleString('vi-VN')}</div>
        </div>
    </div>
);

export default Dashboard;