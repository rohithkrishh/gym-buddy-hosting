const mongoose = require("mongoose");
const { Schema } = mongoose;

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true, // Removes extra spaces
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    isListed: {
        type: Boolean,
        default: true,
    },
    categoryOffer: {
        type: Number,
        default: 0,
        min: 0, // Offer cannot be negative
        max: 100, // Assuming it's a percentage
    },
    type: {
        type: String,
        required: true,
        enum: ["strength", "cardio"], 
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Category = mongoose.model("Category", categorySchema);
module.exports = Category;
