const Coupon = require("../../models/couponSchema")

const CouponPage = async(req,res)=>{
    try {
        const coupon = await Coupon.find();
       
        res.render("coupon",{coupon})
    } catch (error) {
        console.error("Error in loading copen page",error);
    }
}


const addCopon = async(req,res)=>{
    const { code, minPurchase, offerType, offerValue, UsageLimit, expiry, status } = req.body;

    try {
        const newCoupon = new Coupon({
            name: code,
            offerType,
            offerValue,
            minimumPrice: minPurchase,
            usageLimit: UsageLimit,
            expireOn: expiry,
            isList: status === 'active',
        });

        await newCoupon.save();
        res.redirect('/admin/coupon'); // Redirect to the coupon management page
    } catch (error) {
        console.error('Error adding coupon:', error);
        res.status(500).send('Internal Server Error');
    }
}



const deleteCoupon = async(req,res)=>{
    try {
        const couponId = req.query.couponId;
        console.log("cop id",couponId);

        await Coupon.findByIdAndDelete(couponId);
        res.redirect("/admin/coupon")
        console.log("coupon deleted successfully");
        
    } catch (error) {
        console.error("Error in deleting coupon");
        res.status(500).send("An Error occured while deleting the coupon..")       
    }
}



module.exports ={
    CouponPage,
    addCopon,
    deleteCoupon,
  
}