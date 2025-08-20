import mongoose from "mongoose"
import {DB_NAME} from "../constant.js";



const connectDB=async()=>{
    try{
        console.log("MONGODB_URL:", process.env.MONGODB_URL);
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}${DB_NAME}`)
        console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);

    }
    catch(error){
        console.log("MongoDb connection Failed",error);
        process.exit(1);
    }
}

export default connectDB;
