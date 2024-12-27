// // import necessary dependencies
// import passport from "passport";
// import { Strategy as GoogleStrategy } from "passport-google-oauth20";

// console.log("passport.ts file is running");
// console.log(process.env.GOOGLE_CLIENT_ID);
// console.log(process.env.GOOGLE_CLIENT_SECRET);

// //initialize 
// passport.use(
//   new GoogleStrategy(
//     {

//       clientID: process.env.GOOGLE_CLIENT_ID as string, // google client id
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET as string, // google client secret
//       // the callback url added while creating the Google auth app on the console
//       callbackURL: "http://localhost:3001/auth/google/callback", 
//       passReqToCallback: true,
//     },

// // returns the authenticated email profile
// // isme likh dena prisma ka logic user save karne ke liye.
//  async function (request : any, accessToken : any, refreshToken : any, profile : any, done : any) {
//  // you can write some algorithms here based on your application models and all
//  // an example - not related to this application
//  console.log(profile);

// /*
//    const exist = await User.findOne({ email: profile["emails"][0].value });
//    if (!exist) {
//         await User.create({
//         email: profile["emails"][0].value,
//           fullName: profile["displayName"],
//           avatar: profile["photos"][0].value,
//           username: profile["name"]["givenName"],
//           verified: true,
//         });
//       }
//     const user = await User.findOne({ email: profile["emails"][0].value });
//  return done(null, user);
// */
//      return done(null, profile);
//     }
//   )
// );

// // function to serialize a user/profile object into the session
// passport.serializeUser(function (user, done) {
//   done(null, user);
// });

// // function to deserialize a user/profile object into the session
// passport.deserializeUser(function (user, done) {
//   done(null, user as string);
// });
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

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
        let user = await prisma.user.findUnique({ where: { email } });

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
