/* ============================================================
   Part 4: flow mode · guided tour · snapshot · fullscreen · measure
   ============================================================ */

// ============================================================
// FLOW MODE — animated GMP flow paths (plan coords, through real door gaps)
// ============================================================
var FLOWS=[
 {id:'in',  label:'วัตถุดิบเข้า → A/L ×2 → คลัง → ชั่ง', color:0x2b6fc2,
  pts:[[-3.4,6.05],[1.0,6.05],[2.6,6.05],[3.7,6.1],[4.15,6.6],[4.15,7.6],[4.15,8.6],[4.65,8.3],
       [4.65,7.5],[4.65,6.4],[5.6,6.05],[6.8,6.0],[6.8,5.2],[6.8,4.0],[6.8,3.0],[6.95,2.2]]},
 {id:'dry', label:'สายยาแห้ง: ผสม → แคปซูล → แผง/ขวด → ติดฉลาก → FG', color:0x8a4fc9,
  pts:[[7.2,2.3],[7.2,3.6],[7.28,5.4],[8.2,6.0],[9.5,5.95],[9.5,4.4],[9.5,3.1],[10.0,3.2],[10.0,4.4],[10.0,5.3],
       [10.9,6.0],[12.3,5.95],[12.3,4.4],[12.3,3.3],[12.8,3.4],[12.8,4.4],[12.8,5.3],[13.7,6.0],[16.6,6.0],
       [17.15,5.9],[17.15,4.3],[17.15,2.9],[17.6,3.0],[17.6,4.4],[17.7,5.4],[18.5,6.0],[19.15,5.9],[19.15,4.3],[19.15,2.4],[19.6,2.5],[19.6,4.4],
       [19.6,5.9],[21.2,6.0],[22.15,5.9],[22.15,4.4],[22.15,2.8],[22.15,1.6],
       [22.42,1.7],[22.42,3.0],[22.42,4.4],[22.42,5.9],[23.15,6.0],[23.9,6.0],[24.9,6.0],[25.6,5.6],
       [26.0,5.2],[26.0,4.3],[26.0,3.4],[26.0,2.6]]},
 {id:'liq', label:'สายยาน้ำ: ผสม → A/L → บรรจุ → FG', color:0x0f8f8f,
  pts:[[19.6,8.5],[19.6,7.7],[19.6,6.55],[18.2,6.55],[16.9,6.6],[16.9,7.5],[16.75,8.0],[16.75,9.0],
       [17.15,9.1],[17.15,8.0],[17.15,6.7],[19.2,6.7],[21.5,6.7],[22.65,6.6],[23.8,6.6],[25.2,6.6],
       [25.6,6.2],[25.6,5.35],[25.6,4.5],[25.6,3.3],[25.6,2.7]]},
 {id:'ppl', label:'บุคลากร: เข้า → เปลี่ยนชุด → ไลน์ผลิต', color:0x148f52,
  pts:[[-2.5,2.4],[0.7,2.4],[1.6,2.0],[2.6,2.4],[3.3,2.5],[3.95,3.1],[4.35,3.7],[4.6,4.3],[4.6,5.4],[5.0,5.75],
       [6.0,5.75],[8.6,5.75]]}
];
var flowRoot=new THREE.Group(); world.add(flowRoot); flowRoot.visible=false;
var flowConeGeo=new THREE.ConeGeometry(.125,.34,10); flowConeGeo.rotateX(Math.PI/2);
var flowT=0, flowOn=false, flowMats=[], flowDepthMode='';

