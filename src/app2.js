/* ============================================================
   Part 2: equipment builders, room fit-out, exterior, ceiling
   Layout: hand-sketch plan — central production line corridor
   ============================================================ */

// ---------- instanced pools ----------
function InstancePool(geo, mat){ this.geo=geo; this.mat=mat; this.items=[]; }
InstancePool.prototype.add=function(px,py,ybase,sx,sy,sz,rot){
  this.items.push({x:WX(px), z:WZ(py), y:ybase+sy/2, sx:sx, sy:sy, sz:sz, r:rot||0});
};
InstancePool.prototype.build=function(){
  if(!this.items.length) return;
  var im=new THREE.InstancedMesh(this.geo, this.mat, this.items.length);
  var m4=new THREE.Matrix4(), q=new THREE.Quaternion(), e=new THREE.Euler(), v=new THREE.Vector3(), s=new THREE.Vector3();
  this.items.forEach(function(it,i){
    e.set(0,it.r,0); q.setFromEuler(e); v.set(it.x,it.y,it.z); s.set(it.sx,it.sy,it.sz);
    m4.compose(v,q,s); im.setMatrixAt(i,m4);
  });
  im.castShadow=true; im.receiveShadow=true; world.add(im);
};
var poolBox   = new InstancePool(GEO.box, MAT.card);
var poolBox2  = new InstancePool(GEO.box, MAT.card2);
var poolSack  = new InstancePool(GEO.sph, MAT.sack);
var poolBottle= new InstancePool(GEO.cyl, MAT.amber);
function cluster(pool, px, py, ybase, n, w, d, bh){
  for(var i=0;i<n;i++){
    var bx=px+(Math.random()-.5)*w*.55, by=py+(Math.random()-.5)*d*.55;
    pool.add(bx,by,ybase, .34+Math.random()*.14, bh||.26, .28+Math.random()*.12, Math.random()*.5-.25);
  }
}

