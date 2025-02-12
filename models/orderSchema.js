
const mongoose = require("mongoose");
const { Schema } = mongoose;

const orderSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    
    cartItems: [
      {
        productName: {type: String},
        productImages: {type: String},
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        variant: { type: Schema.Types.ObjectId, ref: "Variant" },
        quantity: { type: Number, required: true },
        salePrice: { type: Number, required: true },
      }
    ],
    shippingAddress: {
      addressType: { type: String, required: true },
      name: { type: String, required: true },
      city: { type: String, required: true },
      landMark: { type: String },
      state: { type: String, required: true },
      pincode: { type: Number, required: true },
      phone: { type: String, required: true },
      altPhone: { type: String }
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["Wallet", "Online", "COD"]
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending"
    },
    orderStatus: {
      type: String,
      required: true,
      enum: ["Pending", "Processing", "Shipped", "Out for Delivery", "Delivered", "Cancelled","Returned"],
      default: "Pending"
    },
    coupon: {
      code: { type: String },
      discountAmount: { type: Number, default: 0 }
    },
    totalPrice: { 
      type: Number, 
      required: true },
    discount: {
       type: Number,
        default: 0 },
    finalPrice: { 
      type: Number, 
      required: true },
    transactionId: { 
      type: String,
      required:true },
    isPaid: { 
      type: Boolean, 
      default: false },
    paidAt: { type: Date },
    isDelivered: { 
      type: Boolean, 
      default: false },
    deliveredAt: { type: Date },
    cancellationReason: { 
      type: String,
      default:null
    },
    returnReason: {
      type: String ,
      default:null,
    }
  },
 
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
module.exports= Order

