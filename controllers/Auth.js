const User = require("../models/User");
const OTP = require("../models/OTP");
const otpGenerator = require("otp-generator");
const mailSender = require("../utils/mailSender");
const { passwordUpdated } = require("../mail/templates/passwordUpdate");
const bcrypt = require("bcrypt");
const Profile = require("../models/Profile");
const jwt = require("jsonwebtoken");
require("dotenv").config();
exports.sendOTP = async (req,res)=>{
    try{
        // fetch the email from request body
        // verify if user already exists
        const {email} = req.body;
        const checkUser = await User.findOne({email});
        if(checkUser){
            return res.status(401).json({
                sucess:false,
                message: 'User email id is already registered'
            });
        }

        // generate otp
        var otp = otpGenerator.generate(6,{
            upperCaseAlphabets:false,
            lowerCaseAlphabets:false,
            specialChars:false
        });
        console.log("generated otp is :",otp);

        // check if generated otp is unique
        let result = await OTP.findOne({otp});
        while(result){
            otp = otpGenerator(6,{
                upperCaseAlphabets:false,
            });
            result = await OTP.findOne({otp});
        }

        // now create entry for OTP in database
        const otpPayload = {email,otp};
        const otpBody = await OTP.create(otpPayload);
        console.log(otpBody);

        // return successful response
        return response.status(200).json({
            success:true,
            message:'Otp generated successfully',
            otp
        });  
    }
    catch(error){
        console.log("Error in generating otp",error.message);
        return res.status(500).json({
            success:false,
            message:error.message
        })
    }
}

// signup 
exports.signup = async(req,res)=>{
    try{
        // fetch the data from request body
        const{
            firstName,
            lastName,
            email,
            password,
            confirmPassword,
            otp,
            accountType,
            contactNumber
        }=req.body;

        if(!firstName||!lastName||!email||!password||!confirmPassword||!otp){
            return res.status(403).json({
                success:false,
                message:"All fields are required"
            });
        }
        // match passowrd and confirmpassword
        if(password !== confirmPassword){
            return res.status(400).json({
                success:false,
                message:"Password and confirm passoword do not match. Please fill details carefully"
            });
        }

        //check if user already exists with this email id
        const existingUser = await User.findOne({email});
        if(existingUser){
            return res.status(400).json({
                success:false,
                message:"User is already registered with this email id"
            });
        }

        // find the most recent otp for User
        const recentOtp = await OTP.find({email}).sort({createdAt:-1}).limit(1);
        console.log(recentOtp);
        //validate otp
        if(recentOtp.length == 0){
            // otp not found
            return res.status(400).json({
                success:false,
                message:'OTP not found'
            });
        }else if(otp != recentOtp[0].otp){
            // invalid otp
            return res.status(400).json({
                success:false,
                message:'Invalid OTP'
            });
        }

        // Hash Password
        const hashedPassword = await bcrypt.hash(password,10);

        // create entry in db
        const profileDetails = await Profile.create({
            gender:null,
            dateOfBirth:null,
            about:null,
            contactNumber:null
        });
        const user = await User.create({
            firstName,
            lastName,
            email,
            contactNumber,
            password:hashedPassword,
            accountType,
            additionalDetails:profileDetails._id,
            image:`https://api.dicebear.com/5.x/initials/svg?seed=${firstName} ${lastName}`
        });
        
        // return res
        return res.status(200).json({
            success:true,
            message: 'User is registered successfully',
            user
        });
    }catch(error){
        console.log("Error in creating entry for user ",error);
        return res.status(500).json({
            success:false,
            message:'User cannot be registered. Please try again'
        })
    }

    

}

//login
exports.login = async(req,res)=>{
    try{
        const {email,password}=req.body;
        if(!email || !password){
            return res.status(403).json({
                success:false,
                message:'All fields are required, please try again '
            });
        }

        // check if user exists or not
        const user = await User.findOne({email}).populate("additionalDetails");
        if(!user){
            return res.status(401).json({
                success:false,
                message:"User is not registered, please signup first"
            });
        }

        // generate JWT after matching the password
        if(await bcrypt.compare(password,user.password)){
            const payload = {
                email:user.email,
                id:user._id,
                accountType:user.accountType
            }
            const token = jwt.sign(payload,process.env.JWT_SECRET,{
                expiresIn:"24h",
            });
            user.token = token;
            user.password = undefined;
            //create cookie and send response 
            const options = {
                expires: new Date(Date.now() + 3*24*60*60*1000),
                httpOnly:true
            }
            res.cookie("token", token, options).status(200).json({
                success:true,
                token,
                user,
                message:"Logged in successfully"
            });
        }
        else{
            res.status(401).json({
                success:false,
                message:'Password is incorrect'
            });
        }

    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message:'Login Failure, please try again'
        });
    }
};

// change password
// Controller for Changing Password
exports.changePassword = async (req, res) => {
	try {
		// Get user data from req.user
		const userDetails = await User.findById(req.user.id);

		// Get old password, new password, and confirm new password from req.body
		const { oldPassword, newPassword, confirmNewPassword } = req.body;

		// Validate old password
		const isPasswordMatch = await bcrypt.compare(
			oldPassword,
			userDetails.password
		);
		if (!isPasswordMatch) {
			// If old password does not match, return a 401 (Unauthorized) error
			return res
				.status(401)
				.json({ success: false, message: "The password is incorrect" });
		}

		// Match new password and confirm new password
		if (newPassword !== confirmNewPassword) {
			// If new password and confirm new password do not match, return a 400 (Bad Request) error
			return res.status(400).json({
				success: false,
				message: "The password and confirm password does not match",
			});
		}

		// Update password
		const encryptedPassword = await bcrypt.hash(newPassword, 10);
		const updatedUserDetails = await User.findByIdAndUpdate(
			req.user.id,
			{ password: encryptedPassword },
			{ new: true }
		);

		// Send notification email
		try {
			const emailResponse = await mailSender(
				updatedUserDetails.email,
				passwordUpdated(
					updatedUserDetails.email,
					`Password updated successfully for ${updatedUserDetails.firstName} ${updatedUserDetails.lastName}`
				)
			);
			console.log("Email sent successfully:", emailResponse.response);
		} catch (error) {
			// If there's an error sending the email, log the error and return a 500 (Internal Server Error) error
			console.error("Error occurred while sending email:", error);
			return res.status(500).json({
				success: false,
				message: "Error occurred while sending email",
				error: error.message,
			});
		}

		// Return success response
		return res
			.status(200)
			.json({ success: true, message: "Password updated successfully" });
	} catch (error) {
		// If there's an error updating the password, log the error and return a 500 (Internal Server Error) error
		console.error("Error occurred while updating password:", error);
		return res.status(500).json({
			success: false,
			message: "Error occurred while updating password",
			error: error.message,
		});
	}
};