FLOWS.forEach(function(f){
  var mat=new THREE.MeshBasicMaterial({color:f.color});
  mat.toneMapped=false;
  flowMats.push(mat);
  var g=new THREE.Group();
  var pts=f.pts.map(function(p){ return {x:WX(p[0]), z:WZ(p[1])}; });
  var cum=[0], L=0, i;
  for(i=1;i<pts.length;i++){ L+=Math.hypot(pts[i].x-pts[i-1].x, pts[i].z-pts[i-1].z); cum.push(L); }
  for(i=1;i<pts.length;i++){
    var a=pts[i-1], b=pts[i], len=Math.hypot(b.x-a.x,b.z-a.z);
    if(len<.02) continue;
    var seg=new THREE.Mesh(GEO.box, mat);
    seg.scale.set(len,.014,.11);
    seg.position.set((a.x+b.x)/2,.064,(a.z+b.z)/2);
    seg.rotation.y=-Math.atan2(b.z-a.z, b.x-a.x);
    seg.castShadow=false; seg.receiveShadow=false; seg.renderOrder=6; g.add(seg);
    var jn=new THREE.Mesh(GEO.cyl, mat); jn.scale.set(.11,.014,.11);
    jn.position.set(b.x,.064,b.z); jn.castShadow=false; jn.renderOrder=6; g.add(jn);
  }
  var n=Math.max(2, Math.floor(L/1.15)), cones=[];
  for(i=0;i<n;i++){ var c=new THREE.Mesh(flowConeGeo, mat); c.castShadow=false; c.position.y=.15; c.renderOrder=7; g.add(c); cones.push(c); }
  f._={pts:pts, cum:cum, L:L, cones:cones, g:g, n:n};
  flowRoot.add(g);
});
function flowAt(f, s){
  var d=f._; s=((s % d.L)+d.L)%d.L;
  for(var i=1;i<d.cum.length;i++){
    if(s<=d.cum[i]){
      var t=(s-d.cum[i-1])/((d.cum[i]-d.cum[i-1])||1);
      var a=d.pts[i-1], b=d.pts[i];
      return {x:lerp(a.x,b.x,t), z:lerp(a.z,b.z,t), dx:b.x-a.x, dz:b.z-a.z};
    }
  }
  var q=d.pts[d.pts.length-1]; return {x:q.x, z:q.z, dx:1, dz:0};
}
// flow legend UI
var flowPanel=document.getElementById('flowPanel'), tglFlow=document.getElementById('tglFlow');
(function(){
  var wrap=document.getElementById('flowItems');
  FLOWS.forEach(function(f){
    var b=document.createElement('button'); b.className='fl-item';
    var sw=document.createElement('span'); sw.className='fl-sw';
    sw.style.background='#'+f.color.toString(16).padStart(6,'0');
    var tx=document.createElement('span'); tx.textContent=f.label;
    b.appendChild(sw); b.appendChild(tx);
    b.addEventListener('click', function(){
      f._.g.visible=!f._.g.visible;
      b.classList.toggle('off', !f._.g.visible);
    });
    wrap.appendChild(b);
  });
})();
function setFlowMode(on){
  flowOn=on; flowRoot.visible=on;
  flowPanel.classList.toggle('hidden', !on);
  tglFlow.classList.toggle('on', on);
}
tglFlow.addEventListener('click', function(){ setFlowMode(!flowOn); });

