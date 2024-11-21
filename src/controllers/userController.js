import User from "../models/userModel.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { sendEmailVerificationLink, sendPasswordVerificationLink } from "../utils/utils.js";
import SpotifyWebApi from "spotify-web-api-node";
import Language from "../models/languageModel.js";

// Function to create a new user
const createUser = async (req, res, next) => {
    const { first_name, last_name, email, password } = req.body;

    try {
        // Validate required fields: Firstname, Lastname, Email, and Password
        if (!first_name || !last_name || !email || !password) {
            return res.status(400).json({ message: "Firstname, Lastname, Email, and Password are required." });
        }

        // Check email format using regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "Invalid Email format." });
        }

        // Check if the user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(409).json({ message: "User with this email already exists." });
        }

        // Hash the password using bcrypt
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate the verification token (expires in 2 hours)
        const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "2h" });

        // Send the verification email
        const verificationEmailResponse = await sendEmailVerificationLink(email, token, first_name);

        // Check if the email sending failed
        if (verificationEmailResponse.error) {
            return res.status(500).json({ message: "Failed to send verification email, please try again later" });
        }

        // Save the new user in the database
        const user = await User.create({
            first_name,
            last_name,
            email,
            password: hashedPassword,
            verify_token: token,
            verify_token_expires: Date.now() + 7200000, // 2 hours expiration
        });

        // Send success message
        return res.status(201).send("Registered successfully. Please check your mail to verify the account");

    } catch (error) {
        console.error("Error in user creation:", error);
        return next(error); // Forward error to global error handler
    }
};

// Verify email address
const verifyEmail = async (req, res, next) => {
    try {
        const { verify_token } = req.params;

        // Find the user by the verification token
        const user = await User.findOne({ verify_token });

        if (!user) {
            return res.status(409).send("Invalid token");
        }

        // Check if the verification link has expired
        if (user.verify_token_expires <= Date.now()) {
            if (!user.verified) {
                await user.deleteOne();
                return res.status(409).send("Verification link has expired. Please register again.");
            } else {
                return res.status(400).send("Please log in to continue.");
            }
        }

        // Check if the user is already verified
        if (user.verified === true) {
            return res.status(200).json("Email is already verified. Please log in.");
        }

        // Verify the user's email
        user.verified = true;
        await user.save();
        return res.status(201).json("Email is verified. Please log in.");

    } catch (error) {
        return next(error); // Forward error to global error handler
    }
};

// const loginUser = async (req, res, next) => {
//     const { email, password } = req.body;
//     console.log(req.body);


