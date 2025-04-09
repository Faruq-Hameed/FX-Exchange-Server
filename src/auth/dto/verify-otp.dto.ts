import { IsEmail, IsNotEmpty, Length } from 'class-validator';
import { LoginDto } from './login.dto';

export class VerifyOtpDto  {

    @IsEmail()
    @IsNotEmpty()
    email: string;
    
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}