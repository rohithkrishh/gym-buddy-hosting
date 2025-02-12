const passport=require("passport")
const GoogleStrategy=require("passport-google-oauth20").Strategy
const User=require("../models/userSchema")
const env=require("dotenv").config()


passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
               
                let user = await User.findOne({ googleId: profile.id });
                if (user) {
                
                    return done(null, user);
                }

                const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
                if (!email) {
                    
                    return done(new Error("Email not found"), null);
                }

                user = new User({
                    name: profile.displayName,
                    email: email,
                    googleId: profile.id,
                  
                });
                await user.save();
                
                return done(null, user);
            } catch (error) {
                console.error("Error during Google Strategy authentication:", error);
                return done(error, null);
            }
        }
    )
);


passport.serializeUser((user, done) => {
    if (!user || !user.id) {
        return done(new Error("User object is invalid or missing ID"), null);
    }
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id)
        .then((user) => {
            if (!user) {
                return done(new Error("User not found"), null);
            }
            done(null, user);
        })
        .catch((err) => {
            console.error("Error during deserialization:", err);
            done(err, null);
        });
});



module.exports=passport

