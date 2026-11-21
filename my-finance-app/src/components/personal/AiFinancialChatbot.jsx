import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const QUICK_PROMPTS = [
    "Hiện tại tôi tiết kiệm được 2 triệu 1 tháng, trong 6 tháng tôi muốn mua xe máy khoảng 15 triệu nhưng không đủ tiền, bạn hãy đưa ra giải pháp từ thói quen sinh hoạt hằng ngày và đầu tư vào đâu để sinh lời an toàn",
    "Tôi có 3 triệu, ngày 3 bữa và cần xăng xe thì chia chi tiêu 1 ngày thế nào, dư đầu tư gì?",
    "Lương 10 triệu thuê trọ hết 2.5 triệu thì chi tiêu và tích sản sao cho hợp lý?",
    "So sánh gửi tiết kiệm ngân hàng, mua vàng và chứng chỉ quỹ ETF với vốn 1 triệu/tháng?",
    "Phân tích ví thực tế của tôi: chấm điểm sức khỏe tài chính và tìm khoản rò rỉ",
    "Chia thu nhập 12 triệu/tháng theo quy tắc 6 chiếc lọ (JARS)",
    "Đang nợ thẻ tín dụng 15 triệu, lương 8 triệu thì lập phác đồ trả nợ thế nào?"
];

const round1000 = (val) => Math.round(val / 1000) * 1000;
const formatVnd = (val) => `${Math.round(Number(val || 0)).toLocaleString('vi-VN')}đ`;

/**
 * Trích xuất tất cả con số tiền tệ kèm ngữ cảnh xung quanh
 */
function extractTaggedAmounts(text) {
    const lower = (text || '').toLowerCase();
    const results = [];
    const regex = /(\d+(?:[.,]\d+)?)\s*(triệu|trieu|tr|củ|nghìn|nghin|ngàn|k|tỷ|ty)\b|(\d{1,3}(?:\.\d{3}){2,3})\b/g;
    let m;
    while ((m = regex.exec(lower)) !== null) {
        let val = 0;
        if (m[1] && m[2]) {
            const num = parseFloat(m[1].replace(',', '.'));
            const unit = m[2];
            if (unit === 'tỷ' || unit === 'ty') val = Math.round(num * 1_000_000_000);
            else if (['triệu', 'trieu', 'tr', 'củ'].includes(unit)) val = Math.round(num * 1_000_000);
            else val = Math.round(num * 1_000);
        } else if (m[3]) {
            const digits = m[3].replace(/[^\d]/g, '');
            if (digits && Number(digits) >= 10000) val = Number(digits);
        }
        if (val <= 0) continue;

        const startCtx = Math.max(0, m.start ?? m.index - 32);
        const endCtx = Math.min(lower.length, m.index + m[0].length + 24);
        const ctx = lower.slice(Math.max(0, m.index - 32), endCtx);

        let role = 'unknown';
        if (['mua', 'xe', 'nhà', 'điện thoại', 'iphone', 'laptop', 'mục tiêu', 'khoảng'].some(k => ctx.includes(k))) {
            role = 'goal';
        } else if (['tiết kiệm', 'để dành', 'dư', 'tích được', 'tích lũy'].some(k => ctx.includes(k))) {
            role = 'saving';
        } else if (['lương', 'thu nhập', 'kiếm được'].some(k => ctx.includes(k))) {
            role = 'income';
        } else if (['trọ', 'thuê nhà', 'nợ', 'trả góp', 'vay'].some(k => ctx.includes(k))) {
            role = 'fixed_or_debt';
        }

        results.push({ value: val, role, ctx });
    }
    return results;
}

function classifyIntent(question) {
    const q = (question || '').toLowerCase();
    if (['nợ', 'trả góp', 'vay', 'thẻ tín dụng', 'lãi vay', 'âm tiền'].some(k => q.includes(k))) return 'DEBT_PAYOFF';
    if ([
        'mua xe', 'mua nhà', 'mua máy tính', 'mua laptop', 'mua điện thoại', 'mua iphone',
        'mục tiêu', 'để dành đủ', 'bao lâu thì đủ', 'cần tiết kiệm bao lâu', 'không đủ tiền',
        'tiết kiệm được', 'muốn mua'
    ].some(k => q.includes(k))) return 'GOAL_SAVING';
    if (['vàng', 'gửi tiết kiệm', 'ngân hàng nào', 'lãi suất', 'cổ phiếu', 'chứng khoán', 'trái phiếu', 'etf', 'so sánh', 'kênh nào'].some(k => q.includes(k)) && !['bữa', 'xăng', '1 ngày'].some(k => q.includes(k))) return 'ASSET_COMPARE';
    if (['ví của tôi', 'lịch sử của tôi', 'tôi đã tiêu', 'rò rỉ', 'lãng phí', 'sức khỏe tài chính', 'kiểm toán', 'đánh giá chi tiêu'].some(k => q.includes(k))) return 'WALLET_AUDIT';
    if (['6 chiếc lọ', '6 lọ', 'sáu chiếc lọ', '50/30/20', '50-30-20', 'phân bổ lương'].some(k => q.includes(k))) return 'SIX_JARS';
    if (['là gì', 'như thế nào là', 'khác gì', 'có an toàn không', 'lạm phát', 'bắt đầu từ đâu'].some(k => q.includes(k))) return 'KNOWLEDGE_QA';
    if (['bữa', '1 ngày', 'mỗi ngày', 'xăng', 'ăn sáng', 'ăn trưa', 'ăn tối', 'sinh hoạt', 'thuê trọ', 'tiền trọ'].some(k => q.includes(k))) return 'DAILY_PLAN';
    if (extractTaggedAmounts(q).length > 0) return 'DAILY_PLAN';
    return 'GENERAL_FINANCE';
}

function calcDcaProjections(monthlyContribution) {
    const p = Math.max(100000, monthlyContribution);
    const calcFv = (amt, annualRate, years) => {
        const r = annualRate / 12;
        const n = years * 12;
        return round1000(amt * (((Math.pow(1 + r, n) - 1) / r) * (1 + r)));
    };
    return [
        {
            scenario: 'Tiết kiệm Ngân hàng (5.5%/năm)',
            year_1_total: calcFv(p, 0.055, 1),
            year_3_total: calcFv(p, 0.055, 3),
            year_5_total: calcFv(p, 0.055, 5)
        },
        {
            scenario: 'Quỹ Trái phiếu (7.5%/năm)',
            year_1_total: calcFv(p, 0.075, 1),
            year_3_total: calcFv(p, 0.075, 3),
            year_5_total: calcFv(p, 0.075, 5)
        },
        {
            scenario: 'Quỹ Cổ phiếu / ETF VN30 (12%/năm)',
            year_1_total: calcFv(p, 0.12, 1),
            year_3_total: calcFv(p, 0.12, 3),
            year_5_total: calcFv(p, 0.12, 5)
        }
    ];
}

