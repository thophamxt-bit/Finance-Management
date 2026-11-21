package com.example.demo.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "accounts")
@Getter
@Setter
@ToString(exclude = {"user", "transactions"})
@EqualsAndHashCode(of = "id")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Account {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Tên tài khoản/ví không được để trống!")
    @Size(max = 100, message = "Tên tài khoản/ví không được dài quá 100 ký tự!")
    @Column(name = "account_name", nullable = false, length = 100)
    private String accountName;

    @Size(max = 50)
    @Column(length = 50)
    @Builder.Default
    private String type = "CASH"; // CASH, BANK, CREDIT_CARD, E_WALLET

    @Column(precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal balance = BigDecimal.ZERO;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @NotNull(message = "Tài khoản bắt buộc phải gắn với một người dùng!")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @OneToMany(mappedBy = "account", cascade = CascadeType.ALL)
    @JsonIgnore
    @Builder.Default
    private List<Transaction> transactions = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        normalizeFields();
    }

    @PreUpdate
    protected void onUpdate() {
        normalizeFields();
    }

    private void normalizeFields() {
        if (this.accountName == null || this.accountName.isBlank()) {
            this.accountName = "Ví chính";
        }
        if (this.balance == null) {
            this.balance = BigDecimal.ZERO;
        }
        if (this.type == null || this.type.isBlank()) {
            this.type = "CASH";
        }
    }

    // Helper getter/setter để tương thích
    public String getName() {
        return this.accountName;
    }

    public void setName(String name) {
        this.accountName = name;
    }
}