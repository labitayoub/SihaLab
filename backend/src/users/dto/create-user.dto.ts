import { IsEmail, IsEnum, IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { UserRole } from '../../entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  password: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  specialite?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  numeroOrdre?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  ville?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  pays?: string;
}
