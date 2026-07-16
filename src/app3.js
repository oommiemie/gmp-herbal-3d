/* ============================================================
   Part 3: labels, cameras & modes, walkthrough, minimap, UI
   ============================================================ */
var isTouch = window.matchMedia && window.matchMedia('(pointer:coarse)').matches;
var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
var TOOL={measure:false, tour:false};   // shared state with part 4
var EXTRA={frame:null};                 // per-frame hook for part 4

// ---------------- labels ----------------
var labelsEl = document.getElementById('labels');
var LABELS = [];
function addLabel(px,py,h,text,no,cls,modes){
  var el=document.createElement('div');
  el.className='lbl '+cls;
  if(no!=null){ var s=document.createElement('span'); s.className='no'; s.textContent=no; el.appendChild(s); }
  var t=document.createElement('span'); t.textContent=text; el.appendChild(t);
  labelsEl.appendChild(el);
  var L={p:new THREE.Vector3(WX(px),h,WZ(py)), el:el, cls:cls, modes:modes||null, v:false, text:text, no:(no==null?null:no)};
  LABELS.push(L); return L;
}
var LBL_AT = {
  alin:[1.0,6.05], alin2:[2.6,6.55], hall:[12.9,6.0], alE:[23.15,6.05], hallE:[25.9,6.0],
  ro:[1.1,9.9], liqAL:[18.0,7.85], staff:[1.2,1.6], fg:[26.2,3.4]
};
ROOMS.forEach(function(r){
  var p=LBL_AT[r.id]||[(r.x0+r.x1)/2,(r.y0+r.y1)/2];
  addLabel(p[0],p[1],2.42, r.th, r.no||null, 'lbl-name');
});
ZONES.forEach(function(z){
  var cx=(z.x0+z.x1)/2, cy=(z.y0+z.y1)/2;
  if(z.no) addLabel(cx,cy,1.9, z.th, z.no, 'lbl-name');
  else addLabel(cx,cy,1.35, z.th, null, 'lbl-sub');
});
addLabel(27.85,6,2.0,'ประตูจ่ายสินค้า (ขาออก)',null,'lbl-door');
addLabel(0.3,6,2.0,'ประตูรับวัตถุดิบ (ขาเข้า)',null,'lbl-door');
addLabel(0.3,2.4,1.9,'ทางเข้าพนักงาน',null,'lbl-door');
addLabel(0.3,9.0,1.9,'ประตูห้อง RO (นอกไลน์ผลิต)',null,'lbl-door');
// dimension labels (top view only)
[2,6,10,14,18,22,26].forEach(function(x){
  addLabel(x,13.35,.1,'4 ม.',null,'lbl-dim',{top:true});
});
[[9.6,'4.8 ม.'],[6.0,'2.4 ม.'],[2.4,'4.8 ม.']].forEach(function(d){
  addLabel(-1.45,d[0],.1,d[1],null,'lbl-dim',{top:true});
});

// dimension tick lines
var dimGroup=new THREE.Group();
(function(){
  var pts=[];
  function seg(x0,y0,x1,y1){ pts.push(new THREE.Vector3(WX(x0),.06,WZ(y0)), new THREE.Vector3(WX(x1),.06,WZ(y1))); }
  seg(0,12.75,28,12.75);
  [0,4,8,12,16,20,24,28].forEach(function(x){ seg(x,12.55,x,12.95); });
  seg(-1.05,0,-1.05,12);
  [0,4.8,7.2,12].forEach(function(y){ seg(-1.28,y,-0.82,y); });
  var g=new THREE.BufferGeometry().setFromPoints(pts);
  dimGroup.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({color:0x44685a})));
  world.add(dimGroup); dimGroup.visible=false;
})();

// ---------------- cameras & controls ----------------
var aspect=window.innerWidth/window.innerHeight;
var camP=new THREE.PerspectiveCamera(55, aspect, .08, 400);
var camO=new THREE.OrthographicCamera(-10,10,10,-10,-100,400);
camP.position.set(44,32,50);
var ctlP=new THREE.OrbitControls(camP, canvasEl);
ctlP.enableDamping=true; ctlP.dampingFactor=.07; ctlP.minDistance=2.5; ctlP.maxDistance=115;
ctlP.maxPolarAngle=87*DEG; ctlP.target.set(0,.6,0); ctlP.autoRotateSpeed=1.1;
var ctlO=new THREE.OrbitControls(camO, canvasEl);
ctlO.enableDamping=true; ctlO.dampingFactor=.07; ctlO.minZoom=.35; ctlO.maxZoom=9;
ctlO.screenSpacePanning=true; ctlO.autoRotateSpeed=1.1;
var ISO_PHI=Math.atan(Math.SQRT2);
var MODE='orbit', activeCam=camP;
var spinOn=false, labelsOn=true;

