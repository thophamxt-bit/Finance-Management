package com.example.demo.service;

import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:no-reply@temoney.com}")
    private String fromEmail;

    /**
     * Gửi mã OTP xác thực email bất đồng bộ (mặc định: đăng ký tài khoản)
     */
    @Async
    public void sendOtpEmail(String toEmail, String otpCode) {
        sendOtpEmail(toEmail, otpCode, "REGISTER");
    }

    /**
     * Gửi mã OTP xác thực email theo mục đích (REGISTER hoặc RESET_PASSWORD)
     */
    @Async
    public void sendOtpEmail(String toEmail, String otpCode, String purpose) {
        boolean isResetPassword = "RESET_PASSWORD".equalsIgnoreCase(purpose);
        String subject = isResetPassword
                ? "[Temoney] Mã xác thực đặt lại mật khẩu của bạn: " + otpCode
                : "[Temoney] Mã xác thực đăng ký tài khoản của bạn: " + otpCode;
        String titleText = isResetPassword
                ? "Mã xác thực khôi phục mật khẩu tài khoản của bạn là:"
                : "Mã xác thực email đăng ký tài khoản của bạn là:";
        String footerText = isResetPassword
                ? "Nếu bạn không yêu cầu đặt lại mật khẩu tại Temoney, vui lòng bỏ qua email này."
                : "Nếu bạn không yêu cầu đăng ký tài khoản tại Temoney, vui lòng bỏ qua email này.";

        log.info("----------------------------------------------------------------");
        log.info(" [TEMONEY OTP SERVICE] ĐANG XỬ LÝ GỬI MÃ OTP ({})", isResetPassword ? "QUÊN MẬT KHẨU" : "ĐĂNG KÝ");
        log.info(" Email người nhận : {}", toEmail);
        log.info(" MÃ XÁC THỰC OTP   : >>> {} <<<", otpCode);
        log.info(" Thời hạn hiệu lực: 5 phút");
        log.info("----------------------------------------------------------------");

        if (mailSender == null) {
            log.warn("[EmailService] Chưa cấu hình JavaMailSender. Mã OTP được in ở console server ở trên để kiểm thử.");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "Temoney Finance");
            helper.setTo(toEmail);
            helper.setSubject(subject);

            String htmlContent = """
                <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 25px; border: 1px solid #e0e0e0; border-radius: 16px; background-color: #ffffff;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h2 style="color: #00357f; margin: 0; font-size: 26px;">Temoney Finance</h2>
                        <p style="color: #666; font-size: 14px; margin-top: 5px;">Quản lý tài chính cá nhân thông minh</p>
                    </div>
                    <div style="background-color: #f0f4fd; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
                        <p style="margin: 0 0 10px 0; color: #444; font-size: 15px;">%s</p>
                        <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #00357f; padding: 10px; background: #ffffff; border-radius: 8px; display: inline-block; border: 2px dashed #00357f;">
                            %s
                        </div>
                        <p style="margin: 15px 0 0 0; color: #888; font-size: 13px;">Mã này có hiệu lực trong vòng <b>5 phút</b>. Vui lòng không chia sẻ mã này với bất kỳ ai.</p>
                    </div>
                    <p style="color: #999; font-size: 12px; text-align: center; margin-top: 25px;">
                        %s
                    </p>
                </div>
            """.formatted(titleText, otpCode, footerText);

            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("[EmailService] Đã gửi email OTP thực tế thành công đến: {}", toEmail);

        } catch (Exception e) {
            log.warn("[EmailService] Không thể gửi qua SMTP Gmail ({}). Bạn vẫn có thể dùng mã OTP {} in ở log để tiếp tục kiểm thử!", e.getMessage(), otpCode);
        }
    }
}
