import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';
import { UserRole } from '../../entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: UserRole, example: UserRole.PATIENT })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '0612345678' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: '123 Main St', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ example: 'Cardiologie', required: false })
  @IsString()
  @IsOptional()
  specialite?: string;

  @ApiProperty({ example: 'M12345', required: false })
  @IsString()
  @IsOptional()
  numeroOrdre?: string;
}
