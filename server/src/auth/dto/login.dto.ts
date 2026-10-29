import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  readonly email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(72)
  readonly password: string;
}