// ---------- builders ----------
function grp(){ return new THREE.Group(); }
function bPallet(){
  var g=grp();
  var top=box(1.05,.035,.85,MAT.wood); top.position.y=.125; g.add(top);
  for(var i=-1;i<=1;i++){ var f=box(1.05,.09,.11,MAT.woodDark); f.position.set(0,.05,i*.34); g.add(f); }
  return g;
}
function bPalletLoad(kind){
  var g=bPallet();
  if(kind==='wrap'){
    var w=box(.98,.78,.8,new THREE.MeshStandardMaterial({color:0xe7ecef, roughness:.32, metalness:.05}));
    w.position.y=.14+.39; g.add(w);
    var cap=box(1.0,.03,.82,MAT.binGray,false); cap.position.y=.14+.79; g.add(cap);
  }
  return g;
}
function bRack(len, tall){
  var g=grp(); var H=tall?2.35:1.95, d=1.0;
  var lv=[.12, 1.0, 1.85]; if(!tall) lv=[.12, .95, 1.62];
  [-len/2, len/2].forEach(function(x){ [-d/2, d/2].forEach(function(z){
    var p=box(.07,H,.07,MAT.rackOr); p.position.set(x,H/2,z); g.add(p); });});
  lv.forEach(function(y,li){
    [-d/2+.04, d/2-.04].forEach(function(z){
      var b=box(len,.07,.08,MAT.rackBeam); b.position.set(0,y,z); g.add(b); });
    if(li>0){ var sh=box(len-.1,.025,d-.06,MAT.wood,false); sh.position.set(0,y+.045,0); g.add(sh); }
  });
  return g;
}
function bBench(len, d, h, matTop, matLeg){
  var g=grp(); d=d||.7; h=h||.9;
  var top=box(len,.05,d,matTop||MAT.ss); top.position.y=h-.025; g.add(top);
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(p){
    var l=new THREE.Mesh(GEO.cyl8, matLeg||MAT.ssDull); l.scale.set(.05,h-.05,.05);
    l.position.set(p[0]*(len/2-.08),(h-.05)/2,p[1]*(d/2-.08)); l.castShadow=true; g.add(l); });
  return g;
}
function bShelfSS(len, d, levels){
  var g=grp(); d=d||.5; var H=1.75;
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(p){
    var l=new THREE.Mesh(GEO.cyl8, MAT.ssDull); l.scale.set(.04,H,.04);
    l.position.set(p[0]*(len/2-.05),H/2,p[1]*(d/2-.05)); l.castShadow=true; g.add(l); });
  for(var i=0;i<(levels||4);i++){
    var sh=box(len,.03,d,MAT.ss); sh.position.y=.25+i*(H-.35)/((levels||4)-1); g.add(sh);
  }
  return g;
}
function bCabinet(w,h,d,mat){
  var g=grp();
  var c=box(w,h,d,mat||MAT.steelGray); c.position.y=h/2; g.add(c);
  var seam=box(.012,h*.86,.012,MAT.frame,false); seam.position.set(0,h/2,d/2+.002); g.add(seam);
  [-w*.18,w*.18].forEach(function(x){ var hd=box(.025,.16,.03,MAT.frame,false); hd.position.set(x,h*.55,d/2+.02); g.add(hd); });
  return g;
}
function bBooth(w,d,h){
  var g=grp(); var t=.06;
  var back=box(w,h,t,MAT.white); back.position.set(0,h/2,-d/2); g.add(back);
  [-1,1].forEach(function(s){ var sd=box(t,h,d,MAT.white); sd.position.set(s*(w/2),h/2,0); g.add(sd); });
  var top=box(w,t,d,MAT.white); top.position.set(0,h-t/2,0); g.add(top);
  var lamp=box(w*.6,.03,.24,MAT.lamp,false); lamp.position.set(0,h-.1,d*.12); g.add(lamp);
  var tbl=bBench(w-.3,.62,.82,MAT.ss); g.add(tbl);
  var sc=box(.34,.045,.3,MAT.ss); sc.position.set(-.18,.86,0); g.add(sc);
  var ind=box(.2,.13,.04,MAT.screen); ind.position.set(.22,1.06,-.1); g.add(ind);
  var pole=new THREE.Mesh(GEO.cyl8,MAT.ssDull); pole.scale.set(.03,.34,.03); pole.position.set(.22,.95,-.1); g.add(pole);
  return g;
}
function bFloorScale(){
  var g=grp();
  var pl=box(.85,.07,.85,MAT.ss); pl.position.y=.035; g.add(pl);
  var pole=new THREE.Mesh(GEO.cyl8,MAT.ssDull); pole.scale.set(.045,1.1,.045); pole.position.set(-.5,.55,0); pole.castShadow=true; g.add(pole);
  var head=box(.3,.18,.07,MAT.screen); head.position.set(-.5,1.16,0); g.add(head);
  return g;
}
function bDrum(mat, r, h){
  var g=grp(); r=r||.27; h=h||.86;
  var d=new THREE.Mesh(GEO.cyl, mat||MAT.drumBlue); d.scale.set(r*2,h,r*2); d.position.y=h/2; d.castShadow=true; d.receiveShadow=true; g.add(d);
  var rim=new THREE.Mesh(GEO.cyl, MAT.ssDull); rim.scale.set(r*2.04,.025,r*2.04); rim.position.y=h; g.add(rim);
  return g;
}
function bTank(r, h){
  var g=grp();
  var body=new THREE.Mesh(GEO.cyl, MAT.ss); body.scale.set(r*2,h,r*2); body.position.y=.45+h/2; body.castShadow=true; g.add(body);
  var dome=new THREE.Mesh(new THREE.SphereGeometry(r,18,10,0,Math.PI*2,0,Math.PI/2), MAT.ss);
  dome.position.y=.45+h; dome.castShadow=true; g.add(dome);
  var motor=new THREE.Mesh(GEO.cyl, MAT.steelGray); motor.scale.set(.3,.34,.3); motor.position.y=.45+h+r*.62; g.add(motor);
  for(var i=0;i<3;i++){
    var a=i/3*Math.PI*2, l=new THREE.Mesh(GEO.cyl8, MAT.ssDull);
    l.scale.set(.06,.5,.06); l.position.set(Math.cos(a)*r*.85,.25,Math.sin(a)*r*.85); l.castShadow=true; g.add(l);
  }
  var valve=new THREE.Mesh(GEO.cyl8, MAT.ssDull); valve.rotation.x=Math.PI/2; valve.scale.set(.07,.3,.07);
  valve.position.set(0,.5,r+.14); g.add(valve);
  var pipe=new THREE.Mesh(GEO.cyl8, MAT.ssDull); pipe.scale.set(.05,h*.9,.05); pipe.position.set(r+.1,.45+h*.45,0); g.add(pipe);
  return g;
}
function bDryer(){
  var g=grp();
  var body=box(1.5,1.9,.95,MAT.ss); body.position.y=.95; g.add(body);
  var seam=box(.014,1.5,.014,MAT.frame,false); seam.position.set(0,1.0,.48); g.add(seam);
  [-.36,.36].forEach(function(x){ var hd=box(.05,.3,.05,MAT.frame,false); hd.position.set(x,1.0,.5); g.add(hd); });
  var panel=box(.5,.3,.05,MAT.screen); panel.position.set(.4,1.95,.3); panel.rotation.x=-.4; g.add(panel);
  return g;
}
function bControlPanel(){
  var g=grp();
  var body=box(.9,1.7,.4,MAT.steelGray); body.position.y=.85; g.add(body);
  var scr=box(.5,.34,.03,MAT.screen); scr.position.set(0,1.28,.21); g.add(scr);
  for(var i=0;i<6;i++){
    var b=new THREE.Mesh(GEO.cyl8, i%2?MAT.red:MAT.plasticGn); b.rotation.x=Math.PI/2;
    b.scale.set(.045,.03,.045); b.position.set(-.25+(i%3)*.25, .82-(Math.floor(i/3))*.18, .21); g.add(b);
  }
  return g;
}
function bConveyor(len){
  var g=grp();
  var belt=box(len,.06,.42,new THREE.MeshStandardMaterial({color:0x2e343a, roughness:.7})); belt.position.y=.85; g.add(belt);
  var fr=box(len,.05,.5,MAT.ss); fr.position.y=.8; g.add(fr);
  for(var i=0;i<=Math.floor(len/1.1);i++){
    var x=-len/2+.3+i*1.1;
    var l=new THREE.Mesh(GEO.cyl8, MAT.ssDull); l.scale.set(.05,.8,.05); l.position.set(Math.min(x,len/2-.3),.4,0); l.castShadow=true; g.add(l);
    var l2=l.clone(); l2.position.z=.18; g.add(l2); l.position.z=-.18;
  }
  return g;
}
function bFiller(){
  var g=grp();
  [-1,1].forEach(function(s){ var p=box(.09,1.9,.09,MAT.ss); p.position.set(s*.45,.95,0); g.add(p); });
  var beam=box(1.0,.5,.5,MAT.white); beam.position.y=1.75; g.add(beam);
  var hopper=new THREE.Mesh(new THREE.CylinderGeometry(.06,.26,.5,12), MAT.ss); hopper.position.y=2.2; g.add(hopper);
  var noz=new THREE.Mesh(GEO.cyl8, MAT.ssDull); noz.scale.set(.04,.36,.04); noz.position.y=1.35; g.add(noz);
  var scr=box(.3,.2,.04,MAT.screen); scr.position.set(.32,1.8,.27); g.add(scr);
  return g;
}
function bLabeler(){
  var g=grp();
  var body=box(.75,.55,.5,MAT.white); body.position.y=1.12; g.add(body);
  var roll=new THREE.Mesh(GEO.cyl, MAT.ssDull); roll.rotation.x=Math.PI/2; roll.scale.set(.3,.06,.3);
  roll.position.set(-.25,1.5,0); g.add(roll);
  var base=bBench(.9,.6,.85,MAT.ss); g.add(base);
  return g;
}
function bShrink(){
  var g=grp();
  var base=bBench(1.5,.65,.75,MAT.ss); g.add(base);
  var tun=box(.8,.5,.55,new THREE.MeshStandardMaterial({color:0x9db3bb, roughness:.4, metalness:.4})); tun.position.set(.2,1.0,0); g.add(tun);
  var mouth=box(.7,.34,.4,MAT.screen); mouth.position.set(.2,.98,.09); g.add(mouth);
  return g;
}
function bLockers(len){
  var g=grp(); var n=Math.round(len/.4), w=len/n;
  for(var i=0;i<n;i++){
    var u=box(w-.03,1.9,.5,MAT.binGray); u.position.set(-len/2+w/2+i*w,.95,0); g.add(u);
    var hd=box(.02,.1,.02,MAT.frame,false); hd.position.set(-len/2+w/2+i*w+w*.28,1.15,.26); g.add(hd);
    var v=box(w*.5,.02,.01,MAT.frame,false); v.position.set(-len/2+w/2+i*w,1.72,.255); g.add(v);
  }
  return g;
}
function bStepBench(len){
  var g=grp();
  var top=box(len,.05,.34,MAT.wood); top.position.y=.46; g.add(top);
  [-1,1].forEach(function(s){ var l=box(.06,.44,.3,MAT.ssDull); l.position.set(s*(len/2-.2),.22,0); g.add(l); });
  var shoe=box(len,.03,.3,MAT.ssDull,false); shoe.position.y=.16; g.add(shoe);
  return g;
}
function bSinkWall(){
  var g=grp();
  var basin=box(.52,.16,.42,MAT.white); basin.position.set(0,.82,0); g.add(basin);
  var inner=box(.4,.05,.3,new THREE.MeshStandardMaterial({color:0xb9c4c6, roughness:.3})); inner.position.set(0,.92,0); g.add(inner);
  var tap=new THREE.Mesh(GEO.cyl8, MAT.ss); tap.scale.set(.03,.24,.03); tap.position.set(0,1.02,-.14); g.add(tap);
  var sp=new THREE.Mesh(GEO.cyl8, MAT.ss); sp.rotation.x=Math.PI/2.4; sp.scale.set(.024,.16,.024); sp.position.set(0,1.13,-.07); g.add(sp);
  return g;
}
function bSinkDouble(){
  var g=grp();
  var b=bBench(1.7,.72,.88,MAT.ss); g.add(b);
  [-0.42,0.42].forEach(function(x){
    var bowl=box(.6,.22,.5,new THREE.MeshStandardMaterial({color:0x9fa9ad, roughness:.25, metalness:.8, envMap:envCube}));
    bowl.position.set(x,.8,0); g.add(bowl);
    var tap=new THREE.Mesh(GEO.cyl8, MAT.ss); tap.scale.set(.028,.3,.028); tap.position.set(x,1.03,-.28); g.add(tap);
    var sp=new THREE.Mesh(GEO.cyl8, MAT.ss); sp.rotation.x=Math.PI/2.2; sp.scale.set(.022,.2,.022); sp.position.set(x,1.16,-.2); g.add(sp);
  });
  var splash=box(1.7,.3,.03,MAT.ss,false); splash.position.set(0,1.03,-.36); g.add(splash);
  return g;
}
function bTrolley(){
  var g=grp();
  [.18,.62].forEach(function(y){ var sh=box(.85,.03,.5,MAT.ss); sh.position.y=y; g.add(sh); });
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(p){
    var post=new THREE.Mesh(GEO.cyl8,MAT.ssDull); post.scale.set(.03,.92,.03); post.position.set(p[0]*.4,.46,p[1]*.22); g.add(post);
    var wh=new THREE.Mesh(GEO.cyl,new THREE.MeshStandardMaterial({color:0x2b2f33, roughness:.8}));
    wh.rotation.z=Math.PI/2; wh.scale.set(.09,.03,.09); wh.position.set(p[0]*.4,.045,p[1]*.22); g.add(wh);
  });
  var hd=box(.03,.03,.5,MAT.ssDull,false); hd.position.set(.47,.98,0); g.add(hd);
  [-1,1].forEach(function(s){ var v=new THREE.Mesh(GEO.cyl8,MAT.ssDull); v.scale.set(.026,.34,.026); v.position.set(.47,.8,s*.23); g.add(v); });
  return g;
}
function bPalletTruck(){
  var g=grp();
  [-.16,.16].forEach(function(z){ var f=box(1.0,.05,.14,MAT.rackOr); f.position.set(.1,.09,z); g.add(f); });
  var head=box(.22,.3,.4,MAT.rackOr); head.position.set(-.5,.22,0); g.add(head);
  var arm=box(.05,.72,.05,MAT.steelGray); arm.position.set(-.62,.6,0); arm.rotation.z=.5; g.add(arm);
  var grip=box(.05,.05,.3,MAT.steelGray,false); grip.position.set(-.8,.9,0); g.add(grip);
  return g;
}
function bFridge(){
  var g=grp();
  var body=box(.7,1.8,.68,MAT.white); body.position.y=.9; g.add(body);
  var hd=box(.03,.5,.04,MAT.frame,false); hd.position.set(.3,1.1,.35); g.add(hd);
  var scr=box(.16,.08,.02,MAT.screen,false); scr.position.set(0,1.62,.35); g.add(scr);
  return g;
}
function bStool(){
  var g=grp();
  var seat=new THREE.Mesh(GEO.cyl, MAT.plasticBl); seat.scale.set(.36,.05,.36); seat.position.y=.62; seat.castShadow=true; g.add(seat);
  var pole=new THREE.Mesh(GEO.cyl8, MAT.ssDull); pole.scale.set(.04,.55,.04); pole.position.y=.32; g.add(pole);
  var base=new THREE.Mesh(GEO.cyl, MAT.ssDull); base.scale.set(.4,.03,.4); base.position.y=.02; g.add(base);
  return g;
}
function bChair(){
  var g=grp();
  var seat=box(.42,.05,.42,MAT.plasticBl); seat.position.y=.46; g.add(seat);
  var back=box(.42,.44,.05,MAT.plasticBl); back.position.set(0,.72,-.19); g.add(back);
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(p){
    var l=new THREE.Mesh(GEO.cyl8,MAT.ssDull); l.scale.set(.03,.45,.03); l.position.set(p[0]*.18,.23,p[1]*.18); g.add(l); });
  return g;
}
function bGownRack(len){
  var g=grp();
  [-1,1].forEach(function(s){ var p=new THREE.Mesh(GEO.cyl8,MAT.ssDull); p.scale.set(.035,1.7,.035); p.position.set(s*len/2,.85,0); g.add(p); });
  var bar=new THREE.Mesh(GEO.cyl8,MAT.ssDull); bar.rotation.z=Math.PI/2; bar.scale.set(.03,len,.03); bar.position.y=1.62; g.add(bar);
  var n=Math.floor(len/.3);
  for(var i=0;i<n;i++){
    var gown=box(.24,.78,.06,MAT.white,true,false);
    gown.position.set(-len/2+.25+i*.3,1.2,(Math.random()-.5)*.05); g.add(gown);
  }
  return g;
}
function bMirror(){
  var g=grp();
  var fr=box(.56,.86,.03,MAT.frame,false); fr.position.y=1.5; g.add(fr);
  var mr=box(.5,.8,.02,new THREE.MeshStandardMaterial({color:0xd8e4e6, roughness:.03, metalness:.9, envMap:envCube}));
  mr.position.set(0,1.5,.012); g.add(mr);
  return g;
}
function bExting(){
  var g=grp();
  var t=new THREE.Mesh(GEO.cyl, MAT.red); t.scale.set(.15,.44,.15); t.position.y=.95; t.castShadow=true; g.add(t);
  var nz=new THREE.Mesh(GEO.cyl8, MAT.frame); nz.scale.set(.03,.12,.03); nz.position.y=1.22; g.add(nz);
  var sign=new THREE.Mesh(new THREE.PlaneGeometry(.3,.3),
    new THREE.MeshStandardMaterial({map:textPlate('ถังดับเพลิง','#fff','#c0392b',128,128,22)}));
  sign.position.y=1.75; g.add(sign);
  return g;
}
function bIndicator(){
  var g=grp();
  var base=box(.3,.12,.06,MAT.steelGray,false); g.add(base);
  var r=new THREE.Mesh(GEO.sph, new THREE.MeshStandardMaterial({color:0xd94b3f, emissive:0xd94b3f, emissiveIntensity:.9}));
  r.scale.set(.07,.07,.05); r.position.set(-.07,0,.04); g.add(r);
  var gn=new THREE.Mesh(GEO.sph, new THREE.MeshStandardMaterial({color:0x3fae7a, emissive:0x3fae7a, emissiveIntensity:.9}));
  gn.scale.set(.07,.07,.05); gn.position.set(.07,0,.04); g.add(gn);
  return g;
}
function bDeskPC(){
  var g=grp();
  var t=bBench(1.3,.6,.76,MAT.whiteTop,MAT.steelGray); g.add(t);
  var mon=box(.5,.32,.03,MAT.screen); mon.position.set(0,1.05,-.12); g.add(mon);
  var st=box(.14,.2,.1,MAT.frame,false); st.position.set(0,.86,-.12); g.add(st);
  var kb=box(.4,.02,.15,MAT.binGray,false); kb.position.set(0,.78,.08); g.add(kb);
  return g;
}
function bMonitorSmall(){
  var g=grp();
  var mon=box(.4,.28,.03,MAT.screen); mon.position.set(0,1.14,0); g.add(mon);
  var st=box(.1,.18,.08,MAT.frame,false); st.position.set(0,.96,.02); g.add(st);
  return g;
}
// gowned operator figure
var MAT_gown=new THREE.MeshStandardMaterial({color:0xf2f4f0, roughness:.85});
var MAT_skin=new THREE.MeshStandardMaterial({color:0xd9a988, roughness:.7});
var MAT_cap =new THREE.MeshStandardMaterial({color:0x86b7d8, roughness:.6});
function bOperator(){
  var g=grp();
  [-1,1].forEach(function(s){
    var leg=new THREE.Mesh(GEO.cyl8, MAT_gown); leg.scale.set(.075,.72,.075);
    leg.position.set(s*.09,.36,0); leg.castShadow=true; g.add(leg);
    var shoe=box(.1,.06,.2,MAT.binGray); shoe.position.set(s*.09,.03,.03); g.add(shoe);
    var arm=new THREE.Mesh(GEO.cyl8, MAT_gown); arm.scale.set(.05,.52,.05);
    arm.position.set(s*.235,1.06,.01); arm.rotation.z=s*-.14; arm.castShadow=true; g.add(arm);
    var hand=new THREE.Mesh(GEO.sph, MAT_skin); hand.scale.set(.05,.05,.05); hand.position.set(s*.27,.78,.02); g.add(hand);
  });
  var body=new THREE.Mesh(GEO.cyl, MAT_gown); body.scale.set(.36,.64,.3);
  body.position.y=1.04; body.castShadow=true; g.add(body);
  var head=new THREE.Mesh(GEO.sph, MAT_skin); head.scale.set(.2,.22,.2); head.position.y=1.56; head.castShadow=true; g.add(head);
  var cap=new THREE.Mesh(GEO.sph, MAT_cap); cap.scale.set(.215,.16,.215); cap.position.y=1.63; g.add(cap);
  var mask=box(.13,.07,.03,MAT_cap,false); mask.position.set(0,1.52,.095); g.add(mask);
  return g;
}
// RO water skid
function bROskid(){
  var g=grp();
  [[-.45,-.14],[.45,-.14],[-.45,.14],[.45,.14]].forEach(function(p){
    var post=box(.05,1.3,.05,MAT.steelGray); post.position.set(p[0],.65,p[1]); g.add(post);
  });
  for(var i=0;i<3;i++){
    var mem=new THREE.Mesh(GEO.cyl, MAT.white); mem.rotation.z=Math.PI/2;
    mem.scale.set(.18,1.0,.18); mem.position.set(0,.45+i*.32,0); mem.castShadow=true; g.add(mem);
    var band=new THREE.Mesh(GEO.cyl, MAT.plasticBl); band.rotation.z=Math.PI/2;
    band.scale.set(.19,.12,.19); band.position.set(.22-i*.2,.45+i*.32,0); g.add(band);
  }
  var pump=box(.34,.3,.3,MAT.steelBlue); pump.position.set(.28,.15,.22); g.add(pump);
  var gauge=new THREE.Mesh(GEO.cyl8, MAT.white); gauge.rotation.x=Math.PI/2;
  gauge.scale.set(.09,.04,.09); gauge.position.set(-.3,1.42,.12); g.add(gauge);
  var pipe=new THREE.Mesh(GEO.cyl8, MAT.ssDull); pipe.scale.set(.03,1.4,.03); pipe.position.set(-.45,.7,.12); g.add(pipe);
  return g;
}
function bWaterTank(){
  var g=grp();
  var body=new THREE.Mesh(GEO.cyl, new THREE.MeshStandardMaterial({color:0xdde9ee, roughness:.4}));
  body.scale.set(.62,1.7,.62); body.position.y=.85; body.castShadow=true; g.add(body);
  var lid=new THREE.Mesh(GEO.cyl, MAT.plasticBl); lid.scale.set(.3,.08,.3); lid.position.y=1.74; g.add(lid);
  var band1=new THREE.Mesh(GEO.cyl, MAT.plasticBl); band1.scale.set(.63,.05,.63); band1.position.y=.5; g.add(band1);
  var band2=band1.clone(); band2.position.y=1.2; g.add(band2);
  return g;
}
// sloped-floor drain pad (epoxy slope creases -> SS grate)
var slopeShadeTex=(function(){
  var cv=document.createElement('canvas'); cv.width=128; cv.height=128;
  var g=cv.getContext('2d');
  var rg=g.createRadialGradient(64,64,4,64,64,62);
  rg.addColorStop(0,'rgba(58,66,60,.42)'); rg.addColorStop(.55,'rgba(58,66,60,.16)'); rg.addColorStop(1,'rgba(58,66,60,0)');
  g.fillStyle=rg; g.fillRect(0,0,128,128);
  var tx=new THREE.CanvasTexture(cv); tx.encoding=THREE.sRGBEncoding; return tx;
})();
var crMatSlope=new THREE.MeshStandardMaterial({color:0x87908a, roughness:.5});
var slotMatSlope=new THREE.MeshStandardMaterial({color:0x2f3634, roughness:.7});
function slopeFloor(rx0,ry0,rx1,ry1,dx,dy){
  // sloped epoxy floor: crease lines run from the drain to the actual room corners
  var g=grp();
  var shade=new THREE.Mesh(new THREE.PlaneGeometry(1.9,1.9),
    new THREE.MeshBasicMaterial({map:slopeShadeTex, transparent:true, depthWrite:false}));
  shade.rotation.x=-Math.PI/2; shade.position.set(WX(dx),.052,WZ(dy)); shade.renderOrder=2; g.add(shade);
  [[rx0,ry0],[rx1,ry0],[rx0,ry1],[rx1,ry1]].forEach(function(c){
    var vx=c[0]-dx, vy=c[1]-dy, len=Math.hypot(vx,vy);
    var cr=box(len,.004,.024,crMatSlope,false,true);
    cr.position.set(WX(dx+vx/2),.054,WZ(dy+vy/2));
    cr.rotation.y=-Math.atan2(-vy,vx);
    g.add(cr);
  });
  var grate=box(.3,.018,.3,MAT.ss,false,true); grate.position.set(WX(dx),.05,WZ(dy)); g.add(grate);
  for(var m=-1;m<=1;m++){ var slot=box(.24,.02,.028,slotMatSlope,false);
    slot.position.set(WX(dx),.052,WZ(dy)+m*.08); g.add(slot); }
  world.add(g); return g;
}
// entrance ramp wedge (exterior)
function bRamp(w){
  var g=grp();
  var pl=box(w,.05,1.1,MAT.slab,false,true);
  pl.rotation.x=-2.6*DEG; pl.position.set(0,.012,0); g.add(pl);
  return g;
}
function place(builder, px, py, rotDeg, args){
  var g=builder.apply(null,args||[]);
  g.position.set(WX(px),0,WZ(py));
  if(rotDeg) g.rotation.y=rotDeg*DEG;
  world.add(g); return g;
}

