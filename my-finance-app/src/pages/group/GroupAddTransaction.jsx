import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import GroupSidebar from '../../components/group/GroupSidebar';

const GroupAddTransaction = () => {
    const navigate = useNavigate();
    const [profileData, setProfileData] = useState({ fullName: '', email: '', username: '' });
    const [groups, setGroups] = useState([]);
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [loading, setLoading] = useState(false);

    // Form data
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
    const [payerId, setPayerId] = useState('');
    const [splitType, setSplitType] = useState('EQUAL'); // 'EQUAL', 'EXACT'

    // Thành viên tham gia chia tiền: Array of { userId, fullName, username, checked, customAmount }
    const [membersSelection, setMembersSelection] = useState([]);

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
                    userId: profRes.data.id,
                    avatarUrl: profRes.data.avatarUrl || ''
                });

                if (grpRes.data && Array.isArray(grpRes.data) && grpRes.data.length > 0) {
                    setGroups(grpRes.data);
                    setSelectedGroupId(grpRes.data[0].id);
                }
            } catch (err) {
                console.error("Lỗi tải thông tin:", err);
            }
        };
        initData();
    }, [navigate]);

    // Khi đổi nhóm, cập nhật danh sách thành viên
    useEffect(() => {
        if (!selectedGroupId) return;
        const currentGroup = groups.find(g => g.id === parseInt(selectedGroupId));
        if (currentGroup && currentGroup.members) {
            const members = currentGroup.members.map(m => ({
                userId: m.userId,
                fullName: m.fullName || m.username,
                username: m.username,
                checked: true,
                customAmount: ''
            }));
            setMembersSelection(members);

            // Mặc định người trả là người đang đăng nhập nếu có trong nhóm, hoặc người đầu tiên
            const myMember = members.find(m => m.username === profileData.username);
            if (myMember) {
                setPayerId(myMember.userId);
            } else if (members.length > 0) {
                setPayerId(members[0].userId);
            }
        }
    }, [selectedGroupId, groups, profileData.username]);

    // Tính toán số tiền mỗi người khi chia đều
    const selectedCount = membersSelection.filter(m => m.checked).length;
    const numAmount = parseFloat(amount) || 0;
    const splitPerPerson = selectedCount > 0 ? Math.round(numAmount / selectedCount) : 0;

    const handleToggleMember = (userId) => {
        setMembersSelection(prev =>
            prev.map(m => m.userId === userId ? { ...m, checked: !m.checked } : m)
        );
    };

    const handleCustomAmountChange = (userId, val) => {
        setMembersSelection(prev =>
            prev.map(m => m.userId === userId ? { ...m, customAmount: val } : m)
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedGroupId) return alert("Vui lòng chọn nhóm chi tiêu!");
        if (!numAmount || numAmount <= 0) return alert("Vui lòng nhập số tiền chi tiêu lớn hơn 0!");
        if (!description.trim()) return alert("Vui lòng nhập mô tả hóa đơn!");
        if (selectedCount === 0) return alert("Vui lòng chọn ít nhất 1 thành viên tham gia chia tiền!");

        setLoading(true);
        try {
            const token = localStorage.getItem("token");

            // Tạo danh sách splits
            let splitsPayload = [];
            if (splitType === 'EQUAL') {
                splitsPayload = membersSelection
                    .filter(m => m.checked)
                    .map(m => ({
                        userId: m.userId,
                        owedAmount: splitPerPerson,
                        isSettled: m.userId === parseInt(payerId)
                    }));
            } else {
                // EXACT
                splitsPayload = membersSelection
                    .filter(m => m.checked)
                    .map(m => ({
                        userId: m.userId,
                        owedAmount: parseFloat(m.customAmount) || 0,
                        isSettled: m.userId === parseInt(payerId)
                    }));
            }

            await axios.post(`http://localhost:8080/api/groups/${selectedGroupId}/transactions`, {
                groupId: parseInt(selectedGroupId),
                amount: numAmount,
                description: description.trim(),
                transactionDate: transactionDate,
                splitType: splitType,
                payerId: payerId ? parseInt(payerId) : null,
                splits: splitsPayload
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert("Đã tạo hóa đơn nhóm và chia tiền thành công!");
            navigate('/group/activity');
        } catch (err) {
            alert(err.response?.data?.message || "Lỗi tạo hóa đơn nhóm!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen overflow-hidden text-slate-800 bg-slate-50 font-body">
            <GroupSidebar profileData={profileData} />

            <main className="flex-1 flex flex-col md:ml-64 relative overflow-hidden bg-slate-50">
                <header className="flex justify-between items-center w-full px-6 py-4 bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                    <div>
                        <h2 className="text-xl font-extrabold text-blue-950 font-headline">Thêm hóa đơn chi tiêu nhóm</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Tạo chi phí và tự động chia tiền cho các thành viên trong nhóm</p>
                    </div>

                    <button
                        onClick={() => navigate('/group')}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5"
                    >
                        <span className="material-symbols-outlined text-base">close</span>
                        <span>Đóng</span>
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-2xl mx-auto pb-16">
                        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">

                            {/* Chọn Nhóm */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                    1. Chọn nhóm chi tiêu
                                </label>
                                {groups.length > 0 ? (
                                    <select
                                        value={selectedGroupId}
                                        onChange={(e) => setSelectedGroupId(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-900"
                                    >
                                        {groups.map(g => (
                                            <option key={g.id} value={g.id}>{g.name} ({g.members?.length || 0} thành viên)</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="p-4 bg-amber-50 text-amber-800 rounded-2xl text-xs border border-amber-200">
                                        Bạn chưa có nhóm nào. Hãy sang <b onClick={() => navigate('/group')} className="underline cursor-pointer">Group Dashboard</b> để tạo nhóm trước!
                                    </div>
                                )}
                            </div>

                            {/* Số tiền & Mô tả */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                        2. Số tiền (VNĐ)
                                    </label>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-lg font-black text-blue-950 focus:ring-2 focus:ring-blue-900"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                        3. Ngày chi tiêu
                                    </label>
                                    <input
                                        type="date"
                                        value={transactionDate}
                                        onChange={(e) => setTransactionDate(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-900"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                    4. Mô tả chi tiêu
                                </label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Ví dụ: Tiền phòng khách sạn Đà Lạt, Ăn lẩu gà lá é..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-900"
                                    required
                                />
                            </div>

                            {/* Người đã thanh toán */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                    5. Người đã trả tiền trước
                                </label>
                                <select
                                    value={payerId}
                                    onChange={(e) => setPayerId(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-900"
                                >
                                    {membersSelection.map(m => (
                                        <option key={m.userId} value={m.userId}>
                                            {m.fullName} {m.username === profileData.username ? '(Bạn)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Cách thức chia tiền */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                    6. Phương thức chia tiền
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setSplitType('EQUAL')}
                                        className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                                            splitType === 'EQUAL'
                                                ? 'bg-blue-900 text-white border-blue-900 shadow-sm'
                                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-sm">equalizer</span>
                                        <span>Chia đều (EQUAL)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSplitType('EXACT')}
                                        className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                                            splitType === 'EXACT'
                                                ? 'bg-blue-900 text-white border-blue-900 shadow-sm'
                                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-sm">tune</span>
                                        <span>Chia theo số tiền cụ thể</span>
                                    </button>
                                </div>
                            </div>

                            {/* Danh sách thành viên tham gia */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        7. Thành viên tham gia chia ({selectedCount}/{membersSelection.length})
                                    </label>
                                    {splitType === 'EQUAL' && numAmount > 0 && selectedCount > 0 && (
                                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                            Mỗi người: {splitPerPerson.toLocaleString('vi-VN')} đ
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-200 max-h-60 overflow-y-auto">
                                    {membersSelection.map(m => (
                                        <div
                                            key={m.userId}
                                            className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200/80 hover:bg-blue-50/40 transition-all"
                                        >
                                            <label className="flex items-center gap-3 cursor-pointer select-none flex-1">
                                                <input
                                                    type="checkbox"
                                                    checked={m.checked}
                                                    onChange={() => handleToggleMember(m.userId)}
                                                    className="w-4 h-4 rounded text-blue-900 focus:ring-blue-900"
                                                />
                                                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center text-xs font-bold">
                                                    {m.fullName.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-xs font-bold text-slate-800">
                                                    {m.fullName} {m.username === profileData.username ? '(Bạn)' : ''}
                                                </span>
                                            </label>

                                            {m.checked && (
                                                <div>
                                                    {splitType === 'EQUAL' ? (
                                                        <span className="text-xs font-bold text-slate-700">
                                                            {splitPerPerson.toLocaleString('vi-VN')} đ
                                                        </span>
                                                    ) : (
                                                        <input
                                                            type="number"
                                                            value={m.customAmount}
                                                            onChange={(e) => handleCustomAmountChange(m.userId, e.target.value)}
                                                            placeholder="Số tiền"
                                                            className="w-28 p-1.5 text-xs font-bold text-right border border-slate-200 rounded-lg bg-slate-50"
                                                        />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Submit buttons */}
                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => navigate('/group')}
                                    className="flex-1 py-3.5 bg-slate-100 font-bold rounded-2xl text-slate-600 hover:bg-slate-200 transition-all text-sm"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 py-3.5 bg-blue-900 text-white font-bold rounded-2xl shadow-lg shadow-blue-900/25 hover:bg-blue-800 transition-all text-sm disabled:opacity-50"
                                >
                                    {loading ? 'Đang lưu...' : 'Lưu hóa đơn & Chia tiền'}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default GroupAddTransaction;