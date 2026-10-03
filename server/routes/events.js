const router=require('express').Router();
const mongoose=require('mongoose');
const Event=require('../models/Event');
const Rating=require('../models/Rating');
const Notification=require('../models/Notification');
const Feedback=require('../models/Feedback');
const Ticket=require('../models/Ticket');
const {auth,role}=require('../middleware/auth');

const editableFields=['title','category','date','time','venue','city','price','capacity','description','image','gallery','registrationDeadline','visibility','ticketTypes'];

function normalizeTicketTypes(input, fallbackPrice=0, fallbackCapacity=100){
  const source=Array.isArray(input)?input:[];
  const rows=source.map((t,i)=>{
    const name=String(t?.name||'').trim();
    if(!name)return null;
    const price=Math.max(0,Number(t?.price??fallbackPrice)||0);
    const capacity=Math.max(1,Number(t?.capacity??fallbackCapacity)||1);
    const benefits=Array.isArray(t?.benefits)
      ? t.benefits.map(x=>String(x).trim()).filter(Boolean).slice(0,8)
      : String(t?.benefits||'').split(/[,\n]/).map(x=>x.trim()).filter(Boolean).slice(0,8);
    const sold=Math.max(0,Number(t?.sold)||0);
    return {_id:t?._id,name,price,capacity,benefits,sold};
  }).filter(Boolean);
  return rows.length?rows:[{name:'General Admission',price:Math.max(0,Number(fallbackPrice)||0),capacity:Math.max(1,Number(fallbackCapacity)||1),benefits:[],sold:0}];
}

function cleanEventBody(body={}){
  const out={};
  for(const key of editableFields) if(Object.prototype.hasOwnProperty.call(body,key))out[key]=body[key];
  if(out.price!==undefined)out.price=Math.max(0,Number(out.price||0));
  if(out.capacity!==undefined)out.capacity=Math.max(1,Number(out.capacity||1));
  if(out.ticketTypes!==undefined)out.ticketTypes=normalizeTicketTypes(out.ticketTypes,out.price??0,out.capacity??100);
  return out;
}

router.get('/',async(req,res)=>{
  try{
    const q={status:'published',visibility:'public'};
    if(req.query.category)q.category=req.query.category;
    if(req.query.city)q.city=new RegExp(req.query.city,'i');
    const a=await Event.find(q).sort({date:1,createdAt:-1}).lean();
    res.json(a.map(e=>({...e,id:e._id.toString()})));
  }catch{res.status(500).json({message:'Could not load events'})}
});

/* Organizer/Admin workspace: never uses the public/demo event fallback. */
router.get('/manage/list',auth,role('organizer','admin'),async(req,res)=>{
  try{
    const q=req.user.role==='admin'?{}:{organizerId:req.user._id};
    const a=await Event.find(q).sort({createdAt:-1}).lean();
    res.json(a.map(e=>({...e,id:e._id.toString()})));
  }catch{res.status(500).json({message:'Could not load managed events'})}
});

router.get('/:id',async(req,res)=>{
  try{
    const e=await Event.findOneAndUpdate(
      {_id:req.params.id,status:'published',visibility:'public'},
      {$inc:{views:1}},
      {new:true}
    ).lean();
    if(!e)return res.status(404).json({message:'Event not found'});
    res.json({...e,id:e._id.toString()});
  }catch{res.status(404).json({message:'Event not found'})}
});

router.post('/',auth,role('organizer','admin'),async(req,res)=>{
  try{
    const b=req.body;
    const e=await Event.create({
      ...cleanEventBody(b),
      organizerId:req.user._id,
      organizerName:req.user.name,
      organizerEmail:req.user.email,
      price:Number(b.price||0),
      capacity:Number(b.capacity||1),
      ticketTypes:normalizeTicketTypes(b.ticketTypes,Number(b.price||0),Number(b.capacity||1)),
      status:req.user.role==='admin'||process.env.REQUIRE_EVENT_APPROVAL!=='true'?'published':'pending'
    });
    res.status(201).json({...e.toObject(),id:e._id.toString()});
  }catch(e){res.status(400).json({message:e.message||'Could not create event'})}
});

router.patch('/:id',auth,role('organizer','admin'),async(req,res)=>{
  try{
    const e=await Event.findById(req.params.id);
    if(!e)return res.status(404).json({message:'Event not found'});
    if(req.user.role==='organizer'&&String(e.organizerId)!==String(req.user._id))return res.status(403).json({message:'Not your event'});

    const changes=cleanEventBody(req.body);
    if(changes.capacity!==undefined && changes.capacity<Number(e.registeredCount||0)){
      return res.status(400).json({message:`Capacity cannot be lower than ${e.registeredCount} registered guests`});
    }

    const requestedStatus=req.body.status!==undefined?String(req.body.status):null;
    const allowedStatus=['draft','pending','published','rejected','archived','cancelled'];
    if(requestedStatus && !allowedStatus.includes(requestedStatus))return res.status(400).json({message:'Invalid event status'});

    Object.assign(e,changes);
    if(requestedStatus)e.status=requestedStatus;
    await e.save();

    if(requestedStatus==='cancelled'){
      const tickets=await Ticket.find({eventId:e._id,status:'valid'}).select('userId ticketCode').lean();
      if(tickets.length){
        await Ticket.updateMany({eventId:e._id,status:'valid'},{$set:{status:'cancelled'}});
        await Notification.insertMany(tickets.map(t=>({userId:t.userId,title:'Event cancelled',message:`${e.title} has been cancelled by the event organizer. Ticket ${t.ticketCode} is no longer valid.`})));
      }
    }

    res.json({...e.toObject(),id:e._id.toString()});
  }catch(err){res.status(400).json({message:err.message||'Could not update event'})}
});

router.delete('/:id',auth,role('admin','organizer'),async(req,res)=>{
  try{
    const e=await Event.findById(req.params.id);
    if(!e)return res.status(404).json({message:'Event not found'});
    if(req.user.role==='organizer'&&String(e.organizerId)!==String(req.user._id))return res.status(403).json({message:'Not your event'});
    await Ticket.updateMany({eventId:e._id,status:{$in:['valid','checked_in']}},{$set:{status:'cancelled'}});
    await Notification.deleteMany({message:{$regex:e.title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}});
    await Event.deleteOne({_id:e._id});
    res.json({ok:true,id:String(e._id)});
  }catch(err){res.status(400).json({message:err.message||'Could not remove event'})}
});

router.get('/:id/ratings',async(req,res)=>res.json(await Rating.find({eventId:req.params.id}).lean()));

router.get('/:id/reviews',async(req,res)=>{
  try{
    const rows=await Feedback.find({eventId:req.params.id})
      .sort({createdAt:-1})
      .populate('userId','name')
      .lean();
    const stats=await Feedback.aggregate([
      {$match:{eventId:new mongoose.Types.ObjectId(req.params.id)}},
      {$group:{_id:null,average:{$avg:'$rating'},count:{$sum:1}}}
    ]);
    res.json({reviews:rows.map(r=>({id:r._id.toString(),rating:r.rating,comment:r.comment||'',userName:r.userId?.name||'EventSphere member',createdAt:r.createdAt})),average:Number(stats[0]?.average||0),count:Number(stats[0]?.count||0)});
  }catch(err){res.status(400).json({message:'Could not load reviews'})}
});

router.post('/:id/register',auth,async(req,res)=>res.status(400).json({message:'Use ticket checkout for registrations'}));

module.exports=router;
