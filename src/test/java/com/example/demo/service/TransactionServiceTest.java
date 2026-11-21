package com.example.demo.service;

import com.example.demo.Repository.AccountRepository;
import com.example.demo.Repository.BudgetRepository;
import com.example.demo.Repository.CategoryRepository;
import com.example.demo.Repository.TransactionRepository;
import com.example.demo.dto.TransactionRequest;
import com.example.demo.model.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private BudgetRepository budgetRepository;

    @Mock
    private AccountRepository accountRepository;

    @InjectMocks
    private TransactionService transactionService;

    private User owner;
    private Account wallet;
    private Category foodCategory;

    @BeforeEach
    void setUp() {
        owner = User.builder()
                .id(1L)
                .username("tho_user")
                .email("tho@example.com")
                .build();

        wallet = Account.builder()
                .id(10L)
                .accountName("Ví Tiền Mặt")
                .type("CASH")
                .balance(new BigDecimal("5000000"))
                .user(owner)
                .build();

        foodCategory = Category.builder()
                .id(100L)
                .name("Ăn uống")
                .jarType(JarType.NECESSITIES)
                .build();
    }

    @Test
    @DisplayName("TC_TX_01: Giao dịch CHI TIÊU (EXPENSE) trừ đúng số dư ví và cộng vào ngân sách đang hoạt động")
    void processTransaction_Expense_DeductsBalanceAndUpdatesBudget() {
        Budget foodBudget = Budget.builder()
                .id(50L)
                .user(owner)
                .category(foodCategory)
                .limitAmount(new BigDecimal("2000000"))
                .spentAmount(new BigDecimal("300000"))
                .build();

        TransactionRequest req = TransactionRequest.builder()
                .accountId(10L)
                .categoryId(100L)
                .amount(new BigDecimal("200000"))
                .note("Ăn trưa cơm tấm")
                .transactionDate("2026-11-20")
                .transactionType("EXPENSE")
                .build();

        when(categoryRepository.findById(100L)).thenReturn(Optional.of(foodCategory));
        when(accountRepository.findById(10L)).thenReturn(Optional.of(wallet));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));
        when(budgetRepository.findActiveBudgetsByUserAndCategory(eq(1L), eq(100L), eq(LocalDate.of(2026, 11, 20))))
                .thenReturn(List.of(foodBudget));

        Transaction saved = transactionService.processTransaction(1L, req, owner);

        assertNotNull(saved);
        assertEquals(new BigDecimal("4800000"), wallet.getBalance(), "Số dư ví phải giảm từ 5.000.000 xuống 4.800.000");
        assertEquals(new BigDecimal("500000"), foodBudget.getSpentAmount(), "Số tiền đã chi ngân sách phải tăng lên 500.000");
        verify(budgetRepository).save(foodBudget);
        verify(accountRepository).save(wallet);
    }

    @Test
    @DisplayName("TC_TX_02: Giao dịch THU NHẬP (INCOME) cộng đúng số dư ví và không trừ ngân sách")
    void processTransaction_Income_AddsBalanceWithoutTouchingBudget() {
        TransactionRequest req = TransactionRequest.builder()
                .accountId(10L)
                .amount(new BigDecimal("10000000"))
                .note("Nhận lương tháng 11")
                .transactionDate("2026-11-20")
                .transactionType("INCOME")
                .build();

        when(accountRepository.findById(10L)).thenReturn(Optional.of(wallet));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));

        Transaction saved = transactionService.processTransaction(1L, req, owner);

        assertNotNull(saved);
        assertEquals(new BigDecimal("15000000"), wallet.getBalance(), "Số dư ví phải tăng từ 5.000.000 lên 15.000.000");
        verifyNoInteractions(budgetRepository);
        verify(accountRepository).save(wallet);
    }

    @Test
    @DisplayName("TC_TX_03: Không cho phép tạo giao dịch trên ví thuộc sở hữu người dùng khác")
    void processTransaction_UnauthorizedAccount_ThrowsException() {
        User otherUser = User.builder().id(2L).username("hacker").build();
        Account otherWallet = Account.builder()
                .id(99L)
                .accountName("Ví người khác")
                .type("BANK")
                .balance(new BigDecimal("1000000"))
                .user(otherUser)
                .build();

        TransactionRequest req = TransactionRequest.builder()
                .accountId(99L)
                .amount(new BigDecimal("50000"))
                .transactionType("EXPENSE")
                .build();

        when(accountRepository.findById(99L)).thenReturn(Optional.of(otherWallet));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> transactionService.processTransaction(1L, req, owner));

        assertTrue(ex.getMessage().contains("không có quyền"));
        verify(transactionRepository, never()).save(any());
    }

    @Test
    @DisplayName("TC_TX_04: Danh mục không tồn tại sẽ báo lỗi và không lưu giao dịch")
    void processTransaction_InvalidCategory_ThrowsException() {
        TransactionRequest req = TransactionRequest.builder()
                .accountId(10L)
                .categoryId(999L)
                .amount(new BigDecimal("100000"))
                .transactionType("EXPENSE")
                .build();

        when(categoryRepository.findById(999L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> transactionService.processTransaction(1L, req, owner));

        assertEquals("Danh mục không tồn tại", ex.getMessage());
        verify(transactionRepository, never()).save(any());
    }

    @Test
    @DisplayName("TC_TX_05: Người dùng chưa có ví sẽ tự động tạo Ví chính và ghi nhận giao dịch")
    void processTransaction_NoExistingAccount_AutoCreatesDefaultWallet() {
        TransactionRequest req = TransactionRequest.builder()
                .amount(new BigDecimal("500000"))
                .note("Tiền thưởng dự án")
                .transactionType("INCOME")
                .build();

        when(accountRepository.findByUserId(1L)).thenReturn(Collections.emptyList());
        when(accountRepository.save(any(Account.class))).thenAnswer(inv -> inv.getArgument(0));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));

        Transaction saved = transactionService.processTransaction(1L, req, owner);

        assertNotNull(saved.getAccount());
        assertEquals("Ví chính", saved.getAccount().getAccountName());
        assertEquals(new BigDecimal("500000"), saved.getAccount().getBalance());
    }
}
