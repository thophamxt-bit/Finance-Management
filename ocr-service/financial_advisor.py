import os
import re
import json
import math
import requests
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

KNOWLEDGE_PATH = os.path.join(os.path.dirname(__file__), "data", "vn_financial_knowledge.json")


def load_knowledge_base() -> Dict[str, Any]:
    try:
        with open(KNOWLEDGE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"living_cost_benchmarks": {}, "investment_channels": []}


def round_1000(val: float) -> int:
    return int(round(val / 1000.0) * 1000)


def fmt_vnd(val: float) -> str:
    return f"{int(round(val)):,}".replace(",", ".") + "đ"


def extract_all_amounts(text: str) -> List[Dict[str, Any]]:
    """
    Trích xuất tất cả con số tiền tệ kèm ngữ cảnh xung quanh để phân biệt:
    - Tiền đang tiết kiệm mỗi tháng (saving)
    - Thu nhập / lương (income)
    - Giá mục tiêu muốn mua (goal)
    - Khoản nợ / chi phí cố định (fixed_or_debt)
    """
    lower = text.lower()
    results = []

    pattern = re.compile(
        r'(\d+(?:[.,]\d+)?)\s*(triệu|trieu|tr|củ|nghìn|nghin|ngàn|k|tỷ|ty)\b'
        r'|(\d{1,3}(?:\.\d{3}){2,3})\b'
    )
    for m in pattern.finditer(lower):
        val = 0
        if m.group(1) and m.group(2):
            num = float(m.group(1).replace(',', '.'))
            unit = m.group(2)
            if unit in ('tỷ', 'ty'):
                val = int(round(num * 1_000_000_000))
            elif unit in ('triệu', 'trieu', 'tr', 'củ'):
                val = int(round(num * 1_000_000))
            else:
                val = int(round(num * 1_000))
        elif m.group(3):
            digits = re.sub(r'[^\d]', '', m.group(3))
            if digits and int(digits) >= 10000:
                val = int(digits)

        if val <= 0:
            continue

        start_ctx = max(0, m.start() - 32)
        end_ctx = min(len(lower), m.end() + 24)
        ctx = lower[start_ctx:end_ctx]

        role = "unknown"
        if any(k in ctx for k in ['mua', 'xe', 'nhà', 'điện thoại', 'iphone', 'laptop', 'mục tiêu', 'khoảng']):
            role = "goal"
        elif any(k in ctx for k in ['tiết kiệm', 'để dành', 'dư', 'tích được', 'tích lũy']):
            role = "saving"
        elif any(k in ctx for k in ['lương', 'thu nhập', 'kiếm được']):
            role = "income"
        elif any(k in ctx for k in ['trọ', 'thuê nhà', 'nợ', 'trả góp', 'vay']):
            role = "fixed_or_debt"

        results.append({"value": val, "role": role, "ctx": ctx})

    return results


def classify_question_intent(question: str) -> str:
    q = question.lower()

    if any(k in q for k in ['nợ', 'trả góp', 'vay', 'thẻ tín dụng', 'lãi vay', 'âm tiền']):
        return 'DEBT_PAYOFF'

    if any(k in q for k in [
        'mua xe', 'mua nhà', 'mua máy tính', 'mua laptop', 'mua điện thoại', 'mua iphone',
        'mục tiêu', 'để dành đủ', 'bao lâu thì đủ', 'cần tiết kiệm bao lâu', 'không đủ tiền',
        'tiết kiệm được', 'muốn mua'
    ]):
        return 'GOAL_SAVING'

    if any(k in q for k in ['vàng', 'gửi tiết kiệm', 'ngân hàng nào', 'lãi suất ngân hàng', 'cổ phiếu', 'chứng khoán', 'trái phiếu', 'etf', 'so sánh', 'nên đầu tư gì', 'kênh nào']):
        if not any(k in q for k in ['bữa', 'xăng', '1 ngày', 'mỗi ngày']):
            return 'ASSET_COMPARE'

    if any(k in q for k in ['ví của tôi', 'lịch sử của tôi', 'tôi đã tiêu', 'rò rỉ', 'lãng phí', 'sức khỏe tài chính', 'kiểm toán', 'đánh giá chi tiêu']):
        return 'WALLET_AUDIT'

    if any(k in q for k in ['6 chiếc lọ', '6 lọ', 'sáu chiếc lọ', '50/30/20', '50-30-20', 'phân bổ lương']):
        return 'SIX_JARS'

    if any(k in q for k in ['là gì', 'như thế nào là', 'khác gì', 'có an toàn không', 'lạm phát', 'bắt đầu từ đâu']):
        return 'KNOWLEDGE_QA'

    if any(k in q for k in ['bữa', '1 ngày', 'mỗi ngày', 'xăng', 'ăn sáng', 'ăn trưa', 'ăn tối', 'sinh hoạt', 'thuê trọ', 'tiền trọ']):
        return 'DAILY_PLAN'

    if extract_all_amounts(q):
        return 'DAILY_PLAN'

    return 'GENERAL_FINANCE'


