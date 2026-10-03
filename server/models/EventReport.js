const mongoose=require('mongoose');

const schema=new mongoose.Schema({
  eventId:{type:mongoose.Schema.Types.ObjectId,ref:'Event',required:true,index:true},
  userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
  reason:{type:String,enum:['misleading','inappropriate','spam','safety','duplicate','other'],required:true},
  details:{type:String,trim:true,maxlength:1000,default:''},
  status:{type:String,enum:['open','reviewed','dismissed','actioned'],default:'open',index:true},
  adminNote:{type:String,trim:true,maxlength:1000,default:''},
  reviewedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'},
  reviewedAt:Date
},{timestamps:true});

schema.index({userId:1,eventId:1},{unique:true});
module.exports=mongoose.model('EventReport',schema);