// ---------------- SAO + FXAA post-processing (perspective views) ----------------
var composer=null, saoPass=null, fxaaPass=null;
(function(){
  if(!renderer || !THREE.EffectComposer || !THREE.SAOPass || !THREE.FXAAShader) return;
  try{
    composer=new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene, camP));
    saoPass=new THREE.SAOPass(scene, camP, false, true);
    saoPass.params.saoBias=.55;
    saoPass.params.saoIntensity=.022;
    saoPass.params.saoScale=10;
    saoPass.params.saoKernelRadius=32;
    saoPass.params.saoBlur=true;
    saoPass.params.saoBlurRadius=8;
    saoPass.params.saoBlurStdDev=4;
    composer.addPass(saoPass);
    fxaaPass=new THREE.ShaderPass(THREE.FXAAShader);
    composer.addPass(fxaaPass);
  }catch(e){ composer=null; }
})();
function sizeComposer(){
  if(!composer) return;
  var w=window.innerWidth, h=window.innerHeight, pr=renderer.getPixelRatio();
  composer.setPixelRatio(pr);
  composer.setSize(w,h);
  if(fxaaPass) fxaaPass.material.uniforms['resolution'].value.set(1/(w*pr),1/(h*pr));
}
function renderFrame(){
  if(composer && activeCam===camP && QUAL.level===3) composer.render();
  else renderer.render(scene, activeCam);
}

// ---------------- adaptive graphics quality ----------------
var QUAL={mode:'auto', level:2, acc:0, n:0, cool:0, up:0, no3:isTouch};
var qualBtn=document.getElementById('tglQual'), qualTxt=document.getElementById('qualTxt');
var QUAL_NAMES={3:'สูง',2:'กลาง',1:'ต่ำ'};
function qualLabel(){
  if(qualTxt) qualTxt.textContent = QUAL.mode==='auto'
    ? 'กราฟิกอัตโนมัติ ('+QUAL_NAMES[QUAL.level]+')' : 'กราฟิก'+QUAL_NAMES[QUAL.level];
  if(qualBtn) qualBtn.classList.toggle('on', QUAL.mode==='auto');
}
function applyQuality(l){
  QUAL.level=clamp(l,1,3);
  renderer.setPixelRatio(QUAL.level===3 ? Math.min(window.devicePixelRatio||1,1.75)
                       : QUAL.level===2 ? Math.min(window.devicePixelRatio||1,1.25) : 1);
  var sz=QUAL.level===3 ? 2048 : QUAL.level===2 ? 2048 : 1024;
  if(sun.shadow.mapSize.x!==sz){
    sun.shadow.mapSize.set(sz,sz);
    if(sun.shadow.map){ sun.shadow.map.dispose(); sun.shadow.map=null; }
  }
  sun.castShadow=(QUAL.level>1);
  renderer.shadowMap.needsUpdate=true;
  onResize();
  qualLabel();
}
if(qualBtn) qualBtn.addEventListener('click', function(){
  if(QUAL.mode==='auto'){ QUAL.mode='manual'; applyQuality(3); }
  else if(QUAL.level===3) applyQuality(2);
  else if(QUAL.level===2) applyQuality(1);
  else { QUAL.mode='auto'; applyQuality((!isTouch && window.innerWidth>1100)?3:2); }
});

function orthoFrustum(mode){
  var a=window.innerWidth/window.innerHeight;
  var hh = mode==='top' ? Math.max(8.8, 16.9/a) : Math.max(11.0, 18.8/a);
  camO.left=-hh*a; camO.right=hh*a; camO.top=hh; camO.bottom=-hh;
  camO.updateProjectionMatrix();
}

