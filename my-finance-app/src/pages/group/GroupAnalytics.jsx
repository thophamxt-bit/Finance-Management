import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import GroupSidebar from '../../components/group/GroupSidebar';

// Bảng màu hiện đại cho các phân tích nhóm
const PALETTE = [
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#f97316', // Orange
    '#6366f1', // Indigo
    '#14b8a6', // Teal
    '#ef4444', // Red
    '#64748b'  // Slate
];

// Nhận diện thông minh danh mục chi tiêu theo mô tả
const detectCategory = (desc) => {
    if (!desc) return { name: 'Chi tiêu chung', icon: 'payments' };
    const d = desc.toLowerCase();
    if (d.includes('ăn') || d.includes('uống') || d.includes('lẩu') || d.includes('nướng') || d.includes('cơm') || d.includes('cafe') || d.includes('trà') || d.includes('nhậu') || d.includes('bún') || d.includes('phở')) {
        return { name: 'Ăn uống & Ẩm thực', icon: 'restaurant' };
    }
    if (d.includes('taxi') || d.includes('xe') || d.includes('grab') || d.includes('xăng') || d.includes('vé máy bay') || d.includes('tàu') || d.includes('vé tàu')) {
        return { name: 'Di chuyển & Vé xe', icon: 'directions_car' };
    }
    if (d.includes('khách sạn') || d.includes('hotel') || d.includes('phòng') || d.includes('homestay') || d.includes('resort') || d.includes('thuê nhà') || d.includes('trọ')) {
        return { name: 'Lưu trú & Phòng', icon: 'hotel' };
    }
    if (d.includes('chơi') || d.includes('vé tham quan') || d.includes('phim') || d.includes('bar') || d.includes('pub') || d.includes('karaoke') || d.includes('game')) {
        return { name: 'Vui chơi & Giải trí', icon: 'attractions' };
    }
    if (d.includes('mua') || d.includes('siêu thị') || d.includes('chợ') || d.includes('shop') || d.includes('đồ dùng')) {
        return { name: 'Mua sắm & Tạp hóa', icon: 'shopping_cart' };
    }
    return { name: 'Chi phí chung', icon: 'receipt_long' };
};

