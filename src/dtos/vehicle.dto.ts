import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, Matches } from 'class-validator';
import { VehicleType, Size } from '@prisma/client';
import { Transform } from 'class-transformer';

export class VehicleDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @Matches(/^RA[A-G][0-9]{3}[A-Z]$/, {
    message: 'Plate number must follow the format RA[A-G][0-9]{3}[A-Z], e.g., RAH123U',
  })
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
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @Matches(/^RA[A-G][0-9]{3}[A-Z]$/, {
    message: 'Plate number must follow the format RA[A-G][0-9]{3}[A-Z], e.g., RAH123U',
  })
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