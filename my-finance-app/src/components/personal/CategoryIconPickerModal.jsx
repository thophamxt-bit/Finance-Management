import React, { useState, useMemo } from 'react';

// Kho icon Google Material Symbols được tuyển chọn dành riêng cho quản lý chi tiêu & tài chính
export const ICON_CATEGORIES = [
    {
        id: 'ALL',
        name: 'Tất cả',
        icon: 'apps'
    },
    {
        id: 'FOOD',
        name: 'Ăn uống',
        icon: 'restaurant',
        icons: [
            { name: 'restaurant', label: 'Nhà hàng / Quán ăn', keywords: 'an uong com nha hang food dine' },
            { name: 'fastfood', label: 'Thức ăn nhanh', keywords: 'fastfood burger khoai do an vat' },
            { name: 'local_cafe', label: 'Cà phê / Trà sữa', keywords: 'cafe ca phe tra sua coffee tea' },
            { name: 'ramen_dining', label: 'Phở / Bún / Mì', keywords: 'pho bun mi ramen noodle' },
            { name: 'local_bar', label: 'Bia / Quán bar', keywords: 'bia ruou bar beer drink' },
            { name: 'bakery_dining', label: 'Bánh mì / Bánh ngọt', keywords: 'banh mi cake bakery bread' },
            { name: 'lunch_dining', label: 'Cơm trưa / Đồ ăn', keywords: 'com trua lunch meal' },
            { name: 'local_pizza', label: 'Pizza', keywords: 'pizza do an' },
            { name: 'icecream', label: 'Kem / Tráng miệng', keywords: 'kem icecream dessert' },
            { name: 'shopping_basket', label: 'Đi chợ / Siêu thị', keywords: 'di cho thuc pham grocery market' },
            { name: 'kitchen', label: 'Nấu ăn / Bếp', keywords: 'nau an bep cook food' },
            { name: 'wine_bar', label: 'Rượu vang / Tiệc', keywords: 'ruou vang wine party' },
            { name: 'liquor', label: 'Rượu / Đồ uống có cồn', keywords: 'ruou liquor alcohol' },
            { name: 'cookie', label: 'Bánh quy / Snack', keywords: 'snack cookie an vat' },
            { name: 'set_meal', label: 'Set ăn / Hải sản', keywords: 'hai san ca fish seafood' },
            { name: 'takeout_dining', label: 'Đồ mang đi / Ship đồ ăn', keywords: 'ship do an takeout delivery' },
        ]
    },
    {
        id: 'SHOPPING',
        name: 'Mua sắm',
        icon: 'shopping_bag',
        icons: [
            { name: 'shopping_bag', label: 'Mua sắm chung', keywords: 'mua sam shop shopping bag' },
            { name: 'shopping_cart', label: 'Giỏ hàng / Siêu thị', keywords: 'gio hang cart supermarket' },
            { name: 'storefront', label: 'Cửa hàng tiện lợi', keywords: 'cua hang tap hoa store' },
            { name: 'checkroom', label: 'Quần áo / Thời trang', keywords: 'quan ao thoi trang clothes fashion' },
            { name: 'styler', label: 'Làm đẹp / Mỹ phẩm', keywords: 'my pham lam dep cosmetic beauty' },
            { name: 'watch', label: 'Đồng hồ / Phụ kiện', keywords: 'dong ho phu kien watch accessory' },
            { name: 'diamond', label: 'Trang sức / Đồ hiệu', keywords: 'trang suc kim cuong luxury jewel' },
            { name: 'local_mall', label: 'Trung tâm thương mại', keywords: 'mall vincom aeon shopping' },
            { name: 'card_giftcard', label: 'Quà tặng / Sinh nhật', keywords: 'qua tang gift present' },
            { name: 'loyalty', label: 'Voucher / Giảm giá', keywords: 'voucher coupon discount' },
            { name: 'local_offer', label: 'Ưu đãi / Săn sale', keywords: 'sale deal offer' },
            { name: 'inventory_2', label: 'Đồ gia dụng / Hàng hóa', keywords: 'do dung hang hoa goods box' },
        ]
    },
    {
        id: 'TRANSPORT',
        name: 'Di chuyển',
        icon: 'directions_car',
        icons: [
            { name: 'directions_car', label: 'Ô tô / Xe hơi', keywords: 'o to xe hoi car' },
            { name: 'two_wheeler', label: 'Xe máy', keywords: 'xe may motorbike motor' },
            { name: 'local_gas_station', label: 'Xăng dầu', keywords: 'xang dau gas petrol oil' },
            { name: 'local_taxi', label: 'Taxi / Grab / Be', keywords: 'grab be taxi ride' },
            { name: 'directions_bus', label: 'Xe buýt / Xe khách', keywords: 'xe buyt bus' },
            { name: 'flight', label: 'Vé máy bay / Du lịch', keywords: 'may bay flight airline plane' },
            { name: 'train', label: 'Tàu hỏa / Đường sắt', keywords: 'tau hoa train railway' },
            { name: 'car_repair', label: 'Sửa xe / Bảo dưỡng', keywords: 'sua xe bao duong repair mechanic' },
            { name: 'local_parking', label: 'Gửi xe / Đỗ xe', keywords: 'gui xe do xe parking' },
            { name: 'commute', label: 'Đi lại hàng ngày', keywords: 'di lai commute' },
            { name: 'pedal_bike', label: 'Xe đạp', keywords: 'xe dap bike bicycle' },
            { name: 'electric_scooter', label: 'Xe điện / Scooter', keywords: 'xe dien scooter' },
        ]
    },
    {
        id: 'HOUSING',
        name: 'Nhà cửa & Hóa đơn',
        icon: 'home',
        icons: [
            { name: 'home', label: 'Tiền thuê nhà / Nhà ở', keywords: 'tien nha phong tro thue nha house rent' },
            { name: 'lightbulb', label: 'Tiền điện', keywords: 'tien dien electricity power' },
            { name: 'water_drop', label: 'Tiền nước', keywords: 'tien nuoc water' },
            { name: 'wifi', label: 'Internet / Mạng Wifi', keywords: 'internet wifi cap quang' },
            { name: 'cell_tower', label: 'Cước điện thoại / 4G', keywords: 'nap the dien thoai 4g phone bill' },
            { name: 'tv', label: 'Truyền hình / Netflix', keywords: 'truyen hinh netflix cable tv' },
            { name: 'cleaning_services', label: 'Dọn dẹp / Giặt ủi', keywords: 'don dep ve sinh giat ui cleaning' },
            { name: 'handyman', label: 'Sửa chữa nhà cửa', keywords: 'sua nha dung cu handyman tool' },
            { name: 'shield', label: 'Bảo hiểm', keywords: 'bao hiem insurance shield' },
            { name: 'bed', label: 'Nội thất / Giường chiếu', keywords: 'noi that giuong ngu furniture bed' },
            { name: 'ac_unit', label: 'Điều hòa / Điện lạnh', keywords: 'dieu hoa may lanh ac cool' },
        ]
    },
    {
        id: 'HEALTH',
        name: 'Sức khỏe & Thể thao',
        icon: 'fitness_center',
        icons: [
            { name: 'fitness_center', label: 'Tập Gym / Thể hình', keywords: 'gym the thao the hinh workout fitness' },
            { name: 'medication', label: 'Thuốc men / Dược phẩm', keywords: 'thuoc men nha thuoc pharmacy drug' },
            { name: 'medical_services', label: 'Khám bệnh / Bệnh viện', keywords: 'kham benh benh vien doctor hospital' },
            { name: 'dentistry', label: 'Nha khoa / Răng hàm', keywords: 'nha khoa rang mieng dental' },
            { name: 'spa', label: 'Spa / Massage / Thư giãn', keywords: 'spa massage thu gian relax' },
            { name: 'sports_soccer', label: 'Đá bóng', keywords: 'bong da soccer football' },
            { name: 'sports_tennis', label: 'Pickleball / Tennis', keywords: 'pickleball tennis cau long' },
            { name: 'pool', label: 'Bơi lội', keywords: 'boi loi swimming pool' },
            { name: 'self_improvement', label: 'Yoga / Thiền', keywords: 'yoga thien meditation' },
            { name: 'bloodtype', label: 'Xét nghiệm / Y tế', keywords: 'xet nghiem mau blood medical' },
        ]
    },
    {
        id: 'EDUCATION',
        name: 'Học tập & Công việc',
        icon: 'school',
        icons: [
            { name: 'school', label: 'Học phí / Trường học', keywords: 'hoc phi truong hoc tuition school' },
            { name: 'menu_book', label: 'Sách vở / Tài liệu', keywords: 'sach vo tai lieu book study' },
            { name: 'laptop_mac', label: 'Máy tính / Thiết bị CNTT', keywords: 'may tinh laptop pc tech' },
            { name: 'work', label: 'Công việc / Dự án', keywords: 'cong viec lam an work job' },
            { name: 'draw', label: 'Học vẽ / Khóa học kỹ năng', keywords: 'hoc ve ky nang course course' },
            { name: 'translate', label: 'Học ngoại ngữ', keywords: 'tieng anh ngoai ngu language translate' },
            { name: 'science', label: 'Nghiên cứu / Thí nghiệm', keywords: 'nghien cuu khoa hoc science' },
            { name: 'calculate', label: 'Dụng cụ học tập', keywords: 'may tinh tinh toan calculator' },
        ]
    },
    {
        id: 'ENTERTAINMENT',
        name: 'Giải trí',
        icon: 'sports_esports',
        icons: [
            { name: 'sports_esports', label: 'Chơi game / Nạp game', keywords: 'game tro choi esports gaming' },
            { name: 'movie', label: 'Xem phim / Rạp chiếu phim', keywords: 'xem phim rap chieu cinema movie' },
            { name: 'music_note', label: 'Âm nhạc / Nhạc số', keywords: 'am nhac spotify music' },
            { name: 'theater_comedy', label: 'Kịch / Xem show ca nhạc', keywords: 'ca nhac show dien theatre comedy' },
            { name: 'camera_alt', label: 'Chụp ảnh / Nhiếp ảnh', keywords: 'chup anh camera photo' },
            { name: 'celebration', label: 'Lễ hội / Tiệc tùng', keywords: 'tiec party holiday celebration' },
            { name: 'attractions', label: 'Công viên / Khu vui chơi', keywords: 'vui choi giai tri park amusement' },
            { name: 'headphones', label: 'Tai nghe / Phụ kiện giải trí', keywords: 'tai nghe audio headphone' },
            { name: 'palette', label: 'Hội họa / Triển lãm', keywords: 've tranh hoi hoa art exhibition' },
        ]
    },
    {
        id: 'FINANCE',
        name: 'Tài chính & Thu nhập',
        icon: 'payments',
        icons: [
            { name: 'payments', label: 'Tiền mặt / Chi trả', keywords: 'tien mat thanh toan cash money pay' },
            { name: 'attach_money', label: 'Thu nhập / Lương thưởng', keywords: 'luong thu nhap tien income salary' },
            { name: 'savings', label: 'Tiết kiệm / Heo đất', keywords: 'tiet kiem pig save saving' },
            { name: 'trending_up', label: 'Đầu tư / Chứng khoán', keywords: 'dau tu co phieu stock invest' },
            { name: 'account_balance', label: 'Ngân hàng / Gửi tiết kiệm', keywords: 'ngan hang bank deposit' },
            { name: 'currency_exchange', label: 'Đổi ngoại tệ / Kiều hối', keywords: 'ngoai te forex exchange' },
            { name: 'credit_card', label: 'Thẻ tín dụng', keywords: 'the tin dung card credit' },
            { name: 'wallet', label: 'Ví tiền / Nguồn tiền', keywords: 'vi tien wallet fund' },
            { name: 'real_estate_agent', label: 'Bất động sản', keywords: 'bat dong san dat nha real estate' },
            { name: 'volunteer_activism', label: 'Từ thiện / Cho đi', keywords: 'tu thien quyen gop donate give' },
            { name: 'price_check', label: 'Lãi suất / Cổ tức', keywords: 'lai suat co tuc dividend profit' },
        ]
    },
    {
        id: 'LIFE',
        name: 'Đời sống & Thú cưng',
        icon: 'pets',
        icons: [
            { name: 'pets', label: 'Thú cưng / Chó mèo', keywords: 'thu cung cho meo pet cat dog' },
            { name: 'child_care', label: 'Con cái / Trẻ em', keywords: 'con cai em be baby kid child' },
            { name: 'stroller', label: 'Đồ dùng cho bé', keywords: 'xe day bim sua stroller baby' },
            { name: 'cake', label: 'Sinh nhật / Kỷ niệm', keywords: 'sinh nhat ky niem birthday cake' },
            { name: 'smoking_rooms', label: 'Thuốc lá', keywords: 'thuoc la smoke' },
            { name: 'local_laundry_service', label: 'Giặt sấy tiệm', keywords: 'tiem giat laundry wash' },
            { name: 'favorite', label: 'Tình cảm / Người yêu', keywords: 'tinh cam hen ho date love' },
            { name: 'content_cut', label: 'Cắt tóc / Làm tóc', keywords: 'cat toc barber salon hair' },
            { name: 'more_horiz', label: 'Chi phí khác', keywords: 'chi phi khac other general' },
        ]
    }
];

