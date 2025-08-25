import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/Apierror.js"
import { User } from "../models/users.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

const genertaeAccessAndRefreshToken=async(userId)=>{
    try{
        const user= await User.findById(userId)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()
        user.refreshToken=refreshToken; //save refreshtoken in database 
        await user.save({validateBeforeSave:false})
        return {accessToken,refreshToken}
    }
    catch(error){
        throw new ApiError(500,"Went Wrong while refreshing and accessing token")
    }
}
const registerUser=asyncHandler(async (req,res)=>{
    /* STEP TO REGISTER A USER
          i.  get user details from frontend 
          ii. validate (not empty )
          iii.Check if user already exist (username or email)
          iv. check for images and avatar
          v.  upload them to cloudinary,check in multer and cloudinary
          vi. create user object --create entry in db
          vii.remove password and refresh token field from response
          viii.check for user creation
          ix. return res
     */
          //geting user details from frontend 
          const {fullname,email,username,password}=req.body
        console.log("req.body: ",req.body)
            //Validating user

        if( [fullname,email,username,password].some((field)=>{
            field?.trim()===""
        })){
            throw new ApiError(400,"All fields are required")

        }
            //checking user existance
        const existedUser=await User.findOne({
            $or:[{username},{email}]
        })
        console.log("Existed user is: ",existedUser)
        if(existedUser){
            throw new ApiError(409,"User already exist")
        }
          //checking for image avatar
          
        console.log("req.files",req.files)
        const avatarLocalPath=req.files?.avatar[0]?.path;
        //const coverImageLocalPath=req.files?.coverImage[0]?.path;
        let coverImageLocalPath;
        if(req.files && Array.isArray(req.files.coverImage)&& req.files.coverImage.length>0){
            coverImageLocalPath=req.files.coverImage[0].path
        }
        console.log("Avatar local path",avatarLocalPath)
        if(!avatarLocalPath){
            throw new ApiError(400,"Avatar file is required");
        }

        const avatar=await uploadOnCloudinary(avatarLocalPath)
        const coverImage=await uploadOnCloudinary(coverImageLocalPath)
        //console.log("Avatar response from cloudinary",avatar)
        //console.log("coverImage response from cloudinary",coverImageLocalPath)

        if(!avatar)
            throw new ApiError(400,"Avatar files required")

        /*if(coverImageLocalPath && !coverImage)
            throw new ApiError(400,"Cover image upload failed")
        */
         //create user

        const user=await User.create({
            fullname,
            avatar:avatar.url,
            coverImage:coverImage?.url || "",
            email,
            password,
            username:username.toLowerCase()
        })

        const createduser=await User.findById(user._id).select(
            "-password -refreshToken"
        )
        if(!createduser)
            throw new ApiError(500,"Something went wrong while registering")

        return res.status(201).json(
            new ApiResponse(200,createduser,"User registered Successfully")

        )


})

//user login
const loginUser=asyncHandler(async (req,res)=>{
    /* steps for login
        req body
        username or email
        find the user and password check
        access and refresh the token
        send cookie
    */
   const {email,username,password}=req.body
    if(!(username  || email))
        throw new ApiError(400,"usrname or email is required")
    const user=await User.findOne({
        $or:[{email},{username}]
    })
    if (!user){
        throw new ApiError(400,"User doesnot exist")
    }
    const isPassWordValid=await user.isPasswordCorrect(password)
    if(!isPassWordValid)
        throw new ApiError(401,"Invalid credintials")
    const {accessToken,refreshToken}=await genertaeAccessAndRefreshToken(user._id)

    const loggedInuser=await User.findById(user._id).select("-password-refreshToken")
    const options={
        httpOnly:true,
        secure:true
    }
    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(200,{
            user:loggedInuser,accessToken,refreshToken

        },"User logged in successfully"
    )
    )

})

//User logout
const logoutUser=asyncHandler(async(req,res)=>{
    User.findByIdAndUpdate(
        req.user._id,{
            refreshToken:undefined
        },{
            new :true
        }
    )
    const options={
        httpOnly:true,
        secure:true
    }

    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged out"))
})

// refreshAccessToken
const refreshAccessToken=asyncHandler(async (req,res)=>{
    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken
    if (!incomingRefreshToken){
        throw new ApiError(401,"Unauthorizede request")
    }
    try {
        
        const decodedToken=jwt.verify(incomingRefreshToken,REFRESH_TOKEN_SECRET)
        const user=await User.findById(decodedToken?._id)
        if (!user)
            throw new ApiError(401,"Ivalid refresh token")
    
        if(incomingRefreshToken!=user?.refreshToken)
            throw new ApiError(401,"Refresh token is expired or used")
        const options={
            httpOnly:true,
            secure:true
        }
        const {accessToken,newrefreshToken}=await genertaeAccessAndRefreshToken(user._id)
        return res.status(200)
        .cookie("accessToken",accessToken)
        .cookie("refreshToken",newrefreshToken)
        .json(
            new ApiResponse(200,{accessToken,newrefreshToken},"Access token refreshed successfulltu")
        )
    } catch (error) {
        console.log("get error while refreshing access token",error)
        
    }


})


export {registerUser,loginUser,logoutUser,refreshAccessToken}