// ============================================================
// ROOM FIT-OUT — 28 x 12 m sketch layout (roomy)
// ============================================================
// -- RO water plant (outside the line, own external door) ---------------------
place(bWaterTank,0.6,11.3,0);  place(bWaterTank,1.35,11.3,0); solid(0.2,10.9,1.75,11.75);
place(bROskid,1.55,9.9,0);     solid(0.95,9.5,2.15,10.3);
place(bControlPanel,0.35,8.3,90); solid(0.1,7.85,0.6,8.75);
(function(){ [10.5,10.9].forEach(function(y){
  var p=new THREE.Mesh(GEO.cyl8,MAT.ssDull); p.scale.set(.03,2.9,.03);
  p.position.set(WX(2.08),1.45,WZ(y)); world.add(p); });
  var d=new THREE.Mesh(GEO.cyl,new THREE.MeshStandardMaterial({color:0x555c58, roughness:.5, metalness:.4}));
  d.scale.set(.5,.008,.5); d.position.set(WX(1.6),.036,WZ(7.8)); d.receiveShadow=true; world.add(d);
  var sign=new THREE.Mesh(new THREE.PlaneGeometry(.9,.28),
    new THREE.MeshStandardMaterial({map:textPlate('ระบบน้ำ RO','#fff','#2f6f9e',256,80,34)}));
  sign.position.set(WX(1.1),2.3,WZ(11.93)); world.add(sign);
})();