//     // Check if both email and password are provided
//     if (!email || !password) {
//         const err = new Error("Email and Password are required.");
//         err.statusCode = 400;
//         return next(err);
//     }
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email)) {
//         return res.status(400).json({ message: "Invalid Email format." });
//     }

//     try {
//         // Find the user by email
//         const user = await User.findOne({ email });

//         // If the user doesn't exist
//         if (!user) {
//             const err = new Error("Invalid email or password.");
//             err.statusCode = 401; // Unauthorized
//             return next(err);
//         }

//         // Ensure the user is verified before allowing login
//         if (!user.verified) {
//             const err = new Error("Account verification pending. Please check your email to verify your account.");
//             err.statusCode = 409; // Conflict
//             return next(err);
//         }

//         // Compare the entered password with the stored hashed password
//         const passwordMatched = await bcrypt.compare(password, user.password);

//         if (!passwordMatched) {
//             const err = new Error("Invalid email or password.");
//             err.statusCode = 401; // Unauthorized
//             return next(err);
//         }

//         // Generate a JWT token upon successful login (expires in 30 days)
//         const token = jwt.sign(
//             { userId: user._id, email },
//             process.env.JWT_SECRET,
//             { expiresIn: 2592000 } // JWT expires in 30 days
//         );

//         user.token = token;
//         await user.save();  // Save the token to the user model
//     } catch (error) {
//         console.error("Error in login:", error);
//         return next(error);
//     }
// };
const loginUser = async (req, res, next) => {
    const { email, password } = req.body;
    console.log(req.body);  // Check if email and password are received

    // Check if both email and password are provided
    if (!email || !password) {
        return res.status(400).json({ message: "Email and Password are required." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid Email format." });
    }

    try {
        // Find the user by email
        const user = await User.findOne({ email });

        // If the user doesn't exist
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        // Ensure the user is verified before allowing login
        if (!user.verified) {
            return res.status(409).json({ message: "Account verification pending. Please check your email." });
        }

        // Compare the entered password with the stored hashed password
        const passwordMatched = await bcrypt.compare(password, user.password);

        if (!passwordMatched) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        // Generate a JWT token upon successful login
        const token = jwt.sign(
            { userId: user._id, email },
            process.env.JWT_SECRET,
            { expiresIn: 2592000 } // 30 days in seconds
        );

        user.token = token;
        const savedUser = await user.save();

        if (!savedUser) {
            return res.status(500).json({ message: "Error saving user token." });
        }

        // Send the success response with the token
        return res.status(200).json({
            message: "Login successful",
            token: token
        });

    } catch (error) {
        console.error("Error in login:", error);
        return res.status(500).json({ message: "Server error during login." });
    }
};

const generateSpotifyRefreshToken = async (req,res,next)=>{
    try {
        const spotifyAPI = new SpotifyWebApi({
			clientId: process.env.SOPTIFY_CLIENT_ID,
			clientSecret: process.env.SOPTIFY_CLIENT_SECRET
			
			
		})
		const spotifyCredentials = await spotifyAPI.clientCredentialsGrant()
		const spotifyToken = spotifyCredentials.body
		
		res.status(200).json({spotifyToken});
        
    } catch (error) {
        const err = new Error("Something went wrong,please try again later");
        err.statusCode=500;
        next(err);
        
    }
}


const getUserProfile = async(req,res,next) =>{
   const user = await User.findById(req.user._id);
   try {
    if(user){
        const profileData = {
            _id: user._id,
            first_name:user.first_name,
            last_name:user.last_name,
            email:user.email,
            languages:user.languages,
        };
        res.status(200).json({profileData})
       }else{
            res.status(404);
            const err = new Error("User Not Found");
            err.statusCode = 404;
            return next(err);
       } 
   } catch (error) {
        return next(error);
    
   }
};

const updateUserProfile = async(req,res,next) =>{
    const {first_name, last_name, email} = req.body
    try {
        const user = await User.findById(req.user._id);

        if(!user){
            const err = new Error("user not found");
            err.statusCode = 404;
            return next(err)
        }
        if(first_name || last_name){
            user.first_name = first_name || user.first_name
            user.last_name = last_name || user.last_name
        }
        if(email && email !== user.email){
            const userExists = await User.findOne({email})
            if(userExists){
                const err = new Error(`${email} is already in use , please choose different one`);
                err.statusCode = 409;
                return next(err)


            }
            user.email = email
        }
        await user.save()
        res.status(200).json({message: "updated successfully"})
        
    } catch (error) {
        return next(error);
        
    }

};

const updatePreferredLanguage = async(req,res,next) =>{
   const { languageIds } = req.body;
   try {
    const user = await User.findById(req.user._id);

    if(!user){
        const err = new Error("user not found");
        err.statusCode = 404;
        return next(err)
    }
    user.languages = languageIds
    await user.save();
    res.status(200).json({message:"Preferred Language updated Successfully"})
    
   } catch (error) {
        return next(error);
    
   }
    

};


const updatePassword = async(req,res,next)=>{
    const { password } = req.body;
    if(!password){
        const err = new Error("Password is Required!");
        err.statusCode = 400;
        return next(err);
    }
    try {
        const user = await User.findById(req.user._id);
        if(!user){
            const err = new Error("No User Found");
            err.statusCode = 404;
            return next(err);
        }
        //password hashreq.accepts(types);

        const hashedPassword = await bcrypt.hash(password,10);
        user.password = hashedPassword;
        await user.save();
        res.status(200).json({
            message:"password updated successfully!"
        });
    } catch (error) {
        return next(error);
        
    }

};

const forgotPassword = async(req,res,next)=>{
    const { email } = req.body;
    if(!email){
        const err = new Error("Email Is Required!");
        err.statusCode = 400;
        return next(err);
    }
    try {
            const user = await User.findOne({email});
            if(!user){
                const err = new Error("Invalid Email or Email Not Found!");
                err.statusCode = 400;
                return next(err);
            }

            //generate token
            const token = jwt.sign({userId:user._id,email},process.env.JWT_SECRET,{
                expiresIn:"2h"
            })
            //save token in Db
            user. reset_password_token = token;
            user.reset_password_expires = Date.now() + 7200000
            await user.save()
            //send mail
            const verificationEmailResponse = await sendPasswordVerificationLink(email,token,user.first_name)
            //handle error
            if(verificationEmailResponse.error){
                const err = new Error("Failed to send password reset link, please try again later!")
                err.statusCode = 500
                return next(err)

            }
            res.status(200).json({
                message: "password reset link sent successfully, please check your email"
            });


    } catch (error) {
        return next(error);
        
    }

};

const resetPassword = async(req,res,next)=>{
    const { token } = req.params;
    const { password } = req.body;
    if(!token){
        const err = new Error("Token is required!");
        err.statusCode = 400;
        return next(err);


    }
    if(!password){
        const err = new Error("Password is required!");
        err.statusCode = 400;
        return next(err);
    }
    try {
            // find the user by token
    const user = await User.findOne({
        reset_password_token: token,
        reset_password_expires:{$gt: Date.now()}
    })

    if(!user){
        const err = new Error("Password reset link is invalid or expired, please try again");
        err.statusCode = 400;
        return next(err);
    }
    //user found - hashed password
    const hashedPassword = await bcrypt.hash(password,10);
    user.password = hashedPassword;
    user.reset_password_token = undefined;
    user.reset_password_expires = undefined;
    await user.save();
    res.status(200).json({message:"Password updated successfully, please login"})

    } catch (error) {
        return next(error);
        
    }
};

const saveSpotifyStory = async(req,res,next)=>{
    const { storyId } = req.body;
    if(!storyId){
        const err = new Error("StoryId is required!");
        err.statusCode = 400;
        return next(err);
    }
    try {
        const user = await User.findById(req.user._id);
        if(!user){
            const err = new Error("user not found!");
            err.statusCode = 404;
            return next(err);
        }
        if(user.saved_stories.includes(storyId)){
            return res.status(409).json({
               message:"Story already saved" 
            });
            
        }
        //save story
        user.saved_stories.push(storyId)
        await user.save();
        res.status(200).json({
            message:"Story saved successfully"
        });
    } catch (error) {
        return next(error);
        
    }

};

const removeSpotifyStory = async(req,res,next)=>{
    const { storyId } = req.body
    if(!storyId){
        const err = new Error("StoryId is required!");
        err.statusCodes= 400;
        return next(err);
    }
    try {
        const user = await User.findById(req.user._id);
        if(!user){
            const err = new Error("User Not Found!");
            err.statusCode = 404;
            return next(err);

        }
        const index = user.saved_stories.indexOf(storyId);
        if(index === -1){
            const err = new Error("Invalid StoryId");
            err.statusCode = 404;
            return next(err);
        }
        user.saved_stories.splice(index,1)
        await user.save();
        res.status(200).json({
            message:"Story Deleted Successfully!"
        });
    } catch (error) {
        return next(error);
        
    }

};

const getSpotifyStories = async(req,res,next)=>{
    try {
        const user = await User.findById(req.user._id);
        if(!user){
            const err = new Error("User Not Found!");
            err.statusCode = 400;
            return next(err);
        }
        const stories = user.saved_stories;
        res.status(200).json({
            stories
        });

    } catch (error) {
        return next(error);
        
    }

};
 

export { createUser, verifyEmail, loginUser, generateSpotifyRefreshToken, getUserProfile, updateUserProfile, updatePreferredLanguage, updatePassword, forgotPassword, resetPassword, saveSpotifyStory, removeSpotifyStory, getSpotifyStories };
