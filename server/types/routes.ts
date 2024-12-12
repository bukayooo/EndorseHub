import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user: Express.User;
  isAuthenticated(): this is AuthenticatedRequest;
}

export function assertAuthenticated(req: Request): asserts req is AuthenticatedRequest {
  if (!req.isAuthenticated() || !req.user) {
    throw new Error('User not authenticated');
  }
}

export type AuthenticatedResponse = Response;
export type AuthenticatedNextFunction = NextFunction;

export type RouteHandler<P = any, ResBody = any, ReqBody = any> = (
  req: Request<P, ResBody, ReqBody>,
  res: Response<ResBody>,
  next?: NextFunction
) => Promise<void | Response<ResBody> | undefined> | void | Response<ResBody> | undefined;
