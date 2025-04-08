import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

/**create user dto the req body is expecting only email and password */
export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @MinLength(8)
  password: string;
}