import { IsOptional, IsString } from 'class-validator';

export class BalanceBodyDto {
  @IsString()
  bank!: string;

  @IsOptional()
  @IsString()
  account?: string;

  @IsOptional()
  @IsString()
  user?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  cedula?: string;

  @IsOptional()
  @IsString()
  ci?: string;

  @IsOptional()
  @IsString()
  card?: string;
}
