import React, { useState } from 'react';
import UserProfileModal from './UserProfileModal';
import { formatAvatarUrl } from '../group/MyQRCodeModal';

const UserProfileBadge = ({ profileData, onProfileUpdated, className = "" }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const initial = (profileData?.fullName || profileData?.email || profileData?.username || 'U').charAt(0).toUpperCase();

    return (
        <>
            <div
                onClick={() => setIsModalOpen(true)}
                className={`p-2.5 bg-white rounded-2xl flex items-center gap-3 border border-slate-200/80 shadow-xs cursor-pointer hover:border-blue-400 hover:bg-slate-50/80 transition-all active:scale-95 group ${className}`}
                title="Bấm để xem & chỉnh sửa hồ sơ cá nhân của bạn"
            >
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-sm shadow-xs shrink-0 overflow-hidden border border-blue-200 group-hover:ring-2 group-hover:ring-blue-900/20 transition-all">
                    {profileData?.avatarUrl ? (
                        <img src={formatAvatarUrl(profileData.avatarUrl)} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <span>{initial}</span>
                    )}
                </div>

                <div className="overflow-hidden w-full">
                    <div className="flex items-center justify-between gap-1">
                        <p className="font-bold text-slate-800 text-xs leading-tight truncate group-hover:text-amber-950 transition-colors">
                            {profileData?.fullName || 'Người dùng'}
                        </p>
                        {(profileData?.role === 'ROLE_ADMIN' || localStorage.getItem('role') === 'ROLE_ADMIN') ? (
                            <span className="text-[9px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded font-mono shrink-0 uppercase tracking-wider">
                                ADMIN
                            </span>
                        ) : profileData?.userCode ? (
                            <span className="text-[9px] font-black bg-amber-50 text-amber-900 border border-amber-200/60 px-1.5 py-0.5 rounded font-mono shrink-0">
                                #{profileData.userCode}
                            </span>
                        ) : null}
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                        {profileData?.email || 'Tài khoản cá nhân'}
                    </p>
                </div>
            </div>

            <UserProfileModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onProfileUpdated={onProfileUpdated}
            />
        </>
    );
};

export default UserProfileBadge;