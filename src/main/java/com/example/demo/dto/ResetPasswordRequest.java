package com.example.demo.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResetPasswordRequest {

    @NotBlank(message = "Email không được để trống!")
    @Email(message = "Email không đúng định dạng!")
    private String email;

    @NotBlank(message = "Mã xác thực OTP không được để trống!")
    private String otp;

    @NotBlank(message = "Mật khẩu mới không được để trống!")
    @Size(min = 6, max = 30, message = "Mật khẩu mới phải từ 6 đến 30 ký tự!")
    private String newPassword;

    private String confirmPassword;
}

