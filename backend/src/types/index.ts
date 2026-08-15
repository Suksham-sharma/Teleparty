import { Request } from "express";

/**
 * Who is making the request. Guests are first-class — a friend who opens
 * /r/WOLF-42 participates fully without an account.
 */
export type Identity =
  | { kind: "user"; userId: string; displayName: string }
  | { kind: "guest"; guestId: string };

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      identity?: Identity;
    }
  }
}
