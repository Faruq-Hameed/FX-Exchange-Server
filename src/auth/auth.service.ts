import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThan, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { OTP } from './entities/otp.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
    @InjectRepository(OTP)
    private otpRepository: Repository<OTP>,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create(registerDto);
    
    // Generate OTP
    const otp = this.generateOTP();
    
    // Save OTP to database
    const otpRecord = this.otpRepository.create({
      userId: user.id,
      code: otp,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes expiration
    });
    await this.otpRepository.save(otpRecord);
    
    // Send verification email
    await this.mailService.sendVerificationEmail(user.email, otp);
    
    return { message: 'User registered successfully. Please check your email for verification code.' };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    if (!user.isVerified) {
      throw new UnauthorizedException('Please verify your email before logging in');
    }
    
    const payload = { sub: user.id, email: user.email };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  async verifyOtp(userId: string, verifyOtpDto: VerifyOtpDto) {
    const { code } = verifyOtpDto;
    
    const otp = await this.otpRepository.({
      where: {
        userId,
        code,
      },
    });
    
    if (!otp) {
      throw new BadRequestException('Invalid or expired OTP');
    }
    
    // Mark OTP as used
    otp.setExpiryDate= new Date();
    await this.otpRepository.save(otp);
    
    // Verify user
    await this.usersService.verifyUser(userId);
    
    return { message: 'Email verified successfully' };
  }

  async resendVerificationCode(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    
    if (user.isVerified) {
      throw new BadRequestException('User is already verified');
    }
    
    // Generate new OTP
    const otp = this.generateOTP();
    
    // Save OTP to database
    const otpRecord = this.otpRepository.create({
      userId: user.id,
      code: otp,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes expiration
    });
    await this.otpRepository.save(otpRecord);
    
    // Send verification email
    await this.mailService.sendVerificationEmail(user.email, otp);
    
    return { message: 'Verification code sent to your email' };
  }

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Cron job to delete expired OTPs
  @Cron(CronExpression.EVERY_5_MINUTES)  // Run every 5 minutes
  private async deleteExpiredOTPs() {
    const currentDate = new Date();
    await this.otpRepository.delete({
      expiresAt: LessThan(currentDate),  // Delete OTPs that have expired
    });
  }
}