// ============================================================
// GUIDED TOUR — process order 1→8, auto fly + captions
// ============================================================
var TOUR_STOPS=[
 {id:null, dist:38, az:38, title:'ภาพรวมอาคาร 28 × 12 ม. — ไลน์ผลิตกลางอาคาร',
  text:'โถงไลน์ผลิตพาดกลาง ทุกห้องเปิดเข้าหาไลน์ วัตถุดิบเข้าฝั่งตะวันตกผ่านแอร์ล็อกสองชั้น สินค้าสำเร็จรูปออกฝั่งตะวันออกผ่านแอร์ล็อกท้ายไลน์ — คนละฝั่งกันตามหลัก GMP'},
 {id:'alin', az:-30, title:'A/L ทางเข้าวัตถุดิบ (3) — สองชั้น',
  text:'วัตถุดิบเข้าประตูฝั่งตะวันตก ผ่านแอร์ล็อกชั้นที่ 1 และชั้นที่ 2 ประตูเปิดทีละบาน ก่อนถึงไลน์ผลิต'},
 {id:'rm', az:20, title:'ห้องเก็บวัตถุดิบ (1)',
  text:'คลังวัตถุดิบพร้อมโซนกักกันรอผล QC (เส้นเหลือง) ชั้นวางพาเลท กระสอบสมุนไพร และถังวัตถุดิบ'},
 {id:'sample', az:0, title:'ห้องสุ่มตัวอย่าง',
  text:'บูธสุ่มตัวอย่างวัตถุดิบ ลดการฟุ้งกระจาย ส่งผลตรวจก่อนปล่อยผ่านเข้าใช้ในการผลิต'},
 {id:'weigh', az:-15, title:'ห้องชั่ง (4)',
  text:'ชั่งแบ่งวัตถุดิบตามสูตรในตู้ชั่งครอบ พร้อมเครื่องชั่งพื้น — จุดเริ่มของทั้งสายยาแห้งและยาน้ำ'},
 {id:'mixer', az:12, title:'ห้องผสม Mixer (5)',
  text:'เครื่องผสมผงยาเตรียม bulk สำหรับสายยาแห้ง ส่งต่อห้องบรรจุแคปซูลผ่านไลน์ผลิต'},
 {id:'capsule', az:-10, title:'ห้องบรรจุแคปซูล (6)',
  text:'เครื่องบรรจุแคปซูลพร้อมสายลำเลียง — ผลผลิตส่งต่อห้องจัดแผงและห้องบรรจุใส่ขวด'},
 {id:'blister', az:10, title:'ห้องจัดแผง + ห้อง IPC',
  text:'เครื่องอัดแผงบลิสเตอร์ ข้างห้อง IPC ที่คอยตรวจสอบคุณภาพระหว่างผลิตของทุกสาย'},
 {id:'bottlefill', az:-12, title:'ห้องบรรจุใส่ขวด / กระปุก',
  text:'สายบรรจุเม็ด/แคปซูลลงขวด พร้อมเครื่องปิดฝาและติดสติกเกอร์ ก่อนส่งห้องติดฉลาก'},
 {id:'liqmix', az:15, title:'สายยาน้ำ — ห้องผสมยาน้ำ',
  text:'ถังผสมยาน้ำสแตนเลสพร้อมแผงควบคุม อยู่ฝั่งเหนือของไลน์ แยกสายจากยาแห้งชัดเจน'},
 {id:'liqfill', az:0, title:'ห้องบรรจุยาน้ำ — มีแอร์ล็อกของตัวเอง',
  text:'จุดบรรจุสัมผัสยาโดยตรง เข้าห้องได้ทางแอร์ล็อกเฉพาะ (A/L) ตามข้อกำหนดแยกโซนบรรจุด้วยแอร์ล็อก'},
 {id:'labelroom', az:-18, title:'ห้องติดฉลาก → คลังสำเร็จรูป',
  text:'ติดฉลาก ตรวจนับ บรรจุกล่อง แล้วส่งผ่านโถงฝั่งตะวันออกเข้าคลังสำเร็จรูป'},
 {id:'fg', az:-28, title:'ห้องเก็บผลิตภัณฑ์สำเร็จรูป — จบสาย',
  text:'รับสินค้าผ่าน A/L ท้ายไลน์ กักกันรอผล QC แล้วจ่ายออกประตูตะวันออก ตรงข้ามฝั่งรับวัตถุดิบ'},
 {id:'ro', az:25, title:'ห้องระบบน้ำ RO — นอกไลน์ผลิต',
  text:'ระบบผลิตน้ำ RO สำหรับทั้งโรงงาน (ถังพัก เมมเบรน ปั๊มจ่าย) แยกออกจากไลน์ผลิต มีประตูเข้าจากภายนอกฝั่งตะวันตก แต่อยู่ในตัวอาคารเดียวกัน'}
];
var tourbar=document.getElementById('tourbar'), btnTour=document.getElementById('btnTour');
var tourTitle=document.getElementById('tourTitle'), tourText=document.getElementById('tourText'),
    tourStep=document.getElementById('tourStep'), tourProg=document.getElementById('tourProg'),
    tourPlayBtn=document.getElementById('tourPlay');