// -- Raw material store --------------------------------------------------------
place(bRack,4.4,11.35,0,[3.8]); solid(2.45,10.85,6.35,11.9);
cluster(poolBox,4.4,11.35,1.03,5,3.4,.8); cluster(poolBox2,4.4,11.35,.19,4,3.4,.8);
[[5.7,9.6],[5.7,8.5]].forEach(function(p){ place(bPalletLoad,p[0],p[1],0); solid(p[0]-.55,p[1]-.45,p[0]+.55,p[1]+.45);
  for(var i=0;i<4;i++) poolSack.add(p[0]+(Math.random()-.5)*.5, p[1]+(Math.random()-.5)*.3, .16, .5,.32,.4, Math.random());
});
place(bPalletLoad,2.9,8.3,0); cluster(poolBox,2.9,8.3,.17,3,.9,.7); solid(2.35,7.85,3.45,8.75);
place(bDrum,6.3,7.6,0,[MAT.drumWhite]); place(bPalletTruck,2.9,7.0,15);

// -- Sampling ------------------------------------------------------------------
place(bBooth,7.75,11.3,0,[1.5,1.1,2.3]); solid(6.95,10.7,8.55,11.9);
place(bBench,6.85,9.3,90,[1.8,.55,.9,MAT.whiteTop]); solid(6.62,8.4,7.1,10.2);
place(bStool,7.5,9.3,0); place(bTrolley,8.4,8.3,0);

