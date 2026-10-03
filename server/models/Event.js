const mongoose=require('mongoose');

const ticketTypeSchema=new mongoose.Schema({
  name:{type:String,required:true,trim:true,maxlength:80},
  price:{type:Number,min:0,default:0},
  capacity:{type:Number,min:1,default:100},
  benefits:{type:[String],default:[]},
  sold:{type:Number,min:0,default:0}
},{_id:true});

const s=new mongoose.Schema({
  title:{type:String,required:true,trim:true,maxlength:140},
  category:{type:String,required:true,index:true},
  date:{type:String,required:true},
  time:{type:String,default:'19:00'},
  venue:{type:String,required:true},
  city:{type:String,default:'Ahmedabad'},
  price:{type:Number,min:0,default:0},
  capacity:{type:Number,min:1,required:true},
  registeredCount:{type:Number,min:0,default:0},
  description:{type:String,required:true,maxlength:5000},
  image:String,
  gallery:{type:[String],default:[]},
  registrationDeadline:String,
  visibility:{type:String,enum:['public','private'],default:'public'},
  status:{type:String,enum:['draft','pending','published','rejected','archived','cancelled'],default:'published'},
  organizerId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
  organizerName:String,
  organizerEmail:String,
  views:{type:Number,default:0},
  ticketTypes:{type:[ticketTypeSchema],default:[]}
},{timestamps:true});

s.index({title:'text',city:'text',category:'text',description:'text'});
module.exports=mongoose.model('Event',s);
