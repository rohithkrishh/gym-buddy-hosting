const express=require("express");
const router=express.Router();
const adminController = require("../controllers/admin/adminController");
//const { loadLogin } = require("../controllers/user/userControllers");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryControllers");
const brandController = require("../controllers/admin/brandController");
const productController = require("../controllers/admin/productController");
const orderController = require("../controllers/admin/orderController");
const couponController = require("../controllers/admin/couponController");
const salesReportController = require("../controllers/admin/salesReportController");
const {adminAuth} = require("../middlewares/auth");
const multer = require("multer")
const storage = require("../helpers/multer");
const uploads = multer({storage:storage});


router.get("/pageerror",adminController.pageerror);
//Login Management
router.get("/login",adminController.loadLogin);
router.post("/login",adminController.login);
router.get("/",adminAuth,adminController.loadDashboard);
router.get("/filterData",adminAuth,adminController.filterData);
router.get("/logout",adminController.logout);



//Customer Management
router.get("/users",adminAuth,customerController.customerInfo)
router.get("/blockCustomer",adminAuth,customerController.customerBlocked)
router.get("/unblockCustomer",adminAuth,customerController.customerunBlocked)

//Category Management
router.get("/category",adminAuth,categoryController.categoryInfo);
router.post("/addCategory",adminAuth,categoryController.addCategory);
router.get("/listCategory",adminAuth,categoryController.getListCategory);
router.get("/unlistCategory",adminAuth,categoryController.getUnlistCategory);
router.get("/editCategory",adminAuth,categoryController.getEditCategory);
router.post("/editCategory/:id",adminAuth,categoryController.editCategory);
router.post("/addCategoryOffer",adminAuth,categoryController.addCategoryOffer);
router.post("/removeCategoryOffer",adminAuth,categoryController.removeCategoryOffer);

//brand Management
router.get("/brands",adminAuth,brandController.getBrandPage);
router.post("/addBrand",adminAuth,uploads.single("image"),brandController.addBrand);
router.get("/blockBrand",adminAuth,brandController.blockBrand);
router.get("/unBlockBrand",adminAuth,brandController.unBlockBrand);
router.get("/deleteBrand",adminAuth,brandController.deleteBrand);

//Product Management
router.get( "/addProducts",adminAuth,productController.getProductAddPage);
router.post("/addProducts",adminAuth,uploads.array("images",4),productController.addProducts);
router.get("/products",adminAuth,productController.getAllProducts);
router.post("/addProductOffer",adminAuth,productController.addProductOffer);
router.post("/removeProductOffer",adminAuth,productController.removeProductOffer);
router.get("/blockProduct",adminAuth,productController.blockProduct);
router.get("/unblockProduct",adminAuth,productController.unblockProduct)

router.get("/editProduct",adminAuth,productController.getEditProduct);
router.post("/editProduct/:id",adminAuth,uploads.array("images",4),productController.editProduct);
router.post("/deleteImage",adminAuth,productController.deleteSingleImage)

//Order Management
router.get("/orderDetails/:id",orderController.getOrderDetails)
router.get("/orderList",adminAuth,orderController.getOrderList);
router.post("/orders/:orderId/status",adminAuth,orderController.updateOrderStatus);


//coupon Management

router.get("/coupon",adminAuth,couponController.CouponPage)
router.post("/addCoupon",adminAuth,couponController.addCopon)
router.get("/deleteCoupon",adminAuth,couponController.deleteCoupon)

//Sales Report
router.get("/sales-report",adminAuth,salesReportController.loadSalesReport);
router.post("/filtered-sales-data",adminAuth,salesReportController.filteredData);
router.get("/orders/download/pdf",adminAuth,salesReportController.pdfDownload);
router.get("/orders/download-excel",adminAuth,salesReportController.excelDownload)




module.exports = router













