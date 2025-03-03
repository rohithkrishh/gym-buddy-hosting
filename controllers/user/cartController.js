const mongoose = require('mongoose');
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema"); 
const Cart = require("../../models/cartSchema");



const getCartPage = async (req, res) => {
    try {
        // Ensure the user is authenticated
        if (!req.user || !req.user._id) {
            return res.status(401).json({ error: "User not authenticated." });
        }

        const userId = req.user._id;

        // Fetch the cart with product and variant details
        const cart = await Cart.findOne({ user: userId })
            .populate({
                path: "items.product",
                populate: {
                    path: "variants",
                    select: "type weight salePrice regularPrice stock",
                },
                select: "productName productImages variants isBlocked",
            });

            cart.items = cart.items.filter((item)=>!item.product.isBlocked)

        if (!cart || cart.items.length === 0) {
            return res.render("shop-cart", { cart: { items: [], cartTotal: null } });
        }

        let cartHasOutOfStock = false; 
        let updatedItems = []; 

        // Calculate cart total and check stock availability
        const cartTotal = cart.items.reduce((total, item) => {
            const selectedVariant = item.product.variants.find(
                (variant) => variant._id.toString() === item.variantId.toString()
            );
        
            if (selectedVariant) {
                if (selectedVariant.stock === 0) {
                    
                    item.outOfStock = true;
                    cartHasOutOfStock = true;
                } else if (selectedVariant.stock < item.quantity) {
                    
                    item.quantity = selectedVariant.stock;
                    cartHasOutOfStock = true; 
                } else {
                    item.outOfStock = false; 
                }
        
                // Calculate total
                return total + selectedVariant.salePrice * item.quantity;
            }
        
            return total;
        }, 0);
        

        // Prepare cart data for rendering
        const preparedCart = {
            items: cart.items.map((item) => {
                const selectedVariant = item.product.variants.find(
                    (variant) => variant._id.toString() === item.variantId.toString()
                );

                // Construct the item object for the frontend
                return {
                    itemId: item._id,
                    productId: item.product._id,
                    name: item.product.productName,
                    productImage: item.product.productImages,
                    variant: selectedVariant
                        ? {
                              variantId: selectedVariant._id,
                              type: selectedVariant.type ,
                              weight: selectedVariant.weight,
                              salePrice: selectedVariant.salePrice || 0,
                              stock: selectedVariant.stock || 0,
                          }
                        : {
                            
                              variantId: item.variantId, 
                              type: "Unknown",
                              weight: "Unknown",
                              salePrice: 0,
                              stock: 0,
                          },
                    quantity: selectedVariant && selectedVariant.stock > 0 ? item.quantity : 0,
                    total: selectedVariant ? selectedVariant.salePrice * item.quantity : 0,
                    outOfStock: !selectedVariant || selectedVariant.stock === 0,
                };
            }),
            total: cartTotal,
            cartHasOutOfStock, 
            updatedItems, 
        };

    let total = cart.totalPrice
    

        // Render the cart page with prepared data
        res.render("shop-cart", { cart: preparedCart,cartTotal:Math.floor(total)  });
    } catch (error) {
        console.error("Error fetching cart page:", error);
        res.status(500).render("error-page", {
            error: "Something went wrong while fetching your cart. Please try again later.",
        });
    }
};


