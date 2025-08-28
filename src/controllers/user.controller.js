import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/Apierror.js"
import { User } from "../models/users.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import { Subscription } from "../models/subscription.model.js";
import mongoose from "mongoose";

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
            $unset:{
                refreshToken:1 
            }
        },{
            new :true
        }
    )
    const options={
        httpOnly:true,
        secure:true
    }
    //const currUser=getCurrentUser();
    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},`User logged out`))
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

//change password
const changePassword=asyncHandler(async (req,res)=>{
    const {password,newPassword,confirmPassword}=req.body
    if(!(newPassword===confirmPassword)){
        throw new ApiError(401,"Confirm password should be same as new password")
    }
    const user=await User.findById(req.user?._id)
    const isPasswordcorrect= await user.isPasswordCorrect(password)
    if(!isPasswordcorrect){
        throw new ApiError(400,"invalid password")
    }
    if(newPassword!=confirmPassword){
        throw new ApiError(401,"Confirm password must be same as new password")
    }
    user.password=newPassword;
    await user.save({validateBeforeSave:false})
    return res.status(200)
    .json(new ApiResponse(200,{},"Password changed succesfully"))
})

const getCurrentUser=asyncHandler(async(req,res)=>{
    return res.status(200)
    .json(new ApiResponse(200,req.user,"Current User Fetched"))
})

const updateAvatar=asyncHandler(async(req,res)=>{
    const avatarLocalPath=req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is missing")
    }
    const avatar=await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(400,"Error while uploading on avatar")
    }
    const imageTobeDeleted= await User.deleteOne()
    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url

            }
        },
        {new:true}
    ).select("-password")
    return res.status(200).json(new ApiResponse(200,user,"avatar updated"))

})

const updateCoverImage=asyncHandler(async(req,res)=>{
    const coverImageLocalPath=req.file?.path
    if(!coverImageLocalPath){
        throw new ApiError(400,"coverImage file is missing")
    }
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading on coverImage")
    }
    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url

            }
        },
        {new:true}
    ).select("-password")
    return res.status(200).json(new ApiResponse(200,user,"coverImage updated"))
})
    
const getUserProfile=asyncHandler(async (req,res)=>{
    const {username}=req.params
    if(!username?.trim()){
        throw new ApiError(400,"Username is missing");
    }
    const channel=await User.aggregate([
        {
          $match:{
            username:username?.toLowerCase()
          }  
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscribers",
                as:"subscribedTo"

            }
        },
        {
            $addFields:{
                subscriptionCount:{
                    $size:"$subscribers"
                },
                channelSubscribedCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id,"$subscribers.subscribers"]},
                        then:true,
                        else:false
                    }
                }

            }
        },
        {
            $project:{
                fullname:1,
                username:1,
                subscriptionCount:1,
                channelSubscribedCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1
            }

        }
    ])
    console.log("channel aggregation pipeline ",channel)
    if(!channel?.length){
        throw new ApiError(404,"Channel does not exist")
    }
    return res.status(200)
    .json(new ApiResponse(200,"channel doesn't exist"))
    
})

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])
    return res.status(200).json(new ApiResponse(200,user[0].watchHistory,"Watch history fetched successfully"))
})


export {registerUser,loginUser,logoutUser,refreshAccessToken,changePassword,getCurrentUser,updateAvatar,updateCoverImage,getUserProfile,getWatchHistory}