// ---------------- walkthrough state ----------------
var player={pos:new THREE.Vector3(WX(4.2),0,WZ(6.0)), yaw:-Math.PI/2, pitch:0, bob:0};
var keys={};
var EYE=1.62, RAD=.26;
function tryMove(dx,dz){
  var p=player.pos, nx=p.x+dx, nz=p.z+dz, i, c;
  for(i=0;i<colliders.length;i++){ c=colliders[i];
    if(nx>c.x0-RAD && nx<c.x1+RAD && p.z>c.z0-RAD && p.z<c.z1+RAD){
      nx = (dx>0)? c.x0-RAD : c.x1+RAD;
    }
  }
  for(i=0;i<colliders.length;i++){ c=colliders[i];
    if(nx>c.x0-RAD && nx<c.x1+RAD && nz>c.z0-RAD && nz<c.z1+RAD){
      nz = (dz>0)? c.z0-RAD : c.z1+RAD;
    }
  }
  p.x=clamp(nx,-30,30); p.z=clamp(nz,-30,30);
}
function freeSpot(px,pz){
  var tries=[[0,0],[.5,0],[-.5,0],[0,.5],[0,-.5],[.8,.8],[-.8,-.8],[.8,-.8],[-.8,.8]];
  for(var i=0;i<tries.length;i++){
    var x=px+tries[i][0], z=pz+tries[i][1], ok=true;
    for(var j=0;j<colliders.length;j++){ var c=colliders[j];
      if(x>c.x0-RAD && x<c.x1+RAD && z>c.z0-RAD && z<c.z1+RAD){ ok=false; break; } }
    if(ok) return {x:x,z:z};
  }
  return {x:px,z:pz};
}

// look drag (fp)
var lookId=null, lastLX=0, lastLY=0;
canvasEl.addEventListener('pointerdown', function(e){
  if(MODE!=='fp') return;
  if(isTouch && e.clientX < window.innerWidth*.38 && e.clientY > window.innerHeight*.5) return; // joystick side
  lookId=e.pointerId; lastLX=e.clientX; lastLY=e.clientY;
  canvasEl.setPointerCapture(e.pointerId);
});
canvasEl.addEventListener('pointermove', function(e){
  if(MODE!=='fp' || e.pointerId!==lookId) return;
  player.yaw   -= (e.clientX-lastLX)*.0042;
  player.pitch = clamp(player.pitch-(e.clientY-lastLY)*.0038, -1.25, 1.25);
  lastLX=e.clientX; lastLY=e.clientY;
});
window.addEventListener('pointerup', function(e){ if(e.pointerId===lookId) lookId=null; });
window.addEventListener('keydown', function(e){
  keys[e.code]=true;
  if(MODE==='fp' && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].indexOf(e.code)>=0) e.preventDefault();
  if(e.code==='Escape'){ hideCard(); }
});
window.addEventListener('keyup', function(e){ keys[e.code]=false; });
canvasEl.addEventListener('contextmenu', function(e){ e.preventDefault(); });

// joystick
var joyEl=document.getElementById('joy'), knob=document.getElementById('joyKnob');
var joyVec={x:0,y:0}, joyId=null;
function joyPos(e){
  var r=joyEl.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2;
  var dx=(e.clientX-cx)/(r.width/2), dy=(e.clientY-cy)/(r.height/2);
  var m=Math.hypot(dx,dy); if(m>1){dx/=m;dy/=m;}
  joyVec.x=dx; joyVec.y=dy;
  knob.style.transform='translate(-50%,-50%) translate('+(dx*30)+'px,'+(dy*30)+'px)';
}
joyEl.addEventListener('pointerdown', function(e){ joyId=e.pointerId; joyEl.setPointerCapture(e.pointerId); joyPos(e); });
joyEl.addEventListener('pointermove', function(e){ if(e.pointerId===joyId) joyPos(e); });
function joyEnd(e){ if(e.pointerId===joyId){ joyId=null; joyVec.x=joyVec.y=0; knob.style.transform='translate(-50%,-50%)'; } }
joyEl.addEventListener('pointerup', joyEnd); joyEl.addEventListener('pointercancel', joyEnd);

