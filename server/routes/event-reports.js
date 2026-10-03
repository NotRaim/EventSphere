const router=require('express').Router();
const EventReport=require('../models/EventReport');
const Event=require('../models/Event');
const Notification=require('../models/Notification');
const {auth,role}=require('../middleware/auth');

router.post('/',auth,async(req,res)=>{
  try{
    const eventId=String(req.body?.eventId||'');
    const reason=String(req.body?.reason||'');
    const details=String(req.body?.details||'').trim().slice(0,1000);
    const allowed=['misleading','inappropriate','spam','safety','duplicate','other'];
    if(!eventId||!allowed.includes(reason))return res.status(400).json({message:'Choose a valid report reason'});
    const event=await Event.findOne({_id:eventId,status:{$in:['published','pending']}}).select('title organizerId').lean();
    if(!event)return res.status(404).json({message:'Event not found'});
    const existing=await EventReport.findOne({eventId,userId:req.user._id});
    if(existing)return res.status(409).json({message:'You have already reported this event'});
    const report=await EventReport.create({eventId,userId:req.user._id,reason,details});
    await Notification.create({userId:event.organizerId,title:'Event report received',message:`A community member reported “${event.title}”. Admin review is pending.`});
    res.status(201).json({ok:true,report:{id:report._id.toString(),status:report.status}});
  }catch(err){res.status(400).json({message:err.message||'Could not submit report'})}
});

router.get('/mine',auth,async(req,res)=>{
  const rows=await EventReport.find({userId:req.user._id}).sort({createdAt:-1}).populate('eventId','title').lean();
  res.json(rows.map(r=>({...r,id:r._id.toString()})));
});

router.get('/admin',auth,role('admin'),async(req,res)=>{
  const rows=await EventReport.find().sort({createdAt:-1}).limit(200).populate('eventId','title date organizerName').populate('userId','name email').lean();
  res.json(rows.map(r=>({...r,id:r._id.toString()})));
});

router.patch('/admin/:id',auth,role('admin'),async(req,res)=>{
  const status=String(req.body?.status||'');
  if(!['open','reviewed','dismissed','actioned'].includes(status))return res.status(400).json({message:'Invalid report status'});
  const report=await EventReport.findByIdAndUpdate(req.params.id,{status,adminNote:String(req.body?.adminNote||'').trim().slice(0,1000),reviewedBy:req.user._id,reviewedAt:new Date()},{new:true}).lean();
  if(!report)return res.status(404).json({message:'Report not found'});
  res.json({...report,id:report._id.toString()});
});

module.exports=router;
