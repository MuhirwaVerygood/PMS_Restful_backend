import { Router } from 'express';
import { validationMiddleware } from '../middlewares/validator.middleware';
import { SlotRequestDto, UpdateSlotRequestDto, ApproveSlotRequestDto, RejectSlotRequestDto } from '../dtos/parking.dto';
import { checkLoggedIn, checkAdmin } from '../middlewares/auth.middleware';
import { SlotRequestController } from 'controllers/slotRequest.controllers';
import { asyncHandler } from 'middlewares/asyncHandler.middleware';
const router = Router();

router.post('/', checkLoggedIn, validationMiddleware(SlotRequestDto), asyncHandler(SlotRequestController.createSlotRequest));
router.put('/:id', checkLoggedIn, validationMiddleware(UpdateSlotRequestDto), asyncHandler(SlotRequestController.updateSlotRequest));
router.delete('/:id', checkLoggedIn, asyncHandler(SlotRequestController.deleteSlotRequest));
router.put('/:id/approve', checkLoggedIn, checkAdmin, validationMiddleware(ApproveSlotRequestDto), asyncHandler(SlotRequestController.approveSlotRequest));
router.put('/:id/reject', checkLoggedIn, checkAdmin, validationMiddleware(RejectSlotRequestDto), asyncHandler(SlotRequestController.rejectSlotRequest));
router.get('/', checkLoggedIn, asyncHandler(SlotRequestController.getSlotRequests));
router.get("/:slotId/reason" , checkLoggedIn , asyncHandler(SlotRequestController.getRejectionReasonBySlotId))
export default router;
