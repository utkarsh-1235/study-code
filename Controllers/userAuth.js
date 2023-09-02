const User =  require('../Models/user');
const AppError = require('../Utils/error.util');
const bcrypt = require('bcrypt');
const Otp = require('../Models/otp');
const jwt = require('jsonwebtoken');
const otpGenerator = require('otp-generator');
const mailSender = require('../Utils/mailSender');
const Profile = require('../Models/profile');
const {passwordUpdated} = require('../mailTemplate/updatedPassword');
const emailValidator = require('email-validator');

const sendOtp = async(req, res, next)=>{
    try{

        //fetch email
        const {email} = req.body;
    
    
        //check user if already exists
        const userExist = await User.findOne({email});
    
        // user not registered
        if(!userExist){
            return next(new AppError("user not registerd",401))
        }
    
        //Generate otp
    
        let otp = otpGenerator.generate(6, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false
        });
        console.log(`generated otp are  : - > ${otp}`);
    
        // check unique otp or not
        let result = await Otp.findOne({ otp: otp })
        while (result) {
            otp = otpGenerator.generate(6, {
                upperCaseAlphabets: false,
                lowerCaseAlphabets: false,
                specialChars: false
            });
            result = await Otp.findOne({ otp: otp })
        }
        const otpPayload = { email, otp }
    
        // create an entry in db
        const otpBody = await Otp.create(otpPayload)
    
        // return success response
        return res.status(200).json({
            success: true,
            message: "otp sent successfully",
            data: otpBody
        })
    }
    catch(err){
        console.log(`not able to generate otp  ${err}`);
        return next(new AppError(err.message, 500))
    }


}
const signUp = async (req, res, next)=>{
    

        const {
            firstName,
            lastName,
            email,
            password,
            accountType,
            confirmPassword,
            otp
        } = req.body;
   
        console.log(firstName, lastName, email, password, accountType, confirmPassword,otp);
        //validate
        if(!firstName || !lastName || !email || !password || !accountType || !confirmPassword || !otp){
                 return next(new AppError("please fill all the fields",403));           
        }

         //validate email using npm package "email-validator"
      const validEmail = emailValidator.validate(email);
      if (!validEmail) {
      return next(new AppError("Please provide a valid email address 📩", 400))
       }
        try{
        // check user is already registered or not
        const userExist = await User.findOne({email})
   
        //user exist 
        if(userExist){
             return next(new AppError("user already registered", 400))
        }
   
        // verify the password and confirm password
        if(password != confirmPassword){
           return next(new AppError("password and confirmpassword not match", 400));
        }
   
        // find most resent otp stored for the user 
        const resentOtp = await Otp.find({ email }).sort({ createdAt: -1 }).limit(1)
        console.log(`resentOtp : -> ${resentOtp}`);
        console.log(`${email}`);
               
         // validate otp 
         if (resentOtp.length === 0) {
           return next(new AppError("otp not found", 400))
       } else if (otp != resentOtp[0].otp) {
           return next(new AppError("invalid otp", 400))
       }
   
        // hash the password 
        const hashedPassword = await bcrypt.hash(password, 10)
   
       // save the entry in the db
       const profileDetail = await Profile.create({
           gender: null,
           dateOfBirth: null,
           about: null,
           contactNumber: null,
       })
       const user = await User.create({
           firstName,
           lastName,
           email,
           password: hashedPassword,
           accountType,
           additionalDetails: profileDetail._id,
           image: `https://api.dicebear.com/5.x/initials/svg?seed=${firstName} ${lastName}`
       })
       // return response
       return res.status(200).json({
           success: true,
           message: "user created successfully",
           data: user
       })
    }
    catch(err){
        return next(new AppError(err.message, 400));
    }
}

  
const login = async(req, res, next)=>{
    try {
        // fetch data 
        const { email, password } = req.body

        // validate data 
        if (!email || !password) {
            return next(new AppError("please fill all the fields", 403))

        }

        // check user exit or not 
        const user = await User.findOne({ email }).populate("additionalDetails")
        if (!user) {
            return next(new AppError("user is not registered", 401))
        }

        // generate token after verifying the password
        if (await bcrypt.compare(password, user.password)) {
            const payload = {
                id: user._id,
                email: user.email,
                accountType: user.accountType
            }
            const token = jwt.sign(payload, process.env.JWT_SECRET, {
                expiresIn: '24h'
            })
            user.token = token
            user.password = undefined
            // return success response
            const options = {
                expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                httpOnly: true
            }
            return res.cookie("token", token, options).status(200).json({
                success: true,
                message: "login successfully",
                user,
                token
            })
        } else {
            return next(new AppError("incorrect password", 401))
        }
    } catch (err) {
        console.log(`not able to login ${err}`);
        return next(new AppError(err.message, 400))
    }
}

const changePassword = async (req, res) => {
    try {
        // Get user data from req.user
        const userDetails = await User.findById(req.user.id)

        // Get old password, new password, and confirm new password from req.body
        const { oldPassword, newPassword } = req.body

        // Validate old password
        const isPasswordMatch = await bcrypt.compare(
            oldPassword,
            userDetails.password
        )
        if (!isPasswordMatch) {
            // If old password does not match, return a 401 (Unauthorized) error
            return res
                .status(401)
                .json({ success: false, message: "The password is incorrect" })
        }

        // Update password
        const encryptedPassword = await bcrypt.hash(newPassword, 10)
        const updatedUserDetails = await User.findByIdAndUpdate(
            req.user.id,
            { password: encryptedPassword },
            { new: true }
        )

        // Send notification email
        try {
            const emailResponse = await mailSender(
                updatedUserDetails.email,
                "Password for your account has been updated",
                passwordUpdated(
                    updatedUserDetails.email,
                    `Password updated successfully for ${updatedUserDetails.firstName} ${updatedUserDetails.lastName}`
                )


            )
            console.log("Email sent successfully:", emailResponse.response)
        } catch (error) {
            // If there's an error sending the email, log the error and return a 500 (Internal Server Error) error
            console.error("Error occurred while sending email:", error)
            return res.status(500).json({
                success: false,
                message: "Error occurred while sending email",
                error: error.message,
            })
        }

        // Return success response
        return res
            .status(200)
            .json({ success: true, message: "Password updated successfully" })
    } catch (error) {
        // If there's an error updating the password, log the error and return a 500 (Internal Server Error) error
        console.error("Error occurred while updating password:", error)
        return res.status(500).json({
            success: false,
            message: "Error occurred while updating password",
            error: error.message,
        })
    }
}
module.exports = { sendOtp,
                   signUp,
                   login,
                   changePassword};