// ---------------- minimap ----------------
var mapC=document.getElementById('minimap'), mapG=mapC.getContext('2d');
var mapBase=document.createElement('canvas'); mapBase.width=mapC.width; mapBase.height=mapC.height;
var MS=7, MOX=8, MOY=20;
(function(){
  var g=mapBase.getContext('2d');
  g.fillStyle='rgba(12,19,15,.92)'; g.fillRect(0,0,mapBase.width,mapBase.height);
  function rx(x){ return MOX+x*MS; } function ry(y){ return MOY+(PLAN_D-y)*MS; }
  var cols={store:'rgba(96,142,112,.33)', prod:'rgba(63,174,122,.25)', support:'rgba(96,128,158,.3)'};
  ROOMS.forEach(function(r){
    g.fillStyle=cols[r.grp]||'rgba(255,255,255,.12)';
    g.fillRect(rx(r.x0), ry(r.y1), (r.x1-r.x0)*MS, (r.y1-r.y0)*MS);
  });
  g.strokeStyle='rgba(240,248,242,.85)'; g.lineWidth=1.4; g.lineCap='round';
  mapWalls.forEach(function(s){
    g.beginPath(); g.moveTo(rx(s[0]),ry(s[1])); g.lineTo(rx(s[2]),ry(s[3])); g.stroke();
  });
  g.font='700 8px sans-serif'; g.textAlign='center'; g.textBaseline='middle';
  var pts={1:[4.4,9.6],2:[4,2.4],3:[1,6],4:[6.8,2.4],5:[9.6,2.4],6:[12.4,2.4],7:[10.05,9.6],8:[25.05,9.6]};
  for(var k in pts){
    g.fillStyle='#d5433b'; g.beginPath(); g.arc(rx(pts[k][0]),ry(pts[k][1]),5,0,7); g.fill();
    g.fillStyle='#fff'; g.fillText(k, rx(pts[k][0]), ry(pts[k][1])+.5);
  }
  g.fillStyle='rgba(233,239,233,.6)'; g.font='600 7px sans-serif';
  g.fillText('N ↑', mapBase.width-16, 10);
})();
function drawMap(){
  mapG.clearRect(0,0,mapC.width,mapC.height);
  mapG.drawImage(mapBase,0,0);
  var px=MOX+(player.pos.x+PLAN_W/2)*MS, py=MOY+(PLAN_D/2+player.pos.z)*MS;
  var fx=-Math.sin(player.yaw), fz=-Math.cos(player.yaw);
  var ang=Math.atan2(fx,-fz);
  mapG.save(); mapG.translate(px,py); mapG.rotate(ang);
  mapG.fillStyle='#59d69a'; mapG.beginPath();
  mapG.moveTo(0,-7); mapG.lineTo(4.6,5); mapG.lineTo(0,2.4); mapG.lineTo(-4.6,5); mapG.closePath(); mapG.fill();
  mapG.restore();
}
mapC.addEventListener('pointerdown', function(e){
  var r=mapC.getBoundingClientRect();
  var mx=(e.clientX-r.left)*(mapC.width/r.width), my=(e.clientY-r.top)*(mapC.height/r.height);
  var px=(mx-MOX)/MS, py=PLAN_D-((my-MOY)/MS);
  if(px<-.5||px>PLAN_W+.5||py<-.5||py>PLAN_D+.5) return;
  var s=freeSpot(WX(clamp(px,.4,PLAN_W-.4)), WZ(clamp(py,.4,PLAN_D-.4)));
  player.pos.x=s.x; player.pos.z=s.z;
});

// ---------------- view transitions ----------------
var fadeEl=document.getElementById('fade');
var viewTween=null;
function tweenView(cam, ctl, toTargetV3, toPos, toZoom, dur){
  viewTween={cam:cam, ctl:ctl, t0:performance.now(), dur:reduceMotion?1:(dur||850),
    fT:ctl.target.clone(), tT:toTargetV3,
    fP:cam.position.clone(), tP:toPos||null,
    fZ:cam.zoom, tZ:toZoom||null};
}
function stepTween(){
  if(!viewTween) return;
  var tw=viewTween, k=clamp((performance.now()-tw.t0)/tw.dur,0,1);
  var e=k<.5 ? 4*k*k*k : 1-Math.pow(-2*k+2,3)/2;
  tw.ctl.target.lerpVectors(tw.fT, tw.tT, e);
  if(tw.tP) tw.cam.position.lerpVectors(tw.fP, tw.tP, e);
  if(tw.tZ!=null){ tw.cam.zoom=lerp(tw.fZ, tw.tZ, e); tw.cam.updateProjectionMatrix(); }
  if(k>=1) viewTween=null;
}

