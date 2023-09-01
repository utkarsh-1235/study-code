const User =  require('../Models/user');
const AppError = require('../Utils/error.util');
const bcrypt = require('bcrypt');
const Otp = require('otp');

const signUp = async (req, res, next)=>{
    try{

        const {
            firstName,
            lastName,
            email,
            password,
            accountType,
            confirmPassword,
            otp
        } = req.body;
   
        //validate
        if(!firstName || !lastName || !email || !password || !accountType || !confirmPassword || !otp){
                 return next(new AppError("please fill all the fields",403));           
        }
   
        // check user is already registered or not
        const userExist = await User.findOne({email})
   
        //user not exist
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
           return res.status(400).json({
               success: false,
               message: "otp not found"
           })
       } else if (otp != resentOtp[0].otp) {
           return res.status(400).json({
               success: false,
               message: "invalid otp"
           })
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


module.exports = { signUp,
                   login};