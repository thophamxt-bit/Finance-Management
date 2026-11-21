import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import UserProfileBadge from '../../components/personal/UserProfileBadge';
import { useLanguage } from '../../context/LanguageContext';

const Budgets = () => {
    const navigate = useNavigate();
    const { t, openSettings } = useLanguage();



    // 1. QUẢN LÝ THÁNG

    const getCurrentMonthString = () => {

        const now = new Date();

        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    };



    // --- THÊM: HÀM LẤY MỐC CHẶN THỜI GIAN TRONG QUÁ KHỨ ---

    const getCurrentMonthMin = () => {

        const now = new Date();

        const year = now.getFullYear();

        const month = String(now.getMonth() + 1).padStart(2, '0');

        return `${year}-${month}`;

    };



    const [currentMonth, setCurrentMonth] = useState(getCurrentMonthString());

    const [budgets, setBudgets] = useState([]);

    const [loading, setLoading] = useState(false);



    // 2. FETCH DỮ LIỆU TỪ BACKEND KHI ĐỔI THÁNG

    useEffect(() => {

        const fetchBudgets = async () => {

            const token = localStorage.getItem("token");

            if (!token) return navigate("/login");



            setLoading(true);

            try {

                const res = await axios.get(`http://localhost:8080/api/budgets?month=${currentMonth}`, {

                    headers: { Authorization: `Bearer ${token}` }

                });



                const formattedData = res.data.map(b => ({

                    id: b.id,

                    name: b.name,

                    limit: b.limitAmount,

                    spent: b.spentAmount || 0,

                    icon: b.icon,

                    month: b.monthString

                }));



                setBudgets(formattedData);

            } catch (err) {

                console.error("Lỗi lấy ngân sách:", err);

            } finally {

                setLoading(false);

            }

        };



        fetchBudgets();

    }, [currentMonth, navigate]);



    // 3. POPUP STATE

    const [showPopup, setShowPopup] = useState(false);

    const [targetMonth, setTargetMonth] = useState(getCurrentMonthString());

    const [inputAmount, setInputAmount] = useState('');



    // 4. LƯU NGÂN SÁCH (6 LỌ)

    const handleSaveBudget = async () => {

        const amount = parseFloat(inputAmount);

        if (!amount || amount <= 0) {

            alert("Vui lòng nhập số tiền thu nhập hợp lệ!");

            return;

        }



        const token = localStorage.getItem("token");



        try {

            await axios.post("http://localhost:8080/api/budgets/auto-6-jars", {

                income: amount,

                month: targetMonth

            }, { headers: { Authorization: `Bearer ${token}` }});



            alert(`Đã phân bổ 6 lọ thành công cho tháng ${targetMonth}!`);



            setCurrentMonth(targetMonth); // Tự động chọn về tháng vừa tạo

            setShowPopup(false);

            setInputAmount('');



            // Tải lại dữ liệu

            const res = await axios.get(`http://localhost:8080/api/budgets?month=${targetMonth}`, {

                headers: { Authorization: `Bearer ${token}` }

            });

            const formattedData = res.data.map(b => ({

                id: b.id, name: b.name, limit: b.limitAmount, spent: b.spentAmount || 0, icon: b.icon, month: b.monthString

            }));

            setBudgets(formattedData);



        } catch (err) {

            alert("Đã xảy ra lỗi khi tạo ngân sách! Kiểm tra lại Backend đã chạy chưa nhé.");

            console.error(err);

        }

    };



    // 5. TÍNH TOÁN CÁC CHỈ SỐ CHO GIAO DIỆN

    const totalLimit = budgets.reduce((sum, item) => sum + item.limit, 0);

    const totalSpent = budgets.reduce((sum, item) => sum + item.spent, 0);

    const remaining = totalLimit - totalSpent;

    const spentPercent = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;



    // Tính xem có bao nhiêu danh mục vượt ngưỡng 80% để báo động

    const overLimitCount = budgets.filter(b => (b.limit > 0 ? (b.spent / b.limit) * 100 : 0) > 80).length;



    return (

        <div className="bg-[#fcf8f4] text-slate-800 antialiased min-h-screen flex relative">

            {/* Sidebar Navigation tông màu ấm Temoney */}
            <aside className="h-full w-64 fixed left-0 top-0 bg-white border-r border-amber-100 flex flex-col p-4 z-40 hidden md:flex shadow-xs">
                <div className="mb-8 px-4 pt-2">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
                        <img src="/Teemoney.png" alt="Temoney Logo" className="w-10 h-10 object-contain drop-shadow-sm" />
                        <div>
                            <h1 className="font-extrabold text-amber-950 text-xl tracking-tight">Temoney</h1>
                            <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">{t('nav.premiumTier', 'GÓI PREMIUM')}</p>
                        </div>
                    </div>
                </div>

                <nav className="space-y-1 flex-1">
                    <NavItem icon="dashboard" label={t('nav.dashboard', 'Trang chủ')} onClick={() => navigate('/dashboard')} />
                    <NavItem icon="receipt_long" label={t('nav.activity', 'Lịch sử giao dịch')} onClick={() => navigate('/activity')} />
                    <NavItem icon="add_circle" label={t('nav.addNew', 'Thêm giao dịch')} onClick={() => navigate('/addnew')} />
                    <NavItem icon="pie_chart" label={t('nav.analytics', 'Phân tích')} onClick={() => navigate('/analyst')} />
                    <NavItem icon="account_balance_wallet" label={t('nav.budgets', 'Ngân sách')} active />
                    <div className="my-3 border-t border-amber-100"></div>
                    <NavItem icon="groups" label={t('nav.group', 'Chi tiêu nhóm')} onClick={() => navigate('/group')} />
                    {localStorage.getItem('role') === 'ROLE_ADMIN' && (
                        <NavItem icon="shield_person" label="Quản trị hệ thống" onClick={() => navigate('/admin')} />
                    )}
                </nav>

                <div className="mt-auto pt-4 border-t border-amber-100 flex flex-col gap-2">
                    <NavItem icon="settings" label={t('nav.settings', 'Cài đặt')} onClick={openSettings} />
                    <UserProfileBadge />
                </div>
            </aside>

            {/* Main Content */}
            <main className="md:ml-64 flex-1 p-8 lg:p-12">
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-10">
                    <div>
                        <h2 className="text-3xl font-extrabold text-amber-950 tracking-tight font-headline">
                            {t('budgets.title', 'Thiết lập Ngân sách')}
                        </h2>

                        {/* BỘ LỌC THÁNG */}
                        <div className="flex items-center gap-3 mt-3 bg-white w-max px-4 py-2 rounded-2xl border border-amber-200/80 shadow-xs">
                            <span className="material-symbols-outlined text-amber-500">calendar_month</span>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Xem tháng:</span>
                            <input
                                type="month"
                                value={currentMonth}
                                onChange={(e) => setCurrentMonth(e.target.value)}
                                min={getCurrentMonthMin()}
                                className="bg-transparent border-none font-black text-amber-900 cursor-pointer focus:ring-0 p-0 text-base"
                            />
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            setTargetMonth(currentMonth);
                            setShowPopup(true);
                        }}
                        className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 transition-all cursor-pointer"
                    >
                        <span className="material-symbols-outlined">add</span>
                        <span>Tạo ngân sách (6 Lọ)</span>
                    </button>
                </header>



                {/* Trạng thái Loading hoặc Trống */}

                {loading ? (

                    <div className="flex justify-center items-center py-20">

                        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>

                    </div>

                ) : budgets.length === 0 ? (

                    <div className="bg-white p-12 rounded-[2rem] text-center border border-dashed border-slate-300">

                        <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">

                            <span className="material-symbols-outlined text-4xl">account_balance_wallet</span>

                        </div>

                        <h3 className="text-xl font-bold text-primary">Chưa có ngân sách nào</h3>

                        <p className="text-slate-500 mt-2">Tháng {currentMonth.split('-')[1]} hiện chưa được thiết lập hạn mức.</p>



                        <button

                            onClick={() => {

                                setTargetMonth(currentMonth);

                                setShowPopup(true);

                            }}

                            className="mt-6 text-primary font-bold hover:underline"

                        >

                            Phân bổ ngay

                        </button>

                    </div>

                ) : (

                    <>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">

                            {/* Amber Hero Card */}
                            <div className="lg:col-span-2 bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 p-8 rounded-3xl text-white shadow-xl shadow-amber-500/20 relative overflow-hidden">
                                <div className="relative z-10">
                                    <p className="text-amber-100 font-medium mb-2 text-sm">Tổng ngân sách tháng này</p>
                                    <h3 className="text-5xl font-black font-headline mb-6 tracking-tight">{totalLimit.toLocaleString('vi-VN')} VND</h3>
                                    <div className="flex items-center gap-6">
                                        <div>
                                            <p className="text-xs text-amber-100 uppercase tracking-wider font-bold">Đã chi</p>
                                            <p className="text-xl font-black mt-0.5">{totalSpent.toLocaleString('vi-VN')} VND</p>
                                        </div>
                                        <div className="h-10 w-px bg-white/20"></div>
                                        <div>
                                            <p className="text-xs text-amber-100 uppercase tracking-wider font-bold">Còn lại</p>
                                            <p className="text-xl font-black mt-0.5">{remaining.toLocaleString('vi-VN')} VND</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                            </div>

                            {/* Warning Card */}
                            <div className="bg-white p-8 rounded-3xl border border-amber-100/80 shadow-xs flex flex-col justify-between">
                                <div>
                                    <div className={`flex items-center gap-2 mb-4 ${spentPercent >= 80 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        <span className="material-symbols-outlined">{spentPercent >= 80 ? 'warning' : 'check_circle'}</span>
                                        <span className="font-extrabold text-sm uppercase tracking-wider">{spentPercent >= 80 ? 'CẢNH BÁO CHI TIÊU' : 'NGÂN SÁCH AN TOÀN'}</span>
                                    </div>
                                    <p className="text-slate-600 text-sm leading-relaxed">
                                        Bạn đã sử dụng <span className="font-bold text-amber-950">{spentPercent}%</span> tổng ngân sách.
                                        {overLimitCount > 0 ? ` ${overLimitCount} danh mục đã vượt ngưỡng an toàn (80%).` : ' Các danh mục đều ở mức an toàn.'}
                                    </p>
                                </div>
                                <div className="mt-6 flex flex-col gap-2">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-slate-500">Tiến độ tổng</span>
                                        <span className={spentPercent >= 80 ? 'text-rose-600' : 'text-emerald-600'}>{spentPercent}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`${spentPercent >= 80 ? 'bg-rose-500' : 'bg-emerald-500'} h-full transition-all duration-500`} style={{ width: `${Math.min(spentPercent, 100)}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>



                        {/* Categories List */}

                        <section>
                            <div className="flex items-center justify-between mb-6">
                                <h4 className="text-xl font-extrabold font-headline text-amber-950">Danh mục chi tiêu</h4>
                                <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                                    <StatusLabel color="bg-emerald-500" text="An toàn" />
                                    <StatusLabel color="bg-amber-500" text="Cảnh báo" />
                                    <StatusLabel color="bg-rose-500" text="Vượt mức" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                {budgets.map(item => (
                                    <BudgetItem key={item.id} data={item} />
                                ))}
                            </div>
                        </section>

                        <footer className="mt-14 bg-amber-50/70 rounded-3xl p-7 flex flex-col sm:flex-row items-center gap-6 border border-amber-200/60 shadow-xs">
                            <div className="w-20 h-20 shrink-0 rounded-2xl overflow-hidden bg-white shadow-sm border border-amber-200/50">
                                <img alt="Budget Tip" className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1512358959174-b704cd9b52e1?auto=format&fit=crop&q=80&w=200" />
                            </div>
                            <div>
                                <h5 className="text-lg font-black text-amber-950 mb-1.5">Mẹo tiết kiệm tháng này</h5>
                                <p className="text-slate-600 text-xs md:text-sm leading-relaxed max-w-2xl">
                                    Dựa trên thói quen chi tiêu của bạn, việc bám sát <span className="font-extrabold text-amber-900">Lọ Thiết Yếu (55%)</span> và không lấn sang các quỹ khác có thể giúp bạn tiết kiệm thêm một khoản đáng kể vào cuối tháng.
                                </p>
                            </div>
                        </footer>

                    </>

                )}

            </main>



            {/* POPUP NHẬP THU NHẬP 6 LỌ */}
            {showPopup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl relative slide-in-from-bottom-4 border border-amber-100">
                        <button onClick={() => setShowPopup(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all">
                            <span className="material-symbols-outlined">close</span>
                        </button>

                        <div className="text-center mb-8">
                            <h3 className="text-2xl font-black text-amber-950 font-headline">Phân Bổ Ngân Sách</h3>
                            <p className="text-xs text-slate-500 mt-2">Hệ thống sẽ chia ngân sách theo quy tắc 6 chiếc lọ chuẩn Temoney.</p>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Tháng áp dụng</label>
                                <input
                                    type="month"
                                    value={targetMonth}
                                    onChange={(e) => setTargetMonth(e.target.value)}
                                    min={getCurrentMonthMin()}
                                    className="w-full p-4 bg-amber-50/40 border border-amber-200 rounded-2xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none font-bold text-amber-950"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Tổng thu nhập dự kiến (VND)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-amber-600">₫</span>
                                    <input
                                        type="number"
                                        value={inputAmount}
                                        onChange={(e) => setInputAmount(e.target.value)}
                                        placeholder="VD: 20000000"
                                        className="w-full p-4 pl-10 bg-amber-50/40 border border-amber-200 rounded-2xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-xl font-black text-amber-950"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleSaveBudget}
                                className="w-full py-4 mt-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-base rounded-2xl active:scale-95 shadow-lg shadow-amber-500/25 transition-all flex justify-center items-center gap-2 cursor-pointer"
                            >

                                <span className="material-symbols-outlined">auto_awesome</span>

                                Tạo Ngân Sách Tự Động

                            </button>

                        </div>

                    </div>

                </div>

            )}

        </div>

    );

};



