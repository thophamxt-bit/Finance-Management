import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { formatAvatarUrl } from './MyQRCodeModal';

const PRESET_TAGS = [
    {
        label: '🚫 Không cần thiết',
        text: 'Khoản chi này tôi thấy không thực sự cần thiết, nhóm nên cân nhắc cắt giảm!',
        badgeClass: 'bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200'
    },
    {
        label: '💸 Hơi đắt',
        text: 'Chi phí này hơi cao so với thông thường, lần sau nhóm nên tìm lựa chọn hợp lý hơn!',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200'
    },
    {
        label: '🧾 Cần hóa đơn',
        text: 'Nhờ người chi gửi kèm ảnh hóa đơn hoặc biên lai chi tiết để nhóm đối soát nhé!',
        badgeClass: 'bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-200'
    },
    {
        label: '👍 Rất hợp lý',
        text: 'Khoản chi này rất hợp lý và cần thiết cho cả nhóm, đồng ý duyệt!',
        badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200'
    },
    {
        label: '❓ Cần giải trình',
        text: 'Khoản chi này bao gồm những mục nào vậy, nhờ người chi giải thích thêm chi tiết nhé!',
        badgeClass: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200'
    }
];

const TransactionCommentModal = ({
    isOpen,
    onClose,
    transaction,
    profileData,
    onCommentAdded,
    onEdit,
    onDelete
}) => {
    const [commentText, setCommentText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [localComments, setLocalComments] = useState([]);
    const [showSplits, setShowSplits] = useState(true);
    const commentsEndRef = useRef(null);

    useEffect(() => {
        if (transaction && transaction.comments) {
            setLocalComments(transaction.comments);
        } else {
            setLocalComments([]);
        }
    }, [transaction]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 150);
        }
    }, [isOpen, localComments]);

    if (!isOpen || !transaction) return null;

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
            .format(amount || 0)
            .replace('₫', 'VND');
    };

    const handleSendComment = async (contentToSend) => {
        const text = (contentToSend || commentText).trim();
        if (!text) return;

        setSubmitting(true);
        try {
            const token = localStorage.getItem("token");
            const res = await axios.post(
                `http://localhost:8080/api/groups/transactions/${transaction.id}/comments`,
                {
                    groupTransactionId: transaction.id,
                    content: text
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            // Thêm bình luận mới vào danh sách local ngay lập tức
            const newComment = {
                id: res.data?.commentId || Date.now(),
                groupTransactionId: transaction.id,
                userId: profileData?.id,
                userName: res.data?.userName || profileData?.fullName || profileData?.username || 'Bạn',
                userAvatar: profileData?.avatarUrl,
                content: text,
                createdAt: new Date().toISOString()
            };

            setLocalComments(prev => [...prev, newComment]);
            setCommentText('');

            // Báo cho component cha cập nhật lại dữ liệu
            if (onCommentAdded) {
                onCommentAdded();
            }
        } catch (err) {
            alert(err.response?.data?.message || "Lỗi khi gửi bình luận góp ý!");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSelectTag = (tag) => {
        setCommentText(tag.text);
    };

    const isSelfComment = (c) => {
        if (profileData?.id && c.userId && profileData.id === c.userId) return true;
        if (profileData?.username && c.userName === profileData.username) return true;
        if (profileData?.fullName && c.userName === profileData.fullName) return true;
        return false;
    };

    // Kiểm tra xem bình luận có thuộc tag nào không
    const getCommentTagType = (content) => {
        if (!content) return null;
        const lower = content.toLowerCase();
        if (lower.includes('không cần thiết') || lower.includes('cắt giảm')) {
            return { label: '🚫 Không cần thiết', color: 'bg-rose-100 text-rose-700 border-rose-300' };
        }
        if (lower.includes('hơi đắt') || lower.includes('hơi cao')) {
            return { label: '💸 Hơi đắt', color: 'bg-amber-100 text-amber-800 border-amber-300' };
        }
        if (lower.includes('hóa đơn') || lower.includes('biên lai')) {
            return { label: '🧾 Cần hóa đơn', color: 'bg-sky-100 text-sky-700 border-sky-300' };
        }
        if (lower.includes('hợp lý') || lower.includes('đồng ý duyệt')) {
            return { label: '👍 Hợp lý', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' };
        }
        if (lower.includes('giải trình') || lower.includes('giải thích')) {
            return { label: '❓ Cần giải trình', color: 'bg-purple-100 text-purple-700 border-purple-300' };
        }
        return null;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
                
                {/* Header Modal */}
                <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300">
                            <span className="material-symbols-outlined text-2xl">rate_review</span>
                        </div>
                        <div>
                            <h3 className="font-headline font-bold text-base md:text-lg text-white">
                                Chi tiết & Góp ý Giao dịch
                            </h3>
                            <p className="text-xs text-slate-300">
                                Trao đổi và đánh giá sự cần thiết của khoản chi này
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {onEdit && (
                            <button
                                type="button"
                                onClick={() => onEdit(transaction)}
                                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-200 hover:text-white border border-amber-400/30 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Chỉnh sửa khoản chi này"
                            >
                                <span className="material-symbols-outlined text-sm">edit</span>
                                <span className="hidden sm:inline">Sửa</span>
                            </button>
                        )}
                        {onDelete && (
                            <button
                                type="button"
                                onClick={() => onDelete(transaction)}
                                className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-400/30 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Xoá khoản chi này"
                            >
                                <span className="material-symbols-outlined text-sm">delete</span>
                                <span className="hidden sm:inline">Xoá</span>
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>
                </div>

                {/* Body: Cuộn được */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    
                    {/* Thẻ tóm tắt khoản chi */}
                    <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-2xl p-5 border border-slate-200/80 shadow-sm">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200/70 pb-4">
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/70 px-2.5 py-1 rounded-full inline-block mb-1.5">
                                    Khoản chi tiêu nhóm
                                </span>
                                <h4 className="text-lg font-bold text-slate-900">
                                    {transaction.description || 'Không có mô tả'}
                                </h4>
                                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-xs text-slate-400">calendar_today</span>
                                    <span>{new Date(transaction.transactionDate).toLocaleDateString('vi-VN')}</span>
                                    <span>•</span>
                                    <span className="material-symbols-outlined text-xs text-slate-400">person</span>
                                    <span>Người chi: <strong className="text-slate-700">{transaction.payerName}</strong></span>
                                </p>
                            </div>
                            <div className="text-left sm:text-right">
                                <span className="text-xs text-slate-400 block font-medium">Tổng tiền</span>
                                <span className="text-2xl font-extrabold text-blue-950 font-headline">
                                    {formatMoney(transaction.amount)}
                                </span>
                            </div>
                        </div>

                        {/* Danh sách chia tiền (Splits) */}
                        <div className="pt-3">
                            <button
                                onClick={() => setShowSplits(!showSplits)}
                                className="text-xs font-bold text-blue-800 hover:text-blue-950 flex items-center gap-1"
                            >
                                <span>Phần chia các thành viên ({transaction.splits?.length || 0})</span>
                                <span className="material-symbols-outlined text-sm">
                                    {showSplits ? 'expand_less' : 'expand_more'}
                                </span>
                            </button>

                            {showSplits && transaction.splits && (
                                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {transaction.splits.map((s, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200/80 text-xs"
                                        >
                                            <span className="font-semibold text-slate-700 truncate max-w-[120px]">
                                                {s.fullName || s.username}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-900">
                                                    {formatMoney(s.owedAmount)}
                                                </span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                                    s.isSettled
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-rose-100 text-rose-700'
                                                }`}>
                                                    {s.isSettled ? 'Đã trả' : 'Chưa trả'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bộ gợi ý góp ý nhanh (Quick Tags) */}
                    <div>
                        <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm text-blue-700">bolt</span>
                            <span>Gợi ý góp ý nhanh (Bấm để điền mẫu):</span>
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {PRESET_TAGS.map((tag, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleSelectTag(tag)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all active:scale-95 shadow-sm ${tag.badgeClass}`}
                                >
                                    {tag.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Danh sách bình luận / Góp ý */}
                    <div>
                        <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
                            <h5 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <span className="material-symbols-outlined text-base text-blue-800">forum</span>
                                <span>Góp ý & Nhận xét ({localComments.length})</span>
                            </h5>
                            <span className="text-[11px] text-slate-400">Được đồng bộ lên Bảng chung của nhóm</span>
                        </div>

                        <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                            {localComments.length > 0 ? (
                                localComments.map((c, idx) => {
                                    const self = isSelfComment(c);
                                    const tagInfo = getCommentTagType(c.content);
                                    return (
                                        <div
                                            key={c.id || idx}
                                            className={`flex gap-3 items-start ${
                                                self ? 'flex-row-reverse' : ''
                                            }`}
                                        >
                                            {/* Avatar */}
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-sm overflow-hidden ${
                                                self ? 'bg-blue-900 text-white' : 'bg-slate-200 text-slate-700'
                                            }`}>
                                                {(c.userAvatar || (self && profileData?.avatarUrl)) ? (
                                                    <img
                                                        src={formatAvatarUrl(c.userAvatar || profileData?.avatarUrl)}
                                                        alt={c.userName || 'Avatar'}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    (c.userName || 'U').charAt(0).toUpperCase()
                                                )}
                                            </div>

                                            {/* Content Bubble */}
                                            <div className={`max-w-[85%] flex flex-col ${self ? 'items-end' : 'items-start'}`}>
                                                <div className={`flex items-baseline gap-2 mb-1 ${self ? 'flex-row-reverse' : ''}`}>
                                                    <span className="font-bold text-xs text-slate-700">
                                                        {self ? 'Bạn' : c.userName}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        {c.createdAt ? new Date(c.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                                                    </span>
                                                </div>

                                                {/* Tag badge nếu có */}
                                                {tagInfo && (
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border mb-1 inline-block ${tagInfo.color}`}>
                                                        {tagInfo.label}
                                                    </span>
                                                )}

                                                <div className={`p-3 rounded-2xl text-xs sm:text-sm font-body shadow-sm leading-relaxed ${
                                                    self
                                                        ? 'bg-blue-900 text-white rounded-tr-none'
                                                        : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200/80'
                                                }`}>
                                                    {c.content}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    <span className="material-symbols-outlined text-3xl text-slate-300">chat</span>
                                    <p className="text-xs text-slate-400 mt-1 font-medium">
                                        Chưa có góp ý nào cho khoản chi này.
                                    </p>
                                    <p className="text-[11px] text-slate-400">
                                        Hãy gửi nhận xét nếu bạn thấy khoản chi này không hợp lý hoặc cần giải trình!
                                    </p>
                                </div>
                            )}
                            <div ref={commentsEndRef} />
                        </div>
                    </div>

                </div>

                {/* Footer: Input Form */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSendComment();
                        }}
                        className="flex flex-col gap-2"
                    >
                        <div className="flex items-end gap-2">
                            <textarea
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendComment();
                                    }
                                }}
                                rows={2}
                                placeholder="Viết góp ý của bạn về khoản chi này (ấn Enter để gửi)..."
                                className="flex-1 bg-white border border-slate-300 rounded-2xl p-3 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 resize-none shadow-sm"
                            />
                            <button
                                type="submit"
                                disabled={submitting || !commentText.trim()}
                                className="h-11 px-5 bg-blue-900 hover:bg-blue-800 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shrink-0 shadow-md active:scale-95"
                            >
                                <span className="material-symbols-outlined text-base">send</span>
                                <span>{submitting ? 'Đang gửi...' : 'Gửi góp ý'}</span>
                            </button>
                        </div>
                        <div className="flex justify-between items-center px-1">
                            <span className="text-[10px] text-slate-400">
                                Góp ý sẽ được gửi và hiển thị đồng thời tại đây và trên bảng chat chung của nhóm.
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                                {commentText.length}/500
                            </span>
                        </div>
                    </form>
                </div>

            </div>
        </div>
    );
};

export default TransactionCommentModal;