const router=require('express').Router();
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const User=require('../models/User');
const {auth}=require('../middleware/auth');

const token=u=>jwt.sign({id:u._id.toString(),role:u.role},process.env.JWT_SECRET,{expiresIn:process.env.JWT_EXPIRES_IN||'7d'});
const clean=u=>({id:u._id.toString(),name:u.name,email:u.email,phone:u.phone||'',role:u.role,preferences:u.preferences||{}});
const emailRe=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/register',async(req,res)=>{
  try{
    const name=String(req.body?.name||'').trim();
    const email=String(req.body?.email||'').trim().toLowerCase();
    const password=String(req.body?.password||'');
    const phone=String(req.body?.phone||'').trim().slice(0,30);
    const role=String(req.body?.role||'user');
    if(name.length<2||name.length>80)return res.status(400).json({message:'Name must be between 2 and 80 characters'});
    if(!emailRe.test(email)||email.length>160)return res.status(400).json({message:'Enter a valid email address'});
    if(password.length<8||password.length>128)return res.status(400).json({message:'Password must be 8 to 128 characters'});
    if(!['user','organizer'].includes(role))return res.status(400).json({message:'Invalid role'});
    if(await User.exists({email}))return res.status(409).json({message:'An account with this email already exists'});
    const u=await User.create({name,email,phone,passwordHash:await bcrypt.hash(password,12),role});
    res.status(201).json({token:token(u),user:clean(u)});
  }catch{res.status(500).json({message:'Registration failed'})}
});

router.post('/login',async(req,res)=>{
  try{
    const email=String(req.body?.email||'').trim().toLowerCase();
    const password=String(req.body?.password||'');
    if(!emailRe.test(email)||!password)return res.status(401).json({message:'Invalid email or password'});
    const u=await User.findOne({email});
    if(!u||!(await bcrypt.compare(password,u.passwordHash)))return res.status(401).json({message:'Invalid email or password'});
    if(u.status==='suspended')return res.status(403).json({message:'This account is suspended'});
    res.json({token:token(u),user:clean(u)});
  }catch{res.status(500).json({message:'Login failed'})}
});

router.get('/me',auth,(req,res)=>res.json({user:clean(req.user)}));
module.exports=router;
