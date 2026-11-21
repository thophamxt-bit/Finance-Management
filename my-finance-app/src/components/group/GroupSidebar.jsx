import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import MyQRCodeModal, { formatAvatarUrl } from './MyQRCodeModal';
import ScanQRModal from './ScanQRModal';
import { useLanguage } from '../../context/LanguageContext';

const GroupSidebar = ({ profileData, onProfileUpdated }) => {
    const { t, openSettings } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();
    const currentPath = location.pathname;

    const [showMyQR, setShowMyQR] = useState(false);
    const [showScanQR, setShowScanQR] = useState(false);
    const [localProfile, setLocalProfile] = useState(profileData || {});
    const [avatarImgError, setAvatarImgError] = useState(false);

    useEffect(() => {
        if (profileData) {
            setLocalProfile(prev => ({ ...prev, ...profileData }));
            setAvatarImgError(false);
        }
    }, [profileData]);

    useEffect(() => {
        const handleProfileSync = (e) => {
            if (e.detail) {
                setLocalProfile(prev => ({ ...prev, ...e.detail }));
                setAvatarImgError(false);
            }
        };
        window.addEventListener('temoney_profile_updated', handleProfileSync);
        return () => window.removeEventListener('temoney_profile_updated', handleProfileSync);
    }, []);

    const effectiveAvatar = formatAvatarUrl(localProfile?.avatarUrl);

    const isActive = (path) => {
        if (path === '/group' && (currentPath === '/group' || currentPath === '/group/dashboard')) {
            return true;
        }
        return currentPath === path;
    };

    return (
        <>
            <aside className="hidden md:flex flex-col h-screen p-4 border-r border-slate-200 bg-slate-50 w-64 fixed left-0 top-0 font-body text-sm antialiased z-40 justify-between">
                <div>
                    {/* Logo & Brand */}
                    <div className="mb-6 px-4 pt-2">
                        <Link to="/group">
                            <div className="flex items-center gap-3">
                                <img src="/Teemoney.png" alt="Temoney Logo" className="w-10 h-10 object-contain drop-shadow-sm" />
                                <div>
                                    <h1 className="font-['Manrope'] font-extrabold text-amber-950 text-xl leading-tight cursor-pointer">
                                        Temoney
                                    </h1>
                                    <p className="text-[10px] text-amber-700 uppercase tracking-widest font-bold">
                                        {t('nav.group', 'Chi tiêu nhóm')}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    </div>

                    {/* Quick Toggle to Personal Finance */}
                    <div className="px-2 mb-6">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold text-blue-900 bg-blue-100/70 hover:bg-blue-200/80 transition-all active:scale-98 shadow-sm border border-blue-200/50 cursor-pointer"
                            title={t('nav.backToPersonal', 'Quay lại trang chi tiêu cá nhân')}
                        >
                            <span className="material-symbols-outlined text-sm">arrow_back</span>
                            <span>{t('nav.backToPersonal', 'Về Chi tiêu Cá nhân')}</span>
                        </button>
                    </div>

                    {/* Navigation Links */}
                    <nav className="flex flex-col gap-1.5 px-2">
                        <SidebarItem
                            icon="dashboard"
                            label={t('nav.dashboard', 'Group Dashboard')}
                            to="/group"
                            active={isActive('/group')}
                        />
                        <SidebarItem
                            icon="receipt_long"
                            label={t('nav.activity', 'Lịch sử chi tiêu')}
                            to="/group/activity"
                            active={isActive('/group/activity')}
                        />
                        <SidebarItem
                            icon="add_circle"
                            label={t('nav.addNew', 'Thêm chi tiêu mới')}
                            to="/group/addnew"
                            active={isActive('/group/addnew')}
                        />
                        <SidebarItem
                            icon="pie_chart"
                            label={t('nav.analytics', 'Phân tích & Nợ')}
                            to="/group/analyst"
                            active={isActive('/group/analyst')}
                        />
                    </nav>

                    {/* QR Code Quick Tools */}
                    <div className="px-2 mt-4 pt-4 border-t border-slate-200 space-y-2">
                        <button
                            onClick={() => setShowMyQR(true)}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 transition-all border border-blue-200 shadow-2xs cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
                            <span>{t('nav.myQR', 'Mã QR của tôi')}</span>
                        </button>
                        <button
                            onClick={() => setShowScanQR(true)}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-indigo-900 bg-indigo-50 hover:bg-indigo-100 transition-all border border-indigo-200 shadow-2xs cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
                            <span>{t('nav.scanQR', 'Quét QR kết bạn')}</span>
                        </button>
                    </div>
                </div>

                {/* Bottom Profile & Settings info */}
                <div className="border-t border-slate-200 pt-3 px-2 flex flex-col gap-2">
                    <SidebarItem
                        icon="settings"
                        label={t('nav.settings', 'Cài đặt')}
                        onClick={openSettings}
                    />
                    <div
                        onClick={() => setShowMyQR(true)}
                        className="p-3 bg-white rounded-2xl flex items-center gap-3 border border-slate-200/70 shadow-sm cursor-pointer hover:border-blue-300 transition-all"
                        title={t('profile.title', 'Bấm để xem thông tin cá nhân của bạn')}
                    >
                        <div className="w-10 h-10 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0 overflow-hidden border border-blue-200">
                            {effectiveAvatar && !avatarImgError ? (
                                <img
                                    src={effectiveAvatar}
                                    alt="Avatar"
                                    className="w-full h-full object-cover"
                                    onError={() => setAvatarImgError(true)}
                                />
                            ) : (
                                (localProfile?.fullName || localProfile?.email || 'U').charAt(0).toUpperCase()
                            )}
                        </div>
                        <div className="overflow-hidden w-full">
                            <p className="font-semibold text-slate-800 text-xs leading-tight truncate">
                                {localProfile?.fullName || 'Người dùng'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                                {localProfile?.email || 'Thành viên nhóm'}
                            </p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Modals QR */}
            <MyQRCodeModal
                isOpen={showMyQR}
                onClose={() => setShowMyQR(false)}
                profileData={localProfile}
                onProfileUpdated={(updated) => {
                    setLocalProfile(prev => ({ ...prev, ...updated }));
                    setAvatarImgError(false);
                    window.dispatchEvent(new CustomEvent('temoney_profile_updated', { detail: updated }));
                    if (onProfileUpdated) onProfileUpdated(updated);
                }}
            />

            <ScanQRModal
                isOpen={showScanQR}
                onClose={() => setShowScanQR(false)}
            />
        </>
    );
};

const SidebarItem = ({ icon, label, to = "#", active = false, onClick }) => {
    if (onClick) {
        return (
            <button
                type="button"
                onClick={onClick}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 cursor-pointer text-left ${
                    active
                        ? 'bg-blue-900 text-white font-bold shadow-md shadow-blue-900/20'
                        : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 font-medium'
                }`}
            >
                <span className="material-symbols-outlined text-[20px]">{icon}</span>
                <span className="text-sm font-medium">{label}</span>
            </button>
        );
    }
    return (
        <Link
            to={to}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 ${
                active
                    ? 'bg-blue-900 text-white font-bold shadow-md shadow-blue-900/20'
                    : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 font-medium'
            }`}
        >
            <span className="material-symbols-outlined text-[20px]">{icon}</span>
            <span className="text-sm font-medium">{label}</span>
        </Link>
    );
};

export default GroupSidebar;