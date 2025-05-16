import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { Request, Response, NextFunction } from 'express';
import ServerResponse from 'utils/ServerResponse';

export function validationMiddleware<T>(type: any) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const instance = plainToInstance(type, req.body);
    const errors: ValidationError[] = await validate(instance);

    console.log('Validation instance:', instance);
    console.log('Validation errors:', errors);

    if (errors.length > 0) {
      const message = errors.map((error: ValidationError) => Object.values(error.constraints || {})).join(', ');
      ServerResponse.badRequest(res, message);
      return;
    }

    req.body = instance;
    next();
  };
}