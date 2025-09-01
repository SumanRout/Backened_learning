import {getVideoDurationInSeconds} from 'get-video-duration'
import { ApiError } from './Apierror.js'
async function getVideoDuration(filepath){
    try{
        const duration=await getVideoDurationInSeconds(filepath)
        return duration
    }
    catch(error){
        console.log(`error while getting duration ${error}`)
        throw new ApiError(200,{message:"failed to extract video duratio"})
    }
}
export {getVideoDuration}