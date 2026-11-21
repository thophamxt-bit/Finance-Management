import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { useLanguage } from '../../context/LanguageContext';
import { formatAvatarUrl } from '../group/MyQRCodeModal';

// Danh sách các avatar phong cách có sẵn để người dùng lựa chọn nhanh
const PRESET_AVATARS = [
    "https://api.dicebear.com/7.x/bottts/svg?seed=Aura1",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Aura2",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Felix",
    "https://api.dicebear.com/7.x/bottts/svg?seed=AuraFox",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=AuraGirl",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=AuraBoy",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia"
];

const UserProfileModal = ({ isOpen, onClose, onProfileUpdated }) => {
    const navigate = useNavigate();
    const { language, setLanguage, openSettings, t } = useLanguage();

    // Dữ liệu người dùng
    const [profile, setProfile] = useState({
        id: null,
        fullName: '',
        username: '',
        email: '',
        userCode: '',
        dateOfBirth: '',
        avatarUrl: '',
        currency: 'VND'
    });

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [copiedCode, setCopiedCode] = useState(false);
    const [copiedQR, setCopiedQR] = useState(false);

    // Tab đổi avatar: 'NONE' | 'UPLOAD' | 'PRESET' | 'URL'
    const [avatarTab, setAvatarTab] = useState('NONE');
    const [customUrlInput, setCustomUrlInput] = useState('');
    const fileInputRef = useRef(null);

    // Tải thông tin người dùng từ server khi mở modal
    useEffect(() => {
        if (isOpen) {
            fetchUserProfile();
            setErrorMsg('');
            setSuccessMsg('');
            setAvatarTab('NONE');
        }
    }, [isOpen]);

    const fetchUserProfile = async () => {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
            onClose();
            navigate("/login");
            return;
        }

        try {
            const res = await axios.get("http://localhost:8080/api/auth/profile", {
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data;
            const code = data.userCode || (data.id ? String(Math.abs((data.id * 15379) % 900000 + 100000)) : '108249');

            setProfile({
                id: data.id,
                fullName: data.fullName || '',
                username: data.username || '',
                email: data.email || '',
                userCode: code,
                dateOfBirth: data.dateOfBirth || '',
                avatarUrl: data.avatarUrl || '',
                currency: data.currency || 'VND'
            });

            // Tạo mã QR tương ứng
            generateQRCode(code);
        } catch (err) {
            console.error("Lỗi lấy thông tin hồ sơ:", err);
            setErrorMsg("Không thể tải thông tin cá nhân. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    // Tạo mã QR bằng thư viện qrcode
    const generateQRCode = (code) => {
        const payload = `AURA_USER:${code}`;
        QRCode.toDataURL(payload, {
            width: 250,
            margin: 2,
            color: {
                dark: '#00357f',
                light: '#ffffff'
            }
        })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error("Lỗi tạo mã QR:", err));
    };

    // Xử lý đổi ảnh từ file trên máy
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Giới hạn kích thước file < 5MB
        if (file.size > 5 * 1024 * 1024) {
            alert("Vui lòng chọn ảnh có kích thước dưới 5MB!");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setProfile(prev => ({ ...prev, avatarUrl: reader.result }));
            setAvatarTab('NONE');
        };
        reader.readAsDataURL(file);
    };

    // Chọn avatar mẫu
    const handleSelectPreset = (url) => {
        setProfile(prev => ({ ...prev, avatarUrl: url }));
        setAvatarTab('NONE');
    };

    // Nhập URL ảnh tùy ý
    const handleApplyUrl = () => {
        if (!customUrlInput.trim()) return;
        setProfile(prev => ({ ...prev, avatarUrl: customUrlInput.trim() }));
        setCustomUrlInput('');
        setAvatarTab('NONE');
    };

    // Sao chép mã người dùng
    const handleCopyCode = () => {
        if (!profile.userCode) return;
        navigator.clipboard.writeText(profile.userCode);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    // Tải ảnh mã QR về máy
    const handleDownloadQR = () => {
        if (!qrDataUrl) return;
        const link = document.createElement('a');
        link.download = `user-qr-${profile.userCode || 'code'}.png`;
        link.href = qrDataUrl;
        link.click();
    };

    // Sao chép chuỗi mã QR
    const handleCopyQRPayload = () => {
        const payload = `AURA_USER:${profile.userCode}`;
        navigator.clipboard.writeText(payload);
        setCopiedQR(true);
        setTimeout(() => setCopiedQR(false), 2000);
    };

    // Lưu cập nhật hồ sơ (PUT /api/auth/profile)
    const handleSave = async (e) => {
        e?.preventDefault();
        setSaving(true);
        setErrorMsg('');
        setSuccessMsg('');

        const token = localStorage.getItem("token");
        try {
            const body = {
                fullName: profile.fullName,
                avatarUrl: profile.avatarUrl,
                dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth : null
            };

            const res = await axios.put("http://localhost:8080/api/auth/profile", body, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const updatedUser = res.data?.user || profile;
            setSuccessMsg("Cập nhật thông tin hồ sơ thành công!");
            window.dispatchEvent(new CustomEvent('temoney_profile_updated', { detail: updatedUser }));
            if (onProfileUpdated) {
                onProfileUpdated(updatedUser);
            }
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            console.error("Lỗi cập nhật hồ sơ:", err);
            setErrorMsg(err.response?.data?.message || "Lỗi khi lưu thông tin. Vui lòng thử lại!");
        } finally {
            setSaving(false);
        }
    };

    // Đăng xuất
    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        onClose();
        navigate("/login");
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col relative">

                {/* Header Gradient */}
                <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 p-6 text-white relative rounded-t-[2.5rem] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                            <span className="material-symbols-outlined text-2xl">badge</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-black font-headline tracking-tight">Hồ sơ người dùng</h3>
                            <p className="text-xs text-blue-200">Thông tin tài khoản cá nhân & Mã kết nối</p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all text-white cursor-pointer"
                        title="Đóng"
                    >
                        <span className="material-symbols-outlined text-base">close</span>
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 md:p-8 space-y-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
                            <p className="mt-4 text-xs font-bold text-slate-500">Đang tải thông tin cá nhân...</p>
                        </div>
                    ) : (
                        <>
                            {/* Alert Thông báo */}
                            {successMsg && (
                                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                                    <span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span>
                                    <span>{successMsg}</span>
                                </div>
                            )}
                            {errorMsg && (
                                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                                    <span className="material-symbols-outlined text-rose-600 text-lg">error</span>
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            {/* Section 1: AVATAR & THAY ĐỔI ẢNH ĐẠI DIỆN */}
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/80 flex flex-col md:flex-row items-center gap-6">
                                <div className="relative group shrink-0">
                                    <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-blue-900 to-indigo-800 text-white flex items-center justify-center font-black text-4xl shadow-lg border-4 border-white overflow-hidden">
                                        {profile.avatarUrl ? (
                                            <img
                                                src={formatAvatarUrl(profile.avatarUrl)}
                                                alt="Avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            (profile.fullName || profile.username || 'U').charAt(0).toUpperCase()
                                        )}
                                    </div>

                                    {/* Nút overlay đổi ảnh */}
                                    <button
                                        type="button"
                                        onClick={() => setAvatarTab(avatarTab === 'NONE' ? 'UPLOAD' : 'NONE')}
                                        className="absolute inset-0 rounded-full bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-4 border-white"
                                        title="Bấm để đổi ảnh đại diện"
                                    >
                                        <span className="material-symbols-outlined text-2xl">photo_camera</span>
                                        <span className="text-[10px] font-bold mt-1">Đổi ảnh</span>
                                    </button>
                                </div>

                                <div className="flex-1 text-center md:text-left space-y-1">
                                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                        <h4 className="text-xl font-extrabold text-blue-950 font-headline">
                                            {profile.fullName || 'Người dùng'}
                                        </h4>
                                        <span className="bg-blue-100 text-blue-900 text-[10px] font-black px-2 py-0.5 rounded-full font-mono">
                                            #{profile.userCode}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium">@{profile.username} • {profile.email}</p>

                                    {/* Action đổi ảnh đại diện */}
                                    <div className="pt-2 flex flex-wrap gap-2 justify-center md:justify-start">
                                        <button
                                            type="button"
                                            onClick={() => setAvatarTab('UPLOAD')}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                                                avatarTab === 'UPLOAD'
                                                    ? 'bg-blue-900 text-white border-blue-900 shadow-sm'
                                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                            }`}
                                        >
                                            <span className="material-symbols-outlined text-sm">upload</span>
                                            <span>Tải ảnh từ máy</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setAvatarTab('PRESET')}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                                                avatarTab === 'PRESET'
                                                    ? 'bg-blue-900 text-white border-blue-900 shadow-sm'
                                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                            }`}
                                        >
                                            <span className="material-symbols-outlined text-sm">face</span>
                                            <span>Chọn ảnh mẫu</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setAvatarTab('URL')}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                                                avatarTab === 'URL'
                                                    ? 'bg-blue-900 text-white border-blue-900 shadow-sm'
                                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                            }`}
                                        >
                                            <span className="material-symbols-outlined text-sm">link</span>
                                            <span>Dán link ảnh</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Menu con Đổi ảnh */}
                            {avatarTab === 'UPLOAD' && (
                                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in">
                                    <div className="flex items-center gap-2 text-xs text-blue-900 font-medium">
                                        <span className="material-symbols-outlined text-lg text-blue-700">add_photo_alternate</span>
                                        <span>Chọn file ảnh định dạng PNG, JPG, JPEG từ thiết bị</span>
                                    </div>
                                    <label className="bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm shrink-0">
                                        <span>Chọn file ảnh</span>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                            )}

                            {avatarTab === 'PRESET' && (
                                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3 animate-in fade-in">
                                    <p className="text-xs font-bold text-blue-900">Chọn ảnh avatar mẫu yêu thích:</p>
                                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                                        {PRESET_AVATARS.map((url, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => handleSelectPreset(url)}
                                                className="w-12 h-12 rounded-full border-2 border-white hover:border-blue-700 hover:scale-110 shadow-sm bg-white overflow-hidden transition-all cursor-pointer"
                                            >
                                                <img src={url} alt={`Preset ${i}`} className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {avatarTab === 'URL' && (
                                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex gap-2 animate-in fade-in">
                                    <input
                                        type="url"
                                        value={customUrlInput}
                                        onChange={(e) => setCustomUrlInput(e.target.value)}
                                        placeholder="Dán đường dẫn ảnh (https://...)"
                                        className="flex-1 bg-white border border-blue-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-blue-900"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleApplyUrl}
                                        className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                                    >
                                        Áp dụng
                                    </button>
                                </div>
                            )}

                            {/* Section 2: BẢNG THÔNG TIN CHI TIẾT & MÃ QR */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                                {/* Cột Trái: BẢNG THÔNG TIN NGƯỜI DÙNG (7 Cột) */}
                                <div className="md:col-span-7 space-y-4">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-base">table_chart</span>
                                        <span>Bảng thông tin chi tiết</span>
                                    </h4>

                                    {/* Bảng dạng card hiện đại */}
                                    <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-xs overflow-hidden">

                                        {/* Họ và tên */}
                                        <div className="p-3.5 flex items-center justify-between gap-3">
                                            <div className="w-1/3 flex items-center gap-2 text-xs font-bold text-slate-500">
                                                <span className="material-symbols-outlined text-base text-slate-400">person</span>
                                                <span>Họ và tên</span>
                                            </div>
                                            <div className="w-2/3">
                                                <input
                                                    type="text"
                                                    value={profile.fullName}
                                                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                                                    placeholder="Nhập họ và tên..."
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-1 focus:ring-blue-900"
                                                />
                                            </div>
                                        </div>

                                        {/* Email */}
                                        <div className="p-3.5 flex items-center justify-between gap-3">
                                            <div className="w-1/3 flex items-center gap-2 text-xs font-bold text-slate-500">
                                                <span className="material-symbols-outlined text-base text-slate-400">mail</span>
                                                <span>Email</span>
                                            </div>
                                            <div className="w-2/3 flex items-center justify-between">
                                                <span className="text-xs font-semibold text-slate-800 truncate">{profile.email}</span>
                                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                                                    Đã xác thực
                                                </span>
                                            </div>
                                        </div>

                                        {/* Mã người dùng (User Code) */}
                                        <div className="p-3.5 flex items-center justify-between gap-3 bg-blue-50/40">
                                            <div className="w-1/3 flex items-center gap-2 text-xs font-bold text-blue-900">
                                                <span className="material-symbols-outlined text-base text-blue-700">tag</span>
                                                <span>Mã người dùng</span>
                                            </div>
                                            <div className="w-2/3 flex items-center justify-between">
                                                <span className="font-mono text-base font-black text-blue-950 tracking-widest">
                                                    {profile.userCode}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={handleCopyCode}
                                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all border cursor-pointer ${
                                                        copiedCode
                                                            ? 'bg-emerald-600 text-white border-emerald-600'
                                                            : 'bg-white text-blue-900 border-blue-200 hover:bg-blue-100'
                                                    }`}
                                                    title="Sao chép mã"
                                                >
                                                    <span className="material-symbols-outlined text-sm">
                                                        {copiedCode ? 'check' : 'content_copy'}
                                                    </span>
                                                    <span>{copiedCode ? 'Đã chép' : 'Chép'}</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Ngày sinh */}
                                        <div className="p-3.5 flex items-center justify-between gap-3">
                                            <div className="w-1/3 flex items-center gap-2 text-xs font-bold text-slate-500">
                                                <span className="material-symbols-outlined text-base text-slate-400">cake</span>
                                                <span>Ngày sinh</span>
                                            </div>
                                            <div className="w-2/3">
                                                <input
                                                    type="date"
                                                    value={profile.dateOfBirth}
                                                    onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-1 focus:ring-blue-900"
                                                />
                                            </div>
                                        </div>

                                        {/* Tên đăng nhập */}
                                        <div className="p-3.5 flex items-center justify-between gap-3">
                                            <div className="w-1/3 flex items-center gap-2 text-xs font-bold text-slate-500">
                                                <span className="material-symbols-outlined text-base text-slate-400">account_circle</span>
                                                <span>{t('profile.username', 'Username')}</span>
                                            </div>
                                            <div className="w-2/3 text-xs font-semibold text-slate-700">
                                                @{profile.username}
                                            </div>
                                        </div>

                                        {/* Ngôn ngữ hiển thị (Đồng bộ với Settings & Nút góc phải) */}
                                        <div className="p-3.5 flex items-center justify-between gap-3 bg-blue-50/30">
                                            <div className="w-1/3 flex items-center gap-2 text-xs font-bold text-blue-900">
                                                <span className="material-symbols-outlined text-base text-blue-700">language</span>
                                                <span>{t('profile.languageSetting', 'Ngôn ngữ:')}</span>
                                            </div>
                                            <div className="w-2/3 flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setLanguage('vi')}
                                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                            language === 'vi'
                                                                ? 'bg-blue-900 text-white shadow-xs'
                                                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                                                        }`}
                                                    >
                                                        🇻🇳 VI
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setLanguage('en')}
                                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                            language === 'en'
                                                                ? 'bg-blue-900 text-white shadow-xs'
                                                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                                                        }`}
                                                    >
                                                        🇬🇧 EN
                                                    </button>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        onClose();
                                                        openSettings();
                                                    }}
                                                    className="text-[11px] font-bold text-blue-900 hover:underline flex items-center gap-1 cursor-pointer"
                                                    title={t('profile.openSettingsModal', 'Mở Cài đặt hệ thống')}
                                                >
                                                    <span className="material-symbols-outlined text-sm">settings</span>
                                                    <span>{t('profile.openSettingsModal', 'Cài đặt')}</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Cột Phải: MÃ QR CÁ NHÂN (5 Cột) */}
                                <div className="md:col-span-5 flex flex-col items-center justify-center p-5 bg-slate-50 rounded-2xl border border-slate-200/80">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-base text-blue-900">qr_code_2</span>
                                        <span>Mã QR Cá Nhân</span>
                                    </h4>

                                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 mb-3 flex items-center justify-center">
                                        {qrDataUrl ? (
                                            <img
                                                src={qrDataUrl}
                                                alt="Mã QR"
                                                className="w-36 h-36 object-contain"
                                            />
                                        ) : (
                                            <div className="w-36 h-36 flex items-center justify-center text-xs text-slate-400">
                                                Đang tạo QR...
                                            </div>
                                        )}
                                    </div>

                                    <p className="text-[11px] text-center text-slate-400 font-medium px-2 mb-3">
                                        Quét mã để kết bạn và mời vào nhóm chi tiêu
                                    </p>

                                    <div className="grid grid-cols-2 gap-2 w-full">
                                        <button
                                            type="button"
                                            onClick={handleDownloadQR}
                                            className="py-2 px-2 bg-blue-50 text-blue-900 hover:bg-blue-100 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all border border-blue-200 cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-sm">download</span>
                                            <span>Tải ảnh</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCopyQRPayload}
                                            className="py-2 px-2 bg-white text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all border border-slate-200 cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-sm">
                                                {copiedQR ? 'check' : 'content_copy'}
                                            </span>
                                            <span>{copiedQR ? 'Đã chép' : 'Chép link'}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: CÁC NÚT THAO TÁC (Lưu thay đổi / Đăng xuất / Đóng) */}
                            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="w-full sm:w-auto px-4 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-rose-200 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-sm">logout</span>
                                    <span>Đăng xuất tài khoản</span>
                                </button>

                                <div className="flex gap-2 w-full sm:w-auto">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 sm:flex-initial px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                    >
                                        Đóng
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex-1 sm:flex-initial px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-900/20 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-sm">
                                            {saving ? 'sync' : 'save'}
                                        </span>
                                        <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserProfileModal;