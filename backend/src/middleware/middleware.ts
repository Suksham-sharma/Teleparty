import jwt from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";
import prismaClient from "../lib/prismaClient";

export const protectRoute = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("Inside protectRoute");
    console.log("Cookies", req.cookies);

    var token = req.cookies.Authentication;
    console.log("Token", token);

    console.log("-----------------REQUEST-----------------");
    console.log(req.cookies);
    console.log("-----------------------------------------");
    if (!token) token = req.headers.authorization?.split(" ")[1];
    console.log("Token", token);

    if (!token) {
      res.status(409).json({
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

    console.log("Decoded", decoded);

    const findUser = await prismaClient.user.findUnique({
      where: {
        id: decoded.id,
      },
    });

    if (!findUser) {
      throw new Error("User not found");
    }

    req.userId = findUser.id;
    console.log("User found", findUser);

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
