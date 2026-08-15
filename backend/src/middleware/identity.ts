import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import prismaClient from "../lib/prismaClient";
import { JWT_SECRET } from "../lib/config";

/**
 * Resolves *who is asking* without ever rejecting the request.
 *
 * Unlike `protectRoute`, this is the entry point for the watch-party flow: a
 * friend who clicks /r/WOLF-42 has no account and must still be able to join,
 * chat and appear in the member list. Signed-in users are recognised by the
 * `Authentication` JWT; everyone else gets a persistent `guestId` cookie minted
 * on first contact.
 *
 * Routes that genuinely require an account should still use `protectRoute`.
 */
export const resolveIdentity = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  req.identity = { kind: "guest", guestId: "" };

  // 1. Signed-in user, if the token is present and valid.
  let token = req.cookies?.Authentication;
  if (!token) token = req.headers.authorization?.split(" ")[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      const user = await prismaClient.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, username: true },
      });

      if (user) {
        req.userId = user.id;
        req.identity = {
          kind: "user",
          userId: user.id,
          displayName: user.username,
        };
        return next();
      }
    } catch {
      // An expired or malformed token demotes the caller to a guest rather
      // than failing the request — they can still join a room.
    }
  }

  // 2. Guest. Reuse the cookie if we've seen them, otherwise mint one.
  let guestId: string | undefined = req.cookies?.guestId;

  if (!guestId) {
    guestId = randomUUID();
    res.cookie("guestId", guestId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });
  }

  req.identity = { kind: "guest", guestId };
  next();
};
