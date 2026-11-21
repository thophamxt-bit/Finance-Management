import React, { useState, useEffect } from 'react';
import axios from 'axios';

const EditGroupTransactionModal = ({
    isOpen,
    onClose,
    transaction,
    group,
    onSaved,
    onDeleted
}) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [transactionDate, setTransactionDate] = useState('');
    const [payerId, setPayerId] = useState('');
    const [splitType, setSplitType] = useState('EQUAL');
    const [membersSelection, setMembersSelection] = useState([]);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (!isOpen || !transaction) return;

        setDescription(transaction.description || '');
        setAmount(transaction.amount != null ? String(transaction.amount) : '');
        const rawDate = transaction.transactionDate
            ? String(transaction.transactionDate).slice(0, 10)
            : new Date().toISOString().slice(0, 10);
        setTransactionDate(rawDate);
        setPayerId(transaction.payerId ? String(transaction.payerId) : '');
        setSplitType(transaction.splitType === 'EXACT' ? 'EXACT' : 'EQUAL');

        const existingSplits = Array.isArray(transaction.splits) ? transaction.splits : [];
        const groupMembers = Array.isArray(group?.members) ? group.members : [];

        if (groupMembers.length > 0) {
            const mapped = groupMembers.map((m) => {
                const foundSplit = existingSplits.find(
                    (s) => Number(s.userId) === Number(m.userId)
                );
                return {
                    userId: m.userId,
                    fullName: m.fullName || m.username,
                    username: m.username,
                    checked: existingSplits.length > 0 ? !!foundSplit : true,
                    customAmount: foundSplit ? String(foundSplit.owedAmount ?? '') : '',
                    isSettled: foundSplit ? !!foundSplit.isSettled : false
                };
            });
            setMembersSelection(mapped);
            if (!transaction.payerId && mapped.length > 0) {
                setPayerId(String(mapped[0].userId));
            }
        } else if (existingSplits.length > 0) {
            const mapped = existingSplits.map((s) => ({
                userId: s.userId,
                fullName: s.fullName || s.username,
                username: s.username,
                checked: true,
                customAmount: String(s.owedAmount ?? ''),
                isSettled: !!s.isSettled
            }));
            setMembersSelection(mapped);
        } else {
            setMembersSelection([]);
        }
    }, [isOpen, transaction, group]);

    if (!isOpen || !transaction) return null;

    const groupId = group?.id || transaction.groupId;
    const numAmount = parseFloat(amount) || 0;
    const selectedMembers = membersSelection.filter((m) => m.checked);
    const selectedCount = selectedMembers.length;
    const splitPerPerson = selectedCount > 0 ? Math.floor(numAmount / selectedCount) : 0;
    const exactTotal = selectedMembers.reduce(
        (sum, m) => sum + (parseFloat(m.customAmount) || 0),
        0
    );

    const formatMoney = (val) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
            .format(val || 0)
            .replace('₫', 'VND');

    const handleToggleMember = (userId) => {
        setMembersSelection((prev) =>
            prev.map((m) => (m.userId === userId ? { ...m, checked: !m.checked } : m))
        );
    };

    const handleCustomAmountChange = (userId, val) => {
        setMembersSelection((prev) =>
            prev.map((m) => (m.userId === userId ? { ...m, customAmount: val } : m))
        );
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!description.trim()) return alert('Vui lòng nhập mô tả khoản chi tiêu!');
        if (!numAmount || numAmount <= 0) return alert('Số tiền phải lớn hơn 0!');
        if (membersSelection.length > 0 && selectedCount === 0) {
            return alert('Vui lòng chọn ít nhất 1 thành viên tham gia chia tiền!');
        }

        const parsedPayerId = payerId ? parseInt(payerId, 10) : transaction.payerId;
        let splitsPayload = [];

        if (selectedCount > 0) {
            if (splitType === 'EQUAL') {
                const baseShare = Math.floor(numAmount / selectedCount);
                const remainder = Math.round(numAmount - baseShare * selectedCount);
                splitsPayload = selectedMembers.map((m, idx) => ({
                    userId: m.userId,
                    owedAmount: idx === 0 ? baseShare + remainder : baseShare,
                    isSettled: Number(m.userId) === Number(parsedPayerId) ? true : m.isSettled
                }));
            } else {
                splitsPayload = selectedMembers.map((m) => ({
                    userId: m.userId,
                    owedAmount: parseFloat(m.customAmount) || 0,
                    isSettled: Number(m.userId) === Number(parsedPayerId) ? true : m.isSettled
                }));
            }
        }

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            await axios.put(
                `http://localhost:8080/api/groups/${groupId}/transactions/${transaction.id}`,
                {
                    groupId: Number(groupId),
                    payerId: parsedPayerId ? Number(parsedPayerId) : null,
                    amount: numAmount,
                    description: description.trim(),
                    transactionDate,
                    splitType,
                    splits: splitsPayload
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            if (onSaved) await onSaved();
            onClose();
        } catch (err) {
            alert(err.response?.data?.message || 'Lỗi khi cập nhật khoản chi tiêu nhóm!');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        const confirmed = window.confirm(
            `Bạn có chắc chắn muốn xoá khoản chi "${transaction.description}" (${formatMoney(transaction.amount)}) không?\nTất cả phần chia nợ và bình luận của khoản chi này sẽ bị xoá.`
        );
        if (!confirmed) return;

        setDeleting(true);
        try {
            const token = localStorage.getItem('token');
            await axios.delete(
                `http://localhost:8080/api/groups/${groupId}/transactions/${transaction.id}`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            if (onDeleted) await onDeleted(transaction.id);
            onClose();
        } catch (err) {
            alert(err.response?.data?.message || 'Lỗi khi xoá khoản chi tiêu nhóm!');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 bg-blue-950 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                            <span className="material-symbols-outlined text-2xl">edit_note</span>
                        </div>
                        <div>
                            <h3 className="font-headline font-bold text-base md:text-lg text-white">
                                Chỉnh sửa khoản chi tiêu nhóm
                            </h3>
                            <p className="text-xs text-slate-300">
                                Điều chỉnh mô tả, số tiền hoặc cách chia khi nhóm đang thảo luận
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                            Tên / Mô tả khoản chi
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ví dụ: Dự kiến tiền khách sạn Đà Lạt, Ăn lẩu..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                Số tiền (VNĐ)
                            </label>
                            <input
                                type="number"
                                min="1"
                                step="any"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-base font-black text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-900"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                Ngày dự kiến / Ngày chi
                            </label>
                            <input
                                type="date"
                                value={transactionDate}
                                onChange={(e) => setTransactionDate(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
                                required
                            />
                        </div>
                    </div>

                    {membersSelection.length > 0 && (
                        <>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                    Người thanh toán
                                </label>
                                <select
                                    value={payerId}
                                    onChange={(e) => setPayerId(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
                                >
                                    {membersSelection.map((m) => (
                                        <option key={m.userId} value={m.userId}>
                                            {m.fullName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                    Hình thức chia tiền
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSplitType('EQUAL')}
                                        className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                            splitType === 'EQUAL'
                                                ? 'bg-blue-900 text-white border-blue-900 shadow-sm'
                                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        Chia đều ({selectedCount} người)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSplitType('EXACT')}
                                        className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                            splitType === 'EXACT'
                                                ? 'bg-blue-900 text-white border-blue-900 shadow-sm'
                                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        Chia số tiền cụ thể
                                    </button>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Thành viên tham gia
                                    </label>
                                    {splitType === 'EQUAL' && selectedCount > 0 && (
                                        <span className="text-[11px] font-bold text-emerald-700">
                                            ~{formatMoney(splitPerPerson)} / người
                                        </span>
                                    )}
                                    {splitType === 'EXACT' && (
                                        <span
                                            className={`text-[11px] font-bold ${
                                                Math.abs(exactTotal - numAmount) < 1
                                                    ? 'text-emerald-700'
                                                    : 'text-amber-700'
                                            }`}
                                        >
                                            Đã nhập: {formatMoney(exactTotal)} / {formatMoney(numAmount)}
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                    {membersSelection.map((m) => (
                                        <div
                                            key={m.userId}
                                            className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80"
                                        >
                                            <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                                                <input
                                                    type="checkbox"
                                                    checked={m.checked}
                                                    onChange={() => handleToggleMember(m.userId)}
                                                    className="w-4 h-4 accent-blue-900 rounded"
                                                />
                                                <span className="text-xs font-bold text-slate-800 truncate">
                                                    {m.fullName}
                                                </span>
                                            </label>

                                            {m.checked && splitType === 'EQUAL' && (
                                                <span className="text-xs font-bold text-blue-900 shrink-0">
                                                    {formatMoney(splitPerPerson)}
                                                </span>
                                            )}

                                            {m.checked && splitType === 'EXACT' && (
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    value={m.customAmount}
                                                    onChange={(e) =>
                                                        handleCustomAmountChange(m.userId, e.target.value)
                                                    }
                                                    placeholder="Số tiền"
                                                    className="w-28 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-right text-slate-800"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Action Footer */}
                    <div className="pt-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={deleting || saving}
                            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-base">delete</span>
                            <span>{deleting ? 'Đang xoá...' : 'Xoá khoản chi'}</span>
                        </button>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={saving || deleting}
                                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                disabled={saving || deleting}
                                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-base">save</span>
                                <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditGroupTransactionModal;
