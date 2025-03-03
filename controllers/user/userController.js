const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Brand = require("../../models/brandSchema")
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");


const pageNotFound=async(req,res)=>{


    try {
        
        res.render("page-404")
    
    } catch (error) {
        res.redirect("/pageNotFound")
    }
    
    }

    function generateOtp(){

        return Math.floor(100000 + Math.random()*900000).toString();
       
    }

    
const loadHomepage = async (req, res) => {
    try {
       
        const categories = await Category.find({ isListed: true });

        const productData = await Product.find({
            isBlocked: false,
            category: { $in: categories.map((category) => category._id) },
            variants: { $elemMatch: { stock: { $gt: 0 } } }, 
        }).populate("category", "name categoryOffer")
        .sort({ createdAt: 1 });

        if (req.isAuthenticated()) {
            const userData = await User.findOne({ _id: req.user._id });
           
            return res.render("home", { user: userData, products: productData, });
        } else {
            
            return res.render("home", { user: null, products: productData, });
        }
    } catch (error) {
        console.error("Error loading homepage:", error);
        res.status(500).send("Server error");
    }
};


const loadSignup= async(req,res)=>{

    try {
        return res.render('signup')
        
    } catch (error) {
console.log("Homepage not loading:",error);
res.status(500).send("server error")
        
    }
}


async function sendVerificationEmail(email,otp) {
    try {

        const transporter=nodemailer.createTransport({
            service:'gmail',
            port:587,
            secure:false,
           requireTLS:true,
           auth:{
            user:process.env.NODEMAILER_EMAIL,
            pass:process.env.NODEMAILER_PASSWORD
           } 
        })

        const info=await transporter.sendMail({
form:process.env.NODEMAILER_EMAIL,
to:email,
subject:"Verify your account",
text:`Your OTP is ${otp}`,
html:`<b>Your OTP is ${otp}</b>`

 })
 return info.accepted.length>0
        
    } catch (error) {

        console.error("Error sending email",error)
        return false
        
    }

}


const signup = async (req, res) => {
    try {
        const { name, email, password, confirmPassword, phone, referalCode  } = req.body;
   console.log("referal",referalCode)
        if (password !== confirmPassword) {
            return res.render("signup", { message: "Password does not match" });
        }

        const findUser = await User.findOne({ email });
        if (findUser) {
            return res.render("signup", { message: "User with this email already exists" });
        }

        const otp = generateOtp();
        
        // Referral code
        if (referalCode) {
            const existReferral = await User.findOne({ referalCode: referalCode })
            console.log("refff", existReferral)
            if (!existReferral) {
                return res.render("signup", { message: "Invalid Referral code...!" })
               
            }
            req.session.userData = referalCode 
        }

        const emailSent = await sendVerificationEmail(email, otp);
        if (!emailSent) {
            return res.json("email-error");
        }

        req.session.userOtp = otp;
        req.session.userData = { name, email, password, phone,referalCode}; 

        res.render("verify-otp");
        console.log("OTP Sent", otp);

    } catch (error) {
        console.error("Signup error", error);
        res.redirect("/pageNotFound");
    }
};


const securePassword=async (password)=>{

    try {
        const passwordHash= await bcrypt.hash(password,10)
        return passwordHash
    } catch (error) {
        console.error("this is error",error)
    }

}

// const verifyOtp = async (req, res) => {
//     try {
//         const { otp } = req.body;
        
//         console.log("User Data from Session:", req.session.userData);
      
//         if (otp === req.session.userOtp) {
//             const user = req.session.userData;
//             const passwordHash = await securePassword(user.password);

//             const saveUserData = new User({
//                 name: user.name,
//                 email: user.email,
//                 phone: user.phone,
//                 password: passwordHash
//             });

//             await saveUserData.save();

//             return res.redirect("/login"); 

           
//         } else {
//             return res.status(400).json({ success: false, message: "Invalid OTP, Please try again" });
//         }
//     } catch (error) {
//         console.error("Error Verifying OTP", error);
//         res.status(500).json({ success: false, message: "An error occurred" });
//     }
// };


