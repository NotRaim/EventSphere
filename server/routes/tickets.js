const router=require('express').Router();
const Ticket=require('../models/Ticket');
const Event=require('../models/Event');
const User=require('../models/User');
const QR=require('qrcode');
const {auth,role}=require('../middleware/auth');
const {signature,safeEqual}=require('../utils/ticket');
const {buildTicketPdf}=require('../utils/ticket-pdf');

function isValid(t,s){return !!t&&['valid','used'].includes(t.status)&&safeEqual(s||'',signature(t.ticketCode,t.userId,t.eventId))}

router.get('/mine',auth,async(req,res)=>res.json((await Ticket.find({userId:req.user._id}).sort({createdAt:-1}).lean()).map(t=>({...t,id:t._id.toString()}))));

router.get('/organizer',auth,role('organizer','admin'),async(req,res)=>{
  const ids=req.user.role==='admin'?null:(await Event.find({organizerId:req.user._id}).select('_id').lean()).map(e=>e._id);
  const q=ids?{eventId:{$in:ids}}:{};
  if(req.query.eventId)q.eventId=req.query.eventId;
  const ts=await Ticket.find(q).sort({createdAt:-1}).lean();
  res.json(ts.map(t=>({...t,id:t._id.toString()})));
});

router.get('/:id/qr',auth,role('organizer','admin'),async(req,res)=>{
  try{
    const t=await Ticket.findById(req.params.id).lean();
    if(!t)return res.status(404).json({message:'Ticket not found'});
    const e=await Event.findById(t.eventId).select('organizerId').lean();
    if(req.user.role==='organizer'&&(!e||String(e.organizerId)!==String(req.user._id)))return res.status(403).json({message:'You do not manage this event'});
    const base=process.env.PUBLIC_BASE_URL||`${req.protocol}://${req.get('host')}`;
    const verificationUrl=`${base}/verify/${encodeURIComponent(t.ticketCode)}?sig=${encodeURIComponent(t.verificationSig)}`;
    const dataUrl=await QR.toDataURL(verificationUrl,{width:320,margin:2,errorCorrectionLevel:'H'});
    res.json({ticketCode:t.ticketCode,status:t.status,verificationUrl,dataUrl});
  }catch{res.status(500).json({message:'Could not generate QR'})}
});

router.get('/:id/download',auth,async(req,res)=>{
  try{
    const t=await Ticket.findById(req.params.id).lean();
    if(!t||String(t.userId)!==String(req.user._id))return res.status(404).json({message:'Ticket not found'});
    const base=process.env.PUBLIC_BASE_URL||`${req.protocol}://${req.get('host')}`;
    const pdf=await buildTicketPdf(t,base);
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition',`attachment; filename="${t.ticketCode}.pdf"`);
    res.send(pdf);
  }catch{res.status(500).json({message:'Could not generate ticket PDF'})}
});

router.post('/:id/email',auth,async(req,res)=>{
  try{
    const t=await Ticket.findById(req.params.id).lean();
    if(!t||String(t.userId)!==String(req.user._id))return res.status(404).json({message:'Ticket not found'});
    if(!process.env.RESEND_API_KEY||!process.env.EMAIL_FROM){
      return res.status(503).json({message:'Email tickets are not configured yet. Add RESEND_API_KEY and EMAIL_FROM in Netlify environment variables.'});
    }
    const user=await User.findById(req.user._id).select('name email').lean();
    if(!user?.email)return res.status(400).json({message:'Your account does not have an email address'});
    const base=process.env.PUBLIC_BASE_URL||`${req.protocol}://${req.get('host')}`;
    const pdf=await buildTicketPdf(t,base);
    const response=await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({
        from:process.env.EMAIL_FROM,
        to:[user.email],
        subject:`Your EventSphere ticket · ${t.eventSnapshot?.title||'Event'}`,
        html:`<div style="font-family:Arial,sans-serif;background:#050809;color:#eef8f8;padding:28px"><h2 style="color:#18d7ff">EventSphere ticket</h2><p>Hi ${String(user.name||'there').replace(/[<>]/g,'')}, your <strong>${String(t.ticketType?.name||'General Admission').replace(/[<>]/g,'')}</strong> ticket for <strong>${String(t.eventSnapshot?.title||'your event').replace(/[<>]/g,'')}</strong> is attached as a PDF.</p><p>Ticket code: <strong>${t.ticketCode}</strong></p><p>Keep the QR code ready for entry.</p></div>`,
        attachments:[{filename:`${t.ticketCode}.pdf`,content:pdf.toString('base64')}]
      })
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.message||'Email provider rejected the message');
    res.json({ok:true,message:`Ticket emailed to ${user.email}`});
  }catch{res.status(502).json({message:'Could not email ticket'})}
});

router.get('/verify/:code',async(req,res)=>{const t=await Ticket.findOne({ticketCode:req.params.code}).lean();const ok=isValid(t,req.query.sig);res.json({valid:ok,status:!t?'NOT_FOUND':!ok?'INVALID':t.status.toUpperCase(),ticket:ok?{ticketCode:t.ticketCode,event:t.eventSnapshot,ticketType:t.ticketType,checkedInAt:t.checkedInAt||null}:null})});

router.post('/:id/checkin',auth,role('organizer','admin'),async(req,res)=>{
  const t=await Ticket.findById(req.params.id);if(!t)return res.status(404).json({message:'Ticket not found'});
  const e=await Event.findById(t.eventId);if(req.user.role==='organizer'&&(!e||String(e.organizerId)!==String(req.user._id)))return res.status(403).json({message:'You do not manage this event'});
  const updated=await Ticket.findOneAndUpdate(
    {_id:t._id,status:'valid'},
    {$set:{status:'used',checkedInAt:new Date(),checkedInBy:req.user._id}},
    {new:true}
  );
  if(!updated)return res.status(409).json({message:'Ticket has already been checked in or is no longer valid'});
  res.json({ok:true,message:'Ticket checked in',ticket:{id:updated._id.toString(),status:updated.status,checkedInAt:updated.checkedInAt}})
});

module.exports=router;
