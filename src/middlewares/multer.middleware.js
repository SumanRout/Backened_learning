import multer from "multer";
import path from "path";

//diskStorage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(process.cwd(),"public/temp"));
  },
  filename: function (req, file, cb) {
   // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.originalname)
  }
})

export const upload = multer({
     storage: storage 
    })