const addToCart = async (req, res) => {
    const { productId, variantId, quantity } = req.body;
    const userId = req.session.user;
    const MAX_QUANTITY = 5;

    try {
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User not logged in' });
        }

        if (!productId || !variantId || !quantity) {
            return res.status(400).json({ success: false, message: 'Product ID, variant ID, and quantity are required' });
        }

        const parsedQuantity = Number(quantity);
        if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
            return res.status(400).json({ success: false, message: 'Quantity must be a positive number' });
        }
        

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const variant = product.variants.find(v => v._id.toString() === variantId);
        if (!variant) {
            return res.status(404).json({ success: false, message: 'Variant not found' });
        }

        if (variant.stock < parsedQuantity) {
            return res.status(400).json({ success: false, message: `Only ${variant.stock} units are available.` });
        }

        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = new Cart({ user: userId, items: [] });
        }

        if (!Array.isArray(cart.items)) {
            cart.items = [];
        }

        const itemIndex = cart.items.findIndex(item => 
            item.product.toString() === productId && 
            item.variantId && item.variantId.toString() === variantId 
        );

        let newQuantity = parsedQuantity;

        if (itemIndex !== -1) {
            const currentQuantity = cart.items[itemIndex].quantity;
            newQuantity += currentQuantity;

            if (newQuantity > MAX_QUANTITY) {
                return res.status(400).json({
                    success: false,
                    message: `You can only add up to ${MAX_QUANTITY} units of this product.`,
                });
            }

            if (newQuantity > variant.stock) {
                return res.status(400).json({ success: false, message: `Only ${variant.stock} units are available.` });
            }

            cart.items[itemIndex].quantity = newQuantity;
        } else {
            if (newQuantity > MAX_QUANTITY) {
                return res.status(400).json({
                    success: false,
                    message: `You can only add up to ${MAX_QUANTITY} units of this product.`,
                });
            }

            cart.items.push({
                product: productId,
                variantId: variantId,
                quantity: newQuantity,
                salePrice: variant.salePrice,
            });
        }


        await cart.save();
       
        res.status(200).json({ success: true, message: 'Item added to cart', cart });
    } catch (error) {
        console.error("Error adding item to cart:", error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const removeProductFromCart = async (req, res) => {
    const { productId, variantId } = req.body;
    const userId = req.session.user;
   

    console.log("product:",productId,"variant:",variantId)
    try {
        
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User not logged in' });
        }

        if (!productId || !variantId) {
            return res.status(400).json({ success: false, message: 'Product ID and variant ID are required' });
        }

        const cart = await Cart.findOne({ user: userId });

        if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
            return res.status(404).json({ success: false, message: 'Cart is empty or not found' });
        }

    
        const itemIndex = cart.items.findIndex(item => 
            item.product.toString() === productId && item.variantId.toString() === variantId
        );

        if (itemIndex === -1) {
            return res.status(404).json({ success: false, message: 'Product or variant not found in the cart' });
        }

    
        cart.items.splice(itemIndex, 1);

        
        await cart.save();

       
        res.status(200).json({
            success: true,
            message: 'Item removed from cart successfully',
            cart,
        });

    } catch (error) {
        console.error("Error removing item from cart:", error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};



const updateCartQuantity = async (req, res) => {
    const { productId, variantId, change } = req.body;
    const userId = req.session.user;

    try {
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User not logged in' });
        }

        if (!productId || !variantId || typeof change !== 'number') {
            return res.status(400).json({ success: false, message: 'Product ID, variant ID, and valid change value are required' });
        }

        const cart = await Cart.findOne({ user: userId });
        if (!cart || !Array.isArray(cart.items)) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        const item = cart.items.find(item =>
            item.product.toString() === productId &&
            item.variantId.toString() === variantId
        );

        if (!item) {
            return res.status(404).json({ success: false, message: 'Product or variant not found in cart' });
        }

        const newQuantity = item.quantity + change;

        if (newQuantity < 1) {
            return res.status(400).json({ success: false, message: 'Quantity must be at least 1.' });
        }

        if (newQuantity > 5) {
            return res.status(400).json({ success: false, message: 'You can only add up to 5 units of this product.' });
        }

        // Fetch product and variant for stock validation
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const variant = product.variants.find(v => v._id.toString() === variantId);
        if (!variant) {
            return res.status(404).json({ success: false, message: 'Variant not found' });
        }

        if (newQuantity > variant.stock) {
            return res.status(400).json({ success: false, message: `Only ${variant.stock} units are available.` });
        }

        // Update the quantity in the cart
        item.quantity = newQuantity;
        await cart.save();

        // Calculate total cart value
        let cartTotal = 0;
        for (const cartItem of cart.items) {
            const product = await Product.findById(cartItem.product);
            if (product) {
                const itemVariant = product.variants.find(v => v._id.toString() === cartItem.variantId.toString());
                if (itemVariant) {
                    cartTotal += cartItem.quantity * itemVariant.salePrice;
                }
            }
        }

        res.status(200).json({
            success: true,
            message: 'Quantity updated successfully',
            updatedItem: {
                productId,
                variantId,
                quantity: item.quantity,
                variantPrice: variant.salePrice,
            },
            newCartTotal: cartTotal,
        });
    } catch (error) {
        console.error('Error updating cart quantity:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};



module.exports = { 
    getCartPage,
     addToCart,
     removeProductFromCart,
     updateCartQuantity
    
 };




