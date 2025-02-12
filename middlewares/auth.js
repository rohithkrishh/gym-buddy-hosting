const User = require("../models/userSchema");

// const userAuth = async (req, res, next) => {
//   try {
//       if (!req.session.user) {
          
//           return res.redirect("/login");
//       }

//       const user = await User.findById(req.session.user);
//       if (!user) {
          
//           return res.redirect("/login");
//       }

//       if (user.isBlocked) {
//           console.log("Blocked user attempted access. Redirecting to login.");
//           return res.redirect("/login");
//       }
//       // User is authenticated and not blocked
//       console.log("Authenticated user:", user.email);
//       next();
//   } catch (error) {
//       console.error("Error in user authentication middleware:", error);
//       res.status(500).send("Internal Server Error");
//   }
// };


const userAuth = async (req, res, next) => {
  try {
      if (!req.session.user) {
          console.log("No user session found. Redirecting to login.");
          return res.redirect("/login");
      }

      const user = await User.findById(req.session.user._id); 
      if (!user) {
          console.log("User not found in database. Redirecting to login.");
          return res.redirect("/login");
      }

      if (user.isBlocked) {
          console.log("Blocked user attempted access. Redirecting to login.");
          req.session.destroy(() => { 
              return res.redirect("/login");
          });
      } else {
          console.log("Authenticated user:", user.email);
          next(); 
      }
  } catch (error) {
      console.error("Error in user authentication middleware:", error);
      res.status(500).send("Internal Server Error");
  }
};



const adminAuth = async (req, res, next) => {
  try {
   
    // Check if session exists and user is an admin
    if (req.session && req.session.admin) {
      return next(); 
    }

    // Redirect to login if not authenticated as admin
    return res.redirect("/admin/login");
  } catch (error) {
    console.error("Error in adminAuth middleware:", error.message, error.stack);
    return res.redirect("/admin/pageerror");
  }
};




module.exports={
    userAuth,adminAuth,
}















// const adminAuth = (req,res,next)=>{

//     User.findOne({isAdmin:true})
//     .then(data=>{
// if(data){
//     next();
// }else{
//     res.redirect("/admin/login")
// }
//     })
//     .catch(error=>{
//         console.log("Error in adminauth middleware",error);
//         res.status(500).send("Internal Server Error")
        
//     })
// }





// const adminAuth = async (req, res, next) => {
//   try {
//     // Check if the logged-in user is an admin
//     const userId = req.session.user; // Assuming `req.session.user` holds the logged-in user's ID

//     if (!userId) {
//       return res.redirect("/admin/login"); // Redirect if no user is logged in
//     }

//     const user = await User.findById(userId);

//     if (user && user.isAdmin) {
//       // User is an admin, proceed to the next middleware or route
//       return next();
//     }

//     // User is not an admin
//     res.redirect("/admin/login");
//   } catch (error) {
//     console.error("Error in adminAuth middleware:", error);
//     res.status(500).send("Internal Server Error");
//   }
// };