const mongoose = require("mongoose");
const { Schema } = mongoose;

const cartSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    items: [
        {
            product: {
                type: Schema.Types.ObjectId,
                ref: "Product",
                required: true
            },
            variantId: {
                type: Schema.Types.ObjectId,
                ref: "Product.variants", 
                required: true
            },
            // variantDetails: {
            //     type: Object, // Store additional variant details (e.g., weight, size)
            //     default: null
            // },
            quantity: {
                type: Number,
                required: true,
                min: 1,
                default: 1
            },
            salePrice: {
                type: Number, 
                required: true
            }
        }
    ],
    totalItems: {
        type: Number, 
        default: 0
    },
    totalPrice: {
        type: Number, 
        default: 0
    },
    createdOn: {
        type: Date,
        default: Date.now
    },
    updatedOn: {
        type: Date,
        default: Date.now
    }
});

// Middleware to calculate totals before saving
cartSchema.pre("save", function (next) {
    this.totalItems = this.items.reduce((acc, item) => acc + item.quantity, 0);
    this.totalPrice = this.items.reduce((acc, item) => acc + item.quantity * item.salePrice, 0);
    this.updatedOn = Date.now();
    next();
});

const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;
