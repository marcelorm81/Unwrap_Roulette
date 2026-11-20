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
  };
  window.loadCardFonts = tpl => Promise.all((FONTS[tpl]||[]).map(f=>document.fonts.load(f).catch(()=>{})));

  // ---------- helpers
  const rnd = seed => { let a=seed|0; return ()=>{ a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; };
  const hashStr = s => { let h=2166136261; for(const c of s){ h^=c.charCodeAt(0); h=Math.imul(h,16777619); } return h>>>0; };
  function wrap(g,text,maxW){ const words=text.split(/\s+/), out=[]; let cur=''; for(const w of words){ const t=cur?cur+' '+w:w; if(g.measureText(t).width<=maxW||!cur) cur=t; else { out.push(cur); cur=w; } } if(cur) out.push(cur); return out; }
  // largest size where text wraps into the box
  function fit(g, text, fontFn, maxW, maxH, lh=1.02, maxSize=200, minSize=10){
    maxSize=Math.round(maxSize); for(let s=maxSize; s>=minSize; s-=2){ g.font=fontFn(s); const L=wrap(g,text,maxW); if(L.every(l=>g.measureText(l).width<=maxW) && L.length*s*lh<=maxH) return {size:s, lines:L}; }
    g.font=fontFn(minSize); return {size:minSize, lines:wrap(g,text,maxW)};
  }
  function lines(g, f, x, y, lh=1.02, align='center', base='top'){ g.textAlign=align; g.textBaseline=base; f.lines.forEach((l,i)=>g.fillText(l,x,y+i*f.size*lh)); return y+f.lines.length*f.size*lh; }
  function rr(g,x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
  function barcode(g,x,y,w,h,seed,col='#111'){ const R=rnd(seed); g.fillStyle=col; let cx=x; while(cx<x+w){ const bw=1+Math.floor(R()*4)*1.6; if(R()>.35) g.fillRect(cx,y,Math.min(bw,x+w-cx),h); cx+=bw+1+R()*2.5; } }
  function burst(g,x,y,r,n,fill,inner=.78){ g.beginPath(); for(let i=0;i<n*2;i++){ const a=i*Math.PI/n, r2=i%2?r*inner:r; g.lineTo(x+Math.cos(a)*r2,y+Math.sin(a)*r2); } g.closePath(); g.fillStyle=fill; g.fill(); }
  function shot(g,img,x,y,w,h,{shadow=true,filter=''}={}){ if(!img) return; const s=Math.min(w/img.width,h/img.height), iw=img.width*s, ih=img.height*s;
    g.save(); if(shadow){ g.shadowColor='rgba(0,0,0,.28)'; g.shadowBlur=w*.05; g.shadowOffsetY=w*.025; } if(filter) g.filter=filter;
    g.drawImage(img, x+(w-iw)/2, y+(h-ih)/2, iw, ih); g.restore(); }
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
    g.fillStyle='#D7261E'; const hf=fit(g,'MANUFACTURER COUPON',s=>`400 ${s}px "Anton"`, W*.5, H*.1, 1, H*.085); g.textBaseline='middle'; g.textAlign='left'; g.font=`400 ${hf.size}px "Anton"`; g.fillText('MANUFACTURER COUPON', W*.05, H*.085);
    g.fillStyle='#111'; const ef=fit(g,'EXPIRES: YESTERDAY',s=>`600 ${s}px "IBM Plex Mono"`, W*.36, H*.06, 1, H*.035, 8); g.font=`600 ${ef.size}px "IBM Plex Mono"`; g.textAlign='right'; g.textBaseline='middle'; g.fillText('EXPIRES: YESTERDAY', W*.95, H*.085);
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
    g.font=`400 ${fs}px "VT323"`; g.textAlign='left'; g.fillText('TAX (EMOTIONAL)', x0, y); g.textAlign='right'; g.fillText('$4.99', x1, y); y+=fs*1.1;
    g.textAlign='center'; g.fillText('= = = = = = = = = = = = = = = = =', cx, y); y+=fs*1.1;
    g.font=`400 ${Math.round(fs*1.5)}px "VT323"`; g.textAlign='left'; g.fillText('TOTAL', x0, y); g.textAlign='right'; g.fillText('$4.99', x1, y); y+=fs*1.9;
    const ff=fit(g,v.fine.toUpperCase(),s=>`400 ${s}px "VT323"`, cw, H*.1, 1.0, Math.round(fs*.9), 8); y=lines(g,ff,cx,y,1.0)+fs*.4;
    barcode(g, x0+cw*.1, y, cw*.8, Math.max(H*.02, Math.min(H*.06, H*.95-y)), hashStr(v.id), '#1d1d1d');
  };

  T.ticket = (g,W,H,v,img)=>{
    const land=W/H>=1.05, notch=Math.min(W,H)*.06;
    const sx = land ? W*.76 : 0, sy = land ? 0 : H*.8;
    rr(g,0,0,W,H,W*.025); g.fillStyle='#14143A'; g.fill();
    const grd=g.createLinearGradient(0,0,W,H); grd.addColorStop(0,'rgba(255,0,170,.35)'); grd.addColorStop(1,'rgba(0,229,255,.25)'); g.globalCompositeOperation='source-atop'; g.fillStyle=grd; g.fillRect(0,0,W,H); g.globalCompositeOperation='source-over';
    g.save(); g.globalCompositeOperation='destination-out';
    if(land){ for(const y of [0,H]){ g.beginPath(); g.arc(sx,y,notch,0,7); g.fill(); } } else { for(const x of [0,W]){ g.beginPath(); g.arc(x,sy,notch,0,7); g.fill(); } }
    g.restore();
    g.strokeStyle='rgba(255,255,255,.55)'; g.lineWidth=3; g.setLineDash([10,10]); g.beginPath(); if(land){ g.moveTo(sx,notch*1.2); g.lineTo(sx,H-notch*1.2); } else { g.moveTo(notch*1.2,sy); g.lineTo(W-notch*1.2,sy); } g.stroke(); g.setLineDash([]);
    const mw = land ? sx : W, mh = land ? H : sy, pad=Math.min(mw,mh)*.07;
    const L=split(mw,mh,pad,.38); shot(g,img,...L.img);
    const [tx,ty,tw,th]=L.txt; g.fillStyle='#00E5FF'; const hf=fit(g,'ADMIT ONE · '+v.brand.toUpperCase(),s=>`400 ${s}px "Bebas Neue"`, tw, th*.11, 1, th*.1); lines(g,hf,tx,ty,1,'left');
    g.fillStyle='#fff'; const f=fit(g, v.text.toUpperCase(), s=>`400 ${s}px "Bebas Neue"`, tw, th*.5, .95, th*.32); lines(g,f,tx,ty+th*.15,.95,'left');
    const fields=[['GATE','Z'],['ROW','ZZ'],['SEAT','99E'],['DATE','SOON™']]; g.textBaseline='top'; g.textAlign='left';
    fields.forEach(([k,val],i)=>{ const fx=tx+i*tw/4; g.fillStyle='rgba(255,255,255,.6)'; g.font=`700 ${Math.round(th*.045)}px "Space Grotesk"`; g.fillText(k,fx,ty+th*.68); g.fillStyle='#FF4FD8'; g.font=`400 ${Math.round(th*.1)}px "Bebas Neue"`; g.fillText(val,fx,ty+th*.74); });
    g.fillStyle='rgba(255,255,255,.7)'; const ff=fit(g,v.fine,s=>`700 ${s}px "Space Grotesk"`, tw, th*.1, 1.1, th*.04); lines(g,ff,tx,ty+th*.89,1.1,'left');
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
    const h=hashStr(v.id); const hues=[[262,320],[190,250],[12,330],[150,200]][h%4];
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
    g.textAlign='left'; g.textBaseline='bottom'; g.font=`700 ${Math.round(md*.045)}px "Space Grotesk"`; g.fillText('4012  8888  '+serial(v).slice(0,4)+'  0000', pad, H-pad*1.5);
    g.globalAlpha=.85; const ff=fit(g,v.fine,s=>`700 ${s}px "Space Grotesk"`, W*.58, md*.09, 1.1, md*.035); lines(g,ff,pad,H-pad*1.3,1.1,'left'); g.globalAlpha=1;
    g.textAlign='right'; g.textBaseline='bottom'; g.font=`400 ${Math.round(md*.09)}px "Righteous"`; g.fillText('$0.00', W-pad, H-pad*.8);
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
    g.save(); g.translate(tx+tw*.7, ty+th*.38); g.rotate(-.28); g.globalAlpha=.78; g.strokeStyle='#C62828'; g.fillStyle='#C62828'; g.lineWidth=fs*.18;
    const sw=Math.min(tw*.55, fs*9), sh2=fs*2.2; rr(g,-sw/2,-sh2/2,sw,sh2,fs*.3); g.stroke(); g.textAlign='center'; g.textBaseline='middle';
    const st=fit(g,'APPROVED-ISH',s=>`400 ${s}px "Anton"`, sw*.85, sh2*.8, 1, fs*1.4); g.font=`400 ${st.size}px "Anton"`; g.fillText('APPROVED-ISH', 0, 0); g.restore();
  };

  T.retro = (g,W,H,v,img)=>{
    rr(g,0,0,W,H,Math.min(W,H)*.06); g.fillStyle='#FFF1D6'; g.fill(); g.save(); g.clip();
    const cols=['#F4A259','#E76F51','#BC4B51','#5B3A29']; const md=Math.min(W,H), sw=md*.045;
    cols.forEach((c,i)=>{ g.fillStyle=c; g.beginPath(); g.arc(W*1.02, H*1.05, md*(.62-i*.09), 0, 7); g.fill(); });
    g.fillStyle='#FFF1D6'; g.beginPath(); g.arc(W*1.02,H*1.05,md*.26,0,7); g.fill();
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

  window.CARD_TEMPLATES = Object.keys(T);
  window.drawVoucherCard = function(v, img, aspect){
    const W=1200, H=Math.round(W/Math.max(.55,Math.min(1.9,aspect)));
    const c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d');
    (T[v.tpl]||T.coupon)(g,W,H,v,img);
    return c;
  };
})();
