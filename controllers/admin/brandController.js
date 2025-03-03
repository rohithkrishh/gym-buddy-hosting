const Brand = require("../../models/brandSchema");
const product = require("../../models/productSchema")

const getBrandPage = async (req,res)=>{
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page-1)*limit;
        const brandData = await Brand.find({}).sort({createdAt:-1}).skip(skip).limit(limit);
        const totalBrands = await Brand.countDocuments();
        const totalPages = Math.ceil(totalBrands/limit);
        const reverseBrand = brandData.reverse();
        res.render("brands",{
            data:reverseBrand,
            currentPage:page,
            totalPages:totalPages,
            totalBrands:totalBrands,
        })
        
    } catch (error) {
        res.redirect("/pageerror")
    }
}



const addBrand = async (req, res) => {
    try {
      const brand = req.body.name;
      const findBrand = await Brand.findOne({ 
        brandName: { $regex: new RegExp(`^${brand}$`, 'i') } }); 
           
      console.log("dd", findBrand);
      
      if (findBrand) {
        console.log("1");
        return res.status(400).json({ success: false, message: "Brand name already exists" });
      }
      
      const image = req.file.filename;
      const newBrand = new Brand({
        brandName: brand,
        brandImage: image
      });
      await newBrand.save();
      
      // If you want to use JSON responses consistently:
      return res.status(200).json({ success: true, message: "Brand added successfully" });
      
    
    } catch (error) {
      console.log("Error in addBrand:", error);
      return res.status(500).json({ success: false, message: "An error occurred" });
      
    }
  };


 
const blockBrand = async (req,res)=>{
    try {
        const id =req.query.id;
        await Brand.updateOne({_id:id},{$set:{isBlocked:true}});
        res.redirect("/admin/brands");
    } catch (error) {
        
    }
}
const unBlockBrand = async (req,res)=>{

    try {
        const id=req.query.id;
        await Brand.updateOne({_id:id},{$set:{isBlocked:false}});
        res.redirect("/admin/brands");

    } catch (error) {
        res.redirect("/pageerror")
        
    }

}
const deleteBrand = async (req,res)=>{

    try {
        const {id} = req.query;
        if(!id){
            return res.status(400).redirect("/pageerror")
        }
        await Brand.deleteOne({_id:id});
        res.redirect("/admin/brands")
        
    } catch (error) {
        console.error("Error in deleting brand",error)
        res.status(500).redirect("/pageerror")
    }

}


module.exports={
    getBrandPage,addBrand,blockBrand,unBlockBrand,deleteBrand
}