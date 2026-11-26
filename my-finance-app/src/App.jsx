import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { LanguageProvider } from "./context/LanguageContext";

// Landing & Auth
import LandingPage from "./pages/landing/LandingPage";
import LoginForm from "./pages/auth/LoginForm";
import RegisterForm from "./pages/auth/RegisterForm";
import ForgotPasswordForm from "./pages/auth/ForgotPasswordForm";

// Quản lý Cá nhân (Personal Management)
import PersonalDashboard from "./pages/personal/Dashboard";
import PersonalActivity from "./pages/personal/Activity";
import PersonalAddTransaction from "./pages/personal/AddTransaction";
import PersonalBudgets from "./pages/personal/Budgets";
import PersonalAnalytics from "./pages/personal/Analytics";

// Quản lý Nhóm (Group Management)
import GroupDashboard from "./pages/group/GroupDashboard";
import GroupActivity from "./pages/group/GroupActivity";
import GroupAddTransaction from "./pages/group/GroupAddTransaction";
import GroupAnalytics from "./pages/group/GroupAnalytics";

// Quản trị viên Hệ thống (System Admin)
import AdminDashboard from "./pages/admin/AdminDashboard";

// Common Components
import ProtectedRoute from "./components/common/ProtectedRoute";
import LanguageToggle from "./components/common/LanguageToggle";
import SettingsModal from "./components/personal/SettingsModal";
import AiFinancialChatbot from "./components/personal/AiFinancialChatbot";
import UserSupportAndAnnouncementsWidget from "./components/common/UserSupportAndAnnouncementsWidget";

function PageTitleManager() {
    const location = useLocation();

    useEffect(() => {
        const titles = {
            '/': 'Temoney - Quản lý tài chính cá nhân & nhóm',
            '/login': 'Temoney - Đăng nhập',
            '/register': 'Temoney - Đăng ký',
            '/forgot-password': 'Temoney - Quên mật khẩu',
            '/dashboard': 'Temoney - Trang chủ',
            '/activity': 'Temoney - Lịch sử giao dịch',
            '/addnew': 'Temoney - Thêm giao dịch',
            '/analyst': 'Temoney - Báo cáo & Phân tích',
            '/budget': 'Temoney - Quản lý ngân sách',
            '/group': 'Temoney - Chi tiêu nhóm',
            '/group/dashboard': 'Temoney - Bảng điều khiển nhóm',
            '/group/activity': 'Temoney - Lịch sử giao dịch nhóm',
            '/group/transactions': 'Temoney - Lịch sử giao dịch nhóm',
            '/group/addnew': 'Temoney - Thêm giao dịch nhóm',
            '/group/analyst': 'Temoney - Phân tích chi tiêu nhóm',
            '/admin': 'Temoney - Quản trị viên hệ thống',
            '/admin/dashboard': 'Temoney - Bảng điều khiển quản trị'
        };
        document.title = titles[location.pathname] || 'Temoney - Quản lý tài chính';
    }, [location.pathname]);

    return null;
}

function App() {
    return (
        <LanguageProvider>
            <BrowserRouter>
                {/* Tự động cập nhật tiêu đề tab trình duyệt tương ứng từng trang */}
                <PageTitleManager />

                {/* Nút đổi ngôn ngữ nhỏ góc dưới bên phải đồng bộ toàn ứng dụng */}
                <LanguageToggle />

                {/* Trợ lý AI Cố vấn Tài chính & Tích sản Sinh lời toàn ứng dụng */}
                <AiFinancialChatbot />

                {/* Trung tâm Vé hỗ trợ người dùng & Thông báo ứng dụng */}
                <UserSupportAndAnnouncementsWidget />

                {/* Modal Cài đặt hệ thống (Settings) mở toàn cục */}
                <SettingsModal />

                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginForm />} />
                    <Route path="/register" element={<RegisterForm />} />
                    <Route path="/forgot-password" element={<ForgotPasswordForm />} />

                    {/* ========================================================
                        QUẢN LÝ CÁ NHÂN (PERSONAL FINANCE - PROTECTED)
                        ======================================================== */}
                    <Route
                        path="/dashboard"
                        element={<ProtectedRoute><PersonalDashboard /></ProtectedRoute>}
                    />
                    <Route
                        path="/activity"
                        element={<ProtectedRoute><PersonalActivity /></ProtectedRoute>}
                    />
                    <Route
                        path="/addnew"
                        element={<ProtectedRoute><PersonalAddTransaction /></ProtectedRoute>}
                    />
                    <Route
                        path="/analyst"
                        element={<ProtectedRoute><PersonalAnalytics /></ProtectedRoute>}
                    />
                    <Route
                        path="/budget"
                        element={<ProtectedRoute><PersonalBudgets /></ProtectedRoute>}
                    />

                    {/* ========================================================
                        QUẢN LÝ NHÓM (GROUP FINANCE - PROTECTED)
                        ======================================================== */}
                    <Route
                        path="/group"
                        element={<ProtectedRoute><GroupDashboard /></ProtectedRoute>}
                    />
                    <Route
                        path="/group/dashboard"
                        element={<ProtectedRoute><GroupDashboard /></ProtectedRoute>}
                    />
                    <Route
                        path="/group/activity"
                        element={<ProtectedRoute><GroupActivity /></ProtectedRoute>}
                    />
                    <Route
                        path="/group/transactions"
                        element={<ProtectedRoute><GroupActivity /></ProtectedRoute>}
                    />
                    <Route
                        path="/group/addnew"
                        element={<ProtectedRoute><GroupAddTransaction /></ProtectedRoute>}
                    />
                    <Route
                        path="/group/analyst"
                        element={<ProtectedRoute><GroupAnalytics /></ProtectedRoute>}
                    />

                    {/* ========================================================
                        QUẢN TRỊ VIÊN HỆ THỐNG (ADMIN PORTAL - PROTECTED)
                        ======================================================== */}
                    <Route
                        path="/admin"
                        element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>}
                    />
                    <Route
                        path="/admin/dashboard"
                        element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>}
                    />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </LanguageProvider>
    );
}

export default App;
