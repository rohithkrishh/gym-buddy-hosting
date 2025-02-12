
const mongoose = require("mongoose");
const { Schema } = mongoose;

// Dynamic Variant Schema
const variantSchema = new Schema({
  categoryType: {
    type: String,
    required: true,
    enum: ["strength", "cardio",], 
  },
  weight: {
    type: Number, // For strength machines
    required: function () {
      return this.categoryType === "strength";
    },
    min: 0,
  },
  type: {
    type: String, // For cardio equipment
    enum: ["automated", "semi-automated", "manual"],
    required: function () {
      return this.categoryType === "cardio";
    },
  },
  regularPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  salePrice: {
    type: Number,
    required: true,
    validate: {
      validator: function (value) {
        return value <= this.regularPrice;
      },
      message: "Sale price cannot be greater than the regular price.",
    },
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
  },
  sku: {
    type: String,
    required: true,
    unique: true,
  },
});

// Main Product Schema
const productSchema = new Schema(
  {
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    brand: {
      type: String,
      required: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    productImages: {
      type: [String],
      required: true,
      validate: {
        validator: function (value) {
          return value.length > 0;
        },
        message: "At least one product image is required.",
      },
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    productOffer:{
    type:Number,
    default:0 , 
    },
    highestOffer:{
    type:Number,
    default:0
    },
    status: {
      type: String,
      enum: ["available", "out of stock", "discontinued"],
      required: true,
      default: "available",
    },
    variants: {
      type: [variantSchema], 
      default: [],
    },
  },
  { timestamps: true }
);


productSchema.pre('save', function (next) {
  // Check if the product has variants
  if (this.variants && this.variants.length > 0) {
    this.variants = this.variants.map((variant) => {
      if (this.highestOffer && this.highestOffer > 0) {
        variant.salePrice = variant.regularPrice - (variant.regularPrice * this.highestOffer) / 100;
      } else {
        variant.salePrice = variant.regularPrice; 
      }
      return variant; 
    });
  }
  next(); 
});


productSchema.index({ category: 1, isBlocked: 1 });

const Product = mongoose.model("Product", productSchema);
module.exports = Product;