// Danh sách icon phẳng cho chế độ All và Search
export const ALL_ICONS = ICON_CATEGORIES
    .filter(cat => cat.id !== 'ALL')
    .flatMap(cat => cat.icons.map(icon => ({ ...icon, categoryId: cat.id, categoryName: cat.name })));

const CategoryIconPickerModal = ({ isOpen, onClose, selectedIcon, onSelectIcon }) => {
    const [selectedTab, setSelectedTab] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [customIconInput, setCustomIconInput] = useState('');

    // Lọc danh sách icon theo tab & từ khóa tìm kiếm
    const filteredIcons = useMemo(() => {
        let list = selectedTab === 'ALL'
            ? ALL_ICONS
            : (ICON_CATEGORIES.find(c => c.id === selectedTab)?.icons || []);

        if (searchTerm.trim()) {
            const term = searchTerm.trim().toLowerCase();
            list = ALL_ICONS.filter(icon =>
                icon.name.toLowerCase().includes(term) ||
                icon.label.toLowerCase().includes(term) ||
                (icon.keywords && icon.keywords.toLowerCase().includes(term))
            );
        }
        return list;
    }, [selectedTab, searchTerm]);

    if (!isOpen) return null;

    const handleSelect = (iconName) => {
        onSelectIcon(iconName);
        onClose();
    };

    const handleApplyCustomIcon = (e) => {
        e.preventDefault();
        if (customIconInput.trim()) {
            onSelectIcon(customIconInput.trim().toLowerCase().replace(/\s+/g, '_'));
            setCustomIconInput('');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in zoom-in-95">

                {/* Header Modal */}
                <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 p-6 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
                            <span className="material-symbols-outlined text-2xl text-blue-200">category</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-black tracking-tight font-['Manrope']">Kho Biểu Tượng Danh Mục</h3>
                            <p className="text-xs text-blue-200 font-medium">Hơn 120+ icon chuẩn Google Material Symbols cho quản lý tài chính</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-all cursor-pointer"
                        title="Đóng"
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                {/* Live Preview & Search Box */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/70 space-y-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        {/* Biểu tượng đang chọn */}
                        <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-200/80 shadow-2xs w-full sm:w-auto">
                            <div className="w-11 h-11 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-md shadow-blue-900/20 shrink-0">
                                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    {selectedIcon || 'category'}
                                </span>
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đang chọn</p>
                                <p className="text-xs font-black text-slate-800 truncate font-mono">{selectedIcon || 'category'}</p>
                            </div>
                        </div>

                        {/* Thanh tìm kiếm */}
                        <div className="relative flex-1 w-full">
                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Tìm icon: ăn uống, cafe, xăng, mua sắm, game, thuốc, xe..."
                                className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-all shadow-2xs placeholder:text-slate-400"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-base">cancel</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Danh mục Icon (Tabs) */}
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide text-xs">
                        {ICON_CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => {
                                    setSelectedTab(cat.id);
                                    setSearchTerm('');
                                }}
                                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                                    selectedTab === cat.id && !searchTerm
                                        ? 'bg-blue-900 text-white shadow-sm'
                                        : 'bg-white text-slate-600 hover:bg-slate-200/60 border border-slate-200/60'
                                }`}
                            >
                                <span className="material-symbols-outlined text-sm">{cat.icon}</span>
                                <span>{cat.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid hiển thị Icons */}
                <div className="p-6 overflow-y-auto max-h-[46vh] flex-1">
                    {filteredIcons.length > 0 ? (
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                            {filteredIcons.map((item, idx) => {
                                const isSelected = selectedIcon === item.name;
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleSelect(item.name)}
                                        title={`${item.label} (${item.name})`}
                                        className={`group p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 border transition-all cursor-pointer active:scale-95 ${
                                            isSelected
                                                ? 'bg-blue-900 text-white border-blue-900 shadow-md shadow-blue-900/25 scale-105'
                                                : 'bg-white hover:bg-blue-50 border-slate-200/80 text-slate-700 hover:border-blue-300 hover:shadow-2xs'
                                        }`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                                            isSelected ? 'bg-white/15' : 'bg-slate-50 group-hover:bg-blue-100/50'
                                        }`}>
                                            <span
                                                className="material-symbols-outlined text-2xl"
                                                style={{ fontVariationSettings: isSelected ? "'FILL' 1" : "'FILL' 0" }}
                                            >
                                                {item.name}
                                            </span>
                                        </div>
                                        <span className={`text-[9px] font-bold text-center leading-tight line-clamp-1 w-full truncate ${
                                            isSelected ? 'text-white' : 'text-slate-600 group-hover:text-blue-900'
                                        }`}>
                                            {item.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12 space-y-3">
                            <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                                <span className="material-symbols-outlined text-3xl">search_off</span>
                            </div>
                            <p className="text-sm font-bold text-slate-600">Không tìm thấy icon nào với từ khóa "{searchTerm}"</p>
                            <p className="text-xs text-slate-400">Bạn có thể tự nhập tên icon Google Material Symbol ở ô bên dưới.</p>
                        </div>
                    )}
                </div>

                {/* Footer Tự nhập Custom Icon Name từ Google Fonts */}
                <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <form onSubmit={handleApplyCustomIcon} className="flex items-center gap-2 w-full sm:w-auto flex-1">
                        <span className="text-slate-500 font-medium whitespace-nowrap">Icon khác từ Google Fonts:</span>
                        <input
                            type="text"
                            value={customIconInput}
                            onChange={(e) => setCustomIconInput(e.target.value)}
                            placeholder="vd: diamond, anchor, sports_soccer..."
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono flex-1 sm:w-48 focus:outline-none focus:border-blue-900"
                        />
                        <button
                            type="submit"
                            disabled={!customIconInput.trim()}
                            className="bg-blue-900 disabled:bg-slate-300 text-white px-3.5 py-1.5 rounded-xl font-bold cursor-pointer transition-all shadow-2xs shrink-0"
                        >
                            Áp dụng
                        </button>
                    </form>

                    <div className="flex items-center gap-2">
                        <a
                            href="https://fonts.google.com/icons?icon.set=Material+Symbols"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-900 hover:text-blue-700 hover:underline font-bold text-[11px] flex items-center gap-1"
                        >
                            <span>Xem kho Google Fonts</span>
                            <span className="material-symbols-outlined text-xs">open_in_new</span>
                        </a>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-all cursor-pointer"
                        >
                            Xong
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CategoryIconPickerModal;