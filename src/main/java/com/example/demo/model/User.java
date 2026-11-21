package com.example.demo.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Entity
@Table(name = "users")
@Getter
@Setter
@ToString(exclude = {"accounts", "transactions", "budgets"})
@EqualsAndHashCode(of = "id")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Email không được để trống!")
    @Email(message = "Email không đúng định dạng! (Ví dụ: name@gmail.com)")
    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", length = 255)
    @JsonIgnore
    private String password;

    @Column(name = "auth_provider", length = 50)
    @Builder.Default
    private String authProvider = "LOCAL";

    @Size(max = 100, message = "Họ và tên không được dài quá 100 ký tự!")
    @Column(name = "full_name", length = 100)
    private String fullName;

    @Size(max = 50, message = "Nickname không được dài quá 50 ký tự!")
    @Column(length = 50)
    private String nickname;

    @Size(max = 20)
    @Column(length = 20)
    private String gender;

    @Column(name = "avatar_url", columnDefinition = "MEDIUMTEXT")
    private String avatarUrl;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Size(max = 20)
    @Column(length = 20)
    @Builder.Default
    private String language = "vi";

    @Size(max = 10)
    @Column(length = 10)
    @Builder.Default
    private String currency = "VND";

    // Vẫn duy trì username cho các chức năng đăng nhập hiện tại hoặc lưu email làm định danh
    @Column(length = 255, unique = true)
    private String username;

    // Mã số riêng gồm 6 chữ số cho người dùng kết bạn và mời vào nhóm
    @Column(name = "user_code", length = 20, unique = true)
    private String userCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", length = 20)
    @Builder.Default
    private UserRole role = UserRole.ROLE_USER;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    @Builder.Default
    private UserStatus status = UserStatus.ACTIVE;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @Column(name = "failed_login_attempts")
    @Builder.Default
    private Integer failedLoginAttempts = 0;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    @JsonIgnore
    @Builder.Default
    private List<Account> accounts = new ArrayList<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    @JsonIgnore
    @Builder.Default
    private List<Transaction> transactions = new ArrayList<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    @JsonIgnore
    @Builder.Default
    private List<Budget> budgets = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.username == null && this.email != null) {
            this.username = this.email;
        }
        if (this.userCode == null || this.userCode.isBlank()) {
            this.userCode = generateRandomUserCode();
        }
        if (this.role == null) {
            this.role = UserRole.ROLE_USER;
        }
        if (this.status == null) {
            this.status = UserStatus.ACTIVE;
        }
        if (this.failedLoginAttempts == null) {
            this.failedLoginAttempts = 0;
        }
    }

    public static String generateRandomUserCode() {
        int code = ThreadLocalRandom.current().nextInt(100000, 1000000);
        return String.valueOf(code);
    }

    public String getUserCode() {
        if (this.userCode == null || this.userCode.isBlank()) {
            if (this.id != null) {
                return String.format("%06d", Math.abs((this.id * 15379L) % 900000L + 100000L));
            }
        }
        return this.userCode;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}