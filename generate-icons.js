const fs=require('fs'),path=require('path');
const d=path.join(__dirname,'frontend','public','icons');
fs.mkdirSync(d,{recursive:true});
const s=n=>`<svg width="${n}" height="${n}" viewBox="0 0 ${n} ${n}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#4f9cf9"/><stop offset="100%" style="stop-color:#8b5cf6"/></linearGradient></defs><rect width="${n}" height="${n}" rx="${n*.2}" fill="url(#g)"/><text x="50%" y="60%" text-anchor="middle" dominant-baseline="middle" font-size="${n*.45}" fill="white">✈</text></svg>`;
fs.writeFileSync(path.join(d,'icon-192.png'),s(192));
fs.writeFileSync(path.join(d,'icon-512.png'),s(512));
console.log('✅ Icons generated!');
