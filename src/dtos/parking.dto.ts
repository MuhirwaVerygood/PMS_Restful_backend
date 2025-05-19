import { IsDateString, IsEnum, IsNotEmpty, IsNumberString, IsOptional, IsString, IsUUID, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments, registerDecorator, IsNumber } from 'class-validator';
import { Location, Size, SlotStatus, VehicleType } from '@prisma/client';

@ValidatorConstraint({ name: 'DateRangeValidator', async: false })
class DateRangeValidator implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments): boolean {
    const { startDate, endDate } = args.object as { startDate?: string; endDate?: string };
    const now = new Date();
    
    if (value && args.property === 'startDate') {
      const start = new Date(value);
      return start >= now;
    }
    
    if (value && args.property === 'endDate' && startDate) {
      const end = new Date(value);
      const start = new Date(startDate);
      return end >= start;
    }
    
    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    if (args.property === 'startDate') {
      return 'startDate must not be earlier than the current date and time';
    }
    return 'endDate must not be earlier than startDate';
  }
}

function ValidateDateRange() {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'ValidateDateRange',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: { message: `Invalid ${propertyName}` },
      validator: DateRangeValidator,
    });
  };
}

export class GetSlotRequestsQueryDto {
  @IsNumberString()
  @IsOptional()
  page?: string = '1';

  @IsNumberString()
  @IsOptional()
  limit?: string = '10';

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  status?: string;
}



// ... (keep all existing imports and code)

// Add this new DTO for creating a single slot (note: SlotDto already exists in your code)
export class CreateSlotDto {
  @IsString()
  @IsNotEmpty()
  slotNumber!: string;

  @IsEnum(VehicleType)
  @IsNotEmpty()
  vehicleType!: VehicleType;

  @IsEnum(Size)
  @IsNotEmpty()
  size!: Size;

  @IsEnum(Location)
  @IsNotEmpty()
  location!: Location;

  @IsEnum(SlotStatus)
  @IsOptional()
  status?: SlotStatus = SlotStatus.AVAILABLE; // Default to AVAILABLE
}

// Keep existing BulkSlotDto (already present in your code, included here for clarity)
export class BulkSlotDto {
  @IsNumber()
  @IsNotEmpty()
  count!: number;

  @IsString()
  @IsNotEmpty()
  prefix!: string;

  @IsEnum(VehicleType)
  @IsNotEmpty()
  vehicleType!: VehicleType;

  @IsEnum(Size)
  @IsNotEmpty()
  size!: Size;

  @IsEnum(Location)
  @IsNotEmpty()
  location!: Location;
}

// types/parking.ts
export interface ParkingSlot {
  id: string;
  slotNumber: string;
  vehicleType: string;
  size: string;
  location: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: {
    userId: string;
    vehicleId: string;
    vehiclePlate: string;
  };
}


export class SlotDto {
  @IsString()
  @IsNotEmpty()
  slotNumber!: string;

  @IsEnum(VehicleType)
  @IsNotEmpty()
  vehicleType!: VehicleType;

  @IsEnum(Size)
  @IsNotEmpty()
  size!: Size;

  @IsEnum(Location)
  @IsNotEmpty()
  location!: Location;

  @IsEnum(SlotStatus)
  @IsNotEmpty()
  status!: SlotStatus;
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

  @IsEnum(SlotStatus)
  @IsOptional()
  status?: SlotStatus;
}

export class GetSlotsQueryDto {
  @IsString()
  @IsOptional()
  page?: string = '1';

  @IsString()
  @IsOptional()
  limit?: string = '10';

  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(SlotStatus)
  @IsOptional()
  status?: SlotStatus;
}


export class SlotRequestDto {
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @IsUUID()
  @IsNotEmpty()
  vehicleId!: string;

  @IsEnum(Location)
  @IsOptional()
  preferredLocation?: Location;

  @IsDateString()
  @IsOptional()
  @ValidateDateRange()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  @ValidateDateRange()
  endDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateSlotRequestDto {
  @IsUUID()
  @IsOptional()
  vehicleId?: string;

  @IsEnum(Location)
  @IsOptional()
  preferredLocation?: Location;

  @IsDateString()
  @IsOptional()
  @ValidateDateRange()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  @ValidateDateRange()
  endDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class ApproveSlotRequestDto {
  @IsUUID()
  @IsNotEmpty()
  slotId!: string;
}

export class RejectSlotRequestDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