var HINTS={
  top:'<b>มุมมองแปลน</b> — ลากเพื่อเลื่อนผัง · สกรอลล์/บีบนิ้วเพื่อซูม · คลิกห้องเพื่อดูข้อมูล',
  iso:'<b>ไอโซเมตริก</b> — ลากเพื่อหมุนรอบอาคาร 360° · สกรอลล์ซูม · คลิกห้องเพื่อดูข้อมูล',
  orbit:'<b>มุมมองอิสระ</b> — ลากหมุนดูรอบทิศ 360° · คลิกขวาลากเลื่อน · สกรอลล์ซูม · คลิกห้องเพื่อดูข้อมูล',
  fp: isTouch ? '<b>เดินสำรวจ</b> — จอยซ้าย = เดิน · ลากจอ = หันมอง · แตะแผนที่เพื่อวาร์ปตำแหน่ง'
              : '<b>เดินสำรวจ</b> — W A S D / ปุ่มลูกศร = เดิน · ลากเมาส์ = หันมอง · Shift = วิ่ง · คลิกแผนที่ = วาร์ป'
};
function setMode(m, instant){
  MODE=m;
  document.querySelectorAll('.vbtn').forEach(function(b){ b.classList.toggle('on', b.dataset.mode===m); });
  document.getElementById('hint').innerHTML=HINTS[m];
  document.getElementById('mapwrap').classList.toggle('show', m==='fp');
  joyEl.classList.toggle('show', m==='fp' && isTouch);
  canvasEl.classList.toggle('walk', m==='fp');
  dimGroup.visible=(m==='top');
  ceilGroup.visible=(m==='fp');
  var doFade=!instant && !reduceMotion;
  function apply(){
    ctlP.enabled=false; ctlO.enabled=false;
    ctlP.autoRotate=false; ctlO.autoRotate=false;
    if(m==='top'){
      activeCam=camO; orthoFrustum('top');
      camO.zoom=1; ctlO.target.set(-1.6,0,-0.35);
      camO.position.set(-1.6,80,-0.35+0.045);
      ctlO.minPolarAngle=0; ctlO.maxPolarAngle=0;
      ctlO.enableRotate=false; ctlO.enabled=true;
      ctlO.mouseButtons={LEFT:THREE.MOUSE.PAN, MIDDLE:THREE.MOUSE.DOLLY, RIGHT:THREE.MOUSE.PAN};
      ctlO.touches={ONE:THREE.TOUCH.PAN, TWO:THREE.TOUCH.DOLLY_PAN};
      camO.updateProjectionMatrix(); ctlO.update();
    } else if(m==='iso'){
      activeCam=camO; orthoFrustum('iso');
      camO.zoom=1; ctlO.target.set(0,.4,0);
      camO.position.set(0,.4,0).add(new THREE.Vector3().setFromSphericalCoords(70, ISO_PHI, .62));
      ctlO.minPolarAngle=ISO_PHI; ctlO.maxPolarAngle=ISO_PHI;
      ctlO.enableRotate=true; ctlO.enabled=true;
      ctlO.mouseButtons={LEFT:THREE.MOUSE.ROTATE, MIDDLE:THREE.MOUSE.DOLLY, RIGHT:THREE.MOUSE.PAN};
      ctlO.touches={ONE:THREE.TOUCH.ROTATE, TWO:THREE.TOUCH.DOLLY_PAN};
      ctlO.autoRotate=spinOn;
      camO.updateProjectionMatrix(); ctlO.update();
    } else if(m==='orbit'){
      activeCam=camP;
      ctlP.enabled=true; ctlP.autoRotate=spinOn;
      if(camP.position.y<1.8){ camP.position.set(16,11,19); ctlP.target.set(0,.6,0); }
      ctlP.update();
    } else { // fp
      activeCam=camP;
      camP.rotation.order='YXZ';
      setLegend(false);
    }
    updateLabelVisibility();
  }
  if(doFade){
    fadeEl.classList.add('quick'); fadeEl.style.opacity=1;
    setTimeout(function(){ apply(); renderer.render(scene,activeCam);
      requestAnimationFrame(function(){ fadeEl.style.opacity=0; }); },160);
  } else { apply(); if(instant!=='keepFade') fadeEl.style.opacity=0; }
}
document.querySelectorAll('.vbtn[data-mode]').forEach(function(b){
  b.addEventListener('click', function(){
    if(TOOL.tour && typeof endTour==='function') endTour();
    if(b.dataset.mode!==MODE) setMode(b.dataset.mode);
  });
});