var tourIdx=0, tourPhase='fly', tourK=0, tourHold=0, tourPaused=false;
var tourFromP=new THREE.Vector3(), tourFromT=new THREE.Vector3(), tourToP=new THREE.Vector3(), tourToT=new THREE.Vector3();
var TOUR_FLY=1.7, TOUR_HOLD=5.4;

function stopGoal(s){
  var target, dist;
  if(s.id){
    var r=findRoom(s.id);
    var cx=(r.x0+r.x1)/2, cy=(r.y0+r.y1)/2;
    target=new THREE.Vector3(WX(cx),.4,WZ(cy));
    var big=Math.max(r.x1-r.x0, r.y1-r.y0);
    dist=clamp(big*1.5+4.5, 9, 36);
  } else { target=new THREE.Vector3(0,.5,0); dist=s.dist||30; }
  var pos=target.clone().add(new THREE.Vector3().setFromSphericalCoords(dist, 55*DEG, (s.az||0)*DEG));
  return {t:target, p:pos};
}
function goStop(i){
  tourIdx=i;
  var s=TOUR_STOPS[i], goal=stopGoal(s);
  tourStep.textContent=(i+1)+'/'+TOUR_STOPS.length;
  tourTitle.textContent=s.title; tourText.textContent=s.text;
  tourProg.style.width='0%';
  tourFromP.copy(camP.position); tourFromT.copy(ctlP.target);
  tourToP.copy(goal.p); tourToT.copy(goal.t);
  tourPhase='fly'; tourK=0; tourHold=0;
  if(s.id){ var r=findRoom(s.id); if(r) pulseRoom(r); }
}
function startTour(){
  if(TOOL.measure) setMeasure(false);
  if(TOOL.tour) return;
  if(MODE!=='orbit') setMode('orbit');
  viewTween=null; hideCard(); setLegend(false);
  TOOL.tour=true;
  ctlP.enabled=false; ctlP.autoRotate=false;
  tourPaused=false; tourPlayBtn.textContent='⏸';
  document.getElementById('hint').style.visibility='hidden';
  tourbar.classList.remove('hidden');
  btnTour.classList.add('on');
  goStop(0);
}
function endTour(){
  if(!TOOL.tour) return;
  TOOL.tour=false;
  tourbar.classList.add('hidden');
  btnTour.classList.remove('on');
  document.getElementById('hint').style.visibility='';
  if(MODE==='orbit'){ ctlP.enabled=true; ctlP.autoRotate=spinOn; }
}
btnTour.addEventListener('click', function(){ TOOL.tour ? endTour() : startTour(); });
document.getElementById('tourEnd').addEventListener('click', endTour);
document.getElementById('tourNext').addEventListener('click', function(){
  goStop(Math.min(tourIdx+1, TOUR_STOPS.length-1)); });
document.getElementById('tourPrev').addEventListener('click', function(){
  goStop(Math.max(tourIdx-1, 0)); });
tourPlayBtn.addEventListener('click', function(){
  tourPaused=!tourPaused; tourPlayBtn.textContent=tourPaused?'▶':'⏸';
});
// leaving tour when user opens a room from the directory
var _focusRoom=focusRoom;
focusRoom=function(id){ if(TOOL.tour) endTour(); _focusRoom(id); };

