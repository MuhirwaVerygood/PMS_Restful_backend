import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { VehicleType, Size, Location } from '@prisma/client';

export class BulkSlotDto {
  @IsInt()
  @IsNotEmpty()
  count!: number;

  @IsString()
  @IsNotEmpty()
  prefix!: string;

  @IsEnum(VehicleType)
  vehicleType!: VehicleType;

  @IsEnum(Size)
  size!: Size;

  @IsEnum(Location)
  location!: Location;
}

export class SlotDto {
  @IsString()
  @IsNotEmpty()
  slotNumber!: string;

  @IsEnum(VehicleType)
  vehicleType!: VehicleType;

  @IsEnum(Size)
  size!: Size;

  @IsEnum(Location)
  location!: Location;
}

export class UpdateSlotDto {
  @IsString()
  @IsOptional()
  slotNumber?: string;

  @IsEnum(VehicleType)
  @IsOptional()
  vehicleType?: VehicleType;

  @IsEnum(Size)
  @IsOptional()
  size?: Size;

  @IsEnum(Location)
  @IsOptional()
  location?: Location;
}

export class SlotRequestDto {
  @IsString()
  @IsNotEmpty()
  vehicleId!: string;
}

export class UpdateSlotRequestDto {
  @IsString()
  @IsOptional()
  vehicleId?: string;
}

export class ApproveSlotRequestDto {
  @IsString()
  @IsOptional()
  slotId?: string;
}

export class RejectSlotRequestDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
