import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';

interface ValidateRequestOptions {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}

export function validateRequest(options: ValidateRequestOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (options.body) {
        req.body = await options.body.parseAsync(req.body);
      }
      if (options.query) {
        req.query = await options.query.parseAsync(req.query);
      }
      if (options.params) {
        req.params = await options.params.parseAsync(req.params);
      }
      next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error,
      });
    }
  };
} 