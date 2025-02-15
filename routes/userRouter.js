const express=require("express");
const router=express.Router();
const userController=require("../controllers/user/userController");
const profileController = require("../controllers/user/profileController");
const passport = require("passport");
const cartController = require("../controllers/user/cartController");
const WishlistController = require("../controllers/user/wishlistController");
const {userAuth} = require("../middlewares/auth");
const orderController = require("../controllers/user/orderController");
const walletController = require("../controllers/user/walletController");


//Error Management
router.get("/pageNotFound",userController.pageNotFound);

//Login Management
router.get("/login",userController.loadLogin);
router.post("/login",userController.login);

//Sign up Management
router.get("/signup",userController.loadSignup);
router.post("/signup",userController.signup);
router.post("/verify-otp",userController.verifyOtp);
router.post("/resend-otp",userController.resendOtp);
router.get(
    "/google",
    passport.authenticate("google", { scope: ["profile", "email",] })
);

router.get(
    "/google/callback",
    passport.authenticate("google", { failureRedirect: "/signup" }),
    (req, res) => {
        if (req.user) {
            console.log("Authenticated user:", req.user);
            req.session.user = {
                _id: req.user._id,
                email: req.user.email,
                name: req.user.name,
            };
        
            res.redirect("/"); 
        } else {
            console.error("No user found after Google login.");
            res.redirect("/signup");
        }
    }
);


//Home Page & Shopping Page 
router.get("/logout",userController.logout);
router.get("/",userController.loadHomepage);
router.get("/shop",userAuth,userController.loadShopingPage);
router.get("/filter",userAuth,userController.filterProducts);

 
//Profile Management
router.get("/forgot-password",profileController.getForgotPassPage);
router.post("/forgot-email-valid",profileController.forgotEmailValid);
router.post("/verify-passForgot-otp",profileController.verifyForgotPassOtp);
router.get("/reset-password",profileController.getResetPassPage);
router.post("/resend-forgot-otp",profileController.resendOtp);
router.post("/reset-password",profileController.postNewPassword);
router.get("/userProfile",userAuth,profileController.userProfile);
router.get("/change-email",userAuth,profileController.changeEmail);
router.get("/change-password",userAuth,profileController.changePassword);
router.post("/change-password",userAuth,profileController.changePasswordValid);
router.post("/verify-changepassword-otp",userAuth,profileController.verifyChangePassOtp);
router.post("/profileUpdate",userAuth,profileController.updateProfile);
router.post("/GenerateReferral",userAuth,profileController.generateReferralCode);


//Address Management 
router.get("/addAddress",userAuth,profileController.addAddress);
router.post("/addAddress",userAuth,profileController.postAddAddress);
router.get("/editAddress",userAuth,profileController.editAddress);
router.post("/editAddress",userAuth,profileController.postEditAddress);
router.get("/deleteAddress",userAuth,profileController.deleteAddress);


//Cart Management
router.get("/cart",userAuth,cartController.getCartPage);
router.post("/cart/addItem",userAuth, cartController.addToCart);
router.post("/cart/remove-item",userAuth,cartController.removeProductFromCart);
router.post("/update-quantity",userAuth,cartController.updateCartQuantity);


//Order Management
router.get("/checkout",userAuth,orderController.loadCheckout);
router.post("/place-order",userAuth,orderController.placeOrder);
router.get("/orderDetails/:orderId",userAuth,orderController.orderDetails);
router.post("/create-order",userAuth,orderController.razorpayCreatOrder);
router.post("/verify-payment",userAuth,orderController.verifyPayment);
router.post("/cancel-order/:id",userAuth,orderController.cancelOrder);
router.post("/return-order",userAuth,orderController.returnOrder);
router.get("/download-invoice/:orderId",userAuth,orderController.downloadinvoice);


router.get("/payment-failed/:orderId",userAuth,orderController.getPaymentFailed);
router.post("/placeOrderRazorPay",userAuth,orderController.repayRazorPay);
router.post("/verifyRazorPayOrder",userAuth,orderController.verifyRepayRazorpay);

//Wallet Management
router.get("/wallet",userAuth,walletController.getWallet);
router.get("/balance/:userId",userAuth,walletController.getWalletBalance);
router.post("/walletPlaceOrder",userAuth,walletController.walletPlaceOrder);


//Whishlist Management
router.get("/whishlist",userAuth,WishlistController.LoadWishlist);
router.post("/addToWishlist",userAuth,WishlistController.addToWishlist);
router.post("/wishlist/remove-item",userAuth,WishlistController.removeFromWishlist);

//Coupon Management
router.post("/apply-coupon",userAuth,orderController.verifyCoupon);


//ProductDetails Management
router.get("/productDetails",userAuth,userController.productDetails);

module.exports=router