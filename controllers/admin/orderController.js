const mongoose = require('mongoose');
const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");


const getOrderList = async(req,res)=>{
try {
  

    const page = parseInt(req.query.page) || 1;
    const ITEMS_PER_PAGE = 20;
    const totalOrders = await Order.countDocuments()
    const totalPages = Math.ceil(totalOrders/ITEMS_PER_PAGE);

    const orders = await Order.find().populate("cartItems.product")
    .skip((page-1)*ITEMS_PER_PAGE)
    .limit(ITEMS_PER_PAGE)
    .sort({createdAt: -1});

  
    
    res.render("orderList",{orders,
        totalPages,
        currentPage:page
    })
    
} catch (error) {
    
}

}


const getOrderDetails = async (req, res) => {
    try {
        const orderId  = req.params.id; 
        console.log("ddddd",orderId)

        
        const order = await Order.findById(orderId)
            .populate("cartItems.product", ) 
            

            console.log(order)

        if (!order) {
            return res.status(404).render("error", { message: "Order not found" }); 
        }

        console.log("ddddddd")
        res.render("adminOrderdetails", { order });
    } catch (error) {
        console.error("Error fetching order details:", error);
        res.status(500).render("error", { message: "Internal server error" }); 
    }
};


const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params; 
        const { status } = req.body; 

        if (!status) {
            return res.status(400).json({ message: "Status is required" });
        }

        
        const order = await Order.findByIdAndUpdate(
            orderId,
            { orderStatus: status },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        res.redirect("/admin/orderList"); 
    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};




module.exports = {

    getOrderList,
    updateOrderStatus,
    getOrderDetails
}
