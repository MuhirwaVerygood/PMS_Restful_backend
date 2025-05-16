import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { VehicleType, Size } from '@prisma/client';

export class VehicleDto {
  @IsString()
  @IsNotEmpty()
  plateNumber!: string;

  @IsEnum(VehicleType)
  vehicleType!: VehicleType;

  @IsEnum(Size)
  size!: Size;

  @IsObject()
  @IsOptional()
  attributes?: Record<string, any>;
}

export class UpdateVehicleDto {
  @IsString()
  @IsOptional()
  plateNumber?: string;

  @IsEnum(VehicleType)
  @IsOptional()
  vehicleType?: VehicleType;

  @IsEnum(Size)
  @IsOptional()
  size?: Size;

  @IsObject()
  @IsOptional()
  attributes?: Record<string, any>;
}