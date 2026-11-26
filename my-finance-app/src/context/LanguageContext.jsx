import React, { createContext, useContext, useState, useEffect } from 'react';

// Bộ từ điển song ngữ: Tiếng Việt (vi) & English (en)
export const translations = {
    vi: {
        // Điều hướng & Menu
        nav: {
            dashboard: "Dashboard",
            activity: "Lịch sử giao dịch",
            addNew: "Thêm giao dịch",
            analytics: "Phân tích",
            budgets: "Ngân sách",
            group: "Chi tiêu nhóm",
            settings: "Cài đặt",
            logout: "Đăng xuất",
            myQR: "Mã QR của tôi",
            scanQR: "Quét QR kết bạn",
            backToPersonal: "Về Chi tiêu Cá nhân",
            premiumTier: "Gói Premium",
            financialManagement: "Aura Finance"
        },
        // Thanh tiêu đề & Tác vụ nhanh
        header: {
            greetingMorning: "Chào buổi sáng",
            greetingAfternoon: "Chào buổi chiều",
            greetingEvening: "Chào buổi tối",
            user: "Bạn",
            summarySubtitle: "Dưới đây là tóm tắt tài chính cá nhân của bạn trong ngày hôm nay.",
            personal: "Cá nhân",
            group: "Nhóm",
            addTransaction: "Thêm giao dịch",
            quickAdd: "Thêm nhanh"
        },
        // Dashboard
        dashboard: {
            totalBalance: "Tổng số dư các ví",
            allWallets: "Tất cả các nguồn tiền",
            totalIncome: "Tổng thu nhập",
            totalExpense: "Tổng chi tiêu",
            yearStats: "Thu & Chi trong năm",
            income: "Thu nhập",
            expense: "Chi tiêu",
            wallets: "Nguồn tiền & Ví",
            addWallet: "Thêm nguồn tiền",
            recentTransactions: "Giao dịch gần đây",
            viewAll: "Xem tất cả",
            noTransactions: "Chưa có giao dịch nào gần đây",
            noWallets: "Chưa có ví nào được tạo",
            manageWallets: "Quản lý các nguồn tiền của bạn",
            walletNamePlaceholder: "Tên ví (Ví tiền mặt, MB Bank...)",
            initialBalancePlaceholder: "Số dư ban đầu (VNĐ)",
            walletType: "Loại tài khoản / ví",
            cash: "Tiền mặt (Ví vật lý)",
            bank: "Ngân hàng (Chuyển khoản)",
            eWallet: "Ví điện tử (Momo, ZaloPay...)",
            investment: "Đầu tư (Cổ phiếu, vàng...)",
            other: "Khác",
            confirmDeleteWallet: "Bạn có chắc chắn muốn xóa ví này không? Lịch sử giao dịch liên quan có thể bị ảnh hưởng."
        },
        // Cài đặt (Settings)
        settings: {
            title: "Cài đặt hệ thống",
            subtitle: "Tùy chỉnh ngôn ngữ hiển thị và cấu hình tài chính của bạn",
            languageSection: "Ngôn ngữ hiển thị / Display Language",
            languageDesc: "Chọn ngôn ngữ bạn muốn hiển thị xuyên suốt ứng dụng. Nút nhỏ trên góc phải sẽ tự động cập nhật đồng bộ.",
            vietnamese: "Tiếng Việt",
            vietnameseDesc: "Ngôn ngữ Tiếng Việt mặc định",
            english: "English",
            englishDesc: "English (US & Global standard)",
            active: "Đang áp dụng",
            select: "Chọn",
            langChangedToast: "Đã chuyển sang Tiếng Việt!",
            currencySection: "Đơn vị tiền tệ hiển thị",
            currencyDesc: "Định dạng số tiền hiển thị trên các biểu đồ và báo cáo",
            appearanceSection: "Cỡ chữ & Giao diện",
            appearanceDesc: "Điều chỉnh kích thước hiển thị chữ trên màn hình",
            fontSizeStandard: "Tiêu chuẩn (100%)",
            fontSizeLarge: "Phóng to chữ (115%)",
            fontSizeDesc: "Phù hợp để đọc số liệu rõ ràng trên màn hình lớn",
            saveSettings: "Lưu cài đặt",
            close: "Đóng",
            savedSuccess: "Đã lưu cài đặt thành công!"
        },
        // Nút chuyển ngôn ngữ góc trên bên phải
        toggle: {
            switchLang: "Đổi ngôn ngữ",
            tooltip: "Chuyển đổi Tiếng Việt ↔ English (Đồng bộ với Cài đặt)",
            current: "Tiếng Việt"
        },
        // Hồ sơ cá nhân (User Profile)
        profile: {
            title: "Hồ sơ người dùng",
            subtitle: "Thông tin tài khoản cá nhân & Mã kết nối",
            fullName: "Họ và tên",
            fullNamePlaceholder: "Nhập họ và tên...",
            email: "Email",
            verified: "Đã xác thực",
            userCode: "Mã người dùng",
            dateOfBirth: "Ngày sinh",
            username: "Tên đăng nhập",
            personalQR: "Mã QR Cá Nhân",
            qrDesc: "Quét mã để kết bạn và mời vào nhóm chi tiêu",
            downloadQR: "Tải ảnh",
            copyLink: "Chép link",
            copyCode: "Chép",
            copied: "Đã chép",
            changePhoto: "Đổi ảnh",
            uploadFromDevice: "Tải ảnh từ máy",
            selectPreset: "Chọn ảnh mẫu",
            pasteUrl: "Dán link ảnh",
            chooseFile: "Chọn file ảnh",
            optimizingPhoto: "Đang tối ưu ảnh...",
            logoutAccount: "Đăng xuất tài khoản",
            close: "Đóng",
            saveChanges: "Lưu thay đổi",
            saving: "Đang lưu...",
            personalAccount: "Tài khoản cá nhân",
            languageSetting: "Ngôn ngữ:",
            openSettingsModal: "Mở Cài đặt hệ thống"
        },
        // Lịch sử giao dịch (Activity)
        activity: {
            title: "Lịch sử giao dịch",
            subtitle: "Xem lại toàn bộ lịch sử chi tiêu và thu nhập chi tiết",
            searchPlaceholder: "Tìm theo ghi chú, danh mục...",
            filterType: "Loại giao dịch",
            all: "Tất cả",
            income: "Thu nhập",
            expense: "Chi tiêu",
            date: "Thời gian",
            description: "Nội dung giao dịch",
            category: "Danh mục",
            amount: "Số tiền",
            receipt: "Hóa đơn",
            viewReceipt: "Xem ảnh hóa đơn",
            showing: "Hiển thị",
            to: "đến",
            of: "trong số",
            transactions: "giao dịch",
            noTransactionsFound: "Không tìm thấy giao dịch nào phù hợp với bộ lọc."
        },
        // Ngân sách (Budgets)
        budgets: {
            title: "Thiết lập Ngân sách",
            subtitle: "Kiểm soát chi tiêu thông minh theo tháng",
            viewMonth: "Xem tháng:",
            auto6Jars: "Tự động phân bổ 6 lọ",
            totalBudget: "Tổng ngân sách",
            totalSpent: "Đã chi tiêu",
            remaining: "Số dư còn lại",
            spentPercent: "Tỷ lệ đã tiêu",
            overLimitAlert: "Có danh mục đã chi tiêu vượt quá hạn mức 80%!",
            noBudgets: "Chưa có hạn mức ngân sách nào cho tháng này.",
            setupJar: "Phân bổ lọ tài chính"
        },
        // Phân tích (Analytics)
        analytics: {
            title: "Phân tích tài chính",
            subtitle: "Báo cáo chuyên sâu về cơ cấu dòng tiền và thói quen chi tiêu",
            incomeVsExpense: "So sánh Thu - Chi",
            categoryShare: "Tỷ trọng danh mục",
            monthlyTrend: "Xu hướng thu chi qua các tháng",
            topSpending: "Top khoản chi lớn nhất"
        },
        // Chi tiêu nhóm (Group)
        group: {
            title: "Quản lý Chi tiêu nhóm",
            subtitle: "Chia hóa đơn, theo dõi quỹ nhóm và quyết toán sòng phẳng",
            myGroups: "Danh sách nhóm",
            createGroup: "Tạo nhóm mới",
            addMember: "Thêm thành viên",
            splitBill: "Chia tiền hóa đơn",
            settleDebt: "Quyết toán nợ",
            groupActivity: "Lịch sử nhóm",
            noGroups: "Bạn chưa tham gia nhóm nào. Hãy tạo nhóm mới ngay!",
            groupName: "Tên nhóm",
            totalGroupSpent: "Tổng chi nhóm",
            totalGroupExpense: "Tổng chi tiêu nhóm",
            splitNewBill: "Chia hóa đơn mới",
            settleUp: "Quyết toán",
            leaveGroup: "Rời nhóm",
            leavingGroup: "Đang rời...",
            recentActivity: "Hoạt động gần đây",
            viewAll: "Xem tất cả",
            groupDiscussion: "Thảo luận nhóm",
            yourDebt: "Bạn nợ",
            youAreOwed: "Bạn được trả"
        },
        // Thao tác chung (Common)
        common: {
            save: "Lưu",
            cancel: "Hủy",
            close: "Đóng",
            delete: "Xóa",
            edit: "Sửa",
            loading: "Đang tải...",
            success: "Thành công",
            error: "Đã có lỗi xảy ra",
            confirm: "Xác nhận",
            back: "Quay lại",
            apply: "Áp dụng",
            search: "Tìm kiếm...",
            all: "Tất cả",
            date: "Ngày",
            note: "Ghi chú",
            vnd: "₫",
            usd: "$"
        }
    },
    en: {
        // Navigation & Menu
        nav: {
            dashboard: "Dashboard",
            activity: "Activity",
            addNew: "Add New",
            analytics: "Analytics",
            budgets: "Budgets",
            group: "Group Finance",
            settings: "Settings",
            logout: "Log Out",
            myQR: "My QR Code",
            scanQR: "Scan QR to Connect",
            backToPersonal: "Back to Personal Finance",
            premiumTier: "Premium Tier",
            financialManagement: "Aura Finance"
        },
        // Header & Quick Actions
        header: {
            greetingMorning: "Good morning",
            greetingAfternoon: "Good afternoon",
            greetingEvening: "Good evening",
            user: "there",
            summarySubtitle: "Here is your personal financial overview for today.",
            personal: "Personal",
            group: "Group",
            addTransaction: "Add Transaction",
            quickAdd: "Quick Add"
        },
        // Dashboard
        dashboard: {
            totalBalance: "Total Wallet Balance",
            allWallets: "All money sources & accounts",
            totalIncome: "Total Income",
            totalExpense: "Total Expense",
            yearStats: "Income & Expense This Year",
            income: "Income",
            expense: "Expense",
            wallets: "Wallets & Accounts",
            addWallet: "Add Wallet",
            recentTransactions: "Recent Transactions",
            viewAll: "View All",
            noTransactions: "No recent transactions found",
            noWallets: "No wallets created yet",
            manageWallets: "Manage your money sources",
            walletNamePlaceholder: "Wallet name (Cash, Chase, Paypal...)",
            initialBalancePlaceholder: "Initial balance ($ or VND)",
            walletType: "Account / Wallet Type",
            cash: "Cash (Physical wallet)",
            bank: "Bank Account (Wire transfer)",
            eWallet: "E-Wallet (Apple Pay, Momo...)",
            investment: "Investment (Stocks, Gold...)",
            other: "Other",
            confirmDeleteWallet: "Are you sure you want to delete this wallet? Related transaction history might be affected."
        },
        // Settings Modal
        settings: {
            title: "System Settings",
            subtitle: "Customize your display language and financial preferences",
            languageSection: "Display Language / Ngôn ngữ hiển thị",
            languageDesc: "Choose the language you prefer across the app. The top-right toggle button will automatically synchronize.",
            vietnamese: "Tiếng Việt",
            vietnameseDesc: "Vietnamese (Standard Vietnamese)",
            english: "English",
            englishDesc: "English (US & Global standard)",
            active: "Active",
            select: "Select",
            langChangedToast: "Switched to English successfully!",
            currencySection: "Display Currency",
            currencyDesc: "Select the default currency format displayed across charts and summaries",
            appearanceSection: "Appearance & Font Zoom",
            appearanceDesc: "Adjust text scale and visual ergonomics on screen",
            fontSizeStandard: "Standard (100%)",
            fontSizeLarge: "Enlarged (115%)",
            fontSizeDesc: "Optimal for high resolution displays and enhanced readability",
            saveSettings: "Save Settings",
            close: "Close",
            savedSuccess: "Settings saved successfully!"
        },
        // Top-right toggle button
        toggle: {
            switchLang: "Switch language",
            tooltip: "Switch between Vietnamese ↔ English (Synced with Settings)",
            current: "English"
        },
        // User Profile
        profile: {
            title: "User Profile",
            subtitle: "Personal account information & Connection code",
            fullName: "Full Name",
            fullNamePlaceholder: "Enter your full name...",
            email: "Email Address",
            verified: "Verified",
            userCode: "User ID Code",
            dateOfBirth: "Date of Birth",
            username: "Username",
            personalQR: "Personal QR Code",
            qrDesc: "Scan QR code to connect and invite into group expenses",
            downloadQR: "Download",
            copyLink: "Copy link",
            copyCode: "Copy",
            copied: "Copied",
            changePhoto: "Change Avatar",
            uploadFromDevice: "Upload from device",
            selectPreset: "Select preset",
            pasteUrl: "Paste image URL",
            chooseFile: "Choose image file",
            optimizingPhoto: "Optimizing image...",
            logoutAccount: "Log out account",
            close: "Close",
            saveChanges: "Save changes",
            saving: "Saving...",
            personalAccount: "Personal Account",
            languageSetting: "Language:",
            openSettingsModal: "Open System Settings"
        },
        // Activity
        activity: {
            title: "Transaction Activity",
            subtitle: "Review your comprehensive income and expense history",
            searchPlaceholder: "Search by note, category...",
            filterType: "Transaction Type",
            all: "All",
            income: "Income",
            expense: "Expense",
            date: "Date & Time",
            description: "Description",
            category: "Category",
            amount: "Amount",
            receipt: "Receipt",
            viewReceipt: "View receipt photo",
            showing: "Showing",
            to: "to",
            of: "of",
            transactions: "transactions",
            noTransactionsFound: "No transactions matched the current filter."
        },
        // Budgets
        budgets: {
            title: "Budget Management",
            subtitle: "Smart monthly spending limits and 6-jars discipline",
            viewMonth: "View month:",
            auto6Jars: "Auto 6-Jars Allocation",
            totalBudget: "Total Budget Limit",
            totalSpent: "Total Spent",
            remaining: "Remaining Budget",
            spentPercent: "Spent Ratio",
            overLimitAlert: "Warning: One or more categories exceeded 80% spending limit!",
            noBudgets: "No budget limits set for this month yet.",
            setupJar: "Allocate Financial Jar"
        },
        // Analytics
        analytics: {
            title: "Financial Analytics",
            subtitle: "In-depth visual insights on cashflow and spending habits",
            incomeVsExpense: "Income vs Expense",
            categoryShare: "Category Distribution",
            monthlyTrend: "Monthly Cashflow Trend",
            topSpending: "Top Spending Transactions"
        },
        // Group Finance
        group: {
            title: "Group Finance Management",
            subtitle: "Split bills, manage group balances, and settle debts fairly",
            myGroups: "My Groups",
            createGroup: "Create Group",
            addMember: "Add Member",
            splitBill: "Split Expense",
            settleDebt: "Settle Debts",
            groupActivity: "Group Activity",
            noGroups: "You have not joined any group yet. Create your first group!",
            groupName: "Group Name",
            totalGroupSpent: "Total Group Spent",
            totalGroupExpense: "Total Group Expense",
            splitNewBill: "Split New Bill",
            settleUp: "Settle Up",
            leaveGroup: "Leave Group",
            leavingGroup: "Leaving...",
            recentActivity: "Recent Activity",
            viewAll: "View all",
            groupDiscussion: "Group Discussion",
            yourDebt: "You owe",
            youAreOwed: "You are owed"
        },
        // Common
        common: {
            save: "Save",
            cancel: "Cancel",
            close: "Close",
            delete: "Delete",
            edit: "Edit",
            loading: "Loading...",
            success: "Success",
            error: "An error occurred",
            confirm: "Confirm",
            back: "Back",
            apply: "Apply",
            search: "Search...",
            all: "All",
            date: "Date",
            note: "Note",
            vnd: "₫",
            usd: "$"
        }
    }
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    // Khởi tạo ngôn ngữ từ localStorage (mặc định 'vi')
    const [language, setLanguageState] = useState(() => {
        const saved = localStorage.getItem('app_language');
        return saved === 'en' ? 'en' : 'vi';
    });

    // Trạng thái modal Settings toàn cục để bất cứ nút Settings nào cũng mở được
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Lưu ngôn ngữ vào localStorage và cập nhật state
    const setLanguage = (lang) => {
        const target = lang === 'en' ? 'en' : 'vi';
        setLanguageState(target);
        localStorage.setItem('app_language', target);
        document.documentElement.lang = target;
    };

    // Đổi qua lại giữa 'vi' và 'en'
    const toggleLanguage = () => {
        setLanguage(language === 'vi' ? 'en' : 'vi');
    };

    // Hàm tra cứu từ điển đa cấp (nested translation function)
    // Ví dụ: t('nav.dashboard', 'Dashboard')
    const t = (path, fallback = '') => {
        if (!path) return fallback;
        const keys = path.split('.');
        let current = translations[language] || translations.vi;

        for (const k of keys) {
            if (current && current[k] !== undefined) {
                current = current[k];
            } else {
                // Thử tìm trong fallback vi nếu ngôn ngữ en chưa có key
                let fallbackCurrent = translations.vi;
                for (const fk of keys) {
                    if (fallbackCurrent && fallbackCurrent[fk] !== undefined) {
                        fallbackCurrent = fallbackCurrent[fk];
                    } else {
                        return fallback || path;
                    }
                }
                return fallbackCurrent || fallback || path;
            }
        }
        return current !== undefined ? current : (fallback || path);
    };

    // Đồng bộ thuộc tính lang của HTML document khi mount
    useEffect(() => {
        document.documentElement.lang = language;
    }, [language]);

    return (
        <LanguageContext.Provider value={{
            language,
            setLanguage,
            toggleLanguage,
            t,
            isSettingsOpen,
            setIsSettingsOpen,
            openSettings: () => setIsSettingsOpen(true),
            closeSettings: () => setIsSettingsOpen(false)
        }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
};

export default LanguageContext;