const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        

        console.log("User Data from Session:", req.session.userData);


        if (otp === req.session.userOtp) {
            const user = req.session.userData;
            const passwordHash = await securePassword(user.password);

            const newUser = new User({
                name: user.name,
                email: user.email,
                phone: user.phone,
                password: passwordHash,
                redeemed: false 
            });

            await newUser.save(); // Save first to generate _id

            // Referral reward logic
            if (user.referalCode) { // Check if referral code exists
                const referrer = await User.findOne({ referalCode: user.referalCode });
                console.log("ffffff",referrer)
                if (referrer) {
                    referrer.redeemedUsers.push(newUser._id);

                    // Reward the referrer (e.g., add balance to wallet)
                    referrer.wallet.balance += 500;
                    referrer.wallet.transactions.push({
                        type: "credit",
                        amount: 500,
                        description: "Referral reward",
                        date: new Date()
                    });

                    await referrer.save();

                    newUser.wallet.balance += 50;
                    newUser.wallet.transactions.push({
                        type: "credit",
                        amount: 50,
                        description: "Welcome bonus for signing up with a referral code",
                        date: new Date()
                    });
                    newUser.redeemed = true;
                    await newUser.save();
                }
            }

           // return res.redirect("/login");
           return res.json({ success: true, redirectUrl: "/login" });

        } else {

            return res.status(400).json({ success: false, message: "Invalid OTP, Please try again" }); 

        }
    } catch (error) {
        console.error("Error Verifying OTP", error);
        res.status(500).json({ success: false, message: "An error occurred" });
    }
};



const resendOtp = async(req,res)=>{
try {
    console.log("Session Data:", req.session.userData);
    const {email}=req.session.userData
    if(!email){

        return res.status(400).json({success:false,message:"Email not Found in session"})
    }

    const otp=generateOtp();
    req.session.userOtp = otp;
  
    
const emailSent = await sendVerificationEmail(email,otp);

if(emailSent){
    console.log("Resend OTP:",otp);
    res.status(200).json({success:true,message:"OTP Resend Successfully"})
  
}else{
    res.status(500).json({success:false,message:"Failed to resend OTP. Please try again"})
}
    
} catch (error) {
    console.error("Error resending OTP",error);
    res.status(500).json({success:false,message:"Internal Server Error. Please try again"})
}


}

const loadLogin = async(req,res)=>{
   
    try {
        if(!req.session.user){
            return res.render("login")
        }else{
            res.redirect("/")
        }
    } catch (error) {
        res.redirect("/pageNotFound")
    }

}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const findUser = await User.findOne({ isAdmin: 0, email: email });
        if (!findUser) {
            return res.render("login", { message: "User Not Found" });
        }

        // req.session.user = { email: findUser.email, id: findUser._id }; 
              
        if (findUser.isBlocked) {
            return res.render("login", { message: "User is blocked by admin" });
        }

        const passwordMatch = await bcrypt.compare(password, findUser.password);
        if (!passwordMatch) {
            return res.render("login", { message: "Incorrect Password" });
        }

        req.login(findUser, (err) => {
            if (err) {
                console.error("Login failed:", err);
                return res.render("login", { message: "Login failed, please try again later" });
            }

            req.session.user = {
                _id: findUser._id,
                email: findUser.email,
                name: findUser.name, 
            };

            console.log("kkkkk",req.session.user);

            return res.redirect("/");
        });

    } catch (error) {
        console.error("Login error:", error);
        res.render("login", { message: "Login failed, please try again later" });
    }
};


const logout = async(req,res)=>{

try {
    req.session.destroy((err)=>{
        if(err){
            console.log("session destruction error",err.message);
            return res.redirect("/pageNotFound")
            
        }
        return res.redirect("/login")
    })

} catch (error) {
    console.log("logout error",error);
    res.redirect("/pageNotFound")
}

}


