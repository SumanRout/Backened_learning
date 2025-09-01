import { Router } from "express";
import { changePassword, getCurrentUser, getUserProfile, getWatchHistory, loginUser, logoutUser, refreshAccessToken, registerUser, updateAvatar, updateCoverImage } from "../controllers/user.controller.js";
import {publishAVideo} from "../controllers/video.controller.js"
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router =Router();

router.route("/register").post(
    upload.fields([{
        name:"avatar",
        maxCount:1
    }
    ,{
        name:"coverImage",
        maxCount:1
    }]),
    registerUser)

router.route("/login").post(loginUser)

//secured routes
router.route("/logout").post(verifyJWT,logoutUser)
router.route("/refresh-token").post(refreshAccessToken)

router.route("/changePassword").post(verifyJWT,changePassword)

router.route("/current_user").post(verifyJWT,getCurrentUser)

router.route("/update-avatar").patch(verifyJWT,upload.single("avatar"),updateAvatar)

router.route("/update-coverimage").patch(verifyJWT,upload.single("coverImage"),updateCoverImage)

router.route("/c/:username").get(verifyJWT,getUserProfile)

router.route("/history").get(verifyJWT,getWatchHistory)

router.route("/upload").post(verifyJWT,upload.single("Video"),publishAVideo)

export default router