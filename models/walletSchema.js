const mongoose = require("mongoose");
const { Schema } = mongoose;

const walletSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    balance: {
      type: Number,
      default: 0, // Initial balance is 0
      required: true
    },
    transactions: [
      {
        transactionType: {
          type: String,
          required: true,
          enum: ["Credit", "Debit"] // Track if the transaction is adding or deducting balance
        },
        amount: {
          type: Number,
          required: true
        },
        description: {
          type: String // E.g., "Order refund", "Promotional credit"
        },
        createdOn: {
          type: Date,
          default: Date.now
        }
      }
    ],
    createdOn: {
      type: Date,
      default: Date.now
    },
    updatedOn: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

walletSchema.pre("save", function (next) {
  this.updatedOn = Date.now();
  next();
});

const Wallet = mongoose.model("Wallet", walletSchema);

module.exports = Wallet;






const userSchema = new Schema({
  name: {
      type: String,
      required: true,
  },
  email: {
      type: String,
      required: true,
      unique: true
  },
  phone: {
      type: String,
      required: false,
      unique: false,
      sparse: true,
      default: null
  },
  googleId: {
      type: String,
      require: false,
      unique: true,
      sparse: true,
  }
  ,
  password: {
      type: String,
      required: false
  },
  isBlocked: {
      type: Boolean,
      default: false
  },
  isAdmin: {
      type: Boolean,
      default: false
  },
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
  orderHistory: [{
      type: Schema.Types.ObjectId,
      ref: "Order"
  }],
  CreatedOn: {
      type: Date,
      default: Date.now,
  },
  referalPoints: {
      type: Number,
      default:0
  },
  redeemed: {
      type: Boolean
  },
  redeemedUser: [{
      type: Schema.Types.ObjectId,
      ref: "User"
  }],
  searchHistory: [{
      category: {
          type: Schema.Types.ObjectId,
          ref: 'Category',
      },
      brand: {
          type: String
      },
      searchOn: {
          type: Date,
          default: Date.now
      }
  }]
})