def compute_dca_compound_growth(monthly_contribution: int) -> List[Dict[str, Any]]:
    p = max(100000, monthly_contribution)
    scenarios = [
        {"name": "Tiết kiệm Ngân hàng (5.5%/năm)", "annual_rate": 0.055},
        {"name": "Quỹ Trái phiếu (7.5%/năm)", "annual_rate": 0.075},
        {"name": "Quỹ Cổ phiếu / ETF VN30 (12.0%/năm)", "annual_rate": 0.12}
    ]
    projections = []
    for sc in scenarios:
        r = sc["annual_rate"] / 12.0
        row = {"scenario": sc["name"], "annual_rate_percent": round(sc["annual_rate"] * 100, 1)}
        for years in (1, 3, 5):
            n = years * 12
            fv = p * (((1.0 + r) ** n - 1.0) / r) * (1.0 + r)
            principal = p * n
            row[f"year_{years}_total"] = round_1000(fv)
            row[f"year_{years}_profit"] = round_1000(fv - principal)
        projections.append(row)
    return projections


def build_intent_analysis(
    question: str,
    context: Optional[Dict[str, Any]] = None,
    history: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    intent = classify_question_intent(question)
    q_lower = question.lower()
    tagged_amounts = extract_all_amounts(question)
    amounts = [a["value"] for a in tagged_amounts]

    total_balance = int((context or {}).get("totalBalance") or 0)
    monthly_income = int((context or {}).get("monthlyIncome") or 0)
    monthly_expense = int((context or {}).get("monthlyExpense") or 0)
    top_cat = (context or {}).get("topExpenseCategory") or "Ăn uống"
    top_amt = int((context or {}).get("topExpenseAmount") or 0)

    # Nếu câu hỏi nối tiếp (follow-up) không nhắc lại số tiền, đọc lại từ lịch sử hội thoại
    if not amounts and history:
        for prev in reversed(history):
            prev_text = prev.get("text") or prev.get("reply") or ""
            prev_tagged = extract_all_amounts(prev_text)
            if prev_tagged:
                tagged_amounts = prev_tagged
                amounts = [a["value"] for a in prev_tagged]
                if intent == 'GENERAL_FINANCE':
                    intent = classify_question_intent(prev_text)
                break

    leak_insight = None
    if top_amt >= 150000:
        cut20 = round_1000(top_amt * 0.20)
        r = 0.10 / 12.0
        fv3y = round_1000(cut20 * (((1 + r) ** 36 - 1) / r) * (1 + r))
        leak_insight = {
            "top_category": top_cat,
            "current_spent": top_amt,
            "suggested_cut_20_percent": cut20,
            "future_value_3_years": fv3y
        }

    # --- KỊCH BẢN 1: MỤC TIÊU MUA TÀI SẢN & PHÂN TÍCH THIẾU HỤT (GAP ANALYSIS) ---
    if intent == 'GOAL_SAVING':
        goal_item = next((a["value"] for a in tagged_amounts if a["role"] == "goal"), None)
        saving_item = next((a["value"] for a in tagged_amounts if a["role"] == "saving"), None)
        income_item = next((a["value"] for a in tagged_amounts if a["role"] == "income"), None)

        target_goal = goal_item or (max(amounts) if amounts else 15_000_000)
        m_horizon = re.search(r'(?:trong|sau|vòng|kỳ hạn|tới)\s*(\d+)\s*tháng', q_lower)
        all_months = [int(m) for m in re.findall(r'(?<!triệu\s)(?<!tr\s)(?<!nghìn\s)(?<!ngàn\s)(?<!k\s)(\d+)\s*tháng', q_lower)]
        m_years = re.search(r'(?:trong|sau|vòng|kỳ hạn|tới)?\s*(\d+)\s*năm', q_lower)
        if m_horizon:
            months = int(m_horizon.group(1))
        elif all_months:
            non_one = [m for m in all_months if m > 1]
            months = non_one[0] if non_one else all_months[-1]
        elif m_years:
            months = int(m_years.group(1)) * 12
        else:
            months = 6
        months = max(1, min(120, months))

        if saving_item is None and len(amounts) >= 2:
            other_nums = [v for v in amounts if v != target_goal]
            if other_nums and other_nums[0] < target_goal:
                saving_item = other_nums[0]

        # Trường hợp người dùng đã có sẵn mức tiết kiệm hàng tháng (VD: 2tr/tháng trong 6 tháng mua xe 15tr)
        if saving_item is not None:
            r_safe = 0.058 / 12.0  # Lãi suất an toàn ~5.8%/năm
            principal_total = saving_item * months
            projected_total = round_1000(saving_item * (((1 + r_safe) ** months - 1) / r_safe) * (1 + r_safe))
            interest_earned = max(0, projected_total - principal_total)
            shortfall = max(0, target_goal - projected_total)

            if shortfall > 0:
                extra_monthly = round_1000(shortfall / months)
                extra_daily = max(1000, round_1000(extra_monthly / 30.0))
                new_monthly_total = saving_item + extra_monthly
                months_if_unchanged = math.ceil(target_goal / max(100000, saving_item))

                habit_swaps = [
                    {
                        "title": "Tự pha cà phê / nước uống mang đi",
                        "amount": round_1000(extra_daily * 0.45),
                        "categoryKeyword": "ăn uống",
                        "icon": "local_cafe",
                        "note": f"Giảm 3-4 ly trà sữa/cà phê quán mỗi tuần (~{fmt_vnd(round_1000(extra_monthly * 0.45))}/tháng)"
                    },
                    {
                        "title": "Nấu ăn tối / mang cơm trưa 3 buổi/tuần",
                        "amount": round_1000(extra_daily * 0.35),
                        "categoryKeyword": "ăn uống",
                        "icon": "lunch_dining",
                        "note": f"Thay cơm quán bằng tự nấu giúp tiết kiệm ~{fmt_vnd(round_1000(extra_monthly * 0.35))}/tháng"
                    },
                    {
                        "title": "Cắt phí ship & mua sắm ngẫu hứng",
                        "amount": max(1000, extra_daily - round_1000(extra_daily * 0.45) - round_1000(extra_daily * 0.35)),
                        "categoryKeyword": "mua sắm",
                        "icon": "savings",
                        "note": "Gom đơn hàng & đặt giới hạn ăn vặt online"
                    }
                ]

                is_short_term = months <= 12
                if is_short_term:
                    allocations = [
                        {
                            "channel": "Tiết kiệm Tích lũy / Góp Online kỳ hạn 1-3-6 tháng (5.2% - 5.8%/năm)",
                            "percent": 60,
                            "amount": round_1000(new_monthly_total * 0.60),
                            "reason": "Bảo toàn vốn 100% và khóa kỷ luật để đúng tháng thứ 6 có tiền mua xe ngay."
                        },
                        {
                            "channel": "Chứng chỉ quỹ Trái phiếu thanh khoản T+2 (TCBF, BVBF ~7.5%/năm)",
                            "percent": 30,
                            "amount": round_1000(new_monthly_total * 0.30),
                            "reason": "Lợi suất cao hơn ngân hàng, ít biến động, phù hợp mục tiêu 6 tháng."
                        },
                        {
                            "channel": "Túi Thần Tài / Tích lũy linh hoạt (4.8%/năm)",
                            "percent": 10,
                            "amount": max(0, new_monthly_total - round_1000(new_monthly_total * 0.60) - round_1000(new_monthly_total * 0.30)),
                            "reason": "Giữ đệm dự phòng rút tức thì 24/7 nếu có việc gấp mà không phải phá sổ tiết kiệm."
                        }
                    ]
                    safety_warning = (
                        f"⚠️ **Lưu ý an toàn cho kỳ hạn ngắn ({months} tháng):** Tuyệt đối **KHÔNG** mang tiền mua xe đi lướt sóng cổ phiếu hay crypto vì rủi ro giảm giá ngắn hạn có thể làm hỏng kế hoạch!"
                    )
                    strategy_title = f"Kênh Tích Sản An Toàn Kỳ Hạn {months} Tháng (Bảo Toàn Vốn)"
                else:
                    allocations = [
                        {"channel": "Chứng chỉ quỹ Trái phiếu / Tiết kiệm Online (6% - 7.5%/năm)", "percent": 60, "amount": round_1000(new_monthly_total * 0.60), "reason": "Giữ nền tảng an toàn cho phần lớn mục tiêu."},
                        {"channel": "Chứng chỉ quỹ Cổ phiếu / ETF VN30 (11% - 13%/năm)", "percent": 40, "amount": max(0, new_monthly_total - round_1000(new_monthly_total * 0.60)), "reason": "Tận dụng thời gian > 1 năm để tăng tốc lãi kép."}
                    ]
                    safety_warning = ""
                    strategy_title = f"Chiến lược Tích Vốn Đạt {fmt_vnd(target_goal)} ({months} tháng)"

                reply = (
                    f"🎯 **Phân tích Bài toán Mua Xe {fmt_vnd(target_goal)} trong {months} tháng:**\n\n"
                    f"**1. Chẩn đoán khoảng thiếu hụt:**\n"
                    f"• Tiết kiệm đều **{fmt_vnd(saving_item)}/tháng** × {months} tháng = **{fmt_vnd(principal_total)}**.\n"
                    f"• Cộng thêm lãi an toàn (~5.8%/năm): **+{fmt_vnd(interest_earned)}** → Dự kiến có **{fmt_vnd(projected_total)}**.\n"
                    f"• **Bạn đang thiếu đúng {fmt_vnd(shortfall)}** (tương đương cần bù thêm **{fmt_vnd(extra_monthly)}/tháng**, tức chỉ **~{fmt_vnd(extra_daily)}/ngày**).\n\n"
                    f"**2. Giải pháp từ Thói quen Sinh hoạt Hằng ngày (Bù đủ +{fmt_vnd(extra_monthly)}/tháng):**\n"
                    f"• **Đồ uống & Ăn vặt:** Tự pha cà phê/mang nước 4 ngày/tuần thay vì gọi quán → Tiết kiệm **~{fmt_vnd(round_1000(extra_monthly * 0.45))}/tháng**.\n"
                    f"• **Bữa ăn (Meal Prep):** Mang cơm trưa hoặc tự nấu ăn tối 3 buổi/tuần → Tiết kiệm **~{fmt_vnd(round_1000(extra_monthly * 0.35))}/tháng**.\n"
                    f"• **Phí ship & Mua sắm bốc đồng:** Gom đơn hàng online, chờ 24h trước khi chốt đơn → Tiết kiệm **~{fmt_vnd(max(50000, extra_monthly - round_1000(extra_monthly * 0.45) - round_1000(extra_monthly * 0.35)))}/tháng**.\n\n"
                    f"**3. Nên đầu tư vào đâu để sinh lời an toàn?**\n"
                    f"{safety_warning}\n"
                    f"• Nếu không muốn cắt chi tiêu sâu, bạn có thể **lùi thời gian mua xe lên ~{months_if_unchanged} tháng** (giữ nguyên {fmt_vnd(saving_item)}/tháng sẽ tự đủ {fmt_vnd(target_goal)}!)."
                )

                goal_analysis = {
                    "target_goal": target_goal,
                    "months": months,
                    "current_monthly_saving": saving_item,
                    "projected_total": projected_total,
                    "interest_earned": interest_earned,
                    "shortfall": shortfall,
                    "extra_monthly_needed": extra_monthly,
                    "extra_daily_needed": extra_daily,
                    "new_monthly_saving": new_monthly_total,
                    "months_if_unchanged": months_if_unchanged
                }

                daily_plan = {
                    "total_budget": extra_monthly,
                    "days": 30,
                    "daily_cap": extra_daily,
                    "daily_spend": extra_daily,
                    "daily_save": extra_daily,
                    "total_living_spend": extra_monthly,
                    "surplus": shortfall,
                    "plan_title": f"Thói quen cắt giảm mỗi ngày (+{fmt_vnd(extra_daily)}/ngày)",
                    "daily_items": habit_swaps
                }

                investment_plan = {
                    "strategy_title": strategy_title,
                    "monthly_investable": new_monthly_total,
                    "allocations": allocations,
                    "dca_projections": compute_dca_compound_growth(new_monthly_total)
                }
                return {
                    "intent": intent,
                    "reply": reply,
                    "goal_analysis": goal_analysis,
                    "daily_plan": daily_plan,
                    "investment_plan": investment_plan,
                    "leak_insight": leak_insight
                }

            else:
                surplus_goal = projected_total - target_goal
                reply = (
                    f"🎉 **Tin vui! Với mức tiết kiệm {fmt_vnd(saving_item)}/tháng trong {months} tháng, bạn ĐỦ sức đạt mục tiêu {fmt_vnd(target_goal)}!**\n\n"
                    f"• Tiền gốc tích lũy: **{fmt_vnd(principal_total)}** + Lãi an toàn (~5.8%/năm): **+{fmt_vnd(interest_earned)}** = **{fmt_vnd(projected_total)}** (Dư thêm **{fmt_vnd(surplus_goal)}** để làm phí đăng ký/bảo hiểm).\n"
                    f"• Hãy gửi vào **Tiết kiệm Tích lũy Online** và **Quỹ Trái phiếu** để bảo toàn 100% vốn."
                )
                return {
                    "intent": intent,
                    "reply": reply,
                    "goal_analysis": None,
                    "daily_plan": None,
                    "investment_plan": {
                        "strategy_title": f"Giữ vững Kỷ luật Tích sản {fmt_vnd(saving_item)}/tháng",
                        "monthly_investable": saving_item,
                        "allocations": [
                            {"channel": "Tiết kiệm Tích lũy Online kỳ hạn ngắn (5.6%/năm)", "percent": 70, "amount": round_1000(saving_item * 0.70), "reason": "An toàn vốn tuyệt đối đúng hạn."},
                            {"channel": "Quỹ Trái phiếu / Túi Sinh Lời (5% - 7.5%/năm)", "percent": 30, "amount": round_1000(saving_item * 0.30), "reason": "Tối ưu lãi ngắn hạn & giữ dự phòng linh hoạt."}
                        ],
                        "dca_projections": compute_dca_compound_growth(saving_item)
                    },
                    "leak_insight": leak_insight
                }

        # Trường hợp hỏi mục tiêu thông thường dựa trên thu nhập
        income_base = income_item or (min(amounts) if len(amounts) >= 2 else (monthly_income if monthly_income > 0 else 9_000_000))
        r_m = 0.058 / 12.0
        monthly_needed = round_1000(target_goal * r_m / (((1 + r_m) ** months - 1) * (1 + r_m)))
        daily_needed = round_1000(monthly_needed / 30)
        pct_income = round((monthly_needed / max(1, income_base)) * 100, 1)

        reply = (
            f"🎯 **Kế hoạch Chinh phục Mục tiêu {fmt_vnd(target_goal)} trong {months} tháng:**\n\n"
            f"• **Số tiền cần tích lũy mỗi tháng:** **{fmt_vnd(monthly_needed)}/tháng** (tương đương cất đi **{fmt_vnd(daily_needed)}/ngày**).\n"
            f"• **Tỷ trọng trên thu nhập ({fmt_vnd(income_base)}):** Chiếm **{pct_income}%** thu nhập.\n"
            f"• **Kênh giữ tiền an toàn:** Gửi vào **Tiết kiệm Tích lũy Online (5.6%/năm)** hoặc **Quỹ Trái phiếu (7.5%/năm)** để bảo toàn vốn và nhận thêm lãi suất."
        )
        return {
            "intent": intent,
            "reply": reply,
            "goal_analysis": None,
            "daily_plan": None,
            "investment_plan": {
                "strategy_title": f"Lộ trình Tích sản Đạt {fmt_vnd(target_goal)}",
                "monthly_investable": monthly_needed,
                "allocations": [
                    {"channel": "Tiết kiệm Tích lũy Online kỳ hạn ngắn (5.6%/năm)", "percent": 70, "amount": round_1000(monthly_needed * 0.7), "reason": "Khóa kỷ luật giữ tiền, bảo toàn 100% vốn."},
                    {"channel": "Chứng chỉ quỹ Trái phiếu (7.5%/năm)", "percent": 30, "amount": max(0, monthly_needed - round_1000(monthly_needed * 0.7)), "reason": "Sinh lời an toàn cao hơn ngân hàng."}
                ],
                "dca_projections": compute_dca_compound_growth(monthly_needed)
            },
            "leak_insight": leak_insight
        }

    # --- KỊCH BẢN 2: KẾ HOẠCH TRẢ NỢ ---
    if intent == 'DEBT_PAYOFF':
        debt_amount = max(amounts) if amounts else 15_000_000
        income_base = min(amounts) if len(amounts) >= 2 else (monthly_income if monthly_income > 0 else 8_000_000)
        monthly_pay = round_1000(income_base * 0.35)
        months_to_clear = max(1, math.ceil(debt_amount / max(100000, monthly_pay)))
        daily_living_left = round_1000((income_base - monthly_pay) / 30)

        reply = (
            f"🛡️ **Phác đồ Thoát Nợ Thông Minh ({fmt_vnd(debt_amount)}):**\n\n"
            f"1. **Ưu tiên khoản lãi cao nhất (Avalanche):** Dồn tiền trả dứt thẻ tín dụng/vay tiêu dùng trước, tạm dừng đầu tư mạo hiểm khi còn nợ lãi cao.\n"
            f"2. **Định mức trả nợ (35% thu nhập ~ {fmt_vnd(monthly_pay)}/tháng):** Bạn sẽ sạch nợ hoàn toàn sau **{months_to_clear} tháng**.\n"
            f"3. **Trần chi tiêu sinh hoạt:** Giới hạn ở mức **{fmt_vnd(daily_living_left)}/ngày** trong giai đoạn trả nợ."
        )
        return {"intent": intent, "reply": reply, "goal_analysis": None, "daily_plan": None, "investment_plan": None, "leak_insight": leak_insight}

    # --- KỊCH BẢN 3: SO SÁNH KÊNH ĐẦU TƯ ---
    if intent == 'ASSET_COMPARE':
        capital = amounts[0] if amounts else (total_balance if total_balance > 0 else 1_000_000)
        reply = (
            f"📊 **So sánh Kênh Tích Sản tại Việt Nam (Vốn {fmt_vnd(capital)}/tháng):**\n\n"
            f"1. **Túi Sinh Lời / Tiết kiệm Linh hoạt (~4.8%/năm):** Rút tức thì 24/7, dùng giữ Quỹ dự phòng khẩn cấp.\n"
            f"2. **Tiết kiệm Online Kỳ hạn 6-12 tháng (~5.5% - 6.0%/năm):** An toàn 100%, phù hợp mục tiêu ngắn hạn (< 1 năm).\n"
            f"3. **Chứng chỉ Quỹ Trái phiếu - TCBF, BVBF (~7.0% - 7.8%/năm):** Vốn từ 50k - 100k, ít biến động, thanh khoản T+2.\n"
            f"4. **Chứng chỉ Quỹ Cổ phiếu / ETF VN30 (~11% - 14%/năm):** Tối ưu tích sản dài hạn 2 - 5 năm.\n"
            f"5. **Vàng nhẫn 9999 (~8% - 10%/năm):** Chống trượt giá dài hạn, cần vốn tích lũy tối thiểu ~4 triệu/lần mua."
        )
        return {
            "intent": intent,
            "reply": reply,
            "goal_analysis": None,
            "daily_plan": None,
            "investment_plan": {
                "strategy_title": f"Cơ cấu Danh mục Khuyến nghị ({fmt_vnd(capital)}/tháng)",
                "monthly_investable": capital if capital <= 10_000_000 else round_1000(capital * 0.2),
                "allocations": [
                    {"channel": "Quỹ Cổ phiếu / ETF VN30 (Tích sản dài hạn)", "percent": 40, "amount": round_1000(capital * 0.40), "reason": "Tối ưu lãi kép 11% - 14%/năm khi nắm giữ trên 2 năm."},
                    {"channel": "Quỹ Trái phiếu / Tiết kiệm Online", "percent": 40, "amount": round_1000(capital * 0.40), "reason": "Giữ nền tảng an toàn, sinh lời đều 6% - 8%/năm."},
                    {"channel": "Túi Sinh Lời thanh khoản 24/7", "percent": 20, "amount": round_1000(capital * 0.20), "reason": "Quỹ dự phòng khẩn cấp."}
                ],
                "dca_projections": compute_dca_compound_growth(capital if capital <= 5_000_000 else 1_000_000)
            },
            "leak_insight": leak_insight
        }

    # --- KỊCH BẢN 4: KIỂM TOÁN VÍ THỰC TẾ ---
    if intent == 'WALLET_AUDIT':
        savings_rate = round(((monthly_income - monthly_expense) / monthly_income) * 100, 1) if monthly_income > 0 else 0
        health_score = 88 if savings_rate >= 20 else (72 if savings_rate >= 10 else (58 if total_balance > 0 else 42))
        reply = (
            f"🩺 **Kiểm toán Sức khỏe Tài chính từ Ví của bạn (Điểm: {health_score}/100):**\n\n"
            f"• **Tổng số dư khả dụng:** **{fmt_vnd(total_balance)}**\n"
            f"• **Tổng Thu:** **{fmt_vnd(monthly_income)}** | **Tổng Chi:** **{fmt_vnd(monthly_expense)}** (Tỷ lệ giữ tiền: **{savings_rate}%**)\n"
            f"• **Danh mục chi nhiều nhất:** **{top_cat}** (**{fmt_vnd(top_amt)}**)."
        )
        return {"intent": intent, "reply": reply, "goal_analysis": None, "daily_plan": None, "investment_plan": None, "leak_insight": leak_insight}

    # --- KỊCH BẢN 5: 6 CHIẾC LỌ ---
    if intent == 'SIX_JARS':
        inc = amounts[0] if amounts else (monthly_income if monthly_income > 0 else 10_000_000)
        invest20 = round_1000(inc * 0.20)
        reply = (
            f"🏺 **Phân bổ Thu nhập {fmt_vnd(inc)}/tháng theo Chuẩn 6 Chiếc Lọ (JARS):**\n\n"
            f"• **Thiết yếu (55%):** **{fmt_vnd(round_1000(inc * 0.55))}** ({fmt_vnd(round_1000((inc * 0.55)/30))}/ngày)\n"
            f"• **Tự do Tài chính / Đầu tư (10%):** **{fmt_vnd(round_1000(inc * 0.10))}**\n"
            f"• **Tiết kiệm dài hạn (10%):** **{fmt_vnd(round_1000(inc * 0.10))}**\n"
            f"• **Giáo dục (10%):** **{fmt_vnd(round_1000(inc * 0.10))}**\n"
            f"• **Hưởng thụ (10%):** **{fmt_vnd(round_1000(inc * 0.10))}**\n"
            f"• **Cho đi (5%):** **{fmt_vnd(round_1000(inc * 0.05))}**"
        )
        return {
            "intent": intent,
            "reply": reply,
            "goal_analysis": None,
            "daily_plan": None,
            "investment_plan": {
                "strategy_title": f"Kích hoạt Lọ Tự Do Tài Chính & Tiết Kiệm ({fmt_vnd(invest20)}/tháng)",
                "monthly_investable": invest20,
                "allocations": [
                    {"channel": "Lọ Tự do Tài chính (10%) → Quỹ ETF / Cổ phiếu", "percent": 50, "amount": round_1000(inc * 0.10), "reason": "Tích sản lãi kép (~12%/năm)."},
                    {"channel": "Lọ Tiết kiệm dài hạn (10%) → Tiết kiệm Online / Trái phiếu", "percent": 50, "amount": round_1000(inc * 0.10), "reason": "Dự phòng khẩn cấp an toàn."}
                ],
                "dca_projections": compute_dca_compound_growth(invest20)
            },
            "leak_insight": leak_insight
        }

    # --- KỊCH BẢN 6: KIẾN THỨC TÀI CHÍNH ---
    if intent == 'KNOWLEDGE_QA':
        reply = (
            "📘 **Nguyên tắc Vàng để Tích Vốn An Toàn & Sinh Lời Lãi Kép:**\n\n"
            "1. **Quỹ dự phòng khẩn cấp:** Luôn giữ 3–6 tháng chi phí sinh hoạt ở **Túi sinh lời / Tiết kiệm rút linh hoạt**.\n"
            "2. **Mục tiêu ngắn hạn (< 1 năm):** Chỉ gửi **Tiết kiệm Online** hoặc **Quỹ Trái phiếu** để bảo toàn 100% vốn.\n"
            "3. **Mục tiêu dài hạn (2–5+ năm):** Tích sản đều đặn (DCA) vào **Chứng chỉ quỹ Cổ phiếu / ETF VN30** để tận dụng lãi kép ~11%–13%/năm."
        )
        return {"intent": intent, "reply": reply, "goal_analysis": None, "daily_plan": None, "investment_plan": None, "leak_insight": leak_insight}

    # --- KỊCH BẢN 6B: CÂU HỎI TỔNG QUÁT / MỞ RỘNG (KHÔNG ÉP VÀO KỊCH BẢN CHIA BỮA ĂN) ---
    if intent == 'GENERAL_FINANCE':
        reply = (
            f"Tôi đã ghi nhận câu hỏi của bạn: **\"{question}\"**.\n\n"
            f"Hiện hệ thống AI chuyên sâu chưa kết nối được tới mô hình ngôn ngữ, nên tôi tóm tắt nhanh theo dữ liệu ví của bạn:\n"
            f"• **Số dư hiện tại:** **{fmt_vnd(total_balance)}**\n"
            f"• **Thu nhập tháng:** **{fmt_vnd(monthly_income)}** | **Chi tiêu tháng:** **{fmt_vnd(monthly_expense)}**\n\n"
            f"Bạn có thể hỏi cụ thể kèm số tiền (ví dụ: *\"Lương 12 triệu muốn mua xe 30 triệu trong 8 tháng\"*, *\"Chia ngân sách 4 triệu 30 ngày\"*) hoặc kiểm tra lại kết nối dịch vụ AI để nhận phân tích chi tiết."
        )
        return {"intent": intent, "reply": reply, "goal_analysis": None, "daily_plan": None, "investment_plan": None, "leak_insight": leak_insight}

    # --- KỊCH BẢN 7 & 8: CHIA CHI TIÊU HẰNG NGÀY ---
    total_budget = amounts[0] if amounts else (monthly_income if monthly_income > 0 else (total_balance if total_balance > 0 else 3_000_000))
    fixed_cost = amounts[1] if len(amounts) >= 2 and amounts[1] < total_budget else 0
    net_budget = max(300_000, total_budget - fixed_cost)

    m_days = re.search(r'(\d+)\s*ngày', q_lower)
    days = min(365, int(m_days.group(1))) if (m_days and int(m_days.group(1)) > 1) else (7 if '1 tuần' in q_lower else 30)
    m_meals = re.search(r'(\d)\s*bữa', q_lower)
    meals = int(m_meals.group(1)) if (m_meals and int(m_meals.group(1)) in (1, 2, 3, 4)) else 3
    fuel_daily = 7000 if 'buýt' in q_lower else (15000 if 'đi nhiều' in q_lower else 10000)

    daily_cap = net_budget // days
    min_food_floor = meals * 15000
    save_rate = 0.20 if daily_cap >= 120000 else (0.15 if daily_cap >= 90000 else (0.10 if daily_cap >= 75000 else 0.0))
    daily_save = round_1000(daily_cap * save_rate)
    if daily_cap - daily_save - fuel_daily < min_food_floor:
        daily_save = max(0, ((daily_cap - fuel_daily - min_food_floor) // 1000) * 1000)

    daily_living = max(0, daily_cap - daily_save)
    daily_food = max(0, daily_living - fuel_daily)

    daily_items = []
    if meals == 3:
        b_amt = round_1000(daily_food * 0.25)
        l_amt = round_1000(daily_food * 0.40)
        d_amt = max(0, daily_food - b_amt - l_amt)
        daily_items = [
            {"title": "Ăn sáng", "amount": b_amt, "categoryKeyword": "ăn uống", "icon": "ramen_dining", "note": "Bữa sáng (25% quỹ ăn)"},
            {"title": "Ăn trưa", "amount": l_amt, "categoryKeyword": "ăn uống", "icon": "lunch_dining", "note": "Bữa trưa (40% quỹ ăn)"},
            {"title": "Ăn tối", "amount": d_amt, "categoryKeyword": "ăn uống", "icon": "dinner_dining", "note": "Bữa tối (35% quỹ ăn)"}
        ]
    else:
        l_amt = round_1000(daily_food * 0.50)
        d_amt = max(0, daily_food - l_amt)
        daily_items = [
            {"title": "Bữa trưa", "amount": l_amt, "categoryKeyword": "ăn uống", "icon": "lunch_dining", "note": "Bữa trưa (50% quỹ ăn)"},
            {"title": "Bữa tối", "amount": d_amt, "categoryKeyword": "ăn uống", "icon": "dinner_dining", "note": "Bữa tối (50% quỹ ăn)"}
        ]

    if fuel_daily > 0:
        daily_items.append({"title": "Xăng xe & Di chuyển", "amount": fuel_daily, "categoryKeyword": "di chuyển", "icon": "local_gas_station", "note": "Chi phí đi lại hằng ngày"})

    daily_spend = sum(i["amount"] for i in daily_items)
    total_living_spend = daily_spend * days
    surplus = max(0, net_budget - total_living_spend)
    investable = surplus if surplus > 0 else 450000
    dca_proj = compute_dca_compound_growth(investable)

    fixed_note = f" (sau khi trừ chi phí cố định/trọ **{fmt_vnd(fixed_cost)}**, còn **{fmt_vnd(net_budget)}**)" if fixed_cost > 0 else ""
    reply = (
        f"Dựa trên ngân sách **{fmt_vnd(total_budget)}**{fixed_note} trong **{days} ngày** (trần **{fmt_vnd(daily_cap)}/ngày**):\n\n"
        f"• **Chi sinh hoạt {meals} bữa + đi lại:** **{fmt_vnd(daily_spend)}/ngày** (Tổng {days} ngày: **{fmt_vnd(total_living_spend)}**).\n"
        f"• **Tiền dư tích vốn sinh lời:** **+{fmt_vnd(surplus)}** ({fmt_vnd(max(0, daily_cap - daily_spend))}/ngày).\n"
        f"• **Tích sản lãi kép (12%/năm):** Sau 3 năm đạt **{fmt_vnd(dca_proj[2]['year_3_total'])}**, sau 5 năm đạt **{fmt_vnd(dca_proj[2]['year_5_total'])}**!"
    )

    return {
        "intent": intent,
        "reply": reply,
        "goal_analysis": None,
        "daily_plan": {
            "total_budget": total_budget,
            "days": days,
            "daily_cap": daily_cap,
            "daily_spend": daily_spend,
            "daily_save": max(0, daily_cap - daily_spend),
            "total_living_spend": total_living_spend,
            "surplus": surplus,
            "plan_title": f"Định mức 1 ngày ({days} ngày)",
            "daily_items": daily_items
        },
        "investment_plan": {
            "strategy_title": "Chiến lược Tích Vốn & Sinh Lời (50 - 30 - 20)",
            "monthly_investable": investable,
            "allocations": [
                {"channel": "Tích lũy linh hoạt / Túi Thần Tài (4.8%/năm)", "percent": 50, "amount": round_1000(investable * 0.50), "reason": "Quỹ dự phòng khẩn cấp rút tức thì 24/7."},
                {"channel": "Chứng chỉ quỹ Trái phiếu / ETF (Fmarket, Finhay)", "percent": 30, "amount": round_1000(investable * 0.30), "reason": "Tích sản vốn nhỏ hưởng lãi kép 7.5% - 12%/năm."},
                {"channel": "Đầu tư bản thân (Sách / Kỹ năng)", "percent": 20, "amount": max(0, investable - round_1000(investable * 0.50) - round_1000(investable * 0.30)), "reason": "Nâng cao thu nhập chủ động."}
            ],
            "dca_projections": dca_proj
        },
        "leak_insight": leak_insight
    }


def call_server_llm_providers(prompt: str, custom_gemini_key: Optional[str] = None) -> Optional[tuple]:
    """
    Bộ định tuyến AI đa nguồn phía Server (End-user KHÔNG cần có API key riêng):
    1. Groq Cloud Free API (Llama 3.3 70B - nhanh & 14.400 req/ngày miễn phí)
    2. Google Gemini API (nếu cấu hình key chuẩn AIza...)
    3. Ollama Local AI (chạy nội bộ miễn phí 100% không giới hạn, VD: qwen2.5:3b)
    """
    # Nguồn 1: Groq Cloud API
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    if groq_key:
        try:
            r = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
                json={
                    "model": os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.35,
                    "max_tokens": 1200
                },
                timeout=12
            )
            if r.status_code == 200:
                text = r.json()["choices"][0]["message"]["content"].strip()
                if text:
                    return text, "groq-llama-3.3-70b"
        except Exception:
            pass

    # Nguồn 2: Google Gemini / Gemma API (hỗ trợ cả key AIza... và key AQ...)
    gemini_key = (custom_gemini_key or os.getenv("GEMINI_API_KEY", "")).strip()
    if gemini_key:
        try:
            from google import genai
            from google.genai import types
            client = genai.Client(api_key=gemini_key)
            gemini_models = (
                "gemini-3.5-flash-lite",
                "gemini-3.1-flash-lite",
                "gemini-flash-lite-latest",
                "gemini-3.5-flash",
                "gemini-flash-latest",
                "gemma-4-31b-it",
            )
            for m in gemini_models:
                try:
                    resp = client.models.generate_content(
                        model=m,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            temperature=0.4,
                            max_output_tokens=1500,
                            automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True)
                        )
                    )
                    if resp and resp.text:
                        return resp.text.strip(), f"{m}-hybrid"
                except Exception:
                    continue
        except Exception:
            pass

    # Nguồn 3: Ollama Local AI (chạy nội bộ trên server nếu có cài Ollama)
    ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434/api/chat").strip()
    ollama_model = os.getenv("OLLAMA_MODEL", "qwen2.5:3b").strip()
    if ollama_url:
        try:
            r = requests.post(
                ollama_url,
                json={
                    "model": ollama_model,
                    "messages": [{"role": "user", "content": prompt}],
                    "stream": False
                },
                timeout=10
            )
            if r.status_code == 200:
                text = r.json().get("message", {}).get("content", "").strip()
                if text:
                    return text, f"ollama-{ollama_model}"
        except Exception:
            pass

    return None


