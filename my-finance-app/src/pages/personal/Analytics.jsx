import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import UserProfileBadge from '../../components/personal/UserProfileBadge';
import { useLanguage } from '../../context/LanguageContext';

// Bảng màu rực rỡ, hiện đại cho các danh mục chi tiêu
const PALETTE = [
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
    '#f97316', // Orange
    '#6366f1', // Indigo
    '#14b8a6', // Teal
    '#ef4444', // Red
    '#64748b'  // Slate
];

const Analytics = () => {
    const navigate = useNavigate();
    const { t, openSettings } = useLanguage();

    // --- STATE DỮ LIỆU ---
    const [profileData, setProfileData] = useState({ fullName: '', email: '' });
    const [transactions, setTransactions] = useState([]);
    const [budgets, setBudgets] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- STATE KỲ PHÂN TÍCH: 'DAY' | 'MONTH' | 'YEAR' ---
    const getTodayString = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    };
    const getCurrentMonthString = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    };

    const [viewMode, setViewMode] = useState('DAY'); // Mặc định đánh giá theo Ngày để nhận xét AI tức thì
    const [selectedDate, setSelectedDate] = useState(getTodayString());
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthString());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // --- STATE LOẠI BIỂU ĐỒ: 'PIE' | 'LINE' ---
    const [chartType, setChartType] = useState('PIE');
    const [hoveredCategory, setHoveredCategory] = useState(null);
    const [hoveredPoint, setHoveredPoint] = useState(null);

    // --- STATE CHO AI ADVISOR ---
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState(null);
    const analysisTimerRef = useRef(null);

    // Helper chuẩn hóa trích xuất ngày tháng không bị lệch múi giờ UTC
    const parseDateParts = (rawDate) => {
        if (!rawDate) return null;
        if (Array.isArray(rawDate)) {
            return {
                year: Number(rawDate[0]),
                month: Number(rawDate[1]),
                day: Number(rawDate[2] || 1),
                hour: Number(rawDate[3] || 0)
            };
        }
        if (typeof rawDate === 'string') {
            const match = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}))?/);
            if (match) {
                return {
                    year: Number(match[1]),
                    month: Number(match[2]),
                    day: Number(match[3]),
                    hour: Number(match[4] || 0)
                };
            }
        }
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) return null;
        return {
            year: d.getFullYear(),
            month: d.getMonth() + 1,
            day: d.getDate(),
            hour: d.getHours()
        };
    };

    const activeMonthForBudget = viewMode === 'DAY' ? selectedDate.slice(0, 7) : selectedMonth;

    // Format tiền tệ Việt Nam
    const formatMoney = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
            .format(amount || 0)
            .replace('₫', 'đ');
    };

    // 1. GỌI API LẤY DỮ LIỆU
    const fetchData = async () => {
        const token = localStorage.getItem("token");
        if (!token) return navigate("/login");

        try {
            setLoading(true);
            const budgetEndpoint = viewMode === 'YEAR'
                ? "/api/budgets"
                : `/api/budgets?month=${activeMonthForBudget}`;

            const [profileRes, transRes, budgetRes, catRes] = await Promise.all([
                api.get("/api/auth/profile").catch(() => ({ data: {} })),
                api.get("/api/transactions").catch(() => ({ data: [] })),
                api.get(budgetEndpoint).catch(() => ({ data: [] })),
                api.get("/api/categories").catch(() => ({ data: [] }))
            ]);

            setProfileData(profileRes.data || { fullName: 'Người dùng', email: 'Chưa cập nhật' });
            setTransactions(Array.isArray(transRes.data) ? transRes.data : []);
            setBudgets(Array.isArray(budgetRes.data) ? budgetRes.data : []);
            setCategories(Array.isArray(catRes.data) ? catRes.data : []);
        } catch (error) {
            console.error("Lỗi lấy dữ liệu:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewMode, selectedDate, selectedMonth, selectedYear]);

    // 2. TÍNH TOÁN CÁC CHỈ SỐ THỐNG KÊ THEO NGÀY / THÁNG / NĂM & CHIA NGÂN SÁCH NGÀY
    const {
        totalIncome,
        totalExpense,
        savingAmount,
        savingPercent,
        categoryBreakdown,
        trendData,
        budgetBreakdown,
        dailyBudgetCap,
        monthlyBudgetTotal,
        daysInActiveMonth,
        adjustedDailyAllowance,
        remainingDaysInMonth,
        periodLabel,
        txCountInPeriod
    } = useMemo(() => {
        const [dYear, dMonth, dDay] = selectedDate.split('-').map(Number);
        const [mYear, mMonth] = selectedMonth.split('-').map(Number);

        const activeYear = viewMode === 'DAY' ? dYear : (viewMode === 'MONTH' ? mYear : Number(selectedYear));
        const activeMonth = viewMode === 'DAY' ? dMonth : mMonth;
        const daysInMonth = new Date(activeYear, activeMonth, 0).getDate();

        // Map categoryId -> jarType để đối chiếu chính xác giao dịch vào từng lọ ngân sách
        const catJarMap = {};
        categories.forEach(c => {
            if (c.id && c.jarType) catJarMap[c.id] = c.jarType;
        });

        // Lọc giao dịch theo kỳ đang chọn (DAY | MONTH | YEAR)
        const periodTransactions = transactions.filter(t => {
            const p = parseDateParts(t.transactionDate);
            if (!p) return false;
            if (viewMode === 'DAY') {
                return p.year === dYear && p.month === dMonth && p.day === dDay;
            }
            if (viewMode === 'MONTH') {
                return p.year === mYear && p.month === mMonth;
            }
            return p.year === Number(selectedYear);
        });

        let inc = 0;
        let exp = 0;
        const catMap = {};

        periodTransactions.forEach(t => {
            const amount = parseFloat(t.amount || 0);
            const txType = (t.type || t.transactionType || 'EXPENSE').toUpperCase();
            if (txType === 'INCOME') {
                inc += amount;
            } else if (txType === 'EXPENSE') {
                exp += amount;
                const catName = t.categoryName || 'Khác';
                const catIcon = t.categoryIcon || 'payments';
                if (!catMap[catName]) {
                    catMap[catName] = { name: catName, icon: catIcon, amount: 0 };
                }
                catMap[catName].amount += amount;
            }
        });

        const catList = Object.values(catMap).map((cat, idx) => ({
            ...cat,
            color: PALETTE[idx % PALETTE.length],
            percent: exp > 0 ? parseFloat(((cat.amount / exp) * 100).toFixed(1)) : 0
        })).sort((a, b) => b.amount - a.amount);

        // Xây dựng dữ liệu biểu đồ xu hướng theo chế độ xem
        let trend = [];
        if (viewMode === 'DAY') {
            trend = Array.from({ length: 24 }, (_, hour) => ({
                key: hour,
                label: `${hour}h`,
                shortLabel: `${hour}h`,
                title: `${String(hour).padStart(2, '0')}:00 (${selectedDate})`,
                income: 0,
                expense: 0
            }));
            periodTransactions.forEach(t => {
                const p = parseDateParts(t.transactionDate);
                if (!p) return;
                const hr = Math.max(0, Math.min(23, p.hour || 0));
                const amt = parseFloat(t.amount || 0);
                const txType = (t.type || t.transactionType || 'EXPENSE').toUpperCase();
                if (txType === 'INCOME') trend[hr].income += amt;
                else if (txType === 'EXPENSE') trend[hr].expense += amt;
            });
        } else if (viewMode === 'MONTH') {
            trend = Array.from({ length: daysInMonth }, (_, i) => {
                const dayNum = i + 1;
                return {
                    key: dayNum,
                    label: `N.${dayNum}`,
                    shortLabel: `Ngày ${dayNum}`,
                    title: `Ngày ${dayNum} (${mYear}-${String(mMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')})`,
                    income: 0,
                    expense: 0
                };
            });
            periodTransactions.forEach(t => {
                const p = parseDateParts(t.transactionDate);
                if (!p) return;
                const idx = p.day - 1;
                if (idx >= 0 && idx < daysInMonth) {
                    const amt = parseFloat(t.amount || 0);
                    const txType = (t.type || t.transactionType || 'EXPENSE').toUpperCase();
                    if (txType === 'INCOME') trend[idx].income += amt;
                    else if (txType === 'EXPENSE') trend[idx].expense += amt;
                }
            });
        } else {
            trend = Array.from({ length: 12 }, (_, i) => ({
                key: i + 1,
                label: `T.${i + 1}`,
                shortLabel: `Tháng ${i + 1}`,
                title: `Tháng ${i + 1}/${selectedYear}`,
                income: 0,
                expense: 0
            }));
            periodTransactions.forEach(t => {
                const p = parseDateParts(t.transactionDate);
                if (!p) return;
                const idx = p.month - 1;
                if (idx >= 0 && idx < 12) {
                    const amt = parseFloat(t.amount || 0);
                    const txType = (t.type || t.transactionType || 'EXPENSE').toUpperCase();
                    if (txType === 'INCOME') trend[idx].income += amt;
                    else if (txType === 'EXPENSE') trend[idx].expense += amt;
                }
            });
        }

        // Xử lý Ngân sách theo kỳ (DAY: chia ngân sách tháng theo ngày | MONTH: ngân sách tháng | YEAR: gộp năm)
        let activeBudgets = budgets;
        if (viewMode === 'YEAR') {
            const yearStr = String(selectedYear);
            const yearBudgets = budgets.filter(b =>
                (b.monthString && b.monthString.startsWith(yearStr)) ||
                (b.startDate && String(b.startDate).startsWith(yearStr))
            );
            const groupedYear = {};
            yearBudgets.forEach(b => {
                const key = b.jarType || b.name || `cat-${b.categoryId || b.id}`;
                if (!groupedYear[key]) {
                    groupedYear[key] = { ...b, limitAmount: 0, spentAmount: 0 };
                }
                groupedYear[key].limitAmount += parseFloat(b.limitAmount || 0);
                groupedYear[key].spentAmount += parseFloat(b.spentAmount || 0);
            });
            activeBudgets = Object.values(groupedYear);
        }

        let totalMonthlyLimit = 0;
        const bBreakdown = activeBudgets.map(b => {
            const monthlyLimit = parseFloat(b.limitAmount || 0);
            const monthlySpent = parseFloat(b.spentAmount || 0);
            totalMonthlyLimit += monthlyLimit;

            let periodLimit = monthlyLimit;
            let periodSpent = monthlySpent;

            if (viewMode === 'DAY') {
                periodLimit = monthlyLimit > 0 ? Math.round(monthlyLimit / daysInMonth) : 0;
                // Tính tổng đã tiêu trong ngày selectedDate khớp với lọ hoặc danh mục của ngân sách này
                periodSpent = periodTransactions
                    .filter(t => (t.type || t.transactionType || 'EXPENSE').toUpperCase() === 'EXPENSE')
                    .filter(t => {
                        if (b.jarType && t.categoryId && catJarMap[t.categoryId]) {
                            return catJarMap[t.categoryId] === b.jarType;
                        }
                        if (b.categoryId && t.categoryId) {
                            return Number(t.categoryId) === Number(b.categoryId);
                        }
                        return (b.name || '').toLowerCase().includes((t.categoryName || '').toLowerCase());
                    })
                    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
            }

            const percent = periodLimit > 0 ? (periodSpent / periodLimit) * 100 : 0;
            let color = 'bg-blue-500';
            let statusText = 'An toàn';
            if (percent >= 100) {
                color = 'bg-red-500';
                statusText = 'Vượt hạn mức!';
            } else if (percent >= 80) {
                color = 'bg-orange-500';
                statusText = 'Sắp hết!';
            }

            return {
                id: b.id,
                name: b.name,
                icon: b.icon || 'category',
                limit: periodLimit,
                spent: periodSpent,
                monthlyLimit,
                monthlySpent,
                percent: parseFloat(percent.toFixed(1)),
                color,
                statusText
            };
        }).sort((a, b) => b.percent - a.percent);

        const dailyCapFromBudgets = totalMonthlyLimit > 0 ? Math.round(totalMonthlyLimit / daysInMonth) : 0;

        // Tính tổng đã chi trong tháng tới hết ngày selectedDate để gợi ý điều chỉnh cho những ngày còn lại
        const monthSpentSoFar = transactions
            .filter(t => {
                const p = parseDateParts(t.transactionDate);
                if (!p) return false;
                const txType = (t.type || t.transactionType || 'EXPENSE').toUpperCase();
                return txType === 'EXPENSE' && p.year === dYear && p.month === dMonth && p.day <= dDay;
            })
            .reduce((s, t) => s + parseFloat(t.amount || 0), 0);

        const remDays = Math.max(1, daysInMonth - dDay);
        const adjustedDaily = totalMonthlyLimit > 0
            ? Math.max(0, Math.round((totalMonthlyLimit - monthSpentSoFar) / remDays))
            : 0;

        const sav = inc - exp;
        const savPct = inc > 0 ? Math.max(0, ((sav / inc) * 100)).toFixed(1) : 0;

        const label = viewMode === 'DAY'
            ? `Ngày ${String(dDay).padStart(2, '0')}/${String(dMonth).padStart(2, '0')}/${dYear}`
            : viewMode === 'MONTH'
                ? `Tháng ${String(mMonth).padStart(2, '0')}/${mYear}`
                : `Năm ${selectedYear}`;

        return {
            totalIncome: inc,
            totalExpense: exp,
            savingAmount: sav,
            savingPercent: savPct,
            categoryBreakdown: catList,
            trendData: trend,
            budgetBreakdown: bBreakdown,
            dailyBudgetCap: dailyCapFromBudgets,
            monthlyBudgetTotal: totalMonthlyLimit,
            daysInActiveMonth: daysInMonth,
            adjustedDailyAllowance: adjustedDaily,
            remainingDaysInMonth: remDays,
            periodLabel: label,
            txCountInPeriod: periodTransactions.length
        };
    }, [transactions, budgets, categories, viewMode, selectedDate, selectedMonth, selectedYear]);

    // 3. TỰ ĐỘNG CHẠY AI ĐÁNH GIÁ TỨC THÌ THEO NGÀY / THÁNG / NĂM
    const runAutoFinancialAnalysis = () => {
        if (analysisTimerRef.current) clearTimeout(analysisTimerRef.current);
        setIsAnalyzing(true);

        analysisTimerRef.current = setTimeout(() => {
            let score = 75;
            const overBudgets = budgetBreakdown.filter(b => b.percent >= 100);
            const warningBudgets = budgetBreakdown.filter(b => b.percent >= 80 && b.percent < 100);
            const topCategory = categoryBreakdown[0];
            const assessments = [];
            const recommendations = [];

            if (viewMode === 'DAY') {
                // --- ĐÁNH GIÁ TỨC THÌ SAU 1 NGÀY DỰA TRÊN NGÂN SÁCH CHIA THEO NGÀY ---
                if (dailyBudgetCap > 0) {
                    const usagePct = (totalExpense / dailyBudgetCap) * 100;
                    const diff = dailyBudgetCap - totalExpense;

                    if (totalExpense === 0) {
                        score += 20;
                        assessments.push({
                            type: 'success',
                            icon: 'celebration',
                            text: `Tuyệt vời! ${periodLabel} chưa ghi nhận khoản chi nào (No-Spend Day), giữ trọn vẹn ${formatMoney(dailyBudgetCap)} hạn mức ngày.`
                        });
                    } else if (diff >= 0) {
                        score += usagePct <= 80 ? 15 : 8;
                        assessments.push({
                            type: 'success',
                            icon: 'check_circle',
                            text: `Kỷ luật tốt trong ngày! Bạn đã tiêu ${formatMoney(totalExpense)} / ${formatMoney(dailyBudgetCap)} hạn mức ngày (${usagePct.toFixed(1)}%), tiết kiệm được ${formatMoney(diff)} riêng hôm nay.`
                        });
                    } else {
                        const overAmt = Math.abs(diff);
                        const overPct = (((totalExpense - dailyBudgetCap) / dailyBudgetCap) * 100).toFixed(1);
                        score -= Math.min(35, Math.round(Number(overPct) / 3));
                        assessments.push({
                            type: 'danger',
                            icon: 'warning',
                            text: `Vượt trần ngân sách ngày ${overPct}%! Hôm nay bạn chi ${formatMoney(totalExpense)}, vượt hạn mức ngày (${formatMoney(dailyBudgetCap)}) là ${formatMoney(overAmt)}.`
                        });
                    }

                    // Kiểm tra từng lọ trong ngày
                    if (overBudgets.length > 0) {
                        score -= overBudgets.length * 6;
                        assessments.push({
                            type: 'danger',
                            icon: 'error',
                            text: `Các lọ vượt định mức ngày hôm nay: ${overBudgets.map(b => `${b.name} (${formatMoney(b.spent)}/${formatMoney(b.limit)})`).join(', ')}.`
                        });
                    } else if (warningBudgets.length > 0) {
                        assessments.push({
                            type: 'warning',
                            icon: 'crisis_alert',
                            text: `Sắp chạm trần ngày ở lọ: ${warningBudgets.map(b => `${b.name} (${b.percent}%)`).join(', ')}.`
                        });
                    }
                } else {
                    if (totalExpense === 0) {
                        assessments.push({
                            type: 'info',
                            icon: 'info',
                            text: `${periodLabel} chưa có giao dịch chi tiêu nào. Hãy thiết lập Ngân sách tháng để AI tự động chia hạn mức theo từng ngày cho bạn!`
                        });
                    } else {
                        assessments.push({
                            type: 'info',
                            icon: 'payments',
                            text: `Tổng chi tiêu ${periodLabel} là ${formatMoney(totalExpense)} qua ${txCountInPeriod} giao dịch. Bạn chưa cài Ngân sách tháng để đối chiếu trần ngày.`
                        });
                    }
                }

                if (topCategory && topCategory.amount > 0) {
                    assessments.push({
                        type: topCategory.percent > 50 ? 'warning' : 'info',
                        icon: 'pie_chart',
                        text: `Khoản chi lớn nhất trong ngày là "${topCategory.name}" (${formatMoney(topCategory.amount)}, chiếm ${topCategory.percent}%).`
                    });
                }

                // Lời khuyên tức thì cho ngày mai
                if (dailyBudgetCap > 0 && totalExpense > dailyBudgetCap) {
                    recommendations.push({
                        title: `Điều chỉnh hạn mức ${remainingDaysInMonth} ngày tới`,
                        icon: 'tune',
                        color: 'rose',
                        desc: `Để cuối tháng không vỡ ngân sách ${formatMoney(monthlyBudgetTotal)}, hãy giới hạn chi tiêu các ngày còn lại xuống mức ${formatMoney(adjustedDailyAllowance)}/ngày.`
                    });
                } else if (dailyBudgetCap > 0) {
                    const savedToday = Math.max(0, dailyBudgetCap - totalExpense);
                    const monthlyBonus = savedToday * 30;
                    recommendations.push({
                        title: 'Tích sản khoản dư trong ngày',
                        icon: 'savings',
                        color: 'emerald',
                        desc: savedToday > 0
                            ? `Bạn dư ${formatMoney(savedToday)} trong ngày. Nếu duy trì nhịp độ này cả tháng sẽ tích lũy thêm ~${formatMoney(monthlyBonus)} để đưa vào quỹ sinh lời!`
                            : 'Bạn đang tiêu vừa khít hạn mức ngày. Hãy duy trì sự ổn định này!'
                    });
                } else {
                    recommendations.push({
                        title: 'Kích hoạt Chia Ngân Sách Theo Ngày',
                        icon: 'account_balance_wallet',
                        color: 'amber',
                        desc: 'Vào mục Ngân sách tạo gói 6 chiếc lọ cho tháng này để AI tự chia hạn mức từng ngày và cảnh báo ngay sau mỗi giao dịch.'
                    });
                }

                if (topCategory && topCategory.amount > 0) {
                    recommendations.push({
                        title: `Tối ưu nhóm "${topCategory.name}" ngày mai`,
                        icon: 'restaurant',
                        color: 'amber',
                        desc: `Nhóm "${topCategory.name}" chiếm ${topCategory.percent}% chi tiêu hôm nay. Hãy thử tự chuẩn bị hoặc áp dụng Bill Mặc Định tiết kiệm hơn 15% vào ngày mai.`
                    });
                } else {
                    recommendations.push({
                        title: 'Ghi chép ngay sau mỗi lần chi',
                        icon: 'bolt',
                        color: 'blue',
                        desc: 'Dùng tính năng Bill Mặc Định 1 chạm ở trang Thêm Giao Dịch để không bỏ sót khoản chi nhỏ nào trong ngày.'
                    });
                }

                recommendations.push({
                    title: 'Kiểm soát chi tiêu theo khung giờ',
                    icon: 'schedule',
                    color: 'indigo',
                    desc: 'Hạn chế đặt đồ ăn hoặc mua sắm online sau 20h tối — đây là khung giờ dễ phát sinh chi tiêu ngẫu hứng vượt trần ngày nhất.'
                });
            } else {
                // --- ĐÁNH GIÁ THEO THÁNG (MONTH) HOẶC NĂM (YEAR) ---
                const savingRateNum = parseFloat(savingPercent);
                if (totalIncome > 0) {
                    if (savingRateNum >= 30) score += 15;
                    else if (savingRateNum >= 20) score += 10;
                    else if (savingRateNum >= 10) score += 5;
                    else if (savingRateNum <= 0) score -= 25;
                } else if (totalExpense > 0) {
                    score -= 20;
                }

                if (budgetBreakdown.length > 0) {
                    if (overBudgets.length === 0 && warningBudgets.length === 0) score += 10;
                    else score -= (overBudgets.length * 10 + warningBudgets.length * 4);
                }

                if (topCategory && topCategory.percent > 45) score -= 8;

                const periodNoun = viewMode === 'MONTH' ? 'tháng' : 'năm';
                if (totalExpense > totalIncome && totalIncome > 0) {
                    assessments.push({
                        type: 'danger',
                        icon: 'warning',
                        text: `Dòng tiền ${periodNoun} đang thâm hụt ${formatMoney(Math.abs(savingAmount))}. Bạn đang chi tiêu vượt quá 100% thu nhập trong ${periodLabel}.`
                    });
                } else if (totalIncome > 0) {
                    assessments.push({
                        type: 'success',
                        icon: 'check_circle',
                        text: `Dòng tiền dương ổn định (${periodLabel}): Giữ lại được ${savingPercent}% thu nhập (tương đương ${formatMoney(savingAmount)}).`
                    });
                } else {
                    assessments.push({
                        type: 'info',
                        icon: 'info',
                        text: `Chưa ghi nhận nguồn thu nhập trong ${periodLabel}. Hãy cập nhật thu nhập để AI chấm điểm dòng tiền trọn vẹn.`
                    });
                }

                if (topCategory && topCategory.amount > 0) {
                    assessments.push({
                        type: topCategory.percent > 40 ? 'warning' : 'info',
                        icon: 'pie_chart',
                        text: `Khoản chi lớn nhất ${periodNoun} tập trung vào "${topCategory.name}" với ${formatMoney(topCategory.amount)} (${topCategory.percent}% tổng chi).`
                    });
                }

                if (dailyBudgetCap > 0 && viewMode === 'MONTH') {
                    const avgDailySpent = Math.round(totalExpense / daysInActiveMonth);
                    assessments.push({
                        type: avgDailySpent > dailyBudgetCap ? 'warning' : 'success',
                        icon: 'speed',
                        text: `Tốc độ tiêu trung bình tháng này là ${formatMoney(avgDailySpent)}/ngày (so với trần ngân sách ngày ${formatMoney(dailyBudgetCap)}/ngày).`
                    });
                }

                if (overBudgets.length > 0) {
                    assessments.push({
                        type: 'danger',
                        icon: 'error',
                        text: `Đã vỡ hạn mức ở ${overBudgets.length} quỹ ngân sách: ${overBudgets.map(b => b.name).join(', ')}.`
                    });
                }

                if (topCategory && topCategory.amount > 0) {
                    const saveTarget = Math.round(topCategory.amount * 0.15);
                    recommendations.push({
                        title: `Cắt giảm 15% chi phí nhóm "${topCategory.name}"`,
                        icon: 'savings',
                        color: 'rose',
                        desc: `Tối ưu nhóm này giúp bạn tiết kiệm thêm ${formatMoney(saveTarget)} trong ${periodLabel} để chuyển sang tích sản.`
                    });
                } else {
                    recommendations.push({
                        title: 'Ghi chép giao dịch đều đặn',
                        icon: 'receipt_long',
                        color: 'blue',
                        desc: 'Duy trì ghi nhận thu chi hằng ngày để biểu đồ và AI dự báo chính xác.'
                    });
                }

                if (overBudgets.length > 0) {
                    recommendations.push({
                        title: 'Tạm khóa các khoản chi không thiết yếu',
                        icon: 'lock',
                        color: 'amber',
                        desc: `Dừng chi tiêu cho các quỹ đã vượt như ${overBudgets[0].name} hoặc điều chuyển từ các lọ thặng dư.`
                    });
                } else if (budgetBreakdown.length === 0) {
                    recommendations.push({
                        title: 'Thiết lập mô hình 6 Lọ tài chính',
                        icon: 'account_balance_wallet',
                        color: 'indigo',
                        desc: 'Phân bổ thu nhập vào 6 lọ để hệ thống tự động chia trần chi tiêu từng ngày.'
                    });
                } else {
                    recommendations.push({
                        title: 'Duy trì kỷ luật ngân sách hiện tại',
                        icon: 'verified',
                        color: 'emerald',
                        desc: `Các quỹ ngân sách trong ${periodLabel} đang nằm trong tầm kiểm soát an toàn.`
                    });
                }

                if (savingAmount > 0) {
                    const investAmount = Math.round(savingAmount * 0.6);
                    const emergencyAmount = savingAmount - investAmount;
                    recommendations.push({
                        title: 'Phân bổ thặng dư sinh lời',
                        icon: 'trending_up',
                        color: 'emerald',
                        desc: `Với thặng dư ${formatMoney(savingAmount)}, hãy phân bổ ${formatMoney(investAmount)} vào Quỹ đầu tư/Tiết kiệm sinh lời và ${formatMoney(emergencyAmount)} vào Quỹ khẩn cấp.`
                    });
                } else {
                    recommendations.push({
                        title: 'Xây dựng quỹ dự phòng khẩn cấp',
                        icon: 'shield',
                        color: 'blue',
                        desc: 'Tích lũy tối thiểu 3 đến 6 tháng chi tiêu sinh hoạt cơ bản ở kênh rút linh hoạt 24/7.'
                    });
                }
            }

            score = Math.max(15, Math.min(98, Math.round(score)));
            let grade = { label: 'Khá tốt', color: 'text-blue-600', badge: 'bg-blue-50 text-blue-700 border-blue-200' };
            if (score >= 85) grade = { label: 'Xuất sắc', color: 'text-emerald-600', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
            else if (score >= 70) grade = { label: 'Khá tốt', color: 'text-blue-600', badge: 'bg-blue-50 text-blue-700 border-blue-200' };
            else if (score >= 50) grade = { label: 'Cần cải thiện', color: 'text-amber-600', badge: 'bg-amber-50 text-amber-700 border-amber-200' };
            else grade = { label: 'Báo động đỏ', color: 'text-rose-600', badge: 'bg-rose-50 text-rose-700 border-rose-200' };

            setAiAnalysis({
                score,
                grade,
                assessments,
                recommendations,
                updatedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            });
            setIsAnalyzing(false);
        }, 450);
    };

    // Tự động kích hoạt AI đánh giá mỗi khi đổi kỳ (Ngày / Tháng / Năm) hoặc dữ liệu mới
    useEffect(() => {
        if (!loading) {
            runAutoFinancialAnalysis();
        }
        return () => {
            if (analysisTimerRef.current) clearTimeout(analysisTimerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, totalIncome, totalExpense, dailyBudgetCap, viewMode, selectedDate, selectedMonth, selectedYear]);

    // ==========================================
    // TOÁN HỌC & RENDER BIỂU ĐỒ TRÒN (DONUT CHART)
    // ==========================================
    const renderPieChart = () => {
        if (categoryBreakdown.length === 0 || totalExpense === 0) {
            return (
                <div className="h-[420px] flex flex-col items-center justify-center text-slate-400 gap-3">
                    <span className="material-symbols-outlined text-6xl text-slate-300">donut_large</span>
                    <p className="text-sm font-semibold">Chưa có dữ liệu chi tiêu trong {periodLabel} để vẽ biểu đồ tròn.</p>
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
            const sliceAngle = (cat.amount / totalExpense) * 360;
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
            name: 'Tổng chi tiêu',
            amount: totalExpense,
            percent: 100,
            icon: 'payments'
        };

        return (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-4">
                {/* Vòng tròn SVG lớn */}
                <div className="lg:col-span-6 flex flex-col items-center justify-center relative">
                    <svg viewBox="0 0 320 320" className="w-full max-w-[320px] h-[320px] drop-shadow-md">
                        <defs>
                            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
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
                                    filter: slice.isHovered ? 'url(#glow)' : 'none'
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
                        <span className="text-xl font-black text-amber-950 tracking-tight">
                            {formatMoney(activeDisplay.amount)}
                        </span>
                        {activeDisplay.percent && activeDisplay.percent < 100 && (
                            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full mt-1">
                                {activeDisplay.percent}%
                            </span>
                        )}
                    </div>
                </div>

                {/* Chú giải chi tiết danh mục bên phải */}
                <div className="lg:col-span-6 max-h-[380px] overflow-y-auto pr-2 space-y-3 scrollbar-thin">
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
                                        ? 'bg-amber-50/80 border-amber-200 shadow-sm scale-[1.01]'
                                        : 'bg-white border-amber-100/60 hover:border-amber-200 hover:bg-amber-50/30'
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
    // TOÁN HỌC & RENDER BIỂU ĐỒ ĐƯỜNG (LINE CHART)
    // ==========================================
    const renderLineChart = () => {
        const width = 860;
        const height = 340;
        const paddingLeft = 75;
        const paddingRight = 35;
        const paddingTop = 35;
        const paddingBottom = 45;

        const chartWidth = width - paddingLeft - paddingRight;
        const chartHeight = height - paddingTop - paddingBottom;

        const showDailyCapLine = (viewMode === 'DAY' || viewMode === 'MONTH') && dailyBudgetCap > 0;
        const maxVal = Math.max(
            ...trendData.map(d => Math.max(d.income, d.expense)),
            showDailyCapLine ? dailyBudgetCap * 1.15 : 0,
            200000
        );

        const yTicks = [0, maxVal * 0.33, maxVal * 0.66, maxVal];
        const denom = Math.max(1, trendData.length - 1);

        const pointsExpense = trendData.map((d, i) => {
            const x = paddingLeft + (i / denom) * chartWidth;
            const y = paddingTop + chartHeight - (d.expense / maxVal) * chartHeight;
            return { x, y, data: d };
        });

        const pointsIncome = trendData.map((d, i) => {
            const x = paddingLeft + (i / denom) * chartWidth;
            const y = paddingTop + chartHeight - (d.income / maxVal) * chartHeight;
            return { x, y, data: d };
        });

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
        const pathIncome = getSmoothPath(pointsIncome);

        const areaExpense = `${pathExpense} L ${pointsExpense[pointsExpense.length - 1].x} ${paddingTop + chartHeight} L ${pointsExpense[0].x} ${paddingTop + chartHeight} Z`;
        const areaIncome = `${pathIncome} L ${pointsIncome[pointsIncome.length - 1].x} ${paddingTop + chartHeight} L ${pointsIncome[0].x} ${paddingTop + chartHeight} Z`;

        const peakExpensePoint = trendData.reduce((max, cur) => cur.expense > max.expense ? cur : max, trendData[0]);
        const dailyCapY = showDailyCapLine ? (paddingTop + chartHeight - (dailyBudgetCap / maxVal) * chartHeight) : null;

        return (
            <div className="space-y-4 py-2">
                <div className="flex flex-wrap items-center justify-between gap-4 px-2 pb-2 text-xs">
                    <div className="flex flex-wrap items-center gap-5">
                        <div className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 rounded-md bg-rose-500 shadow-xs"></span>
                            <span className="font-bold text-slate-700">Đường Chi tiêu</span>
                            <span className="text-slate-400 font-medium">({formatMoney(totalExpense)})</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 rounded-md bg-emerald-500 shadow-xs"></span>
                            <span className="font-bold text-slate-700">Đường Thu nhập</span>
                            <span className="text-slate-400 font-medium">({formatMoney(totalIncome)})</span>
                        </div>
                        {showDailyCapLine && (
                            <div className="flex items-center gap-2">
                                <span className="w-4 border-t-2 border-dashed border-amber-500"></span>
                                <span className="font-bold text-amber-800">Trần ngân sách ngày ({formatMoney(dailyBudgetCap)})</span>
                            </div>
                        )}
                    </div>

                    {peakExpensePoint && peakExpensePoint.expense > 0 && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold">
                            <span className="material-symbols-outlined text-[15px]">trending_up</span>
                            <span>Đỉnh chi tiêu: {peakExpensePoint.shortLabel} ({formatMoney(peakExpensePoint.expense)})</span>
                        </div>
                    )}
                </div>

                <div className="relative w-full overflow-x-auto">
                    <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[700px] h-[340px]">
                        <defs>
                            <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.28" />
                                <stop offset="90%" stopColor="#ef4444" stopOpacity="0.0" />
                            </linearGradient>
                            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                                <stop offset="90%" stopColor="#10b981" stopOpacity="0.0" />
                            </linearGradient>
                        </defs>

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
                                        strokeDasharray="4 4"
                                        strokeWidth="1"
                                    />
                                    <text
                                        x={paddingLeft - 12}
                                        y={yPos + 4}
                                        textAnchor="end"
                                        fontSize="10"
                                        fill="#94a3b8"
                                        fontWeight="600"
                                    >
                                        {formatMoney(val).replace('đ', '').trim()}
                                    </text>
                                </g>
                            );
                        })}

                        {showDailyCapLine && dailyCapY !== null && (
                            <g>
                                <line
                                    x1={paddingLeft}
                                    y1={dailyCapY}
                                    x2={width - paddingRight}
                                    y2={dailyCapY}
                                    stroke="#f59e0b"
                                    strokeDasharray="6 4"
                                    strokeWidth="2"
                                />
                                <text
                                    x={width - paddingRight - 4}
                                    y={dailyCapY - 6}
                                    textAnchor="end"
                                    fontSize="10"
                                    fill="#b45309"
                                    fontWeight="bold"
                                >
                                    Trần ngày: {formatMoney(dailyBudgetCap)}
                                </text>
                            </g>
                        )}

                        <path d={areaIncome} fill="url(#incomeGradient)" />
                        <path d={areaExpense} fill="url(#expenseGradient)" />

                        <path
                            d={pathIncome}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="3"
                            strokeLinecap="round"
                            className="transition-all duration-500"
                        />
                        <path
                            d={pathExpense}
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="3"
                            strokeLinecap="round"
                            className="transition-all duration-500"
                        />

                        {pointsExpense.map((pt, i) => {
                            const hasExpense = pt.data.expense > 0;
                            const hasIncome = pt.data.income > 0;
                            const isHovered = hoveredPoint && hoveredPoint.key === pt.data.key;
                            const showXLabel = viewMode === 'YEAR'
                                || (viewMode === 'DAY' && (pt.data.key % 3 === 0 || pt.data.key === 23))
                                || (viewMode === 'MONTH' && (pt.data.key === 1 || pt.data.key % 5 === 0 || pt.data.key === trendData.length));

                            return (
                                <g key={i}>
                                    {showXLabel && (
                                        <text
                                            x={pt.x}
                                            y={height - 12}
                                            textAnchor="middle"
                                            fontSize="11"
                                            fill="#64748b"
                                            fontWeight="bold"
                                        >
                                            {pt.data.label}
                                        </text>
                                    )}

                                    <rect
                                        x={pt.x - (chartWidth / trendData.length) / 2}
                                        y={paddingTop}
                                        width={chartWidth / trendData.length}
                                        height={chartHeight}
                                        fill="transparent"
                                        className="cursor-pointer"
                                        onMouseEnter={() => setHoveredPoint(pt.data)}
                                        onMouseLeave={() => setHoveredPoint(null)}
                                    />

                                    {hasExpense && (
                                        <circle
                                            cx={pt.x}
                                            cy={pt.y}
                                            r={isHovered ? 6 : 4}
                                            fill="#ef4444"
                                            stroke="#ffffff"
                                            strokeWidth="2"
                                            className="transition-all"
                                        />
                                    )}

                                    {hasIncome && (
                                        <circle
                                            cx={pointsIncome[i].x}
                                            cy={pointsIncome[i].y}
                                            r={isHovered ? 6 : 4}
                                            fill="#10b981"
                                            stroke="#ffffff"
                                            strokeWidth="2"
                                            className="transition-all"
                                        />
                                    )}
                                </g>
                            );
                        })}
                    </svg>

                    {hoveredPoint && (
                        <div
                            className="absolute top-2 right-4 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-slate-200 text-xs animate-in fade-in duration-200 pointer-events-none min-w-[200px]"
                        >
                            <p className="font-extrabold text-slate-800 pb-1.5 border-b border-slate-100 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[15px] text-blue-600">calendar_today</span>
                                {hoveredPoint.title}
                            </p>
                            <div className="space-y-1.5 pt-2">
                                <div className="flex justify-between items-center text-emerald-600 font-bold">
                                    <span>Thu nhập:</span>
                                    <span>+{formatMoney(hoveredPoint.income)}</span>
                                </div>
                                <div className="flex justify-between items-center text-rose-600 font-bold">
                                    <span>Chi tiêu:</span>
                                    <span>-{formatMoney(hoveredPoint.expense)}</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-700 font-extrabold pt-1 border-t border-slate-100">
                                    <span>Dòng tiền:</span>
                                    <span>{hoveredPoint.income - hoveredPoint.expense >= 0 ? '+' : ''}{formatMoney(hoveredPoint.income - hoveredPoint.expense)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-bold text-slate-600">Đang tải và phân tích dữ liệu tài chính...</p>
            </div>
        );
    }

    const currentYear = new Date().getFullYear();
    const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

    return (
        <div className="bg-[#fcf8f4] text-slate-800 min-h-screen flex font-sans antialiased">
            {/* Sidebar */}
            <aside className="h-full w-64 fixed left-0 top-0 bg-white flex flex-col p-4 border-r border-amber-100/80 shadow-xs z-50">
                <div className="mb-8 px-4 pt-4">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
                        <img src="/Teemoney.png" alt="Temoney Logo" className="w-10 h-10 object-contain drop-shadow-sm" />
                        <div>
                            <h1 className="font-black text-amber-950 text-xl tracking-tight">Temoney</h1>
                            <p className="text-[10px] font-bold text-amber-700 tracking-widest uppercase">{t('nav.premiumTier', 'GÓI PREMIUM')}</p>
                        </div>
                    </div>
                </div>
                <nav className="flex-1 space-y-2">
                    <NavItem icon="dashboard" label={t('nav.dashboard', 'Dashboard')} onClick={() => navigate('/dashboard')} />
                    <NavItem icon="receipt_long" label={t('nav.activity', 'Lịch sử')} onClick={() => navigate('/activity')} />
                    <NavItem icon="add_circle" label={t('nav.addNew', 'Thêm mới')} onClick={() => navigate('/addnew')} />
                    <NavItem icon="pie_chart" label={t('nav.analytics', 'Phân tích')} active />
                    <NavItem icon="account_balance_wallet" label={t('nav.budgets', 'Ngân sách')} onClick={() => navigate('/budget')} />
                    <div className="my-2 border-t border-amber-100"></div>
                    <NavItem icon="groups" label={t('nav.group', 'Chi tiêu nhóm')} onClick={() => navigate('/group')} />
                    {localStorage.getItem('role') === 'ROLE_ADMIN' && (
                        <NavItem icon="shield_person" label="Quản trị hệ thống" onClick={() => navigate('/admin')} />
                    )}
                </nav>
                <div className="mt-auto pt-4 border-t border-amber-100 flex flex-col gap-2">
                    <NavItem icon="settings" label={t('nav.settings', 'Cài đặt')} onClick={openSettings} />
                    <UserProfileBadge
                        profileData={profileData}
                        onProfileUpdated={(updated) => setProfileData(prev => ({ ...prev, ...updated }))}
                    />
                </div>
            </aside>

            {/* Main Content */}
            <main className="ml-64 flex-1 p-8 pb-24 max-w-7xl">
                {/* Header & Bộ chuyển đổi Ngày / Tháng / Năm */}
                <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 mb-8">
                    <div>
                        <h2 className="text-3xl font-black text-amber-950 tracking-tight">Báo cáo & Phân tích Tài chính</h2>
                        <p className="text-slate-500 mt-1">
                            Đánh giá tức thì theo <b>Ngày, Tháng, Năm</b> & chia ngân sách ngày thông minh bởi Trợ lý AI
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {/* 3 Tabs: Theo Ngày | Theo Tháng | Theo Năm */}
                        <div className="inline-flex items-center bg-white p-1 rounded-xl border border-amber-200/80 shadow-xs">
                            {[
                                { id: 'DAY', label: 'Theo Ngày', icon: 'today' },
                                { id: 'MONTH', label: 'Theo Tháng', icon: 'calendar_month' },
                                { id: 'YEAR', label: 'Theo Năm', icon: 'calendar_view_month' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setViewMode(tab.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        viewMode === tab.id
                                            ? 'bg-amber-600 text-white shadow-xs'
                                            : 'text-slate-500 hover:text-amber-950 hover:bg-amber-50'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[15px]">{tab.icon}</span>
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Bộ chọn ngày / tháng / năm tương ứng */}
                        <div className="inline-flex items-center gap-2 bg-white border border-amber-200/80 px-3.5 py-2 rounded-xl shadow-xs">
                            <span className="material-symbols-outlined text-[18px] text-amber-600">
                                {viewMode === 'DAY' ? 'today' : viewMode === 'MONTH' ? 'calendar_month' : 'event'}
                            </span>
                            {viewMode === 'DAY' && (
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="text-sm font-bold text-slate-800 bg-transparent border-none outline-none cursor-pointer"
                                />
                            )}
                            {viewMode === 'MONTH' && (
                                <input
                                    type="month"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="text-sm font-bold text-slate-800 bg-transparent border-none outline-none cursor-pointer"
                                />
                            )}
                            {viewMode === 'YEAR' && (
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                                    className="text-sm font-bold text-slate-800 bg-transparent border-none outline-none cursor-pointer pr-2"
                                >
                                    {yearOptions.map(y => (
                                        <option key={y} value={y}>Năm {y}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>
                </header>

                {/* KPI Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    {/* Tổng Thu nhập */}
                    <div className="bg-white p-6 rounded-2xl border border-amber-100/80 shadow-xs flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-2xl">arrow_downward</span>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng Thu nhập</p>
                            <p className="text-2xl font-black text-slate-900 mt-0.5">+{formatMoney(totalIncome)}</p>
                            <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px]">verified</span> {periodLabel}
                            </p>
                        </div>
                    </div>

                    {/* Tổng Chi tiêu */}
                    <div className="bg-white p-6 rounded-2xl border border-amber-100/80 shadow-xs flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-2xl">arrow_upward</span>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng Chi tiêu</p>
                            <p className="text-2xl font-black text-slate-900 mt-0.5">-{formatMoney(totalExpense)}</p>
                            <p className="text-[11px] text-rose-500 font-semibold mt-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px]">pie_chart</span> {categoryBreakdown.length} danh mục ({txCountInPeriod} giao dịch)
                            </p>
                        </div>
                    </div>

                    {/* Dòng tiền ròng / Ngân sách ngày */}
                    {viewMode === 'DAY' && dailyBudgetCap > 0 ? (
                        <div className={`p-6 rounded-2xl text-white shadow-sm flex items-center gap-4 ${
                            dailyBudgetCap - totalExpense >= 0
                                ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                                : 'bg-gradient-to-br from-rose-600 to-red-700'
                        }`}>
                            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 text-white">
                                <span className="material-symbols-outlined text-2xl">
                                    {dailyBudgetCap - totalExpense >= 0 ? 'speed' : 'warning'}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider opacity-85">
                                    Ngân sách Ngày ({formatMoney(dailyBudgetCap)})
                                </p>
                                <p className="text-2xl font-black mt-0.5">
                                    {dailyBudgetCap - totalExpense >= 0 ? 'Còn +' : 'Vượt -'}
                                    {formatMoney(Math.abs(dailyBudgetCap - totalExpense))}
                                </p>
                                <p className="text-[11px] font-bold mt-1 opacity-90">
                                    Chia từ quỹ tháng {formatMoney(monthlyBudgetTotal)} / {daysInActiveMonth} ngày
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className={`p-6 rounded-2xl text-white shadow-sm flex items-center gap-4 ${
                            savingAmount >= 0
                                ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                                : 'bg-gradient-to-br from-rose-600 to-red-700'
                        }`}>
                            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 text-white">
                                <span className="material-symbols-outlined text-2xl">
                                    {savingAmount >= 0 ? 'account_balance' : 'warning'}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider opacity-80">
                                    {savingAmount >= 0 ? 'Thặng dư (Tiết kiệm)' : 'Thâm hụt tài chính'}
                                </p>
                                <p className="text-2xl font-black mt-0.5">
                                    {savingAmount >= 0 ? '+' : ''}{formatMoney(savingAmount)}
                                </p>
                                <p className="text-[11px] font-bold mt-1 opacity-90">
                                    {totalIncome > 0
                                        ? (savingAmount >= 0 ? `Giữ lại ${savingPercent}% thu nhập` : 'Chi tiêu đang vượt quá thu nhập')
                                        : `Chưa có thu nhập trong ${periodLabel}`}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* THANH TIẾN ĐỘ ĐỊNH MỨC NGÂN SÁCH NGÀY (CHỈ HIỆN KHI XEM THEO NGÀY) */}
                {viewMode === 'DAY' && (
                    <div className="bg-white rounded-2xl p-5 border border-amber-200/80 shadow-xs mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        {dailyBudgetCap > 0 ? (
                            <>
                                <div className="flex-1 w-full">
                                    <div className="flex items-center justify-between text-xs font-bold mb-2">
                                        <span className="text-amber-950 flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-base text-amber-600">bolt</span>
                                            Định mức chi tiêu ngày (Tự động chia từ ngân sách tháng {formatMoney(monthlyBudgetTotal)} ÷ {daysInActiveMonth} ngày)
                                        </span>
                                        <span className={totalExpense > dailyBudgetCap ? 'text-rose-600 font-black' : 'text-emerald-600 font-black'}>
                                            {((totalExpense / dailyBudgetCap) * 100).toFixed(1)}% trần ngày
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${
                                                totalExpense > dailyBudgetCap
                                                    ? 'bg-rose-500'
                                                    : totalExpense >= dailyBudgetCap * 0.8
                                                    ? 'bg-amber-500'
                                                    : 'bg-emerald-500'
                                            }`}
                                            style={{ width: `${Math.min((totalExpense / dailyBudgetCap) * 100, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="shrink-0 bg-amber-50 border border-amber-200/70 px-4 py-2.5 rounded-xl text-xs">
                                    <p className="text-amber-900 font-bold">
                                        Gợi ý ngày tiếp theo: <span className="text-amber-700 font-black">{formatMoney(adjustedDailyAllowance)}/ngày</span>
                                    </p>
                                    <p className="text-[10px] text-amber-700/80">cho {remainingDaysInMonth} ngày còn lại trong tháng</p>
                                </div>
                            </>
                        ) : (
                            <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 text-xs text-slate-600">
                                    <span className="material-symbols-outlined text-amber-600">info</span>
                                    <span>Bạn chưa cài đặt Ngân sách cho tháng <b>{activeMonthForBudget}</b> nên chưa có trần chi tiêu theo ngày.</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigate('/budget')}
                                    className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer shrink-0"
                                >
                                    Thiết lập Ngân sách tháng ngay
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ========================================================================= */}
                {/* KHU VỰC BIỂU ĐỒ LỚN & NÚT CHỌN 1 TRONG 2 BIỂU ĐỒ (TRÒN HOẶC ĐƯỜNG) */}
                {/* ========================================================================= */}
                <div className="bg-white rounded-[2rem] p-7 border border-amber-100/80 shadow-xs mb-8">
                    {/* Header biểu đồ & Bộ nút chuyển đổi */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-100">
                        <div>
                            <h3 className="text-xl font-black text-amber-950 tracking-tight flex items-center gap-2">
                                <span className="material-symbols-outlined text-amber-600">analytics</span>
                                Trực quan hóa Dòng tiền & Cơ cấu Chi tiêu
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                                {chartType === 'PIE'
                                    ? `Biểu đồ tròn phân tách tỷ trọng chi tiêu trong ${periodLabel}`
                                    : viewMode === 'DAY'
                                        ? `Biểu đồ đường nhịp điệu thu - chi theo 24 giờ trong ${periodLabel}`
                                        : viewMode === 'MONTH'
                                            ? `Biểu đồ đường xu hướng thu - chi từng ngày trong ${periodLabel}`
                                            : `Biểu đồ đường tổng hợp thu - chi 12 tháng của ${periodLabel}`}
                            </p>
                        </div>

                        {/* NÚT BẤM CHUYỂN ĐỔI: BIỂU ĐỒ TRÒN HOẶC ĐƯỜNG */}
                        <div className="inline-flex items-center bg-amber-100/50 p-1.5 rounded-2xl shadow-inner border border-amber-200/60">
                            <button
                                type="button"
                                onClick={() => setChartType('PIE')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    chartType === 'PIE'
                                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20 scale-[1.02]'
                                        : 'text-slate-600 hover:text-amber-950 hover:bg-white/60'
                                }`}
                                title="Xem biểu đồ tròn cơ cấu danh mục"
                            >
                                <span className="material-symbols-outlined text-[17px]">donut_large</span>
                                <span>Biểu đồ tròn (Cơ cấu)</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setChartType('LINE')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    chartType === 'LINE'
                                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20 scale-[1.02]'
                                        : 'text-slate-600 hover:text-amber-950 hover:bg-white/60'
                                }`}
                                title="Xem biểu đồ đường xu hướng thời gian"
                            >
                                <span className="material-symbols-outlined text-[17px]">show_chart</span>
                                <span>Biểu đồ đường (Xu hướng)</span>
                            </button>
                        </div>
                    </div>

                    {/* Vùng hiển thị Biểu đồ lớn */}
                    <div className="pt-4 min-h-[420px]">
                        {chartType === 'PIE' ? renderPieChart() : renderLineChart()}
                    </div>
                </div>

                {/* ========================================================================= */}
                {/* KHU VỰC AI TỰ ĐỘNG ĐÁNH GIÁ TÌNH HÌNH SỬ DỤNG VÀ ĐƯA RA LỜI KHUYÊN */}
                {/* ========================================================================= */}
                <div className="bg-gradient-to-br from-[#241a12] via-[#2d2015] to-[#1c140d] rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden mb-8 border border-amber-500/20">
                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                        <span className="material-symbols-outlined text-[200px]">psychology</span>
                    </div>

                    <div className="relative z-10">
                        {/* Tiêu đề AI Advisor */}
                        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
                            <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
                                    <span className="material-symbols-outlined text-2xl">auto_awesome</span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xl font-black tracking-tight text-white">Chuyên gia Tài chính AI</h3>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase tracking-wider">
                                            {viewMode === 'DAY' ? 'Đánh giá tức thì 1 ngày' : viewMode === 'MONTH' ? 'Đánh giá theo Tháng' : 'Đánh giá theo Năm'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-amber-200/80 mt-0.5">
                                        {viewMode === 'DAY'
                                            ? `Đối chiếu trực tiếp chi tiêu ${periodLabel} với hạn mức ngày chia từ ngân sách tháng`
                                            : `Phân tích dòng tiền, danh mục chi tiêu và kỷ luật ngân sách cho ${periodLabel}`}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={runAutoFinancialAnalysis}
                                disabled={isAnalyzing}
                                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/20 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            >
                                <span className={`material-symbols-outlined text-sm ${isAnalyzing ? 'animate-spin' : ''}`}>sync</span>
                                <span>{isAnalyzing ? 'Đang phân tích...' : 'Làm mới đánh giá AI'}</span>
                            </button>
                        </div>

                        {/* Nội dung đánh giá tự động từ AI */}
                        {aiAnalysis && (
                            <div className="pt-6 space-y-6">
                                {/* Hàng 1: Điểm Sức khỏe Tài chính & Tình hình sử dụng */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                                    {/* Điểm Sức khỏe Tài chính */}
                                    <div className="lg:col-span-4 bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 flex flex-col items-center justify-center text-center">
                                        <span className="text-xs font-bold uppercase tracking-widest text-amber-200/70 mb-3">
                                            Điểm Sức khỏe Tài chính
                                        </span>
                                        <div className="relative w-28 h-28 flex items-center justify-center">
                                            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                                <circle cx="50" cy="50" r="42" fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                                                <circle
                                                    cx="50"
                                                    cy="50"
                                                    r="42"
                                                    fill="transparent"
                                                    stroke={aiAnalysis.score >= 80 ? '#10b981' : aiAnalysis.score >= 60 ? '#f59e0b' : '#ef4444'}
                                                    strokeWidth="8"
                                                    strokeDasharray="264"
                                                    strokeDashoffset={264 - (264 * aiAnalysis.score) / 100}
                                                    strokeLinecap="round"
                                                    className="transition-all duration-1000 ease-out"
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="text-3xl font-black text-white">{aiAnalysis.score}</span>
                                                <span className="text-[10px] font-bold text-amber-200">/ 100</span>
                                            </div>
                                        </div>
                                        <div className="mt-3">
                                            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${aiAnalysis.grade.badge}`}>
                                                {aiAnalysis.grade.label}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Nhận định chi tiết tình hình sử dụng */}
                                    <div className="lg:col-span-8 bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 flex flex-col justify-center space-y-3">
                                        <h4 className="text-sm font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[18px]">fact_check</span>
                                            Đánh giá Tình hình Sử dụng Dòng tiền
                                        </h4>
                                        <div className="space-y-2.5">
                                            {aiAnalysis.assessments.map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-amber-100/90 leading-relaxed"
                                                >
                                                    <span className={`material-symbols-outlined text-[18px] shrink-0 mt-0.5 ${
                                                        item.type === 'danger' ? 'text-rose-400' : item.type === 'warning' ? 'text-amber-400' : 'text-emerald-400'
                                                    }`}>
                                                        {item.icon}
                                                    </span>
                                                    <span>{item.text}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Hàng 2: Lời khuyên Hành động Cụ thể từ AI */}
                                <div className="space-y-3">
                                    <h4 className="text-sm font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]">lightbulb</span>
                                        Lời khuyên & Kế hoạch Hành động từ AI
                                    </h4>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {aiAnalysis.recommendations.map((rec, idx) => (
                                            <div
                                                key={idx}
                                                className="bg-white/10 hover:bg-white/15 transition-all p-5 rounded-2xl border border-white/10 flex flex-col justify-between"
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2.5 mb-2.5">
                                                        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-amber-300 shrink-0">
                                                            <span className="material-symbols-outlined text-[18px]">{rec.icon}</span>
                                                        </div>
                                                        <h5 className="font-bold text-sm text-white line-clamp-1">{rec.title}</h5>
                                                    </div>
                                                    <p className="text-xs text-amber-100/80 leading-relaxed">{rec.desc}</p>
                                                </div>
                                                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] font-bold text-amber-300">
                                                    <span>Ưu tiên #{idx + 1}</span>
                                                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ========================================================================= */}
                {/* TIẾN ĐỘ NGÂN SÁCH 6 LỌ (TỰ ĐỘNG CHIA THEO NGÀY / THÁNG / NĂM) */}
                {/* ========================================================================= */}
                <div className="bg-white rounded-[2rem] p-7 border border-amber-100/80 shadow-xs">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-black text-amber-950 tracking-tight flex items-center gap-2">
                                <span className="material-symbols-outlined text-amber-600">account_balance_wallet</span>
                                {viewMode === 'DAY'
                                    ? `Hạn mức Ngân sách Ngày (${periodLabel})`
                                    : viewMode === 'MONTH'
                                        ? `Tiến độ Ngân sách 6 Lọ (${periodLabel})`
                                        : `Tổng hợp Ngân sách (${periodLabel})`}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {viewMode === 'DAY'
                                    ? `Mỗi lọ được chia đều cho ${daysInActiveMonth} ngày từ ngân sách tháng để bạn kiểm soát ngay trong ngày`
                                    : 'Đối chiếu chi tiêu thực tế với hạn mức đã phân bổ'}
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/budget')}
                            className="text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200/60 transition-all flex items-center gap-1 cursor-pointer"
                        >
                            <span>Quản lý Ngân sách</span>
                            <span className="material-symbols-outlined text-sm">chevron_right</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {budgetBreakdown.length > 0 ? budgetBreakdown.map((budget, i) => (
                            <div key={i} className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 hover:shadow-md hover:bg-white transition-all">
                                <div className="flex justify-between items-center mb-2.5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-800 shadow-2xs">
                                            <span className="material-symbols-outlined text-[17px]">{budget.icon}</span>
                                        </div>
                                        <span className="text-xs font-bold text-slate-800 truncate max-w-[140px]">{budget.name}</span>
                                    </div>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-lg font-extrabold uppercase ${
                                        budget.percent >= 100
                                            ? 'bg-red-100 text-red-700'
                                            : budget.percent >= 80
                                            ? 'bg-orange-100 text-orange-700'
                                            : 'bg-emerald-100 text-emerald-700'
                                    }`}>
                                        {budget.statusText}
                                    </span>
                                </div>

                                <div className="w-full bg-slate-200/80 rounded-full h-2 mb-2 overflow-hidden">
                                    <div
                                        className={`${budget.color} h-2 rounded-full transition-all duration-700`}
                                        style={{ width: `${Math.min(budget.percent, 100)}%` }}
                                    ></div>
                                </div>

                                <div className="flex justify-between text-xs font-semibold">
                                    <span className="text-slate-500">
                                        {viewMode === 'DAY' ? 'Hôm nay: ' : 'Đã tiêu: '}
                                        <b className="text-slate-800">{formatMoney(budget.spent)}</b>
                                    </span>
                                    <span className="text-slate-400">
                                        / {formatMoney(budget.limit)}{viewMode === 'DAY' ? '/ngày' : ''}
                                    </span>
                                </div>
                                {viewMode === 'DAY' && (
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        Quỹ tháng: {formatMoney(budget.monthlyLimit)} (đã tiêu tháng: {formatMoney(budget.monthlySpent)})
                                    </p>
                                )}
                            </div>
                        )) : (
                            <div className="col-span-full text-center py-10 text-slate-400 flex flex-col items-center gap-2">
                                <span className="material-symbols-outlined text-4xl text-slate-300">account_balance_wallet</span>
                                <p className="text-sm font-semibold">Chưa thiết lập ngân sách cho {periodLabel}.</p>
                                <button
                                    onClick={() => navigate('/budget')}
                                    className="mt-2 text-xs font-bold text-white bg-amber-500 px-4 py-2 rounded-xl shadow-sm hover:bg-amber-600 shadow-amber-500/20 transition-all cursor-pointer"
                                >
                                    Thiết lập Ngân sách ngay
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Nút tròn thêm giao dịch mới nổi góc dưới (đặt cao hơn Chatbot để không chồng lấp) */}
            <button
                onClick={() => navigate('/addnew')}
                className="fixed bottom-32 md:bottom-36 right-4 md:right-6 w-12 h-12 bg-amber-500 text-white rounded-full shadow-xl shadow-amber-500/30 flex items-center justify-center hover:bg-amber-600 hover:scale-110 active:scale-95 transition-all z-30 cursor-pointer"
                title="Thêm giao dịch mới"
            >
                <span className="material-symbols-outlined text-2xl">add</span>
            </button>
        </div>
    );
};

const NavItem = ({ icon, label, active = false, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 hover:translate-x-1 cursor-pointer text-left ${
            active 
                ? 'bg-amber-500 text-white font-bold shadow-sm shadow-amber-500/20' 
                : 'text-slate-600 hover:bg-amber-50 hover:text-amber-900 font-medium'
        }`}
    >
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
        <span className="text-xs font-semibold">{label}</span>
    </button>
);

export default Analytics;