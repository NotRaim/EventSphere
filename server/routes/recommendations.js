const router=require('express').Router();
const Event=require('../models/Event');
const Ticket=require('../models/Ticket');
const {auth}=require('../middleware/auth');

router.get('/',auth,async(req,res)=>{
  try{
    const user=await require('../models/User').findById(req.user._id).lean();
    const prefs=user?.preferences||{};
    const interests=new Set((prefs.interests||[]).map(x=>String(x).toLowerCase()));
    const saved=new Set((user?.favorites||[]).map(x=>String(x)));
    const history=await Ticket.find({userId:req.user._id}).select('eventId').lean();
    const booked=new Set(history.map(x=>String(x.eventId)));
    const events=await Event.find({status:'published',visibility:'public'}).sort({date:1}).limit(100).lean();
    const city=String(prefs.city||'').trim().toLowerCase();
    const scored=events.map(e=>{
      let score=0;
      if(interests.has(String(e.category||'').toLowerCase()))score+=7;
      if(city&&String(e.city||'').toLowerCase()===city)score+=5;
      if(saved.has(String(e._id)))score+=4;
      if(booked.has(String(e._id)))score-=3;
      score+=Math.min(3,Number(e.views||0)/50);
      return {event:e,score};
    }).sort((a,b)=>b.score-a.score||new Date(a.event.date)-new Date(b.event.date));
    res.json(scored.slice(0,6).map(x=>({...x.event,id:x.event._id.toString(),recommendationScore:Math.round(x.score),reason:interests.has(String(x.event.category||'').toLowerCase())?`Matches your ${x.event.category} interest`:city&&String(x.event.city||'').toLowerCase()===city?`Near ${x.event.city}`:'Picked from your EventSphere activity'})));
  }catch(err){res.status(500).json({message:'Could not load recommendations'})}
});

module.exports=router;