/**
 * Bộ suy luận Tài chính & Tích sản (Hoạt động 100% không cần API key phía người dùng)
 */
function runSmartFinancialEngine(question, context, history = []) {
    let intent = classifyIntent(question);
    const qLower = (question || '').toLowerCase();
    let taggedAmounts = extractTaggedAmounts(question);

    // Bộ nhớ hội thoại đa lượt: nếu câu sau hỏi nối tiếp không nhắc lại số tiền
    if (taggedAmounts.length === 0 && Array.isArray(history) && history.length > 0) {
        for (let i = history.length - 1; i >= 0; i--) {
            const prevText = history[i].text || history[i].reply || '';
            const prevTagged = extractTaggedAmounts(prevText);
            if (prevTagged.length > 0) {
                taggedAmounts = prevTagged;
                if (intent === 'GENERAL_FINANCE') intent = classifyIntent(prevText);
                break;
            }
        }
    }

    const amounts = taggedAmounts.map(a => a.value);
    const totalBalance = Number(context?.totalBalance || 0);
    const monthlyIncome = Number(context?.monthlyIncome || 0);
    const monthlyExpense = Number(context?.monthlyExpense || 0);
    const topCat = context?.topExpenseCategory || 'Ăn uống';
    const topAmt = Number(context?.topExpenseAmount || 0);

    let leakInsight = null;
    if (topAmt >= 150000) {
        const cut20 = round1000(topAmt * 0.20);
        const r = 0.10 / 12;
        const fv3y = round1000(cut20 * (((Math.pow(1 + r, 36) - 1) / r) * (1 + r)));
        leakInsight = {
            top_category: topCat,
            current_spent: topAmt,
            suggested_cut_20_percent: cut20,
            future_value_3_years: fv3y
        };
    }

    // 1. KỊCH BẢN MỤC TIÊU TÀI CHÍNH & PHÂN TÍCH THIẾU HỤT (GAP ANALYSIS)
    if (intent === 'GOAL_SAVING') {
        const goalFound = taggedAmounts.find(a => a.role === 'goal')?.value;
        let savingFound = taggedAmounts.find(a => a.role === 'saving')?.value;
        const incomeFound = taggedAmounts.find(a => a.role === 'income')?.value;

        const targetGoal = goalFound || (amounts.length > 0 ? Math.max(...amounts) : 15_000_000);
        const mHorizon = qLower.match(/(?:trong|sau|vòng|kỳ hạn|tới)\s*(\d+)\s*tháng/);
        const allMonthMatches = [...qLower.matchAll(/(\d+)\s*tháng/g)].map(m => Number(m[1]));
        const mYears = qLower.match(/(?:trong|sau|vòng|kỳ hạn|tới)?\s*(\d+)\s*năm/);
        let months = 6;
        if (mHorizon) {
            months = Number(mHorizon[1]);
        } else if (allMonthMatches.length > 0) {
            const nonOne = allMonthMatches.filter(m => m > 1);
            months = nonOne.length > 0 ? nonOne[0] : allMonthMatches[allMonthMatches.length - 1];
        } else if (mYears) {
            months = Number(mYears[1]) * 12;
        }
        months = Math.max(1, Math.min(120, months));

        if (savingFound === undefined && amounts.length >= 2) {
            const others = amounts.filter(v => v !== targetGoal);
            if (others.length > 0 && others[0] < targetGoal) savingFound = others[0];
        }

        if (savingFound !== undefined) {
            const rSafe = 0.058 / 12;
            const principalTotal = savingFound * months;
            const projectedTotal = round1000(savingFound * (((Math.pow(1 + rSafe, months) - 1) / rSafe) * (1 + rSafe)));
            const interestEarned = Math.max(0, projectedTotal - principalTotal);
            const shortfall = Math.max(0, targetGoal - projectedTotal);

            if (shortfall > 0) {
                const extraMonthly = round1000(shortfall / months);
                const extraDaily = Math.max(1000, round1000(extraMonthly / 30));
                const newMonthlySaving = savingFound + extraMonthly;
                const monthsIfUnchanged = Math.ceil(targetGoal / Math.max(100000, savingFound));

                const habit1 = round1000(extraMonthly * 0.45);
                const habit2 = round1000(extraMonthly * 0.35);
                const habit3 = Math.max(50000, extraMonthly - habit1 - habit2);

                const habitSwaps = [
                    {
                        title: 'Tự pha cà phê / nước mang đi',
                        amount: round1000(extraDaily * 0.45),
                        categoryKeyword: 'ăn uống',
                        icon: 'local_cafe',
                        note: `Giảm 3-4 ly quán/tuần để tiết kiệm ~${formatVnd(habit1)}/tháng`
                    },
                    {
                        title: 'Nấu ăn tối / mang cơm trưa 3 buổi/tuần',
                        amount: round1000(extraDaily * 0.35),
                        categoryKeyword: 'ăn uống',
                        icon: 'lunch_dining',
                        note: `Thay cơm quán bằng tự nấu để dư thêm ~${formatVnd(habit2)}/tháng`
                    },
                    {
                        title: 'Cắt phí ship & mua sắm ngẫu hứng',
                        amount: Math.max(1000, extraDaily - round1000(extraDaily * 0.45) - round1000(extraDaily * 0.35)),
                        categoryKeyword: 'mua sắm',
                        icon: 'savings',
                        note: `Gom đơn online & hạn chế ăn vặt (~${formatVnd(habit3)}/tháng)`
                    }
                ];

                const isShortTerm = months <= 12;
                const allocations = isShortTerm
                    ? [
                        {
                            channel: 'Tiết kiệm Tích lũy / Góp Online kỳ hạn 1-3-6 tháng (5.2% - 5.8%/năm)',
                            percent: 60,
                            amount: round1000(newMonthlySaving * 0.60),
                            reason: 'Bảo toàn vốn 100%, khóa kỷ luật để đúng tháng thứ 6 nhận tiền mua xe.'
                        },
                        {
                            channel: 'Chứng chỉ quỹ Trái phiếu TCBF / BVBF (~7.5%/năm)',
                            percent: 30,
                            amount: round1000(newMonthlySaving * 0.30),
                            reason: 'Lợi suất cao hơn ngân hàng, ít biến động, thanh khoản T+2.'
                        },
                        {
                            channel: 'Túi Thần Tài / Tích lũy linh hoạt (4.8%/năm)',
                            percent: 10,
                            amount: Math.max(0, newMonthlySaving - round1000(newMonthlySaving * 0.60) - round1000(newMonthlySaving * 0.30)),
                            reason: 'Đệm dự phòng rút tức thì 24/7 khi có việc đột xuất.'
                        }
                    ]
                    : [
                        { channel: 'Chứng chỉ quỹ Trái phiếu / Tiết kiệm Online (6% - 7.5%/năm)', percent: 60, amount: round1000(newMonthlySaving * 0.60), reason: 'Bảo toàn nền tảng vốn cho mục tiêu.' },
                        { channel: 'Chứng chỉ quỹ Cổ phiếu / ETF VN30 (11% - 13%/năm)', percent: 40, amount: Math.max(0, newMonthlySaving - round1000(newMonthlySaving * 0.60)), reason: 'Tăng tốc lãi kép cho kỳ hạn dài.' }
                    ];

                return {
                    success: true,
                    intent,
                    source: 'smart-goal-gap-solver',
                    reply: `🎯 **Phân tích Bài toán Mua Xe ${formatVnd(targetGoal)} trong ${months} tháng:**\n\n` +
                        `**1. Khoản tiền đang thiếu hụt thực tế:**\n` +
                        `• Tiết kiệm đều **${formatVnd(savingFound)}/tháng** × ${months} tháng = **${formatVnd(principalTotal)}**.\n` +
                        `• Cộng lãi an toàn (~5.8%/năm): **+${formatVnd(interestEarned)}** → Dự kiến đạt **${formatVnd(projectedTotal)}**.\n` +
                        `• **Còn thiếu: ${formatVnd(shortfall)}** → Chỉ cần bù thêm **${formatVnd(extraMonthly)}/tháng** (tức **~${formatVnd(extraDaily)}/ngày**).\n\n` +
                        `**2. Giải pháp từ Thói quen Sinh hoạt Hằng ngày:**\n` +
                        `• **Đồ uống & Ăn vặt:** Tự pha cà phê/trà mang đi 4 ngày/tuần → Dư **~${formatVnd(habit1)}/tháng**.\n` +
                        `• **Bữa ăn (Meal Prep):** Mang cơm trưa hoặc tự nấu tối 3 buổi/tuần → Dư **~${formatVnd(habit2)}/tháng**.\n` +
                        `• **Phí ship & Mua sắm bốc đồng:** Gom đơn online & đợi 24h trước khi đặt → Dư **~${formatVnd(habit3)}/tháng**.\n\n` +
                        `**3. Đầu tư vào đâu để sinh lời an toàn?**\n` +
                        (isShortTerm ? `⚠️ *Kỳ hạn ${months} tháng là ngắn hạn — tuyệt đối KHÔNG lướt sóng cổ phiếu hay crypto để tránh lỗ vốn sát ngày mua xe!*\n` : '') +
                        `• Ngoài ra, nếu giữ nguyên mức ${formatVnd(savingFound)}/tháng, bạn chỉ cần lùi kế hoạch mua xe sang **tháng thứ ${monthsIfUnchanged}** là đủ ${formatVnd(targetGoal)}.`,
                    goal_analysis: {
                        target_goal: targetGoal,
                        months,
                        current_monthly_saving: savingFound,
                        projected_total: projectedTotal,
                        interest_earned: interestEarned,
                        shortfall,
                        extra_monthly_needed: extraMonthly,
                        extra_daily_needed: extraDaily,
                        new_monthly_saving: newMonthlySaving,
                        months_if_unchanged: monthsIfUnchanged
                    },
                    daily_plan: {
                        total_budget: extraMonthly,
                        days: 30,
                        daily_cap: extraDaily,
                        daily_spend: extraDaily,
                        daily_save: extraDaily,
                        total_living_spend: extraMonthly,
                        surplus: shortfall,
                        plan_title: `Thói quen cắt giảm mỗi ngày (+${formatVnd(extraDaily)}/ngày)`,
                        daily_items: habitSwaps
                    },
                    investment_plan: {
                        strategy_title: isShortTerm
                            ? `Kênh Tích Sản An Toàn Kỳ Hạn ${months} Tháng`
                            : `Chiến lược Tích Vốn Đạt ${formatVnd(targetGoal)}`,
                        monthly_investable: newMonthlySaving,
                        allocations,
                        dca_projections: calcDcaProjections(newMonthlySaving)
                    },
                    leak_insight: leakInsight
                };
            }
        }

        const incomeBase = incomeFound || (amounts.length >= 2 ? Math.min(...amounts) : (monthlyIncome > 0 ? monthlyIncome : 9_000_000));
        const rM = 0.058 / 12;
        const monthlyNeeded = round1000((targetGoal * rM) / ((Math.pow(1 + rM, months) - 1) * (1 + rM)));
        const dailyNeeded = round1000(monthlyNeeded / 30);
        const pctIncome = Math.round((monthlyNeeded / Math.max(1, incomeBase)) * 1000) / 10;

        return {
            success: true,
            intent,
            source: 'smart-goal-planner',
            reply: `🎯 **Kế hoạch Chinh phục Mục tiêu ${formatVnd(targetGoal)} trong ${months} tháng:**\n\n` +
                `• **Số tiền cần tích lũy mỗi tháng:** **${formatVnd(monthlyNeeded)}/tháng** (cất đi **${formatVnd(dailyNeeded)}/ngày**).\n` +
                `• **Tỷ trọng trên thu nhập (${formatVnd(incomeBase)}):** Chiếm **${pctIncome}%**.\n` +
                `• **Kênh giữ tiền an toàn:** Gửi vào **Tiết kiệm Tích lũy Online (5.6%/năm)** kết hợp **Quỹ Trái phiếu (7.5%/năm)** để bảo toàn 100% vốn.`,
            daily_plan: null,
            investment_plan: {
                strategy_title: `Phân bổ Quỹ Mục Tiêu ${formatVnd(targetGoal)}`,
                monthly_investable: monthlyNeeded,
                allocations: [
                    { channel: 'Tiết kiệm Tích lũy Online kỳ hạn ngắn (5.6%/năm)', percent: 70, amount: round1000(monthlyNeeded * 0.7), reason: 'Khóa kỷ luật giữ tiền, bảo toàn 100% vốn.' },
                    { channel: 'Chứng chỉ quỹ Trái phiếu (7.5%/năm)', percent: 30, amount: Math.max(0, monthlyNeeded - round1000(monthlyNeeded * 0.7)), reason: 'Lợi suất cao hơn ngân hàng, ít biến động.' }
                ],
                dca_projections: calcDcaProjections(monthlyNeeded)
            },
            leak_insight: leakInsight
        };
    }

    // 2. KỊCH BẢN THOÁT NỢ
    if (intent === 'DEBT_PAYOFF') {
        const debtAmount = amounts.length > 0 ? Math.max(...amounts) : 15_000_000;
        const incomeBase = amounts.length >= 2 ? Math.min(...amounts) : (monthlyIncome > 0 ? monthlyIncome : 8_000_000);
        const monthlyPay = round1000(incomeBase * 0.35);
        const monthsToClear = Math.max(1, Math.ceil(debtAmount / Math.max(100000, monthlyPay)));
        const dailyLivingLeft = round1000((incomeBase - monthlyPay) / 30);

        return {
            success: true,
            intent,
            source: 'smart-debt-advisor',
            reply: `🛡️ **Phác đồ Thoát Nợ Thông Minh (${formatVnd(debtAmount)}):**\n\n` +
                `1. **Chiến thuật Tuyết lở (Avalanche):** Ưu tiên tất toán khoản nợ lãi cao nhất (thẻ tín dụng, vay tiêu dùng) trước tiên. Tạm dừng đầu tư mạo hiểm khi đang mang nợ.\n` +
                `2. **Định mức trả nợ (35% thu nhập = ${formatVnd(monthlyPay)}/tháng):** Bạn sẽ sạch nợ hoàn toàn sau **${monthsToClear} tháng**.\n` +
                `3. **Trần chi tiêu sinh hoạt:** Giới hạn ở mức **${formatVnd(dailyLivingLeft)}/ngày**.`,
            daily_plan: null,
            investment_plan: null,
            leak_insight: leakInsight
        };
    }

    // 3. KỊCH BẢN SO SÁNH KÊNH ĐẦU TƯ
    if (intent === 'ASSET_COMPARE') {
        const cap = amounts[0] || (totalBalance > 0 ? totalBalance : 1_000_000);
        return {
            success: true,
            intent,
            source: 'smart-asset-comparator',
            reply: `📊 **So sánh Thực chiến các Kênh Tích Sản tại Việt Nam (Vốn ${formatVnd(cap)}/tháng):**\n\n` +
                `• **1. Tiết kiệm Online (5.2% - 5.8%/năm):** An toàn tuyệt đối, phù hợp mục tiêu ngắn hạn (< 1 năm).\n` +
                `• **2. Vàng nhẫn 9999 (~8% - 10%/năm):** Giữ giá tốt dài hạn, nhưng cần tích đủ **3.5 - 4.5 triệu** mới mua được 0.5 chỉ.\n` +
                `• **3. Chứng chỉ quỹ Trái phiếu - TCBF, BVBF (6.8% - 7.8%/năm):** Vốn từ **50.000đ**, biến động cực thấp, thanh khoản T+2.\n` +
                `• **4. Chứng chỉ quỹ Cổ phiếu / ETF VN30 (11% - 14%/năm):** Tối ưu tích sản định kỳ (DCA) khung thời gian 2 - 5 năm.`,
            daily_plan: null,
            investment_plan: {
                strategy_title: `Danh mục Khuyến nghị cho Vốn ${formatVnd(cap)}`,
                monthly_investable: cap,
                allocations: [
                    { channel: 'Chứng chỉ quỹ Cổ phiếu / ETF VN30 (VESAF, E1VFVN30)', percent: 50, amount: round1000(cap * 0.50), reason: 'Tối ưu hóa tăng trưởng lãi kép dài hạn 11% - 14%/năm.' },
                    { channel: 'Chứng chỉ quỹ Trái phiếu / Tiết kiệm Online', percent: 30, amount: round1000(cap * 0.30), reason: 'Giữ nhịp sinh lời ổn định 6% - 8%/năm.' },
                    { channel: 'Túi Sinh Lời thanh khoản tức thì 24/7', percent: 20, amount: round1000(cap * 0.20), reason: 'Quỹ dự phòng khẩn cấp rút ngay khi cần.' }
                ],
                dca_projections: calcDcaProjections(cap)
            },
            leak_insight: leakInsight
        };
    }

    // 4. KỊCH BẢN KIỂM TOÁN VÍ THỰC TẾ
    if (intent === 'WALLET_AUDIT') {
        const netSavings = monthlyIncome - monthlyExpense;
        const saveRatio = monthlyIncome > 0 ? Math.round((netSavings / monthlyIncome) * 100) : 0;
        const score = saveRatio >= 20 ? 88 : (saveRatio >= 10 ? 74 : (totalBalance > 0 ? 60 : 45));
        return {
            success: true,
            intent,
            source: 'smart-wallet-auditor',
            reply: `🩺 **Kiểm toán Sức khỏe Tài chính Thực tế từ Ví của bạn (Điểm: ${score}/100):**\n\n` +
                `• **Tổng số dư khả dụng trong các ví:** **${formatVnd(totalBalance)}**\n` +
                `• **Tổng Thu ghi nhận:** **${formatVnd(monthlyIncome)}** | **Tổng Chi:** **${formatVnd(monthlyExpense)}** (Tỷ lệ giữ tiền: **${saveRatio}%**)\n` +
                `• **Danh mục chi nhiều nhất:** **${topCat}** (**${formatVnd(topAmt)}** — qua ${context?.recentTransactionCount || 0} giao dịch).\n\n` +
                `🎯 **Đề xuất hành động ngay:** Thiết lập trần Ngân sách cho **${topCat}** giảm 20% tháng tới để dư thêm **${formatVnd(round1000(topAmt * 0.2))}**.`,
            daily_plan: null,
            investment_plan: null,
            leak_insight: leakInsight
        };
    }

    // 5. KỊCH BẢN 6 CHIẾC LỌ
    if (intent === 'SIX_JARS') {
        const inc = amounts[0] || (monthlyIncome > 0 ? monthlyIncome : 10_000_000);
        const invest20 = round1000(inc * 0.20);
        return {
            success: true,
            intent,
            source: 'smart-six-jars',
            reply: `🏺 **Phân bổ Thu nhập ${formatVnd(inc)}/tháng theo Chuẩn 6 Chiếc Lọ (JARS):**\n\n` +
                `• **1. Thiết yếu (55% — ${formatVnd(round1000(inc * 0.55))}):** Ăn uống, tiền nhà, điện nước, xăng xe.\n` +
                `• **2. Tự do Tài chính / Đầu tư (10% — ${formatVnd(round1000(inc * 0.10))}):** Quỹ ETF/Trái phiếu.\n` +
                `• **3. Tiết kiệm Dài hạn (10% — ${formatVnd(round1000(inc * 0.10))}):** Quỹ dự phòng & mục tiêu lớn.\n` +
                `• **4. Giáo dục (10% — ${formatVnd(round1000(inc * 0.10))}):** Sách, khóa học.\n` +
                `• **5. Hưởng thụ (10% — ${formatVnd(round1000(inc * 0.10))}):** Giải trí.\n` +
                `• **6. Cho đi (5% — ${formatVnd(round1000(inc * 0.05))}):** Quà cáp, thiện nguyện.`,
            daily_plan: null,
            investment_plan: {
                strategy_title: `Kích hoạt Lọ Tự Do Tài Chính & Tiết Kiệm (${formatVnd(invest20)}/tháng)`,
                monthly_investable: invest20,
                allocations: [
                    { channel: 'Lọ Tự do Tài chính (10%) → Quỹ ETF / Cổ phiếu', percent: 50, amount: round1000(inc * 0.10), reason: 'Tích sản lãi kép dài hạn (~12%/năm).' },
                    { channel: 'Lọ Tiết kiệm dài hạn (10%) → Tiết kiệm Online / Trái phiếu', percent: 50, amount: round1000(inc * 0.10), reason: 'Bảo toàn vốn & dự phòng khẩn cấp.' }
                ],
                dca_projections: calcDcaProjections(invest20)
            },
            leak_insight: leakInsight
        };
    }

    // 6. KIẾN THỨC TÀI CHÍNH
    if (intent === 'KNOWLEDGE_QA') {
        return {
            success: true,
            intent,
            source: 'smart-knowledge-base',
            reply: `📘 **Nguyên tắc Vàng Tích Vốn & Lãi Kép:**\n\n` +
                `1. **Quỹ dự phòng:** Giữ 3–6 tháng chi tiêu trong Túi sinh lời / Tiết kiệm linh hoạt (rút 24/7).\n` +
                `2. **Ngắn hạn (< 1 năm):** Chỉ gửi **Tiết kiệm Online** hoặc **Quỹ Trái phiếu** để bảo toàn 100% vốn.\n` +
                `3. **Dài hạn (2–5+ năm):** Tích sản đều (DCA) vào **Quỹ Cổ phiếu / ETF VN30** (~12%/năm).`,
            daily_plan: null,
            investment_plan: null,
            leak_insight: leakInsight
        };
    }

    // 6B. CÂU HỎI TỔNG QUÁT / MỞ RỘNG (KHI CHƯA KẾT NỐI ĐƯỢC SERVER AI 8001)
    if (intent === 'GENERAL_FINANCE') {
        return {
            success: true,
            intent,
            source: 'offline-general-fallback',
            reply: `Tôi đã nhận câu hỏi: **"${question}"**.\n\n` +
                `Hiện tại dịch vụ AI chuyên sâu (\`localhost:8001\`) chưa phản hồi nên hệ thống đang chạy ở chế độ ngoại tuyến.\n` +
                `• **Số dư ví hiện tại:** **${formatVnd(totalBalance)}**\n` +
                `• **Thu / Chi tháng:** **${formatVnd(monthlyIncome)}** / **${formatVnd(monthlyExpense)}**\n\n` +
                `💡 Hãy bật dịch vụ \`ocr-service\` (cổng 8001) để AI trả lời tự do mọi câu hỏi của bạn, hoặc hỏi kèm số tiền cụ thể để tôi tính toán ngay!`,
            daily_plan: null,
            investment_plan: null,
            leak_insight: leakInsight
        };
    }

    // 7. KỊCH BẢN CHIA CHI TIÊU NGÀY (CÓ TRỪ TIỀN TRỌ/CỐ ĐỊNH)
    const totalBudget = amounts[0] || (monthlyIncome > 0 ? monthlyIncome : (totalBalance > 0 ? totalBalance : 3_000_000));
    const fixedCost = (amounts.length >= 2 && amounts[1] < totalBudget) ? amounts[1] : 0;
    const netBudget = Math.max(300_000, totalBudget - fixedCost);

    const mDays = qLower.match(/(\d+)\s*ngày/);
    const days = (mDays && Number(mDays[1]) > 1) ? Math.min(365, Number(mDays[1])) : (qLower.includes('1 tuần') ? 7 : 30);
    const mMeals = qLower.match(/(\d)\s*bữa/);
    const meals = (mMeals && [1, 2, 3, 4].includes(Number(mMeals[1]))) ? Number(mMeals[1]) : 3;
    const fuelDaily = qLower.includes('buýt') ? 7000 : (qLower.includes('đi nhiều') ? 15000 : 10000);

    const dailyCap = Math.floor(netBudget / days);
    const minFoodFloor = meals * 15000;
    const saveRate = dailyCap >= 120000 ? 0.20 : (dailyCap >= 90000 ? 0.15 : (dailyCap >= 75000 ? 0.10 : 0));
    let dailySave = round1000(dailyCap * saveRate);
    if (dailyCap - dailySave - fuelDaily < minFoodFloor) {
        dailySave = Math.max(0, Math.floor((dailyCap - fuelDaily - minFoodFloor) / 1000) * 1000);
    }

    const dailyLiving = Math.max(0, dailyCap - dailySave);
    const dailyFood = Math.max(0, dailyLiving - fuelDaily);

    const dailyItems = [];
    if (meals === 3) {
        const bAmt = round1000(dailyFood * 0.25);
        const lAmt = round1000(dailyFood * 0.40);
        const dAmt = Math.max(0, dailyFood - bAmt - lAmt);
        dailyItems.push(
            { title: 'Ăn sáng', amount: bAmt, categoryKeyword: 'ăn uống', icon: 'ramen_dining', note: 'Bữa sáng (25% quỹ ăn)' },
            { title: 'Ăn trưa', amount: lAmt, categoryKeyword: 'ăn uống', icon: 'lunch_dining', note: 'Bữa trưa (40% quỹ ăn)' },
            { title: 'Ăn tối', amount: dAmt, categoryKeyword: 'ăn uống', icon: 'dinner_dining', note: 'Bữa tối (35% quỹ ăn)' }
        );
    } else {
        const lAmt = round1000(dailyFood * 0.50);
        const dAmt = Math.max(0, dailyFood - lAmt);
        dailyItems.push(
            { title: 'Bữa trưa', amount: lAmt, categoryKeyword: 'ăn uống', icon: 'lunch_dining', note: 'Bữa trưa (50% quỹ ăn)' },
            { title: 'Bữa tối', amount: dAmt, categoryKeyword: 'ăn uống', icon: 'dinner_dining', note: 'Bữa tối (50% quỹ ăn)' }
        );
    }
    if (fuelDaily > 0) {
        dailyItems.push({ title: 'Xăng xe & Di chuyển', amount: fuelDaily, categoryKeyword: 'di chuyển', icon: 'local_gas_station', note: 'Chi phí đi lại hằng ngày' });
    }

    const dailySpend = dailyItems.reduce((s, i) => s + i.amount, 0);
    const totalLivingSpend = dailySpend * days;
    const surplus = Math.max(0, netBudget - totalLivingSpend);
    const investable = surplus > 0 ? surplus : 450000;
    const dcaProj = calcDcaProjections(investable);

    const fixedNote = fixedCost > 0 ? ` (sau khi trừ chi phí cố định/trọ **${formatVnd(fixedCost)}**, còn **${formatVnd(netBudget)}**)` : '';

    return {
        success: true,
        intent,
        source: 'smart-daily-allocator',
        reply: `Dựa trên ngân sách **${formatVnd(totalBudget)}**${fixedNote} trong **${days} ngày** (trần **${formatVnd(dailyCap)}/ngày**):\n\n` +
            `• **Chi sinh hoạt ${meals} bữa + đi lại:** **${formatVnd(dailySpend)}/ngày** (Tổng ${days} ngày: **${formatVnd(totalLivingSpend)}**).\n` +
            `• **Tiền dư tích vốn sinh lời:** **+${formatVnd(surplus)}** (${formatVnd(Math.max(0, dailyCap - dailySpend))}/ngày).\n` +
            `• **Tiềm năng lãi kép (12%/năm):** Sau 3 năm đạt **${formatVnd(dcaProj[2].year_3_total)}**, sau 5 năm đạt **${formatVnd(dcaProj[2].year_5_total)}**!`,
        daily_plan: {
            total_budget: totalBudget,
            days,
            daily_cap: dailyCap,
            daily_spend: dailySpend,
            daily_save: Math.max(0, dailyCap - dailySpend),
            total_living_spend: totalLivingSpend,
            surplus,
            plan_title: `Định mức 1 ngày (${days} ngày)`,
            daily_items: dailyItems
        },
        investment_plan: {
            strategy_title: 'Tháp Phân Bổ Tích Vốn & Sinh Lời (50 - 30 - 20)',
            monthly_investable: investable,
            allocations: [
                { channel: 'Tích lũy linh hoạt / Túi Thần Tài (4.8%/năm)', percent: 50, amount: round1000(investable * 0.50), reason: 'Quỹ dự phòng khẩn cấp rút tức thì 24/7.' },
                { channel: 'Chứng chỉ quỹ Trái phiếu / ETF (Fmarket, Finhay)', percent: 30, amount: round1000(investable * 0.30), reason: 'Tích sản định kỳ vốn nhỏ hưởng lãi kép 7.5% - 12%/năm.' },
                { channel: 'Đầu tư bản thân (Sách / Kỹ năng)', percent: 20, amount: Math.max(0, investable - round1000(investable * 0.50) - round1000(investable * 0.30)), reason: 'Gia tăng thu nhập chủ động lâu dài.' }
            ],
            dca_projections: dcaProj
        },
        leak_insight: leakInsight
    };
}

