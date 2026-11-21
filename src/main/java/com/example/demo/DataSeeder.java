package com.example.demo;

import com.example.demo.Repository.CategoryRepository;
import com.example.demo.model.Category;
import com.example.demo.model.JarType;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    private final CategoryRepository categoryRepository;
    private final JdbcTemplate jdbcTemplate;
    private final com.example.demo.Repository.UserRepository userRepository;
    private final org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder passwordEncoder;

    public DataSeeder(
            CategoryRepository categoryRepository,
            JdbcTemplate jdbcTemplate,
            com.example.demo.Repository.UserRepository userRepository,
            org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder passwordEncoder) {
        this.categoryRepository = categoryRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        // 1. Tự động xử lý tương thích & dọn các cột thừa trong MySQL (tách riêng từng câu lệnh qua executeSafeSql)
        executeSafeSql("UPDATE users SET password_hash = password WHERE (password_hash IS NULL OR password_hash = '') AND password IS NOT NULL");
        executeSafeSql("ALTER TABLE users DROP COLUMN password");
        executeSafeSql("ALTER TABLE users MODIFY COLUMN full_name VARCHAR(100) NULL");
        executeSafeSql("ALTER TABLE users MODIFY COLUMN avatar_url MEDIUMTEXT NULL");
        executeSafeSql("ALTER TABLE users ADD COLUMN date_of_birth DATE NULL");
        executeSafeSql("UPDATE users SET user_code = LPAD(MOD(id * 15379, 900000) + 100000, 6, '0') WHERE user_code IS NULL OR user_code = ''");
        executeSafeSql("UPDATE users SET role = 'ROLE_USER' WHERE role IS NULL OR role = ''");
        executeSafeSql("UPDATE users SET status = 'ACTIVE' WHERE status IS NULL OR status = ''");

        // Đảm bảo tài khoản Quản trị viên (admin@gmail.com / admin123) luôn sẵn sàng sử dụng
        try {
            com.example.demo.model.User admin = userRepository.findByEmail("admin@gmail.com")
                    .or(() -> userRepository.findByUsername("admin"))
                    .orElse(null);

            if (admin == null) {
                admin = com.example.demo.model.User.builder()
                        .username("admin")
                        .email("admin@gmail.com")
                        .fullName("Quản Trị Viên Hệ Thống")
                        .nickname("Admin")
                        .password(passwordEncoder.encode("admin123"))
                        .role(com.example.demo.model.UserRole.ROLE_ADMIN)
                        .status(com.example.demo.model.UserStatus.ACTIVE)
                        .userCode("999999")
                        .currency("VND")
                        .language("vi")
                        .authProvider("LOCAL")
                        .build();
                userRepository.save(admin);
            } else {
                // Đảm bảo có role ROLE_ADMIN và cập nhật password hash nếu cần
                admin.setRole(com.example.demo.model.UserRole.ROLE_ADMIN);
                admin.setStatus(com.example.demo.model.UserStatus.ACTIVE);
                admin.setPassword(passwordEncoder.encode("admin123"));
                userRepository.save(admin);
            }
        } catch (Exception ignored) {}

        // Xử lý tương thích & dọn cột thừa bảng accounts
        executeSafeSql("ALTER TABLE accounts MODIFY COLUMN name VARCHAR(100) NULL");
        executeSafeSql("ALTER TABLE accounts MODIFY COLUMN balance DECIMAL(19,2) NULL");
        executeSafeSql("UPDATE accounts SET account_name = name WHERE (account_name IS NULL OR account_name = '') AND name IS NOT NULL");
        executeSafeSql("UPDATE accounts SET account_name = 'Ví chính' WHERE account_name IS NULL OR account_name = ''");
        executeSafeSql("UPDATE accounts SET balance = 0 WHERE balance IS NULL");
        executeSafeSql("UPDATE accounts SET type = 'CASH' WHERE type IS NULL OR type = ''");
        executeSafeSql("ALTER TABLE accounts DROP COLUMN version");

        // Xử lý tương thích & dọn cột thừa bảng categories
        executeSafeSql("UPDATE categories SET icon_name = icon WHERE (icon_name IS NULL OR icon_name = '') AND icon IS NOT NULL");
        executeSafeSql("ALTER TABLE categories DROP COLUMN icon");
        executeSafeSql("ALTER TABLE categories MODIFY COLUMN jar_type ENUM('NECESSITIES','LONG_TERM_SAVE','FINANCIAL_FREE','EDUCATION','PLAY','GIVE') NULL");
        executeSafeSql("UPDATE categories SET type = 'EXPENSE' WHERE type IS NULL OR type = ''");

        // Xử lý tương thích bảng transactions (tách riêng từng lệnh để 1 cột thiếu không làm dừng các lệnh sau)
        executeSafeSql("ALTER TABLE transactions MODIFY COLUMN wallet_id BIGINT NULL");
        executeSafeSql("ALTER TABLE transactions MODIFY COLUMN account_id BIGINT NULL");
        executeSafeSql("ALTER TABLE transactions MODIFY COLUMN type VARCHAR(50) NULL");
        executeSafeSql("ALTER TABLE transactions MODIFY COLUMN date DATETIME NULL");
        executeSafeSql("ALTER TABLE transactions MODIFY COLUMN transaction_type VARCHAR(50) NULL");
        executeSafeSql("ALTER TABLE transactions MODIFY COLUMN transaction_date DATETIME NULL");
        executeSafeSql("ALTER TABLE transactions MODIFY COLUMN amount DECIMAL(19,2) NOT NULL");
        executeSafeSql("UPDATE transactions SET transaction_type = 'EXPENSE' WHERE transaction_type IS NULL OR transaction_type = ''");

        // Xử lý tương thích & dọn cột thừa bảng budgets
        executeSafeSql("ALTER TABLE budgets MODIFY COLUMN jar_type VARCHAR(50) NULL");
        executeSafeSql("ALTER TABLE budgets MODIFY COLUMN limit_amount DECIMAL(19,2) NULL");
        executeSafeSql("ALTER TABLE budgets MODIFY COLUMN spent_amount DECIMAL(19,2) NULL");
        executeSafeSql("ALTER TABLE budgets MODIFY COLUMN start_date DATE NULL");
        executeSafeSql("ALTER TABLE budgets MODIFY COLUMN end_date DATE NULL");
        executeSafeSql("ALTER TABLE budgets MODIFY COLUMN category_id BIGINT NULL");
        executeSafeSql("ALTER TABLE budgets MODIFY COLUMN month_string VARCHAR(7) NULL");
        executeSafeSql("ALTER TABLE budgets MODIFY COLUMN name VARCHAR(100) NULL");
        executeSafeSql("UPDATE budgets SET category_id = NULL WHERE category_id = 0");
        executeSafeSql("UPDATE budgets SET limit_amount = amount WHERE (limit_amount IS NULL OR limit_amount = 0) AND amount IS NOT NULL AND amount > 0");
        executeSafeSql("ALTER TABLE budgets DROP COLUMN amount");
        executeSafeSql("UPDATE budgets SET spent_amount = 0 WHERE spent_amount IS NULL");

        // 2. Khởi tạo danh mục mặc định của hệ thống nếu chưa có
        List<Category> defaultCategories = Arrays.asList(
                createCategory("Ăn uống", "restaurant", "EXPENSE", "#FF5722", JarType.NECESSITIES),
                createCategory("Học tập", "school", "EXPENSE", "#9C27B0", JarType.EDUCATION),
                createCategory("Giải trí", "movie", "EXPENSE", "#E91E63", JarType.PLAY),
                createCategory("Mua sắm", "shopping_bag", "EXPENSE", "#00BCD4", JarType.PLAY),
                createCategory("Di chuyển", "directions_car", "EXPENSE", "#FF9800", JarType.NECESSITIES),
                createCategory("Tiền nhà / Sinh hoạt", "home", "EXPENSE", "#2196F3", JarType.NECESSITIES),
                createCategory("Đầu tư", "trending_up", "EXPENSE", "#4CAF50", JarType.FINANCIAL_FREE),
                createCategory("Tiết kiệm", "savings", "EXPENSE", "#009688", JarType.LONG_TERM_SAVE),
                createCategory("Từ thiện", "volunteer_activism", "EXPENSE", "#8BC34A", JarType.GIVE),
                createCategory("Lương thưởng", "payments", "INCOME", "#009688", null),
                createCategory("Thu nhập phụ", "account_balance_wallet", "INCOME", "#3F51B5", null)
        );

        for (Category defCat : defaultCategories) {
            boolean exists = categoryRepository.findByUserOrSystem(null).stream()
                    .anyMatch(c -> c.getUser() == null && c.getName().equalsIgnoreCase(defCat.getName()));
            if (!exists) {
                categoryRepository.save(defCat);
            }
        }
    }

    private void executeSafeSql(String sql) {
        try {
            jdbcTemplate.execute(sql);
        } catch (Exception ignored) {}
    }

    private Category createCategory(String name, String iconName, String type, String colorCode, JarType jarType) {
        return Category.builder()
                .name(name)
                .iconName(iconName)
                .type(type)
                .colorCode(colorCode)
                .jarType(jarType)
                .user(null) // null = danh mục hệ thống dùng chung
                .build();
    }
}