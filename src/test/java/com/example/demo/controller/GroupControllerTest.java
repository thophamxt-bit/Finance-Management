package com.example.demo.controller;

import com.example.demo.Repository.*;
import com.example.demo.dto.CommentRequest;
import com.example.demo.dto.GroupTransactionRequest;
import com.example.demo.model.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.BindingResult;

import java.math.BigDecimal;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GroupControllerTest {

    @Mock private AppGroupRepository appGroupRepository;
    @Mock private GroupMemberRepository groupMemberRepository;
    @Mock private GroupTransactionRepository groupTransactionRepository;
    @Mock private GroupTransactionSplitRepository groupTransactionSplitRepository;
    @Mock private TransactionCommentRepository transactionCommentRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks
    private GroupController groupController;

    private User member1;
    private User member2;
    private AppGroup group;
    private GroupTransaction groupTx;
    private Principal principal;

    @BeforeEach
    void setUp() {
        member1 = User.builder().id(1L).username("alice").fullName("Alice Nguyen").build();
        member2 = User.builder().id(2L).username("bob").fullName("Bob Tran").build();
        group = AppGroup.builder().id(10L).name("Trip Da Lat").createdBy(member1).build();
        groupTx = GroupTransaction.builder()
                .id(100L)
                .group(group)
                .payer(member1)
                .amount(new BigDecimal("400000"))
                .description("Ăn lẩu gà")
                .transactionDate(LocalDateTime.of(2026, 11, 20, 12, 0))
                .splitType("EQUAL")
                .build();
        principal = () -> "alice";
    }

    @Test
    @DisplayName("TC_GRP_01: Thành viên chỉnh sửa khoản chi tiêu nhóm và tự động chia đều lại tiền")
    @SuppressWarnings("unchecked")
    void updateGroupTransaction_MemberCanEditAndRecalculateSplits() {
        GroupTransactionRequest req = GroupTransactionRequest.builder()
                .groupId(10L)
                .payerId(1L)
                .amount(new BigDecimal("600000"))
                .description("Ăn lẩu gà + nước uống")
                .transactionDate("2026-11-21")
                .splitType("EQUAL")
                .build();
        BindingResult bindingResult = new BeanPropertyBindingResult(req, "request");

        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(member1));
        when(groupMemberRepository.existsById(new GroupMemberId(10L, 1L))).thenReturn(true);
        when(groupTransactionRepository.findById(100L)).thenReturn(Optional.of(groupTx));
        when(userRepository.findById(1L)).thenReturn(Optional.of(member1));
        when(groupTransactionRepository.save(any(GroupTransaction.class))).thenAnswer(inv -> inv.getArgument(0));
        when(groupMemberRepository.findByGroupId(10L)).thenReturn(List.of(
                GroupMember.builder().group(group).user(member1).role("ADMIN").build(),
                GroupMember.builder().group(group).user(member2).role("MEMBER").build()
        ));

        ResponseEntity<?> res = groupController.updateGroupTransaction(10L, 100L, req, bindingResult, principal);

        assertEquals(HttpStatus.OK, res.getStatusCode());
        assertEquals(new BigDecimal("600000"), groupTx.getAmount());
        assertEquals("Ăn lẩu gà + nước uống", groupTx.getDescription());

        verify(groupTransactionSplitRepository).deleteByGroupTransactionId(100L);
        ArgumentCaptor<List<GroupTransactionSplit>> splitsCaptor = ArgumentCaptor.forClass(List.class);
        verify(groupTransactionSplitRepository).saveAll(splitsCaptor.capture());

        List<GroupTransactionSplit> savedSplits = splitsCaptor.getValue();
        assertEquals(2, savedSplits.size());
        assertEquals(new BigDecimal("300000"), savedSplits.get(0).getOwedAmount());
        assertEquals(new BigDecimal("300000"), savedSplits.get(1).getOwedAmount());
    }

    @Test
    @DisplayName("TC_GRP_02: Người không thuộc nhóm không được phép chỉnh sửa khoản chi (403 Forbidden)")
    void updateGroupTransaction_NonMember_ReturnsForbidden() {
        GroupTransactionRequest req = GroupTransactionRequest.builder()
                .groupId(10L)
                .amount(new BigDecimal("500000"))
                .description("Sửa trái phép")
                .build();
        BindingResult bindingResult = new BeanPropertyBindingResult(req, "request");

        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(member1));
        when(groupMemberRepository.existsById(new GroupMemberId(10L, 1L))).thenReturn(false);

        ResponseEntity<?> res = groupController.updateGroupTransaction(10L, 100L, req, bindingResult, principal);

        assertEquals(HttpStatus.FORBIDDEN, res.getStatusCode());
        verify(groupTransactionRepository, never()).save(any());
    }

    @Test
    @DisplayName("TC_GRP_03: Thành viên xoá khoản chi tiêu nhóm sẽ dọn sạch bình luận, chia nợ và giao dịch")
    void deleteGroupTransaction_MemberCanDeleteCascade() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(member1));
        when(groupMemberRepository.existsById(new GroupMemberId(10L, 1L))).thenReturn(true);
        when(groupTransactionRepository.findById(100L)).thenReturn(Optional.of(groupTx));

        ResponseEntity<?> res = groupController.deleteGroupTransaction(10L, 100L, principal);

        assertEquals(HttpStatus.OK, res.getStatusCode());
        verify(transactionCommentRepository).deleteByGroupTransactionId(100L);
        verify(groupTransactionSplitRepository).deleteByGroupTransactionId(100L);
        verify(groupTransactionRepository).delete(groupTx);
    }

    @Test
    @DisplayName("TC_GRP_04: Thành viên thêm bình luận góp ý vào khoản chi tiêu nhóm thành công")
    void addTransactionComment_MemberCanComment() {
        CommentRequest req = CommentRequest.builder()
                .groupTransactionId(100L)
                .content("Chi phí này hơi cao, nhóm cân nhắc nhé!")
                .build();
        BindingResult bindingResult = new BeanPropertyBindingResult(req, "request");

        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(member1));
        when(groupTransactionRepository.findById(100L)).thenReturn(Optional.of(groupTx));
        when(groupMemberRepository.existsById(new GroupMemberId(10L, 1L))).thenReturn(true);
        when(transactionCommentRepository.save(any(TransactionComment.class))).thenAnswer(inv -> {
            TransactionComment c = inv.getArgument(0);
            c.setId(555L);
            c.setCreatedAt(LocalDateTime.now());
            return c;
        });

        ResponseEntity<?> res = groupController.addTransactionComment(100L, req, bindingResult, principal);

        assertEquals(HttpStatus.OK, res.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) res.getBody();
        assertNotNull(body);
        assertEquals(555L, body.get("commentId"));
        assertEquals("Alice Nguyen", body.get("userName"));
    }
}
