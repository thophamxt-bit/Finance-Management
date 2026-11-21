import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import GroupSidebar from '../../components/group/GroupSidebar';
import TransactionCommentModal from '../../components/group/TransactionCommentModal';
import EditGroupTransactionModal from '../../components/group/EditGroupTransactionModal';
import { formatAvatarUrl } from '../../components/group/MyQRCodeModal';

const GroupDashboard = () => {
    const navigate = useNavigate();

    // --- State Dữ liệu Nhóm & Cá nhân ---
    const [profileData, setProfileData] = useState({ fullName: '', email: '', username: '' });
    const [groups, setGroups] = useState([]);
    const [activeGroup, setActiveGroup] = useState(null);
    const [groupTransactions, setGroupTransactions] = useState([]);
    const [groupComments, setGroupComments] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- Search & Filter ---
    const [searchTerm, setSearchTerm] = useState('');

    // --- State Modals ---
    const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [showSplitBillModal, setShowSplitBillModal] = useState(false);
    const [showSettleModal, setShowSettleModal] = useState(false);
    const [selectedTx, setSelectedTx] = useState(null);
    const [editingTx, setEditingTx] = useState(null);

    // --- Form States ---
    const [newGroupName, setNewGroupName] = useState('');
    const [memberIdentifier, setMemberIdentifier] = useState('');
    const [commentInput, setCommentInput] = useState('');
    const [sendingComment, setSendingComment] = useState(false);

    // Quick Split Form State
    const [quickBill, setQuickBill] = useState({
        amount: '',
        description: '',
        transactionDate: new Date().toISOString().slice(0, 10),
        splitType: 'EQUAL'
    });

    const commentsEndRef = useRef(null);

    // Lấy thông tin người dùng
    const fetchProfile = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            navigate("/login");
            return;
        }
        try {
            const res = await axios.get("http://localhost:8080/api/auth/profile", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProfileData({
                id: res.data.id,
                fullName: res.data.fullName || res.data.username || 'Người dùng',
                email: res.data.email || 'Chưa cập nhật email',
                username: res.data.username,
                avatarUrl: res.data.avatarUrl || ''
            });
        } catch (err) {
            console.error("Lỗi lấy thông tin cá nhân:", err);
            if (err.response?.status === 401) {
                localStorage.removeItem("token");
                navigate("/login");
            }
        }
    };

    // Lấy danh sách nhóm
    const fetchGroups = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const res = await axios.get("http://localhost:8080/api/groups", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data && Array.isArray(res.data)) {
                setGroups(res.data);
                if (res.data.length > 0) {
                    setActiveGroup(prev => {
                        if (prev) {
                            const found = res.data.find(g => g.id === prev.id);
                            return found || res.data[0];
                        }
                        return res.data[0];
                    });
                } else {
                    setActiveGroup(null);
                }
            }
        } catch (err) {
            console.error("Lỗi tải danh sách nhóm:", err);
        } finally {
            setLoading(false);
        }
    };

    // Lấy giao dịch nhóm
    const fetchGroupTransactions = async (groupId) => {
        if (!groupId) return;
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const res = await axios.get(`http://localhost:8080/api/groups/${groupId}/transactions`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data && Array.isArray(res.data)) {
                setGroupTransactions(res.data);
                return res.data;
            }
            return [];
        } catch (err) {
            console.error("Lỗi tải giao dịch nhóm:", err);
            return [];
        }
    };

    const handleRefreshAfterComment = async () => {
        if (!activeGroup) return;
        const freshList = await fetchGroupTransactions(activeGroup.id);
        await fetchGroupComments(activeGroup.id);
        if (selectedTx && Array.isArray(freshList)) {
            const updated = freshList.find(t => t.id === selectedTx.id);
            if (updated) setSelectedTx(updated);
        }
    };

    const handleDeleteTransaction = async (tx) => {
        if (!tx || !activeGroup) return;
        const confirmed = window.confirm(
            `Bạn có chắc chắn muốn xoá khoản chi "${tx.description}" (${formatMoney(tx.amount)}) không?`
        );
        if (!confirmed) return;

        try {
            const token = localStorage.getItem("token");
            const groupId = tx.groupId || activeGroup.id;
            await axios.delete(`http://localhost:8080/api/groups/${groupId}/transactions/${tx.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (selectedTx?.id === tx.id) setSelectedTx(null);
            if (editingTx?.id === tx.id) setEditingTx(null);
            await fetchGroupTransactions(activeGroup.id);
            await fetchGroupComments(activeGroup.id);
        } catch (err) {
            alert(err.response?.data?.message || "Lỗi khi xoá khoản chi tiêu nhóm!");
        }
    };

    // Lấy bình luận / thảo luận nhóm
    const fetchGroupComments = async (groupId) => {
        if (!groupId) return;
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const res = await axios.get(`http://localhost:8080/api/groups/${groupId}/comments`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data && Array.isArray(res.data)) {
                setGroupComments(res.data);
            }
        } catch (err) {
            console.error("Lỗi tải bình luận nhóm:", err);
        }
    };

    useEffect(() => {
        fetchProfile();
        fetchGroups();
    }, []);

    useEffect(() => {
        if (activeGroup?.id) {
            fetchGroupTransactions(activeGroup.id);
            fetchGroupComments(activeGroup.id);
        } else {
            setGroupTransactions([]);
            setGroupComments([]);
        }
    }, [activeGroup]);

    useEffect(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [groupComments]);

    // Xử lý gửi bình luận
    const handleSendComment = async (e) => {
        if (e) e.preventDefault();
        if (!commentInput.trim() || !activeGroup) return;
        setSendingComment(true);
        try {
            const token = localStorage.getItem("token");
            await axios.post(`http://localhost:8080/api/groups/${activeGroup.id}/comments`, {
                groupId: activeGroup.id,
                content: commentInput.trim()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCommentInput('');
            await fetchGroupComments(activeGroup.id);
        } catch (err) {
            alert(err.response?.data?.message || "Lỗi gửi tin nhắn!");
        } finally {
            setSendingComment(false);
        }
    };

    // Tạo nhóm mới
    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return alert("Vui lòng nhập tên nhóm!");
        try {
            const token = localStorage.getItem("token");
            const res = await axios.post("http://localhost:8080/api/groups", { name: newGroupName.trim() }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Tạo nhóm thành công!");
            setNewGroupName('');
            setShowCreateGroupModal(false);
            await fetchGroups();
        } catch (err) {
            alert(err.response?.data?.message || "Lỗi tạo nhóm!");
        }
    };

    // Thêm thành viên
    const handleAddMember = async () => {
        if (!memberIdentifier.trim() || !activeGroup) return alert("Vui lòng nhập email hoặc username!");
        try {
            const token = localStorage.getItem("token");
            await axios.post(`http://localhost:8080/api/groups/${activeGroup.id}/members`, {
                identifier: memberIdentifier.trim()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Đã thêm thành viên vào nhóm!");
            setMemberIdentifier('');
            setShowAddMemberModal(false);
            await fetchGroups();
        } catch (err) {
            alert(err.response?.data?.message || "Lỗi khi thêm thành viên!");
        }
    };

    // Tạo giao dịch nhanh (Split Bill)
    const handleQuickSplit = async () => {
        if (!quickBill.amount || parseFloat(quickBill.amount) <= 0) return alert("Vui lòng nhập số tiền hợp lệ!");
        if (!quickBill.description.trim()) return alert("Vui lòng nhập mô tả chi tiêu!");
        if (!activeGroup) return alert("Chưa chọn nhóm!");

        try {
            const token = localStorage.getItem("token");
            await axios.post(`http://localhost:8080/api/groups/${activeGroup.id}/transactions`, {
                groupId: activeGroup.id,
                amount: parseFloat(quickBill.amount),
                description: quickBill.description.trim(),
                transactionDate: quickBill.transactionDate,
                splitType: quickBill.splitType
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Tạo hóa đơn chia tiền nhóm thành công!");
            setQuickBill({
                amount: '',
                description: '',
                transactionDate: new Date().toISOString().slice(0, 10),
                splitType: 'EQUAL'
            });
            setShowSplitBillModal(false);
            await fetchGroupTransactions(activeGroup.id);
        } catch (err) {
            alert(err.response?.data?.message || "Lỗi tạo giao dịch nhóm!");
        }
    };

    // --- Tính toán thống kê nhóm ---
    const totalGroupExpense = groupTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    // Tính toán "Ai nợ ai" (Who owes who)
    const currentUsername = profileData?.username;
    const currentFullName = profileData?.fullName;

    // Danh sách nợ chi tiết
    const debtList = [];
    groupTransactions.forEach(tx => {
        const isPayer = tx.payerName === currentFullName || tx.payerName === currentUsername;
        if (tx.splits && Array.isArray(tx.splits)) {
            tx.splits.forEach(split => {
                if (!split.isSettled) {
                    const splitUser = split.fullName || split.username;
                    const owed = parseFloat(split.owedAmount || 0);
                    if (owed > 0) {
                        if (isPayer && splitUser !== tx.payerName) {
                            // Người khác nợ bạn
                            debtList.push({
                                type: 'THEY_OWE_YOU',
                                fromUser: splitUser,
                                toUser: 'Bạn',
                                amount: owed,
                                description: tx.description,
                                txId: tx.id
                            });
                        } else if (!isPayer && (splitUser === currentFullName || splitUser === currentUsername)) {
                            // Bạn nợ người trả
                            debtList.push({
                                type: 'YOU_OWE_THEM',
                                fromUser: 'Bạn',
                                toUser: tx.payerName || 'Người trả',
                                amount: owed,
                                description: tx.description,
                                txId: tx.id
                            });
                        }
                    }
                }
            });
        }
    });

    // Lọc giao dịch theo tìm kiếm
    const filteredTransactions = groupTransactions.filter(tx => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            (tx.description && tx.description.toLowerCase().includes(term)) ||
            (tx.payerName && tx.payerName.toLowerCase().includes(term))
        );
    });

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
            .format(amount || 0)
            .replace('₫', 'VND');
    };

    return (
        <div className="flex h-screen overflow-hidden text-slate-800 bg-slate-50 font-body">
            {/* SideNavBar chuyên biệt cho nhóm */}
            <GroupSidebar
                profileData={profileData}
                onProfileUpdated={(updated) => {
                    setProfileData(prev => ({ ...prev, ...updated }));
                    fetchGroups();
                    if (activeGroup) {
                        fetchGroupComments(activeGroup.id);
                        fetchGroupTransactions(activeGroup.id);
                    }
                }}
            />

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col md:ml-64 relative overflow-hidden bg-slate-50">
                {/* TopNavBar */}
                <header className="flex justify-between items-center w-full px-6 py-4 max-w-screen-2xl mx-auto bg-white/90 backdrop-blur-md text-blue-900 font-['Manrope'] font-semibold tracking-tight sticky top-0 z-30 border-b border-slate-200/80 shadow-[0_4px_20px_rgba(0,53,127,0.04)]">
                    <div className="flex items-center gap-4 md:hidden">
                        <span className="material-symbols-outlined cursor-pointer hover:bg-slate-100 p-2 rounded-full">menu</span>
                        <span className="text-xl font-bold bg-gradient-to-br from-blue-900 to-blue-600 bg-clip-text text-transparent">Financial Architect</span>
                    </div>

                    {/* Search bar */}
                    <div className="hidden md:flex flex-1 max-w-md mx-8 relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Tìm kiếm giao dịch, thành viên, hóa đơn..."
                            className="w-full bg-slate-100 border border-slate-200 rounded-full py-2 pl-10 pr-4 text-sm font-body text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 transition-colors"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowSplitBillModal(true)}
                            className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 rounded-xl font-body text-sm font-semibold transition-all shadow-md shadow-blue-900/15 active:scale-95 cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-lg">add</span>
                            <span>Chia hóa đơn mới</span>
                        </button>

                        <button
                            onClick={() => setShowCreateGroupModal(true)}
                            className="hidden sm:flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl font-body text-xs font-bold transition-all border border-slate-200"
                        >
                            <span className="material-symbols-outlined text-base">group_add</span>
                            <span>Tạo nhóm</span>
                        </button>

                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-900 font-bold flex items-center justify-center text-xs border-2 border-white shadow-sm">
                            {(profileData?.fullName || 'U').charAt(0).toUpperCase()}
                        </div>
                    </div>
                </header>

                {/* Scrollable Canvas */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-7xl mx-auto space-y-8 pb-16">

                        {/* Page Header: Group Selector & Members */}
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                            <div>
                                <div className="flex items-center gap-3">
                                    {groups.length > 0 ? (
                                        <div className="relative">
                                            <select
                                                value={activeGroup?.id || ''}
                                                onChange={(e) => {
                                                    const g = groups.find(x => x.id === parseInt(e.target.value));
                                                    if (g) setActiveGroup(g);
                                                }}
                                                className="font-headline text-2xl lg:text-3xl font-extrabold text-blue-950 tracking-tight bg-transparent border-none pr-8 focus:ring-0 cursor-pointer"
                                            >
                                                {groups.map(g => (
                                                    <option key={g.id} value={g.id}>{g.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : (
                                        <h2 className="font-headline text-2xl font-bold text-slate-800">Chưa có nhóm nào</h2>
                                    )}
                                </div>
                                <p className="font-body text-xs text-slate-500 mt-1 flex items-center gap-2">
                                    <span>{activeGroup?.members?.length || 0} Thành viên</span>
                                    <span>•</span>
                                    <span>{groupTransactions.length} Hóa đơn chi tiêu</span>
                                </p>
                            </div>

                            {/* Member Avatars & Add Member Button */}
                            <div className="flex items-center gap-3">
                                <div className="flex -space-x-2">
                                    {activeGroup?.members?.slice(0, 5).map((m, idx) => {
                                        const memberAvatar = formatAvatarUrl(m.avatarUrl);
                                        return (
                                            <div
                                                key={idx}
                                                className="w-9 h-9 rounded-full border-2 border-white bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm overflow-hidden"
                                                title={m.fullName || m.username}
                                            >
                                                {memberAvatar ? (
                                                    <img
                                                        src={memberAvatar}
                                                        alt={m.fullName || m.username}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    (m.fullName || m.username || 'M').charAt(0).toUpperCase()
                                                )}
                                            </div>
                                        );
                                    })}
                                    {activeGroup?.members && activeGroup.members.length > 5 && (
                                        <div className="w-9 h-9 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center font-body text-xs font-semibold text-slate-600">
                                            +{activeGroup.members.length - 5}
                                        </div>
                                    )}
                                </div>

                                {activeGroup && (
                                    <button
                                        onClick={() => setShowAddMemberModal(true)}
                                        className="w-9 h-9 rounded-full bg-blue-50 text-blue-900 hover:bg-blue-100 flex items-center justify-center transition-all border border-blue-200"
                                        title="Thêm thành viên vào nhóm"
                                    >
                                        <span className="material-symbols-outlined text-lg">person_add</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Bento Grid Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                            {/* Left Column: Balances & Actions (7 cols) */}
                            <div className="lg:col-span-7 flex flex-col gap-6">

                                {/* Primary Balance Card (Giao diện Gradient sang trọng) */}
                                <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 rounded-2xl p-6 lg:p-8 text-white relative overflow-hidden shadow-xl flex flex-col justify-between min-h-[220px]">
                                    {/* Subtle pattern overlay */}
                                    <div
                                        className="absolute inset-0 opacity-10 pointer-events-none"
                                        style={{
                                            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                                            backgroundSize: '24px 24px'
                                        }}
                                    ></div>

                                    <div className="relative z-10">
                                        <p className="font-body text-xs text-blue-200 font-bold tracking-widest uppercase">
                                            Total Group Expense
                                        </p>
                                        <h3 className="font-headline text-4xl lg:text-5xl font-extrabold mt-2 tracking-tight">
                                            {formatMoney(totalGroupExpense)}
                                        </h3>
                                    </div>

                                    <div className="relative z-10 flex flex-wrap gap-4 mt-8">
                                        <button
                                            onClick={() => setShowSplitBillModal(true)}
                                            className="flex-1 min-w-[140px] bg-white text-blue-900 py-3 px-4 rounded-xl font-body text-sm font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">splitscreen</span>
                                            <span>Split New Bill</span>
                                        </button>
                                        <button
                                            onClick={() => setShowSettleModal(true)}
                                            className="flex-1 min-w-[140px] bg-blue-800/60 border border-blue-400/30 text-white py-3 px-4 rounded-xl font-body text-sm font-bold hover:bg-blue-700/60 transition-all flex items-center justify-center gap-2 active:scale-95"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">account_balance</span>
                                            <span>Settle Up</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Who owes who Summary */}
                                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 transition-all">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-headline text-lg font-bold text-blue-950">Who owes who</h3>
                                        <span className="text-xs text-slate-400 font-semibold">{debtList.length} khoản nợ</span>
                                    </div>

                                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                        {debtList.length > 0 ? (
                                            debtList.map((debt, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/70 hover:bg-slate-100/70 transition-all"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ${
                                                            debt.type === 'THEY_OWE_YOU' ? 'bg-emerald-600' : 'bg-rose-500'
                                                        }`}>
                                                            {debt.fromUser.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-body font-bold text-sm text-slate-800">
                                                                {debt.type === 'THEY_OWE_YOU'
                                                                    ? `${debt.fromUser} nợ Bạn`
                                                                    : `Bạn nợ ${debt.toUser}`}
                                                            </p>
                                                            <p className="font-label text-xs text-slate-500 truncate max-w-[200px]">
                                                                Mục: "{debt.description}"
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="text-right">
                                                        <p className={`font-headline font-extrabold text-sm ${
                                                            debt.type === 'THEY_OWE_YOU' ? 'text-emerald-600' : 'text-rose-500'
                                                        }`}>
                                                            {formatMoney(debt.amount)}
                                                        </p>
                                                        <button
                                                            onClick={() => alert(`Gợi ý: Liên hệ ${debt.fromUser || debt.toUser} để thanh toán qua chuyển khoản hoặc tiền mặt!`)}
                                                            className="text-xs font-semibold text-blue-900 mt-0.5 hover:underline block"
                                                        >
                                                            {debt.type === 'THEY_OWE_YOU' ? 'Nhắc nợ' : 'Trả ngay'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                                <span className="material-symbols-outlined text-4xl text-emerald-500 mb-2">check_circle</span>
                                                <p className="text-sm font-bold text-slate-700">Tuyệt vời! Không có ai còn nợ ai.</p>
                                                <p className="text-xs text-slate-400 mt-1">Mọi hóa đơn trong nhóm đã được cân bằng.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </div>

                            {/* Right Column: Recent Activity (5 cols) */}
                            <div className="lg:col-span-5 flex flex-col gap-6">
                                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex-1 flex flex-col">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-headline text-lg font-bold text-blue-950">Recent Activity</h3>
                                        <button
                                            onClick={() => navigate('/group/activity')}
                                            className="text-xs font-bold text-blue-900 hover:text-blue-700 transition-colors hover:underline"
                                        >
                                            Xem tất cả
                                        </button>
                                    </div>

                                    <div className="space-y-4 flex-1">
                                        {filteredTransactions.slice(0, 5).map((tx) => {
                                            const isPayer = tx.payerName === currentFullName || tx.payerName === currentUsername;
                                            const commentCount = tx.comments?.length || 0;
                                            return (
                                                <div
                                                    key={tx.id}
                                                    onClick={() => setSelectedTx(tx)}
                                                    className="flex items-start gap-3.5 p-3 rounded-xl hover:bg-blue-50/50 hover:border-blue-200 transition-all border border-slate-100 cursor-pointer group"
                                                >
                                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-900 group-hover:text-white transition-colors">
                                                        <span className="material-symbols-outlined text-xl">restaurant</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0 pt-0.5">
                                                        <p className="font-body font-bold text-sm text-slate-800 truncate">
                                                            {tx.description}
                                                        </p>
                                                        <p className="font-label text-xs text-slate-400 mt-0.5 truncate">
                                                            Trả bởi <span className="font-semibold text-slate-600">{tx.payerName}</span> • {new Date(tx.transactionDate).toLocaleDateString('vi-VN')}
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                                                                <span className="material-symbols-outlined text-[13px]">chat_bubble_outline</span>
                                                                <span>{commentCount > 0 ? `${commentCount} bình luận` : 'Góp ý'}</span>
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingTx(tx);
                                                                }}
                                                                className="inline-flex items-center gap-0.5 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-600 hover:text-white px-2 py-0.5 rounded-lg border border-amber-200 transition-colors cursor-pointer"
                                                                title="Sửa khoản chi"
                                                            >
                                                                <span className="material-symbols-outlined text-[13px]">edit</span>
                                                                <span>Sửa</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteTransaction(tx);
                                                                }}
                                                                className="inline-flex items-center gap-0.5 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white px-2 py-0.5 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                                                                title="Xoá khoản chi"
                                                            >
                                                                <span className="material-symbols-outlined text-[13px]">delete</span>
                                                                <span>Xoá</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="text-right pt-0.5 shrink-0">
                                                        <p className="font-headline font-extrabold text-sm text-slate-900">
                                                            {formatMoney(tx.amount)}
                                                        </p>
                                                        <p className={`font-label text-[11px] font-semibold mt-0.5 ${
                                                            isPayer ? 'text-emerald-600' : 'text-rose-500'
                                                        }`}>
                                                            {isPayer ? 'Bạn đã chi' : 'Bạn tham gia'}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {filteredTransactions.length === 0 && (
                                            <div className="text-center py-10">
                                                <span className="material-symbols-outlined text-3xl text-slate-300">receipt_long</span>
                                                <p className="text-sm text-slate-400 mt-2">Chưa có giao dịch nhóm nào.</p>
                                                <button
                                                    onClick={() => setShowSplitBillModal(true)}
                                                    className="mt-3 text-xs text-blue-900 font-bold hover:underline"
                                                >
                                                    + Tạo hóa đơn đầu tiên
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Full Width Chat/Comments Section (Group Discussion) */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col h-[340px]">
                            <div className="bg-slate-50 px-6 py-3.5 border-b border-slate-200 flex justify-between items-center">
                                <h3 className="font-headline text-sm font-bold text-blue-950 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg text-blue-800">forum</span>
                                    <span>Group Discussion ({activeGroup?.name || 'Nhóm'})</span>
                                </h3>
                                <span className="text-[11px] text-slate-400 font-medium">Trò chuyện & ghi chú chi tiêu trực tiếp</span>
                            </div>

                            <div className="flex-1 p-6 overflow-y-auto chat-scroll flex flex-col gap-4 bg-slate-50/50">
                                {groupComments.length > 0 ? (
                                    groupComments.map((comment) => {
                                        const isSelf = comment.userName === currentFullName || comment.userName === currentUsername;
                                        return (
                                            <div
                                                key={comment.id}
                                                className={`flex gap-3 max-w-[80%] ${
                                                    isSelf ? 'self-end flex-row-reverse' : 'self-start'
                                                }`}
                                            >
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-sm overflow-hidden ${
                                                    isSelf ? 'bg-blue-900 text-white' : 'bg-slate-300 text-slate-700'
                                                }`}>
                                                    {(comment.userAvatar || (isSelf && profileData?.avatarUrl)) ? (
                                                        <img
                                                            src={formatAvatarUrl(comment.userAvatar || profileData?.avatarUrl)}
                                                            alt={comment.userName || 'Avatar'}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        (comment.userName || 'U').charAt(0).toUpperCase()
                                                    )}
                                                </div>

                                                <div className={isSelf ? 'items-end flex flex-col' : 'items-start flex flex-col'}>
                                                    <div className={`flex items-baseline gap-2 mb-1 ${
                                                        isSelf ? 'flex-row-reverse' : ''
                                                    }`}>
                                                        <span className="font-body font-semibold text-xs text-slate-700">
                                                            {isSelf ? 'Bạn' : comment.userName}
                                                        </span>
                                                        <span className="font-label text-[10px] text-slate-400">
                                                            {comment.createdAt ? new Date(comment.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                                                        </span>
                                                    </div>

                                                    <div className={`rounded-2xl px-4 py-2.5 text-sm font-body shadow-sm ${
                                                        isSelf
                                                            ? 'bg-blue-900 text-white rounded-tr-sm'
                                                            : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm'
                                                    }`}>
                                                        {comment.content}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-10 text-slate-400 text-xs italic">
                                        Chưa có bình luận nào. Hãy bắt đầu cuộc trò chuyện cùng nhóm!
                                    </div>
                                )}
                                <div ref={commentsEndRef} />
                            </div>

                            <form onSubmit={handleSendComment} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
                                <input
                                    type="text"
                                    value={commentInput}
                                    onChange={(e) => setCommentInput(e.target.value)}
                                    placeholder="Gõ tin nhắn hoặc bình luận..."
                                    className="flex-1 bg-slate-100 border border-slate-200 rounded-full py-2.5 pl-4 pr-4 text-sm font-body text-slate-800 focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                                />
                                <button
                                    type="submit"
                                    disabled={sendingComment || !commentInput.trim()}
                                    className="w-10 h-10 bg-blue-900 rounded-full flex items-center justify-center text-white hover:bg-blue-800 transition-colors disabled:opacity-50 shrink-0"
                                >
                                    <span className="material-symbols-outlined text-[18px]">send</span>
                                </button>
                            </form>
                        </div>

                    </div>
                </div>
            </main>

            {/* MODAL TẠO NHÓM MỚI */}
            {showCreateGroupModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white p-8 rounded-3xl w-full max-w-sm shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="w-14 h-14 bg-blue-50 text-blue-900 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                                <span className="material-symbols-outlined text-3xl">group_add</span>
                            </div>
                            <h3 className="text-xl font-black text-blue-950">Tạo nhóm chi tiêu mới</h3>
                            <p className="text-xs text-slate-500 mt-1">Dành cho chuyến đi du lịch, phòng trọ, dự án nhóm...</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tên nhóm</label>
                                <input
                                    type="text"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    placeholder="Ví dụ: Chuyến đi Đà Lạt, Trọ KTX..."
                                    className="w-full bg-slate-50 p-3.5 rounded-xl font-semibold border border-slate-200 focus:ring-2 focus:ring-blue-900 text-sm mt-1"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowCreateGroupModal(false)}
                                    className="flex-1 py-3 bg-slate-100 font-bold rounded-xl text-slate-600 hover:bg-slate-200 transition-all text-sm"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleCreateGroup}
                                    className="flex-1 py-3 bg-blue-900 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 hover:bg-blue-800 transition-all text-sm"
                                >
                                    Tạo ngay
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL THÊM THÀNH VIÊN */}
            {showAddMemberModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white p-8 rounded-3xl w-full max-w-sm shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="w-14 h-14 bg-indigo-50 text-indigo-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                                <span className="material-symbols-outlined text-3xl">person_add</span>
                            </div>
                            <h3 className="text-xl font-black text-blue-950">Thêm thành viên vào nhóm</h3>
                            <p className="text-xs text-slate-500 mt-1">Nhóm: <span className="font-bold text-blue-900">{activeGroup?.name}</span></p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email hoặc Tên đăng nhập</label>
                                <input
                                    type="text"
                                    value={memberIdentifier}
                                    onChange={(e) => setMemberIdentifier(e.target.value)}
                                    placeholder="vd: nguyenvana@gmail.com hoặc vana"
                                    className="w-full bg-slate-50 p-3.5 rounded-xl font-semibold border border-slate-200 focus:ring-2 focus:ring-blue-900 text-sm mt-1"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowAddMemberModal(false)}
                                    className="flex-1 py-3 bg-slate-100 font-bold rounded-xl text-slate-600 hover:bg-slate-200 transition-all text-sm"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleAddMember}
                                    className="flex-1 py-3 bg-blue-900 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 hover:bg-blue-800 transition-all text-sm"
                                >
                                    Thêm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL SPLIT NEW BILL (CHIA HÓA ĐƠN NHANH) */}
            {showSplitBillModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                                <span className="material-symbols-outlined text-3xl">splitscreen</span>
                            </div>
                            <h3 className="text-xl font-black text-blue-950">Chia hóa đơn mới</h3>
                            <p className="text-xs text-slate-500 mt-1">Nhóm: <span className="font-bold text-blue-900">{activeGroup?.name}</span></p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Số tiền (VND)</label>
                                <input
                                    type="number"
                                    value={quickBill.amount}
                                    onChange={(e) => setQuickBill({ ...quickBill, amount: e.target.value })}
                                    placeholder="0"
                                    className="w-full bg-slate-50 p-3.5 rounded-xl font-extrabold text-blue-900 border border-slate-200 focus:ring-2 focus:ring-blue-900 text-base mt-1"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Mô tả hóa đơn</label>
                                <input
                                    type="text"
                                    value={quickBill.description}
                                    onChange={(e) => setQuickBill({ ...quickBill, description: e.target.value })}
                                    placeholder="Vd: Ăn tối, Taxi, Khách sạn..."
                                    className="w-full bg-slate-50 p-3.5 rounded-xl font-semibold border border-slate-200 focus:ring-2 focus:ring-blue-900 text-sm mt-1"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Ngày chi</label>
                                    <input
                                        type="date"
                                        value={quickBill.transactionDate}
                                        onChange={(e) => setQuickBill({ ...quickBill, transactionDate: e.target.value })}
                                        className="w-full bg-slate-50 p-3 rounded-xl font-semibold border border-slate-200 text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Cách chia</label>
                                    <select
                                        value={quickBill.splitType}
                                        onChange={(e) => setQuickBill({ ...quickBill, splitType: e.target.value })}
                                        className="w-full bg-slate-50 p-3 rounded-xl font-semibold border border-slate-200 text-xs mt-1"
                                    >
                                        <option value="EQUAL">Chia đều</option>
                                    </select>
                                </div>
                            </div>

                            <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                💡 Chi phí sẽ được tự động chia đều cho tất cả <b>{activeGroup?.members?.length || 0} thành viên</b> trong nhóm.
                            </p>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowSplitBillModal(false)}
                                    className="flex-1 py-3.5 bg-slate-100 font-bold rounded-xl text-slate-600 hover:bg-slate-200 transition-all text-sm"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleQuickSplit}
                                    className="flex-1 py-3.5 bg-blue-900 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 hover:bg-blue-800 transition-all text-sm"
                                >
                                    Lưu & Chia
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL SETTLE UP */}
            {showSettleModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="w-14 h-14 bg-blue-50 text-blue-900 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                                <span className="material-symbols-outlined text-3xl">account_balance</span>
                            </div>
                            <h3 className="text-xl font-black text-blue-950">Quyết toán nợ (Settle Up)</h3>
                            <p className="text-xs text-slate-500 mt-1">Danh sách các khoản nợ cần thanh toán</p>
                        </div>

                        <div className="space-y-3 max-h-[300px] overflow-y-auto mb-6 pr-1">
                            {debtList.length > 0 ? (
                                debtList.map((debt, index) => (
                                    <div key={index} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                                        <div>
                                            <span className="font-bold text-slate-800">{debt.fromUser}</span>
                                            <span className="text-slate-400 mx-1">➜</span>
                                            <span className="font-bold text-slate-800">{debt.toUser}</span>
                                            <p className="text-[10px] text-slate-400 mt-0.5">{debt.description}</p>
                                        </div>
                                        <span className="font-extrabold text-blue-900 text-sm">{formatMoney(debt.amount)}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-xs text-slate-400 py-6">Hiện không có khoản nợ nào cần thanh toán.</p>
                            )}
                        </div>

                        <button
                            onClick={() => setShowSettleModal(false)}
                            className="w-full py-3 bg-slate-100 font-bold rounded-xl text-slate-600 hover:bg-slate-200 transition-all text-sm"
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            )}
            {/* MODAL CHI TIẾT & BÌNH LUẬN KHOẢN CHI NHÓM */}
            <TransactionCommentModal
                isOpen={!!selectedTx}
                onClose={() => setSelectedTx(null)}
                transaction={selectedTx}
                profileData={profileData}
                onCommentAdded={handleRefreshAfterComment}
                onEdit={(tx) => {
                    setSelectedTx(null);
                    setEditingTx(tx);
                }}
                onDelete={(tx) => handleDeleteTransaction(tx)}
            />

            {/* MODAL CHỈNH SỬA KHOẢN CHI TIÊU NHÓM */}
            <EditGroupTransactionModal
                isOpen={!!editingTx}
                onClose={() => setEditingTx(null)}
                transaction={editingTx}
                group={activeGroup}
                onSaved={async () => {
                    if (activeGroup) {
                        await fetchGroupTransactions(activeGroup.id);
                        await fetchGroupComments(activeGroup.id);
                    }
                }}
                onDeleted={async () => {
                    if (activeGroup) {
                        await fetchGroupTransactions(activeGroup.id);
                        await fetchGroupComments(activeGroup.id);
                    }
                }}
            />
        </div>
    );
};

export default GroupDashboard;