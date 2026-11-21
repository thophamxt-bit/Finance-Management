import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Nút nhỏ chuyển đổi ngôn ngữ ở góc dưới bên phải màn hình
 * Đồng bộ hóa tức thì với Cài đặt (Settings) và trạng thái toàn ứng dụng
 */
const LanguageToggle = ({ className = "" }) => {
    const { language, setLanguage, openSettings, t } = useLanguage();

    return (
        <div
            className={`fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[60] flex items-center gap-1.5 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-md hover:shadow-lg transition-all rounded-full p-1 select-none animate-in fade-in duration-300 ${className}`}
            title={t('toggle.tooltip', 'Chuyển đổi Tiếng Việt ↔ English (Đồng bộ với Cài đặt)')}
        >
            {/* Nút Tiếng Việt */}
            <button
                type="button"
                onClick={() => setLanguage('vi')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${language === 'vi'
                        ? 'bg-blue-900 text-white shadow-xs scale-100'
                        : 'text-slate-600 hover:text-blue-950 hover:bg-slate-100/80'
                    }`}
                aria-label="Chuyển sang Tiếng Việt"
            >
                <span className="text-xs">🇻🇳</span>
                <span className="font-semibold text-[11px] tracking-wide">VI</span>
            </button>

            {/* Vạch ngăn cách nhẹ */}
            <div className="w-[1px] h-3.5 bg-slate-200"></div>

            {/* Nút English */}
            <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${language === 'en'
                        ? 'bg-blue-900 text-white shadow-xs scale-100'
                        : 'text-slate-600 hover:text-blue-950 hover:bg-slate-100/80'
                    }`}
                aria-label="Switch to English"
            >
                <span className="text-xs">🇬🇧</span>
                <span className="font-semibold text-[11px] tracking-wide">EN</span>
            </button>

            {/* Nút nhỏ mở nhanh Cài đặt (Settings) */}
            <button
                type="button"
                onClick={openSettings}
                className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-900 hover:bg-slate-100 transition-colors ml-0.5"
                title={t('nav.settings', 'Cài đặt')}
            >
                <span className="material-symbols-outlined text-[15px]">settings</span>
            </button>
        </div>
    );
};

export default LanguageToggle;