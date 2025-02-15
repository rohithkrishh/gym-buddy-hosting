const mongoose = require('mongoose');
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema"); 
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Coupon = require("../../models/couponSchema");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const dotenv = require("dotenv");
dotenv.config();
const axios = require("axios");
const PdfPrinter = require('pdfmake');
const fs = require('fs');
const path = require('path');


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


const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});


const loadCheckout = async (req, res) => {
    try {
        
        if (!req.user || !req.user._id) {
            return res.status(401).json({ error: "User not authenticated." });
        }

        const userId = req.user._id;

        // Fetch the user's cart
        const cart = await Cart.findOne({ user: userId })
            .populate({
                path: "items.product",
                populate: {
                    path: "variants",
                    select: "type weight salePrice stock ", 
                },
                select: "productName productImages variants", 
            });
   
        
        // if (!cart || cart.items.length === 0) {
        //     return res.render("checkout", { cart: { items: [], total: 0 }, addresses: [] });
        // }

        // Calculate cart total
        const cartTotal = cart.items.reduce((total, item) => {
            const selectedVariant = item.product.variants.find(
                (variant) => variant._id.toString() === item.variantId.toString()
            );
            return total + (selectedVariant ? selectedVariant.salePrice * item.quantity : 0);
        }, 0);

        //  cart data for rendering
        const preparedCart = {
            items: cart.items.map(item => {
                const selectedVariant = item.product.variants.find(
                    (variant) => variant._id.toString() === item.variantId.toString()
                );
                return {
                    productId: item.product._id,
                    name: item.product.productName,
                    productImage: item.product.productImages,
                    variant: selectedVariant
                        ? {
                              type: selectedVariant.type,
                              weight: selectedVariant.weight,
                              salePrice: selectedVariant.salePrice,
                              stock: selectedVariant.stock,
                          }
                        : null,
                    quantity: item.quantity,
                    total: selectedVariant ? selectedVariant.salePrice * item.quantity : 0,
                };
            }),
            total: cartTotal,
        };

        
        const addressDocument = await Address.findOne({ userId: userId }); 

        const activeCoupon = await Coupon.find({isList:true});
        
        if (!addressDocument || addressDocument.address.length === 0) {
            return res.render("checkout", { cart: preparedCart, addresses: [], coupons:activeCoupon });
        }

        
        const preparedAddresses = addressDocument.address.map(address => ({
            _id: address._id,
            addressType: address.addressType,
            name: address.name,
            city: address.city,
            landMark: address.landMark,
            state: address.state,
            pincode: address.pincode,
            phone: address.phone,
            altPhone: address.altPhone,
            fullAddress: `${address.name}, ${address.landMark}, ${address.city}, ${address.state} - ${address.pincode}`,
        }));
        
        if(!activeCoupon){
            res.render("checkout",{ cart: preparedCart, addresses: preparedAddresses,})
        }
        res.render("checkout", { cart: preparedCart, addresses: preparedAddresses,coupons:activeCoupon, });
    } catch (error) {
        console.error("Error fetching checkout page:", error);
        res.status(500).render("error-page", {
            error: "Something went wrong while loading the checkout page. Please try again later.",
        });
    }
};


const placeOrder = async (req, res) => {
    try {

        const { addressId, paymentMethod } = req.body;
        const userId = req.user._id;

        // user cart
        const cart = await Cart.findOne({ user: userId }).populate("items.product");
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ error: "Cart is empty." });
        }

        
        const userAddress = await Address.findOne({ userId });
        const selectedAddress = userAddress.address.find(addr => addr._id.toString() === addressId);
        if (!selectedAddress) {
            return res.status(404).json({ error: "Address not found." });
        }

        const subtotal = cart.totalPrice;
        const discount = 0; 
        const finalPrice = Math.trunc(subtotal - discount);
  
        if(subtotal>5000){
           
        return res.status(400).json({error:"COD is Available Order Lessthan 5000 Only"});
        
        }
      
        const orderId =  generateOrderId() 

        // Create order
        const newOrder = new Order({
            user: userId,
            cartItems: cart.items.map(item => ({
                product: item.product._id,
                variant: item.variantId,
                quantity: item.quantity,
                salePrice: item.salePrice
            })),
            shippingAddress: selectedAddress,
            transactionId:orderId,
            paymentMethod,
            totalPrice: subtotal,
            discount,
            finalPrice
        });

        await newOrder.save();

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

        // Clear user's cart
        cart.items = [];
        cart.totalItems = 0;
        cart.totalPrice = 0;
        await cart.save();

        return res.status(201).json({ message: "Order placed successfully!", orderId: newOrder._id });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "An error occurred while placing the order." });
    }
};


