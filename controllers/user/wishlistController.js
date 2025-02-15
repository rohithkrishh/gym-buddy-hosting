const mongoose = require('mongoose');
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Wishlist = require("../../models/wishlistSchema");




const LoadWishlist = async (req, res) => {
    try {
      
        
        const user = req.session.user; // Assumes userId is stored in session
      

        // Ensure user is a valid ObjectId
        // if (!mongoose.Types.ObjectId.isValid(user)) {
        //     throw new Error("Invalid user ID");
        // }

        // Query Wishlist by userId
        let wishlist = await Wishlist.findOne({ userId: user }).populate("products.productId");
        

        if (!wishlist) {
            wishlist = {
                user: req.session.user,
                products: [],
            };
        }

        // console.log('wishlist:', JSON.stringify(wishlist, null, 2));

        return res.render('wishlist', { wishlist });
    } catch (error) {
        console.error("Error fetching wishlist:", error.message);
        return res.redirect('/pagenotFound');
    }
};

const addToWishlist = async (req, res) => {

    try {

        const productId = req.body.productId; 
        const userId = req.session.user; 
      
        if (!userId) {
            
            return res.status(401).json({ status: false, message: "You need to log in first" });

        }
        // Find the wishlist by userId
        let wishlist = await Wishlist.findOne({ userId });

        const product = {
            productId: productId, 
            addedAt: Date.now(),
        };

        if (!wishlist) {
            wishlist = new Wishlist({
                userId: userId,
                products: [product],
            });
        } else {
            const existingProductIndex = wishlist.products.findIndex(
                (item) => item.productId.toString() === productId.toString()
            );

            if (existingProductIndex === -1) {
                wishlist.products.push(product);
            } else {
                
                return res.status(200).json({ message: "Product already in wishlist" });
            }
        }

        await wishlist.save();

       return res.status(200).json({status:true ,message: "Product added to wishlist successfully" });

    } catch (error) {
        console.error("Error adding to wishlist:", error);
        res.status(500).json({ error: "An error occurred while adding to wishlist" });
    }
};


const removeFromWishlist = async (req,res) => {
  
    try {
        const { productId } = req.body;
        const userId = req.user._id;

        // Find and update the wishlist by removing the product
        const result = await Wishlist.findOneAndUpdate(
            { userId },
            { $pull: { products: { productId } } }, 
            { new: true }
        );

        
        if (result) {
            return res.json({ success: true, message: "Item removed from wishlist successfully." });
        } else {
            return res.status(400).json({ success: false, message: "Item not found in wishlist." });
        }
    } catch (error) {
        console.error("Error removing item from wishlist:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }

}

module.exports = {

    LoadWishlist,
    addToWishlist,
    removeFromWishlist,

}