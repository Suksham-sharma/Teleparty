import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { signInData, signUpData } from "../schemas";
import prismaClient from "../lib/prismaClient";

export const JWT_SECRET = "secret";

export const authRouter = Router();

authRouter.post("/signup", async (req: Request, res: Response) => {
  try {
    const signupPayload = signUpData.safeParse(req.body);
    if (!signupPayload.success) {
      throw new Error("Invalid format , not Valid");
    }

    const { username, password, email } = signupPayload.data;
    const findUser = await prismaClient.user.findFirst({
      where: {
        OR: [{ email: email }],
      },
    });

    if (findUser) {
      res.status(409).json({ error: "User already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 8);
    const user = await prismaClient.user.create({
      data: {
        username,
        password: hashedPassword,
        email,
      },
    });

    console.log("User created", user);
    console.log("User created", user.id);
    console.log("User created", user.username);

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
      },
      JWT_SECRET
    );
    console.log("Token", token);

    res.cookie("Authentication", token, {
      httpOnly: true,
      sameSite: "lax",
    });

    res.status(201).json({
      userId: user?.id,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
    return;
  }
});

authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const signInPayload = signInData.safeParse(req.body);

    if (!signInPayload.success) {
      throw new Error("Invalid format , not Valid");
    }
    const findUser = await prismaClient.user.findUnique({
      where: {
        email: signInPayload.data.email,
      },
    });

    if (!findUser) {
      throw new Error("User doesn't exist");
    }

    const isAuthenticated = bcrypt.compare(
      signInPayload.data.password,
      findUser?.password
    );

    if (!isAuthenticated) {
      throw new Error("Invalid Password");
    }

    const token = jwt.sign(
      {
        id: findUser.id,
        username: findUser.username,
      },
      JWT_SECRET
    );

    res.cookie("Authentication", token, {
      httpOnly: true,
      sameSite: "lax",
    });

    res.status(200).json({
      access_token: token,
      user: {
        id: findUser.id,
        username: findUser.username,
        email: findUser.email,
      },
    });
  } catch (error: any) {
    res.status(403).json({ error: error.message });
    return;
  }
});
