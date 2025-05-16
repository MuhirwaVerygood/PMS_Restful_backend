import { Role } from '@prisma/client';
import { IsEmail, IsEnum, isEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  name!: string; // Add ! to assert definite assignment

  @IsEmail()
  email!: string; // Add !

  @IsString()
  @MinLength(6)
  password!: string; // Add !

  @IsEnum(Role)
  role!: Role
}

export class LoginDto {
  @IsEmail()
  email!: string; // Add !

  @IsString()
  @IsNotEmpty()
  password!: string; // Add !
}

export class UpdateProfileDto {
  @IsString()
  @IsNotEmpty()
  name?: string; // Already optional, no change needed

  @IsEmail()
  email?: string; // Already optional
}

export class UpdatePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string; // Add !

  @IsString()
  @MinLength(6)
  newPassword!: string; // Add !
}