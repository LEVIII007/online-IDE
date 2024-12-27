import express from "express";
import dotenv from "dotenv"
import cors from "cors";
dotenv.config()
import { copyS3Folder } from "./aws";
import passport from "passport"; 
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import "./passport";

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



app.post("/project", async (req, res) => {
    // Hit a database to ensure this slug isn't taken already
    const { replId, language } = req.body;
    console.log(req.body);

    if (!replId) {
        res.status(400).send("Bad request");
        return;
    }

    await copyS3Folder(`base/nodejs`, `code/${replId}`);

    res.send("Project created");
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
