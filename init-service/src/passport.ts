// import necessary dependencies
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

console.log("passport.ts file is running");
console.log(process.env.GOOGLE_CLIENT_ID);
console.log(process.env.GOOGLE_CLIENT_SECRET);

//initialize 
passport.use(
  new GoogleStrategy(
    {

      clientID: process.env.GOOGLE_CLIENT_ID as string, // google client id
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string, // google client secret
      // the callback url added while creating the Google auth app on the console
      callbackURL: "http://localhost:3001/auth/google/callback", 
      passReqToCallback: true,
    },

// returns the authenticated email profile
// isme likh dena prisma ka logic user save karne ke liye.
 async function (request : any, accessToken : any, refreshToken : any, profile : any, done : any) {
 // you can write some algorithms here based on your application models and all
 // an example - not related to this application
 console.log(profile);

/*
   const exist = await User.findOne({ email: profile["emails"][0].value });
   if (!exist) {
        await User.create({
        email: profile["emails"][0].value,
          fullName: profile["displayName"],
          avatar: profile["photos"][0].value,
          username: profile["name"]["givenName"],
          verified: true,
        });
      }
    const user = await User.findOne({ email: profile["emails"][0].value });
 return done(null, user);
*/
     return done(null, profile);
    }
  )
);

// function to serialize a user/profile object into the session
passport.serializeUser(function (user, done) {
  done(null, user);
});

// function to deserialize a user/profile object into the session
passport.deserializeUser(function (user, done) {
  done(null, user as string);
});