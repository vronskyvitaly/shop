import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  readonly name: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  readonly currentPassword: string;

  // Те же правила, что при регистрации (CreateUserDto)
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  readonly newPassword: string;
}