const AiFinancialChatbot = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [userContext, setUserContext] = useState({
        email: '',
        totalBalance: 0,
        monthlyIncome: 0,
        monthlyExpense: 0,
        topExpenseCategory: '',
        topExpenseAmount: 0,
        recentTransactionCount: 0
    });
    const [appliedMsgId, setAppliedMsgId] = useState(null);
    const messagesEndRef = useRef(null);

    const [messages, setMessages] = useState([
        {
            id: 'welcome',
            role: 'assistant',
            reply: 'Xin chào! Tôi là **Chuyên gia AI Tài chính & Tích sản Temoney**. Hãy hỏi tôi bất kỳ bài toán tài chính nào:\n• *Tiết kiệm 2 triệu/tháng trong 6 tháng muốn mua xe 15 triệu thì thiếu bao nhiêu, cắt thói quen gì & đầu tư đâu an toàn?*\n• *Chia định mức 3 bữa + xăng xe hằng ngày*\n• *Kiểm toán sức khỏe ví & tìm khoản rò rỉ chi tiêu*',
            daily_plan: null,
            investment_plan: null
        }
    ]);

    const hiddenRoutes = ['/', '/login', '/register'];
    const isHidden = hiddenRoutes.includes(location.pathname);

    useEffect(() => {
        if (!isOpen) return;
        const token = localStorage.getItem('token');
        if (!token) return;

        const headers = { Authorization: `Bearer ${token}` };
        Promise.all([
            axios.get('http://localhost:8080/api/accounts', { headers }).catch(() => ({ data: [] })),
            axios.get('http://localhost:8080/api/transactions', { headers }).catch(() => ({ data: [] })),
            axios.get('http://localhost:8080/api/auth/profile', { headers }).catch(() => ({ data: {} }))
        ]).then(([accRes, txRes, profRes]) => {
            const accounts = Array.isArray(accRes.data) ? accRes.data : [];
            const txs = Array.isArray(txRes.data) ? txRes.data : [];
            const totalBalance = accounts.reduce((s, a) => s + Number(a.balance || 0), 0);

            let monthlyIncome = 0;
            let monthlyExpense = 0;
            const catSpend = {};

            txs.forEach(t => {
                const amt = Number(t.amount || 0);
                const type = t.type || t.transactionType || 'EXPENSE';
                if (type === 'INCOME') {
                    monthlyIncome += amt;
                } else {
                    monthlyExpense += amt;
                    const cName = t.categoryName || 'Chi tiêu khác';
                    catSpend[cName] = (catSpend[cName] || 0) + amt;
                }
            });

            const sortedCats = Object.entries(catSpend).sort((a, b) => b[1] - a[1]);
            setUserContext({
                email: profRes.data?.email || localStorage.getItem('username') || 'default',
                totalBalance,
                monthlyIncome,
                monthlyExpense,
                topExpenseCategory: sortedCats[0]?.[0] || '',
                topExpenseAmount: sortedCats[0]?.[1] || 0,
                recentTransactionCount: txs.length
            });
        });
    }, [isOpen]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    if (isHidden) return null;

    const handleSendQuestion = async (customPrompt) => {
        const questionText = (customPrompt ?? input).trim();
        if (!questionText || loading) return;

        const userMsg = { id: `u-${Date.now()}`, role: 'user', text: questionText };
        const historyPayload = messages
            .slice(-6)
            .map(m => ({ role: m.role, text: m.text || m.reply || '' }));

        setMessages(prev => [...prev, userMsg]);
        if (!customPrompt) setInput('');
        setLoading(true);

        try {
            const res = await axios.post(
                'http://localhost:8001/api/v1/chat-advisor',
                {
                    question: questionText,
                    context: userContext,
                    history: historyPayload
                },
                { timeout: 25000 }
            );
            setMessages(prev => [
                ...prev,
                { id: `ai-${Date.now()}`, role: 'assistant', ...res.data }
            ]);
        } catch {
            const fallbackResult = runSmartFinancialEngine(questionText, userContext, historyPayload);
            setMessages(prev => [
                ...prev,
                { id: `ai-${Date.now()}`, role: 'assistant', ...fallbackResult }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleApplyToQuickBills = (msgId, dailyItems) => {
        if (!Array.isArray(dailyItems) || dailyItems.length === 0) return;
        const storageKey = `temoney_quick_bills_${userContext.email || localStorage.getItem('username') || 'default'}`;
        let existing = [];
        try {
            existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
        } catch {
            existing = [];
        }

        const newTemplates = dailyItems.map((item, idx) => ({
            id: `ai-plan-${Date.now()}-${idx}`,
            title: item.title,
            amount: Number(item.amount),
            type: 'EXPENSE',
            categoryKeyword: item.categoryKeyword || 'ăn uống',
            icon: item.icon || 'bolt',
            note: item.note || item.title,
            badge: 'AI Thiết lập',
            isCustom: true
        }));

        const merged = [...newTemplates, ...existing].slice(0, 16);
        localStorage.setItem(storageKey, JSON.stringify(merged));
        setAppliedMsgId(msgId);
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-16 right-4 md:bottom-20 md:right-6 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white font-extrabold text-xs shadow-lg shadow-amber-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-amber-300/40"
                title="Mở Cố vấn Tài chính & Tích sản AI"
            >
                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {isOpen ? 'close' : 'psychology'}
                </span>
                <span>{isOpen ? 'Đóng AI Cố Vấn' : 'AI Cố Vấn Tài Chính'}</span>
            </button>

            {isOpen && (
                <div className="fixed bottom-28 right-4 md:bottom-32 md:right-6 z-[70] w-[calc(100vw-2rem)] sm:w-[460px] max-h-[80vh] bg-white rounded-3xl shadow-2xl border border-amber-200/80 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
                    {/* Header gọn sạch cho End-User (Không bắt user nhập API Key) */}
                    <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-orange-800 text-white px-5 py-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                                <span className="material-symbols-outlined text-xl text-amber-300" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    auto_awesome
                                </span>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-black text-sm tracking-tight">Temoney AI Wealth Advisor</h3>
                                    <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                                        Sẵn sàng
                                    </span>
                                </div>
                                <p className="text-[11px] text-amber-100/80">
                                    Số dư ví: <b>{formatVnd(userContext.totalBalance)}</b>
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-base">close</span>
                        </button>
                    </div>

                    {/* Thanh gợi ý câu hỏi đa chủ đề */}
                    <div className="px-3.5 py-2 bg-amber-50/70 border-b border-amber-100 flex gap-2 overflow-x-auto scrollbar-hide">
                        {QUICK_PROMPTS.map((q, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => handleSendQuestion(q)}
                                className="shrink-0 px-3 py-1.5 rounded-xl bg-white hover:bg-amber-600 text-amber-900 hover:text-white border border-amber-200/80 text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                            >
                                {q.length > 42 ? q.slice(0, 42) + '...' : q}
                            </button>
                        ))}
                    </div>

                    {/* Nội dung hội thoại */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#fcf8f4]">
                        {messages.map((msg) => {
                            if (msg.role === 'user') {
                                return (
                                    <div key={msg.id} className="flex justify-end">
                                        <div className="max-w-[85%] bg-amber-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-xs text-xs font-semibold shadow-xs">
                                            {msg.text}
                                        </div>
                                    </div>
                                );
                            }

                            const ga = msg.goal_analysis;
                            const dp = msg.daily_plan;
                            const ip = msg.investment_plan;
                            const leak = msg.leak_insight;
                            const isApplied = appliedMsgId === msg.id;

                            return (
                                <div key={msg.id} className="space-y-3">
                                    <div className="bg-white border border-amber-100 rounded-2xl rounded-tl-xs p-3.5 shadow-xs space-y-3 text-xs text-slate-700">
                                        <div className="whitespace-pre-line leading-relaxed">
                                            {msg.reply}
                                        </div>

                                        {/* THẺ PHÂN TÍCH THIẾU HỤT MỤC TIÊU (GAP ANALYSIS) */}
                                        {ga && (
                                            <div className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-3 space-y-2">
                                                <div className="flex items-center justify-between border-b border-rose-200/60 pb-1.5">
                                                    <span className="font-black text-rose-950 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-sm text-rose-600">track_changes</span>
                                                        Mục tiêu {formatVnd(ga.target_goal)} ({ga.months} tháng)
                                                    </span>
                                                    <span className="font-black text-rose-600">
                                                        Thiếu {formatVnd(ga.shortfall)}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-center">
                                                    <div className="bg-white p-2 rounded-lg border border-rose-100">
                                                        <p className="text-[10px] text-slate-400 font-bold">Dự kiến đạt</p>
                                                        <p className="text-xs font-black text-slate-800">{formatVnd(ga.projected_total)}</p>
                                                    </div>
                                                    <div className="bg-white p-2 rounded-lg border border-rose-100">
                                                        <p className="text-[10px] text-slate-400 font-bold">Cần bù/tháng</p>
                                                        <p className="text-xs font-black text-rose-600">+{formatVnd(ga.extra_monthly_needed)}</p>
                                                    </div>
                                                    <div className="bg-white p-2 rounded-lg border border-rose-100">
                                                        <p className="text-[10px] text-slate-400 font-bold">Cắt giảm/ngày</p>
                                                        <p className="text-xs font-black text-amber-700">~{formatVnd(ga.extra_daily_needed)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* BẢNG PHÂN BỔ CHI TIÊU / THÓI QUEN HẰNG NGÀY */}
                                        {dp && Array.isArray(dp.daily_items) && (
                                            <div className="bg-amber-50/60 border border-amber-200/70 rounded-xl p-3 space-y-2">
                                                <div className="flex items-center justify-between border-b border-amber-200/60 pb-1.5">
                                                    <span className="font-black text-amber-950 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-sm text-amber-700">calendar_today</span>
                                                        {dp.plan_title || `Định mức 1 ngày (${dp.days} ngày)`}
                                                    </span>
                                                    <span className="font-black text-rose-600">
                                                        {formatVnd(dp.daily_spend)}/ngày
                                                    </span>
                                                </div>

                                                <div className="space-y-1.5">
                                                    {dp.daily_items.map((item, idx) => (
                                                        <div key={idx} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-amber-100">
                                                            <div className="flex items-center gap-2">
                                                                <span className="material-symbols-outlined text-sm text-amber-700">{item.icon || 'restaurant'}</span>
                                                                <div>
                                                                    <p className="font-bold text-slate-800 text-[11px]">{item.title}</p>
                                                                    <p className="text-[10px] text-slate-400">{item.note}</p>
                                                                </div>
                                                            </div>
                                                            <span className="font-black text-slate-800 text-xs">{formatVnd(item.amount)}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="pt-1 flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleApplyToQuickBills(msg.id, dp.daily_items)}
                                                        className={`flex-1 py-2 px-3 rounded-xl font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                                            isApplied
                                                                ? 'bg-emerald-600 text-white'
                                                                : 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                                                        }`}
                                                    >
                                                        <span className="material-symbols-outlined text-sm">
                                                            {isApplied ? 'check_circle' : 'bolt'}
                                                        </span>
                                                        {isApplied ? 'Đã lưu vào Bill Mặc Định!' : `Lưu ${dp.daily_items.length} mục này làm Bill Mặc Định`}
                                                    </button>
                                                    {isApplied && location.pathname !== '/addnew' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setIsOpen(false);
                                                                navigate('/addnew');
                                                            }}
                                                            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-[11px] cursor-pointer"
                                                        >
                                                            Mở ngay
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* BẢNG CHIẾN LƯỢC TÍCH VỐN & LÃI KÉP */}
                                        {ip && Array.isArray(ip.allocations) && (
                                            <div className="bg-emerald-50/60 border border-emerald-200/70 rounded-xl p-3 space-y-2">
                                                <div className="flex items-center justify-between border-b border-emerald-200/60 pb-1.5">
                                                    <span className="font-black text-emerald-950 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-sm text-emerald-700">trending_up</span>
                                                        {ip.strategy_title || 'Kế hoạch Tích vốn Sinh lời'}
                                                    </span>
                                                    <span className="font-black text-emerald-700">
                                                        {formatVnd(ip.monthly_investable)}/tháng
                                                    </span>
                                                </div>

                                                <div className="space-y-1.5">
                                                    {ip.allocations.map((al, i) => (
                                                        <div key={i} className="bg-white p-2 rounded-lg border border-emerald-100">
                                                            <div className="flex items-center justify-between font-bold text-[11px] text-slate-800">
                                                                <span>{al.percent}% • {al.channel}</span>
                                                                <span className="text-emerald-700 font-black">{formatVnd(al.amount)}</span>
                                                            </div>
                                                            <p className="text-[10px] text-slate-500 mt-0.5">{al.reason}</p>
                                                        </div>
                                                    ))}
                                                </div>

                                                {Array.isArray(ip.dca_projections) && ip.dca_projections.length > 0 && (
                                                    <div className="pt-1.5">
                                                        <p className="text-[10px] font-extrabold text-emerald-900 uppercase tracking-wider mb-1">
                                                            Dự phóng Lãi kép nếu tiếp tục tích đều {formatVnd(ip.monthly_investable)}/tháng:
                                                        </p>
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-[10px] bg-white rounded-lg overflow-hidden border border-emerald-100">
                                                                <thead>
                                                                    <tr className="bg-emerald-100/60 text-emerald-950 font-bold">
                                                                        <th className="p-1.5 text-left">Kịch bản</th>
                                                                        <th className="p-1.5 text-right">1 Năm</th>
                                                                        <th className="p-1.5 text-right">3 Năm</th>
                                                                        <th className="p-1.5 text-right">5 Năm</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-emerald-50">
                                                                    {ip.dca_projections.map((row, rIdx) => (
                                                                        <tr key={rIdx}>
                                                                            <td className="p-1.5 font-semibold text-slate-700">{row.scenario}</td>
                                                                            <td className="p-1.5 text-right font-bold text-slate-600">{formatVnd(row.year_1_total)}</td>
                                                                            <td className="p-1.5 text-right font-bold text-emerald-700">{formatVnd(row.year_3_total)}</td>
                                                                            <td className="p-1.5 text-right font-black text-emerald-800">{formatVnd(row.year_5_total)}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* BẢNG PHÁT HIỆN RÒ RỈ VÍ TỪ LỊCH SỬ THẬT */}
                                        {leak && (
                                            <div className="bg-blue-50/70 border border-blue-200/70 rounded-xl p-2.5 text-[11px] text-blue-950 flex items-start gap-2">
                                                <span className="material-symbols-outlined text-base text-blue-600 shrink-0 mt-0.5">lightbulb</span>
                                                <div>
                                                    <b>Phát hiện từ ví của bạn:</b> Bạn đã chi <b>{formatVnd(leak.current_spent)}</b> cho <b>{leak.top_category}</b>. Nếu cắt giảm 20% (<b>{formatVnd(leak.suggested_cut_20_percent)}/tháng</b>) đưa vào tích sản 10%/năm, sau 3 năm bạn sẽ có thêm <b>{formatVnd(leak.future_value_3_years)}</b>!
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {loading && (
                            <div className="bg-white border border-amber-100 rounded-2xl p-3 text-xs text-slate-500 flex items-center gap-2">
                                <span className="material-symbols-outlined text-base animate-spin text-amber-600">progress_activity</span>
                                <span>AI đang tính toán lộ trình & giải pháp sinh hoạt...</span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Ô nhập câu hỏi */}
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSendQuestion();
                        }}
                        className="p-3 bg-white border-t border-slate-100 flex items-center gap-2"
                    >
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="VD: Tiết kiệm 2tr/tháng, 6 tháng mua xe 15tr..."
                            className="flex-1 bg-slate-50 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-800 border border-slate-200 focus:outline-none focus:border-amber-500"
                        />
                        <button
                            type="submit"
                            disabled={loading || !input.trim()}
                            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-slate-200 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-sm">send</span>
                            Gửi
                        </button>
                    </form>
                </div>
            )}
        </>
    );
};

export default AiFinancialChatbot;
