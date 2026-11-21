import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Hàm loại bỏ dấu tiếng Việt an toàn cho các font chữ không hỗ trợ Unicode trong PDF chuẩn
export const removeVietnameseTones = (str) => {
    if (!str || typeof str !== 'string') return '';
    let result = str;
    result = result.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    result = result.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    result = result.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    result = result.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    result = result.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    result = result.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    result = result.replace(/đ/g, "d");
    result = result.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    result = result.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    result = result.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    result = result.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    result = result.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    result = result.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    result = result.replace(/Đ/g, "D");
    return result;
};

// Định dạng tiền tệ
export const formatAmount = (amount, currency = 'VND') => {
    const num = Number(amount) || 0;
    if (currency === 'USD') {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
    }
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
        .format(num)
        .replace('₫', 'VND');
};

// Định dạng ngày hiển thị
export const formatDate = (rawDate) => {
    if (!rawDate) return '';
    if (Array.isArray(rawDate)) {
        const y = String(rawDate[0]);
        const m = String(rawDate[1]).padStart(2, '0');
        const d = String(rawDate[2] || 1).padStart(2, '0');
        return `${d}/${m}/${y}`;
    }
    try {
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) return String(rawDate);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    } catch {
        return String(rawDate);
    }
};

// Tạo tên file tiêu chuẩn
export const generateFilename = (prefix = 'Teemoney_BaoCao', extension = 'xlsx') => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${prefix}_${y}${m}${d}_${hh}${mm}.${extension}`;
};

/**
 * 1. XUẤT DỮ LIỆU RA EXCEL (.XLSX)
 * Hỗ trợ tiếng Việt 100% đầy đủ dấu bằng SheetJS UTF-8
 */
export const exportToExcel = ({
    transactions = [],
    accounts = [],
    profile = {},
    timeFilterLabel = 'Tất cả thời gian',
    currency = 'VND',
    includeAccounts = true,
}) => {
    const wb = XLSX.utils.book_new();

    // Tính toán số liệu tổng kết
    let totalIncome = 0;
    let totalExpense = 0;

    const txRows = transactions.map((t, index) => {
        const amt = Number(t.amount) || 0;
        const isIncome = t.transactionType === 'INCOME' || (!t.category && !t.categoryId);
        if (isIncome) totalIncome += amt;
        else totalExpense += amt;

        return {
            'STT': index + 1,
            'Ngày giao dịch': formatDate(t.transactionDate),
            'Phân loại': isIncome ? 'Thu nhập (+)' : 'Chi tiêu (-)',
            'Danh mục': t.categoryName || (isIncome ? 'Thu nhập' : 'Chi phí'),
            'Số tiền': amt,
            'Đơn vị': currency,
            'Ví / Tài khoản': t.accountName || t.walletName || 'Ví chính',
            'Ghi chú': t.note || '',
        };
    });

    const netBalance = totalIncome - totalExpense;

    // Header thông tin tổng quan
    const summaryHeader = [
        ['BÁO CÁO TÀI CHÍNH CÁ NHÂN - TEEMONEY'],
        ['Người xuất:', profile.fullName || profile.username || 'Người dùng'],
        ['Thời gian áp dụng:', timeFilterLabel],
        ['Ngày xuất file:', formatDate(new Date())],
        [''],
        ['TỔNG QUAN TÀI CHÍNH', '', '', '', '', '', ''],
        ['Tổng thu nhập (+):', totalIncome, currency],
        ['Tổng chi tiêu (-):', totalExpense, currency],
        ['Chênh lệch ròng (Thu - Chi):', netBalance, currency],
        ['Tổng số giao dịch:', transactions.length, 'giao dịch'],
        [''],
    ];

    // Tạo Worksheet Giao Dịch
    const wsTx = XLSX.utils.aoa_to_sheet(summaryHeader);

    // Ghép bảng chi tiết giao dịch vào sau phần tóm tắt
    XLSX.utils.sheet_add_json(wsTx, txRows, { origin: 'A12' });

    // Cấu hình độ rộng cột cho đẹp mắt
    wsTx['!cols'] = [
        { wch: 6 },  // STT
        { wch: 16 }, // Ngày
        { wch: 16 }, // Phân loại
        { wch: 22 }, // Danh mục
        { wch: 18 }, // Số tiền
        { wch: 10 }, // Đơn vị
        { wch: 24 }, // Ví / Tài khoản
        { wch: 35 }, // Ghi chú
    ];

    XLSX.utils.book_append_sheet(wb, wsTx, 'Lịch sử giao dịch');

    // Nếu chọn kèm danh sách Ví / Tài khoản
    if (includeAccounts && accounts.length > 0) {
        let totalWalletsBalance = 0;
        const accRows = accounts.map((acc, idx) => {
            const bal = Number(acc.balance) || 0;
            totalWalletsBalance += bal;
            return {
                'STT': idx + 1,
                'Tên tài khoản / Ví': acc.accountName || 'Ví',
                'Loại tài khoản': acc.accountType || 'Cá nhân',
                'Số dư hiện tại': bal,
                'Đơn vị': currency,
            };
        });

        const accSummaryHeader = [
            ['DANH SÁCH VÍ & TÀI KHOẢN TÀI CHÍNH'],
            ['Tổng số ví:', accounts.length],
            ['Tổng số dư tất cả các ví:', totalWalletsBalance, currency],
            [''],
        ];

        const wsAcc = XLSX.utils.aoa_to_sheet(accSummaryHeader);
        XLSX.utils.sheet_add_json(wsAcc, accRows, { origin: 'A5' });

        wsAcc['!cols'] = [
            { wch: 6 },
            { wch: 28 },
            { wch: 20 },
            { wch: 20 },
            { wch: 10 },
        ];

        XLSX.utils.book_append_sheet(wb, wsAcc, 'Danh sách ví');
    }

    const filename = generateFilename('Teemoney_BaoCaoTaiChinh', 'xlsx');
    XLSX.writeFile(wb, filename);
    return filename;
};

/**
 * 2. XUẤT DỮ LIỆU RA PDF (.PDF)
 * Tự động phân trang, bảng biểu chuyên nghiệp qua jsPDF + autoTable
 */
export const exportToPdf = ({
    transactions = [],
    accounts = [],
    profile = {},
    timeFilterLabel = 'Tất cả thời gian',
    currency = 'VND',
    includeAccounts = true,
    language = 'vi',
}) => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    const isEn = language === 'en';
    const primaryColor = [30, 58, 138]; // Blue 900
    const textDark = [30, 41, 59];      // Slate 800

    // Tính toán số liệu
    let totalIncome = 0;
    let totalExpense = 0;
    transactions.forEach((t) => {
        const amt = Number(t.amount) || 0;
        const isInc = t.transactionType === 'INCOME' || (!t.category && !t.categoryId);
        if (isInc) totalIncome += amt;
        else totalExpense += amt;
    });
    const netBalance = totalIncome - totalExpense;

    // Header tiêu đề
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(isEn ? 'TEEMONEY - FINANCIAL REPORT' : 'TEEMONEY - BAO CAO TAI CHINH', 14, 14);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(219, 234, 254);
    doc.text(
        isEn
            ? `Generated at: ${formatDate(new Date())} | User: ${removeVietnameseTones(profile.fullName || profile.username || 'User')}`
            : `Ngay xuat: ${formatDate(new Date())} | Nguoi dung: ${removeVietnameseTones(profile.fullName || profile.username || 'Nguoi dung')}`,
        14,
        22
    );

    // Khối tóm tắt (Cards)
    let startY = 36;
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(
        isEn ? `Report Range: ${timeFilterLabel}` : `Pham vi bao cao: ${removeVietnameseTones(timeFilterLabel)}`,
        14,
        startY
    );

    startY += 6;
    // Vẽ 3 hộp tóm tắt: Thu nhập, Chi tiêu, Ròng
    const cardWidth = 58;
    const cardHeight = 22;
    const cardGap = 4;

    // Card 1: Thu nhập (Green)
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(14, startY, cardWidth, cardHeight, 3, 3, 'FD');
    doc.setTextColor(22, 101, 52);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(isEn ? 'TOTAL INCOME (+)' : 'TONG THU NHAP (+)', 18, startY + 7);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`+${formatAmount(totalIncome, currency)}`, 18, startY + 16);

    // Card 2: Chi tiêu (Rose)
    doc.setFillColor(255, 241, 242);
    doc.setDrawColor(254, 205, 211);
    doc.roundedRect(14 + cardWidth + cardGap, startY, cardWidth, cardHeight, 3, 3, 'FD');
    doc.setTextColor(159, 18, 57);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(isEn ? 'TOTAL EXPENSE (-)' : 'TONG CHI TIEU (-)', 18 + cardWidth + cardGap, startY + 7);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`-${formatAmount(totalExpense, currency)}`, 18 + cardWidth + cardGap, startY + 16);

    // Card 3: Ròng (Blue/Indigo)
    doc.setFillColor(238, 242, 255);
    doc.setDrawColor(199, 210, 254);
    doc.roundedRect(14 + (cardWidth + cardGap) * 2, startY, cardWidth, cardHeight, 3, 3, 'FD');
    doc.setTextColor(49, 46, 129);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(isEn ? 'NET SAVINGS' : 'CHENH LECH RONG', 18 + (cardWidth + cardGap) * 2, startY + 7);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(formatAmount(netBalance, currency), 18 + (cardWidth + cardGap) * 2, startY + 16);

    startY += cardHeight + 8;

    // BẢNG 1: GIAO DỊCH
    const tableHeaders = isEn
        ? [['#', 'Date', 'Type', 'Category', 'Amount', 'Wallet', 'Note']]
        : [['STT', 'Ngay', 'Loai', 'Danh muc', 'So tien', 'Vi/Tai khoan', 'Ghi chu']];

    const tableRows = transactions.map((t, idx) => {
        const isInc = t.transactionType === 'INCOME' || (!t.category && !t.categoryId);
        const amtStr = `${isInc ? '+' : '-'}${formatAmount(t.amount, currency)}`;
        const typeStr = isInc ? (isEn ? 'Income' : 'Thu nhap') : (isEn ? 'Expense' : 'Chi tieu');
        const catStr = removeVietnameseTones(t.categoryName || (isInc ? 'Thu nhap' : 'Chi tieu'));
        const walletStr = removeVietnameseTones(t.accountName || t.walletName || 'Vi');
        const noteStr = removeVietnameseTones(t.note || '-');

        return [
            idx + 1,
            formatDate(t.transactionDate),
            typeStr,
            catStr,
            amtStr,
            walletStr,
            noteStr.length > 30 ? noteStr.substring(0, 27) + '...' : noteStr,
        ];
    });

    autoTable(doc, {
        head: tableHeaders,
        body: tableRows,
        startY: startY,
        theme: 'striped',
        headStyles: {
            fillColor: [30, 58, 138],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'left',
        },
        bodyStyles: {
            fontSize: 8,
            textColor: [51, 65, 85],
        },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' }, // STT
            1: { cellWidth: 22 },                  // Ngày
            2: { cellWidth: 20 },                  // Loại
            3: { cellWidth: 32 },                  // Danh mục
            4: { cellWidth: 32, fontStyle: 'bold', halign: 'right' }, // Số tiền
            5: { cellWidth: 30 },                  // Ví
            6: { cellWidth: 'auto' },              // Ghi chú
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252],
        },
        margin: { left: 14, right: 14, bottom: 20 },
        didDrawPage: (data) => {
            // Footer trang
            const pageCount = doc.internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(148, 163, 184);
            doc.text(
                `Teemoney Finance App | ${isEn ? 'Page' : 'Trang'} ${data.pageNumber} / ${pageCount}`,
                14,
                290
            );
        },
    });

    // Nếu kèm danh sách Ví
    if (includeAccounts && accounts.length > 0) {
        let finalY = doc.lastAutoTable?.finalY || startY + 40;
        if (finalY > 230) {
            doc.addPage();
            finalY = 20;
        } else {
            finalY += 10;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        doc.text(isEn ? 'WALLETS & ACCOUNTS OVERVIEW' : 'DANH SACH VI & TAI KHOAN TAI CHINH', 14, finalY);

        const accHeaders = isEn
            ? [['#', 'Account/Wallet Name', 'Type', 'Current Balance']]
            : [['STT', 'Ten tai khoan / Vi', 'Loai tai khoan', 'So du hien tai']];

        const accRows = accounts.map((acc, idx) => [
            idx + 1,
            removeVietnameseTones(acc.accountName || 'Vi'),
            removeVietnameseTones(acc.accountType || 'Ca nhan'),
            formatAmount(acc.balance, currency),
        ]);

        autoTable(doc, {
            head: accHeaders,
            body: accRows,
            startY: finalY + 4,
            theme: 'grid',
            headStyles: {
                fillColor: [71, 85, 105],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8.5,
            },
            bodyStyles: {
                fontSize: 8,
                textColor: [51, 65, 85],
            },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 60 },
                2: { cellWidth: 45 },
                3: { cellWidth: 45, fontStyle: 'bold', halign: 'right' },
            },
            margin: { left: 14, right: 14, bottom: 20 },
        });
    }

    const filename = generateFilename('Teemoney_BaoCaoTaiChinh', 'pdf');
    doc.save(filename);
    return filename;
};

/**
 * 3. IN / LƯU PDF CHUẨN FONT TIẾNG VIỆT 100% (High-fidelity HTML Print / Save as PDF)
 * Mở cửa sổ in chuyên nghiệp giữ 100% font chữ tiếng Việt, logo, và màu sắc thương hiệu
 */
export const printReportView = ({
    transactions = [],
    accounts = [],
    profile = {},
    timeFilterLabel = 'Tất cả thời gian',
    currency = 'VND',
    includeAccounts = true,
}) => {
    let totalIncome = 0;
    let totalExpense = 0;
    transactions.forEach((t) => {
        const amt = Number(t.amount) || 0;
        const isInc = t.transactionType === 'INCOME' || (!t.category && !t.categoryId);
        if (isInc) totalIncome += amt;
        else totalExpense += amt;
    });
    const netBalance = totalIncome - totalExpense;

    const printWin = window.open('', '_blank', 'width=950,height=800');
    if (!printWin) {
        alert('Trình duyệt đã chặn cửa sổ in tự động. Vui lòng cho phép pop-up để xem báo cáo.');
        return;
    }

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8">
            <title>Báo cáo tài chính Teemoney - ${timeFilterLabel}</title>
            <style>
                @page { size: A4 portrait; margin: 15mm; }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                    color: #1e293b;
                    margin: 0;
                    padding: 20px;
                    line-height: 1.5;
                    background: #fff;
                }
                .header {
                    border-bottom: 3px solid #1e3a8a;
                    padding-bottom: 16px;
                    margin-bottom: 24px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .logo-title {
                    font-size: 24px;
                    font-weight: 900;
                    color: #1e3a8a;
                    margin: 0;
                }
                .logo-subtitle {
                    font-size: 13px;
                    color: #64748b;
                    margin: 4px 0 0 0;
                }
                .meta-box {
                    text-align: right;
                    font-size: 12px;
                    color: #475569;
                }
                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 16px;
                    margin-bottom: 24px;
                }
                .summary-card {
                    padding: 14px 18px;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                }
                .summary-card.income { background-color: #f0fdf4; border-color: #bbf7d0; color: #166534; }
                .summary-card.expense { background-color: #fff1f2; border-color: #fecdd3; color: #9f1239; }
                .summary-card.net { background-color: #eef2ff; border-color: #c7d2fe; color: #312e81; }
                .card-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
                .card-value { font-size: 20px; font-weight: 800; margin-top: 6px; }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 24px;
                    font-size: 12px;
                }
                th {
                    background-color: #1e3a8a;
                    color: #ffffff;
                    text-align: left;
                    padding: 10px 12px;
                    font-weight: 700;
                }
                td {
                    padding: 9px 12px;
                    border-bottom: 1px solid #f1f5f9;
                }
                tr:nth-child(even) td { background-color: #f8fafc; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .income-text { color: #16a34a; font-weight: bold; }
                .expense-text { color: #e11d48; font-weight: bold; }
                .badge {
                    display: inline-block;
                    padding: 3px 8px;
                    border-radius: 9999px;
                    font-size: 11px;
                    font-weight: 600;
                }
                .badge-inc { background-color: #dcfce7; color: #15803d; }
                .badge-exp { background-color: #ffe4e6; color: #be123c; }
                .section-title {
                    font-size: 15px;
                    font-weight: 800;
                    color: #0f172a;
                    margin: 20px 0 10px 0;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .footer {
                    margin-top: 30px;
                    padding-top: 15px;
                    border-top: 1px dashed #cbd5e1;
                    font-size: 11px;
                    color: #94a3b8;
                    display: flex;
                    justify-content: space-between;
                }
                @media print {
                    .no-print { display: none !important; }
                    body { padding: 0; }
                }
            </style>
        </head>
        <body>
            <div class="no-print" style="margin-bottom: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                <button onclick="window.print()" style="padding: 10px 20px; background: #1e3a8a; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">
                    🖨️ In báo cáo / Lưu thành PDF
                </button>
                <button onclick="window.close()" style="padding: 10px 16px; background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; border-radius: 8px; font-weight: bold; cursor: pointer;">
                    Đóng
                </button>
            </div>

            <div class="header">
                <div>
                    <h1 class="logo-title">TEEMONEY - BÁO CÁO TÀI CHÍNH</h1>
                    <p class="logo-subtitle">Hệ thống Quản lý Chi tiêu & Tài chính Thông minh</p>
                </div>
                <div class="meta-box">
                    <p><strong>Người xuất:</strong> ${profile.fullName || profile.username || 'Người dùng'}</p>
                    <p><strong>Kỳ báo cáo:</strong> ${timeFilterLabel}</p>
                    <p><strong>Ngày xuất:</strong> ${formatDate(new Date())}</p>
                </div>
            </div>

            <div class="summary-grid">
                <div class="summary-card income">
                    <div class="card-label">Tổng thu nhập (+)</div>
                    <div class="card-value">+${formatAmount(totalIncome, currency)}</div>
                </div>
                <div class="summary-card expense">
                    <div class="card-label">Tổng chi tiêu (-)</div>
                    <div class="card-value">-${formatAmount(totalExpense, currency)}</div>
                </div>
                <div class="summary-card net">
                    <div class="card-label">Chênh lệch ròng (Tiết kiệm)</div>
                    <div class="card-value">${formatAmount(netBalance, currency)}</div>
                </div>
            </div>

            <div class="section-title">
                <span>📋 LỊCH SỬ GIAO DỊCH (${transactions.length} giao dịch)</span>
            </div>

            <table>
                <thead>
                    <tr>
                        <th class="text-center" style="width: 40px;">STT</th>
                        <th style="width: 90px;">Ngày</th>
                        <th style="width: 90px;">Loại</th>
                        <th>Danh mục</th>
                        <th class="text-right" style="width: 120px;">Số tiền</th>
                        <th style="width: 130px;">Tài khoản / Ví</th>
                        <th>Ghi chú</th>
                    </tr>
                </thead>
                <tbody>
                    ${
                        transactions.length === 0
                            ? '<tr><td colspan="7" class="text-center" style="padding: 24px; color: #94a3b8;">Không có giao dịch nào trong khoảng thời gian này</td></tr>'
                            : transactions
                                  .map((t, idx) => {
                                      const isInc = t.transactionType === 'INCOME' || (!t.category && !t.categoryId);
                                      return `
                                <tr>
                                    <td class="text-center">${idx + 1}</td>
                                    <td>${formatDate(t.transactionDate)}</td>
                                    <td>
                                        <span class="badge ${isInc ? 'badge-inc' : 'badge-exp'}">
                                            ${isInc ? 'Thu nhập' : 'Chi tiêu'}
                                        </span>
                                    </td>
                                    <td><strong>${t.categoryName || (isInc ? 'Thu nhập' : 'Chi phí')}</strong></td>
                                    <td class="text-right ${isInc ? 'income-text' : 'expense-text'}">
                                        ${isInc ? '+' : '-'}${formatAmount(t.amount, currency)}
                                    </td>
                                    <td>${t.accountName || t.walletName || 'Ví chính'}</td>
                                    <td>${t.note || '-'}</td>
                                </tr>`;
                                  })
                                  .join('')
                    }
                </tbody>
            </table>

            ${
                includeAccounts && accounts.length > 0
                    ? `
                <div class="section-title" style="margin-top: 30px;">
                    <span>💳 DANH SÁCH VÍ & TÀI KHOẢN TÀI CHÍNH</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th class="text-center" style="width: 40px;">STT</th>
                            <th>Tên tài khoản / Ví</th>
                            <th>Loại tài khoản</th>
                            <th class="text-right" style="width: 140px;">Số dư hiện tại</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${accounts
                            .map(
                                (acc, idx) => `
                            <tr>
                                <td class="text-center">${idx + 1}</td>
                                <td><strong>${acc.accountName || 'Ví'}</strong></td>
                                <td>${acc.accountType || 'Cá nhân'}</td>
                                <td class="text-right" style="font-weight: 700; color: #1e3a8a;">
                                    ${formatAmount(acc.balance, currency)}
                                </td>
                            </tr>
                        `
                            )
                            .join('')}
                    </tbody>
                </table>
            `
                    : ''
            }

            <div class="footer">
                <span>Báo cáo được xuất tự động từ hệ thống Teemoney</span>
                <span>In vào: ${new Date().toLocaleString('vi-VN')}</span>
            </div>

            <script>
                // Tự động gợi ý in khi trang load xong
                window.onload = function() {
                    setTimeout(() => {
                        window.print();
                    }, 500);
                };
            </script>
        </body>
        </html>
    `;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
};