const express=require('express'),path=require('path'),http=require('http'),https=require('https'),url=require('url');
const app=express(),PORT=process.env.PORT||3000;
const BACKEND_URL=process.env.BACKEND_URL||'http://localhost:3001';

app.use((req,res,next)=>{
  if(req.path.match(/\.(jpg|jpeg|png|gif|webp|svg|ico|css|js|woff2?)$/i)){
    res.setHeader('Cache-Control','public, max-age=31536000, immutable');
  } else {
    res.setHeader('Cache-Control','no-cache, must-revalidate');
  }
  next();
});

// Proxy /api/* to the backend
app.use('/api',(req,res)=>{
  const target=url.parse(BACKEND_URL);
  const opts={
    hostname:target.hostname,
    port:target.port||(target.protocol==='https:'?443:80),
    path:'/api'+req.url,
    method:req.method,
    headers:{...req.headers,host:target.hostname}
  };
  const mod=target.protocol==='https:'?https:http;
  const proxy=mod.request(opts,back=>{
    res.writeHead(back.statusCode,back.headers);
    back.pipe(res);
  });
  proxy.on('error',()=>res.status(502).json({error:'Backend unavailable'}));
  req.pipe(proxy);
});

app.use(express.static(path.join(__dirname,'public')));
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(PORT,()=>console.log(`\n✈  Flight Pickup Frontend on port ${PORT}\n   Open: http://localhost:${PORT}\n`));
