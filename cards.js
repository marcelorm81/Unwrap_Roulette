// Voucher / coupon card renderer. drawVoucherCard(v, img, aspect) -> canvas (transparent outside the card shape)
// v = entry from vouchers.js, img = loaded packshot (or null), aspect = width/height the lid prefers.
(function(){
  const FONTS = {
    golden:   ['900 40px "Playfair Display"','700 40px "Cinzel"','italic 600 40px "Cormorant Garamond"'],
    coupon:   ['400 40px "Anton"','700 40px "Space Grotesk"','600 40px "IBM Plex Mono"'],
    dorky:    ['400 40px "Chewy"','700 40px "Comic Neue"'],
    receipt:  ['400 40px "VT323"'],
    ticket:   ['400 40px "Bebas Neue"','700 40px "Space Grotesk"'],
    raffle:   ['400 40px "Rubik Mono One"','700 40px "Space Grotesk"'],
    giftcard: ['700 40px "Space Grotesk"','400 40px "Righteous"'],
    spa:      ['italic 600 40px "Cormorant Garamond"','600 40px "Cormorant Garamond"'],
    official: ['600 40px "IBM Plex Mono"','700 40px "Playfair Display"','400 40px "Anton"'],
    retro:    ['400 40px "Shrikhand"','400 40px "Righteous"'],
    banknote: ['700 40px "Cinzel"','600 40px "IBM Plex Mono"','italic 600 40px "Cormorant Garamond"'],
    linkedin: ['700 40px "Space Grotesk"'], insta: ['700 40px "Space Grotesk"'], facebook: ['700 40px "Space Grotesk"'],
    gmail: ['700 40px "Space Grotesk"','400 40px "Space Grotesk"'], notif: ['700 40px "Space Grotesk"'], chat: ['700 40px "Space Grotesk"','400 40px "Space Grotesk"'],
    stream: ['400 40px "Bebas Neue"','700 40px "Space Grotesk"'], calendar: ['400 40px "Anton"','700 40px "Space Grotesk"'],
    infomercial: ['400 40px "Anton"','700 40px "Comic Neue"','400 40px "Chewy"'], headline: ['400 40px "Anton"','italic 600 40px "Cormorant Garamond"','700 40px "Space Grotesk"'],
    policy: ['700 40px "Playfair Display"','700 40px "Space Grotesk"','400 40px "Space Grotesk"'],
    rx: ['700 40px "Playfair Display"','700 40px "Space Grotesk"','italic 600 40px "Cormorant Garamond"'], webhost: ['700 40px "Space Grotesk"','400 40px "Anton"','600 40px "IBM Plex Mono"'],
  };
  window.loadCardFonts = tpl => Promise.all((FONTS[tpl]||[]).map(f=>document.fonts.load(f).catch(()=>{})));

  // ---------- helpers
  const rnd = seed => { let a=seed|0; return ()=>{ a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; };
  const hashStr = s => { let h=2166136261; for(const c of s){ h^=c.charCodeAt(0); h=Math.imul(h,16777619); } return h>>>0; };
  function wrap(g,text,maxW){ const words=text.split(/\s+/), out=[]; let cur=''; for(const w of words){ const t=cur?cur+' '+w:w; if(g.measureText(t).width<=maxW||!cur) cur=t; else { out.push(cur); cur=w; } } if(cur) out.push(cur); return out; }
  // largest size where text wraps into the box
  function fit(g, text, fontFn, maxW, maxH, lh=1.02, maxSize=200, minSize=10){
    maxSize=Math.round(maxSize); for(let s=maxSize; s>=minSize; s-=2){ g.font=fontFn(s); const L=wrap(g,text,maxW); if(L.every(l=>g.measureText(l).width<=maxW) && L.length*s*lh<=maxH) return {size:s, lines:balance(g,text,L,maxW)}; }
    g.font=fontFn(minSize); const L=wrap(g,text,maxW); return {size:minSize, lines:balance(g,text,L,maxW)};
  }
  // balanced wrapping (like CSS text-wrap: balance): same number of lines, but evenly filled, so no lonely last word
  function balance(g, text, L, maxW){
    if(L.length<2) return L;
    let lo=maxW*.55, hi=maxW, best=L;
    for(let i=0;i<14;i++){ const mid=(lo+hi)/2, M=wrap(g,text,mid);
      if(M.length===L.length && M.every(l=>g.measureText(l).width<=maxW)){ best=M; hi=mid; } else lo=mid; }
    // last resort: never leave a single short word alone on the last line
    const last=best[best.length-1]; if(best.length>1 && !last.includes(' ')){ const prev=best[best.length-2].split(' '); if(prev.length>1){ const moved=prev.pop()+' '+last; if(g.measureText(moved).width<=maxW){ best=best.slice(0,-2).concat([prev.join(' '), moved]); } } }
    return best;
  }
  function lines(g, f, x, y, lh=1.02, align='center', base='top'){ g.textAlign=align; g.textBaseline=base; f.lines.forEach((l,i)=>g.fillText(l,x,y+i*f.size*lh)); return y+f.lines.length*f.size*lh; }
  function rr(g,x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
  function barcode(g,x,y,w,h,seed,col='#111'){ const R=rnd(seed); g.fillStyle=col; let cx=x; while(cx<x+w){ const bw=1+Math.floor(R()*4)*1.6; if(R()>.35) g.fillRect(cx,y,Math.min(bw,x+w-cx),h); cx+=bw+1+R()*2.5; } }
  function burst(g,x,y,r,n,fill,inner=.78){ g.beginPath(); for(let i=0;i<n*2;i++){ const a=i*Math.PI/n, r2=i%2?r*inner:r; g.lineTo(x+Math.cos(a)*r2,y+Math.sin(a)*r2); } g.closePath(); g.fillStyle=fill; g.fill(); }
  function shot(g,img,x,y,w,h,{shadow=true,filter=''}={}){ if(!img) return; const s=Math.min(w/img.width,h/img.height), iw=img.width*s, ih=img.height*s;
    g.save(); if(shadow){ g.shadowColor='rgba(0,0,0,.28)'; g.shadowBlur=w*.05; g.shadowOffsetY=w*.025; } if(filter) g.filter=filter;
    g.drawImage(img, x+(w-iw)/2, y+(h-ih)/2, iw, ih); g.restore(); g._shot=[x+(w-iw)/2, y+(h-ih)/2, iw, ih]; }
  function noise(g,w,h,seed,a=.05){ const R=rnd(seed); for(let i=0;i<w*h/90;i++){ g.fillStyle=R()<.5?`rgba(255,255,255,${a*R()})`:`rgba(0,0,0,${a*R()})`; g.fillRect(R()*w,R()*h,1.5,1.5); } }
  // landscape: image left, text right. portrait: image top, text below.
  function split(W,H,pad,imgFrac=.4){ if(W/H>=1.05){ const iw=(W-pad*2)*imgFrac; return {img:[pad,pad,iw,H-pad*2], txt:[pad*1.4+iw,pad,W-pad*2.4-iw,H-pad*2], land:true}; }
    const ih=(H-pad*2)*imgFrac*0.95; return {img:[pad,pad,W-pad*2,ih], txt:[pad,pad*1.2+ih,W-pad*2,H-pad*2.2-ih], land:false}; }
  const serial = v => ('' + (hashStr(v.id)%900000+100000));

  const T = {};

  T.golden = (g,W,H,v,img)=>{
    const gr=g.createLinearGradient(0,0,W,H); [['#7a5a16',0],['#f7dc84',.22],['#b4882a',.45],['#fff0b8',.62],['#a77b22',.82],['#e9c467',1]].forEach(([c,s])=>gr.addColorStop(s,c));
    rr(g,0,0,W,H,W*.03); g.fillStyle=gr; g.fill(); noise(g,W,H,hashStr(v.id),.08);
    g.strokeStyle='#5a3f0a'; g.lineWidth=W*.006; rr(g,W*.025,W*.025,W-W*.05,H-W*.05,W*.02); g.stroke();
    g.lineWidth=W*.002; rr(g,W*.04,W*.04,W-W*.08,H-W*.08,W*.015); g.stroke();
    for(const [cx,cy] of [[W*.04,W*.04],[W-W*.04,W*.04],[W*.04,H-W*.04],[W-W*.04,H-W*.04]]){ g.beginPath(); g.arc(cx,cy,W*.018,0,7); g.fillStyle='#5a3f0a'; g.fill(); }
    const L=split(W,H,W*.08,.36);
    const [ix,iy,iw,ih]=L.img; const mr=Math.min(iw,ih)*.48; const mg=g.createRadialGradient(ix+iw/2,iy+ih/2,mr*.2,ix+iw/2,iy+ih/2,mr); mg.addColorStop(0,'rgba(255,250,220,.9)'); mg.addColorStop(1,'rgba(255,240,180,0)');
    g.fillStyle=mg; g.beginPath(); g.arc(ix+iw/2,iy+ih/2,mr,0,7); g.fill(); shot(g,img,ix,iy,iw,ih);
    const [tx,ty,tw,th]=L.txt; const cx=tx+tw/2; g.fillStyle='#3b2a07';
    const hf=fit(g,'✦ GOLDEN VOUCHER ✦',s=>`700 ${s}px "Cinzel"`, tw, th*.08, 1, th*.07); lines(g,hf,cx,ty);
    const f=fit(g, v.text, s=>`900 ${s}px "Playfair Display"`, tw, th*.48, 1.0, th*.3);
    lines(g,f,cx,ty+th*.14+(th*.48-f.lines.length*f.size)/2,1.0);
    const bf=fit(g,'— '+v.brand.toUpperCase()+' —',s=>`700 ${s}px "Cinzel"`, tw, th*.07, 1, th*.06); lines(g,bf,cx,ty+th*.7);
    const ff=fit(g,v.fine,s=>`italic 600 ${s}px "Cormorant Garamond"`, tw*.95, th*.16, 1.05, th*.06); lines(g,ff,cx,ty+th*.82,1.05);
  };

  T.coupon = (g,W,H,v,img)=>{
    g.fillStyle='#FFFDF6'; g.fillRect(0,0,W,H);
    g.fillStyle='#FFE14D'; g.fillRect(0,0,W,H*.16);
    g.strokeStyle='#111'; g.lineWidth=W*.004; g.setLineDash([W*.018,W*.012]); g.strokeRect(W*.015,W*.015,W-W*.03,H-W*.03); g.setLineDash([]);
    const wide=W/H>=1.05;
    g.fillStyle='#D7261E'; const hf=fit(g,'MANUFACTURER COUPON',s=>`400 ${s}px "Anton"`, wide?W*.5:W*.9, wide?H*.1:H*.07, 1, H*.085); g.textBaseline='middle'; g.textAlign='left'; g.font=`400 ${hf.size}px "Anton"`; g.fillText('MANUFACTURER COUPON', W*.05, wide?H*.085:H*.055);
    g.fillStyle='#111'; const ef=fit(g,'EXPIRES: YESTERDAY',s=>`600 ${s}px "IBM Plex Mono"`, wide?W*.36:W*.9, wide?H*.06:H*.04, 1, H*.035, 8); g.font=`600 ${ef.size}px "IBM Plex Mono"`; g.textAlign=wide?'right':'left'; g.textBaseline='middle'; g.fillText('EXPIRES: YESTERDAY', wide?W*.95:W*.05, wide?H*.085:H*.125);
    const oy=H*.16; const L=split(W,H-oy,W*.06,.38);
    const [ix,iy,iw,ih]=L.img; shot(g,img,ix,iy+oy,iw,ih);
    const br=Math.min(iw,ih)*.22, bx=ix+iw-br*.9, by=iy+oy+br*.9; burst(g, bx, by, br, 14, '#D7261E');
    g.save(); g.translate(bx,by); g.rotate(-.2); g.fillStyle='#FFE14D'; g.textAlign='center'; g.textBaseline='middle';
    g.font=`400 ${Math.round(br*.4)}px "Anton"`; g.fillText('SAVE', 0, -br*.22); g.font=`400 ${Math.round(br*.55)}px "Anton"`; g.fillText('100%', 0, br*.25); g.restore();
    const [tx,ty0,tw,th]=L.txt; const ty=ty0+oy; g.fillStyle='#111';
    const f=fit(g, v.text.toUpperCase(), s=>`400 ${s}px "Anton"`, tw, th*.5, 1.0, th*.3); let y=lines(g,f,tx,ty,1.0,'left');
    const bfs=Math.round(th*.07); g.font=`700 ${bfs}px "Space Grotesk"`; const bw=Math.min(tw, g.measureText(v.brand).width+bfs*1.2); rr(g,tx,y+th*.04,bw,bfs*1.6,bfs*.8); g.fillStyle='#D7261E'; g.fill();
    g.fillStyle='#fff'; g.textBaseline='middle'; g.textAlign='left'; g.fillText(v.brand, tx+bfs*.6, y+th*.04+bfs*.8);
    g.fillStyle='#333'; const ff=fit(g,v.fine,s=>`600 ${s}px "IBM Plex Mono"`, tw*.6, th*.22, 1.15, th*.05); lines(g,ff,tx,ty+th*.74,1.15,'left');
    barcode(g, tx+tw*.66, ty+th*.74, tw*.34, th*.16, hashStr(v.id));
    g.font=`600 ${Math.round(th*.035)}px "IBM Plex Mono"`; g.fillStyle='#111'; g.textAlign='center'; g.textBaseline='top'; g.fillText('0 '+serial(v)+' 4', tx+tw*.83, ty+th*.91);
  };

  T.dorky = (g,W,H,v,img)=>{
    const cols=['#FF5D8F','#FF9F1C','#FFE14D','#2EC4B6','#3A86FF','#8338EC'];
    rr(g,0,0,W,H,W*.05); g.save(); g.clip(); cols.forEach((c,i)=>{ g.fillStyle=c; g.fillRect(0,i*H/cols.length,W,H/cols.length+1); });
    g.fillStyle='rgba(255,255,255,.85)'; rr(g,W*.035,W*.035,W-W*.07,H-W*.07,W*.04); g.fill(); g.restore();
    const R=rnd(hashStr(v.id)); for(let i=0;i<16;i++){ g.save(); g.translate(R()*W,R()*H); g.rotate(R()*6); g.fillStyle=cols[i%cols.length]; g.globalAlpha=.5; g.font=`${Math.round(W*.03+R()*W*.02)}px serif`; g.fillText('★',0,0); g.restore(); }
    const L=split(W,H,W*.07,.4); const [ix,iy,iw,ih]=L.img;
    burst(g, ix+iw/2, iy+ih/2, Math.min(iw,ih)*.5, 18, '#FFE14D', .82); shot(g,img,ix+iw*.08,iy+ih*.08,iw*.84,ih*.84);
    const [tx,ty,tw,th]=L.txt; const cx=tx+tw/2;
    const hf=fit(g,'CONGRATULATIONS!!!',s=>`400 ${s}px "Chewy"`, tw, th*.14, 1, th*.12);
    g.save(); g.translate(cx, ty); g.rotate(-.03); g.fillStyle='#8338EC'; g.save(); g.translate(4,4); lines(g,hf,0,0); g.restore(); g.fillStyle='#FF5D8F'; lines(g,hf,0,0); g.restore();
    g.fillStyle='#222'; g.font=`700 ${Math.round(th*.055)}px "Comic Neue"`; g.textAlign='center'; g.textBaseline='top'; g.fillText('you have won:', cx, ty+th*.16);
    const f=fit(g, v.text, s=>`400 ${s}px "Chewy"`, tw, th*.42, 1.0, th*.25);
    g.fillStyle='#3A86FF'; const y0=ty+th*.25+(th*.42-f.lines.length*f.size)/2; g.save(); g.translate(3,3); lines(g,f,cx,y0,1.0); g.restore(); g.fillStyle='#111'; lines(g,f,cx,y0,1.0);
    g.fillStyle='#FF5D8F'; const bf=fit(g,'a '+v.brand+' production',s=>`700 ${s}px "Comic Neue"`, tw, th*.08, 1, th*.06); lines(g,bf,cx,ty+th*.71);
    g.fillStyle='#444'; const ff=fit(g,'('+v.fine+')',s=>`700 ${s}px "Comic Neue"`, tw*.95, th*.15, 1.1, th*.045); lines(g,ff,cx,ty+th*.83,1.1);
  };

  T.receipt = (g,W,H,v,img)=>{
    const rw=Math.min(W, H*.8), rx=(W-rw)/2; const teeth=22, tw2=rw/teeth, td=rw*.02;
    g.beginPath(); g.moveTo(rx,td); for(let i=0;i<teeth;i++){ g.lineTo(rx+i*tw2+tw2/2,0); g.lineTo(rx+(i+1)*tw2,td); }
    g.lineTo(rx+rw,H-td); for(let i=teeth;i>0;i--){ g.lineTo(rx+i*tw2-tw2/2,H); g.lineTo(rx+(i-1)*tw2,H-td); } g.closePath();
    g.fillStyle='#F7F5EF'; g.fill(); g.save(); g.clip(); noise(g,W,H,hashStr(v.id),.04); g.restore();
    const p=rw*.08, x0=rx+p, x1=rx+rw-p, cx=rx+rw/2, cw=x1-x0; g.fillStyle='#1d1d1d'; g.textBaseline='top';
    let y=H*.05; const fs=Math.round(rw*.06);
    const bf=fit(g, v.brand.toUpperCase(), s=>`400 ${s}px "VT323"`, cw, H*.1, 1.0, rw*.12); y=lines(g,bf,cx,y,1.0);
    g.font=`400 ${fs}px "VT323"`; g.textAlign='center'; g.fillText('STORE #'+(hashStr(v.brand)%900+100)+' · TILL 3 · CASHIER: GARY', cx, y+fs*.2); y+=fs*1.4;
    g.fillText('- - - - - - - - - - - - - - - - -', cx, y); y+=fs*1.1;
    shot(g,img,x0+cw*.25,y,cw*.5,H*.18,{shadow:false, filter:'grayscale(1) contrast(1.6) brightness(1.1)'}); y+=H*.19;
    const it=fit(g,'1x '+v.text.toUpperCase(), s=>`400 ${s}px "VT323"`, cw*.72, H*.16, 1.0, fs*1.4, Math.round(fs*.8)); lines(g,it,x0,y,1.0,'left');
    g.font=`400 ${it.size}px "VT323"`; g.textAlign='right'; g.fillText('$0.00', x1, y); y+=Math.max(it.lines.length*it.size, fs)+fs*.4;
    g.textAlign='center'; g.fillText('= = = = = = = = = = = = = = = = =', cx, y); y+=fs*1.1;
    g.font=`400 ${Math.round(fs*1.5)}px "VT323"`; g.textAlign='left'; g.fillText('TOTAL', x0, y); g.textAlign='right'; g.fillText('$0.00', x1, y); y+=fs*1.9;
    const ff=fit(g,v.fine.toUpperCase(),s=>`400 ${s}px "VT323"`, cw, H*.1, 1.0, Math.round(fs*.9), 8); y=lines(g,ff,cx,y,1.0)+fs*.4;
    barcode(g, x0+cw*.1, y, cw*.8, Math.max(H*.02, Math.min(H*.06, H*.95-y)), hashStr(v.id), '#1d1d1d');
  };

  T.ticket = (g,W,H,v,img)=>{
    const land=W/H>=1.05, notch=Math.min(W,H)*.06;
    const sx = land ? W*.76 : 0, sy = land ? 0 : H*.8;
    rr(g,0,0,W,H,W*.025); g.fillStyle='#14143A'; g.fill();
    if(v.theme==='vice'){ // sunset gradient, big sun and palm silhouettes
      g.save(); g.globalCompositeOperation='source-atop'; const sg=g.createLinearGradient(0,0,0,H); sg.addColorStop(0,'#2b1055'); sg.addColorStop(.45,'#d53a9d'); sg.addColorStop(.75,'#fd8d3c'); sg.addColorStop(1,'#feca57'); g.fillStyle=sg; g.fillRect(0,0,W,H);
      const md=Math.min(W,H); g.fillStyle='rgba(255,236,170,.55)'; g.beginPath(); g.arc(W*.62,H*.72,md*.32,0,7); g.fill();
      g.fillStyle='#1b0b2e'; const palm=(x,base,h,lean)=>{ g.save(); g.translate(x,base); g.beginPath(); g.moveTo(-md*.012,0); g.quadraticCurveTo(lean*h*.3,-h*.5,lean*h*.18,-h); g.lineTo(lean*h*.18+md*.012,-h); g.quadraticCurveTo(lean*h*.3+md*.024,-h*.5,md*.012,0); g.fill();
        g.translate(lean*h*.18,-h); for(let k=0;k<7;k++){ const a=-Math.PI+k*Math.PI/6+(Math.random()-.5)*.2; g.beginPath(); g.moveTo(0,0); g.quadraticCurveTo(Math.cos(a)*h*.25,Math.sin(a)*h*.25-h*.06,Math.cos(a)*h*.42,Math.sin(a)*h*.42+h*.08); g.quadraticCurveTo(Math.cos(a)*h*.22,Math.sin(a)*h*.22,0,0); g.fill(); } g.restore(); };
      palm(W*.08,H,H*.62,.5); palm(W*.2,H,H*.42,-.3); palm(W*.93,H,H*.7,-.5); g.fillRect(0,H*.94,W,H*.06); g.restore(); }
    else { const grd=g.createLinearGradient(0,0,W,H); grd.addColorStop(0,'rgba(255,0,170,.35)'); grd.addColorStop(1,'rgba(0,229,255,.25)'); g.globalCompositeOperation='source-atop'; g.fillStyle=grd; g.fillRect(0,0,W,H); g.globalCompositeOperation='source-over'; }
    g.save(); g.globalCompositeOperation='destination-out';
    if(land){ for(const y of [0,H]){ g.beginPath(); g.arc(sx,y,notch,0,7); g.fill(); } } else { for(const x of [0,W]){ g.beginPath(); g.arc(x,sy,notch,0,7); g.fill(); } }
    g.restore();
    g.strokeStyle='rgba(255,255,255,.55)'; g.lineWidth=3; g.setLineDash([10,10]); g.beginPath(); if(land){ g.moveTo(sx,notch*1.2); g.lineTo(sx,H-notch*1.2); } else { g.moveTo(notch*1.2,sy); g.lineTo(W-notch*1.2,sy); } g.stroke(); g.setLineDash([]);
    const mw = land ? sx : W, mh = land ? H : sy, pad=Math.min(mw,mh)*.07;
    const L=split(mw,mh,pad,.38); shot(g,img,...L.img);
    const [tx,ty,tw,th]=L.txt; g.fillStyle='#00E5FF'; const hf=fit(g,'ADMIT ONE · '+v.brand.toUpperCase(),s=>`400 ${s}px "Bebas Neue"`, tw, th*.11, 1, th*.1); lines(g,hf,tx,ty,1,'left');
    g.fillStyle='#fff'; const f=fit(g, v.text.toUpperCase(), s=>`400 ${s}px "Bebas Neue"`, tw, th*.56, .95, th*.32); lines(g,f,tx,ty+th*.15,.95,'left');
    g.fillStyle='#FF4FD8'; g.fillRect(tx, ty+th*.75, tw*.18, Math.max(3,th*.012));
    g.fillStyle='rgba(255,255,255,.8)'; const ff=fit(g,v.fine,s=>`700 ${s}px "Space Grotesk"`, tw, th*.19, 1.12, th*.06); lines(g,ff,tx,ty+th*.8,1.12,'left');
    g.save(); if(land){ g.translate(sx+(W-sx)/2, H/2); g.rotate(-Math.PI/2); } else { g.translate(W/2, sy+(H-sy)/2); }
    const sl = land ? H*.8 : W*.8, sd = land ? (W-sx)*.8 : (H-sy)*.8; g.fillStyle='#fff'; g.font=`400 ${Math.round(Math.min(sl*.09, sd*.35))}px "Bebas Neue"`; g.textAlign='center'; g.textBaseline='middle'; g.fillText('No. '+serial(v), 0, -sd*.22);
    barcode(g,-sl*.4, sd*.02, sl*.8, sd*.3, hashStr(v.id), '#fff'); g.restore();
  };

  T.raffle = (g,W,H,v,img)=>{
    g.fillStyle='#C9182B'; g.fillRect(0,0,W,H);
    g.save(); g.globalCompositeOperation='destination-out'; const r=Math.min(W,H)*.02; for(let x=r;x<W;x+=r*3){ g.beginPath(); g.arc(x,0,r,0,7); g.fill(); g.beginPath(); g.arc(x,H,r,0,7); g.fill(); } g.restore();
    g.fillStyle='#FFF4DC'; const m=Math.min(W,H)*.07; g.fillRect(m,m,W-m*2,H-m*2);
    g.strokeStyle='#C9182B'; g.lineWidth=4; g.strokeRect(m*1.3,m*1.3,W-m*2.6,H-m*2.6);
    const L=split(W,H,m*1.9,.36); shot(g,img,...L.img);
    const [tx,ty,tw,th]=L.txt; const cx=tx+tw/2; g.fillStyle='#C9182B';
    const hf=fit(g,'RAFFLE PRIZE',s=>`400 ${s}px "Rubik Mono One"`, tw, th*.09, 1, th*.08); lines(g,hf,cx,ty);
    g.fillStyle='#111'; const nf=fit(g,'Nº '+serial(v),s=>`400 ${s}px "Rubik Mono One"`, tw, th*.15, 1, th*.13); lines(g,nf,cx,ty+th*.11);
    const f=fit(g, v.text.toUpperCase(), s=>`700 ${s}px "Space Grotesk"`, tw, th*.36, 1.0, th*.2); lines(g,f,cx,ty+th*.32+(th*.36-f.lines.length*f.size)/2,1.0);
    g.fillStyle='#C9182B'; const bf=fit(g,v.brand.toUpperCase(),s=>`400 ${s}px "Rubik Mono One"`, tw, th*.07, 1, th*.05); lines(g,bf,cx,ty+th*.74);
    g.fillStyle='#555'; const ff=fit(g,v.fine,s=>`700 ${s}px "Space Grotesk"`, tw, th*.12, 1.1, th*.045); lines(g,ff,cx,ty+th*.85,1.1);
  };

  T.giftcard = (g,W,H,v,img)=>{
    const h=hashStr(v.id); const hues=v.hues||[[262,320],[190,250],[12,330],[150,200]][h%4];
    rr(g,0,0,W,H,Math.min(W,H)*.08); g.save(); g.clip();
    const gr=g.createLinearGradient(0,0,W,H); gr.addColorStop(0,`hsl(${hues[0]},85%,55%)`); gr.addColorStop(1,`hsl(${hues[1]},90%,50%)`); g.fillStyle=gr; g.fillRect(0,0,W,H);
    for(let i=0;i<3;i++){ const rg=g.createRadialGradient(W*(.2+.3*i),H*(.8-.3*i),0,W*(.2+.3*i),H*(.8-.3*i),W*.5); rg.addColorStop(0,'rgba(255,255,255,.25)'); rg.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=rg; g.fillRect(0,0,W,H); }
    const sh=g.createLinearGradient(0,0,W*.6,H); sh.addColorStop(0,'rgba(255,255,255,.35)'); sh.addColorStop(.4,'rgba(255,255,255,0)'); g.fillStyle=sh; g.fillRect(0,0,W,H);
    g.restore();
    const md=Math.min(W,H), pad=md*.08; g.fillStyle='#fff';
    const bf=fit(g,v.brand,s=>`400 ${s}px "Righteous"`, W*.6, md*.1, 1, md*.075); lines(g,bf,pad,pad,1,'left');
    g.textAlign='right'; g.textBaseline='top'; g.font=`700 ${Math.round(md*.045)}px "Space Grotesk"`; g.fillText('GIFT CARD', W-pad, pad*1.1);
    const cw=md*.16, ch=cw*.75, cy=pad*2.4; const cg=g.createLinearGradient(pad,cy,pad+cw,cy+ch); cg.addColorStop(0,'#f6e2a0'); cg.addColorStop(1,'#b8913a'); rr(g,pad,cy,cw,ch,cw*.15); g.fillStyle=cg; g.fill();
    g.strokeStyle='rgba(90,60,10,.6)'; g.lineWidth=2; for(let i=1;i<3;i++){ g.beginPath(); g.moveTo(pad+cw*i/3,cy); g.lineTo(pad+cw*i/3,cy+ch); g.stroke(); } g.beginPath(); g.moveTo(pad,cy+ch/2); g.lineTo(pad+cw,cy+ch/2); g.stroke();
    const land=W/H>=1.05; if(land) shot(g,img,W*.55,H*.16,W*.4,H*.6); else shot(g,img,W*.3,H*.06,W*.62,H*.34);
    const tw=land?W*.5:W-pad*2, ty=land?cy+ch+pad*.6:H*.44; g.fillStyle='#fff';
    const f=fit(g, v.text, s=>`700 ${s}px "Space Grotesk"`, tw, H*(land?.3:.26), 1.0, md*.14); lines(g,f,pad,ty,1.0,'left');
    // the punchline gets the spotlight: big, bold, on a dark glass pill
    const fw=land?W*.5:W-pad*2, ff=fit(g,v.fine,s=>`700 ${s}px "Space Grotesk"`, fw-md*.06, md*.22, 1.12, md*.075);
    const fh=ff.lines.length*ff.size*1.12, fy=H-pad-fh-md*.04; rr(g,pad,fy,fw,fh+md*.05,md*.03); g.fillStyle='rgba(0,0,0,.28)'; g.fill();
    g.fillStyle='#fff'; lines(g,ff,pad+md*.03,fy+md*.025,1.12,'left');
  };

  T.spa = (g,W,H,v,img)=>{
    g.fillStyle='#F3EEE3'; rr(g,0,0,W,H,W*.01); g.fill(); noise(g,W,H,hashStr(v.id),.03);
    g.strokeStyle='#7C8C6E'; g.lineWidth=2; const m=Math.min(W,H)*.05; g.strokeRect(m,m,W-m*2,H-m*2);
    const L=split(W,H,m*2,.42); const [ix,iy,iw,ih]=L.img; g.fillStyle='#DCE3D2'; g.beginPath(); g.ellipse(ix+iw/2,iy+ih/2,Math.min(iw,ih)*.48,Math.min(iw,ih)*.48,0,0,7); g.fill(); shot(g,img,ix+iw*.05,iy+ih*.05,iw*.9,ih*.9);
    const [tx,ty,tw,th]=L.txt; const cx=tx+tw/2; g.fillStyle='#4F5D44';
    const bf=fit(g,v.brand.toUpperCase().split('').join(' '),s=>`600 ${s}px "Cormorant Garamond"`, tw, th*.08, 1, th*.055); lines(g,bf,cx,ty);
    g.fillRect(cx-tw*.08, ty+th*.11, tw*.16, 2);
    g.font=`italic 600 ${Math.round(th*.07)}px "Cormorant Garamond"`; g.textAlign='center'; g.textBaseline='top'; g.fillText('a gift of calm', cx, ty+th*.15);
    const f=fit(g, v.text, s=>`italic 600 ${s}px "Cormorant Garamond"`, tw, th*.42, 1.0, th*.22); g.fillStyle='#2F3A28'; lines(g,f,cx,ty+th*.28+(th*.42-f.lines.length*f.size)/2,1.0);
    g.fillStyle='#6b7760'; const ff=fit(g,v.fine,s=>`italic 600 ${s}px "Cormorant Garamond"`, tw*.9, th*.14, 1.1, th*.055); lines(g,ff,cx,ty+th*.8,1.1);
  };

  T.official = (g,W,H,v,img)=>{
    g.fillStyle='#EEF1E8'; g.fillRect(0,0,W,H);
    g.strokeStyle='rgba(60,90,120,.12)'; g.lineWidth=1; for(let x=0;x<W;x+=W/40){ g.beginPath(); g.moveTo(x,0); g.lineTo(x,H); g.stroke(); } for(let y=0;y<H;y+=W/40){ g.beginPath(); g.moveTo(0,y); g.lineTo(W,y); g.stroke(); }
    const m=Math.min(W,H)*.05; g.strokeStyle='#23384f'; g.lineWidth=3; g.strokeRect(m,m,W-m*2,H-m*2);
    g.fillStyle='#23384f'; const fs=Math.min(W,H)*.045;
    const hf=fit(g,v.brand,s=>`700 ${s}px "Playfair Display"`, W-m*4, fs*1.4, 1, fs*1.2); let hy=lines(g,hf,W/2,m*1.5,1);
    const sf=fit(g,'FORM 27-B/6 · CERTIFICATE OF ENTITLEMENT · DO NOT FOLD',s=>`600 ${s}px "IBM Plex Mono"`, W-m*4, fs*.9, 1, fs*.7); hy=lines(g,sf,W/2,hy+fs*.2,1);
    const top=hy+fs*.4; const L=split(W,H-top,m*1.6,.33);
    const [ix,iy,iw,ih]=L.img; g.strokeStyle='#23384f'; g.lineWidth=2; g.strokeRect(ix,iy+top,iw,ih); g.font=`600 ${Math.round(fs*.55)}px "IBM Plex Mono"`; g.textAlign='left'; g.textBaseline='top'; g.fillText('EXHIBIT A', ix+6, iy+top+6);
    shot(g,img,ix+iw*.08,iy+top+ih*.12,iw*.84,ih*.82);
    const [tx,ty0,tw,th]=L.txt; const ty=ty0+top; g.textAlign='left';
    const label=(k,y,h)=>{ g.font=`600 ${Math.round(fs*.6)}px "IBM Plex Mono"`; g.fillStyle='#5a6c80'; g.textAlign='left'; g.textBaseline='top'; g.fillText(k,tx,y); g.strokeStyle='#5a6c80'; g.lineWidth=1; g.beginPath(); g.moveTo(tx,y+h); g.lineTo(tx+tw,y+h); g.stroke(); };
    label('1. ENTITLEMENT GRANTED', ty, th*.5);
    const f=fit(g, v.text, s=>`600 ${s}px "IBM Plex Mono"`, tw, th*.38, 1.05, th*.16); g.fillStyle='#111'; lines(g,f,tx,ty+th*.09,1.05,'left');
    label('2. REFERENCE No.', ty+th*.56, th*.16); g.fillStyle='#111'; g.font=`600 ${Math.round(fs*.9)}px "IBM Plex Mono"`; g.fillText(serial(v)+'-'+(hashStr(v.text)%99), tx, ty+th*.63);
    g.fillStyle='#5a6c80'; const ff=fit(g,'NOTE: '+v.fine,s=>`600 ${s}px "IBM Plex Mono"`, tw, th*.16, 1.15, fs*.6); lines(g,ff,tx,ty+th*.8,1.15,'left');
    g.save(); g.translate(tx+tw*.74, ty+th*.68); g.rotate(-.2); g.globalAlpha=.78; g.strokeStyle='#C62828'; g.fillStyle='#C62828'; g.lineWidth=fs*.18;
    const sw=Math.min(tw*.44, fs*7), sh2=fs*1.8; rr(g,-sw/2,-sh2/2,sw,sh2,fs*.3); g.stroke(); g.textAlign='center'; g.textBaseline='middle';
    const st=fit(g,'APPROVED-ISH',s=>`400 ${s}px "Anton"`, sw*.85, sh2*.8, 1, fs*1.4); g.font=`400 ${st.size}px "Anton"`; g.fillText('APPROVED-ISH', 0, 0); g.restore();
  };

  T.retro = (g,W,H,v,img)=>{
    rr(g,0,0,W,H,Math.min(W,H)*.06); g.fillStyle='#FFF1D6'; g.fill(); g.save(); g.clip();
    const cols=['#F4A259','#E76F51','#BC4B51','#5B3A29']; const md=Math.min(W,H), sw=md*.045;
    cols.forEach((c,i)=>{ g.fillStyle=c; g.beginPath(); g.arc(W*1.04, H*1.08, md*(.44-i*.065), 0, 7); g.fill(); });
    g.fillStyle='#FFF1D6'; g.beginPath(); g.arc(W*1.04,H*1.08,md*.18,0,7); g.fill();
    cols.forEach((c,i)=>{ g.fillStyle=c; g.fillRect(0, i*sw, W, sw*.8); });
    g.restore();
    const top=sw*4.4; const L=split(W,H-top,md*.08,.4); const [ix,iy,iw,ih]=L.img; shot(g,img,ix,iy+top,iw,ih);
    const [tx,ty0,tw,th]=L.txt; const ty=ty0+top; const cx=tx+tw/2;
    g.fillStyle='#BC4B51'; const hf=fit(g,'★ GROOVY DEAL ★',s=>`400 ${s}px "Righteous"`, tw, th*.1, 1, th*.08); lines(g,hf,cx,ty);
    const f=fit(g, v.text, s=>`400 ${s}px "Shrikhand"`, tw, th*.5, 1.05, th*.25);
    const y0=ty+th*.13+(th*.5-f.lines.length*f.size*1.05)/2; g.fillStyle='#F4A259'; g.save(); g.translate(4,4); lines(g,f,cx,y0,1.05); g.restore(); g.fillStyle='#5B3A29'; lines(g,f,cx,y0,1.05);
    g.fillStyle='#E76F51'; const bf=fit(g,v.brand,s=>`400 ${s}px "Righteous"`, tw, th*.09, 1, th*.075); lines(g,bf,cx,ty+th*.68);
    g.fillStyle='#5B3A29'; const ff=fit(g,v.fine,s=>`400 ${s}px "Righteous"`, tw, th*.14, 1.1, th*.05); lines(g,ff,cx,ty+th*.82,1.1);
  };

  // Banknote: guilloche, ornate frame, portrait oval, serial numbers. Very official, legally worthless.
  T.banknote = (g,W,H,v,img,fm)=>{
    const R=rnd(hashStr(v.id)), md=Math.min(W,H), ink='#1f4d45', ink2='#7a2b1f';
    g.fillStyle='#E8EEDC'; g.fillRect(0,0,W,H);
    g.save(); g.globalAlpha=.16; g.strokeStyle=ink; g.lineWidth=1.2;
    for(let k=0;k<70;k++){ g.beginPath(); for(let t=0;t<=6.29;t+=.02){ const r=md*(.22+.14*Math.sin(t*7+k*.09)); const x=W*.5+Math.cos(t+k*.045)*r*1.7, y=H*.5+Math.sin(t+k*.045)*r; t?g.lineTo(x,y):g.moveTo(x,y); } g.stroke(); }
    g.restore();
    const m=md*.045; g.strokeStyle=ink; g.lineWidth=md*.012; g.strokeRect(m,m,W-m*2,H-m*2); g.lineWidth=md*.004; g.strokeRect(m*1.6,m*1.6,W-m*3.2,H-m*3.2);
    g.fillStyle=ink; g.font=`700 ${Math.round(md*.12)}px "Cinzel"`; g.textBaseline='middle'; g.textAlign='center';
    [[m*3.4,m*3.6],[W-m*3.4,m*3.6],[m*3.4,H-m*3.6],[W-m*3.4,H-m*3.6]].forEach(([x,y])=>{ g.beginPath(); g.arc(x,y,md*.085,0,7); g.lineWidth=md*.006; g.stroke(); g.fillText('0',x,y+md*.006); });
    const land=W/H>=1.05, ow=land?W*.26:W*.42, oh=land?H*.56:H*.3, ox=land?W*.27:W*.5, oy=land?H*.52:H*.32;
    g.save(); g.beginPath(); g.ellipse(ox,oy,ow/2,oh/2,0,0,7); g.fillStyle='#d9e3cc'; g.fill(); g.clip(); shot(g,img,ox-ow*.42,oy-oh*.42,ow*.84,oh*.84,{shadow:false,filter:'saturate(.6) contrast(1.1)'}); g.restore();
    g.beginPath(); g.ellipse(ox,oy,ow/2,oh/2,0,0,7); g.lineWidth=md*.014; g.strokeStyle='#b8902f'; g.stroke();
    if(fm){ fm.beginPath(); fm.ellipse(ox,oy,ow/2,oh/2,0,0,7); fm.lineWidth=md*.02; fm.strokeStyle='#0000ff'; fm.stroke(); }
    const tx=land?W*.43:W*.17, tw=land?W*.47:W*.66, ty=land?H*.2:H*.5, th=land?H*.6:H*.3;
    g.fillStyle=ink; g.textAlign='center';
    const hf=fit(g,('THE BANK OF '+v.brand).toUpperCase(),s=>`700 ${s}px "Cinzel"`, tw, th*.14, 1, md*.05); lines(g,hf,tx+tw/2,ty);
    const f=fit(g,v.text,s=>`700 ${s}px "Cinzel"`, tw, th*.48, 1.05, md*.12); lines(g,f,tx+tw/2,ty+th*.2,1.05);
    g.fillStyle=ink2; const ff=fit(g,v.fine,s=>`italic 600 ${s}px "Cormorant Garamond"`, tw, th*.16, 1.1, md*.05); lines(g,ff,tx+tw/2,ty+th*.74,1.1);
    g.fillStyle=ink2; g.font=`600 ${Math.round(md*.04)}px "IBM Plex Mono"`; g.textAlign='left'; g.fillText('A '+serial(v)+' Z', m*6.2, m*3.6); g.textAlign='right'; g.fillText('A '+serial(v)+' Z', W-m*6.2, H-m*3.6);
  };

  // ---------- social media posts (parodies: layouts only, no real logos)
  const SANS = (w,s)=>`${w} ${Math.round(s)}px "Space Grotesk", system-ui, sans-serif`;
  const handle = v => v.brand.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
  function avatar(g,x,y,r,fill,ring){ if(ring){ const lg=g.createLinearGradient(x-r,y+r,x+r,y-r); lg.addColorStop(0,'#f9b233'); lg.addColorStop(.5,'#e1306c'); lg.addColorStop(1,'#833ab4'); g.fillStyle=lg; g.beginPath(); g.arc(x,y,r*1.16,0,7); g.fill(); g.fillStyle='#fff'; g.beginPath(); g.arc(x,y,r*1.06,0,7); g.fill(); }
    g.fillStyle=fill; g.beginPath(); g.arc(x,y,r,0,7); g.fill(); g.fillStyle='rgba(255,255,255,.85)'; g.beginPath(); g.arc(x,y-r*.22,r*.34,0,7); g.fill(); g.beginPath(); g.arc(x,y+r*.62,r*.6,Math.PI,0); g.fill(); }
  function postFrame(W,H,pad){ const land=W/H>=1.05; return land ? {img:[pad,pad,W*.42-pad,H-pad*2], txt:[W*.42+pad*.6,pad,W*.58-pad*1.6,H-pad*2]} : {img:[pad,H*.3,W-pad*2,H*.36], txt:[pad,pad,W-pad*2,H-pad*2]}; }
  function heart(g,x,y,s,fill){ g.beginPath(); g.moveTo(x,y+s*.3); g.bezierCurveTo(x,y,x-s*.5,y,x-s*.5,y+s*.3); g.bezierCurveTo(x-s*.5,y+s*.6,x,y+s*.8,x,y+s); g.bezierCurveTo(x,y+s*.8,x+s*.5,y+s*.6,x+s*.5,y+s*.3); g.bezierCurveTo(x+s*.5,y,x,y,x,y+s*.3); if(fill){ g.fillStyle=fill; g.fill(); } else g.stroke(); }

  T.linkedin = (g,W,H,v,img)=>{
    const md=Math.min(W,H), pad=md*.06, blue='#0a66c2', ink='#191919', mute='#666', land=W/H>=1.05;
    rr(g,0,0,W,H,md*.04); g.fillStyle='#fff'; g.fill(); g.strokeStyle='#dcdad5'; g.lineWidth=3; g.stroke();
    let ix,iy,iw,ih,tx,ty,tw,th;
    if(land){ [ix,iy,iw,ih]=[pad,pad,W*.42-pad,H-pad*2]; [tx,ty,tw,th]=[W*.42+pad*.6,pad,W*.58-pad*1.6,H-pad*2]; }
    else { tx=pad; ty=pad; tw=W-pad*2; th=H-pad*2; }
    const ar=md*.055; avatar(g,tx+ar,ty+ar,ar,blue);
    g.fillStyle=ink; g.textAlign='left'; g.textBaseline='top';
    const nf=fit(g,v.brand,s2=>SANS(700,s2),tw-ar*2.4-md*.2,ar*.9,1,md*.042); lines(g,nf,tx+ar*2.4,ty+ar*.15,1,'left');
    g.fillStyle=mute; g.font=SANS(400,md*.03); g.fillText('Visionary · Thought Leader · 1st', tx+ar*2.4, ty+ar*1.1);
    g.fillStyle=blue; g.font=SANS(700,md*.034); g.textAlign='right'; g.fillText('+ Follow', tx+tw, ty+ar*.3); g.textAlign='left';
    let y=ty+ar*2.6; g.fillStyle=ink; g.font=SANS(400,md*.034); g.fillText('Thrilled to announce:', tx, y); y+=md*.06;
    const f=fit(g,v.text,s2=>SANS(700,s2),tw,land?th*.34:H*.17,1.08,md*.1); lines(g,f,tx,y,1.08,'left'); y+=f.lines.length*f.size*1.08+md*.02;
    g.fillStyle=blue; g.font=SANS(700,md*.03); g.fillText('#grateful #blessed #agree', tx, y); y+=md*.07;
    if(!land){ [ix,iy,iw,ih]=[tx,y,tw,H*.3]; y+=ih+md*.04; } else y=ty+th*.72;
    g.fillStyle='#eef3f8'; rr(g,ix,iy,iw,ih,md*.03); g.fill(); shot(g,img,ix+iw*.08,iy+ih*.08,iw*.84,ih*.84);
    ['#378fe9','#df704d','#6dae4f'].forEach((c,i)=>{ g.fillStyle=c; g.beginPath(); g.arc(tx+md*.022+i*md*.03,y+md*.02,md*.02,0,7); g.fill(); });
    g.fillStyle=mute; g.font=SANS(400,md*.028); g.fillText('1,203 · 47 comments · 0 recruiters', tx+md*.12, y+md*.005);
    g.strokeStyle='#e8e6e1'; g.lineWidth=2; g.beginPath(); g.moveTo(tx,y+md*.06); g.lineTo(tx+tw,y+md*.06); g.stroke();
    g.fillStyle=mute; g.font=SANS(700,md*.03); ['Like','Comment','Repost','Send'].forEach((t,i)=>g.fillText(t, tx+i*tw/4, y+md*.08));
    const cy=y+md*.15, chh=Math.max(md*.06, ty+th-cy); g.fillStyle='#f2f2f2'; rr(g,tx,cy,tw,chh,md*.02); g.fill(); g.fillStyle=ink;
    const cf=fit(g,v.fine,s2=>SANS(400,s2),tw-md*.04,chh-md*.03,1.15,md*.032); lines(g,cf,tx+md*.02,cy+md*.015,1.15,'left');
  };

  T.insta = (g,W,H,v,img)=>{
    const md=Math.min(W,H), pad=md*.05, ink='#111', mute='#737373', land=W/H>=1.05;
    rr(g,0,0,W,H,md*.04); g.fillStyle='#fff'; g.fill();
    let ix,iy,iw,ih,tx,ty,tw,th;
    if(land){ [ix,iy,iw,ih]=[pad,pad,W*.42-pad,H-pad*2]; [tx,ty,tw,th]=[W*.42+pad*.6,pad,W*.58-pad*1.6,H-pad*2]; }
    else { tx=pad; ty=pad; tw=W-pad*2; th=H-pad*2; }
    const ar=md*.05; avatar(g,tx+ar,ty+ar,ar,'#c9c9c9',true);
    g.fillStyle=ink; g.textAlign='left'; g.textBaseline='top';
    const hf=fit(g,handle(v),s2=>SANS(700,s2),tw-ar*2.6,ar*.9,1,md*.038); lines(g,hf,tx+ar*2.5,ty+ar*.2,1,'left');
    g.fillStyle=mute; g.font=SANS(400,md*.028); g.fillText('Sponsored', tx+ar*2.5, ty+ar*1.1);
    let y=ty+ar*2.6;
    if(!land){ [ix,iy,iw,ih]=[tx,y,tw,H*.4]; y+=ih+md*.03; }
    const lg=g.createLinearGradient(ix,iy+ih,ix+iw,iy); lg.addColorStop(0,'#feda75'); lg.addColorStop(.5,'#fa7e1e'); lg.addColorStop(1,'#d62976'); g.fillStyle=lg; rr(g,ix,iy,iw,ih,md*.02); g.fill(); shot(g,img,ix+iw*.1,iy+ih*.1,iw*.8,ih*.8);
    g.strokeStyle=ink; g.lineWidth=md*.006; const s=md*.05;
    heart(g,tx+s*.5,y,s,'#ed4956'); g.beginPath(); g.arc(tx+s*1.9,y+s*.5,s*.45,0,7); g.stroke();
    g.beginPath(); g.moveTo(tx+s*2.8,y+s*.1); g.lineTo(tx+s*3.8,y+s*.5); g.lineTo(tx+s*2.8,y+s*.9); g.closePath(); g.stroke();
    g.strokeRect(tx+tw-s*.7,y,s*.6,s*.95);
    y+=s*1.4; g.fillStyle=ink; g.font=SANS(700,md*.032); g.fillText('Liked by your_mom and 98 others', tx, y); y+=md*.06;
    const f=fit(g,v.text,s2=>SANS(700,s2),tw,land?th*.3:H*.15,1.08,md*.085); lines(g,f,tx,y,1.08,'left'); y+=f.lines.length*f.size*1.08+md*.02;
    const foot=ty+th-md*.035; g.fillStyle=mute; const cf=fit(g,v.fine,s2=>SANS(400,s2),tw,Math.max(md*.04,foot-y-md*.02),1.15,md*.032); lines(g,cf,tx,y,1.15,'left');
    g.fillStyle='#b0b0b0'; g.font=SANS(400,md*.026); g.fillText('View all 4,031 comments · 2 HOURS AGO', tx, foot);
  };

  T.facebook = (g,W,H,v,img)=>{
    const md=Math.min(W,H), pad=md*.05, blue='#1877f2', ink='#050505', mute='#65676b';
    rr(g,0,0,W,H,md*.04); g.fillStyle='#fff'; g.fill(); g.strokeStyle='#dddfe2'; g.lineWidth=3; g.stroke();
    const land=W/H>=1.05; const ar=md*.055;
    avatar(g,pad+ar,pad+ar,ar,blue);
    g.fillStyle=ink; g.font=SANS(700,md*.042); g.textAlign='left'; g.textBaseline='top'; g.fillText(v.brand, pad+ar*2.4, pad+ar*.15);
    g.fillStyle=mute; g.font=SANS(400,md*.03); g.fillText('Shared a memory · 2h · Public', pad+ar*2.4, pad+ar*1.05);
    const bx=pad, by=pad+ar*2.5, bw=W-pad*2, bh=H*(land?.5:.45);
    const lg=g.createLinearGradient(bx,by,bx+bw,by+bh); lg.addColorStop(0,'#7b2ff7'); lg.addColorStop(1,'#f107a3'); g.fillStyle=lg; rr(g,bx,by,bw,bh,md*.02); g.fill();
    shot(g,img,bx+bw*(land?.04:.06),by+bh*.12,bw*(land?.26:.3),bh*.76);
    g.fillStyle='#fff'; const f=fit(g,v.text,s=>SANS(700,s),bw*(land?.62:.56),bh*.8,1.08,md*.11); const fy=by+(bh-f.lines.length*f.size*1.08)/2; lines(g,f,bx+bw*(land?.66:.66),fy,1.08,'center');
    let y=by+bh+md*.03;
    [['#1877f2','👍'],['#f7b125','😆']].forEach((c,i)=>{ g.fillStyle=c[0]; g.beginPath(); g.arc(pad+md*.022+i*md*.032,y+md*.02,md*.02,0,7); g.fill(); });
    g.fillStyle=mute; g.font=SANS(400,md*.03); g.textAlign='left'; g.textBaseline='top'; g.fillText('You and 1.2K others', pad+md*.1, y+md*.003); g.textAlign='right'; g.fillText('340 comments · 2 shares', W-pad, y+md*.003);
    y+=md*.065; g.strokeStyle='#ced0d4'; g.lineWidth=2; g.beginPath(); g.moveTo(pad,y); g.lineTo(W-pad,y); g.stroke();
    g.textAlign='center'; g.font=SANS(700,md*.032); ['Like','Comment','Share'].forEach((t,i)=>g.fillText(t, pad+(W-pad*2)*(i*2+1)/6, y+md*.02));
    y+=md*.08; g.fillStyle='#f0f2f5'; rr(g,pad,y,W-pad*2,H-pad-y,md*.03); g.fill(); g.fillStyle=ink; g.textAlign='left';
    const cf=fit(g,'Aunt Linda: '+v.fine,s=>SANS(400,s),W-pad*2-md*.05,H-pad-y-md*.03,1.15,md*.034); lines(g,cf,pad+md*.025,y+md*.015,1.15,'left');
  };

  // ---------- more designs
  const lay = (W,H,pad,top,imgFrac=.38)=>{ const L=split(W,H-top,pad,imgFrac); L.img[1]+=top; L.txt[1]+=top; return L; };

  // An email in your inbox
  T.gmail = (g,W,H,v,img)=>{
    const md=Math.min(W,H), pad=md*.05, ink='#1f1f1f', mute='#5f6368';
    rr(g,0,0,W,H,md*.04); g.fillStyle='#fff'; g.fill();
    g.save(); rr(g,0,0,W,H,md*.04); g.clip(); g.fillStyle='#f6f8fc'; g.fillRect(0,0,W,md*.13); g.restore();
    g.strokeStyle=mute; g.lineWidth=md*.008; for(let i=0;i<3;i++){ g.beginPath(); g.moveTo(pad,md*.045+i*md*.02); g.lineTo(pad+md*.05,md*.045+i*md*.02); g.stroke(); }
    ['#ea4335','#fbbc04','#34a853','#4285f4'].forEach((c,i)=>{ g.fillStyle=c; g.beginPath(); g.arc(pad+md*.1+i*md*.032,md*.065,md*.013,0,7); g.fill(); });
    g.fillStyle='#e9eef6'; rr(g,pad+md*.26,md*.03,W-pad*2-md*.26,md*.07,md*.035); g.fill(); g.fillStyle=mute; g.font=SANS(400,md*.032); g.textAlign='left'; g.textBaseline='middle'; g.fillText('Search mail', pad+md*.3, md*.065);
    let y=md*.17; g.fillStyle=ink; g.textBaseline='top';
    const sf=fit(g,v.text,s2=>SANS(400,s2),W-pad*2-md*.16,H*.18,1.08,md*.075); lines(g,sf,pad,y,1.08,'left');
    const lastW=g.measureText(sf.lines[sf.lines.length-1]).width; g.font=SANS(700,md*.026); const chipX=Math.min(W-pad-md*.12, pad+lastW+md*.02), chipY=y+(sf.lines.length-1)*sf.size*1.08+sf.size*.2;
    g.fillStyle='#e8eaed'; rr(g,chipX,chipY,md*.11,md*.045,md*.01); g.fill(); g.fillStyle=mute; g.fillText('Inbox', chipX+md*.015, chipY+md*.01);
    y+=sf.lines.length*sf.size*1.08+md*.04;
    const ar=md*.04; avatar(g,pad+ar,y+ar,ar,'#4285f4'); g.fillStyle=ink; g.font=SANS(700,md*.034); g.fillText(v.brand, pad+ar*2.6, y); g.fillStyle=mute; g.font=SANS(400,md*.028);
    g.fillText('<noreply@'+handle(v).replace(/_/g,'')+'.com>  to me', pad+ar*2.6, y+md*.045); g.textAlign='right'; g.fillText('9:41 AM  ☆', W-pad, y); g.textAlign='left';
    y+=ar*2+md*.05; const L=split(W,H-y-md*.13,pad,.36), [ix,iy,iw,ih]=L.img, [tx,ty,tw,th]=L.txt;
    g.fillStyle='#f1f3f4'; rr(g,ix,iy+y,iw,ih,md*.02); g.fill(); shot(g,img,ix+iw*.1,iy+y+ih*.1,iw*.8,ih*.8);
    g.fillStyle=ink; g.font=SANS(400,md*.032); g.fillText('Hi you,', tx, ty+y); const bf=fit(g,v.fine,s2=>SANS(700,s2),tw,th-md*.08,1.2,md*.055); lines(g,bf,tx,ty+y+md*.06,1.2,'left');
    const by=H-pad-md*.07; g.lineWidth=2; g.strokeStyle='#747775'; g.font=SANS(700,md*.03); ['↩ Reply','↪ Forward'].forEach((t,i)=>{ const bx=pad+i*md*.24; rr(g,bx,by,md*.21,md*.07,md*.035); g.stroke(); g.fillStyle=ink; g.textBaseline='middle'; g.fillText(t,bx+md*.035,by+md*.035); g.textBaseline='top'; });
  };

  // A lock-screen notification
  T.notif = (g,W,H,v,img)=>{
    const md=Math.min(W,H), pad=md*.06;
    rr(g,0,0,W,H,md*.06); const lg=g.createLinearGradient(0,0,W,H); lg.addColorStop(0,'#3a7bd5'); lg.addColorStop(.55,'#6a5acd'); lg.addColorStop(1,'#f093fb'); g.fillStyle=lg; g.fill();
    g.fillStyle='rgba(255,255,255,.9)'; g.textAlign='center'; g.textBaseline='top'; g.font=SANS(400,md*.05); g.fillText('Monday, 9 September', W/2, pad*1.3);
    g.font=SANS(700,md*.2); g.fillText('9:41', W/2, pad*1.3+md*.06);
    const cy=pad*1.3+md*.32, cw=W-pad*2, chh=H-cy-pad*1.6; g.fillStyle='rgba(255,255,255,.82)'; rr(g,pad,cy,cw,chh,md*.05); g.fill();
    const icon=md*.11; g.fillStyle='#fff'; rr(g,pad+md*.04,cy+md*.04,icon,icon,icon*.24); g.fill(); shot(g,img,pad+md*.045,cy+md*.045,icon*.9,icon*.9,{shadow:false});
    g.fillStyle='#333'; g.textAlign='left'; g.font=SANS(700,md*.034); g.fillText(v.brand.toUpperCase(), pad+md*.04+icon+md*.03, cy+md*.05); g.textAlign='right'; g.font=SANS(400,md*.03); g.fillText('now', W-pad-md*.04, cy+md*.05);
    g.textAlign='left'; g.fillStyle='#000'; const tf=fit(g,v.text,s2=>SANS(700,s2),cw-md*.08,chh*.4,1.08,md*.085); let y=lines(g,tf,pad+md*.04,cy+md*.06+icon,1.08,'left')+md*.02;
    g.fillStyle='#333'; const ff=fit(g,v.fine,s2=>SANS(400,s2),cw-md*.08,cy+chh-y-md*.03,1.15,md*.05); lines(g,ff,pad+md*.04,y,1.15,'left');
    g.fillStyle='rgba(255,255,255,.85)'; rr(g,W/2-md*.12,H-pad*.8,md*.24,md*.012,md*.006); g.fill();
  };

  // A chat with an AI that gives you exactly one answer
  T.chat = (g,W,H,v,img)=>{
    const md=Math.min(W,H), pad=md*.06, ink='#0d0d0d', mute='#8e8ea0', [q,a]=v.chat||[v.text,v.fine];
    rr(g,0,0,W,H,md*.04); g.fillStyle='#fff'; g.fill(); g.strokeStyle='#e5e5e5'; g.lineWidth=3; g.stroke();
    g.fillStyle=ink; g.textAlign='left'; g.textBaseline='top'; g.font=SANS(700,md*.038); g.fillText(v.brand+' ⌄', pad, pad*.9);
    g.fillStyle='#10a37f'; rr(g,W-pad-md*.22,pad*.75,md*.22,md*.07,md*.035); g.fill(); g.fillStyle='#fff'; g.font=SANS(700,md*.03); g.textAlign='center'; g.fillText('FREE PLAN', W-pad-md*.11, pad*.75+md*.02);
    g.textAlign='left'; g.fillStyle=ink; const tf=fit(g,v.text,s2=>SANS(700,s2),W-pad*2,H*.14,1.05,md*.075); let y=lines(g,tf,pad,pad*.9+md*.09,1.05,'left')+md*.05;
    g.font=SANS(400,md*.042); const qL=wrap(g,q,W*.55), qw=Math.max(...qL.map(l=>g.measureText(l).width))+md*.06, qh=qL.length*md*.052+md*.04;
    g.fillStyle='#f4f4f4'; rr(g,W-pad-qw,y,qw,qh,md*.04); g.fill(); g.fillStyle=ink; qL.forEach((l,i)=>g.fillText(l, W-pad-qw+md*.03, y+md*.02+i*md*.052)); y+=qh+md*.05;
    const ar=md*.065; g.fillStyle='#fff'; g.beginPath(); g.arc(pad+ar,y+ar,ar,0,7); g.fill(); g.strokeStyle='#e5e5e5'; g.lineWidth=2; g.stroke(); shot(g,img,pad+ar*.2,y+ar*.2,ar*1.6,ar*1.6,{shadow:false});
    g.fillStyle=ink; const af=fit(g,a,s2=>SANS(700,s2),W-pad*2-ar*2.6,Math.max(md*.1,H-y-md*.2),1.1,md*.14); lines(g,af,pad+ar*2.6,y,1.1,'left');
    const iy=H-pad-md*.08; g.strokeStyle='#d9d9e3'; g.lineWidth=3; rr(g,pad,iy,W-pad*2,md*.08,md*.04); g.stroke(); g.fillStyle=mute; g.font=SANS(400,md*.03); g.textBaseline='middle'; g.fillText(v.note||'Message limit reached. Try again next month.', pad+md*.03, iy+md*.04);
  };

  // A streaming title card
  T.stream = (g,W,H,v,img)=>{
    const md=Math.min(W,H), pad=md*.07, red='#e50914';
    rr(g,0,0,W,H,md*.04); g.fillStyle='#0b0b0b'; g.fill(); g.save(); g.clip();
    const rg=g.createRadialGradient(W*.75,H*.4,0,W*.75,H*.4,md*.8); rg.addColorStop(0,'rgba(229,9,20,.55)'); rg.addColorStop(1,'rgba(229,9,20,0)'); g.fillStyle=rg; g.fillRect(0,0,W,H); g.restore();
    const land=W/H>=1.05; if(land) shot(g,img,W*.52,H*.1,W*.44,H*.72); else shot(g,img,W*.2,H*.08,W*.6,H*.36);
    const tx=pad, tw=land?W*.5:W-pad*2; let y=land?pad:H*.47;
    g.fillStyle=red; g.font=`400 ${Math.round(md*.07)}px "Bebas Neue"`; g.textAlign='left'; g.textBaseline='top'; g.fillText('N   S E R I E S', tx, y); y+=md*.08;
    g.fillStyle='#fff'; const f=fit(g,v.text.toUpperCase(),s2=>`400 ${s2}px "Bebas Neue"`,tw,H*(land?.38:.2),.95,md*.2); y=lines(g,f,tx,y,.95,'left')+md*.02;
    g.fillStyle=red; rr(g,tx,y,md*.13,md*.06,md*.01); g.fill(); g.fillStyle='#fff'; g.font=SANS(700,md*.03); g.fillText('TOP 10', tx+md*.017, y+md*.013); g.fillStyle='#bbb'; g.fillText('#1 in Passwords Today', tx+md*.16, y+md*.013); y+=md*.09;
    g.fillStyle='#e6e6e6'; const ff=fit(g,v.fine,s2=>SANS(700,s2),tw,H*(land?.2:.13),1.15,md*.05); y=lines(g,ff,tx,y,1.15,'left')+md*.03;
    g.fillStyle='#fff'; rr(g,tx,y,md*.2,md*.075,md*.012); g.fill(); g.fillStyle='#000'; g.font=SANS(700,md*.035); g.textBaseline='middle'; g.fillText('▶ Play', tx+md*.04, y+md*.0375);
    g.fillStyle='rgba(109,109,110,.7)'; rr(g,tx+md*.23,y,md*.26,md*.075,md*.012); g.fill(); g.fillStyle='#fff'; g.fillText('ⓘ More Info', tx+md*.26, y+md*.0375);
  };

  // A tear-off calendar page for a day that doesn't exist
  T.calendar = (g,W,H,v,img)=>{
    const md=Math.min(W,H), pad=md*.06, red='#d62828', land=W/H>=1.05;
    rr(g,0,0,W,H,md*.03); g.fillStyle='#fbf7ef'; g.fill(); g.save(); g.clip(); g.fillStyle=red; g.fillRect(0,0,W,H*.22); g.restore();
    g.fillStyle='#555'; for(const fx of [.3,.7]){ g.beginPath(); g.arc(W*fx,H*.05,md*.025,0,7); g.fill(); }
    g.fillStyle='#fff'; g.textAlign='center'; g.textBaseline='middle'; const mf=fit(g,(v.month||'FEBRUARY'),s2=>`400 ${s2}px "Anton"`,W*.8,H*.12,1,md*.13); g.font=`400 ${mf.size}px "Anton"`; g.fillText(v.month||'FEBRUARY', W/2, H*.13);
    g.fillStyle='#1a1a1a'; const dayH=land?H*.5:H*.38; g.font=`400 ${Math.round(dayH)}px "Anton"`; g.textBaseline='top'; g.fillText(v.day||'30', land?W*.3:W/2, H*.24);
    if(land){ g.textAlign='left'; const tx=W*.52, tw=W*.43; const f=fit(g,v.text,s2=>SANS(700,s2),tw,H*.3,1.05,md*.1); let y=lines(g,f,tx,H*.3,1.05,'left')+md*.03; g.fillStyle=red; const ff=fit(g,v.fine,s2=>SANS(700,s2),tw,H*.16,1.1,md*.05); y=lines(g,ff,tx,y,1.1,'left'); shot(g,img,tx,y+md*.02,tw*.4,H-pad-y-md*.02); }
    else { const f=fit(g,v.text,s2=>SANS(700,s2),W-pad*2,H*.14,1.05,md*.1); let y=lines(g,f,W/2,H*.64,1.05)+md*.02; g.fillStyle=red; const ff=fit(g,v.fine,s2=>SANS(700,s2),W-pad*2,H*.08,1.1,md*.05); y=lines(g,ff,W/2,y,1.1); shot(g,img,W*.38,y+md*.02,W*.24,H-pad-y-md*.02); }
    g.fillStyle='#999'; g.font=SANS(700,md*.026); g.textAlign='left'; g.textBaseline='bottom'; g.fillText(v.brand, pad, H-pad*.5);
  };

  // Loud late-night infomercial
  T.infomercial = (g,W,H,v,img)=>{
    const md=Math.min(W,H), pad=md*.06, land=W/H>=1.05;
    g.fillStyle='#ffd400'; g.fillRect(0,0,W,H); g.save(); g.translate(W*.5,H*.55); for(let i=0;i<24;i++){ g.rotate(Math.PI/12); g.fillStyle=i%2?'#ffe95a':'#ffc400'; g.beginPath(); g.moveTo(0,0); g.lineTo(md*2,-md*.26); g.lineTo(md*2,md*.26); g.fill(); } g.restore();
    g.strokeStyle='#1d3fbb'; g.lineWidth=md*.03; g.strokeRect(md*.015,md*.015,W-md*.03,H-md*.03);
    if(land) shot(g,img,pad,H*.3,W*.34,H*.6); else shot(g,img,W*.25,H*.4,W*.5,H*.26);
    const tw=land?W*.56:W-pad*2, tx=land?W*.4:pad; g.save(); g.translate(tx+tw/2, land?H*.24:H*.18); g.rotate(-.05);
    const f=fit(g,v.text.toUpperCase(),s2=>`400 ${s2}px "Anton"`,tw,H*(land?.4:.26),1,md*.17); const fh=f.lines.length*f.size;
    g.lineJoin='round'; g.textAlign='center'; g.textBaseline='top'; f.lines.forEach((l,i)=>{ const yy=-fh/2+i*f.size; g.font=`400 ${f.size}px "Anton"`;
      g.lineWidth=f.size*.16; g.strokeStyle='#1d3fbb'; g.strokeText(l,0,yy+f.size*.06); const gr=g.createLinearGradient(0,yy,0,yy+f.size); gr.addColorStop(0,'#ff3b30'); gr.addColorStop(1,'#ff9500'); g.fillStyle=gr; g.fillText(l,0,yy); });
    g.restore();
    const bx=land?W*.86:W*.8, by=land?H*.72:H*.42, br=md*.13; burst(g,bx,by,br,16,'#e10600'); g.save(); g.translate(bx,by); g.rotate(.2); g.fillStyle='#fff'; g.textAlign='center'; g.textBaseline='middle'; g.font=`400 ${Math.round(br*.28)}px "Anton"`; g.fillText('AS SEEN', 0, -br*.16); g.fillText('ON TV!', 0, br*.18); g.restore();
    g.fillStyle='#1d3fbb'; g.textAlign='center'; g.textBaseline='top'; const cx=land?W*.62:W/2, cyy=land?H*.62:H*.7;
    const ff=fit(g,v.fine,s2=>`700 ${s2}px "Comic Neue"`,land?W*.5:W-pad*2,H*.12,1.1,md*.05); let y=lines(g,ff,cx,cyy,1.1)+md*.02;
    g.fillStyle='#e10600'; g.font=`400 ${Math.round(md*.06)}px "Anton"`; g.fillText('CALL 1-800-BROKE-NOW', cx, y);
    g.fillStyle='#1d3fbb'; g.font=`400 ${Math.round(md*.03)}px "Chewy"`; g.fillText(v.brand+' · operators are standing by (they have nowhere else to go)', W/2, H-md*.065);
  };

  // One giant headline: the prize IS the joke
  T.headline = (g,W,H,v,img)=>{
    const md=Math.min(W,H), pad=md*.07, land=W/H>=1.05, bg=v.paper||'#f3ede1', acc=v.accent||'#e4572e';
    rr(g,0,0,W,H,md*.03); g.fillStyle=bg; g.fill(); g.save(); g.clip(); noise(g,W,H,hashStr(v.id),.05); g.restore();
    const ir=md*(land?.2:.17), icx=land?W-pad-ir:W-pad-ir, icy=pad+ir; g.fillStyle='#fff'; g.beginPath(); g.arc(icx,icy,ir,0,7); g.fill(); g.strokeStyle='#111'; g.lineWidth=md*.008; g.stroke(); shot(g,img,icx-ir*.75,icy-ir*.75,ir*1.5,ir*1.5,{shadow:false});
    g.fillStyle='#111'; g.textAlign='left'; g.textBaseline='top'; g.font=SANS(700,md*.034); g.fillText((v.kicker||'YOU GET').toUpperCase(), pad, pad);
    const tw=land?W-pad*2-ir*2.2:W-pad*2, ty=land?pad+md*.07:pad+ir*2+md*.03;
    const f=fit(g,v.text.toUpperCase(),s2=>`400 ${s2}px "Anton"`,tw,H*(land?.6:.45),.95,md*.3); let y=lines(g,f,pad,ty,.95,'left');
    const lw=Math.max(...f.lines.map(l=>g.measureText(l).width)); g.strokeStyle=acc; g.lineWidth=md*.018; g.lineCap='round'; g.beginPath(); for(let x=0;x<=lw;x+=md*.02) g.lineTo(pad+x, y+md*.02+Math.sin(x/(md*.05))*md*.008); g.stroke();
    y+=md*.06; g.fillStyle='#333'; const ff=fit(g,v.fine,s2=>`italic 600 ${s2}px "Cormorant Garamond"`,W-pad*2,H-y-pad-md*.05,1.1,md*.065); lines(g,ff,pad,y,1.1,'left');
    g.fillStyle='#777'; g.font=SANS(700,md*.026); g.textBaseline='bottom'; g.fillText('— '+v.brand, pad, H-pad*.6);
  };

  // Doctor's prescription pad
  T.rx = (g,W,H,v,img)=>{
    const md=Math.min(W,H), pad=md*.07, blue='#1e4fa3', land=W/H>=1.05;
    rr(g,0,0,W,H,md*.02); g.fillStyle='#f5f9ff'; g.fill();
    g.strokeStyle='rgba(30,79,163,.18)'; g.lineWidth=2; for(let y=H*.3;y<H*.92;y+=md*.07){ g.beginPath(); g.moveTo(pad,y); g.lineTo(W-pad,y); g.stroke(); }
    g.fillStyle=blue; g.textAlign='left'; g.textBaseline='top'; g.font=`700 ${Math.round(md*.055)}px "Playfair Display"`; g.fillText('Dr. '+v.brand, pad, pad*.8);
    g.font=SANS(700,md*.028); g.fillText('LICENSED IN NOTHING · EST. YESTERDAY', pad, pad*.8+md*.07); g.fillText('PATIENT: YOU      DATE: TODAY', pad, pad*.8+md*.11);
    g.font=`700 ${Math.round(md*.2)}px "Playfair Display"`; g.fillText('℞', pad, H*.27);
    if(land) shot(g,img,W*.62,H*.28,W*.32,H*.5); else shot(g,img,W*.55,H*.22,W*.38,H*.22);
    const tw=land?W*.62-pad-md*.24:W-pad*2, tx=land?pad+md*.2:pad, ty=land?H*.32:H*.47;
    g.fillStyle='#111'; const f=fit(g,v.text,s2=>`700 ${s2}px "Playfair Display"`,land?tw-md*.04:tw,H*(land?.34:.2),1.08,md*.12); let y=lines(g,f,tx,ty,1.08,'left')+md*.03;
    g.fillStyle=blue; const ff=fit(g,'Sig: '+v.fine,s2=>`italic 600 ${s2}px "Cormorant Garamond"`,tw,H*.14,1.1,md*.06); y=lines(g,ff,tx,y,1.1,'left');
    g.strokeStyle=blue; g.lineWidth=md*.006; g.beginPath(); const sx=W-pad-md*.4, sy=H-pad-md*.03; g.moveTo(sx,sy); for(let i=0;i<=40;i++){ const t=i/40; g.lineTo(sx+t*md*.38, sy-Math.sin(t*19)*md*.025*(1-t*.4)-t*md*.02); } g.stroke();
    g.font=SANS(700,md*.024); g.fillStyle=blue; g.textAlign='right'; g.textBaseline='top'; g.fillText('REFILLS: 0', W-pad, H-pad*.9);
  };

  // A web host's "your domain is ready" page in a browser window
  T.webhost = (g,W,H,v,img)=>{
    const md=Math.min(W,H), pad=md*.05, land=W/H>=1.05;
    rr(g,0,0,W,H,md*.035); g.fillStyle='#fff'; g.fill(); g.save(); rr(g,0,0,W,H,md*.035); g.clip(); g.fillStyle='#e8e8ec'; g.fillRect(0,0,W,md*.11); g.restore();
    ['#ff5f57','#febc2e','#28c840'].forEach((c,i)=>{ g.fillStyle=c; g.beginPath(); g.arc(pad+i*md*.04,md*.055,md*.014,0,7); g.fill(); });
    g.fillStyle='#fff'; rr(g,pad+md*.16,md*.025,W-pad*2-md*.16,md*.06,md*.03); g.fill(); g.fillStyle='#555'; g.font=`600 ${Math.round(md*.028)}px "IBM Plex Mono"`; g.textAlign='left'; g.textBaseline='middle';
    g.fillText('🔓 https://www.'+handle(v).replace(/_/g,'')+'.net/your-link', pad+md*.19, md*.055);
    const top=md*.15; const lg=g.createLinearGradient(0,top,W,H); lg.addColorStop(0,'#f2f6ff'); lg.addColorStop(1,'#fdf2ff'); g.fillStyle=lg; g.fillRect(md*.01,top-md*.03,W-md*.02,H-top+md*.02);
    if(land) shot(g,img,pad,top+md*.04,W*.36,H-top-md*.12); else shot(g,img,W*.22,top+md*.02,W*.56,H*.28);
    const tx=land?W*.42:pad, tw=land?W*.53:W-pad*2; let y=land?top+md*.04:top+H*.32;
    g.fillStyle='#7c3aed'; g.font=`400 ${Math.round(md*.16)}px "Anton"`; g.textBaseline='top'; g.fillText('404', tx, y); y+=md*.17;
    g.fillStyle='#6b7280'; g.font=SANS(700,md*.03); g.fillText('🎉 CONGRATULATIONS, YOU NOW OWN', tx, y); y+=md*.05;
    g.fillStyle='#111827'; const f=fit(g,v.text,s2=>SANS(700,s2),tw,H*(land?.22:.13),1.05,md*.09); y=lines(g,f,tx,y,1.05,'left')+md*.02;
    g.fillStyle='#374151'; const ff=fit(g,v.fine,s2=>SANS(400,s2),tw,H*.1,1.15,md*.045); y=lines(g,ff,tx,y,1.15,'left')+md*.03;
    g.fillStyle='#7c3aed'; rr(g,tx,y,md*.42,md*.075,md*.04); g.fill(); g.fillStyle='#fff'; g.font=SANS(700,md*.03); g.textBaseline='middle'; g.fillText('Renew for $0.99/year', tx+md*.035, y+md*.0375);
    g.fillStyle='#9ca3af'; g.font=SANS(400,md*.024); g.textBaseline='bottom'; g.fillText('Hosted by '+v.brand+' · 99.9% downtime guaranteed', tx, H-pad*.6);
  };

  // Life-insurance policy: calm navy, an umbrella, and the catch in big type
  T.policy = (g,W,H,v,img)=>{
    const md=Math.min(W,H), pad=md*.07, navy='#14325c', teal='#2a9d8f', land=W/H>=1.05;
    rr(g,0,0,W,H,md*.03); g.fillStyle='#fdfcf8'; g.fill(); g.save(); g.clip(); g.fillStyle=navy; g.fillRect(0,0,W,md*.16); g.restore();
    g.save(); g.translate(pad+md*.05,md*.08); g.fillStyle='#fff'; g.beginPath(); g.arc(0,md*.01,md*.05,Math.PI,0); g.fill(); g.strokeStyle='#fff'; g.lineWidth=md*.008; g.beginPath(); g.moveTo(0,md*.01); g.lineTo(0,md*.05); g.arc(-md*.012,md*.05,md*.012,0,Math.PI); g.stroke(); g.restore();
    g.fillStyle='#fff'; g.textAlign='left'; g.textBaseline='middle'; const bf=fit(g,v.brand,s2=>`700 ${s2}px "Playfair Display"`,W*.55,md*.08,1,md*.06); g.font=`700 ${bf.size}px "Playfair Display"`; g.fillText(v.brand, pad+md*.13, md*.08);
    g.textAlign='right'; g.font=SANS(700,md*.026); g.fillText('POLICY No. '+serial(v)+'-L', W-pad, md*.08);
    let y=md*.21; g.textAlign='left'; g.textBaseline='top'; g.fillStyle=teal; g.font=SANS(700,md*.03); g.fillText('CERTIFICATE OF COVERAGE', pad, y); y+=md*.05;
    const tw=land?W*.6:W-pad*2; g.fillStyle=navy; const f=fit(g,v.text,s2=>`700 ${s2}px "Playfair Display"`,tw,H*(land?.22:.14),1.05,md*.1); y=lines(g,f,pad,y,1.05,'left')+md*.03;
    if(land) shot(g,img,W*.7,md*.2,W*.25,H*.45); else shot(g,img,W*.62,md*.2,W*.3,H*.16);
    // the catch: the joke gets the spotlight
    const bh=H-y-pad-md*.07; g.fillStyle='#fff4d6'; rr(g,pad,y,W-pad*2,bh,md*.02); g.fill(); g.strokeStyle='#e9c46a'; g.lineWidth=3; g.stroke();
    g.fillStyle='#b5651d'; g.font=SANS(700,md*.028); g.fillText('⚠ TERMS OF COVERAGE', pad+md*.03, y+md*.03);
    g.fillStyle='#1d1d1d'; const ff=fit(g,v.fine,s2=>SANS(700,s2),W-pad*2-md*.06,bh-md*.1,1.1,md*.11); lines(g,ff,pad+md*.03,y+md*.08,1.1,'left');
    g.fillStyle='#8a8f98'; g.font=SANS(400,md*.024); g.textBaseline='bottom'; g.fillText('Beneficiary: your manager · Premium: your weekend · Not valid on weekends', pad, H-pad*.6);
  };

  // Security features stamped on every card: holographic seal, foil strip and microprint.
  function security(g, fm, W, H, v){
    const R=rnd(hashStr(v.id)*31+7), md=Math.min(W,H), r=md*.068;
    // the seal goes wherever it covers the least text: on the picture if possible, else an empty corner
    const sh=g._shot, tx=g._texts||[];
    const cands=[];
    if(sh){ const [x,y,w,h]=sh; for(const [fx,fy] of [[0,1],[1,1],[0,0],[1,0],[.5,1],[0,.5],[1,.5],[.5,0]]) cands.push([x+w*fx+(fx===0?r*.55:fx===1?-r*.55:0), y+h*fy+(fy===0?r*.55:fy===1?-r*.55:0), 0]); }
    for(const [fx,fy] of [[.08,.12],[.92,.12],[.08,.88],[.92,.88],[.5,.94],[.5,.06]]) cands.push([W*fx, H*fy, 1]);
    const overlap=(cx,cy)=>{ let o=0; for(const [x,y,w,h] of tx){ const ix=Math.max(0, Math.min(cx+r,x+w)-Math.max(cx-r,x)), iy=Math.max(0, Math.min(cy+r,y+h)-Math.max(cy-r,y)); o+=ix*iy; } return o; };
    let cx=W*.1, cy=H*.88, best=1e18;
    for(const [x,y,offPic] of cands){ const px=Math.max(r*1.1,Math.min(W-r*1.1,x)), py=Math.max(r*1.1,Math.min(H-r*1.1,y)); const sc=overlap(px,py)+offPic*r*r*.05; if(sc<best){ best=sc; cx=px; cy=py; } }
    // seal: rainbow foil disc with a starburst and a promise nobody can keep
    g.save(); g.translate(cx,cy); g.rotate((R()-.5)*.6);
    const cg=g.createConicGradient ? g.createConicGradient(R()*6,0,0) : null;
    if(cg){ ['#ffd1f4','#c9f3ff','#d8ffcf','#fff3b8','#ffd1f4'].forEach((c,i)=>cg.addColorStop(i/4,c)); g.fillStyle=cg; } else g.fillStyle='#e6e6f5';
    g.beginPath(); for(let i=0;i<48;i++){ const a=i*Math.PI/24, rr2=i%2?r*.9:r; g.lineTo(Math.cos(a)*rr2,Math.sin(a)*rr2); } g.closePath(); g.fill();
    g.strokeStyle='rgba(60,60,90,.45)'; g.lineWidth=r*.04; g.beginPath(); g.arc(0,0,r*.72,0,7); g.stroke();
    g.fillStyle='rgba(40,40,70,.8)'; g.textAlign='center'; g.textBaseline='middle';
    g.font=`700 ${Math.round(r*.26)}px "IBM Plex Mono"`; g.fillText('100%', 0, -r*.14); g.font=`700 ${Math.round(r*.17)}px "IBM Plex Mono"`; g.fillText('GENUINE*', 0, r*.18);
    g.restore();
    if(fm){ fm.save(); fm.translate(cx,cy); fm.fillStyle='#ff0000'; fm.beginPath(); fm.arc(0,0,r,0,7); fm.fill(); fm.restore(); }
    // foil security strip along one edge
    const sx = (R()<.5 ? W*.022 : W*.965), sw=W*.013;
    g.save(); const lg=g.createLinearGradient(0,0,0,H); ['#e9d8ff','#c8f2ff','#e3ffd5','#fff2c2','#ffd8ee','#e9d8ff'].forEach((c,i)=>lg.addColorStop(i/5,c));
    g.globalAlpha=.85; g.fillStyle=lg; g.fillRect(sx,H*.04,sw,H*.92); g.globalAlpha=.5; g.fillStyle='#556';
    g.font=`600 ${Math.max(9,Math.round(sw*.55))}px "IBM Plex Mono"`; g.translate(sx+sw*.72,H*.5); g.rotate(-Math.PI/2); g.textAlign='center'; g.fillText('NO CASH VALUE · NO CASH VALUE · NO CASH VALUE', 0, 0); g.restore();
    if(fm){ fm.fillStyle='#ff0000'; fm.fillRect(sx,H*.04,sw,H*.92); }
    // microprint along the bottom edge
    g.save(); g.fillStyle='rgba(0,0,0,.32)'; g.font=`600 ${Math.max(9,Math.round(md*.016))}px "IBM Plex Mono"`; g.textAlign='center'; g.textBaseline='bottom';
    g.fillText('NOT LEGAL TENDER · VOID WHERE FUN · NON-TRANSFERABLE · NON-REFUNDABLE · NON-SENSE · '+serial(v), W/2, H-md*.008); g.restore();
  }

  window.CARD_TEMPLATES = Object.keys(T);
  window.drawVoucherCard = function(v, img, aspect){
    const W=1200, H=Math.round(W/Math.max(.55,Math.min(1.9,aspect)));
    const c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d');
    // foil mask: green = laminated card, red = holographic foil, blue = gold foil (read by the lid shader)
    const f=document.createElement('canvas'); f.width=W; f.height=H; const fm=f.getContext('2d'); fm.globalCompositeOperation='lighter';
    const texts=[], ft=g.fillText.bind(g);
    g.fillText=(t,x,y,...rest)=>{ const w=g.measureText(t).width, m=/(\d+(?:\.\d+)?)px/.exec(g.font), h=m?+m[1]:20, tr=g.getTransform();
      if(Math.abs(tr.b)<1e-3 && Math.abs(tr.c)<1e-3){ const a=g.textAlign, b=g.textBaseline;
        let x0 = (a==='center') ? x-w/2 : (a==='right'||a==='end') ? x-w : x; let y0 = b==='top' ? y : b==='middle' ? y-h/2 : b==='bottom' ? y-h : y-h*.8;
        texts.push([tr.a*x0+tr.e, tr.d*y0+tr.f, w*tr.a, h*tr.d]); }
      return ft(t,x,y,...rest); };
    (T[v.tpl]||T.coupon)(g,W,H,v,img,fm);
    g.fillText=ft; g._texts=texts;
    security(g, fm, W, H, v);
    const sil=document.createElement('canvas'); sil.width=W; sil.height=H; const sg=sil.getContext('2d');
    sg.drawImage(c,0,0); sg.globalCompositeOperation='source-in'; sg.fillStyle = v.tpl==='golden' ? '#00ff8c' : v.tpl==='giftcard' ? '#40ff00' : '#00ff00'; sg.fillRect(0,0,W,H);
    fm.drawImage(sil,0,0);
    c.foil=f; return c;
  };
})();