// -- Washing -------------------------------------------------------------------
place(bSinkDouble,10.0,11.35,0); solid(9.2,10.95,10.8,11.75);
place(bBench,10.9,9.4,90,[1.8,.7,.85]); solid(10.62,8.5,11.12,10.3);
place(bTrolley,9.3,9.9,90);
(function(){ var d=new THREE.Mesh(GEO.cyl,new THREE.MeshStandardMaterial({color:0x555c58, roughness:.5, metalness:.4}));
  d.scale.set(.5,.008,.5); d.position.set(WX(9.7),.041,WZ(8.6)); d.receiveShadow=true; world.add(d); })();

// -- Drying room ---------------------------------------------------------------
place(bDryer,12.35,11.3,0); solid(11.6,10.8,13.1,11.8);
place(bBench,11.45,9.4,90,[1.6,.6,.9]); solid(11.22,8.6,11.7,10.2);
place(bTrolley,13.0,9.2,0); place(bDrum,13.15,7.8,0,[MAT.drumWhite,.24,.8]);

// -- Clean equipment store -------------------------------------------------------
place(bShelfSS,14.65,11.4,0,[1.9,.5,4]); solid(13.7,11.15,15.6,11.9);
place(bShelfSS,13.75,9.3,90,[1.9,.5,4]); solid(13.52,8.35,14.0,10.25);
(function(){ for(var i=0;i<6;i++){ var b=box(.28,.2,.28,MAT.binGray);
  b.position.set(WX(14.15+(i%3)*.5), .38+Math.floor(i/3)*.47+.1, WZ(11.4)); world.add(b); } })();
