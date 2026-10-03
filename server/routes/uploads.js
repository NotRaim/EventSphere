const router=require('express').Router();
const multer=require('multer');
const {auth}=require('../middleware/auth');

const upload=multer({
  storage:multer.memoryStorage(),
  limits:{fileSize:5*1024*1024},
  fileFilter:(req,file,cb)=>{
    if(/^image\/(jpeg|png|webp|gif|avif)$/i.test(file.mimetype))return cb(null,true);
    cb(new Error('Only JPG, PNG, WEBP, GIF or AVIF images are allowed'));
  }
});

function dataUrl(file){
  return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
}

router.post('/image',auth,upload.single('image'),async(req,res)=>{
  try{
    if(!req.file)return res.status(400).json({message:'Choose an image first'});

    // Use Cloudinary automatically when configured.
    if(process.env.CLOUDINARY_CLOUD_NAME&&process.env.CLOUDINARY_API_KEY&&process.env.CLOUDINARY_API_SECRET){
      const cloudinary=require('cloudinary').v2;
      cloudinary.config({
        cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
        api_key:process.env.CLOUDINARY_API_KEY,
        api_secret:process.env.CLOUDINARY_API_SECRET
      });
      const result=await new Promise((resolve,reject)=>{
        const stream=cloudinary.uploader.upload_stream({folder:'eventsphere/events',resource_type:'image'},(err,data)=>err?reject(err):resolve(data));
        stream.end(req.file.buffer);
      });
      return res.json({url:result.secure_url,provider:'cloudinary'});
    }

    // Local/demo fallback: the frontend compresses images before upload.
    res.json({url:dataUrl(req.file),provider:'inline'});
  }catch(err){
    res.status(400).json({message:err.message||'Could not upload image'});
  }
});

module.exports=router;