// toggles
var tglL=document.getElementById('tglLabels'), tglS=document.getElementById('tglSpin');
tglL.addEventListener('click', function(){
  labelsOn=!labelsOn; tglL.classList.toggle('on',labelsOn); updateLabelVisibility();
});
tglS.addEventListener('click', function(){
  if(TOOL.tour) return;
  spinOn=!spinOn; tglS.classList.toggle('on',spinOn);
  if(MODE==='orbit') ctlP.autoRotate=spinOn;
  if(MODE==='iso') ctlO.autoRotate=spinOn;
});
function updateLabelVisibility(){
  LABELS.forEach(function(L){
    var show=true;
    if(L.cls==='lbl-meas') show=true;
    else if(L.cls==='lbl-dim') show=(MODE==='top');
    else show=labelsOn;
    L.v=show;
    if(!show) L.el.style.opacity=0;
  });
}
updateLabelVisibility();

// ---------------- legend / directory ----------------
var GROUPS=[
 {t:'ขาเข้าและคลัง · Incoming', ids:['alin','alin2','rm','zquar','pkmat','lblstore']},
 {t:'ไลน์ผลิต · Production Line', ids:['hall','weigh','mixer','capsule','ipc','blister','bottlefill']},
 {t:'สายยาน้ำ · Liquid Line', ids:['liqmix','liqAL','liqfill']},
 {t:'ฝั่งจ่ายออก · Outgoing', ids:['alE','hallE','labelroom','fg','zfgq']},
 {t:'สนับสนุน · Support & Utility', ids:['ro','sample','washN','oven','cleanstore','stab','staff','chgS','chgN']}
];
var listEl=document.getElementById('legendList');
GROUPS.forEach(function(gr){
  var wrap=document.createElement('div'); wrap.className='lg-group';
  var h=document.createElement('div'); h.className='gt'; h.textContent=gr.t; wrap.appendChild(h);
  gr.ids.forEach(function(id){
    var r=findRoom(id); if(!r) return;
    var b=document.createElement('button'); b.className='lg-item';
    b.innerHTML='<span class="no'+(r.no?'':' z')+'">'+(r.no||'·')+'</span>'+
      '<span class="tx">'+r.th+'<small>'+r.en+'</small></span>';
    b.addEventListener('click', function(){ focusRoom(id); });
    wrap.appendChild(b);
  });
  listEl.appendChild(wrap);
});
var legendEl=document.getElementById('legend'), legBtn=document.getElementById('legendToggle');
function setLegend(open){ legendEl.classList.toggle('hidden', !open); legBtn.style.display=open?'none':'flex'; }
legBtn.addEventListener('click', function(){ setLegend(true); });
legendEl.querySelector('header').addEventListener('click', function(){ setLegend(false); });
if(window.innerWidth>1150) setLegend(true);

// ---------------- info card ----------------
var cardEl=document.getElementById('card'), curRoom=null;
function showCard(r){
  curRoom=r;
  document.getElementById('cardNo').style.display=r.no?'flex':'none';
  document.getElementById('cardNo').textContent=r.no||'';
  document.getElementById('cardTh').textContent=r.th;
  document.getElementById('cardEn').textContent=r.en||'';
  document.getElementById('cardDesc').textContent=r.desc||'';
  var w=(r.x1-r.x0), d=(r.y1-r.y0);
  document.getElementById('cardSize').textContent=(+w.toFixed(1))+' × '+(+d.toFixed(1))+' ม.';
  document.getElementById('cardArea').textContent=(+(w*d).toFixed(1))+' ตร.ม.';
  cardEl.classList.add('show');
}
function hideCard(){ cardEl.classList.remove('show'); }
document.getElementById('cardX').addEventListener('click', hideCard);
document.getElementById('cardGo').addEventListener('click', function(){
  if(!curRoom) return;
  var cx=(curRoom.x0+curRoom.x1)/2, cy=(curRoom.y0+curRoom.y1)/2;
  var s=freeSpot(WX(cx), WZ(Math.max(curRoom.y0+.7, cy-1.2)));
  player.pos.x=s.x; player.pos.z=s.z; player.yaw=0; player.pitch=0;
  if(MODE!=='fp') setMode('fp');
});

// room highlight pulse
var highlight=null;
function pulseRoom(r){
  if(highlight){ world.remove(highlight.mesh); }
  var m=new THREE.Mesh(new THREE.BoxGeometry(r.x1-r.x0,.015,r.y1-r.y0),
    new THREE.MeshBasicMaterial({color:0x3fae7a, transparent:true, opacity:.4, depthWrite:false}));
  m.position.set(WX((r.x0+r.x1)/2), .05, WZ((r.y0+r.y1)/2));
  world.add(m); highlight={mesh:m, t0:performance.now()};
}
function stepHighlight(){
  if(!highlight) return;
  var k=(performance.now()-highlight.t0)/1800;
  if(k>=1){ world.remove(highlight.mesh); highlight=null; return; }
  highlight.mesh.material.opacity=.42*(1-k)*(0.7+0.3*Math.sin(k*14));
}

