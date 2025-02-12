const mongoose = require('mongoose');
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema"); 
const Address = require("../../models/addressSchema");
const Order =  require("../../models/orderSchema");
const Coupon = require("../../models/couponSchema");
const { Transaction } = require('mongodb');


function generateOrderId() {
    const now = new Date();
 console.log(now)
    // Get date components
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); 
    const day = String(now.getDate()).padStart(2, '0'); 

    // Get time components
    const hours = String(now.getHours()).padStart(2, '0'); 
    const minutes = String(now.getMinutes()).padStart(2, '0'); 
    const seconds = String(now.getSeconds()).padStart(2, '0'); 

    
    const randomNum = Math.floor(1000 + Math.random() * 9000); 

    // Format the Order ID
    return `ORD-${year}${month}${day}-${hours}${minutes}${seconds}-${randomNum}`;
}

const getWallet = async (req,res) => {

    try {

        const userId = req.user ? req.user._id : null;        
        if(!userId){
            return res.status(401).send("unautherised");
        }

        const user = await User.findById(userId);
        
        res.render("wallet", { userId });
    } catch (error) {
        
    }
}

const getWalletBalance = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }



        res.json({ balance: user.wallet.balance,
            transaction: user.wallet.transactions
           
         });

         console.log("object",user.wallet.transactions);

    } catch (error) {
        console.error('Error fetching wallet balance:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const walletPlaceOrder = async (req, res) => {
    try {
        const { addressId, paymentMethod,couponCode } = req.body;
        const userId = req.user._id;

        // Fetch user's cart
        const cart = await Cart.findOne({ user: userId }).populate("items.product");
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ error: "Cart is empty." });
        }

        // Fetch user's address
        const userAddress = await Address.findOne({ userId });
        const selectedAddress = userAddress.address.find(addr => addr._id.toString() === addressId);
        if (!selectedAddress) {
            return res.status(404).json({ error: "Address not found." });
        }

        // Fetch user wallet balance
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }
        
        let discount = 0;
        const subtotal = cart.totalPrice;

         // Handle coupon validation and discount
         if (couponCode) {
             const coupon = await Coupon.findOne({ name: couponCode, isList: true });
             if (coupon) {
                 // Check if the coupon is expired
                 if (new Date() > new Date(coupon.expireOn)) {
                     return res.status(400).json({ message: 'Coupon has expired.' });
                 }
 
                 // Calculate discount based on the offer type
                 if (coupon.offerType === 'flat') {
                     discount = coupon.offerValue;
                 } else if (coupon.offerType === 'percentage') {
                     discount = subtotal * coupon.offerValue / 100;
                    
                 }
             } else {
                 return res.status(400).json({ message: 'Invalid or expired coupon.' });
             }
         }
        const finalPrice = Math.trunc(subtotal - discount);

        // Check if the user has enough wallet balance
        if (user.wallet.balance < finalPrice) {
            return res.status(400).json({ error: "Insufficient wallet balance." });
        }

        // Deduct the amount from the wallet
        user.wallet.balance -= finalPrice;
        let paymentStatus = "Paid"
        console.log(user.wallet.balance)

        // Generate order ID
        const orderId = generateOrderId();

        // Create the order
        const newOrder = new Order({
            user: userId,
            cartItems: cart.items.map(item => ({
                product: item.product._id,
                variant: item.variantId,
                quantity: item.quantity,
                salePrice: item.salePrice,
            })),
            shippingAddress: selectedAddress,
            transactionId: orderId,
            paymentMethod,
            totalPrice: subtotal,
            discount,
            finalPrice,
            paymentStatus
        });

        await newOrder.save();
        await user.save(); 

        // Update stock
        for (const item of cart.items) {
            const product = await Product.findById(item.product._id);
            if (product) {
                const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
                if (variant) {
                    variant.stock -= item.quantity;

                    if (variant.stock < 0) {
                        return res.status(400).json({
                            error: `Insufficient stock for product: ${product.name}`,
                        });
                    }
                }
                await product.save();
            }
        }

        // Clear the cart
        cart.items = [];
        cart.totalItems = 0;
        cart.totalPrice = 0;
        await cart.save();

        return res.status(201).json({ message: "Order placed successfully using wallet!", orderId: newOrder._id });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "An error occurred while placing the order." });
    }
};





module.exports = {
    getWallet,
    getWalletBalance,
    walletPlaceOrder

}