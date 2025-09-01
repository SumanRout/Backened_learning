import {Video} from "../models/video.model.js"
import { ApiError } from "../utils/Apierror.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import fs from "fs"
import { getVideoDuration } from "../utils/getVideoDuration.js"



const publishAVideo=asyncHandler(async(req,res)=>{
    const {title,description}=req.body
    if(title.trim()==="")
        throw new ApiError(400,"Video must have a title")
    console.log(req.files)
    if(!req.files?.video?.[0]?.mimetype?.startsWith('video/')){
        throw new ApiError(400,"File must be a video")
    }
    if (!req.files?.thumbnail?.[0]?.mimetype?.startsWith("image/")) {
    throw new ApiError(400, "Thumbnail must be an image");
  }
    const videoLocalPath=req.file.path;
    const thumbnailLocalPath = req.files.thumbnail[0].path;

    const duration=await getVideoDuration(videoLocalPath);
    if(!videoLocalPath )
        throw new ApiError(401,"Video file is missing")
    const video=await uploadOnCloudinary(videoLocalPath);
    const thumbnail=await uploadOnCloudinary(thumbnailLocalPath)
    if(!video.url || !thumbnail.url){
        throw new ApiError(500,"Error while uploading files")   
    }
    fs.unlinkSync(videoLocalPath)
    fs.unlinkSync(thumbnailLocalPath)
    
    const newVideo=await Video.create({
        title,
        description,
        videoFile:video.url,
        duration:duration,
        owner:req.body._id

    });
    return res.status(201).json({
        status:201,
        data:newVideo,
        message:"Video published successfully",
        
    })

})

export {publishAVideo}