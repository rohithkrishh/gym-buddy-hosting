
const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String
    },
    email: {
      type: String,
      required: true,
      unique: true
    },
    phone: {
      type: String,
      default: null,
      sparse: true
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true
    },
    password: {
      type: String
    },
    isBlocked: {
      type: Boolean,
      default: false
    },
    isAdmin: {
      type: Boolean,
      default: false
    },
    // cart: {
    //   type: Schema.Types.ObjectId,
    //   ref: "Cart"
    // },
    wallet: {
      type: {
          balance: { type: Number, default: 0 },
          transactions: {
              type: [
                  {
                      type: {
                          type: String,
                          enum: ["credit", "debit"],
                          required: true,
                      },
                      amount: {
                          type: Number,
                          required: true,
                      },
                      description: {
                          type: String,
                          required: true,
                      },
                      date: {
                          type: Date,
                          default: Date.now,
                      },
                  },
              ],
              default: [],
          },
      },
      default: { balance: 0, transactions: [] },
  },
    wishlist: [{
      type: Schema.Types.ObjectId,
      ref: "Wishlist"
    }],
    orderHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Order"
      }
    ],
    referalCode: {
      type: String,
      default:null,
      sparse:true,
    },
    redeemed: {
      type: Boolean
    },
    redeemedUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    searchHistory: [
      {
        category: {
          type: Schema.Types.ObjectId,
          ref: "Category"
        },
        brand: {
          type: String
        },
        searchOn: {
          type: Date,
          default: Date.now
        }
      }
    ],
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    resetPasswordToken: {
      type: String
    },
    resetPasswordExpires: {
      type: Date
    }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);


module.exports = User;
