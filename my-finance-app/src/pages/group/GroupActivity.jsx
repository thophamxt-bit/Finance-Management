import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import GroupSidebar from '../../components/group/GroupSidebar';
import TransactionCommentModal from '../../components/group/TransactionCommentModal';
import EditGroupTransactionModal from '../../components/group/EditGroupTransactionModal';

const GroupActivity = () => {
    const navigate = useNavigate();
    const [profileData, setProfileData] = useState({ fullName: '', email: '', username: '' });
    const [groups, setGroups] = useState([]);
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Search & Filter
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('ALL'); // 'ALL', 'PAID_BY_ME', 'JOINED_BY_ME'

    // Modal Xem chi tiết & Thảo luận giao dịch / Sửa giao dịch
    const [selectedTx, setSelectedTx] = useState(null);
    const [editingTx, setEditingTx] = useState(null);

    // Fetch profile & groups
    useEffect(() => {
        const initData = async () => {
            const token = localStorage.getItem("token");
            if (!token) return navigate("/login");

            try {
                const [profRes, grpRes] = await Promise.all([
                    axios.get("http://localhost:8080/api/auth/profile", { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get("http://localhost:8080/api/groups", { headers: { Authorization: `Bearer ${token}` } })
                ]);

                setProfileData({
                    id: profRes.data.id,
                    fullName: profRes.data.fullName || profRes.data.username || 'Người dùng',
                    email: profRes.data.email || '',
                    username: profRes.data.username,
                    avatarUrl: profRes.data.avatarUrl || ''
                });

                if (grpRes.data && Array.isArray(grpRes.data)) {
                    setGroups(grpRes.data);
                    if (grpRes.data.length > 0) {
                        setSelectedGroupId(grpRes.data[0].id);
                    }
                }
            } catch (err) {
                console.error("Lỗi khởi tạo:", err);
            } finally {
                setLoading(false);
            }
        };
        initData();
    }, [navigate]);

    // Fetch transactions when group changes
    const fetchTransactions = async (groupId) => {
        if (!groupId) return;
        const token = localStorage.getItem("token");
        if (!token) return;
        setLoading(true);
        try {
            const res = await axios.get(`http://localhost:8080/api/groups/${groupId}/transactions`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data && Array.isArray(res.data)) {
                setTransactions(res.data);
                return res.data;
            } else {
                setTransactions([]);
                return [];
            }
        } catch (err) {
            console.error("Lỗi tải giao dịch nhóm:", err);
            return [];
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedGroupId) {
            fetchTransactions(selectedGroupId);
        }
    }, [selectedGroupId]);

    const handleRefreshAfterComment = async () => {
        const freshList = await fetchTransactions(selectedGroupId);
        if (selectedTx && Array.isArray(freshList)) {
            const updated = freshList.find(t => t.id === selectedTx.id);
            if (updated) setSelectedTx(updated);
        }
    };

    const handleDeleteTransaction = async (tx) => {
        if (!tx) return;
        const confirmed = window.confirm(
            `Bạn có chắc chắn muốn xoá khoản chi "${tx.description}" (${formatMoney(tx.amount)}) không?`
        );
        if (!confirmed) return;

        try {
            const token = localStorage.getItem("token");
            const groupId = tx.groupId || selectedGroupId;
            await axios.delete(`http://localhost:8080/api/groups/${groupId}/transactions/${tx.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (selectedTx?.id === tx.id) setSelectedTx(null);
            if (editingTx?.id === tx.id) setEditingTx(null);
            await fetchTransactions(selectedGroupId);
        } catch (err) {
            alert(err.response?.data?.message || "Lỗi khi xoá khoản chi tiêu nhóm!");
        }
    };

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
            .format(amount || 0)
            .replace('₫', 'VND');
    };

    const currentFullName = profileData.fullName;
    const currentUsername = profileData.username;

    // Lọc giao dịch
    const filteredTransactions = transactions.filter(tx => {
        const matchesSearch = !searchTerm ||
            (tx.description && tx.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (tx.payerName && tx.payerName.toLowerCase().includes(searchTerm.toLowerCase()));

        const isPayer = tx.payerName === currentFullName || tx.payerName === currentUsername;

        if (filterType === 'PAID_BY_ME') return matchesSearch && isPayer;
        if (filterType === 'JOINED_BY_ME') return matchesSearch && !isPayer;
        return matchesSearch;
    });

    const activeGroupObj = groups.find(g => g.id === parseInt(selectedGroupId));

    return (
        <div className="flex h-screen overflow-hidden text-slate-800 bg-slate-50 font-body">
            <GroupSidebar profileData={profileData} />

            <main className="flex-1 flex flex-col md:ml-64 relative overflow-hidden bg-slate-50">
                {/* Header */}
                <header className="flex justify-between items-center w-full px-6 py-4 bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                    <div>
                        <h2 className="text-xl font-extrabold text-blue-950 font-headline">Lịch sử chi tiêu nhóm</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Theo dõi các hóa đơn và phân bổ tiền của từng thành viên</p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Selector Nhóm */}
                        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                            <span className="material-symbols-outlined text-blue-900 text-lg">group</span>
                            <select
                                value={selectedGroupId}
                                onChange={(e) => setSelectedGroupId(e.target.value)}
                                className="bg-transparent border-none text-xs font-bold text-slate-800 focus:ring-0 cursor-pointer"
                            >
                                {groups.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={() => navigate('/group/addnew')}
                            className="bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                        >
                            <span className="material-symbols-outlined text-sm">add</span>
                            <span>Thêm hóa đơn</span>
                        </button>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-6xl mx-auto space-y-6 pb-16">

                        {/* Search & Tabs */}
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                            <div className="relative w-full sm:w-80">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Tìm món chi, người trả..."
                                    className="w-full bg-slate-100 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-900"
                                />
                            </div>

                            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto justify-center">
                                <button
                                    onClick={() => setFilterType('ALL')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        filterType === 'ALL' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    Tất cả ({transactions.length})
                                </button>
                                <button
                                    onClick={() => setFilterType('PAID_BY_ME')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        filterType === 'PAID_BY_ME' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    Bạn đã chi
                                </button>
                                <button
                                    onClick={() => setFilterType('JOINED_BY_ME')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        filterType === 'JOINED_BY_ME' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    Bạn tham gia
                                </button>
                            </div>
                        </div>

                        {/* Transactions List */}
                        <div className="space-y-3">
                            {filteredTransactions.map((tx) => {
                                const isPayer = tx.payerName === currentFullName || tx.payerName === currentUsername;
                                return (
                                    <div
                                        key={tx.id}
                                        onClick={() => setSelectedTx(tx)}
                                        className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center font-bold shrink-0 group-hover:bg-blue-900 group-hover:text-white transition-all shadow-sm">
                                                <span className="material-symbols-outlined text-2xl">receipt</span>
                                            </div>
                                            <div>
                                                <h4 className="font-headline font-bold text-base text-slate-900 leading-tight">
                                                    {tx.description}
                                                </h4>
                                                <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                                                    <span>Người trả: <b className="text-slate-700">{tx.payerName}</b></span>
                                                    <span>•</span>
                                                    <span>{new Date(tx.transactionDate).toLocaleDateString('vi-VN')}</span>
                                                    <span>•</span>
                                                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                                                        {tx.splitType === 'EQUAL' ? 'Chia đều' : tx.splitType}
                                                    </span>
                                                </p>

                                                {/* Danh sách người chia tiền (Splits) */}
                                                <div className="flex flex-wrap gap-1.5 mt-2.5">
                                                    {tx.splits?.map((s, idx) => (
                                                        <span
                                                            key={idx}
                                                            className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${
                                                                s.isSettled
                                                                    ? 'bg-slate-100 text-slate-500 border-slate-200 line-through'
                                                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                                            }`}
                                                        >
                                                            {s.fullName || s.username}: {formatMoney(s.owedAmount)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 gap-2">
                                            <div className="text-left md:text-right">
                                                <span className="text-lg font-black text-slate-900 font-headline block">
                                                    {formatMoney(tx.amount)}
                                                </span>
                                                <span className={`inline-block text-xs font-bold mt-1 px-2.5 py-0.5 rounded-full ${
                                                    isPayer ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                                }`}>
                                                    {isPayer ? 'Bạn đã chi trả' : 'Bạn nợ phần chia'}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-1.5 justify-end">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedTx(tx);
                                                    }}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-900 text-blue-900 hover:text-white border border-blue-200/80 text-xs font-bold transition-all cursor-pointer"
                                                >
                                                    <span className="material-symbols-outlined text-sm">chat_bubble_outline</span>
                                                    <span>
                                                        {tx.comments && tx.comments.length > 0
                                                            ? `${tx.comments.length} bình luận`
                                                            : 'Bình luận / Góp ý'}
                                                    </span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingTx(tx);
                                                    }}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-600 text-amber-800 hover:text-white border border-amber-200 text-xs font-bold transition-all cursor-pointer"
                                                    title="Chỉnh sửa khoản chi này"
                                                >
                                                    <span className="material-symbols-outlined text-sm">edit</span>
                                                    <span>Sửa</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteTransaction(tx);
                                                    }}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 text-xs font-bold transition-all cursor-pointer"
                                                    title="Xoá khoản chi này"
                                                >
                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                    <span>Xoá</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {filteredTransactions.length === 0 && !loading && (
                                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
                                    <span className="material-symbols-outlined text-4xl text-slate-300">receipt_long</span>
                                    <p className="text-sm font-bold text-slate-600 mt-2">Không tìm thấy giao dịch nào</p>
                                    <p className="text-xs text-slate-400 mt-1">Hãy thử tìm từ khóa khác hoặc tạo hóa đơn mới.</p>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </main>

            {/* MODAL CHI TIẾT GIAO DỊCH & THẢO LUẬN */}
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
                group={activeGroupObj}
                onSaved={() => fetchTransactions(selectedGroupId)}
                onDeleted={() => fetchTransactions(selectedGroupId)}
            />
        </div>
    );
};

export default GroupActivity;