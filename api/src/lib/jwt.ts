import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export type TokenType = 'user' | 'staff' | 'super';
export interface TokenPayload {
  typ: TokenType;
  sub: number;
  /** selected business (admin users and staff) */
  bid?: number;
}

export const signToken = (payload: TokenPayload) =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as SignOptions);

export const verifyToken = (token: string): TokenPayload => jwt.verify(token, env.JWT_SECRET) as unknown as TokenPayload;
