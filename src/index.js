// require('dotenv').config({path:'./env'})     this can be use also
import dotenv from "dotenv";
import connectDB from "./db/index.js"

dotenv.config({
    path:'../.env'

})

connectDB()














//   All in one express in the s
/*
import express from "express"
const app = express()

      iife
( async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("errror", (error) => {
            console.log("ERRR: ", error);
            throw error
        })

        app.listen(process.env.PORT, () => {
            console.log(`App is listening on port ${process.env.PORT}`);
        })

    } catch (error) {
        console.error("ERROR: ", error)
        throw err
    }
})()

*/