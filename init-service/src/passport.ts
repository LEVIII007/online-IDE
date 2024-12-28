import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { prisma } from "./prisma";
import jwt from "jsonwebtoken";



passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: "http://localhost:3001/auth/google/callback",
      passReqToCallback: true,
    },
    async (request: any, accessToken: any, refreshToken: any, profile: any, done: any) => {
      try {
        console.log("Access Token:", accessToken);
        console.log("Refresh Token:", refreshToken);
        console.log("Profile:", profile);
        done(null, profile);
        // Extract user data from the profile
        const email = profile.emails[0].value;

        // Check if the user exists in the database
        await prisma.$connect();
        let user;
        try{
        user = await prisma.user.findUnique({ where: { email : email } });
        }
        catch(error){
          console.log("Error in finding user:", error);
        }

        // If the user does not exist, create a new one
        if (!user) {
          user = await prisma.user.create({
            data: {
              email:profile.emails[0].value,
            },
          });
        }
        // Generate a token for the authenticated user
        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET as string, {
          expiresIn: '1h', // Token expiration time
        });
        console.log("Token:", token);
        // Attach the token to the user object
        request.headers.authorization = `Bearer ${token}`;

        // Pass the user object to the session
        done(null, user);
      } catch (error) {
        console.error("Error in Google authentication:", error);
        done(error, null);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id); // Serialize user ID into session
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});
