const User = require("../models/User");                                                                                            ;
const mailSender = require("../utils/mailSender");
const bcrypt = require("bcrypt");
//resetPasswordToken
exports.resetPassowordToken = async(req,res)=>{
    try{

        // get email form req body
        const email = req.body;
        // check if user exists with this email id
        const user = await User.findOne({email:email});
        if(!user){
            return res.status(401).json({
                success:false,
                message:'This email id is not registered with us'
            });
        }
    
        // generate token
        const token = crypto.randomBytes(20).toString("hex");
    
        // update user by adding token and expiration time
        const updatedDetails = await User.findOneAndUpdate({email:email},
                                                        {
                                                            token:token,
                                                            resetPasswordExpires: Date.now()+5*60*1000
                                                        },
                                                    {new:true});
        // create url
        const url = `http://localhost:3000/update-password/${token}`;
        //send mail containing the url
        await mailSender(email,"Password reset link",`Reset your edufly account's password by clicking on this link ${url}`);
        //return response
        return res.json({
            success:true,
            message:'Email sent successfully, please check email and change password'
        });
    }catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message:'Something went wrong while resetting password'
        })
    }

}

// resetPassword
exports.resetPassword = async(req,res)=>{
    try{
        
        // data fetch
        const {password,confirmPassword,token} = req.body;
        // validation
        if(password !== confirmPassword){
            return res.status(401).json({
                success:false,
                message:'Passowords do not match'
            });
        }

        //get user details from db using token
        const userDetails = User.findOne({token:token});
        // if no entry found invalid token
        if(!userDetails){
            return res.json({
                success:false,
                message:'Token is invalid'
            });
        }
        // check if token time is expired or not
        if(userDetails.resetPasswordExpires > Date.now()){
            return res.json({
                success:false,
                message:'Token is expired, please regerate your token'
            });
        }
        // hash password
        const hashedPassword = bcrypt.hash(password,10);

        // password update
        await User.findOneAndUpdate({token:token},{password:hashedPassword},{new:true});
        return res.status(200).json({
            success:true,
            message:'Password reset successful'
        });

    }catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message:'Something went wrong while resetting password'
        })
    }

}