const razorpayCreatOrder = async (req, res) => {
    const { amount, currency } = req.body;

    try {
        const order = await razorpayInstance.orders.create({
            amount: amount * 100, // Convert amount to paise
            currency: currency || "INR",
            receipt: `receipt_${Date.now()}`,
        });

        res.status(200).json({ success: true, orderId: order.id,key:process.env.RAZORPAY_KEY_ID });
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ success: false, message: "Unable to create Razorpay order" });
    }
};


const verifyPayment = async (req, res) => {
    const userId = req.session.user;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, finalAmount, addressId, paymentMethod, couponCode,failed } = req.body;

    console.log("dkdkdkd",failed)

    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    const hmac = crypto.createHmac('sha256', key_secret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generated_signature = hmac.digest('hex');

    let paymentStatus = "Paid"

  
    if (!razorpay_signature || generated_signature !== razorpay_signature) {
        console.log("payment verification failed");
         paymentStatus = "Pending"
        //  res.status(400).json({ message: 'Payment verification failed.' });
        
    }

    try {
        if (!addressId) {
            return res.status(400).json({ message: 'Address is required.' });
        }

        const cart = await Cart.findOne({ user: userId }).populate('items.product');
        if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
            return res.status(400).json({ message: 'Your cart is empty.' });
        }

        // Fetch the selected address using addressId
        const addressDocument = await Address.findOne({ userId });
        const address = addressDocument?.address?.find(
            (addr) => addr._id.toString() === addressId
        );

        if (!address) {
            return res.status(404).json({ message: 'Selected address not found.' });
        }

        const validPaymentMethods = ["COD", "Online"];
        if (!validPaymentMethods.includes(paymentMethod)) {
            return res.status(400).json({ message: 'Invalid payment method.' });
        }
        
        console.log("payment method");

        const calculatedSubTotal = cart.items.reduce((sum, item) => sum + item.salePrice * item.quantity, 0);

        // Handle coupon validation and discount
        let discount = 0;
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
                    discount = calculatedSubTotal * coupon.offerValue / 100;
                   
                }
            } else {
                return res.status(400).json({ message: 'Invalid or expired coupon.' });
            }
        }

        const calculatedTotal = calculatedSubTotal - discount;


        // Create the order

         const orderId = generateOrderId();
       console.log("order")
        const newOrder = new Order({
            user: userId,
            cartItems: cart.items.map(item => ({
                product: item.product._id,
                variant: item.variantId,
                quantity: item.quantity,
                salePrice: item.salePrice,
            })),
            shippingAddress: address,
            transactionId:orderId,
            paymentMethod,
            totalPrice:Math.floor(calculatedSubTotal) ,
            discount,
            finalPrice: Math.floor(calculatedTotal),
            paymentStatus
        });

        await newOrder.save();

        for (const item of cart.items) {
            const product = await Product.findById(item.product._id);
            if (product) {
                const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
                if (variant.stock < item.quantity) {
                    return res.status(400).json({
                        error: `Insufficient stock for product: ${product.name}`,
                    });
                }
                variant.stock -= item.quantity;
                await product.save();
            }
        }

        // Clear the cart
        cart.items = [];
        cart.totalItems = 0;
        cart.totalPrice = 0;
        await cart.save();

        return res.status(201).json({ success: true, message: 'Order placed successfully!', orderId: newOrder._id });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'An error occurred while placing the order.' });
    }
};

const getPaymentFailed = async (req,res) => {

    try {

        const { orderId } = req.params;
        console.log("dddddd",orderId);
        res.render("paymentFailed", { orderId });
        
    } catch (error) {
        
    }


}

const repayRazorPay = async (req,res) => {

        try {
            const { totalAmount, orderId } = req.body;
            const existingOrder = await Order.findById(orderId);
    
            if (!existingOrder) {
                return res.status(404).json({ success: false, message: "Order not found" });
            }
    
            const razorpayOrder = await razorpayInstance.orders.create({
                amount: totalAmount * 100,
                currency: "INR",
                receipt: `order_${orderId}`,
            });
    
            return res.json({
                success: true,
                razorpayOrderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                key: process.env.RAZORPAY_KEY_ID,
            });
        } catch (error) {
            console.error("Error creating Razorpay order:", error);
            return res.status(500).json({ success: false, message: "Error processing payment" });
        }

}

