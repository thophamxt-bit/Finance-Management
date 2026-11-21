package com.example.demo.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class OtpServiceTest {

    @Mock
    private EmailService emailService;

    @InjectMocks
    private OtpService otpService;

    @Test
    @DisplayName("TC_OTP_01: Tạo OTP đăng ký hợp lệ 6 chữ số, xác thực thành công và không thể dùng lại lần 2")
    void generateAndVerifyRegisterOtp_SuccessAndSingleUse() {
        String email = "UserTest@Gmail.com ";
        otpService.generateAndSendOtp(email);

        ArgumentCaptor<String> otpCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendOtpEmail(eq("usertest@gmail.com"), otpCaptor.capture(), eq("REGISTER"));

        String sentOtp = otpCaptor.getValue();
        assertNotNull(sentOtp);
        assertTrue(sentOtp.matches("\\d{6}"), "Mã OTP phải gồm đúng 6 chữ số");

        assertTrue(otpService.verifyOtp("usertest@gmail.com", sentOtp), "Lần xác thực đầu tiên phải thành công");
        assertFalse(otpService.verifyOtp("usertest@gmail.com", sentOtp), "Mã OTP đã dùng phải bị xoá và không thể dùng lại");
    }

    @Test
    @DisplayName("TC_OTP_02: Tạo OTP Quên mật khẩu truyền đúng mục đích RESET_PASSWORD")
    void generateForgotPasswordOtp_UsesResetPasswordPurpose() {
        otpService.generateAndSendOtp("forgot@example.com", "RESET_PASSWORD");

        ArgumentCaptor<String> otpCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendOtpEmail(eq("forgot@example.com"), otpCaptor.capture(), eq("RESET_PASSWORD"));

        assertTrue(otpService.verifyOtp("forgot@example.com", otpCaptor.getValue()));
    }

    @Test
    @DisplayName("TC_OTP_03: Nhập sai mã OTP trả về false")
    void verifyOtp_WrongCode_ReturnsFalse() {
        otpService.generateAndSendOtp("wrong@example.com");

        ArgumentCaptor<String> otpCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendOtpEmail(eq("wrong@example.com"), otpCaptor.capture(), eq("REGISTER"));

        String wrongOtp = otpCaptor.getValue().equals("000000") ? "999999" : "000000";
        assertFalse(otpService.verifyOtp("wrong@example.com", wrongOtp));
    }

    @Test
    @DisplayName("TC_OTP_04: Nhập sai OTP quá 5 lần sẽ tự động thu hồi mã")
    void verifyOtp_ExceedMaxAttempts_RevokesOtp() {
        otpService.generateAndSendOtp("bruteforce@example.com");

        ArgumentCaptor<String> otpCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendOtpEmail(eq("bruteforce@example.com"), otpCaptor.capture(), eq("REGISTER"));
        String correctOtp = otpCaptor.getValue();
        String wrongOtp = correctOtp.equals("111111") ? "222222" : "111111";

        for (int i = 0; i < 5; i++) {
            assertFalse(otpService.verifyOtp("bruteforce@example.com", wrongOtp));
        }

        // Lần thứ 6: vượt quá MAX_ATTEMPTS = 5 nên kể cả nhập đúng cũng phải bị từ chối
        assertFalse(otpService.verifyOtp("bruteforce@example.com", correctOtp));
    }

    @Test
    @DisplayName("TC_OTP_05: Xác thực với email/OTP null hoặc chưa từng gửi OTP trả về false")
    void verifyOtp_NullOrUnknownEmail_ReturnsFalse() {
        assertFalse(otpService.verifyOtp(null, "123456"));
        assertFalse(otpService.verifyOtp("notfound@example.com", null));
        assertFalse(otpService.verifyOtp("notfound@example.com", "123456"));
    }
}