// ============================================================
// MEASURE TOOL
// ============================================================
var tglMeas=document.getElementById('tglMeas');
var measMat=new THREE.MeshStandardMaterial({color:0x2fae76, roughness:.4, emissive:0x2fae76, emissiveIntensity:.35});
var mPend=null, mLive=null, mDone=[];   // mLive={g,line,label}
function groundPoint(cx,cy){
  ndc.x=(cx/window.innerWidth)*2-1; ndc.y=-(cy/window.innerHeight)*2+1;
  ray.setFromCamera(ndc, activeCam);
  var hits=ray.intersectObjects(floorMeshes, false);
  if(hits.length) return hits[0].point.clone().setY(0);
  var o=ray.ray.origin, d=ray.ray.direction;
  if(Math.abs(d.y)<1e-5) return null;
  var t=-o.y/d.y; if(t<=0) return null;
  var p=new THREE.Vector3(o.x+d.x*t, 0, o.z+d.z*t);
  return (Math.abs(p.x)<45 && Math.abs(p.z)<45) ? p : null;
}
function measMarker(p){
  var m=new THREE.Group();
  var disc=new THREE.Mesh(GEO.cyl, measMat); disc.scale.set(.11,.014,.11); disc.position.y=.07; m.add(disc);
  var pin=new THREE.Mesh(GEO.cyl8, measMat); pin.scale.set(.022,.42,.022); pin.position.y=.28; m.add(pin);
  m.position.set(p.x,0,p.z); return m;
}
function startMeasureAt(p){
  var g=new THREE.Group(); world.add(g);
  g.add(measMarker(p));
  var line=new THREE.Mesh(GEO.box, measMat); line.scale.set(.01,.014,.05); line.position.set(p.x,.075,p.z);
  line.castShadow=false; g.add(line);
  var L=addLabel(p.x+10, 5-p.z, .62, '0.00 ม.', null, 'lbl-meas', null);
  L.v=true;
  mPend=p; mLive={g:g, line:line, label:L};
}
function updateMeasureTo(p){
  if(!mPend || !mLive) return;
  var a=mPend, dx=p.x-a.x, dz=p.z-a.z, len=Math.max(.01, Math.hypot(dx,dz));
  mLive.line.scale.x=len;
  mLive.line.position.set((a.x+p.x)/2,.075,(a.z+p.z)/2);
  mLive.line.rotation.y=-Math.atan2(dz,dx);
  var txt=len.toFixed(2)+' ม.';
  mLive.label.text=txt; mLive.label.el.children[0].textContent=txt;
  mLive.label.p.set((a.x+p.x)/2,.62,(a.z+p.z)/2);
}
function finishMeasureAt(p){
  updateMeasureTo(p);
  mLive.g.add(measMarker(p));
  mDone.push(mLive);
  mPend=null; mLive=null;
}
function cancelPending(){
  if(!mLive) return;
  world.remove(mLive.g);
  var i=LABELS.indexOf(mLive.label);
  if(i>=0) LABELS.splice(i,1);
  mLive.label.el.remove();
  mPend=null; mLive=null;
}
function clearMeasures(){
  cancelPending();
  mDone.forEach(function(m){
    world.remove(m.g);
    var i=LABELS.indexOf(m.label);
    if(i>=0) LABELS.splice(i,1);
    m.label.el.remove();
  });
  mDone=[];
}
function setMeasure(on){
  TOOL.measure=on;
  tglMeas.classList.toggle('on', on);
  canvasEl.classList.toggle('measuring', on);
  if(on){
    document.getElementById('hint').innerHTML='<b>วัดระยะ</b> — คลิกจุดที่ 1 แล้วคลิกจุดที่ 2 บนพื้น · วัดได้หลายช่วง · ปิดปุ่ม "วัดระยะ" เพื่อล้างทั้งหมด';
  } else {
    clearMeasures();
    document.getElementById('hint').innerHTML=HINTS[MODE];
  }
}
tglMeas.addEventListener('click', function(){
  if(TOOL.tour) endTour();
  setMeasure(!TOOL.measure);
});
var mDownX=0, mDownY=0, mDownT=0;
canvasEl.addEventListener('pointerdown', function(e){ mDownX=e.clientX; mDownY=e.clientY; mDownT=performance.now(); });
canvasEl.addEventListener('pointermove', function(e){
  if(TOOL.measure && mPend) updateMeasureTo(groundPoint(e.clientX,e.clientY)||mPend);
});
canvasEl.addEventListener('pointerup', function(e){
  if(!TOOL.measure) return;
  if(Math.hypot(e.clientX-mDownX, e.clientY-mDownY)>7 || performance.now()-mDownT>500) return;
  var p=groundPoint(e.clientX,e.clientY);
  if(!p) return;
  if(!mPend) startMeasureAt(p); else finishMeasureAt(p);
});
window.addEventListener('keydown', function(e){
  if(e.code==='Escape'){ if(mPend) cancelPending(); if(TOOL.tour) endTour(); }
});

