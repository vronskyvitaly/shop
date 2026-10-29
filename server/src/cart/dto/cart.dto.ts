import { IsInt, Max, Min } from 'class-validator';

export class AddToCartDto {
  @IsInt()
  readonly productId: number;

  @IsInt()
  @Min(1)
  @Max(99)
  readonly quantity: number = 1;
}

export class SetQuantityDto {
  @IsInt()
  @Min(1)
  @Max(99)
  readonly quantity: number;
}
