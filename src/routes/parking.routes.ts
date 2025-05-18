import { Router } from 'express';
import { validationMiddleware } from '../middlewares/validator.middleware';
import { BulkSlotDto, CreateSlotDto, SlotDto, UpdateSlotDto } from '../dtos/parking.dto';
import { checkLoggedIn, checkAdmin } from '../middlewares/auth.middleware';
import { ParkingSlotController } from 'controllers/parking.controllers';
import { asyncHandler } from 'middlewares/asyncHandler.middleware';
const router = Router();

router.post('/bulk', checkLoggedIn, checkAdmin, validationMiddleware(BulkSlotDto), asyncHandler(ParkingSlotController.createSlots));
router.post('/', checkLoggedIn, checkAdmin, validationMiddleware(CreateSlotDto), asyncHandler(ParkingSlotController.createSlot));
router.put('/:id', checkLoggedIn, checkAdmin, validationMiddleware(UpdateSlotDto), asyncHandler(ParkingSlotController.updateSlot));
router.delete('/:id', checkLoggedIn, checkAdmin, asyncHandler( ParkingSlotController.deleteSlot));
router.get('/', checkLoggedIn, asyncHandler(ParkingSlotController.getSlots));

export default router;
