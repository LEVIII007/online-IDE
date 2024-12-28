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
// import authenticateToken from "./Middleware";

// const prisma = new PrismaClient();

const app = express();
app.use(express.json());
app.use(cors())



// app.use(
//     session({
//       secret: process.env.SESSION_SECRET as string, // session secret
//       resave: false,
//       saveUninitialized: false,
//     })
//   );
  
  // initialize passport and session
  // app.use(passport.initialize());
  // app.use(passport.session());


  app.post("/project", async (req, res) => {
    const { replId, language } = req.body;
  
    try {
      await copyS3Folder(`base/nodejs`, `code/${replId}`);
  
      res.status(200).send({
        message: "Project created successfully",
        // project,
      });
    } catch (error) {
      console.error("Error processing request:", error);
      res.status(500).send("An error occurred while processing the request");
    }
  });

  // app.get("/getprojects", authenticateToken, async (req, res) => {
  //   try {
  //     // Fetch all projects from the database
  //     const projects = await prisma.project.findMany({
  //       select: {
  //         replId: true,
  //       },
  //     });

  //     res.status(200).send(projects);
  //   } catch (error) {
  //     console.error("Error fetching projects:", error);
  //     res.status(500).send("An error occurred while fetching the projects");
  //   }
  // });

const port = process.env.PORT || 3001;




// app.get(
//     "/auth/google",
//     passport.authenticate("google", {
//       scope: ["email", "profile"],
//     })
//   );

// app.get(
//     "/auth/google/callback",
//     passport.authenticate("google", {
//       accessType: "offline",
//       scope: ["email", "profile"],
//     }),
//     (req, res) => {
//       if (!req.user) {
//         res.status(400).json({ error: "Authentication failed" });
//       }
//       // return user details
//       res.status(200).json(req.user);
//     }
//   );



app.listen(port, () => {
    console.log(`listening on *:${port}`);
});