function focusRoom(id){
  var r=findRoom(id); if(!r) return;
  var cx=(r.x0+r.x1)/2, cy=(r.y0+r.y1)/2, w=r.x1-r.x0, d=r.y1-r.y0, big=Math.max(w,d);
  var tv=new THREE.Vector3(WX(cx), .4, WZ(cy));
  showCard(r); pulseRoom(r);
  if(window.innerWidth<=900) setLegend(false);
  if(MODE==='fp'){
    var s=freeSpot(WX(cx), WZ(Math.max(r.y0+.7, cy-1.2)));
    player.pos.x=s.x; player.pos.z=s.z; player.yaw=0;
    return;
  }
  if(MODE==='top'){
    tweenView(camO, ctlO, tv.clone().setY(0), tv.clone().setY(70).add(new THREE.Vector3(0,0,.045)), clamp(13/big,1,3.2));
  } else if(MODE==='iso'){
    var off=camO.position.clone().sub(ctlO.target);
    tweenView(camO, ctlO, tv, tv.clone().add(off), clamp(14/big,1,3));
  } else {
    var dir=camP.position.clone().sub(ctlP.target).normalize();
    if(dir.y<.25) dir.y=.35;
    var dist=clamp(big*1.35+3.5, 5.5, 26);
    tweenView(camP, ctlP, tv, tv.clone().add(dir.multiplyScalar(dist)), null);
  }
}

// ---------------- click room picking ----------------
var ray=new THREE.Raycaster(), ndc=new THREE.Vector2();
var downX=0, downY=0, downT=0;
canvasEl.addEventListener('pointerdown', function(e){ downX=e.clientX; downY=e.clientY; downT=performance.now(); });
canvasEl.addEventListener('pointerup', function(e){
  if(TOOL.measure || TOOL.tour) return;
  if(Math.hypot(e.clientX-downX, e.clientY-downY)>7 || performance.now()-downT>420) return;
  ndc.x=(e.clientX/window.innerWidth)*2-1; ndc.y=-(e.clientY/window.innerHeight)*2+1;
  ray.setFromCamera(ndc, activeCam);
  var hits=ray.intersectObjects(floorMeshes, false);
  if(hits.length){
    var r=findRoom(hits[0].object.userData.roomId);
    // prefer a zone if the click lands inside one
    var pl={x:hits[0].point.x+10, y:5-hits[0].point.z};
    for(var i=0;i<ZONES.length;i++){ var z=ZONES[i];
      if(pl.x>=z.x0&&pl.x<=z.x1&&pl.y>=z.y0&&pl.y<=z.y1){ r=z; break; } }
    if(r){ showCard(r); pulseRoom(r); }
  }
});

// ---------------- compass ----------------
var roseEl=document.getElementById('rose');
var dirV=new THREE.Vector3();
function stepCompass(){
  var deg=0;
  if(MODE!=='top'){
    activeCam.getWorldDirection(dirV);
    deg=-Math.atan2(dirV.x,-dirV.z)*180/Math.PI;
  }
  roseEl.style.transform='rotate('+deg+'deg)';
}