// --- Sub-components ---
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

const StatusLabel = ({ color, text }) => (
    <span className="flex items-center gap-1.5">
        <span className={`w-2.5 h-2.5 rounded-full ${color}`}></span>
        <span>{text}</span>
    </span>
);

const BudgetItem = ({ data }) => {
    const percent = data.limit > 0 ? Math.round((data.spent / data.limit) * 100) : 0;

    let currentStatus = 'safe';
    if (percent >= 100) currentStatus = 'danger';
    else if (percent >= 80) currentStatus = 'warning';

    const statusConfig = {
        danger: { bg: 'bg-rose-50', text: 'text-rose-700', bar: 'bg-rose-500', iconBg: 'bg-rose-100 text-rose-600' },
        warning: { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500', iconBg: 'bg-amber-100 text-amber-600' },
        safe: { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500', iconBg: 'bg-emerald-100 text-emerald-600' }
    };

    const config = statusConfig[currentStatus];

    return (
        <div className="bg-white p-6 rounded-2xl transition-all hover:bg-amber-50/30 border border-amber-100/80 shadow-xs group">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4 min-w-[240px]">
                    <div className={`w-12 h-12 rounded-2xl ${config.iconBg} flex items-center justify-center`}>
                        <span className="material-symbols-outlined text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>{data.icon}</span>
                    </div>
                    <div>
                        <p className="font-extrabold text-amber-950 text-sm md:text-base">{data.name}</p>
                        <p className="text-[11px] text-slate-400 font-medium">Cập nhật tự động</p>
                    </div>
                </div>

                <div className="flex-grow max-w-xl">
                    <div className="flex justify-between mb-2 text-xs md:text-sm">
                        <span className="text-slate-600">
                            <span className="font-extrabold text-slate-800">{data.spent.toLocaleString('vi-VN')} VND</span> / {data.limit.toLocaleString('vi-VN')} VND
                        </span>
                        <span className={`font-black ${config.text}`}>{percent}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`${config.bar} h-full transition-all duration-500 rounded-full`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button className="p-2 rounded-xl hover:bg-amber-50 text-slate-400 hover:text-amber-700 transition-colors"><span className="material-symbols-outlined text-lg">edit</span></button>
                    <button className="p-2 rounded-xl hover:bg-amber-50 text-slate-400 hover:text-amber-700 transition-colors"><span className="material-symbols-outlined text-lg">more_vert</span></button>
                </div>
            </div>
        </div>
    );
};

export default Budgets;
