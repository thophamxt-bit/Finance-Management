import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import axios from 'axios';

const ScanQRModal = ({ isOpen, onClose, groups = [], onFriendAdded, onMemberInvited }) => {
    const [scanMode, setScanMode] = useState('FILE'); // 'CAMERA' | 'FILE' | 'MANUAL'
    const [scanning, setScanning] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const [scannedUser, setScannedUser] = useState(null);
    const [loadingInfo, setLoadingInfo] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || '');
    const [manualCode, setManualCode] = useState('');

    const scannerRef = useRef(null);
    const html5QrCodeRef = useRef(null);

    // Dọn dẹp camera khi đóng modal
    useEffect(() => {
        if (!isOpen) {
            stopCamera();
            setScannedUser(null);
            setCameraError('');
        }
    }, [isOpen]);

    // Khi chuyển sang mode CAMERA
    useEffect(() => {
        if (isOpen && scanMode === 'CAMERA' && !scannedUser) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => {
            stopCamera();
        };
    }, [isOpen, scanMode, scannedUser]);

    const startCamera = async () => {
        setCameraError('');
        setScanning(true);
        try {
            if (!html5QrCodeRef.current) {
                html5QrCodeRef.current = new Html5Qrcode("qr-reader-container");
            }
            await html5QrCodeRef.current.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 }
                },
                (decodedText) => {
                    handleQRDetected(decodedText);
                },
                (errorMessage) => {
                    // Ignore frame scanning errors
                }
            );
        } catch (err) {
            console.error("Lỗi khởi động camera:", err);
            setCameraError("Không thể truy cập camera. Vui lòng cho phép quyền truy cập hoặc sử dụng tính năng tải file ảnh.");
            setScanMode('FILE');
        } finally {
            setScanning(false);
        }
    };

    const stopCamera = async () => {
        try {
            if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
                await html5QrCodeRef.current.stop();
            }
        } catch (err) {
            console.error("Lỗi dừng camera:", err);
        }
    };

    // Xử lý khi mã QR được đọc thành công
    const handleQRDetected = async (code) => {
        await stopCamera();
        setLoadingInfo(true);
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`http://localhost:8080/api/friends/qr-info?code=${encodeURIComponent(code)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setScannedUser(res.data);
        } catch (err) {
            alert(err.response?.data?.message || "Mã QR không hợp lệ hoặc không tìm thấy người dùng!");
        } finally {
            setLoadingInfo(false);
        }
    };

    // Tải ảnh QR từ máy tính / điện thoại
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoadingInfo(true);
        try {
            const html5QrCode = new Html5Qrcode("qr-temp-file-reader");
            const decodedText = await html5QrCode.scanFile(file, true);
            await handleQRDetected(decodedText);
        } catch (err) {
            alert("Không tìm thấy mã QR trong hình ảnh đã chọn. Vui lòng thử lại với ảnh rõ hơn!");
        } finally {
            setLoadingInfo(false);
        }
    };

    // Kết bạn với người được quét
    const handleAddFriend = async () => {
        if (!scannedUser) return;
        setActionLoading(true);
        try {
            const token = localStorage.getItem("token");
            await axios.post("http://localhost:8080/api/friends/add", {
                identifier: scannedUser.username
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(`Đã kết bạn thành công với ${scannedUser.fullName || scannedUser.username}!`);
            setScannedUser({ ...scannedUser, isAlreadyFriend: true });
            if (onFriendAdded) onFriendAdded();
        } catch (err) {
            alert(err.response?.data?.message || "Lỗi kết bạn!");
        } finally {
            setActionLoading(false);
        }
    };

    // Mời người được quét vào nhóm
    const handleInviteToGroup = async () => {
        if (!scannedUser || !selectedGroupId) return alert("Vui lòng chọn nhóm cần mời!");
        setActionLoading(true);
        try {
            const token = localStorage.getItem("token");
            await axios.post(`http://localhost:8080/api/groups/${selectedGroupId}/members`, {
                identifier: scannedUser.username
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(`Đã thêm ${scannedUser.fullName || scannedUser.username} vào nhóm thành công!`);
            if (onMemberInvited) onMemberInvited(selectedGroupId);
            onClose();
        } catch (err) {
            alert(err.response?.data?.message || "Lỗi khi thêm vào nhóm!");
        } finally {
            setActionLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 flex flex-col">

                {/* Header */}
                <div className="p-5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-xl">qr_code_scanner</span>
                        <h3 className="text-base font-bold font-headline">Quét mã QR kết bạn & Mời nhóm</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all"
                    >
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Chế độ chưa quét hoặc đã quét */}
                    {!scannedUser ? (
                        <>
                            {/* Tabs chọn cách quét */}
                            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                                <button
                                    onClick={() => setScanMode('FILE')}
                                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                        scanMode === 'FILE' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-sm">image</span>
                                    <span>Tải ảnh QR</span>
                                </button>
                                <button
                                    onClick={() => setScanMode('CAMERA')}
                                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                        scanMode === 'CAMERA' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-sm">photo_camera</span>
                                    <span>Camera</span>
                                </button>
                                <button
                                    onClick={() => setScanMode('MANUAL')}
                                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                        scanMode === 'MANUAL' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-sm">keyboard</span>
                                    <span>Nhập mã</span>
                                </button>
                            </div>

                            {/* Khu vực quét */}
                            {scanMode === 'CAMERA' && (
                                <div className="space-y-2">
                                    <div
                                        id="qr-reader-container"
                                        className="w-full h-64 bg-black rounded-2xl overflow-hidden shadow-inner flex items-center justify-center"
                                    ></div>
                                    {cameraError && (
                                        <p className="text-xs text-red-500 text-center font-medium">{cameraError}</p>
                                    )}
                                    <p className="text-center text-[11px] text-slate-400">
                                        Hướng camera vào mã QR của bạn bè để tự động nhận diện.
                                    </p>
                                </div>
                            )}

                            {scanMode === 'FILE' && (
                                <div className="p-8 border-2 border-dashed border-blue-200 rounded-3xl bg-blue-50/40 text-center hover:bg-blue-50 transition-all">
                                    <div className="w-14 h-14 bg-blue-100 text-blue-900 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                                        <span className="material-symbols-outlined text-3xl">upload_file</span>
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-800 mb-1">Tải ảnh chụp mã QR từ thiết bị</h4>
                                    <p className="text-xs text-slate-400 mb-4">Hỗ trợ định dạng PNG, JPG, JPEG</p>

                                    <label className="bg-blue-900 hover:bg-blue-800 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-blue-900/20 cursor-pointer inline-flex items-center gap-2 transition-all">
                                        <span className="material-symbols-outlined text-sm">photo_library</span>
                                        <span>Chọn file ảnh QR</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                            )}

                            {scanMode === 'MANUAL' && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                                            Mã QR hoặc Username / Email
                                        </label>
                                        <input
                                            type="text"
                                            value={manualCode}
                                            onChange={(e) => setManualCode(e.target.value)}
                                            placeholder="vd: AURA_USER:vana hoặc vana"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-800 mt-1 focus:ring-1 focus:ring-blue-900"
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleQRDetected(manualCode)}
                                        disabled={!manualCode.trim()}
                                        className="w-full py-3 bg-blue-900 text-white rounded-xl text-xs font-bold shadow-md hover:bg-blue-800 transition-all disabled:opacity-50"
                                    >
                                        Tìm người dùng
                                    </button>
                                </div>
                            )}

                            {loadingInfo && (
                                <div className="p-4 bg-blue-50 text-blue-900 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                                    <span>Đang đọc mã QR và tìm người dùng...</span>
                                </div>
                            )}

                            {/* Hidden container for file scanner */}
                            <div id="qr-temp-file-reader" className="hidden"></div>
                        </>
                    ) : (
                        /* ĐÃ QUÉT THÀNH CÔNG -> HIỂN THỊ THÔNG TIN NGƯỜI DÙNG */
                        <div className="space-y-5 animate-in zoom-in-95 duration-200">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3.5">
                                <div className="w-14 h-14 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
                                    {(scannedUser.fullName || scannedUser.username || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div className="overflow-hidden flex-1">
                                    <h4 className="font-bold text-slate-900 text-base leading-tight truncate">
                                        {scannedUser.fullName || scannedUser.username}
                                    </h4>
                                    <p className="text-xs text-blue-900 font-semibold mt-0.5">@{scannedUser.username}</p>
                                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{scannedUser.email}</p>
                                </div>
                            </div>

                            {/* 2 Lựa chọn hành động: Kết bạn & Mời nhóm */}
                            <div className="space-y-3">
                                {/* Nút Kết bạn */}
                                <button
                                    onClick={handleAddFriend}
                                    disabled={actionLoading || scannedUser.isAlreadyFriend || scannedUser.isSelf}
                                    className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                                        scannedUser.isAlreadyFriend
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                                            : scannedUser.isSelf
                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            : 'bg-blue-900 text-white hover:bg-blue-800 shadow-md shadow-blue-900/20'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-sm">
                                        {scannedUser.isAlreadyFriend ? 'check' : 'person_add'}
                                    </span>
                                    <span>
                                        {scannedUser.isSelf
                                            ? 'Đây là mã QR của chính bạn'
                                            : scannedUser.isAlreadyFriend
                                            ? 'Đã là bạn bè'
                                            : 'Thêm vào Danh sách Bạn bè'}
                                    </span>
                                </button>

                                {/* Mời vào Nhóm */}
                                {!scannedUser.isSelf && groups.length > 0 && (
                                    <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-2.5">
                                        <label className="text-[11px] font-bold text-blue-900 uppercase tracking-wider block">
                                            Mời vào nhóm chi tiêu:
                                        </label>
                                        <div className="flex gap-2">
                                            <select
                                                value={selectedGroupId}
                                                onChange={(e) => setSelectedGroupId(e.target.value)}
                                                className="flex-1 bg-white border border-blue-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:ring-1 focus:ring-blue-900"
                                            >
                                                {groups.map(g => (
                                                    <option key={g.id} value={g.id}>{g.name}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={handleInviteToGroup}
                                                disabled={actionLoading}
                                                className="px-4 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                                            >
                                                Mời ngay
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={() => setScannedUser(null)}
                                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all"
                                >
                                    Quét mã khác
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ScanQRModal;