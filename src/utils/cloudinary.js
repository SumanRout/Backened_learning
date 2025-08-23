import { v2 as cloudinary} from "cloudinary";
import fs from "fs"
import dotenv from "dotenv";
dotenv.config({ path: '../.env' });
//console.log("Cloudinary ENV:", process.env.CLOUDINARY_CLOUD_NAME, process.env.CLOUDINARY_API_KEY, process.env.CLOUDINARY_API_SECRET);

 // Configuration
    cloudinary.config({ 
        cloud_name:process.env.CLOUDINARY_CLOUD_NAME, 
        api_key:process.env.CLOUDINARY_API_KEY,
        api_secret:process.env.CLOUDINARY_API_SECRET
    });


const uploadOnCloudinary = async (localFilePath) =>{
    try{
        if(!localFilePath) return null
        const response=await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        //File uploaded successfully
        //console.log("File uploaded on cloudinary",response.url);
        fs.unlinkSync(localFilePath)
        return response;


    }
    catch(error){
          // remove the locally saved temporary file if operation fails
        console.log("Cloudinary upload error:", error); 
        fs.unlinkSync(localFilePath)
        return null;
    }
}

export {uploadOnCloudinary}