const mongoose=require('mongoose');
module.exports=async function(){const uri=process.env.MONGODB_URI;if(!uri)throw new Error('MONGODB_URI is missing');await mongoose.connect(uri,{serverSelectionTimeoutMS:10000});console.log(`✅ MongoDB connected (${mongoose.connection.host}/${mongoose.connection.name})`)};