// ============================================================
// SNAPSHOT (PNG incl. labels) + FULLSCREEN + TOAST
// ============================================================
var toastEl=document.getElementById('toast'), toastTimer=null;
function showToast(msg){
  toastEl.textContent=msg; toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){ toastEl.classList.remove('show'); }, 2400);
}
var FONTSTACK='-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Thai", "Leelawadee UI", Thonburi, sans-serif';
function rrect(g,x,y,w,h,r){
  g.beginPath(); g.moveTo(x+r,y);
  g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r);
  g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath();
}
function exportPNG(){
  if(typeof renderFrame==='function') renderFrame(); else renderer.render(scene, activeCam);
  var src=renderer.domElement;
  var cv=document.createElement('canvas'); cv.width=src.width; cv.height=src.height;
  var g=cv.getContext('2d');
  g.drawImage(src,0,0);
  var k=cv.width/window.innerWidth, v=new THREE.Vector3();
  LABELS.forEach(function(L){
    if(!L.v) return;
    v.copy(L.p).project(activeCam);
    if(v.z>1 || v.x<-1.05 || v.x>1.05 || v.y<-1.05 || v.y>1.05) return;
    var op=1;
    if(MODE==='fp' && L.cls!=='lbl-meas'){
      var d2=activeCam.position.distanceTo(L.p);
      op=clamp((L.cls==='lbl-sub' ? (9.5-d2)/5 : (13.5-d2)/6), 0, 1);
      if(op<.3) return;
    }
    var x=(v.x+1)/2*cv.width, yb=(1-v.y)/2*cv.height;
    g.globalAlpha=op;
    var fs, padX, chipH, txtCol, bgCol, brdCol;
    if(L.cls==='lbl-dim'){
      g.font='700 '+(12.5*k)+'px '+FONTSTACK; g.textAlign='center'; g.textBaseline='alphabetic';
      g.lineWidth=3*k; g.strokeStyle='rgba(255,255,255,.75)'; g.strokeText(L.text,x,yb-4*k);
      g.fillStyle='#33584a'; g.fillText(L.text,x,yb-4*k);
      g.globalAlpha=1; return;
    }
    if(L.cls==='lbl-sub'){ fs=10.5*k; txtCol='#3c4f46'; bgCol='rgba(250,252,250,.85)'; brdCol='rgba(24,44,34,.15)'; }
    else if(L.cls==='lbl-door'){ fs=10.5*k; txtCol='#eafff4'; bgCol='rgba(29,92,65,.95)'; brdCol='rgba(255,255,255,.2)'; }
    else if(L.cls==='lbl-meas'){ fs=11.5*k; txtCol='#b7f4d4'; bgCol='rgba(14,30,22,.92)'; brdCol='rgba(63,174,122,.7)'; }
    else { fs=11.5*k; txtCol='#20302a'; bgCol='rgba(252,253,251,.94)'; brdCol='rgba(24,44,34,.22)'; }
    g.font='600 '+fs+'px '+FONTSTACK;
    padX=8*k; chipH=fs+9*k;
    var noW=0, noSide=fs+4*k, gap=5*k;
    if(L.no!=null) noW=noSide+gap;
    var tw=g.measureText(L.text).width;
    var w=tw+padX*2+noW;
    var x0=x-w/2, y0=yb-chipH-3*k;
    g.fillStyle=bgCol; g.strokeStyle=brdCol; g.lineWidth=1*k;
    rrect(g,x0,y0,w,chipH,chipH/2); g.fill(); g.stroke();
    if(L.no!=null){
      g.fillStyle='#d5433b';
      rrect(g,x0+padX-2*k, y0+(chipH-noSide)/2, noSide, noSide, 3.5*k); g.fill();
      g.fillStyle='#fff'; g.font='800 '+(fs*.92)+'px '+FONTSTACK;
      g.textAlign='center'; g.textBaseline='middle';
      g.fillText(String(L.no), x0+padX-2*k+noSide/2, y0+chipH/2+.5*k);
      g.font='600 '+fs+'px '+FONTSTACK;
    }
    g.fillStyle=txtCol; g.textAlign='left'; g.textBaseline='middle';
    g.fillText(L.text, x0+padX+noW-(L.no!=null?2*k:0), y0+chipH/2+.5*k);
    g.globalAlpha=1;
  });
  // caption strip
  g.globalAlpha=.85; g.fillStyle='rgba(14,22,18,.85)';
  var capH=22*k; rrect(g,10*k,cv.height-capH-10*k, 330*k, capH, capH/2); g.fill();
  g.globalAlpha=1; g.fillStyle='#cfe2d6'; g.font='600 '+(10.5*k)+'px '+FONTSTACK;
  g.textAlign='left'; g.textBaseline='middle';
  g.fillText('อาคารผลิตยาสมุนไพร GMP · 20 × 10 ม. · ผังจำลอง 3 มิติ', 22*k, cv.height-capH/2-10*k);
  try{
    var a=document.createElement('a');
    a.href=cv.toDataURL('image/png');
    a.download='GMP-herbal-3D-'+MODE+'.png';
    document.body.appendChild(a); a.click(); a.remove();
    showToast('บันทึกภาพ PNG แล้ว ✓');
  }catch(err){ showToast('บันทึกภาพไม่สำเร็จ'); }
}
var btnShotEl=document.getElementById('btnShot');
if(btnShotEl) btnShotEl.addEventListener('click', exportPNG);

