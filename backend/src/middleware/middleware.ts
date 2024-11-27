import jwt from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";
import prismaClient from "../lib/prismaClient";

export const protectRoute = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // const token = req.cookies.Authentication;
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Not authorized - No Token",
      });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret") as {
      id: string;
    };

    if (!decoded) {
      res.status(401).json({
        success: false,
        message: "Not autorized - invalid token",
      });
      return;
    }

    const findUser = await prismaClient.user.findUnique({
      where: {
        id: decoded.id,
      },
    });

    if (!findUser) {
      throw new Error("User not found");
    }

    req.userId = findUser.id;

    next();
  } catch (error) {
    console.log("Error while getting user details");
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: "Not authorized - Invalid token",
      });
      return;
    } else {
      res.status(500).json({
        success: false,
        message: "Error in server",
      });
      return;
    }
  }
};
