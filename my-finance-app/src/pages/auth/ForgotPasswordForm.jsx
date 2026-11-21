import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import logoImg from '../../assets/Teemoney.png';

const ForgotPasswordForm = () => {
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [sendingOtp, setSendingOtp] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [otpCooldown, setOtpCooldown] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (otpCooldown <= 0) return;
        const timer = setInterval(() => {
            setOtpCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [otpCooldown]);

    const validateEmail = (inputEmail) => {
        const clean = (inputEmail || '').trim().toLowerCase();
        if (!clean) return 'Vui lòng nhập địa chỉ email đã đăng ký!';
        const emailRegex = /^[a-zA-Z0-9_+&*-]+(?:\.[a-zA-Z0-9_+&*-]+)*@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
        if (!emailRegex.test(clean)) return 'Email không đúng định dạng!';
        return null;
    };

    const handleSendOtp = async () => {
        setError('');
        setSuccessMsg('');

        const emailErr = validateEmail(email);
        if (emailErr) {
            setError(emailErr);
            return;
        }

        setSendingOtp(true);
        try {
            const cleanEmail = email.trim().toLowerCase();
            const res = await api.post('/api/auth/forgot-password/send-otp', { email: cleanEmail });
            setOtpSent(true);
            setOtpCooldown(60);
            setSuccessMsg(res.data?.message || `Mã OTP đã được gửi đến ${cleanEmail}. Vui lòng kiểm tra hộp thư!`);
        } catch (err) {
            console.error('Lỗi gửi OTP quên mật khẩu:', err);
            setError(err.response?.data?.message || 'Không thể gửi mã OTP. Vui lòng kiểm tra lại email!');
        } finally {
            setSendingOtp(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        const emailErr = validateEmail(email);
        if (emailErr) {
            setError(emailErr);
            return;
        }

        if (!otp.trim() || otp.trim().length < 4) {
            setError('Vui lòng nhập mã xác thực OTP đã gửi về email của bạn!');
            return;
        }

        if (newPassword.length < 6) {
            setError('Mật khẩu mới phải có độ dài ít nhất 6 ký tự!');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Mật khẩu xác nhận không trùng khớp!');
            return;
        }

        setLoading(true);
        try {
            const cleanEmail = email.trim().toLowerCase();
            const res = await api.post('/api/auth/forgot-password/reset', {
                email: cleanEmail,
                otp: otp.trim(),
                newPassword,
                confirmPassword
            });

            alert(res.data?.message || 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.');
            navigate('/login');
        } catch (err) {
            console.error('Lỗi đặt lại mật khẩu:', err);
            setError(err.response?.data?.message || 'Không thể đặt lại mật khẩu. Vui lòng kiểm tra mã OTP!');
        } finally {
            setLoading(false);
        }
    };

    const isPasswordMatching = confirmPassword && newPassword === confirmPassword;

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#fcf8f4] p-6 relative">
            {/* Nút Quay lại Đăng nhập */}
            <button
                type="button"
                onClick={() => navigate('/login')}
                className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-amber-800 hover:-translate-x-1 transition-all cursor-pointer"
            >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                Quay lại Đăng nhập
            </button>

            <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-[2.5rem] border border-amber-100 shadow-2xl shadow-amber-900/5 relative">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                        <img src={logoImg} alt="Temoney Logo" className="w-full h-full object-contain drop-shadow-md" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-amber-950 tracking-tight">Quên mật khẩu?</h2>
                    <p className="text-slate-500 text-sm mt-1 font-medium">
                        Nhập email đã đăng ký để nhận mã OTP khôi phục mật khẩu
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3.5 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-red-500 flex-shrink-0">error</span>
                        <span>{error}</span>
                    </div>
                )}

                {successMsg && (
                    <div className="mb-4 p-3.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-emerald-600 flex-shrink-0">mark_email_read</span>
                        <span>{successMsg}</span>
                    </div>
                )}

                <form className="space-y-4" onSubmit={handleResetPassword}>
                    {/* 1. EMAIL + NÚT GỬI OTP */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                            Email tài khoản
                        </label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-11 pr-3 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white outline-none transition-all text-sm text-slate-800"
                                    placeholder="name@gmail.com"
                                />
                                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                                    mail
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={handleSendOtp}
                                disabled={sendingOtp || otpCooldown > 0}
                                className={`px-4 py-3 rounded-2xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                                    sendingOtp || otpCooldown > 0
                                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                        : 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-600/20 active:scale-95'
                                }`}
                            >
                                <span className={`material-symbols-outlined text-[16px] ${sendingOtp ? 'animate-spin' : ''}`}>
                                    {sendingOtp ? 'progress_activity' : 'send'}
                                </span>
                                {otpCooldown > 0 ? `${otpCooldown}s` : (otpSent ? 'Gửi lại' : 'Gửi mã OTP')}
                            </button>
                        </div>
                    </div>

                    {/* 2. MÃ OTP 6 CHỮ SỐ */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5 ml-1 mr-1">
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                                Mã xác thực OTP
                            </label>
                            {otpSent && (
                                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                                    Hiệu lực 5 phút
                                </span>
                            )}
                        </div>
                        <div className="relative">
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                required
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white outline-none transition-all text-sm font-mono font-bold tracking-[0.35em] text-slate-800"
                                placeholder="••••••"
                            />
                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                                verified_user
                            </span>
                        </div>
                    </div>

                    {/* 3. MẬT KHẨU MỚI */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                            Mật khẩu mới
                        </label>
                        <div className="relative">
                            <input
                                type={showNewPassword ? 'text' : 'password'}
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full pl-11 pr-11 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white outline-none transition-all text-sm text-slate-800"
                                placeholder="Tối thiểu 6 ký tự"
                            />
                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                                lock
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-[20px]">
                                    {showNewPassword ? 'visibility' : 'visibility_off'}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* 4. XÁC NHẬN MẬT KHẨU MỚI */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5 ml-1 mr-1">
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                                Xác nhận mật khẩu mới
                            </label>
                            {confirmPassword && (
                                <span className={`text-[11px] font-bold flex items-center gap-0.5 ${isPasswordMatching ? 'text-emerald-600' : 'text-red-500'}`}>
                                    <span className="material-symbols-outlined text-[14px]">
                                        {isPasswordMatching ? 'check_circle' : 'cancel'}
                                    </span>
                                    {isPasswordMatching ? 'Khớp mật khẩu' : 'Chưa khớp'}
                                </span>
                            )}
                        </div>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`w-full pl-11 pr-11 py-3 rounded-2xl bg-slate-50 border outline-none transition-all text-sm text-slate-800 focus:bg-white ${
                                    confirmPassword
                                        ? isPasswordMatching
                                            ? 'border-emerald-500 focus:border-emerald-600'
                                            : 'border-red-400 focus:border-red-500'
                                        : 'border-slate-200 focus:border-amber-500'
                                }`}
                                placeholder="Nhập lại mật khẩu mới"
                            />
                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                                lock_reset
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-[20px]">
                                    {showConfirmPassword ? 'visibility' : 'visibility_off'}
                                </span>
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-4 rounded-2xl font-extrabold text-base shadow-lg transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer ${
                            loading
                                ? 'bg-slate-400 cursor-not-allowed text-white'
                                : 'bg-amber-600 text-white hover:bg-amber-700 shadow-amber-600/20 hover:scale-[1.01] active:scale-95'
                        }`}
                    >
                        {loading ? (
                            <>
                                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                <span>Đang cập nhật mật khẩu...</span>
                            </>
                        ) : (
                            <span>Đặt lại mật khẩu</span>
                        )}
                    </button>
                </form>

                <p className="text-center text-sm text-slate-500 mt-6">
                    Nhớ mật khẩu rồi?{' '}
                    <Link to="/login" className="text-amber-700 font-bold hover:underline">
                        Đăng nhập ngay
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default ForgotPasswordForm;