const verifyRepayRazorpay = async (req,res) => {

    try {
        const { orderId, paymentId, razorpaySignature, addressId, paymentMethod } = req.body;

        console.log("body",req.body)
        const key_secret = process.env.RAZORPAY_KEY_SECRET;
        const hmac = crypto.createHmac("sha256", key_secret);
        hmac.update(`${orderId}|${paymentId}`);
        const generated_signature = hmac.digest("hex");

        console.log("dddd",generated_signature)

        // if (generated_signature !== razorpaySignature) {
        //     return res.status(400).json({ success: false, message: "Payment verification failed" });
        // }


        const updatedOrder = await Order.findByIdAndUpdate(orderId, {
            paymentStatus: "Paid",
            paymentMethod: paymentMethod,
            
        }, { new: true });

        return res.json({ success: true, orderId: updatedOrder._id });
    } catch (error) {
        console.error("Error verifying payment:", error);
        return res.status(500).json({ success: false, message: "Error verifying payment" });
    }

}


const verifyCoupon = async (req,res) => {
   
    const { couponCode,subtotal,userId } = req.body;

    try {
        // Find the coupon in the database
        const coupon = await Coupon.findOne({ name: couponCode, isList: true });
               console.log("dh",coupon);
        if (!coupon) {
            return res.status(400).json({ message: 'Invalid or expired coupon.' });
        }

        // Check if the coupon is expired
        if (new Date() > new Date(coupon.expireOn)) {
            return res.status(400).json({ message: 'Coupon has expired.' });
        }

        if(subtotal<coupon.minimumPrice){
            return res.status(400).json({ message: `Minimum purchase required is ₹${coupon.minimumPrice}.` });
        }

        const userUsedCoupon = await Order.findOne({userId,couponCode});

        if(userUsedCoupon){
            return res.status(400).json({message:"Already use this coupon!"})
        }

        let discount=0;
        if(coupon.offerType ==='flat'){
            discount = coupon.offerValue
        }else if(coupon.offerType === 'percentage'){
            discount = subtotal*coupon.offerValue/100
        }

        // Return the discount amount to the client
        res.json({ discount });
    } catch (error) {
        console.error('Error applying coupon:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
   
}


const orderDetails = async (req, res) => {
    try {
        const userId = req.user._id;
        const { orderId } = req.params; 

        // Fetch order details from the database
        const order = await Order.findById(orderId).populate("cartItems.product")
        
        

        // console.log('order:', JSON.stringify(order, null, 2))

        if (!order) {
            return res.status(404).send("Order not found");
        }

        res.render("orderdetails", { order ,userId});

    } catch (error) {
        console.error("Error fetching order details:", error);
        res.status(500).send("Internal server error");
    }
};


const cancelOrder = async (req, res) => {
    try {
      const orderId = req.params.id;
      const {reason} = req.body;
      console.log("-----",reason);
      // Find the order and populate cart items
      const order = await Order.findById(orderId).populate('cartItems.product');
  
      if (!order) {
        return res.status(404).send('Order not found');
      }
  
      if (order.orderStatus === 'Shipped' || order.orderStatus === 'Delivered') {
        return res.status(400).send('Cannot cancel shipped or delivered orders');
      }
    order.cancellationReason = reason;
    order.orderStatus = 'Cancelled';
    await order.save();
  
      for (const item of order.cartItems) {
        const product = await Product.findById(item.product._id);
        if (product) {
          
          const variant = product.variants.id(item.variant);
          if (variant) {
            variant.stock += item.quantity; 
            await product.save();
          }
        }
      }

    const user = await User.findById(order.user._id)

    if(!user){
        return res.status(404).send("ueser not found")
    }

    const refundAmount = order.finalPrice;
    user.wallet.balance += refundAmount;

    user.wallet.transactions.push({
        type: 'credit',
        amount: refundAmount,
        description: `Refund for cancelled order ${order._id}`,
    });

    await user.save();

    
      res.status(200).send('Order cancelled successfully');
    } catch (error) {
      console.error('Error cancelling order:', error);
      res.status(500).send('Internal Server Error');
    }
  };


  const returnOrder = async (req, res) => {

    try {
        const { orderId,reason } = req.body; 
        const userId = req.session.user; 

        // Find the order
        const order = await Order.findOne({ _id: orderId, user: userId });

        if (!order) {
            return res.status(404).json({ message: 'Order not found.' });
        }

        // Ensure the order has been delivered
        if (order.orderStatus !== 'Delivered') {
            return res.status(400).json({ message: 'Only delivered orders can be returned.' });
        }

        // Validate the return window (10 days from delivery date)
        // if (!order.deliveredAt) {
        //     return res.status(400).json({ message: 'Delivery date not found.' });
        // }

        const deliveredAt = new Date(order.updatedAt);
        
        const currentDate = new Date();
        const returnWindow = new Date(deliveredAt);
        returnWindow.setDate(returnWindow.getDate() + 10);

        if (currentDate > returnWindow) {
            return res.status(400).json({ message: 'Return window has expired.' });
        }
        order.return
        order.cancellationReason = reason;
        order.orderStatus = 'Returned';
        await order.save();
        

        for (const item of order.cartItems) {
            const product = await Product.findById(item.product._id);
            if (product) {
              
              const variant = product.variants.id(item.variant);
              if (variant) {
                variant.stock += item.quantity; 
                await product.save();
              }
            }
          }

          const user = await User.findById(order.user._id)

          if(!user){
              return res.status(404).send("ueser not found")
          }
      
          const refundAmount = order.finalPrice;
          user.wallet.balance += refundAmount;
      
          user.wallet.transactions.push({
              type: 'credit',
              amount: refundAmount,
              description: `Refund for cancelled order ${order._id}`,
          });
      
          await user.save();

        return res.status(200).json({ message: 'Order has been returned successfully.' });
    } catch (error) {
        console.error('Error processing order return:', error);
        return res.status(500).json({ message: 'An error occurred while processing the return request.' });
    }

};


const printer = new PdfPrinter({
    Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold'
    }
});

function generateInvoice(order, res) {
    const docDefinition = {
        content: [
            { text: 'Gym Equipment Store', style: 'header', alignment: 'center' },
            { text: `Invoice Number: ${order.transactionId}`, style: 'subheader' },
            { text: `Order Date: ${new Date(order.createdAt).toLocaleDateString()}` },
            { text: `Payment Status: ${order.paymentStatus}`, margin: [0, 0, 0, 10] },

            { text: 'Billing Details', style: 'subheader', margin: [0, 10, 0, 5] },
            { text: `Name: ${order.shippingAddress.name}` },
            { text: `City: ${order.shippingAddress.city}` },
            { text: `State: ${order.shippingAddress.state} - ${order.shippingAddress.pincode}` },
            { text: `Phone: ${order.shippingAddress.phone}`, margin: [0, 0, 0, 10] },

            { text: 'Order Summary', style: 'subheader', margin: [0, 10, 0, 5] },
            {
                table: {
                    headerRows: 1,
                    widths: ['10%', '40%', '10%', '20%', '20%'],
                    body: [
                        ['S.No', 'Product', 'Qty', 'Price (₹)', 'Total (₹)'],
                        ...(order.cartItems || []).map((item, index) => [
                            index + 1,
                            item.product?.productName || 'Unknown Product',
                            item.quantity,
                            `₹${item.salePrice}`,
                            `₹${(item.salePrice * item.quantity).toFixed(2)}`
                        ])
                    ]
                },
                margin: [0, 5, 0, 10]
            },

            { text: `Subtotal: ₹${order.subTotal}`, style: 'boldText' },
            { text: `Discount: ₹${order.discount}`, style: 'boldText' },
            { text: `Grand Total: ₹${order.finalPrice}`, style: 'boldText' },

            { text: 'Thank you for shopping with us!', style: 'footer', margin: [0, 20, 0, 0] }
        ],
        styles: {
            header: { fontSize: 18, bold: true },
            subheader: { fontSize: 14, bold: true },
            boldText: { fontSize: 12, bold: true },
            footer: { fontSize: 10, alignment: 'center' }
        }
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    
    const chunks = [];
    pdfDoc.on('data', (chunk) => chunks.push(chunk));
    pdfDoc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.transactionId}.pdf`);
        res.setHeader('Content-Type', 'application/pdf');
        res.send(pdfBuffer);
    });

    pdfDoc.end();
}

const downloadinvoice = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        console.log("Fetching order:", orderId);
        const order = await Order.findById(orderId).populate('cartItems.product');

        if (!order) {
            return res.status(404).send('Order not found');
        }

        generateInvoice(order, res);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating invoice');
    }
};


module.exports = {
    loadCheckout,
    placeOrder,
    cancelOrder,
    orderDetails,
   razorpayCreatOrder,
   verifyPayment,
   verifyCoupon,
   returnOrder,
   downloadinvoice,
   getPaymentFailed,
   repayRazorPay,
   verifyRepayRazorpay
  
};











