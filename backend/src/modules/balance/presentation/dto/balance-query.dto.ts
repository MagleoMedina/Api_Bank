import { IsOptional, IsString } from 'class-validator';

export class BalanceQueryDto {
  @IsOptional()
  @IsString()
  bank?: string;

  @IsOptional()
  @IsString()
  account?: string;
}