place(bTrolley,15.2,8.6,0);

// -- Liquid filling (+ its own airlock) ------------------------------------------
place(bTank,16.25,11.3,0,[.45,1.3]); solid(15.85,10.85,16.7,11.75);
place(bConveyor,17.55,10.6,90,[2.2]); solid(17.3,9.5,17.8,11.7);
place(bFiller,17.55,11.1,90);
for(var lb=0;lb<5;lb++) poolBottle.add(17.55, 9.75+lb*.34, .88, .1,.22,.1, 0);
place(bBench,18.35,9.3,90,[1.6,.5,.9]); solid(18.12,8.5,18.6,10.1);

// -- Liquid mixing ----------------------------------------------------------------
place(bTank,19.3,11.2,0,[.6,1.5]); solid(18.65,10.5,19.95,11.85);
place(bTank,20.6,11.25,0,[.45,1.3]); solid(20.1,10.75,21.1,11.75);
place(bControlPanel,21.35,9.9,-90); solid(21.1,9.4,21.6,10.4);
place(bBench,18.85,9.0,90,[1.6,.6,.9]); solid(18.62,8.2,19.1,9.8);
place(bDrum,21.35,7.7,0,[MAT.drumBlue]); place(bTrolley,20.4,8.4,0);

// -- Packaging materials store -----------------------------------------------------
place(bRack,22.8,11.35,0,[2.2]); solid(21.7,10.85,23.9,11.9);
cluster(poolBox,22.8,11.35,1.03,4,1.9,.8); cluster(poolBox2,22.8,11.35,.19,3,1.9,.8);
place(bPalletLoad,23.35,9.5,0); cluster(poolBox,23.35,9.5,.17,3,.9,.7); solid(22.8,9.05,23.9,9.95);
cluster(poolBox,21.95,10.4,0,3,.5,.5); solid(21.65,10.05,22.4,10.75);
place(bPalletTruck,23.3,7.9,15);

// -- Stability samples --------------------------------------------------------------
place(bShelfSS,24.28,10.0,90,[2.6,.5,4]); solid(24.05,8.7,24.53,11.3);
for(var sb=0;sb<12;sb++) poolBottle.add(24.28, 8.9+(sb%6)*.42, (sb<6?.72:1.2), .08,.17,.08, 0);
place(bFridge,25.6,11.5,180); solid(25.25,11.15,25.95,11.85);
place(bBench,25.55,8.0,180,[.8,.5,.9,MAT.whiteTop]); solid(25.15,7.72,25.95,8.3);
place(bMonitorSmall,25.7,8.05,180);
place(bStool,25.35,8.85,0);

// -- Change room north ----------------------------------------------------------------
place(bLockers,27.7,10.7,-90,[2.0]); solid(27.45,9.7,27.95,11.7);
place(bStepBench,27.6,8.4,90,[1.0]); solid(27.35,7.9,27.85,8.9);
place(bSinkWall,26.5,11.75,0);
place(bMirror,27.0,11.78,0);

// -- Staff entry / toilet ----------------------------------------------------------------
(function(){
  [[0.6,4.1],[1.5,4.1]].forEach(function(p){
    var st=box(.85,2.15,1.15,MAT.white); st.position.set(WX(p[0]),1.075,WZ(p[1])); world.add(st);
    var dr=box(.02,1.7,.6,MAT.frame,false); dr.position.set(WX(p[0]),1.0,WZ(p[1]-.62)); world.add(dr);
  });
  solid(0.15,3.5,1.95,4.72);
})();
place(bSinkWall,0.6,0.35,180); place(bMirror,1.2,0.35,180);
place(bStepBench,1.9,1.4,0,[.9]);

// -- Gowning (south) ---------------------------------------------------------------------
place(bLockers,2.85,3.75,90,[1.5]); solid(2.6,3.0,3.1,4.5);
place(bStepBench,4.0,3.1,0,[1.1]); solid(3.45,2.9,4.55,3.3);
place(bGownRack,5.15,1.5,90,[1.0]); solid(4.93,1.0,5.37,2.0);
place(bSinkWall,3.9,0.4,180); place(bMirror,4.35,0.4,180);
(function(){ var st=box(2.6,.006,.05,MAT.bluePnt,false,true); st.position.set(WX(3.95),.041,WZ(3.1)); world.add(st); })();

// -- Weighing --------------------------------------------------------------------------------
place(bBooth,6.8,0.7,180,[1.6,1.15,2.3]); solid(5.95,0.1,7.65,1.35);
place(bBench,5.65,2.8,90,[1.8,.55,.9]); solid(5.42,1.9,5.9,3.7);
place(bFloorScale,7.85,1.9,90);
place(bDrum,7.9,3.6,0,[MAT.drumBlue]); place(bDrum,7.9,2.9,0,[MAT.drumWhite,.24,.8]);
solid(7.62,3.32,8.18,3.88);
place(bTrolley,6.1,4.2,0);

// -- Mixer -----------------------------------------------------------------------------------
place(bTank,8.75,3.4,0,[.55,1.5]); solid(8.2,2.85,9.3,3.95);
place(bTank,10.6,1.0,0,[.4,1.2]); solid(10.15,0.55,11.0,1.45);
place(bControlPanel,8.6,0.6,180); solid(8.15,0.4,9.05,0.8);
place(bBench,10.75,3.5,90,[1.5,.6,.9]); solid(10.5,2.75,11.0,4.25);
place(bDrum,9.9,0.7,0,[MAT.drumWhite,.24,.8]);

// -- Capsule filling ----------------------------------------------------------------------------
place(bFiller,11.7,3.3,0); solid(11.35,2.9,12.05,3.65);
place(bConveyor,12.2,2.2,0,[1.7]); solid(11.35,1.95,13.05,2.45);
for(var cb=0;cb<6;cb++) poolBottle.add(11.6+cb*.24, 2.2, .88, .09,.18,.09, 0);
place(bBench,13.45,3.4,90,[1.5,.55,.9]); solid(13.2,2.65,13.7,4.15);
place(bControlPanel,13.35,0.7,90); solid(13.1,0.25,13.6,1.15);
place(bTrolley,11.4,0.8,0);

