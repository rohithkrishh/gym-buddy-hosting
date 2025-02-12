const mongoose = require("mongoose");

const {Schema} = mongoose

const couponSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    createdOn: {
        type: Date,
        default: Date.now,
        required: true
    },
    expireOn: {
        type: Date,
        required: true
    },
    offerType: {
        type: String,
        enum: ['flat', 'percentage'], 
        required: true
    },
    offerValue: {
        type: Number, 
        required: true
    },
    minimumPrice: {
        type: Number,
        required: true
    },
    isList: {
        type: Boolean,
        default: true
    },
    usageLimit: {
        type: Number,
        required: false
    },
    userId: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }]
});


const Coupon = mongoose.model("Coupon", couponSchema)

module.exports = Coupon