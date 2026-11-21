import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import api from '../../services/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const formatAvatarUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
    if (url.startsWith('/')) return `${API_BASE_URL}${url}`;
    return `${API_BASE_URL}/${url}`;
};

// Hàm nén ảnh bằng HTML5 Canvas (tối đa 400x400, JPEG 0.82)
const compressImage = (file, maxWidth = 400, maxHeight = 400, quality = 0.82) => {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) {
            return reject(new Error('Tệp không phải là hình ảnh hợp lệ!'));
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                let { width, height } = img;
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = () => reject(new Error('Không thể tải ảnh'));
        };
        reader.onerror = () => reject(new Error('Không thể đọc file'));
    });
};

const MyQRCodeModal = ({ isOpen, onClose, profileData, onProfileUpdated }) => {
    const [profile, setProfile] = useState(profileData || {});
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [copiedQR, setCopiedQR] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [avatarSuccess, setAvatarSuccess] = useState(false);
    const [avatarError, setAvatarError] = useState(false);

    const fileInputRef = useRef(null);
    const canvasRef = useRef(null);

    // Đồng bộ profileData khi prop thay đổi
    useEffect(() => {
        if (profileData) {
            setProfile(prev => ({ ...prev, ...profileData }));
        }
    }, [profileData]);

    // Tự động fetch profile mới nhất khi mở modal để đảm bảo có avatarUrl
    useEffect(() => {
        if (isOpen) {
            setAvatarError(false);
            const fetchProfile = async () => {
                try {
                    const res = await api.get('/api/auth/profile');
                    if (res.data) {
                        setProfile(prev => ({ ...prev, ...res.data }));
                        if (onProfileUpdated) {
                            onProfileUpdated(res.data);
                        }
                    }
                } catch (err) {
                    console.error('Lỗi tải profile trong QR modal:', err);
                }
            };
            fetchProfile();
        }
    }, [isOpen]);

    const userCode = profile?.userCode || (profile?.id ? String(Math.abs((profile.id * 15379) % 900000 + 100000)) : '---');
    const qrPayload = `AURA_USER:${userCode}`;
    const rawAvatar = profile?.avatarUrl;
    const formattedAvatar = formatAvatarUrl(rawAvatar);

    // Tạo mã QR kèm avatar ở giữa trên HTML5 Canvas
    useEffect(() => {
        if (!isOpen || (userCode === '---' && !profile?.username)) return;

        const generateQR = async () => {
            try {
                // Tạo QR code dưới dạng canvas ẩn với độ sửa lỗi High (H) để cho phép chèn avatar vào giữa
                const canvas = canvasRef.current || document.createElement('canvas');
                await QRCode.toCanvas(canvas, qrPayload, {
                    width: 320,
                    margin: 2,
                    errorCorrectionLevel: 'H',
                    color: {
                        dark: '#451a03', // Deep amber brown - vừa nghệ thuật vừa dễ quét
                        light: '#ffffff'
                    }
                });

                const ctx = canvas.getContext('2d');
                const size = canvas.width;
                const center = size / 2;
                const avatarRadius = Math.round(size * 0.12); // ~38px
                const borderWidth = 3;

                const drawCenterAvatar = (img) => {
                    ctx.save();
                    // Vẽ vòng nền trắng bảo vệ xung quanh avatar
                    ctx.beginPath();
                    ctx.arc(center, center, avatarRadius + borderWidth, 0, Math.PI * 2);
                    ctx.fillStyle = '#ffffff';
                    ctx.fill();
                    ctx.lineWidth = 1.5;
                    ctx.strokeStyle = '#fde68a'; // amber-200
                    ctx.stroke();

                    if (img) {
                        // Cắt hình tròn vẽ ảnh avatar
                        ctx.beginPath();
                        ctx.arc(center, center, avatarRadius, 0, Math.PI * 2);
                        ctx.closePath();
                        ctx.clip();
                        ctx.drawImage(img, center - avatarRadius, center - avatarRadius, avatarRadius * 2, avatarRadius * 2);
                    } else {
                        // Vẽ chữ cái đầu viết tắt nếu không có ảnh
                        ctx.beginPath();
                        ctx.arc(center, center, avatarRadius, 0, Math.PI * 2);
                        ctx.fillStyle = '#d97706'; // amber-600
                        ctx.fill();
                        ctx.fillStyle = '#ffffff';
                        ctx.font = `bold ${Math.round(avatarRadius * 1.1)}px sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        const initial = (profile?.fullName || profile?.username || 'U').charAt(0).toUpperCase();
                        ctx.fillText(initial, center, center + 1);
                    }
                    ctx.restore();

                    try {
                        const dataUrl = canvas.toDataURL('image/png');
                        setQrDataUrl(dataUrl);
                    } catch (canvasErr) {
                        console.warn('Canvas tainted (CORS), fallback to default QR URL:', canvasErr);
                        QRCode.toDataURL(qrPayload, {
                            width: 320,
                            margin: 2,
                            errorCorrectionLevel: 'H',
                            color: { dark: '#451a03', light: '#ffffff' }
                        }).then(setQrDataUrl);
                    }
                };

                if (formattedAvatar && !avatarError) {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => drawCenterAvatar(img);
                    img.onerror = () => drawCenterAvatar(null);
                    img.src = formattedAvatar;
                } else {
                    drawCenterAvatar(null);
                }
            } catch (err) {
                console.error('Lỗi tạo mã QR có avatar:', err);
                QRCode.toDataURL(qrPayload, {
                    width: 320,
                    margin: 2,
                    errorCorrectionLevel: 'H',
                    color: { dark: '#451a03', light: '#ffffff' }
                })
                .then(url => setQrDataUrl(url))
                .catch(console.error);
            }
        };

        generateQR();
    }, [isOpen, userCode, profile?.username, qrPayload, formattedAvatar, avatarError]);

    if (!isOpen) return null;

    // Xử lý đổi/cập nhật Avatar ngay trong modal QR
    const handleAvatarFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingAvatar(true);
        setAvatarSuccess(false);

        try {
            // Nén ảnh chất lượng cao
            const compressedBase64 = await compressImage(file, 400, 400, 0.85);
            let finalAvatarUrl = compressedBase64;

            // Thử upload file Multipart lên API /api/auth/avatar
            try {
                const arr = compressedBase64.split(',');
                const mime = arr[0].match(/:(.*?);/)[1];
                const bstr = atob(arr[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while (n--) {
                    u8arr[n] = bstr.charCodeAt(n);
                }
                const blob = new Blob([u8arr], { type: mime });
                const formData = new FormData();
                formData.append('file', blob, 'avatar.jpg');

                const uploadRes = await api.post('/api/auth/avatar', formData);
                if (uploadRes.data?.avatarUrl) {
                    finalAvatarUrl = uploadRes.data.avatarUrl;
                }
            } catch (uploadErr) {
                console.warn('Upload multipart không thành công, lưu trực tiếp base64 vào profile:', uploadErr);
                // Cập nhật profile qua PUT
                await api.put('/api/auth/profile', {
                    fullName: profile.fullName || profile.username,
                    avatarUrl: finalAvatarUrl,
                    dateOfBirth: profile.dateOfBirth || null
                });
            }

            const updatedProfile = {
                ...profile,
                avatarUrl: finalAvatarUrl
            };
            setProfile(updatedProfile);
            setAvatarError(false);
            if (onProfileUpdated) {
                onProfileUpdated(updatedProfile);
            }
            setAvatarSuccess(true);
            setTimeout(() => setAvatarSuccess(false), 3000);
        } catch (err) {
            console.error('Lỗi khi cập nhật avatar:', err);
            alert('Không thể cập nhật ảnh đại diện. Vui lòng chọn ảnh khác!');
        } finally {
            setUploadingAvatar(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleCopyUserCode = () => {
        if (!userCode || userCode === '---') return;
        navigator.clipboard.writeText(userCode);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const handleCopyQRPayload = () => {
        navigator.clipboard.writeText(qrPayload);
        setCopiedQR(true);
        setTimeout(() => setCopiedQR(false), 2000);
    };

    const handleDownload = () => {
        if (!qrDataUrl) return;
        const link = document.createElement('a');
        link.download = `temoney-qr-${userCode}.png`;
        link.href = qrDataUrl;
        link.click();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            {/* Canvas ẩn dùng để vẽ avatar vào giữa mã QR */}
            <canvas ref={canvasRef} className="hidden" width={320} height={320} />

            <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-amber-200/80 flex flex-col items-center animate-in zoom-in-95 duration-200">

                {/* Header Gradient Vàng Nhạt / Hổ Phách */}
                <div className="w-full bg-gradient-to-r from-amber-600 via-amber-700 to-yellow-700 p-6 text-center text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer"
                        title="Đóng"
                    >
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>

                    {/* VÙNG AVATAR NGƯỜI DÙNG CÓ THỂ BẤM VÀO ĐỂ CẬP NHẬT */}
                    <div className="relative inline-block mx-auto mb-2.5">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="w-20 h-20 rounded-full bg-white text-amber-950 flex items-center justify-center text-2xl font-black shadow-xl border-3 border-amber-200/90 overflow-hidden relative group cursor-pointer hover:ring-4 hover:ring-white/40 transition-all"
                            title="Bấm để tải lên / cập nhật ảnh đại diện mới"
                        >
                            {formattedAvatar && !avatarError ? (
                                <img
                                    src={formattedAvatar}
                                    alt="Avatar"
                                    className="w-full h-full object-cover"
                                    onError={() => setAvatarError(true)}
                                />
                            ) : (
                                <span className="text-3xl text-amber-800">
                                    {(profile?.fullName || profile?.username || 'U').charAt(0).toUpperCase()}
                                </span>
                            )}

                            {/* Lớp phủ hover đổi ảnh */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity">
                                <span className="material-symbols-outlined text-xl">photo_camera</span>
                                <span className="text-[9px] font-bold mt-0.5">Đổi ảnh</span>
                            </div>

                            {/* Spinner khi đang tải ảnh */}
                            {uploadingAvatar && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                                    <span className="material-symbols-outlined text-2xl animate-spin">progress_activity</span>
                                </div>
                            )}
                        </div>

                        {/* Nút camera nhỏ ở góc */}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-600 text-white border-2 border-white shadow-md flex items-center justify-center transition-all cursor-pointer"
                            title="Đổi ảnh đại diện"
                        >
                            <span className="material-symbols-outlined text-xs">edit</span>
                        </button>

                        {/* Input file ẩn */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarFileSelect}
                            className="hidden"
                        />
                    </div>

                    <h3 className="text-lg font-bold font-headline leading-tight">
                        {profile?.fullName || 'Người dùng'}
                    </h3>
                    <p className="text-xs text-amber-100/90 mt-0.5 font-medium">
                        @{profile?.username || 'user'}
                    </p>

                    {/* Thông báo cập nhật avatar thành công */}
                    {avatarSuccess && (
                        <div className="mt-2 text-[11px] font-bold bg-white/20 text-white px-3 py-1 rounded-full inline-flex items-center gap-1 animate-in fade-in">
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            <span>Đã cập nhật avatar thành công!</span>
                        </div>
                    )}
                </div>

                {/* QR Code Container */}
                <div className="p-6 flex flex-col items-center w-full">
                    {/* QR Code Image với Avatar ở Trung Tâm */}
                    <div className="bg-amber-50/30 p-4 rounded-3xl border-2 border-dashed border-amber-200/90 shadow-inner mb-3.5 flex items-center justify-center relative">
                        <div className="relative inline-block">
                            {qrDataUrl ? (
                                <img
                                    src={qrDataUrl}
                                    alt="Mã QR Cá nhân"
                                    className="w-52 h-52 rounded-2xl shadow-xs object-contain"
                                />
                            ) : (
                                <div className="w-52 h-52 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                                    <span className="material-symbols-outlined text-3xl animate-spin text-amber-600">progress_activity</span>
                                    <span>Đang tạo mã QR...</span>
                                </div>
                            )}

                            {/* Avatar Overlay trung tâm (đảm bảo luôn hiển thị sắc nét tức thì) */}
                            {qrDataUrl && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-12 h-12 rounded-full bg-white p-0.5 shadow-md border-2 border-amber-200 overflow-hidden flex items-center justify-center">
                                        {formattedAvatar && !avatarError ? (
                                            <img
                                                src={formattedAvatar}
                                                alt="QR Avatar"
                                                className="w-full h-full object-cover rounded-full"
                                                onError={() => setAvatarError(true)}
                                            />
                                        ) : (
                                            <div className="w-full h-full rounded-full bg-gradient-to-tr from-amber-600 to-yellow-500 text-white font-bold flex items-center justify-center text-sm">
                                                {(profile?.fullName || profile?.username || 'U').charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* MÃ SỐ RIÊNG CHO NGƯỜI DÙNG */}
                    <div className="w-full bg-gradient-to-br from-amber-50 to-yellow-50/60 border border-amber-200 rounded-2xl p-3.5 mb-3 flex items-center justify-between shadow-2xs">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                                #
                            </div>
                            <div>
                                <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800/80">Mã số riêng của bạn</div>
                                <div className="text-lg font-black text-amber-950 tracking-widest font-mono">
                                    {userCode}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleCopyUserCode}
                            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs border cursor-pointer ${
                                copiedCode
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'bg-white text-amber-950 border-amber-300 hover:bg-amber-100/70'
                            }`}
                            title="Bấm để sao chép mã số riêng"
                        >
                            <span className="material-symbols-outlined text-sm">
                                {copiedCode ? 'check' : 'content_copy'}
                            </span>
                            <span>{copiedCode ? 'Đã chép' : 'Sao chép'}</span>
                        </button>
                    </div>

                    <p className="text-center text-[11px] text-slate-500 leading-relaxed font-medium px-2 mb-4">
                        💡 <b>Không quét được QR?</b> Chia sẻ <b>Mã số riêng</b> trên (<span className="font-bold text-amber-900">{userCode}</span>) để bạn bè nhập kết bạn hoặc mời vào nhóm ngay lập tức!
                    </p>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2.5 w-full">
                        <button
                            onClick={handleDownload}
                            className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-amber-200 shadow-2xs cursor-pointer active:scale-95"
                        >
                            <span className="material-symbols-outlined text-base text-amber-700">download</span>
                            <span>Tải ảnh QR</span>
                        </button>
                        <button
                            onClick={handleCopyQRPayload}
                            className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-slate-200 shadow-2xs cursor-pointer active:scale-95"
                        >
                            <span className="material-symbols-outlined text-base text-slate-600">
                                {copiedQR ? 'check' : 'share'}
                            </span>
                            <span>{copiedQR ? 'Đã sao chép' : 'Chép link QR'}</span>
                        </button>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full mt-3 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer active:scale-98"
                    >
                        Xong
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MyQRCodeModal;