var btnFS=document.getElementById('btnFS');
(function(){
  if(!btnFS) return;
  var de=document.documentElement;
  if(!(de.requestFullscreen||de.webkitRequestFullscreen)){ btnFS.style.display='none'; return; }
  btnFS.addEventListener('click', function(){
    var d=document;
    if(d.fullscreenElement||d.webkitFullscreenElement){
      (d.exitFullscreen||d.webkitExitFullscreen).call(d);
    } else {
      (de.requestFullscreen||de.webkitRequestFullscreen).call(de);
    }
  });
  document.addEventListener('fullscreenchange', function(){
    btnFS.classList.toggle('on', !!document.fullscreenElement);
  });
})();

// ============================================================
// FRAME HOOK — flow animation + tour engine
// ============================================================
EXTRA.frame=function(dt){
  if(flowRoot.visible){
    // x-ray overlay in plan/orbit views, real occlusion when walking
    if(flowDepthMode!==MODE){
      flowDepthMode=MODE;
      var dep=(MODE==='fp');
      flowMats.forEach(function(m){ m.depthTest=dep; });
    }
    flowT+=dt*.8;
    for(var fi=0; fi<FLOWS.length; fi++){
      var f=FLOWS[fi];
      if(!f._.g.visible) continue;
      var gap=f._.L/f._.n;
      for(var ci=0; ci<f._.cones.length; ci++){
        var p=flowAt(f, flowT + ci*gap);
        var c=f._.cones[ci];
        c.position.x=p.x; c.position.z=p.z;
        c.rotation.y=Math.atan2(p.dx, p.dz);
      }
    }
  }
  if(TOOL.tour){
    if(tourPhase==='fly'){
      tourK+=dt/(reduceMotion?0.001:TOUR_FLY);
      var e=clamp(tourK,0,1); e=e<.5 ? 4*e*e*e : 1-Math.pow(-2*e+2,3)/2;
      camP.position.lerpVectors(tourFromP, tourToP, e);
      ctlP.target.lerpVectors(tourFromT, tourToT, e);
      if(tourK>=1){ tourPhase='hold'; tourHold=0; }
    } else if(!tourPaused){
      tourHold+=dt/TOUR_HOLD;
      tourProg.style.width=(clamp(tourHold,0,1)*100)+'%';
      if(tourHold>=1){
        if(tourIdx>=TOUR_STOPS.length-1) endTour();
        else goStop(tourIdx+1);
      }
    }
  }
};

// deep-link flags: #flow / #tour (combinable, e.g. #iso,flow)
(function(){
  var h=(location.hash||'').toLowerCase();
  if(h.indexOf('flow')>=0) setFlowMode(true);
  if(h.indexOf('tour')>=0) setTimeout(startTour, 900);
})();
