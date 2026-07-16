/* ============================================================
   GMP Herbal Medicine Plant — 3D Walkthrough Simulator
   Plan: 20 x 10 m · grid 4 m · per reference layout drawing
   Part 1: core, materials, layout data, architecture
   ============================================================ */

// ---------- tiny helpers ----------
var PLAN_W = 28, PLAN_D = 12, WALL_H = 3.2;
function WX(x){ return x - PLAN_W/2; }          // plan x (0..20, west->east)  -> world x
function WZ(y){ return PLAN_D/2 - y; }          // plan y (0..10, south->north)-> world z (north = -z)
function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
function lerp(a,b,t){ return a+(b-a)*t; }
var DEG = Math.PI/180;

var canvasEl = document.getElementById('c');
var renderer = null;
try{
  renderer = new THREE.WebGLRenderer({canvas:canvasEl, antialias:true, powerPreference:'high-performance'});
}catch(e){ document.getElementById('err').style.display='flex'; }
if(renderer){
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

var scene = new THREE.Scene();

// soft sage sky gradient background
(function(){
  var cv = document.createElement('canvas'); cv.width=2; cv.height=512;
  var g = cv.getContext('2d');
  var gr = g.createLinearGradient(0,0,0,512);
  gr.addColorStop(0,'#a5c4b3'); gr.addColorStop(.55,'#cbdccd'); gr.addColorStop(.78,'#e6e9db'); gr.addColorStop(1,'#dee1d2');
  g.fillStyle=gr; g.fillRect(0,0,2,512);
  var tx = new THREE.CanvasTexture(cv); tx.encoding = THREE.sRGBEncoding;
  scene.background = tx;
})();
scene.fog = new THREE.Fog(0xd3dfd0, 85, 190);

// ---------- lights ----------
var hemi = new THREE.HemisphereLight(0xcfe4ff, 0x8e9683, 0.42); scene.add(hemi);
var amb  = new THREE.AmbientLight(0xffffff, 0.07); scene.add(amb);
var sun  = new THREE.DirectionalLight(0xfff0dd, 1.75);
sun.position.set(20, 30, 15);
sun.castShadow = true;
sun.shadow.mapSize.set(window.innerWidth>900?4096:2048, window.innerWidth>900?4096:2048);
sun.shadow.camera.left=-26; sun.shadow.camera.right=26;
sun.shadow.camera.top=19;  sun.shadow.camera.bottom=-19;
sun.shadow.camera.near=6;  sun.shadow.camera.far=85;
sun.shadow.bias = -0.00035; sun.shadow.normalBias = 0.025;
scene.add(sun);
var fill = new THREE.DirectionalLight(0xdfeaff, 0.35); fill.position.set(-14, 18, -10); scene.add(fill);

// ---------- procedural env cube (for stainless reflections) ----------
var envCube = (function(){
  var faces = [];
  for(var i=0;i<6;i++){
    var cv=document.createElement('canvas'); cv.width=128; cv.height=128;
    var g=cv.getContext('2d'), gr;
    if(i===2){ gr=g.createLinearGradient(0,0,0,128); gr.addColorStop(0,'#b8c9d2'); gr.addColorStop(1,'#8fa8ae'); }
    else if(i===3){ gr=g.createLinearGradient(0,0,0,128); gr.addColorStop(0,'#8a927f'); gr.addColorStop(1,'#5f665a'); }
    else { gr=g.createLinearGradient(0,0,0,128);
      gr.addColorStop(0,'#9fb5bf'); gr.addColorStop(.62,'#b4bfae'); gr.addColorStop(.66,'#79836f'); gr.addColorStop(1,'#5f6758'); }
    g.fillStyle=gr; g.fillRect(0,0,128,128);
    if(i===0){ var rg=g.createRadialGradient(94,26,2,94,26,36);
      rg.addColorStop(0,'rgba(255,250,232,.95)'); rg.addColorStop(1,'rgba(255,250,232,0)');
      g.fillStyle=rg; g.fillRect(0,0,128,128); }
    if(i!==3 && i!==2){ g.fillStyle='rgba(255,255,252,.3)'; g.fillRect(12+i*9,10,9,42); } // soft light strips
    faces.push(cv);
  }
  var ct = new THREE.CubeTexture(faces);
  ct.needsUpdate = true; ct.encoding = THREE.sRGBEncoding;
  return ct;
})();
scene.environment = envCube;   // subtle reflections/sheen on all standard materials

// ---------- texture factory ----------
function noiseCanvas(base, dots, dotAlpha, n){
  var cv=document.createElement('canvas'); cv.width=256; cv.height=256;
  var g=cv.getContext('2d');
  g.fillStyle=base; g.fillRect(0,0,256,256);
  for(var i=0;i<(n||900);i++){
    g.fillStyle='rgba('+dots+','+(Math.random()*dotAlpha).toFixed(3)+')';
    var s=Math.random()*2.2+0.4;
    g.fillRect(Math.random()*256, Math.random()*256, s, s);
  }
  return cv;
}
function makeTex(cv, rx, ry){
  var t=new THREE.CanvasTexture(cv);
  t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(rx,ry);
  t.encoding=THREE.sRGBEncoding; t.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 1;
  return t;
}
function concreteTex(rx,ry){
  var cv=noiseCanvas('#b4b2aa','70,70,64',0.10,1400);
  var g=cv.getContext('2d');
  g.strokeStyle='rgba(80,82,76,.16)'; g.lineWidth=1.2;
  g.beginPath(); g.moveTo(0,128); g.lineTo(256,128); g.moveTo(128,0); g.lineTo(128,256); g.stroke();
  return makeTex(cv,rx,ry);
}
function epoxyTex(base, rx, ry){
  var cv=noiseCanvas(base,'255,255,255',0.05,500);
  var g=cv.getContext('2d');
  for(var i=0;i<240;i++){ g.fillStyle='rgba(90,104,92,'+(Math.random()*0.045).toFixed(3)+')';
    g.fillRect(Math.random()*256,Math.random()*256,1.4,1.4); }
  return makeTex(cv,rx,ry);
}
function tileTex(rx,ry){
  var cv=noiseCanvas('#b5bdbd','120,128,128',0.06,400);
  var g=cv.getContext('2d');
  g.strokeStyle='rgba(96,106,104,.5)'; g.lineWidth=2;
  for(var i=0;i<=2;i++){ g.beginPath(); g.moveTo(0,i*128); g.lineTo(256,i*128); g.stroke();
    g.beginPath(); g.moveTo(i*128,0); g.lineTo(i*128,256); g.stroke(); }
  return makeTex(cv,rx,ry);
}
function hazardTex(rx,ry){
  var cv=document.createElement('canvas'); cv.width=128; cv.height=128;
  var g=cv.getContext('2d'); g.fillStyle='#e5b93c'; g.fillRect(0,0,128,128);
  g.fillStyle='#26261f';
  for(var i=-4;i<8;i++){ g.beginPath();
    g.moveTo(i*32,128); g.lineTo(i*32+64,-0); g.lineTo(i*32+80,0); g.lineTo(i*32+16,128); g.closePath(); g.fill(); }
  return makeTex(cv,rx,ry);
}
function textPlate(text, fg, bg, w, h, fs){
  var cv=document.createElement('canvas'); cv.width=w; cv.height=h;
  var g=cv.getContext('2d'); g.fillStyle=bg; g.fillRect(0,0,w,h);
  g.fillStyle=fg; g.font='700 '+fs+'px -apple-system, "Segoe UI", "Noto Sans Thai", Thonburi, sans-serif';
  g.textAlign='center'; g.textBaseline='middle'; g.fillText(text, w/2, h/2+1);
  var t=new THREE.CanvasTexture(cv); t.encoding=THREE.sRGBEncoding; return t;
}

// ---------- materials ----------
var MAT = {
  wall     : new THREE.MeshStandardMaterial({color:0xe8e5db, roughness:.86, metalness:0}),
  wallExt  : new THREE.MeshStandardMaterial({color:0xd9d5c6, roughness:.9,  metalness:0}),
  base     : new THREE.MeshStandardMaterial({color:0x9aa79c, roughness:.8,  metalness:.05}),
  colHall  : new THREE.MeshStandardMaterial({color:0xb9bcb4, roughness:.72, metalness:.06}),
  slab     : new THREE.MeshStandardMaterial({color:0xa5a39a, roughness:.95}),
  concrete : new THREE.MeshStandardMaterial({map:epoxyTex('#c2c4ba',5,2.6), roughness:.3, metalness:.05}),
  epoxy    : new THREE.MeshStandardMaterial({map:epoxyTex('#c8d1c5',4,2), roughness:.28, metalness:.06}),
  epoxyHall: new THREE.MeshStandardMaterial({map:epoxyTex('#b9c7ba',6,1.4), roughness:.2, metalness:.08}),
  vinyl    : new THREE.MeshStandardMaterial({map:epoxyTex('#c3d0d8',3,3), roughness:.28, metalness:.05}),
  vinyl2   : new THREE.MeshStandardMaterial({map:epoxyTex('#b8c7d1',3,3), roughness:.28, metalness:.05}),
  tile     : new THREE.MeshStandardMaterial({map:epoxyTex('#b4bdba',4,4), roughness:.26, metalness:.05}),
  epoxyYellow: new THREE.MeshStandardMaterial({map:epoxyTex('#cfc38e',4,3), roughness:.3, metalness:.05}),
  epoxyBlue  : new THREE.MeshStandardMaterial({map:epoxyTex('#a7c2d6',4,3), roughness:.3, metalness:.05}),
  epoxyBlueHall: new THREE.MeshStandardMaterial({map:epoxyTex('#96b5cc',5,2), roughness:.2, metalness:.08}),
  epoxyTeal  : new THREE.MeshStandardMaterial({map:epoxyTex('#9cc7be',4,3), roughness:.3, metalness:.05}),
  ss       : new THREE.MeshStandardMaterial({color:0xd8dcdf, roughness:.28, metalness:.85, envMap:envCube}),
  ssDull   : new THREE.MeshStandardMaterial({color:0xc2c8cc, roughness:.45, metalness:.7, envMap:envCube}),
  steelBlue: new THREE.MeshStandardMaterial({color:0x39628f, roughness:.5, metalness:.35}),
  steelGray: new THREE.MeshStandardMaterial({color:0x8b95a0, roughness:.6, metalness:.3}),
  rackOr   : new THREE.MeshStandardMaterial({color:0xd07f2e, roughness:.55, metalness:.25}),
  rackBeam : new THREE.MeshStandardMaterial({color:0x3a5a80, roughness:.5, metalness:.3}),
  wood     : new THREE.MeshStandardMaterial({color:0xb08b56, roughness:.85}),
  woodDark : new THREE.MeshStandardMaterial({color:0x8d6b3f, roughness:.85}),
  card     : new THREE.MeshStandardMaterial({color:0xc49c68, roughness:.9}),
  card2    : new THREE.MeshStandardMaterial({color:0xb28a58, roughness:.9}),
  sack     : new THREE.MeshStandardMaterial({color:0xb59f74, roughness:.95}),
  white    : new THREE.MeshStandardMaterial({color:0xf4f5f2, roughness:.6}),
  whiteTop : new THREE.MeshStandardMaterial({color:0xfbfbf8, roughness:.35}),
  plasticBl: new THREE.MeshStandardMaterial({color:0x4a7ba6, roughness:.55}),
  plasticGn: new THREE.MeshStandardMaterial({color:0x4d8a63, roughness:.55}),
  red      : new THREE.MeshStandardMaterial({color:0xc0392b, roughness:.5}),
  redCage  : new THREE.MeshStandardMaterial({color:0xb8433a, roughness:.55, metalness:.3}),
  mesh     : new THREE.MeshStandardMaterial({color:0x9aa3a8, roughness:.6, metalness:.4, transparent:true, opacity:.28, side:THREE.DoubleSide}),
  glass    : new THREE.MeshStandardMaterial({color:0xcfe7e2, roughness:.06, metalness:.1, transparent:true, opacity:.32, envMap:envCube, side:THREE.DoubleSide}),
  frame    : new THREE.MeshStandardMaterial({color:0x7f8a8b, roughness:.5, metalness:.5}),
  doorBlue : new THREE.MeshStandardMaterial({color:0xa8bfd2, roughness:.5, metalness:.12}),
  doorSS   : new THREE.MeshStandardMaterial({color:0xcdd4d8, roughness:.35, metalness:.7, envMap:envCube}),
  screen   : new THREE.MeshStandardMaterial({color:0x14212b, roughness:.25, metalness:.2, emissive:0x1c3a4d, emissiveIntensity:.7}),
  lamp     : new THREE.MeshStandardMaterial({color:0xffffff, emissive:0xfff6e2, emissiveIntensity:1.6}),
  lampCase : new THREE.MeshStandardMaterial({color:0xdfe3e2, roughness:.5, metalness:.4}),
  exit     : new THREE.MeshStandardMaterial({map:textPlate('EXIT →','#eafff2','#1f7a4c',128,48,26), emissive:0x2fae6f, emissiveIntensity:.8}),
  yellowPnt: new THREE.MeshStandardMaterial({color:0xe0b53c, roughness:.5}),
  greenPnt : new THREE.MeshStandardMaterial({color:0x3f9464, roughness:.5}),
  redPnt   : new THREE.MeshStandardMaterial({color:0xc45247, roughness:.5}),
  bluePnt  : new THREE.MeshStandardMaterial({color:0x5a7fa8, roughness:.5}),
  hazard   : new THREE.MeshStandardMaterial({map:hazardTex(1,1), roughness:.6}),
  asphalt  : new THREE.MeshStandardMaterial({map:concreteTex(10,7), color:0xc4c2ba, roughness:.9}),
  grass    : new THREE.MeshStandardMaterial({color:0x6f9158, roughness:1}),
  foliage  : new THREE.MeshStandardMaterial({color:0x5f7f4c, roughness:.95}),
  foliage2 : new THREE.MeshStandardMaterial({color:0x729256, roughness:.95}),
  trunk    : new THREE.MeshStandardMaterial({color:0x6e5a41, roughness:.95}),
  amber    : new THREE.MeshStandardMaterial({color:0xc98a35, roughness:.25, metalness:.1, transparent:true, opacity:.85}),
  drumBlue : new THREE.MeshStandardMaterial({color:0x2f5d8a, roughness:.4, metalness:.2}),
  drumWhite: new THREE.MeshStandardMaterial({color:0xe8e9e4, roughness:.45}),
  binGray  : new THREE.MeshStandardMaterial({color:0xc8cdd1, roughness:.6}),
  curtain  : new THREE.MeshStandardMaterial({color:0xbfd8e2, roughness:.3, transparent:true, opacity:.45, side:THREE.DoubleSide}),
  shadowGr : new THREE.MeshStandardMaterial({color:0xaeb4a6, roughness:1})
};

// shared geometries
var GEO = {
  box: new THREE.BoxGeometry(1,1,1),
  cyl: new THREE.CylinderGeometry(.5,.5,1,20),
  cyl8: new THREE.CylinderGeometry(.5,.5,1,8),
  sph: new THREE.SphereGeometry(.5,14,10)
};

MAT.ss.envMapIntensity=.75; MAT.ssDull.envMapIntensity=.6;
MAT.doorSS.envMapIntensity=.45; MAT.glass.envMapIntensity=.9;

var world = new THREE.Group(); scene.add(world);
var colliders = [];   // {x0,z0,x1,z1} world-space AABBs for FP collision
var DOORS = [];       // animated swing-door leaves
var floorMeshes = []; // raycast targets carrying roomId
var mapWalls = [];    // plan-space wall segments for the minimap

function solid(px0,py0,px1,py1){ // plan coords -> collision rect
  var x0=WX(Math.min(px0,px1)), x1=WX(Math.max(px0,px1));
  var z0=WZ(Math.max(py0,py1)), z1=WZ(Math.min(py0,py1));
  colliders.push({x0:x0,z0:z0,x1:x1,z1:z1});
}
function box(w,h,d,mat,cast,recv){
  var m=new THREE.Mesh(GEO.box,mat); m.scale.set(w,h,d);
  m.castShadow = cast!==false; m.receiveShadow = recv!==false; return m;
}
function at(m, px, py, y){ m.position.set(WX(px), y||0, WZ(py)); world.add(m); return m; }

// ============================================================
// LAYOUT DATA  (plan coords, meters)
// ============================================================
var ROOMS = [
 // ---- middle band: airlocks + production line corridor (y 4.8-7.2)
 {id:'alin', no:3, th:'A/L ทางเข้าวัตถุดิบ', en:'Airlock · Material Entry', x0:0,y0:4.8,x1:2.0,y1:7.2, floor:'epoxyYellow', grp:'store',
  desc:'วัตถุดิบเข้าจากประตูฝั่งตะวันตก ผ่านแอร์ล็อกชั้นที่ 1 ก่อนเข้าสู่ไลน์ผลิต'},
 {id:'alin2', th:'A/L ชั้นที่ 2', en:'Airlock · Stage 2', x0:2.0,y0:4.8,x1:3.2,y1:7.2, floor:'epoxyYellow', grp:'store',
  desc:'แอร์ล็อกชั้นที่สองของทางเข้าวัตถุดิบ ประตูเปิดทีละบานกันการปนเปื้อนเข้าไลน์ผลิต'},
 {id:'hall', th:'ไลน์ผลิต (โถงกลาง)', en:'Production Line Corridor', x0:3.2,y0:4.8,x1:21.6,y1:7.2, floor:'epoxyHall', grp:'prod',
  desc:'โถงไลน์ผลิตกว้าง 2.4 ม. พาดกลางอาคาร ทุกห้องเปิดเข้าหาโถงนี้ ปลายทางทิศตะวันออกผ่าน A/L สู่คลังสำเร็จรูป'},
 {id:'alE', th:'A/L ออกคลังสำเร็จรูป', en:'Airlock · To FG Store', x0:21.6,y0:4.8,x1:22.6,y1:7.2, floor:'epoxyBlue', grp:'prod',
  desc:'แอร์ล็อกท้ายไลน์ผลิต คั่นโซนผลิตกับโถงคลังสำเร็จรูปฝั่งตะวันออก'},
 {id:'hallE', th:'โถงคลัง / จ่ายสินค้า', en:'FG Corridor · Dispatch', x0:22.6,y0:4.8,x1:28,y1:7.2, floor:'epoxyBlueHall', grp:'store',
  desc:'โถงฝั่งคลังสำเร็จรูป มีประตูจ่ายสินค้าออกทางทิศตะวันออก — คนละฝั่งกับทางเข้าวัตถุดิบ'},
 // ---- north row (y 7.2-12, west -> east)
 {id:'ro', th:'ห้องระบบน้ำ RO', en:'RO Water Plant', x0:0,y0:7.2,x1:2.2,y1:12, floor:'epoxy', grp:'util',
  desc:'ระบบผลิตน้ำ RO สำหรับใช้ทั้งโรงงาน — ถังพักน้ำ เมมเบรน RO และปั๊มจ่าย อยู่นอกไลน์ผลิต มีประตูเข้าจากภายนอกฝั่งตะวันตก แต่อยู่ในตัวอาคารเดียวกัน'},
 {id:'rm', no:1, th:'ห้องเก็บวัตถุดิบ', en:'Raw Material Store', x0:2.2,y0:7.2,x1:6.6,y1:12, floor:'epoxyYellow', grp:'store',
  desc:'คลังวัตถุดิบสมุนไพร ชั้นวางพาเลท กระสอบ และถังวัตถุดิบ พร้อมโซนกักกันรอผลตรวจ (เส้นเหลือง)'},
 {id:'sample', th:'ห้องสุ่ม (ตัวอย่าง)', en:'Sampling Room', x0:6.6,y0:7.2,x1:8.9,y1:12, floor:'vinyl', grp:'support',
  desc:'ห้องสุ่มตัวอย่างวัตถุดิบในบูธ ลดการฟุ้งกระจาย ก่อนตัดสินปล่อยผ่านเข้าใช้งาน'},
 {id:'washN', no:7, th:'ห้องล้าง', en:'Washing Room', x0:8.9,y0:7.2,x1:11.2,y1:12, floor:'tile', grp:'support',
  desc:'ล้างเครื่องมือและภาชนะ ซิงก์คู่สแตนเลส พร้อมโต๊ะพักน้ำหยดและรางระบายน้ำ'},
 {id:'oven', th:'ห้องอบ', en:'Drying Room', x0:11.2,y0:7.2,x1:13.5,y1:12, floor:'epoxy', grp:'support',
  desc:'ตู้อบลมร้อนสำหรับอบแห้งเครื่องมือ/ภาชนะหลังล้าง ก่อนส่งเก็บห้องอุปกรณ์สะอาด'},
 {id:'cleanstore', th:'ห้องเก็บอุปกรณ์ (สะอาด)', en:'Clean Equipment Store', x0:13.5,y0:7.2,x1:15.8,y1:12, floor:'vinyl', grp:'support',
  desc:'เก็บอุปกรณ์เครื่องมือที่ทำความสะอาดและอบแห้งแล้ว บนชั้นสแตนเลส คว่ำภาชนะกันฝุ่น'},
 {id:'liqAL', th:'A/L สายยาน้ำ (สองทาง)', en:'Airlock · Liquid Suite', x0:17.4,y0:7.2,x1:18.6,y1:8.4, floor:'epoxyTeal', grp:'prod',
  desc:'แอร์ล็อกร่วมของสายยาน้ำ — จากไลน์ผลิตเข้าได้สองทาง: ห้องบรรจุยาน้ำ และห้องผสมยาน้ำ ป้องกันการปนเปื้อนเข้าจุดสัมผัสยา'},
 {id:'liqfill', th:'ห้องบรรจุยาน้ำ', en:'Liquid Filling Room', x0:15.8,y0:7.2,x1:18.6,y1:12, floor:'epoxyTeal', grp:'prod',
  desc:'บรรจุยาน้ำลงขวด — เข้าห้องได้ผ่านแอร์ล็อกของตัวเองเท่านั้น มีถังพักยาและสายบรรจุ'},
 {id:'liqmix', th:'ห้องผสมยาน้ำ', en:'Liquid Mixing Room', x0:18.6,y0:7.2,x1:21.6,y1:12, floor:'epoxyTeal', grp:'prod',
  desc:'ถังผสม/เตรียมยาน้ำ พร้อมแผงควบคุม — ไม่มีประตูออกไลน์โดยตรง เข้าออกผ่านแอร์ล็อกร่วมของสายยาน้ำเท่านั้น'},
 {id:'pkmat', th:'ห้องเก็บวัสดุบรรจุ', en:'Packaging Materials Store', x0:21.6,y0:7.2,x1:24.0,y1:10.3, floor:'epoxyBlue', grp:'store',
  desc:'เก็บขวด ฝา กล่อง และวัสดุการบรรจุ แยกจากวัตถุดิบ เบิกเข้าไลน์ผลิตได้โดยตรง — มีห้องเก็บฉลากบรรจุภัณฑ์เป็นห้องลูกอยู่ด้านใน'},
 {id:'stab', no:8, th:'ห้องเก็บ Stability', en:'Stability Samples', x0:24.0,y0:7.2,x1:26.1,y1:12, floor:'epoxyBlue', grp:'support',
  desc:'เก็บตัวอย่างศึกษาความคงสภาพและตัวอย่างอ้างอิงแต่ละรุ่นผลิต ควบคุมสภาวะ'},
 {id:'chgN', th:'ห้องเปลี่ยนชุด (บน)', en:'Change Room · North', x0:26.1,y0:7.2,x1:28,y1:12, floor:'epoxyBlue', grp:'support',
  desc:'ห้องเปลี่ยนชุดฝั่งคลังจ่ายสินค้า — พนักงานเบิกสินค้าเข้าจากประตูจ่ายสินค้า เปลี่ยนชุดที่นี่ก่อนเข้าทำงานในโซนฟ้า (คลังสำเร็จรูป)'},
 // ---- south row (y 0-4.8, west -> east)
 {id:'staff', th:'ทางเข้าพนักงาน / ห้องส้วม', en:'Staff Entry · Toilet', x0:0,y0:0,x1:2.6,y1:4.8, floor:'vinyl2', grp:'support',
  desc:'พนักงานเข้าประตูฝั่งตะวันตก มีห้องส้วมและอ่างล้างมือ ก่อนเข้าห้องเปลี่ยนชุด'},
 {id:'chgS', no:2, th:'ห้องเปลี่ยนชุด', en:'Gowning Room', x0:2.6,y0:0,x1:5.4,y1:4.8, floor:'vinyl2', grp:'support',
  desc:'เปลี่ยนชุด ล้างมือ ก้าวข้ามม้านั่งแบ่งฝั่งสะอาด แล้วจึงเข้าสู่ไลน์ผลิต'},
 {id:'weigh', no:4, th:'ห้องชั่ง', en:'Weighing / Dispensing', x0:5.4,y0:0,x1:8.2,y1:4.8, floor:'epoxy', grp:'prod',
  desc:'ชั่งแบ่งวัตถุดิบตามสูตรในตู้ชั่งครอบ พร้อมเครื่องชั่งพื้นและภาชนะรอจ่าย'},
 {id:'mixer', no:5, th:'ห้องผสม (Mixer)', en:'Mixing Room', x0:8.2,y0:0,x1:11.0,y1:4.8, floor:'epoxy', grp:'prod',
  desc:'เครื่องผสมผงยา (Mixer) เตรียม bulk สำหรับสายบรรจุแคปซูล/แผง/ขวด'},
 {id:'capsule', no:6, th:'ห้องบรรจุแคปซูล', en:'Capsule Filling', x0:11.0,y0:0,x1:13.8,y1:4.8, floor:'epoxy', grp:'prod',
  desc:'เครื่องบรรจุแคปซูลและสายลำเลียง รับ bulk จากห้องผสม ส่งต่อห้องขัดเม็ดยาผ่านไลน์ผลิต'},
 {id:'ipc', th:'ห้อง IPC', en:'In-process Control', x0:13.8,y0:0,x1:16.0,y1:4.8, floor:'vinyl', grp:'support',
  desc:'ตรวจสอบระหว่างผลิต — ชั่งสอบน้ำหนัก เช็กสเปกทุกช่วงการรันของทุกสาย'},
 {id:'blister', th:'ห้องขัดเม็ดยา', en:'Tablet Polishing', x0:16.0,y0:0,x1:18.6,y1:4.8, floor:'epoxy', grp:'prod',
  desc:'เครื่องขัดเม็ดยา (deduster/polisher) ขัดผิว คัดฝุ่น และคัดแยกเม็ดก่อนส่งเข้าสายบรรจุ พร้อมโต๊ะตรวจคุณภาพเม็ด'},
 {id:'bottlefill', th:'ห้องบรรจุใส่ขวด / กระปุก', en:'Bottle / Jar Filling', x0:18.6,y0:0,x1:21.5,y1:4.8, floor:'epoxy', grp:'prod',
  desc:'สายบรรจุแคปซูล/เม็ดลงขวด-กระปุก พร้อมเครื่องปิดฝาและสายลำเลียง'},
 {id:'labelroom', th:'ห้องติดฉลาก', en:'Labelling Room', x0:21.5,y0:0,x1:24.0,y1:4.8, floor:'epoxyBlue', grp:'prod',
  desc:'อยู่ฝั่งโถงคลัง (หลัง A/L ท้ายไลน์) — ติดฉลาก ตรวจนับ บรรจุกล่อง แล้วส่งเข้าคลังสำเร็จรูป'},
 {id:'fg', th:'ห้องเก็บผลิตภัณฑ์สำเร็จรูป', en:'Finished Goods Store', x0:24.0,y0:0,x1:28,y1:4.8, floor:'epoxyBlue', grp:'store',
  desc:'คลังสำเร็จรูปฝั่งตะวันออก รับสินค้าผ่าน A/L ท้ายไลน์ — คนละฝั่งกับทางเข้าวัตถุดิบ จ่ายออกประตูตะวันออก'},
 {id:'lblstore', th:'ห้องเก็บฉลากบรรจุภัณฑ์', en:'Label Store', x0:21.6,y0:10.3,x1:24.0,y1:12, floor:'epoxyBlue', grp:'store',
  desc:'ห้องล็อกเก็บฉลากและบรรจุภัณฑ์พิมพ์ อยู่ติดกับห้องเก็บวัสดุบรรจุ (เข้าออกผ่านกันได้) ควบคุมการเบิกจ่ายกันปะปนข้ามรุ่น'}
];

var ZONES = [
 {id:'zquar', th:'กักกันวัตถุดิบ (รอผล QC)', en:'RM Quarantine', x0:2.35,y0:7.35,x1:4.2,y1:8.9, paint:'yellowPnt', grp:'store',
  desc:'วัตถุดิบรับเข้าติดสถานะกักกัน (เส้นเหลือง) รอผลตรวจปล่อยผ่านก่อนย้ายขึ้นชั้นจัดเก็บ'},
 {id:'zfgq', th:'กักกันสำเร็จรูป', en:'FG Quarantine', x0:24.1,y0:2.5,x1:25.3,y1:4.65, paint:'yellowPnt', grp:'store',
  desc:'สินค้าบรรจุเสร็จรอผล QC ก่อนปล่อยผ่านเพื่อจ่ายออก'}
];
function findRoom(id){ for(var i=0;i<ROOMS.length;i++) if(ROOMS[i].id===id) return ROOMS[i];
  for(var j=0;j<ZONES.length;j++) if(ZONES[j].id===id) return ZONES[j]; return null; }

// ============================================================
// FLOORS
// ============================================================
(function(){
  // ground slab under everything
  var slab = box(PLAN_W+0.5, .22, PLAN_D+0.5, MAT.slab, false, true); slab.position.y=-0.11; world.add(slab);
  var lift = {rm:0, fg:0, pkmat:0, hall:.004, hallE:.004, alin:.012, alin2:.012, alE:.012, liqAL:.016, ro:.012,
              sample:.012, cleanstore:.012, stab:.012, ipc:.012, staff:.012, chgN:.012, chgS:.012, lblstore:.012,
              washN:.012, weigh:.008, mixer:.008, capsule:.008, blister:.008, bottlefill:.008, labelroom:.008,
              oven:.008, liqfill:.008, liqmix:.008};
  ROOMS.forEach(function(r){
    var w=r.x1-r.x0, d=r.y1-r.y0;
    var f=new THREE.Mesh(new THREE.BoxGeometry(w, .02, d), MAT[r.floor]);
    f.position.set(WX((r.x0+r.x1)/2), 0.01+(lift[r.id]||0), WZ((r.y0+r.y1)/2));
    f.receiveShadow=true; f.userData.roomId=r.id; world.add(f); floorMeshes.push(f);
  });
})();

// ============================================================
// WALLS  (with door / window gaps)  gap:{c,w,type:'door'|'double'|'window'|'open', swing}
// ============================================================
var DOOR_H=2.08, SILL=0.9, WINTOP=2.2;
function wallRun(x0,y0,x1,y1,opt){
  opt=opt||{};
  var t=opt.t||0.12, mat=opt.mat||MAT.wall, H=opt.h||WALL_H;
  var horiz=(y0===y1), L=horiz?Math.abs(x1-x0):Math.abs(y1-y0);
  var sx=horiz?Math.min(x0,x1):x0, sy=horiz?y0:Math.min(y0,y1);
  var gaps=(opt.gaps||[]).slice().sort(function(a,b){return a.c-b.c;});
  var cur=0;
  function seg(a,b,y,h,isSolid){ // a..b along run, y=bottom, h=height
    if(b-a<0.012) return;
    var len=b-a, cx=sx+(horiz?(a+len/2):0), cy=sy+(horiz?0:(a+len/2));
    var m=box(horiz?len:t, h, horiz?t:len, mat);
    m.position.set(WX(horiz?cx:x0), y+h/2, WZ(horiz?y0:cy));
    world.add(m);
    if(isSolid && y===0){
      if(horiz) solid(sx+a, y0-t/2, sx+b, y0+t/2); else solid(x0-t/2, sy+a, x0+t/2, sy+b);
      if(horiz) mapWalls.push([sx+a,y0,sx+b,y0]); else mapWalls.push([x0,sy+a,x0,sy+b]);
      // baseboard
      if(!opt.noBase && h>1){
        var bb=box((horiz?len:t)+ (horiz?0:0.024), .09, (horiz?t:len)+(horiz?0.024:0), MAT.base, false, true);
        bb.position.set(WX(horiz?cx:x0), .045, WZ(horiz?y0:cy)); world.add(bb);
      }
    }
  }
  gaps.forEach(function(gp){
    var a=gp.c-gp.w/2-(horiz?sx:sy)+ (horiz? sx-sx : 0); // local coord
    var loc=gp.c-(horiz?sx:sy);
    seg(cur, loc-gp.w/2, 0, H, true);
    if(gp.type==='window'){
      seg(loc-gp.w/2, loc+gp.w/2, 0, SILL, false);
      seg(loc-gp.w/2, loc+gp.w/2, WINTOP, H-WINTOP, false);
      // glass + frame
      var gl=new THREE.Mesh(GEO.box, MAT.glass);
      gl.scale.set(horiz?gp.w:.035, WINTOP-SILL, horiz?.035:gp.w);
      gl.position.set(WX(horiz?gp.c:x0), SILL+(WINTOP-SILL)/2, WZ(horiz?y0:gp.c)); world.add(gl);
      var fr=box(horiz?gp.w+.06:t+.02, .05, horiz?t+.02:gp.w+.06, MAT.frame, false);
      fr.position.set(WX(horiz?gp.c:x0), SILL, WZ(horiz?y0:gp.c)); world.add(fr);
      var fr2=fr.clone(); fr2.position.y=WINTOP; world.add(fr2);
      if(horiz) solid(gp.c-gp.w/2, y0-t/2, gp.c+gp.w/2, y0+t/2); else solid(x0-t/2, gp.c-gp.w/2, x0+t/2, gp.c+gp.w/2);
      if(horiz) mapWalls.push([gp.c-gp.w/2,y0,gp.c+gp.w/2,y0]); else mapWalls.push([x0,gp.c-gp.w/2,x0,gp.c+gp.w/2]);
    } else if(gp.type!=='open'){
      var dh=gp.h||DOOR_H;
      seg(loc-gp.w/2, loc+gp.w/2, dh, H-dh, false);           // header
      addDoor(horiz, x0,y0, gp, t, dh);
    }
    cur=loc+gp.w/2;
  });
  seg(cur, L, 0, H, true);
}
function addDoor(horiz, wx0, wy0, gp, t, dh){
  var mat = gp.ss?MAT.doorSS:MAT.doorBlue;
  var jamb=MAT.frame;
  function leaf(hingeC, w, dir, side){
    // double-action swing leaf: closed at rest, animated open when approached (fp)
    var g=new THREE.Group();
    var lf=box(w-.04, dh-.06, .05, mat);
    lf.position.set(dir*(w/2), (dh-.06)/2+.02, 0);
    g.add(lf);
    if(w>=.8){ // cleanroom vision panel
      var vf=box(.34,.54,.052, MAT.frame, false); vf.position.set(dir*(w/2),1.5,0); g.add(vf);
      var vg=box(.28,.48,.062, MAT.glass, false, false); vg.position.set(dir*(w/2),1.5,0); g.add(vg);
    }
    var kick=box(w-.12,.3,.058, MAT.doorSS, false); kick.position.set(dir*(w/2),.19,0); g.add(kick); // kick plate
    var px = horiz? hingeC : wx0, py = horiz? wy0 : hingeC;
    g.position.set(WX(px), 0, WZ(py));
    var base = horiz?0:Math.PI/2;
    g.rotation.y = base;
    DOORS.push({g:g, base:base, delta:side*dir*88*DEG,
                cx:WX(horiz?gp.c:wx0), cz:WZ(horiz?wy0:gp.c), cur:0});
    world.add(g);
  }
  var side = gp.swing||1;
  if(gp.type==='double'){
    leaf(gp.c-gp.w/2, gp.w/2, 1, side);
    leaf(gp.c+gp.w/2, gp.w/2, -1, side);
  } else {
    leaf(gp.c-gp.w/2, gp.w, 1, side);
  }
  // jambs
  var jw=.06;
  var j1=box(horiz?jw:t+.03, dh+.04, horiz?t+.03:jw, jamb, false);
  var p1=horiz?{x:gp.c-gp.w/2,y:wy0}:{x:wx0,y:gp.c-gp.w/2};
  j1.position.set(WX(p1.x),(dh+.04)/2,WZ(p1.y)); world.add(j1);
  var j2=j1.clone();
  var p2=horiz?{x:gp.c+gp.w/2,y:wy0}:{x:wx0,y:gp.c+gp.w/2};
  j2.position.set(WX(p2.x),(dh+.04)/2,WZ(p2.y)); world.add(j2);
}

// ---- exterior walls
wallRun(0,12,28,12,{t:.22, mat:MAT.wallExt});
wallRun(0,0,28,0,  {t:.22, mat:MAT.wallExt});
wallRun(0,0,0,12,  {t:.22, mat:MAT.wallExt, gaps:[
  {c:6.0,w:2.0,type:'double',ss:true,swing:-1,openDeg:85}, // material entry (into A/L)
  {c:2.4,w:.95,type:'door',swing:-1},                       // staff entry
  {c:9.0,w:.95,type:'door',swing:-1}]});                    // RO plant room (outside the line)
wallRun(28,0,28,12,{t:.22, mat:MAT.wallExt, gaps:[{c:6.0,w:1.6,type:'double',ss:true,swing:1,openDeg:80}]}); // FG dispatch

// ---- middle band: entry airlocks + line + exit airlock (y 4.8-7.2)
wallRun(2.0,4.8,2.0,7.2, {gaps:[{c:6.0,w:1.5,type:'double',ss:true,swing:-1,openDeg:70}]}); // A/L1 -> A/L2
wallRun(3.2,4.8,3.2,7.2, {gaps:[{c:6.0,w:1.5,type:'double',ss:true,swing:1,openDeg:70}]});  // A/L2 -> line
wallRun(21.6,4.8,21.6,7.2,{gaps:[{c:6.0,w:1.4,type:'double',ss:true,swing:-1,openDeg:70}]}); // line -> A/L (west line of pkmat/labelling)
wallRun(22.6,4.8,22.6,7.2,{gaps:[{c:6.0,w:1.4,type:'double',ss:true,swing:1,openDeg:70}]});  // A/L -> FG corridor

// ---- north row dividers (y 7.2-12)
wallRun(2.2,7.2,2.2,12,{});   // RO | raw material store
wallRun(6.6,7.2,6.6,12,{});
wallRun(8.9,7.2,8.9,12,{});
wallRun(11.2,7.2,11.2,12,{});
wallRun(13.5,7.2,13.5,12,{});
wallRun(15.8,7.2,15.8,12,{});
wallRun(18.6,7.2,18.6,12,{gaps:[{c:7.8,w:.9,type:'door',swing:-1}]}); // A/L -> liquid mixing
wallRun(21.6,7.2,21.6,12,{});
wallRun(24.0,7.2,24.0,12,{});
wallRun(26.1,7.2,26.1,12,{});
wallRun(21.6,10.3,24,10.3,{gaps:[{c:22.3,w:.9,type:'door',swing:1}]}); // label store inside pkmat
// liquid-line airlock: shared vestibule (corridor <-> filling <-> mixing)
wallRun(17.4,7.2,17.4,8.4,{});
wallRun(17.4,8.4,18.6,8.4,{gaps:[{c:18.0,w:.9,type:'door',swing:1}]});
// y=7.2 run — north rooms onto the line
wallRun(0,7.2,28,7.2,{gaps:[
  {c:4.4,w:1.4,type:'door',swing:-1},        // raw material store (wide: 4 flow lanes)
  {c:7.75,w:.95,type:'door',swing:-1},       // sampling
  {c:10.05,w:.95,type:'door',swing:-1},      // washing
  {c:12.35,w:.95,type:'door',swing:-1},      // drying
  {c:14.65,w:.95,type:'door',swing:-1},      // clean equipment
  {c:18.0,w:.9,type:'door',swing:-1},        // liquid A/L (outer)
  {c:20.9,w:.7,type:'window'},
  {c:23.3,w:.9,type:'door',swing:-1},        // packaging materials (FG-corridor side)
  {c:25.05,w:.9,type:'door',swing:-1},       // stability
  {c:27.0,w:.9,type:'door',swing:-1}]});     // change room north
// y=4.8 run — south rooms onto the line
wallRun(0,4.8,28,4.8,{gaps:[
  {c:4.65,w:1.0,type:'door',swing:-1},       // gowning (clear of grid column)
  {c:6.8,w:1.0,type:'door',swing:-1},        // weighing
  {c:9.6,w:1.0,type:'door',swing:1},         // mixer (swings into corridor)
  {c:12.4,w:1.0,type:'door',swing:-1},       // capsule filling
  {c:14.9,w:.9,type:'door',swing:-1},        // IPC
  {c:17.3,w:1.0,type:'door',swing:-1},       // blister
  {c:19.3,w:1.0,type:'door',swing:1},        // bottle filling (swings into corridor)
  {c:23.2,w:.95,type:'door',swing:-1},       // labelling (FG-corridor side)
  {c:26.0,w:1.1,type:'door',swing:1}]});     // FG store (from FG corridor)
// ---- south row dividers (y 0-4.8)
wallRun(2.6,0,2.6,4.8, {gaps:[{c:2.4,w:.9,type:'door',swing:1}]});  // staff -> gowning
wallRun(5.4,0,5.4,4.8,{});
wallRun(8.2,0,8.2,4.8,{});
wallRun(11.0,0,11.0,4.8,{});
wallRun(13.8,0,13.8,4.8,{});
wallRun(16.0,0,16.0,4.8,{});
wallRun(18.6,0,18.6,4.8,{});
wallRun(21.5,0,21.5,4.8,{});
wallRun(24.0,0,24.0,4.8,{});

// ---- columns on the 4 m grid
(function(){
  var xs=[0,4,8,12,16,20,24,28], ys=[0,4.8,7.2,12];
  xs.forEach(function(x){ ys.forEach(function(y){
    var c=box(.32, WALL_H+.15, .32, MAT.colHall);
    c.position.set(WX(clamp(x,0.16,PLAN_W-0.16)), (WALL_H+.15)/2, WZ(clamp(y,0.16,PLAN_D-0.16)));
    world.add(c);
    solid(clamp(x,0.16,PLAN_W-0.16)-.16, clamp(y,0.16,PLAN_D-0.16)-.16, clamp(x,0.16,PLAN_W-0.16)+.16, clamp(y,0.16,PLAN_D-0.16)+.16);
  });});
})();

// ---- painted floor markings (instanced dashes)
var paintPools = {};
function dashPool(matName){
  if(!paintPools[matName]) paintPools[matName]={mats:[], list:[]};
  return paintPools[matName];
}
function dashedRect(x0,y0,x1,y1,matName,yy){
  var pool=dashPool(matName), dl=.34, gapl=.22, t=.055;
  function edge(ax,ay,bx,by){
    var len=Math.hypot(bx-ax,by-ay), n=Math.max(1,Math.floor(len/(dl+gapl)));
    var ux=(bx-ax)/len, uy=(by-ay)/len;
    for(var i=0;i<n;i++){
      var s=i*(len/n), cx=ax+ux*(s+dl/2), cy=ay+uy*(s+dl/2);
      pool.list.push({x:WX(cx), z:WZ(cy), y:yy||.028, l:dl, t:t, rot:(Math.abs(ux)>.5?0:Math.PI/2)});
    }
  }
  edge(x0,y0,x1,y0); edge(x1,y0,x1,y1); edge(x1,y1,x0,y1); edge(x0,y1,x0,y0);
}
var DASH_Y={};
ZONES.forEach(function(z){ dashedRect(z.x0,z.y0,z.x1,z.y1, z.paint||'yellowPnt', DASH_Y[z.id]); });
function buildDashes(){
  for(var k in paintPools){
    var pool=paintPools[k]; if(!pool.list.length) continue;
    var im=new THREE.InstancedMesh(GEO.box, MAT[k], pool.list.length);
    var m4=new THREE.Matrix4(), q=new THREE.Quaternion(), e=new THREE.Euler(), s=new THREE.Vector3(), p=new THREE.Vector3();
    pool.list.forEach(function(d,i){
      e.set(0,d.rot,0); q.setFromEuler(e);
      p.set(d.x, d.y, d.z); s.set(d.l, .006, d.t);
      m4.compose(p,q,s); im.setMatrixAt(i,m4);
    });
    im.receiveShadow=true; world.add(im);
  }
}
buildDashes();

// hall walkway edge lines (solid yellow)
(function(){
  [4.98, 7.02].forEach(function(y){
    var st=box(18.1,.006,.07, MAT.yellowPnt, false, true);
    st.position.set(WX(12.4), .03, WZ(y)); world.add(st);       // production line corridor
    var st2=box(5.1,.006,.07, MAT.yellowPnt, false, true);
    st2.position.set(WX(25.3), .03, WZ(y)); world.add(st2);     // FG corridor
  });
  // hazard strips at material entry + dispatch
  var hz=new THREE.Mesh(new THREE.BoxGeometry(1.1,.006,1.9), MAT.hazard);
  hz.position.set(WX(.75), .036, WZ(6)); hz.receiveShadow=true; world.add(hz);
  var hz2=new THREE.Mesh(new THREE.BoxGeometry(1.5,.006,.9), MAT.hazard);
  hz2.position.set(WX(27.2), .032, WZ(6)); hz2.rotation.y=Math.PI/2; hz2.receiveShadow=true; world.add(hz2);
})();