// -- IPC -------------------------------------------------------------------------------------------
place(bBench,14.05,2.6,90,[2.6,.55,.9,MAT.whiteTop]); solid(13.82,1.3,14.3,3.9);
place(bBench,15.3,0.7,0,[1.3,.55,.9,MAT.whiteTop]); solid(14.65,0.4,15.95,1.0);
place(bMonitorSmall,14.1,3.0,90);
place(bFloorScale,15.5,3.7,0);
place(bStool,14.9,2.4,0); place(bStool,15.05,1.5,0);

// -- Blister packing ----------------------------------------------------------------------------------
place(bShrink,17.0,1.1,0); solid(16.25,0.75,17.75,1.45);
place(bBench,18.3,2.9,90,[1.8,.6,.9]); solid(18.05,2.0,18.55,3.8);
cluster(poolBox,16.35,4.1,0,3,.5,.5); solid(16.1,3.75,16.75,4.45);
place(bChair,17.9,1.95,90);

// -- Bottle / jar filling --------------------------------------------------------------------------------
place(bConveyor,20.0,1.5,0,[2.4]); solid(18.8,1.25,21.2,1.75);
place(bFiller,19.3,1.5,0); place(bLabeler,20.7,1.5,0);
for(var ob=0;ob<8;ob++) poolBottle.add(19.1+ob*.24, 1.5, .88, .1,.22,.1, 0);
place(bBench,18.85,3.6,90,[1.4,.55,.9]); solid(18.62,2.9,19.1,4.3);
place(bPalletLoad,21.05,3.9,0,['wrap']); solid(20.5,3.45,21.45,4.35);
place(bTrolley,19.0,0.6,0);

// -- Labelling room ---------------------------------------------------------------------------------------
place(bLabeler,23.1,4.05,0); solid(22.7,3.7,23.5,4.4);
place(bBench,21.75,2.5,90,[2.0,.6,.88]); solid(21.5,1.5,22.0,3.5);
cluster(poolBox,21.75,2.5,.9,4,1.6,.5,.22);
cluster(poolBox2,23.5,2.2,0,3,.45,.6); solid(23.2,1.85,23.8,2.55);
place(bChair,22.6,2.5,90); place(bTrolley,23.35,1.1,0);

// -- FG store + label store ----------------------------------------------------------------------------------
place(bRack,27.45,3.2,90,[2.2]); solid(26.95,2.1,27.95,4.3);
cluster(poolBox,27.45,3.2,1.03,3,.8,1.6); cluster(poolBox2,27.45,3.2,.19,2,.8,1.6);
place(bPalletLoad,24.55,4.15,0,['wrap']); solid(24.05,3.7,25.1,4.6);
place(bPalletLoad,24.55,3.0,0,['wrap']); solid(24.05,2.55,25.1,3.45);
place(bCabinet,24.9,0.35,0,[.62,1.9,.5]); solid(24.58,0.1,25.22,0.62);
place(bCabinet,25.8,0.35,0,[.62,1.9,.5]); solid(25.48,0.1,26.12,0.62);
cluster(poolBox2,27.4,0.9,0,3,.4,.6);

// -- Airlocks & corridors ------------------------------------------------------------------------------------
place(bTrolley,1.0,6.0,90);
[[0.16,90],[1.92,-90],[2.08,90],[3.12,-90],[22.68,90],[23.62,-90]].forEach(function(p){
  var ind=place(bIndicator,p[0],6.0,p[1]); ind.position.y=2.5;
});
place(bTrolley,5.2,6.55,0); place(bTrolley,15.2,5.4,90);
place(bExting,8.0,4.96,0); place(bExting,16.0,7.04,180);
place(bPalletTruck,26.5,6.6,15);
place(bExting,27.85,5.2,-90);
(function(){ // exit signs
  var s=new THREE.Mesh(new THREE.PlaneGeometry(.72,.27), MAT.exit);
  s.position.set(WX(27.86),2.5,WZ(6)); s.rotation.y=-Math.PI/2; world.add(s);
  var s2=new THREE.Mesh(new THREE.PlaneGeometry(.72,.27), MAT.exit);
  s2.position.set(WX(0.14),2.45,WZ(2.4)); s2.rotation.y=Math.PI/2; world.add(s2);
})();

// -- Sloped floors to drains (creases follow each room's corners) --------------------------------
slopeFloor(0.12,7.32,2.08,11.88, 1.6,7.8);     // RO plant
slopeFloor(9.02,7.32,11.08,11.88, 9.7,8.8);    // washing room
slopeFloor(0.12,0.12,2.48,4.68, 1.5,2.9);      // staff toilet
slopeFloor(15.92,8.52,18.48,11.88, 16.05,9.3); // liquid filling (north of its airlock)
slopeFloor(18.72,7.32,21.48,11.88, 20.4,9.1);  // liquid mixing
// -- Entrance ramps (exterior slope) --------------------------------------------------------------
place(bRamp,-0.75,6.0,90,[2.4]);         // material entry
place(bRamp,-0.72,2.4,90,[1.3]);         // staff entry
place(bRamp,-0.72,9.0,90,[1.3]);         // RO room
place(bRamp,28.75,6.0,-90,[2.0]);        // dispatch

// build instanced contents
poolBox.build(); poolBox2.build(); poolSack.build(); poolBottle.build();

