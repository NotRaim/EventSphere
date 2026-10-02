const router=require('express').Router();
const Event=require('../models/Event');
const Rating=require('../models/Rating');
const Ticket=require('../models/Ticket');
const Notification=require('../models/Notification');
const {auth,role}=require('../middleware/auth');

const editableFields=['title','category','date','time','venue','city','price','capacity','description','image','registrationDeadline','visibility','ticketTypes'];

function cleanEventBody(body={}){
  const out={};
  for(const key of editableFields) if(Object.prototype.hasOwnProperty.call(body,key)) out[key]=body[key];
  if(out.price!==undefined) out.price=Number(out.price||0);
  if(out.capacity!==undefined) out.capacity=Number(out.capacity||1);
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
    const e=await Event.findByIdAndUpdate(req.params.id,{$inc:{views:1}},{new:true}).lean();
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

router.get('/:id/ratings',async(req,res)=>res.json(await Rating.find({eventId:req.params.id}).lean()));
router.post('/:id/register',auth,async(req,res)=>res.status(400).json({message:'Use ticket checkout for registrations'}));

module.exports=router;
