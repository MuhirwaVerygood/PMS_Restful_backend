import { Response } from 'express';

export default class ServerResponse {
  static success(res: Response, data: any, message: string = 'Success', status: number = 200) {
    return res.status(status).json({ success: true, message, data });
  }

  static created(res: Response, data: any, message: string = 'Resource created') {
    return res.status(201).json({ success: true, message, data });
  }

  static error(res: Response, message: string = 'Internal server error', status: number = 500) {
    return res.status(status).json({ success: false, message });
  }

  static badRequest(res: Response, message: string = 'Bad request') {
    return res.status(400).json({ success: false, message });
  }
  static conflict(res: Response, message: string = 'Conflict') {
    return res.status(409).json({ success: false, message });
  }

  static unauthorized(res: Response, message: string = 'Unauthorized') {
    return res.status(401).json({ success: false, message });
  }

  static forbidden(res: Response, message: string = 'Forbidden') {
    return res.status(403).json({ success: false, message });
  }

  static notFound(res: Response, message: string = 'Resource not found') {
    return res.status(404).json({ success: false, message });
  }
}