const loadShopingPage = async (req, res) => {
    try {
        const user = req.session.user;
        req.session.category = null;
        req.session.brand = null;
        req.session.gt = null;
        req.session.lt = null;
        req.session.searchWord = null;

        const userData = await User.findOne({ _id: user });
        const categories = await Category.find({ isListed: true });
        const categoryIds = categories.map((category) => category._id.toString()); 
        
      
        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page - 1) * limit;

        const brands = await Brand.find({isBlocked:false});

        const products = await Product.find({
            isBlocked: false,
            category: { $in: categoryIds },
             variants: { $elemMatch: { stock: { $gt: 0 } } }
        }).sort({ createdAt: -1 }).skip(skip).limit(limit);
     

        const totalProducts = await Product.countDocuments({
            isBlocked: false,
            category: { $in: categoryIds },
            variants: { $elemMatch: { stock: { $gt: 0 } } },
        });
    

        // const wishlist = await Wishlist.findOne({ userId: user });
        // const wishlistProductIds = wishlist
        //     ? wishlist.products.map(product => product.productId.toString())
        //     : [];
   

        const totalPages = Math.ceil(totalProducts / limit);

        const categoriesWithIds = categories.map(category => ({
            _id: category._id,
            name: category.name,
        }));

        req.session.sort = req.session.sort || null;


        res.render("shops", {
            user: userData,
            products: products,
            categories: categoriesWithIds,
            brands: brands ,
            totalProducts: totalProducts,
            currentPage: page,
            totalPages: totalPages,
            searchedProduct: "",
            selectedCategory: "",
            selectedPrice: "",
            selectedBrand: "",
            selectedSort: "",
           
        });
    } catch (error) {
        console.error("Error loading shopping page:", error);
        res.redirect("/pageNotFound");
    }
};


