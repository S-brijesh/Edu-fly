const Profile = require("../models/Profile");
const User = require("../models/User");
const { uploadImageToCloudinary } = require("../utils/imageUploader");

exports.updateProfile = async(req,res)=>{
    try{
        //get data
        const {dateOfBirth="",about="",gender,contactNumber}=req.body;
        //get user id
        const id = req.user.id;
        // validation
        if(!gender || !contactNumber){
            return res.status(400).json({
                success:false,
                message:'All fields are required'
            });
        }
        //find Profile
        const userDetails = User.findById(id);
        const profileId = userDetails.additionalDetails;
        const profileDetails = Profile.findById(profileId);

        //update profile
        profileDetails.dateOfBirth=dateOfBirth;
        profileDetails.about=about;
        profileDetails.gender = gender;
        profileDetails.contactNumber = contactNumber;
        await profileDetails.save();
        //return response
        return res.status(200).json({
            success:true,
            message:'Profile updated successfully',
            profileDetails
        });
    }catch(error){
        return res.status(500).json({
            success:false,
            message:'Error in updating Profile',
            error:error.message
        });
    }
};

//delete account
// explore how to schedule this deletion task
exports.deleteAccount = async(req,res)=>{
    try{
        // get id
        const userId = req.user.id;
        //validation
        const userDetails = await User.findById(userId);
        if(!userDetails){
            return res.status(404).json({
                success:false,
                message:'User no found'
            });
        }

        // delete profile
        await Profile.findByIdAndDelete({_id:userDetails.additionalDetails});
        // TODO: unenroll users from all enrolled courses
        await User.findByIdAndDelete({_id:userId});
        return res.status(200).json({
            success:true,
            message:'User deleted successfully'
        });
    }catch(error){
        return res.status(500).json({
            success:false,
            message:'Error in deleting user',
            error:error.message
        })
    }
}

exports.getAllUserDetails = async(req,res)=>{
    try{
        const id =req.user.id;

        const userDetails = await User.findById(id).populate("additionalDetails").exec();
        return res.status(200).json({
            success:true,
            message:'User data fetched successfully'
        });

    }catch(error){
        return res.status(500).json({
            success:false,
            message:error.message,
        });
    }
}
exports.updateDisplayPicture = async (req, res) => {
    try {
      const displayPicture = req.files.displayPicture
      const userId = req.user.id
      const image = await uploadImageToCloudinary(
        displayPicture,
        process.env.FOLDER_NAME,
        1000,
        1000
      )
      console.log(image)
      const updatedProfile = await User.findByIdAndUpdate(
        { _id: userId },
        { image: image.secure_url },
        { new: true }
      )
      res.send({
        success: true,
        message: `Image Updated successfully`,
        data: updatedProfile,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      })
    }
};
  
exports.getEnrolledCourses = async (req, res) => {
    try {
      const userId = req.user.id
      const userDetails = await User.findOne({
        _id: userId,
      })
        .populate("courses")
        .exec()
      if (!userDetails) {
        return res.status(400).json({
          success: false,
          message: `Could not find user with id: ${userDetails}`,
        })
      }
      return res.status(200).json({
        success: true,
        data: userDetails.courses,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      })
    }
};