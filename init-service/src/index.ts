import express from "express";
import dotenv from "dotenv"
import cors from "cors";
dotenv.config()
import { copyS3Folder } from "./aws";
import passport from "passport"; 
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import "./passport";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import authenticateToken from "./Middleware";

const prisma = new PrismaClient();

const app = express();
app.use(express.json());
app.use(cors())



app.use(
    session({
      secret: process.env.SESSION_SECRET as string, // session secret
      resave: false,
      saveUninitialized: false,
    })
  );
  
  // initialize passport and session
  app.use(passport.initialize());
  app.use(passport.session());


  app.post("/project", authenticateToken, async (req, res) => {
    const { replId, language } = req.body;
  
    // Extract the token from the Authorization header
    const authHeader = req.headers.authorization;
  
    if (!authHeader) {
      return res.status(401).send("Authorization header is missing");
    }
  
    const token = authHeader.split(" ")[1]; // Extract the token part after "Bearer"
  
    try {
      // Decode the token to get user details
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
  
      if (!decodedToken.id) {
        return res.status(403).send("Invalid token: User ID not found");
      }
  
      // Fetch the user from the database using the decoded user ID
      const user = await prisma.user.findUnique({
        where: { id: decodedToken.id },
      });
  
      if (!user) {
        return res.status(404).send("User not found");
      }
  
      // Check if a project already exists for this user
      const existingProject = await prisma.project.findFirst({
        where: { userId: user.id },
      });
  
      let project;
      if (existingProject) {
        // Update the existing project
        project = await prisma.project.update({
          where: { id: existingProject.id },
          data: {
            replId,
            language,
          },
        });
      } else {
        // Create a new project if no project exists for this user
        project = await prisma.project.create({
          data: {
            replId,
            language,
            userId: user.id,
          },
        });
      }
  
      // Optional: Copy files after successful database update/creation
      await copyS3Folder(`base/nodejs`, `code/${replId}`);
  
      res.status(200).send({
        message: existingProject ? "Project updated successfully" : "Project created successfully",
        project,
      });
    } catch (error) {
      console.error("Error processing request:", error);
      res.status(500).send("An error occurred while processing the request");
    }
  });

  app.get("/getprojects", authenticateToken, async (req, res) => {
    try {
      // Fetch all projects from the database
      const projects = await prisma.project.findMany({
        select: {
          replId: true,
        },
      });

      res.status(200).send(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).send("An error occurred while fetching the projects");
    }
  });

const port = process.env.PORT || 3001;




app.get(
    "/auth/google",
    passport.authenticate("google", {
      scope: ["email", "profile"],
    })
  );

app.get(
    "/auth/google/callback",
    passport.authenticate("google", {
      accessType: "offline",
      scope: ["email", "profile"],
    }),
    (req, res) => {
      if (!req.user) {
        res.status(400).json({ error: "Authentication failed" });
      }
      // return user details
      res.status(200).json(req.user);
    }
  );



app.listen(port, () => {
    console.log(`listening on *:${port}`);
});
