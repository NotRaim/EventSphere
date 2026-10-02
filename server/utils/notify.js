const Notification=require('../models/Notification');module.exports=(userId,title,message)=>Notification.create({userId,title,message});