// ============================================================
// EXTERIOR
// ============================================================
(function(){
  var apron=new THREE.Mesh(new THREE.BoxGeometry(48,.1,26), MAT.asphalt);
  apron.position.y=-.07; apron.receiveShadow=true; world.add(apron);
  var lawn=new THREE.Mesh(new THREE.CylinderGeometry(58,58,.1,48), MAT.grass);
  lawn.position.y=-.13; lawn.receiveShadow=true; world.add(lawn);

  function canopy(px, postX){
    var can=box(1.7,.09,3.4,MAT.steelGray); can.position.set(WX(px),2.62,WZ(6)); world.add(can);
    [-1,1].forEach(function(s){ var post=new THREE.Mesh(GEO.cyl8,MAT.steelGray);
      post.scale.set(.06,2.6,.06); post.position.set(WX(postX),1.3,WZ(6+s*1.5)); post.castShadow=true; world.add(post); });
  }
  canopy(-.75, -1.5);   // west material entry
  canopy(28.75, 29.5);  // east dispatch

  for(var i=0;i<3;i++){
    var st=box(.12,.004,2.6,MAT.yellowPnt,false,true);
    st.position.set(WX(-2.2-i*1.1),-.014,WZ(6)); world.add(st);
    var st2=box(.12,.004,2.6,MAT.yellowPnt,false,true);
    st2.position.set(WX(30.2+i*1.1),-.014,WZ(6)); world.add(st2);
  }

  function makeTruck(cabColor){
    var tr=grp();
    var cargo=box(3.4,2.2,2.1,new THREE.MeshStandardMaterial({color:0xe9ebe6, roughness:.5})); cargo.position.set(.4,1.55,0); tr.add(cargo);
    var cab=box(1.15,1.5,1.9,new THREE.MeshStandardMaterial({color:cabColor, roughness:.45, metalness:.15})); cab.position.set(-1.9,1.05,0); tr.add(cab);
    var win=box(.1,.5,1.5,MAT.glass); win.position.set(-2.42,1.45,0); tr.add(win);
    [[-1.85,.85],[1.15,.85],[1.95,.85]].forEach(function(p){
      [-1,1].forEach(function(s){ var wh=new THREE.Mesh(GEO.cyl,new THREE.MeshStandardMaterial({color:0x23262a, roughness:.85}));
        wh.rotation.x=Math.PI/2; wh.scale.set(.72,.3,.72); wh.position.set(p[0],.36,s*1.05); wh.castShadow=true; tr.add(wh); });
    });
    tr.traverse(function(o){ if(o.isMesh){o.castShadow=true; o.receiveShadow=true;} });
    return tr;
  }
  var trIn=makeTruck(0x3f7a52);
  trIn.position.set(WX(-4.4),0,WZ(6)); world.add(trIn);
  var trOut=makeTruck(0x39628f);
  trOut.position.set(WX(32.4),0,WZ(6)); trOut.rotation.y=Math.PI; world.add(trOut);

  [[-7.5,-2.5],[-6,14.8],[35.5,1.2],[36.5,9.4],[10,15.8],[16,-3.8],[36,-2.4]].forEach(function(p,i){
    var t=grp();
    var tk=new THREE.Mesh(GEO.cyl8,MAT.trunk); tk.scale.set(.16,1.6,.16); tk.position.y=.8; tk.castShadow=true; t.add(tk);
    var f1=new THREE.Mesh(GEO.sph, i%2?MAT.foliage:MAT.foliage2); f1.scale.set(1.9,1.7,1.9); f1.position.y=2.2; f1.castShadow=true; t.add(f1);
    var f2=new THREE.Mesh(GEO.sph, MAT.foliage); f2.scale.set(1.2,1.1,1.2); f2.position.set(.5,2.9,.3); t.add(f2);
    t.position.set(WX(p[0]),0,WZ(p[1])); world.add(t);
  });

  var sg=new THREE.Mesh(new THREE.PlaneGeometry(1.7,.34),
    new THREE.MeshStandardMaterial({map:textPlate('รับวัตถุดิบ  RECEIVING','#fff','#2c5c46',512,96,40)}));
  sg.position.set(WX(-.15),2.62,WZ(6)); sg.rotation.y=-Math.PI/2; world.add(sg);
  var sg2=new THREE.Mesh(new THREE.PlaneGeometry(1.2,.28),
    new THREE.MeshStandardMaterial({map:textPlate('ทางเข้าพนักงาน','#fff','#2c5c46',384,96,42)}));
  sg2.position.set(WX(-.15),2.45,WZ(2.4)); sg2.rotation.y=-Math.PI/2; world.add(sg2);
  var sg3=new THREE.Mesh(new THREE.PlaneGeometry(1.2,.28),
    new THREE.MeshStandardMaterial({map:textPlate('ห้องระบบน้ำ RO','#fff','#2f6f9e',384,96,42)}));
  sg3.position.set(WX(-.15),2.45,WZ(9.0)); sg3.rotation.y=-Math.PI/2; world.add(sg3);
  var sg4=new THREE.Mesh(new THREE.PlaneGeometry(1.7,.34),
    new THREE.MeshStandardMaterial({map:textPlate('จ่ายสินค้า  DISPATCH','#fff','#2c5c46',512,96,40)}));
  sg4.position.set(WX(28.15),2.62,WZ(6)); sg4.rotation.y=Math.PI/2; world.add(sg4);
})();

// ============================================================
// CEILING (walk mode only)
// ============================================================
var ceilGroup=new THREE.Group(); world.add(ceilGroup);
(function(){
  var ceil=new THREE.Mesh(new THREE.BoxGeometry(PLAN_W+.44,.08,PLAN_D+.44),
    new THREE.MeshStandardMaterial({color:0xf4f4ef, roughness:.9, side:THREE.DoubleSide}));
  ceil.position.y=WALL_H+.04; ceil.castShadow=false; ceil.receiveShadow=false; ceilGroup.add(ceil);
  var panelGeo=new THREE.BoxGeometry(.58,.025,.58);
  ROOMS.forEach(function(r){
    if(r.id==='rm'||r.id==='fg'||r.id==='pkmat'||r.id==='liqAL') return;
    var w=r.x1-r.x0, d=r.y1-r.y0;
    var nx=Math.max(1,Math.round((w-1.0)/2.3)), ny=Math.max(1,Math.round((d-1.0)/2.3));
    for(var i=0;i<nx;i++) for(var j=0;j<ny;j++){
      var px=r.x0+(w/(nx+1))*(i+1), py=r.y0+(d/(ny+1))*(j+1);
      var p=new THREE.Mesh(panelGeo, MAT.lamp); p.castShadow=false;
      p.position.set(WX(px),WALL_H-.02,WZ(py)); ceilGroup.add(p);
      var fr=new THREE.Mesh(new THREE.BoxGeometry(.66,.02,.66), MAT.lampCase);
      fr.position.set(WX(px),WALL_H-.005,WZ(py)); fr.castShadow=false; ceilGroup.add(fr);
    }
  });
  [[3.3,10.6],[5.5,10.6],[3.3,8.4],[5.5,8.4],[22.8,10.5],[22.8,8.5],[26.0,3.3]].forEach(function(p){
    var ring=new THREE.Mesh(new THREE.CylinderGeometry(.36,.36,.016,20), MAT.lampCase);
    ring.position.set(WX(p[0]),WALL_H-.035,WZ(p[1])); ring.castShadow=false; ceilGroup.add(ring);
    var glow=new THREE.Mesh(GEO.cyl, MAT.lamp); glow.scale.set(.6,.02,.6); glow.castShadow=false;
    glow.position.set(WX(p[0]),WALL_H-.048,WZ(p[1])); ceilGroup.add(glow);
  });
})();
ceilGroup.visible=false;
