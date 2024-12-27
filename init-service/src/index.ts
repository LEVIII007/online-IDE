import express from "express";
import dotenv from "dotenv"
import cors from "cors";
import {ExpressAuth} from "@auth/express";
import GoogleProvider from "@auth/core/providers/google";
import jwt from "jsonwebtoken";
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./prisma";
dotenv.config()
import { copyS3Folder } from "./aws";
const app = express();
app.use(express.json());
app.use(cors())
app.set("trust proxy", true)
const authHandler = ExpressAuth({
    providers: [
        GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      })
    ],
    adapter: PrismaAdapter(prisma),
    secret: process.env.AUTH_SECRET!,
    callbacks: {
      async signIn({ user }: { user: any }) {
        // Here you can add any logic to decide whether to allow sign-in
        console.log("User signed in:", user);
              // Check if user already exists in the database
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      });

      // If not, create a new user
      if (!existingUser) {
        await prisma.user.create({
          data: {
            email: user.email,
            name: user.name || null,
          },
        });
      }

      return true; // Allow sign-in
      },
      async jwt({ token, user }: { token: any, user: any }) {
        if (user) {
          token.id = user.id;
        }
        return token;
      },
      async session({ session, token }: { session: any, token: any }) {
        session.user.id = token.id as string;
        return session;
      },
    },
  });

// Use Auth.js for authentication
 app.use("/auth", authHandler);
app.post("/project", async (req, res) => {
    // Hit a database to ensure this slug isn't taken already
    const { replId, language } = req.body;
    console.log(req.body);

    if (!replId) {
        res.status(400).send("Bad request");
        return;
    }
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).send("Unauthorized: Missing token");
      return;
    }
    const token = authHeader.split(" ")[1];
    try {
      jwt.verify(token, process.env.JWT_SECRET!);
    } catch (err) {
      res.status(403).send("Forbidden: Invalid token");
      return;
    }

    await copyS3Folder(`base/nodejs`, `code/${replId}`);

    res.send("Project created");
});

const port = process.env.PORT || 3001;

app.listen(port, () => {
    console.log(`listening on *:${port}`);
});
