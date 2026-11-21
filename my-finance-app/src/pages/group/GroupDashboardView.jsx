import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const GroupDashboardView = ({ onSwitchToPersonal, profileData }) => {
    // --- States Dữ liệu Nhóm ---
    const [groups, setGroups] = useState([]);
    const [activeGroup, setActiveGroup] = useState(null);
    const [groupTransactions, setGroupTransactions] = useState([]);
    const [groupComments, setGroupComments] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- Modals State ---
    const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [showAddTxModal, setShowAddTxModal] = useState(false);
    const [selectedTxDetail, setSelectedTxDetail] = useState(null);

    // --- Form States ---
    const [newGroupName, setNewGroupName] = useState('');
    const [memberIdentifier, setMemberIdentifier] = useState('');
    const [newTx, setNewTx] = useState({
        amount: '',
        description: '',
        transactionDate: new Date().toISOString().slice(0, 10),
        splitType: 'EQUAL'
    });
    const [commentInput, setCommentInput] = useState('');
    const [txCommentInput, setTxCommentInput] = useState('');
    const [sendingComment, setSendingComment] = useState(false);

    const commentsEndRef = useRef(null);

    // 1. Fetch Danh sách Nhóm
    const fetchGroups = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const headers = { Authorization: `Bearer ${token}` };
            const res = await axios.get("http://localhost:8080/api/groups", { headers });
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
                }
            }
        } catch (error) {
            console.error("Lỗi tải danh sách nhóm:", error);
        } finally {
            setLoading(false);
        }
    };

    // 2. Fetch Giao dịch của Nhóm
    const fetchGroupTransactions = async (groupId) => {
        if (!groupId) return;
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const headers = { Authorization: `Bearer ${token}` };
            const res = await axios.get(`http://localhost:8080/api/groups/${groupId}/transactions`, { headers });
            if (res.data && Array.isArray(res.data)) {
                setGroupTransactions(res.data);
            }
        } catch (error) {
            console.error("Lỗi tải giao dịch nhóm:", error);
        }
    };

    // 3. Fetch Thảo luận / Bình luận của Nhóm (Group Discussion)
    const fetchGroupComments = async (groupId) => {
        if (!groupId) return;
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const headers = { Authorization: `Bearer ${token}` };
            const res = await axios.get(`http://localhost:8080/api/groups/${groupId}/comments`, { headers });
            if (res.data && Array.isArray(res.data)) {
                setGroupComments(res.data);
            }
        } catch (error) {
            console.error("Lỗi tải bình luận nhóm:", error);
        }
    };

    useEffect(() => {
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

    // Cuộn xuống bình luận mới nhất
    useEffect(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [groupComments]);

    // Xử lý tạo nhóm mới
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
            if (res.data?.groupId) {
                setActiveGroup({ id: res.data.groupId, name: res.data.groupName, members: [] });
            }
        } catch (error) {
            alert(error.response?.data?.message || "Lỗi tạo nhóm!");
        }
    };

    // Xử lý thêm thành viên vào nhóm
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
        } catch (error) {
            alert(error.response?.data?.message || "Lỗi thêm thành viên!");
        }
    };

    // Xử lý tạo giao dịch nhóm & chia tiền
    const handleCreateGroupTx = async () => {
        if (!newTx.amount || parseFloat(newTx.amount) <= 0) return alert("Vui lòng nhập số tiền hợp lệ!");
        if (!newTx.description.trim()) return alert("Vui lòng nhập mô tả chi tiêu!");
        if (!activeGroup) return alert("Chưa chọn nhóm!");

        try {
            const token = localStorage.getItem("token");
            await axios.post(`http://localhost:8080/api/groups/${activeGroup.id}/transactions`, {
                groupId: activeGroup.id,
                amount: parseFloat(newTx.amount),
                description: newTx.description.trim(),
                transactionDate: newTx.transactionDate,
                splitType: newTx.splitType
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Tạo giao dịch nhóm thành công!");
            setNewTx({
                amount: '',
                description: '',
                transactionDate: new Date().toISOString().slice(0, 10),
                splitType: 'EQUAL'
            });
            setShowAddTxModal(false);
            await fetchGroupTransactions(activeGroup.id);
        } catch (error) {
            alert(error.response?.data?.message || "Lỗi tạo giao dịch nhóm!");
        }
    };

    // Gửi bình luận thảo luận nhóm (Group Discussion)
    const handleSendGroupComment = async () => {
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
        } catch (error) {
            alert(error.response?.data?.message || "Lỗi gửi bình luận!");
        } finally {
            setSendingComment(false);
        }
    };

    // Gửi bình luận vào giao dịch chi tiêu cụ thể
    const handleSendTxComment = async () => {
        if (!txCommentInput.trim() || !selectedTxDetail) return;
        try {
            const token = localStorage.getItem("token");
            await axios.post(`http://localhost:8080/api/groups/transactions/${selectedTxDetail.id}/comments`, {
                groupTransactionId: selectedTxDetail.id,
                content: txCommentInput.trim()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTxCommentInput('');
            await fetchGroupTransactions(activeGroup.id);
            // Refresh modal
            const updated = groupTransactions.find(t => t.id === selectedTxDetail.id);
            if (updated) setSelectedTxDetail(updated);
        } catch (error) {
            alert(error.response?.data?.message || "Lỗi gửi bình luận!");
        }
    };

    // Tính toán số liệu nhóm
    const totalGroupSpent = groupTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    let youPaid = 0;
    let youOwe = 0;
    let totalMyShare = 0;
    const currentUsername = profileData?.username;
    const currentFullName = profileData?.fullName;

    groupTransactions.forEach(t => {
        if (t.payerName === currentFullName || t.payerName === currentUsername) {
            youPaid += parseFloat(t.amount || 0);
        }
        if (t.splits && Array.isArray(t.splits)) {
            const mySplit = t.splits.find(s => s.username === currentUsername || s.fullName === currentFullName);
            if (mySplit) {
                totalMyShare += parseFloat(mySplit.owedAmount || 0);
                if (!mySplit.isSettled) {
                    youOwe += parseFloat(mySplit.owedAmount || 0);
                }
            }
        }
    });

    const settledPercent = totalMyShare > 0 ? Math.round(((totalMyShare - youOwe) / totalMyShare) * 100) : 100;

    // Helper format relative time
    const formatTimeAgo = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now - d;
        const diffMin = Math.floor(diffMs / 60000);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffMin < 1) return 'Vừa xong';
        if (diffMin < 60) return `${diffMin} phút trước`;
        if (diffHour < 24) return `${diffHour} giờ trước`;
        if (diffDay < 7) return `${diffDay} ngày trước`;
        return d.toLocaleDateString('vi-VN');
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-300 text-on-background">

            {/* Top Bar Switcher & Group Select */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-low p-6 rounded-3xl border border-glass-stroke shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-electric-blue to-vivid-violet flex items-center justify-center text-white shadow-[0_0_15px_rgba(0,112,255,0.4)] shrink-0">
                        <span className="material-symbols-outlined text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>group</span>
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
                                Quản lý Chi tiêu Nhóm
                            </h2>
                            <span className="w-2.5 h-2.5 rounded-full bg-soft-emerald pulse-dot"></span>
                        </div>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                            Chia tiền thông minh, thảo luận chi tiêu và quản lý tài chính nhóm
                        </p>
                    </div>
                </div>

                {/* NÚT BẤM CHUYỂN ĐỔI 1 CHẠM (CÁ NHÂN ⇄ NHÓM) */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                    <div className="bg-surface-container-high p-1 rounded-2xl flex border border-glass-stroke shadow-sm">
                        <button
                            onClick={onSwitchToPersonal}
                            className="px-5 py-2.5 rounded-xl font-bold text-xs text-on-surface-variant hover:text-white transition-all flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm">person</span>
                            Cá nhân
                        </button>
                        <button
                            className="px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-electric-blue to-vivid-violet text-white shadow-[0_0_15px_rgba(0,112,255,0.3)] flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm" style={{fontVariationSettings: "'FILL' 1"}}>group</span>
                            Nhóm
                        </button>
                    </div>

                    <button
                        onClick={() => setShowCreateGroupModal(true)}
                        className="px-4 py-2.5 rounded-2xl bg-white/10 text-white font-bold text-xs hover:bg-white/20 transition-all border border-glass-stroke flex items-center gap-1.5"
                    >
                        <span className="material-symbols-outlined text-sm">add</span>
                        Tạo nhóm
                    </button>
                </div>
            </div>

            {/* Chưa có nhóm nào */}
            {groups.length === 0 && !loading && (
                <div className="glass-panel rounded-[2rem] p-12 text-center max-w-lg mx-auto">
                    <div className="w-16 h-16 rounded-full bg-electric-blue/20 text-electric-blue flex items-center justify-center mx-auto mb-4 border border-electric-blue/30">
                        <span className="material-symbols-outlined text-3xl">group_add</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Bạn chưa tham gia nhóm nào</h3>
                    <p className="text-on-surface-variant text-sm mb-6">Hãy tạo nhóm đầu tiên để chia tiền ăn uống, du lịch hoặc sinh hoạt cùng bạn bè!</p>
                    <button
                        onClick={() => setShowCreateGroupModal(true)}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-electric-blue to-vivid-violet text-white font-bold hover:opacity-90 shadow-[0_0_15px_rgba(0,112,255,0.4)] transition-all"
                    >
                        + Tạo nhóm mới ngay
                    </button>
                </div>
            )}

            {/* Khi đã có Nhóm đang chọn */}
            {activeGroup && (
                <div className="flex flex-col gap-8">

                    {/* 1. Header / Group Info (Trip Header Style) */}
                    <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-surface-container-low p-6 md:p-8 rounded-[2rem] border border-glass-stroke shadow-xl">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="material-symbols-outlined text-vivid-violet text-3xl" style={{fontVariationSettings: "'FILL' 1"}}>flight_takeoff</span>
                                <span className="px-3 py-1 rounded-full bg-vivid-violet/15 text-vivid-violet font-bold text-xs border border-vivid-violet/30 uppercase tracking-wider">
                                    Nhóm hoạt động
                                </span>
                                {groups.length > 1 && (
                                    <select
                                        value={activeGroup.id}
                                        onChange={(e) => {
                                            const g = groups.find(x => x.id === parseInt(e.target.value));
                                            if (g) setActiveGroup(g);
                                        }}
                                        className="bg-surface-container-high border border-glass-stroke text-white font-bold text-xs px-3 py-1 rounded-full focus:outline-none focus:ring-1 focus:ring-electric-blue cursor-pointer"
                                    >
                                        {groups.map(g => (
                                            <option key={g.id} value={g.id}>Đổi nhóm: {g.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">{activeGroup.name}</h1>
                            <p className="text-xs md:text-sm text-on-surface-variant flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">calendar_month</span>
                                Khởi tạo ngày {new Date(activeGroup.createdAt || Date.now()).toLocaleDateString('vi-VN')} • {activeGroup.members?.length || 1} Thành viên
                            </p>
                        </div>

                        {/* Thành viên Avatar Pile & Nút thêm người */}
                        <div className="flex items-center gap-3">
                            <div className="flex -space-x-3">
                                {activeGroup.members?.slice(0, 4).map((m, idx) => (
                                    <div
                                        key={idx}
                                        title={`${m.fullName || m.username} (${m.role})`}
                                        className="w-10 h-10 rounded-full border-2 border-background bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs shadow-md"
                                    >
                                        {(m.fullName || m.username || 'M').charAt(0).toUpperCase()}
                                    </div>
                                ))}
                                {(activeGroup.members?.length || 0) > 4 && (
                                    <div className="w-10 h-10 rounded-full border-2 border-background bg-surface-variant flex items-center justify-center text-xs font-bold text-white shadow-md">
                                        +{(activeGroup.members.length - 4)}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => setShowAddMemberModal(true)}
                                className="w-10 h-10 rounded-full bg-electric-blue text-white flex items-center justify-center hover:bg-electric-blue/80 transition-colors shadow-[0_0_15px_rgba(0,112,255,0.4)]"
                                title="Thêm thành viên vào nhóm"
                            >
                                <span className="material-symbols-outlined text-sm">person_add</span>
                            </button>
                        </div>
                    </header>

                    {/* 2. Top Stats Grid (Bento Style) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* Total Group Spending Card (Hero) */}
                        <div className="glass-panel rounded-2xl p-6 glow-card md:col-span-2 relative overflow-hidden group">
                            <div className="absolute -right-20 -top-20 w-64 h-64 bg-electric-blue/20 rounded-full blur-3xl group-hover:bg-electric-blue/30 transition-all duration-500"></div>
                            <div className="relative z-10 flex flex-col justify-between h-full">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-xs uppercase font-bold text-on-surface-variant tracking-wider">Tổng chi tiêu cả nhóm</h2>
                                        <div className="flex items-baseline gap-2 mt-2">
                                            <span className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-electric-blue">
                                                ₫ {totalGroupSpent.toLocaleString('vi-VN')}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="px-3 py-1.5 rounded-full bg-soft-emerald/15 text-soft-emerald border border-soft-emerald/30 text-xs font-bold flex items-center gap-1">
                                        <span className="material-symbols-outlined text-xs">verified</span>
                                        Đã thanh toán {settledPercent}%
                                    </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm pt-2 border-t border-glass-stroke">
                                    <span className="text-on-surface-variant">
                                        Phần bạn cần trả: <strong className="text-purple-300 font-extrabold">₫ {youOwe.toLocaleString('vi-VN')}</strong>
                                    </span>
                                    <span className="text-on-surface-variant">
                                        Bạn đã thanh toán: <strong className="text-soft-emerald font-extrabold">₫ {youPaid.toLocaleString('vi-VN')}</strong>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Action Card ("Add Expense") */}
                        <div
                            onClick={() => setShowAddTxModal(true)}
                            className="glass-panel rounded-2xl p-6 flex flex-col justify-center gap-4 items-center text-center cursor-pointer group hover:border-electric-blue/50 transition-all"
                        >
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-electric-blue to-vivid-violet flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.4)] group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-white text-3xl" style={{fontVariationSettings: "'FILL' 1"}}>add_circle</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mb-1">Thêm chi tiêu mới</h3>
                                <p className="text-xs text-on-surface-variant">Ghi nhận khoản thanh toán & tự động chia tiền cho cả nhóm.</p>
                            </div>
                        </div>
                    </div>

                    {/* 3. Phần THẢO LUẬN NHÓM (Group Discussion / Comments Feed) */}
                    <section className="glass-panel rounded-2xl p-6 flex flex-col gap-6">
                        <div className="flex items-center justify-between border-b border-glass-stroke pb-4">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-electric-blue">forum</span>
                                <h2 className="text-lg font-bold text-white">Thảo luận & Bình luận Nhóm</h2>
                            </div>
                            <span className="text-xs font-bold text-on-surface-variant bg-surface-container px-3 py-1 rounded-full">
                                {groupComments.length} Bình luận
                            </span>
                        </div>

                        {/* Danh sách bình luận */}
                        <div className="flex flex-col gap-4 max-h-[380px] overflow-y-auto pr-2 hide-scroll">
                            {groupComments.length > 0 ? groupComments.map(c => (
                                <div key={c.id} className="flex gap-4 items-start">
                                    <div className="w-10 h-10 rounded-full border border-glass-stroke bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
                                        {(c.userName || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-white text-xs md:text-sm">{c.userName}</span>
                                            <span className="text-[11px] text-on-surface-variant">{formatTimeAgo(c.createdAt)}</span>
                                        </div>
                                        <div className="bg-white/5 rounded-2xl p-3.5 border border-glass-stroke">
                                            <p className="text-xs md:text-sm text-on-surface leading-relaxed">{c.content}</p>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-8">
                                    <span className="material-symbols-outlined text-slate-500 text-3xl mb-2">chat_bubble_outline</span>
                                    <p className="text-xs text-on-surface-variant italic">Chưa có thảo luận nào trong nhóm này. Hãy gửi tin nhắn đầu tiên!</p>
                                </div>
                            )}
                            <div ref={commentsEndRef} />
                        </div>

                        {/* Khung nhập bình luận (Input Field) */}
                        <div className="mt-2 flex items-center gap-3 bg-surface-container-low p-2 rounded-2xl border border-glass-stroke focus-within:border-electric-blue transition-colors">
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-glass-stroke bg-electric-blue/20 text-electric-blue flex items-center justify-center text-xs font-bold shrink-0">
                                {(profileData?.fullName || profileData?.username || 'U').charAt(0).toUpperCase()}
                            </div>
                            <input
                                className="flex-1 bg-transparent border-none focus:ring-0 text-xs md:text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none"
                                placeholder="Viết bình luận hoặc nhắn tin cho nhóm..."
                                type="text"
                                value={commentInput}
                                onChange={(e) => setCommentInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !sendingComment) {
                                        e.preventDefault();
                                        handleSendGroupComment();
                                    }
                                }}
                            />
                            <button
                                onClick={handleSendGroupComment}
                                disabled={sendingComment || !commentInput.trim()}
                                className="w-10 h-10 rounded-xl bg-electric-blue text-white flex items-center justify-center hover:bg-electric-blue/80 active:scale-95 transition-all disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-sm">send</span>
                            </button>
                        </div>
                    </section>

                    {/* 4. Danh sách Giao dịch Nhóm gần đây */}
                    <section className="glass-panel rounded-2xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-soft-emerald">receipt_long</span>
                                <h3 className="font-bold text-lg text-white">Lịch sử chi tiêu nhóm</h3>
                            </div>
                            <span className="text-xs text-on-surface-variant font-medium">{groupTransactions.length} khoản chi</span>
                        </div>

                        <div className="space-y-3">
                            {groupTransactions.length > 0 ? groupTransactions.map(t => (
                                <div
                                    key={t.id}
                                    onClick={() => setSelectedTxDetail(t)}
                                    className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-glass-stroke transition-all cursor-pointer flex justify-between items-center group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-electric-blue/15 border border-electric-blue/30 flex items-center justify-center text-electric-blue group-hover:scale-105 transition-transform">
                                            <span className="material-symbols-outlined">payments</span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-sm leading-tight">{t.description}</p>
                                            <p className="text-xs text-on-surface-variant mt-1">
                                                Người thanh toán: <span className="text-electric-blue font-semibold">{t.payerName}</span> • {new Date(t.transactionDate).toLocaleDateString('vi-VN')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="text-right flex items-center gap-4">
                                        <div>
                                            <p className="font-extrabold text-sm md:text-base text-soft-emerald">₫ {(t.amount || 0).toLocaleString('vi-VN')}</p>
                                            <p className="text-[10px] text-on-surface-variant uppercase font-bold">{t.splitType === 'EQUAL' ? 'Chia đều' : 'Tùy chỉnh'}</p>
                                        </div>
                                        <span className="material-symbols-outlined text-slate-500 group-hover:text-white transition-colors">chevron_right</span>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-8">
                                    <p className="text-xs text-on-surface-variant italic">Chưa có giao dịch chi tiêu nào trong nhóm.</p>
                                    <button onClick={() => setShowAddTxModal(true)} className="text-xs text-electric-blue font-bold hover:underline mt-2 inline-block">+ Thêm chi tiêu đầu tiên</button>
                                </div>
                            )}
                        </div>
                    </section>

                </div>
            )}

            {/* =========================================================================
                MODAL 1: TẠO NHÓM MỚI
            ========================================================================= */}
            {showCreateGroupModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="glass-panel bg-surface-container-low p-8 rounded-[2rem] w-full max-w-md border border-glass-stroke shadow-2xl">
                        <h3 className="text-xl font-extrabold text-white mb-2">Tạo nhóm chi tiêu mới</h3>
                        <p className="text-xs text-on-surface-variant mb-6">Tạo nhóm để quản lý chi tiêu chung cho phòng trọ, gia đình hoặc chuyến du lịch.</p>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-on-surface-variant uppercase">Tên nhóm</label>
                                <input
                                    className="w-full bg-surface-container border border-glass-stroke rounded-xl px-4 py-3 text-white mt-1 focus:outline-none focus:border-electric-blue text-sm"
                                    placeholder="Ví dụ: Trip to Da Lat, Nhà Trọ 302..."
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button onClick={() => setShowCreateGroupModal(false)} className="flex-1 py-3 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 text-xs">Hủy</button>
                                <button onClick={handleCreateGroup} className="flex-1 py-3 rounded-xl bg-electric-blue text-white font-bold hover:bg-electric-blue/80 shadow-lg text-xs">Tạo ngay</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================================================
                MODAL 2: THÊM THÀNH VIÊN
            ========================================================================= */}
            {showAddMemberModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="glass-panel bg-surface-container-low p-8 rounded-[2rem] w-full max-w-md border border-glass-stroke shadow-2xl">
                        <h3 className="text-xl font-extrabold text-white mb-2">Thêm thành viên vào {activeGroup?.name}</h3>
                        <p className="text-xs text-on-surface-variant mb-6">Nhập Email hoặc Username của người dùng bạn muốn thêm.</p>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-on-surface-variant uppercase">Email hoặc Username</label>
                                <input
                                    className="w-full bg-surface-container border border-glass-stroke rounded-xl px-4 py-3 text-white mt-1 focus:outline-none focus:border-electric-blue text-sm"
                                    placeholder="name@gmail.com hoặc username"
                                    value={memberIdentifier}
                                    onChange={(e) => setMemberIdentifier(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button onClick={() => setShowAddMemberModal(false)} className="flex-1 py-3 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 text-xs">Hủy</button>
                                <button onClick={handleAddMember} className="flex-1 py-3 rounded-xl bg-soft-emerald text-white font-bold hover:bg-soft-emerald/80 shadow-lg text-xs">Thêm thành viên</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================================================
                MODAL 3: THÊM GIAO DỊCH NHÓM & CHIA TIỀN
            ========================================================================= */}
            {showAddTxModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="glass-panel bg-surface-container-low p-8 rounded-[2rem] w-full max-w-md border border-glass-stroke shadow-2xl">
                        <h3 className="text-xl font-extrabold text-white mb-2">Thêm giao dịch nhóm</h3>
                        <p className="text-xs text-on-surface-variant mb-6">Hệ thống sẽ tự động tính toán và chia đều cho tất cả thành viên trong nhóm.</p>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-on-surface-variant uppercase">Số tiền chi tiêu (VNĐ)</label>
                                <input
                                    type="number"
                                    className="w-full bg-surface-container border border-glass-stroke rounded-xl px-4 py-3 text-white font-extrabold text-lg mt-1 focus:outline-none focus:border-electric-blue"
                                    placeholder="500000"
                                    value={newTx.amount}
                                    onChange={(e) => setNewTx({...newTx, amount: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-on-surface-variant uppercase">Mô tả chi tiêu</label>
                                <input
                                    className="w-full bg-surface-container border border-glass-stroke rounded-xl px-4 py-3 text-white mt-1 focus:outline-none focus:border-electric-blue text-sm"
                                    placeholder="Ăn hải sản, tiền phòng, mua sắm chung..."
                                    value={newTx.description}
                                    onChange={(e) => setNewTx({...newTx, description: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-on-surface-variant uppercase">Ngày chi tiêu</label>
                                <input
                                    type="date"
                                    className="w-full bg-surface-container border border-glass-stroke rounded-xl px-4 py-3 text-white mt-1 focus:outline-none focus:border-electric-blue text-sm"
                                    value={newTx.transactionDate}
                                    onChange={(e) => setNewTx({...newTx, transactionDate: e.target.value})}
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button onClick={() => setShowAddTxModal(false)} className="flex-1 py-3 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 text-xs">Hủy</button>
                                <button onClick={handleCreateGroupTx} className="flex-1 py-3 rounded-xl bg-electric-blue text-white font-bold hover:bg-electric-blue/80 shadow-lg text-xs">Lưu giao dịch</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================================================
                MODAL 4: CHI TIẾT GIAO DỊCH & BÌNH LUẬN GIAO DỊCH
            ========================================================================= */}
            {selectedTxDetail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="glass-panel bg-surface-container-low p-8 rounded-[2rem] w-full max-w-lg border border-glass-stroke shadow-2xl max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-extrabold text-white">{selectedTxDetail.description}</h3>
                                <p className="text-xs text-on-surface-variant">
                                    Người thanh toán: <span className="text-soft-emerald font-bold">{selectedTxDetail.payerName}</span> • ₫ {(selectedTxDetail.amount || 0).toLocaleString('vi-VN')}
                                </p>
                            </div>
                            <button onClick={() => setSelectedTxDetail(null)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20">
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>

                        {/* Phân chia nợ */}
                        <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-glass-stroke">
                            <p className="text-xs uppercase font-bold text-on-surface-variant mb-3">Danh sách phần chia tiền:</p>
                            <div className="space-y-2 max-h-32 overflow-y-auto pr-1 hide-scroll">
                                {selectedTxDetail.splits?.map((s, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-xs">
                                        <span className="text-white font-medium">{s.fullName || s.username}</span>
                                        <span className={`font-bold ${s.isSettled ? 'text-soft-emerald' : 'text-amber-300'}`}>
                                            ₫ {(s.owedAmount || 0).toLocaleString('vi-VN')} {s.isSettled ? '(Đã thanh toán)' : '(Chưa trả)'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Bình luận của giao dịch này */}
                        <p className="text-xs uppercase font-bold text-on-surface-variant mb-2">Trao đổi khoản chi ({selectedTxDetail.comments?.length || 0}):</p>
                        <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1 min-h-[100px] max-h-[200px] hide-scroll">
                            {selectedTxDetail.comments?.length > 0 ? selectedTxDetail.comments.map(c => (
                                <div key={c.id} className="p-3 rounded-xl bg-surface-container text-xs">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold text-electric-blue">{c.userName}</span>
                                        <span className="text-[10px] text-on-surface-variant">{formatTimeAgo(c.createdAt)}</span>
                                    </div>
                                    <p className="text-white">{c.content}</p>
                                </div>
                            )) : (
                                <p className="text-xs text-on-surface-variant italic">Chưa có bình luận nào cho khoản chi này.</p>
                            )}
                        </div>

                        {/* Nhập bình luận */}
                        <div className="flex gap-2">
                            <input
                                className="flex-1 bg-surface-container border border-glass-stroke rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-electric-blue"
                                placeholder="Viết bình luận cho khoản chi..."
                                value={txCommentInput}
                                onChange={(e) => setTxCommentInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendTxComment()}
                            />
                            <button
                                onClick={handleSendTxComment}
                                className="px-4 py-2.5 rounded-xl bg-electric-blue text-white font-bold text-xs hover:bg-electric-blue/80"
                            >
                                Gửi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GroupDashboardView;