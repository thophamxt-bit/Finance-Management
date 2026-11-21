import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import logoImg from '../../assets/Teemoney.png';

const DISPOSABLE_EMAIL_DOMAINS = [
    'mailinator.com', '10minutemail.com', 'tempmail.com', 'guerrillamail.com',
    'yopmail.com', 'trashmail.com', 'sharklasers.com', 'getairmail.com',
    'dispostable.com', 'fakemailgenerator.com', 'dropmail.me'
];

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '400677255989-0nu901sd78pi09e8jmjgt48756ds52a4.apps.googleusercontent.com';

const RegisterForm = () => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const [sendingOtp, setSendingOtp] = useState(false);
    const [otpCooldown, setOtpCooldown] = useState(0);
    const [otpSent, setOtpSent] = useState(false);
    const [googleReady, setGoogleReady] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    const googleBtnRef = useRef(null);
    const navigate = useNavigate();

    // Đếm ngược 60s gửi lại mã OTP
    useEffect(() => {
        if (otpCooldown <= 0) return;
        const timer = setInterval(() => {
            setOtpCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [otpCooldown]);

    // Khởi tạo Google OAuth2 Identity Services
    useEffect(() => {
        const handleGoogleCredential = async (response) => {
            if (!response?.credential) return;
            setError('');
            setSuccessMsg('');
            setGoogleLoading(true);
            try {
                const res = await api.post('/api/auth/google', {
                    credential: response.credential
                });
                if (res.data && res.data.token) {
                    localStorage.setItem('token', res.data.token);
                    localStorage.setItem('username', res.data.username || res.data.email || '');
                    if (res.data.role) {
                        localStorage.setItem('role', res.data.role);
                    }
                    if (res.data.role === 'ROLE_ADMIN') {
                        navigate('/admin');
                    } else {
                        navigate('/dashboard');
                    }
                } else {
                    setError('Không nhận được token xác thực từ Google OAuth2!');
                }
            } catch (err) {
                console.error('Lỗi Google OAuth2:', err);
                setError(err.response?.data?.message || 'Đăng ký/Đăng nhập bằng Google thất bại!');
            } finally {
                setGoogleLoading(false);
            }
        };

        const initGoogle = () => {
            if (window.google?.accounts?.id && googleBtnRef.current) {
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleGoogleCredential
                });
                googleBtnRef.current.innerHTML = '';
                window.google.accounts.id.renderButton(googleBtnRef.current, {
                    theme: 'outline',
                    size: 'large',
                    text: 'signup_with',
                    shape: 'pill',
                    width: 360,
                    locale: 'vi'
                });
                setGoogleReady(true);
                return true;
            }
            return false;
        };

        if (!initGoogle()) {
            const checkInterval = setInterval(() => {
                if (initGoogle()) clearInterval(checkInterval);
            }, 300);
            const stopTimeout = setTimeout(() => clearInterval(checkInterval), 6000);
            return () => {
                clearInterval(checkInterval);
                clearTimeout(stopTimeout);
            };
        }
    }, [navigate]);

    const validateEmail = (inputEmail) => {
        const clean = (inputEmail || '').trim().toLowerCase();
        if (!clean) return { valid: false, message: 'Vui lòng nhập địa chỉ email!' };

        const emailRegex = /^[a-zA-Z0-9_+&*-]+(?:\.[a-zA-Z0-9_+&*-]+)*@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
        if (!emailRegex.test(clean)) {
            return { valid: false, message: 'Email không đúng định dạng! (Ví dụ: yourname@gmail.com)' };
        }

        const domain = clean.split('@')[1];
        if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
            return {
                valid: false,
                message: 'Vui lòng dùng email thật (Gmail, Outlook, Yahoo...) để nhận OTP và liên kết OAuth2!'
            };
        }

        return { valid: true };
    };

    const handleSendOtp = async () => {
        setError('');
        setSuccessMsg('');

        const emailCheck = validateEmail(email);
        if (!emailCheck.valid) {
            setError(emailCheck.message);
            return;
        }

        setSendingOtp(true);
        try {
            const cleanEmail = email.trim().toLowerCase();
            const res = await api.post('/api/auth/send-otp', { email: cleanEmail });
            setOtpSent(true);
            setOtpCooldown(60);
            setSuccessMsg(res.data?.message || `Mã OTP đã được gửi tới ${cleanEmail}. Vui lòng kiểm tra email!`);
        } catch (err) {
            console.error('Lỗi gửi OTP:', err);
            setError(err.response?.data?.message || 'Không thể gửi mã OTP. Vui lòng thử lại!');
        } finally {
            setSendingOtp(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        if (!fullName.trim()) {
            setError('Vui lòng nhập Họ và Tên của bạn!');
            return;
        }

        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
            setError(emailValidation.message);
            return;
        }

        if (!otp.trim() || otp.trim().length < 4) {
            setError('Vui lòng nhập mã xác thực OTP đã gửi về email của bạn!');
            return;
        }

        if (password.length < 6) {
            setError('Mật khẩu phải có độ dài ít nhất 6 ký tự!');
            return;
        }

        if (password !== confirmPassword) {
            setError('Mật khẩu xác nhận không trùng khớp! Vui lòng kiểm tra lại.');
            return;
        }

        setLoading(true);
        try {
            const cleanEmail = email.trim().toLowerCase();
            const response = await api.post('/api/auth/register', {
                fullName: fullName.trim(),
                email: cleanEmail,
                username: cleanEmail,
                password: password,
                confirmPassword: confirmPassword,
                otp: otp.trim()
            });

            if (response.status === 201 || response.status === 200) {
                alert('Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay bây giờ.');
                navigate('/login');
            }
        } catch (err) {
            console.error('Lỗi đăng ký:', err);
            setError(err.response?.data?.message || 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin và mã OTP!');
        } finally {
            setLoading(false);
        }
    };

    const handleFallbackGoogleClick = () => {
        if (window.google?.accounts?.id) {
            window.google.accounts.id.prompt();
        } else {
            setError('Google OAuth2 chưa sẵn sàng. Vui lòng kiểm tra kết nối mạng hoặc tắt trình chặn quảng cáo.');
        }
    };

    const isPasswordMatching = confirmPassword && password === confirmPassword;

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#fcf8f4] p-6 relative">
            {/* Nút Quay lại Trang chủ */}
            <button
                type="button"
                onClick={() => navigate('/')}
                className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-amber-800 hover:-translate-x-1 transition-all cursor-pointer"
            >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                Trang chủ
            </button>

            <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-[2.5rem] border border-amber-100 shadow-2xl shadow-amber-900/5 relative">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                        <img src={logoImg} alt="Temoney Logo" className="w-full h-full object-contain drop-shadow-md" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-amber-950 tracking-tight">Tạo tài khoản Temoney</h2>
                    <p className="text-slate-500 text-sm mt-1 font-medium">Xác thực OTP bảo mật & Đồng bộ Google OAuth2</p>
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

                <form className="space-y-4" onSubmit={handleRegister}>
                    {/* 1. HỌ VÀ TÊN */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                            Họ và Tên
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                required
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white outline-none transition-all text-sm text-slate-800"
                                placeholder="Nguyễn Văn A"
                            />
                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                                person
                            </span>
                        </div>
                    </div>

                    {/* 2. ĐỊA CHỈ EMAIL + NÚT GỬI MÃ OTP */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                            Địa chỉ Email
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

                    {/* 3. Ô NHẬP MÃ XÁC THỰC OTP */}
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

                    {/* 4. MẬT KHẨU */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                            Mật khẩu
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-11 pr-11 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white outline-none transition-all text-sm text-slate-800"
                                placeholder="Tối thiểu 6 ký tự"
                            />
                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                                lock
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-[20px]">
                                    {showPassword ? 'visibility' : 'visibility_off'}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* 5. XÁC THỰC LẠI MẬT KHẨU */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5 ml-1 mr-1">
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                                Xác thực lại mật khẩu
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
                                placeholder="Nhập lại mật khẩu ở trên"
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
                                <span>Đang khởi tạo tài khoản...</span>
                            </>
                        ) : (
                            <span>Đăng ký tài khoản</span>
                        )}
                    </button>
                </form>

                {/* PHÂN CÁCH & NÚT GOOGLE OAUTH2 */}
                <div className="my-6 flex items-center gap-3">
                    <div className="flex-1 h-px bg-slate-200"></div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Hoặc tiếp tục với</span>
                    <div className="flex-1 h-px bg-slate-200"></div>
                </div>

                <div className="flex flex-col items-center gap-2">
                    <div ref={googleBtnRef} className={googleReady ? 'flex justify-center w-full' : 'hidden'} />

                    {!googleReady && (
                        <button
                            type="button"
                            onClick={handleFallbackGoogleClick}
                            disabled={googleLoading}
                            className="w-full py-3.5 px-4 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm flex items-center justify-center gap-3 shadow-xs transition-all cursor-pointer active:scale-95"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#EA4335" d="M12 5c1.61 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.31 0 3.26 2.69 1.28 6.61l3.66 2.84C5.81 6.86 8.65 5 12 5z" />
                                <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.52-1.14 2.81-2.43 3.68l3.76 2.91c2.2-2.03 3.69-5.02 3.69-8.83z" />
                                <path fill="#FBBC05" d="M4.94 14.55c-.22-.66-.35-1.36-.35-2.05s.13-1.39.35-2.05L1.28 7.61C.46 9.23 0 11.06 0 12.5s.46 3.27 1.28 4.89l3.66-2.84z" />
                                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.76-2.91c-1.08.72-2.45 1.16-4.17 1.16-3.35 0-6.19-1.86-7.06-4.45l-3.66 2.84C3.26 21.31 7.31 24 12 24z" />
                            </svg>
                            <span>{googleLoading ? 'Đang xác thực Google...' : 'Đăng ký nhanh với Google'}</span>
                        </button>
                    )}
                </div>

                <p className="text-center text-sm text-slate-500 mt-6">
                    Đã có tài khoản?{' '}
                    <Link to="/login" className="text-amber-700 font-bold hover:underline">
                        Đăng nhập ngay
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default RegisterForm;
