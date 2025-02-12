// const User = require("../../models/userSchema");
 

// const customerInfo =async (req,res)=>{
// try{
// let search ="";
// if(req.query.search){
// search=req.query.search;

// }
// let  page=1
// if(req.query.page){
//     page=req.query.page
// }
// const limit=3
// const userData = await User.find({
//     isAdmin:false,
//     $or:[
//         {name:{$regex:".*"+search+".*"}},
//         {email:{$regex:".*"+search+".*"}},

//     ],
// })

// .limit(limit*1)
// .skip((page-1)*limit)
// .exec();

// const count = await User.find({  
//     isAdmin:false,
//     $or:[
//         {name:{$regex:".*"+search+".*"}},
//         {email:{$regex:".*"+search+".*"}},
// ],
// }).countDocuments();

// res.render("customers")

// }catch(error){

// }

// }

// module.exports = {customerInfo,}


const User = require("../../models/userSchema");

const customerInfo = async (req, res) => {
  try {
    let search = "";
    if (req.query.search) {
      search = req.query.search;
    }
const page = req.query.page || 1 ;
const limit = 6;


    // Fetch filtered and paginated data
    const userData = await User.find({
      isAdmin: false,
      $or: [
        { name: { $regex: ".*" + search + ".*", $options: "i" } },
        { email: { $regex: ".*" + search + ".*", $options: "i" } },
      ],
    })
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    // Get the total number of matching documents for pagination
    const count = await User.countDocuments({
      isAdmin: false,
      $or: [
        { name: { $regex: ".*" + search + ".*", $options: "i" } },
        { email: { $regex: ".*" + search + ".*", $options: "i" } },
      ],
    });

    // Calculate total pages
    const totalPages = Math.ceil(count / limit);

    // Render the EJS template with the data
    res.render("customers", {
      data: userData, 
      totalPages,
      currentPage: page, 
      search, 
    });
  } catch (error) {
    console.error("Error fetching customer information:", error);
    res.status(500).send("An error occurred while fetching customer information.");
  }
};

const customerBlocked = async (req,res)=>{
   try {
    let id=req.query.id;
    await User.updateOne({_id:id},{$set:{isBlocked:true}})
    res.redirect("/admin/users")

   } catch (error) {
    res.redirect("/pageerror");
   }

}

const customerunBlocked = async (req,res)=>{
   try {
    let id = req.query.id;
    await User.updateOne({_id: id},{ $set:{ isBlocked: false}});
    res.redirect("/admin/users")
   } catch (error) {
    res.redirect("/pageerror")
   }

};

module.exports = { customerInfo,customerBlocked,customerunBlocked };
