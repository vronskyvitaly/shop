import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  readonly email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  readonly name: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  readonly password: string;
}