const filterProducts = async (req, res) => {
    try {
        req.session.category = req.query.category || req.session.category || null;
        req.session.brand = req.query.brand || req.session.brand || null;
        req.session.gt = req.query.gt || req.session.gt || null;
        req.session.lt = req.query.lt || req.session.lt || null;
        req.session.sort = req.query.sort || req.session.sort || null;
        req.session.searchWord = req.query.searchWord || req.session.searchWord || null;

        const user = req.session.user;

    // const userData = user ? await User.findOne({ _id: user }).lean() : null;

        // Fetch categories and brands
        const categories = await Category.find({ isListed: true }).lean();
        const brands = await Brand.find({ isBlocked: false }).lean();
       

        const query = {
            isBlocked: false,
            variants: {
                $elemMatch: {
                    stock: { $gt: 0 },
                },
            },
        };

        if (req.session.category) {
            const findCategory = await Category.findOne({ _id: req.session.category });
            if (findCategory) {
                query.category = findCategory._id;
            }
        }

        if (req.session.brand) {
            const findBrand = await Brand.findOne({ _id: req.session.brand });
            if (findBrand) {
                query.brand = findBrand.brandName;
            }
        }

        // if (req.session.gt || req.session.lt) {
        //     query["variants.salePrice"] = {}; // Apply filtering on salePrice inside variants
        //     if (req.session.gt) query["variants.salePrice"].$gte = parseInt(req.session.gt);
        //     if (req.session.lt) query["variants.salePrice"].$lte = parseInt(req.session.lt);
        // }

        if (req.session.gt || req.session.lt) {
            query.variants.$elemMatch.salePrice = {};
            if (req.session.gt) query.variants.$elemMatch.salePrice.$gte = parseInt(req.session.gt);
            if (req.session.lt) query.variants.$elemMatch.salePrice.$lte = parseInt(req.session.lt);
        }
        
        
        if (req.session.searchWord) {
            query.productName = { $regex: req.session.searchWord, $options: "i" };
        }

        let findProducts = await Product.find(query).lean();

        // Apply sorting based on the query parameter
        const sortType = req.query.sort || "featured";
        if (req.session.sort) {
            switch (req.session.sort) {
                case 'lowToHigh':
                    findProducts.sort((a, b) => {
                        const minPriceA = Math.min(...a.variants.map(v => v.salePrice));
                        const minPriceB = Math.min(...b.variants.map(v => v.salePrice));
                        return minPriceA - minPriceB;
                    });
                    break;
                case 'highToLow':
                    findProducts.sort((a, b) => {
                        const minPriceA = Math.min(...a.variants.map(v => v.salePrice));
                        const minPriceB = Math.min(...b.variants.map(v => v.salePrice));
                        return minPriceB - minPriceA;
                    });
                    break;
                case 'aA-zZ':
                    findProducts.sort((a, b) => a.productName.toLowerCase().localeCompare(b.productName.toLowerCase()));
                    break;
                case 'zZ-aA':
                    findProducts.sort((a, b) => b.productName.toLowerCase().localeCompare(a.productName.toLowerCase()));
                    break;
                default:
                    findProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            }
        }

        // Pagination setup
        const itemsPerPage = 6;
        const currentPage = parseInt(req.query.page) || 1;
        const startIndex = (currentPage - 1) * itemsPerPage;
        // const totalProducts = await Product.countDocuments(filterConditions);
        const totalPages = Math.ceil(findProducts.length / itemsPerPage);
        const currentProducts = findProducts.slice(startIndex, startIndex + itemsPerPage);
        
        let userData = null;
        if (user) {
            userData = await User.findOne({ _id: user });
            if (userData) {
                const searchEntry = {
                    category: req.session.category || null,
                    brand: req.session.brand|| null,
                    priceRange: { gt: req.session.gt, lt: req.session.lt },
                    searchedOn: new Date(),
                };
                userData.searchHistory.push(searchEntry);
                await userData.save();
            }
        }

        req.session.filteredProducts = currentProducts;

        // Render the filtered results
        res.render("shops", {
            user: userData,
            products: currentProducts,
            categories: categories,
            brands: brands,
            totalPages: totalPages ,
            currentPage,
            sortType,
            selectedCategory: req.session.category || null,
            selectedBrand: req.session.brand || null,
            selectedPrice: req.session.gt && req.session.lt ? `${req.session.gt}-${req.session.lt}` : null,
           
            selectedSort: req.session.sort,
            searchedProduct: req.session.searchWord || '',
        });
    } catch (error) {
        console.error("Error filtering products:", error);
        res.redirect("/pageNotFound");
    }
};


const productDetails = async (req, res) => {
    try {
        const userId = req.session.user;

        
        const userData = userId ? await User.findById(userId).lean() : null;

        
        const { id: productId } = req.query;

        
        const product = await Product.findOne({ _id: productId, isBlocked: false })
    .populate({ path:'category', match:{isListed:true}})
    .lean();

        if (!product) {
            return res.redirect("/");
        }

        // Fetch category offer
        const categoryOffer = product.category?.categoryOffer || 0;

        // Fetch product offer
        const productOffer = product.productOffer || 0;

        
        const highestOffer = Math.max(categoryOffer, productOffer);
        console.log("highest",highestOffer)

        // Update sale price for all variants based on the highest offer
        const variants = product.variants.map((variant) => {
            const salePrice = variant.regularPrice - (variant.regularPrice * highestOffer) / 100;
            return {
                ...variant,
                salePrice: parseFloat(salePrice.toFixed(2)), 
            };
        });

        // Select the default variant (first one or fallback)
        const defaultVariant = variants.length > 0 ? variants[0] : null;

        // Render the product details page
        res.render('product-details', {
            user: userData,                
            product,                      
            variants,                    
            defaultVariant,               
            category: product.category,   
            highestOffer,                 
        });
    } catch (error) {
        console.error("Error fetching product details:", error);
        res.redirect("/pageNotFound");
    }
};



module.exports={
    loadHomepage,
    pageNotFound,
    loadSignup,signup,
    verifyOtp,resendOtp,
    loadLogin,login,logout,
    productDetails,
    loadShopingPage,
    filterProducts,
   
     
    
}