const GroupAnalytics = () => {
    const navigate = useNavigate();

    // --- State Dữ liệu Nhóm & Cá nhân ---
    const [profileData, setProfileData] = useState({ fullName: '', email: '', username: '' });
    const [groups, setGroups] = useState([]);
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [groupTransactions, setGroupTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- State Biểu đồ: 'PIE' | 'LINE' ---
    const [chartType, setChartType] = useState('PIE');
    const [hoveredCategory, setHoveredCategory] = useState(null);
    const [hoveredPoint, setHoveredPoint] = useState(null);

    // --- State AI Financial Advisor Nhóm ---
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState(null);

    // Khởi tạo thông tin
    useEffect(() => {
        const initData = async () => {
            const token = localStorage.getItem("token");
            if (!token) return navigate("/login");

            try {
                const [profRes, grpRes] = await Promise.all([
                    api.get("/api/auth/profile"),
                    api.get("/api/groups")
                ]);

                setProfileData({
                    id: profRes.data.id,
                    fullName: profRes.data.fullName || profRes.data.username || 'Người dùng',
                    email: profRes.data.email || '',
                    username: profRes.data.username,
                    avatarUrl: profRes.data.avatarUrl || ''
                });

                if (grpRes.data && Array.isArray(grpRes.data) && grpRes.data.length > 0) {
                    setGroups(grpRes.data);
                    setSelectedGroupId(grpRes.data[0].id);
                }
            } catch (err) {
                console.error("Lỗi tải thông tin:", err);
            } finally {
                setLoading(false);
            }
        };
        initData();
    }, [navigate]);

    // Tải giao dịch khi đổi nhóm
    useEffect(() => {
        if (!selectedGroupId) return;
        const fetchGroupTx = async () => {
            try {
                const res = await api.get(`/api/groups/${selectedGroupId}/transactions`);
                if (res.data && Array.isArray(res.data)) {
                    setGroupTransactions(res.data);
                } else {
                    setGroupTransactions([]);
                }
            } catch (err) {
                console.error("Lỗi tải giao dịch nhóm:", err);
            }
        };
        fetchGroupTx();
    }, [selectedGroupId]);

    const activeGroup = groups.find(g => g.id === parseInt(selectedGroupId));
    const currentFullName = profileData.fullName;
    const currentUsername = profileData.username;

    // --- TÍNH TOÁN CÁC CHỈ SỐ THỐNG KÊ & PHÂN BỔ DỰ TÍNH ---
    const {
        totalGroupExpense,
        youPaid,
        yourEstimatedShare,
        diff,
        memberAllocations,
        categoryBreakdown,
        dailyTrendData
    } = useMemo(() => {
        const total = groupTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        const members = activeGroup?.members || [];
        const memberCount = members.length || 1;

        // 1. Tính toán phân bổ cho từng thành viên
        const allocations = members.map(member => {
            const memName = member.fullName || member.username;
            let mPaid = 0;
            let mEstimated = 0;

            groupTransactions.forEach(tx => {
                const isPayer = tx.payerName === member.fullName || tx.payerName === member.username;
                if (isPayer) {
                    mPaid += parseFloat(tx.amount || 0);
                }

                if (tx.splits && Array.isArray(tx.splits) && tx.splits.length > 0) {
                    const mySplit = tx.splits.find(s => s.username === member.username || s.fullName === member.fullName || s.userId === member.id);
                    if (mySplit) {
                        mEstimated += parseFloat(mySplit.owedAmount || 0);
                    } else {
                        mEstimated += (parseFloat(tx.amount || 0) / memberCount);
                    }
                } else {
                    mEstimated += (parseFloat(tx.amount || 0) / memberCount);
                }
            });

            const mDiff = mPaid - mEstimated;
            return {
                ...member,
                displayName: memName,
                totalPaid: mPaid,
                estimatedShare: mEstimated,
                diff: mDiff,
                percentPaid: total > 0 ? Math.round((mPaid / total) * 100) : 0
            };
        }).sort((a, b) => b.totalPaid - a.totalPaid);

        // Tìm số liệu của chính người dùng
        const myInfo = allocations.find(m => m.username === currentUsername || m.fullName === currentFullName) || {
            totalPaid: 0,
            estimatedShare: 0,
            diff: 0
        };

        // 2. Cơ cấu danh mục chi tiêu nhóm (Category Breakdown)
        const catMap = {};
        groupTransactions.forEach(tx => {
            const amount = parseFloat(tx.amount || 0);
            const { name, icon } = detectCategory(tx.description);
            if (!catMap[name]) {
                catMap[name] = {
                    name,
                    icon,
                    amount: 0,
                    count: 0
                };
            }
            catMap[name].amount += amount;
            catMap[name].count += 1;
        });

        const catList = Object.values(catMap).map((cat, idx) => ({
            ...cat,
            color: PALETTE[idx % PALETTE.length],
            percent: total > 0 ? parseFloat(((cat.amount / total) * 100).toFixed(1)) : 0
        })).sort((a, b) => b.amount - a.amount);

        // 3. Xu hướng dòng tiền nhóm theo thời gian (Daily Trend Data)
        const dateMap = {};
        groupTransactions.forEach(tx => {
            const dateStr = tx.transactionDate ? tx.transactionDate.slice(0, 10) : new Date().toISOString().slice(0, 10);
            const amt = parseFloat(tx.amount || 0);
            if (!dateMap[dateStr]) {
                dateMap[dateStr] = {
                    dateStr,
                    expense: 0,
                    count: 0,
                    payerNames: new Set()
                };
            }
            dateMap[dateStr].expense += amt;
            dateMap[dateStr].count += 1;
            if (tx.payerName) dateMap[dateStr].payerNames.add(tx.payerName);
        });

        const sortedDates = Object.keys(dateMap).sort();
        let timelineData = [];

        if (sortedDates.length >= 2) {
            timelineData = sortedDates.map((dStr, idx) => ({
                day: idx + 1,
                dateStr: dStr,
                expense: dateMap[dStr].expense,
                count: dateMap[dStr].count,
                payers: Array.from(dateMap[dStr].payerNames).join(', ')
            }));
        } else if (sortedDates.length === 1) {
            const onlyDate = sortedDates[0];
            timelineData = [
                { day: 1, dateStr: 'Bắt đầu', expense: 0, count: 0, payers: '' },
                { day: 2, dateStr: onlyDate, expense: dateMap[onlyDate].expense, count: dateMap[onlyDate].count, payers: Array.from(dateMap[onlyDate].payerNames).join(', ') }
            ];
        } else {
            timelineData = [];
        }

        return {
            totalGroupExpense: total,
            youPaid: myInfo.totalPaid,
            yourEstimatedShare: myInfo.estimatedShare,
            diff: myInfo.diff,
            memberAllocations: allocations,
            categoryBreakdown: catList,
            dailyTrendData: timelineData
        };
    }, [groupTransactions, activeGroup, currentFullName, currentUsername]);

    // --- TỰ ĐỘNG CHẠY AI ĐÁNH GIÁ TÀI CHÍNH NHÓM ---
    const runAutoFinancialAnalysis = () => {
        setIsAnalyzing(true);
        setTimeout(() => {
            let score = 80;

            // 1. Đánh giá độ phân tán chi trả giữa các thành viên
            const topSpender = memberAllocations[0];
            if (topSpender && totalGroupExpense > 0) {
                if (topSpender.percentPaid > 75) score -= 20; // 1 người gánh hơn 75%
                else if (topSpender.percentPaid > 50) score -= 10;
                else score += 10; // Chi trả khá phân tán
            }

            // 2. Đánh giá sự tập trung vào 1 danh mục
            const topCategory = categoryBreakdown[0];
            if (topCategory && topCategory.percent > 60) {
                score -= 8;
            }

            // 3. Đánh giá số lượng hóa đơn
            if (groupTransactions.length >= 3) {
                score += 5;
            }

            score = Math.max(20, Math.min(98, Math.round(score)));

            let grade = { label: 'Khá cân bằng', color: 'text-blue-600', badge: 'bg-blue-50 text-blue-700 border-blue-200' };
            if (score >= 85) grade = { label: 'Rất cân bằng', color: 'text-emerald-600', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
            else if (score >= 70) grade = { label: 'Khá cân bằng', color: 'text-blue-600', badge: 'bg-blue-50 text-blue-700 border-blue-200' };
            else if (score >= 50) grade = { label: 'Cần cân đối thêm', color: 'text-amber-600', badge: 'bg-amber-50 text-amber-700 border-amber-200' };
            else grade = { label: 'Lệch chi tiêu lớn', color: 'text-rose-600', badge: 'bg-rose-50 text-rose-700 border-rose-200' };

            const assessments = [];
            const recommendations = [];

            // Đánh giá 1: Người chi trả nhiều nhất
            if (topSpender && topSpender.totalPaid > 0) {
                assessments.push({
                    type: 'info',
                    icon: 'person',
                    text: `Thành viên "${topSpender.displayName}" đang đứng ra chi trả nhiều nhất với ${formatMoney(topSpender.totalPaid)} (${topSpender.percentPaid}% tổng chi cả nhóm).`
                });
            }

            // Đánh giá 2: Danh mục tốn kém nhất
            if (topCategory) {
                assessments.push({
                    type: 'info',
                    icon: topCategory.icon,
                    text: `Danh mục "${topCategory.name}" chiếm phần lớn chi tiêu nhóm (${formatMoney(topCategory.amount)} - ${topCategory.percent}%).`
                });
            }

            // Đánh giá 3: Số tiền chia dự tính trung bình
            const avgShare = memberAllocations.length > 0 ? totalGroupExpense / memberAllocations.length : 0;
            assessments.push({
                type: 'success',
                icon: 'donut_large',
                text: `Mỗi thành viên trong nhóm có mức chia dự tính bình quân là ${formatMoney(avgShare)}.`
            });

            // Lời khuyên 1
            if (topSpender && topSpender.percentPaid > 50) {
                recommendations.push(`Nên để các thành viên khác đứng ra thanh toán các hóa đơn kế tiếp nhằm san sẻ dòng tiền thực tế.`);
            } else {
                recommendations.push(`Dòng tiền chi trả giữa các thành viên đang rất đồng đều, tiếp tục duy trì phương thức chia này.`);
            }

            // Lời khuyên 2
            if (topCategory) {
                recommendations.push(`Cân nhắc thỏa thuận ngân sách trần cho mục "${topCategory.name}" để kiểm soát tốt chi phí phát sinh.`);
            }

            // Lời khuyên 3
            recommendations.push(`Mọi thành viên có thể theo dõi "Chênh lệch dự tính" trên bảng điều khiển để chủ động cân bằng quỹ chung bất kỳ lúc nào.`);

            setAiAnalysis({
                score,
                grade,
                assessments,
                recommendations,
                updatedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            });
            setIsAnalyzing(false);
        }, 500);
    };

    useEffect(() => {
        if (!loading && groupTransactions.length > 0) {
            runAutoFinancialAnalysis();
        }
    }, [loading, selectedGroupId, groupTransactions.length]);

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
            .format(amount || 0)
            .replace('₫', 'VND');
    };

    // ==========================================
    // RENDER BIỂU ĐỒ TRÒN NHÓM (DONUT CHART)
    // ==========================================
    const renderPieChart = () => {
        if (categoryBreakdown.length === 0 || totalGroupExpense === 0) {
            return (
                <div className="h-[380px] flex flex-col items-center justify-center text-slate-400 gap-3">
                    <span className="material-symbols-outlined text-6xl text-slate-300">donut_large</span>
                    <p className="text-sm font-semibold">Chưa có hóa đơn chi tiêu nào trong nhóm để vẽ biểu đồ tròn.</p>
                </div>
            );
        }

        const cx = 160;
        const cy = 160;
        const outerR = 125;
        const innerR = 80;

        const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
            const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
            return {
                x: centerX + (radius * Math.cos(angleInRadians)),
                y: centerY + (radius * Math.sin(angleInRadians))
            };
        };

        const describeDonutSlice = (centerX, centerY, outR, inR, startAngle, endAngle) => {
            let actualEnd = endAngle;
            if (actualEnd - startAngle >= 359.99) actualEnd = startAngle + 359.99;
            const outerStart = polarToCartesian(centerX, centerY, outR, startAngle);
            const outerEnd = polarToCartesian(centerX, centerY, outR, actualEnd);
            const innerStart = polarToCartesian(centerX, centerY, inR, actualEnd);
            const innerEnd = polarToCartesian(centerX, centerY, inR, startAngle);
            const largeArcFlag = actualEnd - startAngle <= 180 ? "0" : "1";

            return [
                "M", outerStart.x, outerStart.y,
                "A", outR, outR, 0, largeArcFlag, 1, outerEnd.x, outerEnd.y,
                "L", innerStart.x, innerStart.y,
                "A", inR, inR, 0, largeArcFlag, 0, innerEnd.x, innerEnd.y,
                "Z"
            ].join(" ");
        };

        let currentAngle = 0;
        const slices = categoryBreakdown.map((cat) => {
            const sliceAngle = (cat.amount / totalGroupExpense) * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + sliceAngle;
            currentAngle = endAngle;
            const isHovered = hoveredCategory && hoveredCategory.name === cat.name;

            return {
                ...cat,
                path: describeDonutSlice(cx, cy, isHovered ? outerR + 6 : outerR, innerR, startAngle, endAngle),
                isHovered
            };
        });

        const activeDisplay = hoveredCategory || {
            name: 'Tổng chi cả nhóm',
            amount: totalGroupExpense,
            percent: 100,
            icon: 'account_balance_wallet'
        };

        return (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-4">
                {/* Vòng tròn SVG lớn */}
                <div className="lg:col-span-6 flex flex-col items-center justify-center relative">
                    <svg viewBox="0 0 320 320" className="w-full max-w-[320px] h-[320px] drop-shadow-md">
                        <defs>
                            <filter id="groupGlow" x="-20%" y="-20%" width="140%" height="140%">
                                <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.15" />
                            </filter>
                        </defs>
                        {slices.map((slice, i) => (
                            <path
                                key={i}
                                d={slice.path}
                                fill={slice.color}
                                className="transition-all duration-300 cursor-pointer hover:opacity-95"
                                style={{
                                    transformOrigin: `${cx}px ${cy}px`,
                                    filter: slice.isHovered ? 'url(#groupGlow)' : 'none'
                                }}
                                onMouseEnter={() => setHoveredCategory(slice)}
                                onMouseLeave={() => setHoveredCategory(null)}
                            />
                        ))}
                    </svg>

                    {/* Vùng thông tin trung tâm biểu đồ tròn */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                        <span className="material-symbols-outlined text-slate-400 text-2xl mb-0.5">
                            {activeDisplay.icon || 'pie_chart'}
                        </span>
                        <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 line-clamp-1 max-w-[130px]">
                            {activeDisplay.name}
                        </span>
                        <span className="text-xl font-black text-blue-950 tracking-tight">
                            {formatMoney(activeDisplay.amount)}
                        </span>
                        {activeDisplay.percent && activeDisplay.percent < 100 && (
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mt-1">
                                {activeDisplay.percent}%
                            </span>
                        )}
                    </div>
                </div>

                {/* Chú giải chi tiết danh mục bên phải */}
                <div className="lg:col-span-6 max-h-[360px] overflow-y-auto pr-2 space-y-3 scrollbar-thin">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <span>Danh mục ({categoryBreakdown.length})</span>
                        <span>Số tiền & Tỷ lệ</span>
                    </div>

                    {categoryBreakdown.map((cat, i) => {
                        const isHovered = hoveredCategory && hoveredCategory.name === cat.name;
                        return (
                            <div
                                key={i}
                                onMouseEnter={() => setHoveredCategory(cat)}
                                onMouseLeave={() => setHoveredCategory(null)}
                                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                    isHovered
                                        ? 'bg-blue-50/80 border-blue-200 shadow-sm scale-[1.01]'
                                        : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/60'
                                }`}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div
                                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
                                        style={{ backgroundColor: cat.color }}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-800 truncate">{cat.name}</p>
                                        <div className="w-24 md:w-32 bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{ width: `${Math.min(cat.percent, 100)}%`, backgroundColor: cat.color }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right shrink-0">
                                    <p className="text-sm font-black text-slate-800">{formatMoney(cat.amount)}</p>
                                    <span className="text-[11px] font-bold text-slate-500">{cat.percent}%</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // ==========================================
    // RENDER BIỂU ĐỒ ĐƯỜNG NHÓM (LINE CHART)
    // ==========================================
    const renderLineChart = () => {
        if (dailyTrendData.length === 0 || totalGroupExpense === 0) {
            return (
                <div className="h-[380px] flex flex-col items-center justify-center text-slate-400 gap-3">
                    <span className="material-symbols-outlined text-6xl text-slate-300">show_chart</span>
                    <p className="text-sm font-semibold">Chưa có đủ mốc thời gian để vẽ biểu đồ đường xu hướng.</p>
                </div>
            );
        }

        const width = 860;
        const height = 340;
        const paddingLeft = 75;
        const paddingRight = 35;
        const paddingTop = 35;
        const paddingBottom = 45;

        const chartWidth = width - paddingLeft - paddingRight;
        const chartHeight = height - paddingTop - paddingBottom;

        const maxVal = Math.max(
            ...dailyTrendData.map(d => d.expense),
            200000
        );

        const yTicks = [0, maxVal * 0.33, maxVal * 0.66, maxVal];

        const pointsExpense = dailyTrendData.map((d, i) => {
            const x = paddingLeft + (i / Math.max(1, dailyTrendData.length - 1)) * chartWidth;
            const y = paddingTop + chartHeight - (d.expense / maxVal) * chartHeight;
            return { x, y, data: d };
        });

        // Hàm vẽ đường cong Spline Bezier
        const getSmoothPath = (pts) => {
            if (pts.length === 0) return '';
            if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
            let d = `M ${pts[0].x} ${pts[0].y}`;
            for (let i = 0; i < pts.length - 1; i++) {
                const p0 = i > 0 ? pts[i - 1] : pts[i];
                const p1 = pts[i];
                const p2 = pts[i + 1];
                const p3 = i !== pts.length - 2 ? pts[i + 2] : p2;

                const cp1x = p1.x + (p2.x - p0.x) / 6;
                const cp1y = p1.y + (p2.y - p0.y) / 6;
                const cp2x = p2.x - (p3.x - p1.x) / 6;
                const cp2y = p2.y - (p3.y - p1.y) / 6;

                d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
            }
            return d;
        };

        const pathExpense = getSmoothPath(pointsExpense);
        const areaExpense = `${pathExpense} L ${pointsExpense[pointsExpense.length - 1].x} ${paddingTop + chartHeight} L ${pointsExpense[0].x} ${paddingTop + chartHeight} Z`;

        const peakDay = dailyTrendData.reduce((max, cur) => cur.expense > max.expense ? cur : max, dailyTrendData[0]);

        return (
            <div className="space-y-4 py-2">
                {/* Chỉ số tóm tắt trên đầu biểu đồ */}
                <div className="flex flex-wrap items-center justify-between gap-4 px-2 pb-2 text-xs">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 rounded-md bg-blue-600 shadow-xs"></span>
                            <span className="font-bold text-slate-700">Dòng tiền chi tiêu nhóm</span>
                            <span className="text-slate-400 font-medium">({formatMoney(totalGroupExpense)})</span>
                        </div>
                    </div>

                    {peakDay && peakDay.expense > 0 && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 font-bold">
                            <span className="material-symbols-outlined text-[15px]">trending_up</span>
                            <span>Đỉnh chi tiêu: {peakDay.dateStr} ({formatMoney(peakDay.expense)})</span>
                        </div>
                    )}
                </div>

                {/* SVG Biểu đồ đường diện tích lớn */}
                <div className="relative w-full overflow-x-auto">
                    <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[700px] h-[340px]">
                        <defs>
                            <linearGradient id="groupLineGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                                <stop offset="90%" stopColor="#2563eb" stopOpacity="0.0" />
                            </linearGradient>
                        </defs>

                        {/* Đường lưới tọa độ trục Y */}
                        {yTicks.map((val, idx) => {
                            const yPos = paddingTop + chartHeight - (val / maxVal) * chartHeight;
                            return (
                                <g key={idx}>
                                    <line
                                        x1={paddingLeft}
                                        y1={yPos}
                                        x2={width - paddingRight}
                                        y2={yPos}
                                        stroke="#e2e8f0"
                                        strokeDasharray={idx === 0 ? 'none' : '4 4'}
                                        strokeWidth="1"
                                    />
                                    <text
                                        x={paddingLeft - 10}
                                        y={yPos + 4}
                                        textAnchor="end"
                                        className="text-[10px] fill-slate-400 font-medium font-mono"
                                    >
                                        {formatMoney(val)}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Vùng bóng màu Gradient (Area Fill) */}
                        <path d={areaExpense} fill="url(#groupLineGradient)" />

                        {/* Đường kẻ Chi tiêu */}
                        <path
                            d={pathExpense}
                            fill="none"
                            stroke="#2563eb"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />

                        {/* Các điểm nút tương tác */}
                        {pointsExpense.map((pt, idx) => {
                            const isHovered = hoveredPoint && hoveredPoint.data.dateStr === pt.data.dateStr;
                            return (
                                <g key={idx}>
                                    {isHovered && (
                                        <line
                                            x1={pt.x}
                                            y1={paddingTop}
                                            x2={pt.x}
                                            y2={paddingTop + chartHeight}
                                            stroke="#2563eb"
                                            strokeWidth="1.5"
                                            strokeDasharray="3 3"
                                        />
                                    )}

                                    <circle
                                        cx={pt.x}
                                        cy={pt.y}
                                        r={isHovered ? 7 : (pt.data.expense > 0 ? 4.5 : 2.5)}
                                        fill="#ffffff"
                                        stroke="#2563eb"
                                        strokeWidth={isHovered ? 3.5 : 2}
                                        className="cursor-pointer transition-all duration-200"
                                        onMouseEnter={() => setHoveredPoint(pt)}
                                        onMouseLeave={() => setHoveredPoint(null)}
                                    />

                                    {/* Nhãn ngày trục X */}
                                    <text
                                        x={pt.x}
                                        y={paddingTop + chartHeight + 20}
                                        textAnchor="middle"
                                        className={`text-[10px] ${isHovered ? 'fill-blue-900 font-bold' : 'fill-slate-400 font-medium'}`}
                                    >
                                        {pt.data.dateStr ? pt.data.dateStr.slice(5) : ''}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>

                    {/* Tooltip khi di chuột vào điểm nút */}
                    {hoveredPoint && (
                        <div
                            className="absolute z-20 pointer-events-none bg-slate-900/90 backdrop-blur-md text-white px-3.5 py-2.5 rounded-xl shadow-xl text-xs border border-slate-700/50 transform -translate-x-1/2 -translate-y-full"
                            style={{
                                left: `${(hoveredPoint.x / width) * 100}%`,
                                top: `${(hoveredPoint.y / height) * 100 - 4}%`
                            }}
                        >
                            <p className="font-bold text-slate-300 text-[11px]">Ngày: {hoveredPoint.data.dateStr}</p>
                            <p className="text-sm font-extrabold text-white mt-0.5">
                                Chi tiêu: {formatMoney(hoveredPoint.data.expense)}
                            </p>
                            <p className="text-[10px] text-blue-200 mt-0.5">
                                {hoveredPoint.data.count} hóa đơn • Người chi: {hoveredPoint.data.payers || 'Nhóm'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-screen overflow-hidden text-slate-800 bg-slate-50 font-body">
            <GroupSidebar profileData={profileData} />

            <main className="flex-1 flex flex-col md:ml-64 relative overflow-hidden bg-slate-50">
                {/* Header */}
                <header className="flex justify-between items-center w-full px-6 py-4 bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                    <div>
                        <h2 className="text-xl font-extrabold text-blue-950 font-headline">Phân tích & Phần chia dự tính</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Báo cáo cơ cấu chi tiêu và hạn mức phân bổ dự tính minh bạch cho từng thành viên</p>
                    </div>

                    {/* Selector Nhóm */}
                    <div className="flex items-center gap-2 bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200">
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
                </header>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-6xl mx-auto space-y-6 pb-16">

                        {/* 4 KPI Cards: Tổng chi, Thực chi của bạn, Phần chia dự tính của bạn, Chênh lệch dự tính */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Card 1: Tổng chi cả nhóm */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:border-blue-300 transition-all">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng chi cả nhóm</span>
                                    <span className="material-symbols-outlined text-slate-400 text-lg">account_balance_wallet</span>
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 font-headline mt-2">{formatMoney(totalGroupExpense)}</h3>
                                <p className="text-[11px] text-slate-400 mt-1">{groupTransactions.length} hóa đơn ghi nhận</p>
                            </div>

                            {/* Card 2: Bạn đã chi trả thực tế */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:border-blue-300 transition-all">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bạn đã chi trả</span>
                                    <span className="material-symbols-outlined text-blue-700 text-lg">payments</span>
                                </div>
                                <h3 className="text-2xl font-black text-blue-900 font-headline mt-2">{formatMoney(youPaid)}</h3>
                                <p className="text-[11px] text-slate-400 mt-1">Tiền bạn đã đứng ra thanh toán</p>
                            </div>

                            {/* Card 3: Số tiền chia dự tính của bạn */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:border-blue-300 transition-all">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Phần chia dự tính của bạn</span>
                                    <span className="material-symbols-outlined text-indigo-700 text-lg">donut_large</span>
                                </div>
                                <h3 className="text-2xl font-black text-indigo-900 font-headline mt-2">{formatMoney(yourEstimatedShare)}</h3>
                                <p className="text-[11px] text-slate-400 mt-1">Trách nhiệm chia đều trong nhóm</p>
                            </div>

                            {/* Card 4: Chênh lệch dự tính của bạn */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:border-blue-300 transition-all">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Chênh lệch dự tính</span>
                                    <span className="material-symbols-outlined text-slate-400 text-lg">balance</span>
                                </div>
                                <h3 className={`text-2xl font-black font-headline mt-2 ${
                                    diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-amber-600' : 'text-slate-700'
                                }`}>
                                    {diff > 0 ? `+${formatMoney(diff)}` : diff < 0 ? `-${formatMoney(Math.abs(diff))}` : '0 VND'}
                                </h3>
                                <p className={`text-[11px] font-semibold mt-1 ${
                                    diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-amber-600' : 'text-slate-400'
                                }`}>
                                    {diff > 0 ? 'Chi vượt dự tính' : diff < 0 ? 'Cần đóng thêm theo dự tính' : 'Đúng định mức'}
                                </p>
                            </div>
                        </div>

                        {/* Banner Trạng thái phân bổ dự tính của bạn */}
                        <div className={`p-6 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
                            diff >= 0 ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-amber-50/70 border-amber-200 text-amber-900'
                        }`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-2xl ${
                                    diff >= 0 ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'
                                }`}>
                                    <span className="material-symbols-outlined">
                                        {diff >= 0 ? 'trending_up' : 'pie_chart'}
                                    </span>
                                </div>
                                <div>
                                    <h4 className="font-headline font-bold text-base">
                                        {diff >= 0
                                            ? 'Tình hình chi trả: Bạn đang chi trả vượt phần chia dự tính'
                                            : 'Tình hình chi trả: Bạn đang chi trả ít hơn phần chia dự tính'}
                                    </h4>
                                    <p className="text-xs opacity-80 mt-0.5">
                                        {diff >= 0
                                            ? `Bạn đã ứng ra thêm ${formatMoney(diff)} so với phần chia dự tính của mình. Các thành viên khác sẽ cân đối luân phiên chi trả các khoản tiếp theo.`
                                            : `Bạn đang đóng góp ít hơn ${formatMoney(Math.abs(diff))} so với phần chia dự tính. Bạn có thể đứng ra chi trả các khoản chi sắp tới của nhóm.`}
                                    </p>
                                </div>
                            </div>

                            <span className="text-2xl font-black font-headline tracking-tight shrink-0">
                                {diff >= 0 ? `+${formatMoney(diff)}` : `-${formatMoney(Math.abs(diff))}`}
                            </span>
                        </div>

                        {/* KHU VỰC BIỂU ĐỒ LỚN CÓ NÚT CHUYỂN ĐỔI (PIE vs LINE) */}
                        <div className="bg-white p-6 lg:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                                <div>
                                    <h3 className="font-headline text-lg font-bold text-blue-950 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-blue-800">insights</span>
                                        <span>Biểu đồ phân tích tài chính nhóm</span>
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Chọn định dạng biểu đồ tròn hoặc đường để quan sát dòng tiền nhóm trực quan
                                    </p>
                                </div>

                                {/* Toggle Buttons chọn Biểu đồ tròn hoặc Biểu đồ đường */}
                                <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 self-start sm:self-auto">
                                    <button
                                        type="button"
                                        onClick={() => setChartType('PIE')}
                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                            chartType === 'PIE'
                                                ? 'bg-white text-blue-900 shadow-sm'
                                                : 'text-slate-500 hover:text-slate-800'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-base">donut_large</span>
                                        <span>Biểu đồ tròn (Cơ cấu danh mục)</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setChartType('LINE')}
                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                            chartType === 'LINE'
                                                ? 'bg-white text-blue-900 shadow-sm'
                                                : 'text-slate-500 hover:text-slate-800'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-base">show_chart</span>
                                        <span>Biểu đồ đường (Xu hướng thời gian)</span>
                                    </button>
                                </div>
                            </div>

                            {/* Render Chart Content */}
                            {chartType === 'PIE' ? renderPieChart() : renderLineChart()}
                        </div>

                        {/* AI FINANCIAL ADVISOR CHO NHÓM */}
                        {aiAnalysis && (
                            <div className="bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 rounded-3xl p-6 lg:p-8 text-white shadow-xl relative overflow-hidden">
                                <div
                                    className="absolute inset-0 opacity-10 pointer-events-none"
                                    style={{
                                        backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                                        backgroundSize: '24px 24px'
                                    }}
                                ></div>

                                <div className="relative z-10 space-y-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-400/30">
                                                <span className="material-symbols-outlined text-2xl">psychology</span>
                                            </div>
                                            <div>
                                                <h4 className="font-headline text-lg font-black text-white flex items-center gap-2">
                                                    <span>AI Cố vấn Tài chính Nhóm</span>
                                                    <span className="text-[10px] font-bold bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded-full border border-blue-400/30">
                                                        Tự động đánh giá
                                                    </span>
                                                </h4>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    Cập nhật lúc {aiAnalysis.updatedAt} • Dựa trên phân bổ phần chia dự tính của các thành viên
                                                </p>
                                            </div>
                                        </div>

                                        {/* Điểm cân bằng tài chính */}
                                        <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
                                            <div className="text-right">
                                                <p className="text-[10px] uppercase font-bold text-slate-400">Chỉ số cân bằng</p>
                                                <p className="text-xs font-bold text-blue-300">{aiAnalysis.grade.label}</p>
                                            </div>
                                            <div className="text-2xl font-black text-emerald-400 font-headline">
                                                {aiAnalysis.score}<span className="text-sm font-normal text-slate-400">/100</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Danh sách nhận định & Lời khuyên */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Cột 1: Đánh giá hiện trạng */}
                                        <div className="space-y-3">
                                            <p className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-sm">analytics</span>
                                                <span>Đánh giá chi tiêu & phần chia</span>
                                            </p>
                                            <div className="space-y-2">
                                                {aiAnalysis.assessments.map((item, idx) => (
                                                    <div key={idx} className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                                                        <span className="material-symbols-outlined text-base text-blue-400 mt-0.5">{item.icon}</span>
                                                        <p className="text-xs text-slate-200 leading-relaxed">{item.text}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Cột 2: Lời khuyên AI cho nhóm */}
                                        <div className="space-y-3">
                                            <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-sm">tips_and_updates</span>
                                                <span>Khuyến nghị tối ưu cho nhóm</span>
                                            </p>
                                            <div className="space-y-2">
                                                {aiAnalysis.recommendations.map((rec, idx) => (
                                                    <div key={idx} className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/20 flex items-start gap-3">
                                                        <span className="material-symbols-outlined text-base text-emerald-400 mt-0.5">check_circle</span>
                                                        <p className="text-xs text-emerald-100 leading-relaxed">{rec}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* BẢNG TỔNG HỢP PHẦN CHIA DỰ TÍNH CỦA CÁC THÀNH VIÊN */}
                        <div className="bg-white p-6 lg:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="font-headline text-base font-bold text-blue-950 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-blue-800">group</span>
                                        <span>Bảng tổng hợp phần chia dự tính của các thành viên</span>
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Đối chiếu số tiền thực chi và phần chia dự tính của từng cá nhân
                                    </p>
                                </div>
                                <span className="text-xs font-bold text-blue-900 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                                    {memberAllocations.length} thành viên
                                </span>
                            </div>

                            <div className="space-y-4">
                                {memberAllocations.map((m, idx) => {
                                    const isSelf = m.username === currentUsername || m.fullName === currentFullName;
                                    return (
                                        <div
                                            key={idx}
                                            className={`p-4 rounded-2xl border transition-all ${
                                                isSelf ? 'bg-blue-50/50 border-blue-200 shadow-xs' : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70'
                                            }`}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-xs ${
                                                        isSelf ? 'bg-blue-900' : 'bg-slate-600'
                                                    }`}>
                                                        {m.displayName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <span className="font-bold text-sm text-slate-800">
                                                            {m.displayName} {isSelf && <span className="text-xs text-blue-800 font-semibold">(Bạn)</span>}
                                                        </span>
                                                        {m.userCode && (
                                                            <span className="ml-2 text-[9px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-mono">
                                                                #{m.userCode}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 self-end sm:self-auto text-xs">
                                                    <span className="text-slate-500">
                                                        Thực chi: <b className="text-slate-800">{formatMoney(m.totalPaid)}</b> ({m.percentPaid}%)
                                                    </span>
                                                    <span>•</span>
                                                    <span className="text-slate-500">
                                                        Dự tính: <b className="text-slate-800">{formatMoney(m.estimatedShare)}</b>
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Progress bar mức chi trả thực tế */}
                                            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-2">
                                                <div
                                                    className="h-full bg-blue-800 rounded-full transition-all duration-500"
                                                    style={{ width: `${Math.min(m.percentPaid, 100)}%` }}
                                                ></div>
                                            </div>

                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-[11px] text-slate-400">
                                                    Tỷ lệ đóng góp thực tế trong quỹ nhóm: {m.percentPaid}%
                                                </span>
                                                <span className={`font-bold px-2 py-0.5 rounded-md text-[11px] border ${
                                                    m.diff > 0
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : m.diff < 0
                                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                                }`}>
                                                    {m.diff > 0 && `Chi vượt dự tính: +${formatMoney(m.diff)}`}
                                                    {m.diff < 0 && `Đóng thêm theo dự tính: -${formatMoney(Math.abs(m.diff))}`}
                                                    {m.diff === 0 && `Đúng hạn mức dự tính: 0 VND`}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}

                                {memberAllocations.length === 0 && (
                                    <div className="text-center py-10 text-slate-400 text-xs">
                                        Chưa có thành viên nào trong nhóm.
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-100 flex items-center gap-3 text-xs text-blue-900">
                                <span className="material-symbols-outlined text-lg text-blue-700 shrink-0">verified_user</span>
                                <span>
                                    Hệ thống sử dụng cơ chế tính toán <b>Số tiền chia dự tính minh bạch</b>, giúp nhóm chủ động san sẻ chi tiêu mà không gây áp lực về việc đòi nợ cá nhân.
                                </span>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
};

export default GroupAnalytics;