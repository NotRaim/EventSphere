const mongoose=require('mongoose');

const schema=new mongoose.Schema({
  receipt:{type:String,unique:true,index:true},
  userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
  eventId:{type:mongoose.Schema.Types.ObjectId,ref:'Event',required:true},
  ticketType:{id:{type:mongoose.Schema.Types.ObjectId},name:String,price:Number,benefits:[String]},
  quantity:{type:Number,min:1,max:10,required:true},
  amount:{type:Number,required:true},
  currency:{type:String,default:'INR'},
  provider:{type:String,enum:['free','eventsphere-demo'],default:'eventsphere-demo'},
  providerOrderId:{type:String,index:true},
  providerPaymentId:{type:String,index:true},
  demoPaymentMethod:{type:String,enum:['upi','card','netbanking']},
  status:{type:String,enum:['created','paid','failed','refunded'],default:'created'},
  paidAt:Date
},{timestamps:true});

module.exports=mongoose.model('Order',schema);