def generate_advisor_reply(
    question: str,
    context: Optional[Dict[str, Any]] = None,
    history: Optional[List[Dict[str, str]]] = None,
    custom_api_key: Optional[str] = None
) -> Dict[str, Any]:
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"), override=True)
    analysis = build_intent_analysis(question, context, history)
    reply_text = analysis["reply"]
    source = f"smart-advisor-{analysis['intent'].lower()}"

    history_str = ""
    if history:
        recent = history[-6:]
        history_str = "\n".join([f"- {h.get('role', 'user')}: {h.get('text', '')}" for h in recent])

    is_open_qa = analysis["intent"] in ("GENERAL_FINANCE", "KNOWLEDGE_QA")
    if is_open_qa:
        sys_prompt = f"""Bạn là Trợ lý AI Thông minh & Chuyên gia Cố vấn Tài chính Cá nhân của ứng dụng Temoney tại Việt Nam.
Nhiệm vụ của bạn là trả lời CHÍNH XÁC, ĐẦY ĐỦ và ĐÚNG TRỌNG TÂM mọi câu hỏi của người dùng (từ câu hỏi tài chính cá nhân, đầu tư, tiết kiệm, thuế, bảo hiểm, hướng dẫn sử dụng app Temoney, cho đến các câu hỏi đời sống/tư vấn chung).

Ngữ cảnh ví thực tế của người dùng (chỉ trích dẫn khi câu hỏi có liên quan đến ví/tài chính của họ):
{json.dumps(context or {}, ensure_ascii=False)}

Lịch sử hội thoại gần đây:
{history_str if history_str else "(Chưa có lịch sử)"}

Câu hỏi hiện tại của người dùng: "{question}"

Quy tắc trả lời:
1. Trả lời trực tiếp vào đúng câu hỏi người dùng vừa hỏi bằng tiếng Việt tự nhiên, rõ ràng, dễ hiểu (dùng gạch đầu dòng ngắn gọn nếu cần).
2. Không tự ý bịa ra kế hoạch ăn uống hay số tiền giả định nếu người dùng không hỏi về chia ngân sách.
3. Nếu câu hỏi liên quan đến tài chính cá nhân, đưa ra giải pháp thực tế phù hợp bối cảnh Việt Nam."""
    else:
        sys_prompt = f"""Bạn là Chuyên gia Cố vấn Tài chính Cá nhân & Tích sản Thông minh của ứng dụng Temoney tại Việt Nam.
Ngữ cảnh ví thực tế của người dùng: {json.dumps(context or {}, ensure_ascii=False)}
Lịch sử hội thoại gần đây:
{history_str if history_str else "(Chưa có lịch sử)"}

Câu hỏi hiện tại của người dùng: "{question}"
Kết quả phân tích định lượng chuẩn xác từ hệ thống (hãy giữ đúng các con số này nếu dùng):
{analysis['reply']}

Hãy viết câu trả lời tự nhiên, đồng cảm, thực tế, sắc bén và đúng trọng tâm câu hỏi của người dùng bằng tiếng Việt (160-300 từ)."""

    llm_res = call_server_llm_providers(sys_prompt, custom_gemini_key=custom_api_key)
    if llm_res:
        reply_text, source = llm_res

    return {
        "success": True,
        "intent": analysis["intent"],
        "reply": reply_text,
        "source": source,
        "goal_analysis": analysis.get("goal_analysis"),
        "daily_plan": analysis.get("daily_plan"),
        "investment_plan": analysis.get("investment_plan"),
        "leak_insight": analysis.get("leak_insight")
    }
