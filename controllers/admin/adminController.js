const User = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Order = require("../../models/orderSchema");


const pageerror = async (req,res)=>{
res.render("admin-error")
}

const loadLogin = (req,res)=>{

if(req.session.admin){

    return res.redirect("/admin")
}


res.render("adminlogin",{message:null})

}


const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin user with the provided email
    const admin = await User.findOne({ email, isAdmin: true });

    if (!admin) {
      
        
      return res.render("adminlogin",{message:"You are not a authenticted admin"}); 
    }

    // Check if the password matches
    const passwordMatch = await bcrypt.compare(password, admin.password);

    if (passwordMatch) {
      
      req.session.admin = true;

      return res.redirect('/admin') 
    }

  

  } catch (error) {
    console.error("Login error:", error);

    
    return res.redirect("/admin/pageerror");
  }
};



const loadDashboard = async (req, res) => {
  try {

      // Best selling product order
      const product = await Order.aggregate([
          { $unwind: "$cartItems" },
          {
              $group: {
                  _id: "$cartItems.product",
                  totalOrder: { $sum: "$cartItems.quantity" },
              },
          },
          {
              $lookup: {
                  from: "products",
                  localField: "_id",
                  foreignField: "_id",
                  as: "productDetails",
              },
          },
          { $unwind: "$productDetails" },
          {
              $project: {
                  _id: 1,
                  productName: "$productDetails.productName",
                  totalOrder: 1,
                  productImage: { $arrayElemAt: ["$productDetails.productImages", 0] },
              },
          },
          { $sort: { totalOrder: -1 } },
          { $limit: 10 },
      ]);

      // Best selling category order
      const category = await Order.aggregate([
          { $unwind: "$cartItems" },
          {
              $lookup: {
                  from: "products",
                  localField: "cartItems.product",
                  foreignField: "_id",
                  as: "productDetails",
              },
          },
          { $unwind: "$productDetails" },
          {
              $group: {
                  _id: "$productDetails.category",
                  totalOrder: { $sum: "$cartItems.quantity" },
              },
          },
          {
              $lookup: {
                  from: "categories",
                  localField: "_id",
                  foreignField: "_id",
                  as: "categoryDetails",
              },
          },
          { $unwind: "$categoryDetails" },
          {
              $project: {
                  categoryName: "$categoryDetails.name",
                  totalOrder: 1,
              },
          },
          { $sort: { totalOrder: -1 } },
          { $limit: 10 }, // Limit to top 10 categories
      ]);


      // chart data for product
      const productData = product.map((item) => ({
          productName: item.productName,
          totalOrders: item.totalOrder
         
      }));

    


      // chart data for category
      const categoryData = category.map((cat) => ({
          categoryName: cat.categoryName,
          totalOrder: cat.totalOrder,
      }));

      res.render("dashboard", { product, category, productData, categoryData })

  } catch (error) {
      console.error("Error in Loading Admin Dashboard", error);
  }
}


const logout = async(req,res)=>{

  try {
    req.session.destroy(err=>{
if(err){
  console.log("Error destroying session",err);
  return res.redirect("/pageerror")
}
res.redirect("/admin/login")
    })
    
  } catch (error) {
    console.log("unexpected error during logout",error);
    res.redirect("/pageerror")
  }
 

}


const filterData = async (req, res) => {
    try {
        const { filterValue } = req.query;
        console.log("Query Filter Value:", filterValue);

        const today = new Date();
        let dayStart, dayEnd;

        
        if (filterValue === "daily") {
            dayStart = new Date();
            dayStart.setHours(0, 0, 0, 0);
            dayEnd = new Date();
            dayEnd.setHours(23, 59, 59, 999);
        } else if (filterValue === "weekly") {
            const firstDayOfWeek = new Date();
            firstDayOfWeek.setDate(today.getDate() - today.getDay());
            firstDayOfWeek.setHours(0, 0, 0, 0);
            
            const lastDayOfWeek = new Date(firstDayOfWeek);
            lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
            lastDayOfWeek.setHours(23, 59, 59, 999);

            dayStart = firstDayOfWeek;
            dayEnd = lastDayOfWeek;
        } else if (filterValue === "monthly") {
            dayStart = new Date(today.getFullYear(), today.getMonth(), 1);
            dayEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        } else if (filterValue === "yearly") {
            dayStart = new Date(today.getFullYear(), 0, 1);
            dayEnd = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
        } else {
            dayStart = new Date(0);
            dayEnd = new Date();
        }

        console.log("Date Range:", { dayStart, dayEnd });

        // 🔹 Aggregation for Top Products
        const products = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: dayStart, $lte: dayEnd }
                }
            },
            { $unwind: "$cartItems" },
            {
                $group: {
                    _id: "$cartItems.product",
                    totalOrder: { $sum: "$cartItems.quantity" }
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            {
                $project: {
                    productName: "$productDetails.productName",
                    totalOrder: 1,
                    productImage: { $arrayElemAt: ["$productDetails.productImages", 0] }
                }
            },
            { $sort: { totalOrder: -1 } },
            { $limit: 10 }
        ]);

        console.log("Top Products:", products);

        // 🔹 Aggregation for Top Categories
        const categories = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: dayStart, $lte: dayEnd }
                }
            },
            { $unwind: "$cartItems" },
            {
                $lookup: {
                    from: "products",
                    localField: "cartItems.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: { path: "$productDetails", preserveNullAndEmptyArrays: true } }, // Preserve empty values
            {
                $group: {
                    _id: "$productDetails.category",
                    totalOrder: { $sum: "$cartItems.quantity" }
                }
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "_id",
                    foreignField: "_id",
                    as: "categoryDetails"
                }
            },
            { $unwind: { path: "$categoryDetails", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    categoryName: "$categoryDetails.name",
                    totalOrder: 1
                }
            },
            { $sort: { totalOrder: -1 } }
        ]);

        console.log("Top Categories:", categories);

        // 🔹 Preparing Chart Data
        const productData = products.map(product => ({
            productName: product.productName,
            totalOrder: product.totalOrder
        }));

        const categoryData = categories.map(category => ({
            categoryName: category.categoryName,
            totalOrder: category.totalOrder
        }));

        res.status(200).json({ products, categories, productData, categoryData });
    } catch (error) {
        console.error("Error in filtering data:", error);
        res.status(500).json({ message: "Internal Server Error." });
    }
};




module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageerror,
    logout,
    filterData
}