// ---------------- render loop ----------------
var lastT=performance.now(), lblTick=0;
function frame(){
  requestAnimationFrame(frame);
  var now=performance.now(), dt=Math.min(.05,(now-lastT)/1000); lastT=now;
  stepTween(); stepHighlight();

  if(MODE==='fp'){
    var f=0, s=0;
    if(keys.KeyW||keys.ArrowUp) f+=1;
    if(keys.KeyS||keys.ArrowDown) f-=1;
    if(keys.KeyD||keys.ArrowRight) s+=1;
    if(keys.KeyA||keys.ArrowLeft) s-=1;
    f-=joyVec.y; s+=joyVec.x;
    var m=Math.hypot(f,s); if(m>1){ f/=m; s/=m; }
    var sp=(keys.ShiftLeft||keys.ShiftRight)?4.4:2.3;
    if(m>0.001){
      var fx=-Math.sin(player.yaw), fz=-Math.cos(player.yaw);
      var rx=Math.cos(player.yaw),  rz=-Math.sin(player.yaw);
      tryMove((fx*f+rx*s)*sp*dt, (fz*f+rz*s)*sp*dt);
      player.bob+=dt*sp*2.6;
    }
    camP.position.set(player.pos.x, EYE+Math.sin(player.bob)*.018, player.pos.z);
    camP.rotation.set(player.pitch, player.yaw, 0);
    drawMap();
  } else if(MODE==='orbit'){ ctlP.update(); }
  else if(MODE==='top'||MODE==='iso'){ ctlO.update(); }

  // labels (throttled to every 2nd frame — DOM writes are expensive)
  lblTick^=1;
  var wdt=window.innerWidth, hgt=window.innerHeight, v=new THREE.Vector3();
  for(var i=0; lblTick===0 && i<LABELS.length;i++){
    var L=LABELS[i];
    if(!L.v){ L.el.style.display='none'; continue; }
    v.copy(L.p).project(activeCam);
    if(v.z>1 || v.x<-1.15 || v.x>1.15 || v.y<-1.15 || v.y>1.15){ L.el.style.display='none'; continue; }
    var op=1;
    if(MODE==='fp' && L.cls!=='lbl-meas'){
      var d2=activeCam.position.distanceTo(L.p);
      op=clamp((L.cls==='lbl-sub' ? (9.5-d2)/5 : (13.5-d2)/6), 0, 1);
      if(op<.04){ L.el.style.display='none'; continue; }
    }
    L.el.style.display='block';
    L.el.style.opacity=op;
    L.el.style.transform='translate(-50%,-114%) translate('+(v.x+1)/2*wdt+'px,'+(1-v.y)/2*hgt+'px)';
  }
  // adaptive quality: downshift when the frame rate drops, upshift when it recovers
  QUAL.acc+=dt; QUAL.n++;
  if(QUAL.n>=30){
    var fpsAvg=QUAL.n/QUAL.acc; QUAL.acc=0; QUAL.n=0;
    if(QUAL.mode==='auto'){
      if(fpsAvg<24 && QUAL.level>1 && now>QUAL.cool){
        if(QUAL.level===3) QUAL.no3=true;           // never bounce back to High
        applyQuality(QUAL.level-1); QUAL.cool=now+3000; QUAL.up=now+12000;
      } else if(fpsAvg>55 && QUAL.level<(QUAL.no3?2:3) && now>QUAL.up){
        applyQuality(QUAL.level+1); QUAL.up=now+12000; QUAL.cool=now+3000;
      }
    }
  }

  // swing doors: open when the walker approaches, else stay closed
  for(var di=0;di<DOORS.length;di++){
    var D=DOORS[di], tgt=0;
    if(MODE==='fp'){
      var ddx=player.pos.x-D.cx, ddz=player.pos.z-D.cz;
      if(ddx*ddx+ddz*ddz<2.9) tgt=1;
    }
    if(D.cur!==tgt){
      D.cur+=(tgt-D.cur)*Math.min(1,dt*4.5);
      if(Math.abs(D.cur-tgt)<.012) D.cur=tgt;
      var de=D.cur*D.cur*(3-2*D.cur);
      D.g.rotation.y=D.base+D.delta*de;
    }
  }
  stepCompass();
  if(EXTRA.frame) EXTRA.frame(dt, now);
  renderFrame();
}

// ---------------- resize ----------------
function onResize(){
  var w=window.innerWidth, h=window.innerHeight;
  renderer.setSize(w,h);
  sizeComposer();
  camP.aspect=w/h; camP.updateProjectionMatrix();
  if(MODE==='top'||MODE==='iso'){ var z=camO.zoom; orthoFrustum(MODE); camO.zoom=z; camO.updateProjectionMatrix(); }
}
window.addEventListener('resize', onResize);

// ---------------- boot ----------------
if(renderer){
  onResize();
  applyQuality(QUAL.level);
  var initMode=(location.hash||'').replace('#','').split(',')[0];
  if(['top','iso','orbit','fp'].indexOf(initMode)<0) initMode='orbit';
  setMode(initMode,'keepFade');
  renderer.render(scene, activeCam);
  requestAnimationFrame(function(){
    fadeEl.style.opacity=0;
    if(initMode==='orbit') // intro sweep
      tweenView(camP, ctlP, new THREE.Vector3(0,.6,0), new THREE.Vector3(15.5,11,18.5), null, reduceMotion?1:1600);
  });
  frame();
}
