import * as THREE from './vendor/three/three.module.min.js';
import { PRISM_HEIGHT,DOCKS,DOCK_OFFSETS,STATION,WORK_AREAS,SOURCES,DESTINATIONS,CYCLE_SECONDS,LOOP_SECONDS,PRINTED_PIECES,sampleRobotMotion,sampleRobotPlayback } from './robot-motion.js';
import { createCarvedBlock,createChips } from './robot-machining.js';
import { createPrintedBlock } from './robot-printing.js';

const ASSETS=new URL('./robot/',import.meta.url);
const palette=['#e3a04a','#81bac4','#6d9c97','#e3a04a','#81bac4','#6d9c97','#e3a04a','#81bac4','#6d9c97'];
const jointOffsets=[[0,0,0],[.33,0,.645],[0,0,1.35],[1.09,0,.115],[.33,0,0],[.24,0,0]];
const jointAxes=['z','y','y','x','y','x'];
const material=(color,roughness=.88)=>new THREE.MeshStandardMaterial({color,roughness,metalness:0});

function beveledPrism(radius,height,sides=6,bevel=.012){
  const shape=new THREE.Shape();
  radius-=bevel/Math.cos(Math.PI/sides);
  for(let i=0;i<sides;i++){
    const x=Math.cos(i/sides*Math.PI*2)*radius,y=Math.sin(i/sides*Math.PI*2)*radius;
    if(i)shape.lineTo(x,y);else shape.moveTo(x,y);
  }
  shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:height-2*bevel,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,steps:1,curveSegments:1});
  geometry.translate(0,0,-height/2+bevel);
  return geometry;
}
function beveledBox(x,y,z,bevel=.015){
  const shape=new THREE.Shape();
  shape.moveTo(-x/2+bevel,-y/2+bevel);shape.lineTo(x/2-bevel,-y/2+bevel);shape.lineTo(x/2-bevel,y/2-bevel);shape.lineTo(-x/2+bevel,y/2-bevel);shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:z-2*bevel,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,steps:1});
  geometry.translate(0,0,-z/2+bevel);
  return geometry;
}
function mesh(geometry,mat,parent,position=[0,0,0]){
  const object=new THREE.Mesh(geometry,mat);object.position.set(...position);object.castShadow=true;object.receiveShadow=true;parent.add(object);return object;
}

export async function createRobotScene(canvas){
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
  renderer.setClearColor(0xf8faf9,0);
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1;
  const scene=new THREE.Scene();
  const camera=new THREE.OrthographicCamera(-3,3,1.8,-1.8,.1,35);
  camera.up.set(0,0,1);camera.position.set(2.6,-9,5.0);camera.lookAt(.9,-.15,1.1);
  scene.add(new THREE.HemisphereLight(0xffffff,0xa5b5b3,1.5));
  const key=new THREE.DirectionalLight(0xfff6e9,2.8);key.position.set(-2.5,-4,7);key.castShadow=true;
  key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=4;key.shadow.camera.bottom=-4;key.shadow.camera.near=.1;key.shadow.camera.far=16;
  key.shadow.normalBias=.012;key.shadow.bias=-.0001;key.shadow.radius=3;scene.add(key);
  const fill=new THREE.DirectionalLight(0xddeef0,.8);fill.position.set(4,3,4);scene.add(fill);
  const ground=mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({color:0x374d50,opacity:.16}),scene,[0,0,-.006]);ground.castShadow=false;
  const clay=material('#d9d6cc'),clayShade=material('#b9c0bb'),gripperMaterial=material('#697c7c'),rubber=material('#474848');
  clay.side=THREE.DoubleSide;clayShade.side=THREE.DoubleSide;
  const root=new THREE.Group();scene.add(root);
  // The source tray, assembly rail and tool rack remain inside the hero frame.
  mesh(beveledPrism(.66,.10,64),material('#d5e2e3'),scene,[0,0,.04]);
  mesh(beveledBox(WORK_AREAS.width,WORK_AREAS.sourceDepth,.10,.025),material('#e5eeeb'),scene,[WORK_AREAS.centerX,WORK_AREAS.sourceY,.06]);
  mesh(beveledBox(WORK_AREAS.width,WORK_AREAS.assemblyDepth,.12,.025),material('#e5eeeb'),scene,[WORK_AREAS.centerX,WORK_AREAS.assemblyY,.06]);
  // Small fixture pins support staggered blocks until their neighbours arrive.
  DESTINATIONS.forEach(position=>{
    mesh(beveledBox(.035,.035,position[2],.006),clayShade,scene,[position[0],.93,position[2]/2]);
  });
  SOURCES.forEach(position=>{
    for(const side of [-1,1])mesh(beveledBox(.065,.09,.045,.006),clayShade,scene,[position[0]+side*.25,position[1],.125]);
  });
  const station=new THREE.Group();station.position.set(STATION.x,STATION.y,0);station.rotation.z=STATION.yaw;scene.add(station);
  mesh(beveledBox(1.78,.54,.12,.02),material('#d5e2e3'),station,[0,0,.06]);
  for(const offset of Object.values(DOCK_OFFSETS)){
    // One continuous load path: base → upright → crossbar → fork rails.
    mesh(beveledBox(.07,.08,.42,.008),clayShade,station,[offset,.18,.33]);
    mesh(beveledBox(.32,.08,.055,.006),gripperMaterial,station,[offset,.15,.5175]);
    for(const side of [-1,1])mesh(beveledBox(.04,.32,.035,.006),gripperMaterial,station,[offset+side*.12,0,.5275]);
  }
  const bolts=new THREE.CylinderGeometry(.035,.035,.02,12);bolts.rotateX(Math.PI/2);
  for(const x of [-.43,.43])for(const y of [-.32,.32])mesh(bolts,clayShade,scene,[x,y,.10]);
  const manifestResponse=await fetch(new URL('kr210.json',ASSETS));
  if(!manifestResponse.ok)throw new Error('Robot manifest unavailable');
  const manifest=await manifestResponse.json();
  const binaryResponse=await fetch(new URL('kr210.bin',ASSETS));
  if(!binaryResponse.ok)throw new Error('Robot geometry unavailable');
  const binary=await binaryResponse.arrayBuffer();
  const joints=[];
  let parent=root;
  for(let i=0;i<manifest.links.length;i++){
    if(i){const joint=new THREE.Group();joint.position.set(...jointOffsets[i-1]);parent.add(joint);parent=joint;joints.push(joint);}
    const part=manifest.links[i],geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(binary,part.positions.byteOffset,part.positions.count),3));
    geometry.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(binary,part.normals.byteOffset,part.normals.count),3));
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(binary,part.indices.byteOffset,part.indices.count),1));
    mesh(geometry,i===0?clayShade:clay,parent);
  }
  const tool=new THREE.Group();tool.position.x=.02;parent.add(tool);
  const flange=new THREE.CylinderGeometry(.095,.095,.06,32);flange.rotateZ(Math.PI/2);
  mesh(flange,clayShade,tool,[.035,0,0]);
  const tools={mill:new THREE.Group(),grip:new THREE.Group(),print:new THREE.Group()};
  const cylinder=(r1,r2,length,mat,parent,x,y=0,z=0)=>{
    const geometry=new THREE.CylinderGeometry(r1,r2,length,24);geometry.rotateZ(Math.PI/2);
    return mesh(geometry,mat,parent,[x,y,z]);
  };
  // Quick-change spindle, collet and a visibly fluted end mill.
  cylinder(.083,.083,.16,clayShade,tools.mill,.13);
  cylinder(.145,.145,.02,clayShade,tools.mill,.155);
  cylinder(.065,.04,.055,gripperMaterial,tools.mill,.2375);
  const cutter=new THREE.Group();tools.mill.add(cutter);
  cylinder(.016,.016,.075,clayShade,cutter,.3025);
  for(let i=0;i<3;i++){
    const points=Array.from({length:25},(_,j)=>{
      const angle=i*Math.PI*2/3+j/24*Math.PI*1.3;
      return new THREE.Vector3(.267+j/24*.073,.016*Math.cos(angle),.016*Math.sin(angle));
    });
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.003,4,false),rubber,cutter);
  }
  const spindleBand=cylinder(.085,.085,.018,material('#e3a04a'),tools.mill,.13);
  // Self-contained pellet print head: hopper, drive housing, heatsink and nozzle.
  mesh(beveledBox(.16,.17,.17,.016),gripperMaterial,tools.print,[.13,0,0]);
  cylinder(.145,.145,.02,clayShade,tools.print,.155);
  cylinder(.065,.065,.065,clayShade,tools.print,.24);
  for(let i=0;i<4;i++)cylinder(.075,.075,.008,clayShade,tools.print,.212+i*.014);
  cylinder(.035,.012,.065,material('#c27e2a'),tools.print,.3075);
  const hopper=new THREE.CylinderGeometry(.065,.036,.16,24);hopper.rotateZ(Math.PI/2);
  mesh(hopper,clayShade,tools.print,[.08,0,.14]);
  mesh(beveledBox(.035,.055,.095,.008),clayShade,tools.print,[.12,0,.08]);
  // A three-cup vacuum gripper leaves the hexagon edges clear for close packing.
  cylinder(.075,.075,.07,clayShade,tools.grip,.08);
  mesh(beveledBox(.07,.38,.38,.02),gripperMaterial,tools.grip,[.13,0,0]);
  for(let i=0;i<3;i++){
    const angle=Math.PI/2+i*Math.PI*2/3,y=.18*Math.cos(angle),z=.18*Math.sin(angle);
    cylinder(.018,.018,.075,clayShade,tools.grip,.20,y,z);
    cylinder(.018,.026,.035,rubber,tools.grip,.34-PRISM_HEIGHT/2-.0175,y,z);
  }
  const vacuumLight=material('#e3a04a');
  cylinder(.02,.02,.008,vacuumLight,tools.grip,.17,0,0);
  const pieces=palette.map((color,i)=>{
    const piece=PRINTED_PIECES.has(i)?createPrintedBlock(color,i):createCarvedBlock(color,i);scene.add(piece);return piece;
  });
  const chips=createChips(palette);scene.add(chips.mesh);
  const down=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),STATION.yaw)
    .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI/2));
  function pose(motion){
    motion.angles.forEach((angle,i)=>{joints[i].rotation[jointAxes[i]]=angle;});
    for(const [name,object] of Object.entries(tools)){
      if(motion.tool===name){
        tool.add(object);object.position.set(0,0,0);object.quaternion.identity();
      }else{
        scene.add(object);object.position.set(DOCKS[name][0],DOCKS[name][1],DOCKS[name][2]+.34);object.quaternion.copy(down);
      }
    }
    pieces.forEach((piece,i)=>{
      piece.position.set(...motion.pieces[i].position);piece.rotation.x=motion.pieces[i].tilt;
    });
  }
  // Fit the entire swept scene, rather than cropping a single appealing pose.
  // Bounds use mesh corners (not vertices), keeping the one-time scan inexpensive.
  camera.updateMatrixWorld(true);
  const bounds=new THREE.Box2(),point=new THREE.Vector3(),point2=new THREE.Vector2();
  const corners=box=>{
    const result=[];
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])result.push(new THREE.Vector3(x,y,z));
    return result;
  };
  pose(sampleRobotMotion(0));scene.updateMatrixWorld(true);
  const tracked=[];
  scene.traverse(object=>{
    if(!object.isMesh||object===ground||object===chips.mesh)return;
    object.geometry.computeBoundingBox();tracked.push({object,corners:corners(object.geometry.boundingBox)});
  });
  const expand=p=>{point2.set(p.x,p.y);bounds.expandByPoint(point2);};
  for(let time=0;time<=CYCLE_SECONDS+.25;time+=.25){
    pose(sampleRobotMotion(Math.min(time,CYCLE_SECONDS)));scene.updateMatrixWorld(true);
    for(const item of tracked)for(const corner of item.corners)expand(point.copy(corner).applyMatrix4(item.object.matrixWorld).applyMatrix4(camera.matrixWorldInverse));
  }
  for(const corner of corners(chips.bounds))expand(point.copy(corner).applyMatrix4(camera.matrixWorldInverse));
  // Leave room for soft shadows and the pause control beneath the work surfaces.
  bounds.min.y-=.13;bounds.max.y+=.08;bounds.min.x-=.09;bounds.max.x+=.09;
  const frameSize=bounds.getSize(new THREE.Vector2()),frameCenter=bounds.getCenter(new THREE.Vector2());
  function render(seconds){
    const motion=sampleRobotMotion(seconds);pose(motion);
    cutter.rotation.x=motion.cutting?seconds*90:0;
    spindleBand.material.emissive.set(motion.cutting?'#5a340c':'#000000');
    vacuumLight.color.set(motion.held>=0?'#e3a04a':'#6d9c97');
    pieces.forEach((piece,i)=>{
      if(motion.pieces[i].printed)piece.userData.print(motion.pieces[i].cut);
      else piece.userData.carve(motion.pieces[i].cut);
    });
    chips.update(seconds);
    renderer.render(scene,camera);
    return motion;
  }
  function resize(width,height){
    if(!width||!height)return;
    const aspect=width/height,viewHeight=Math.max(frameSize.y,frameSize.x/aspect);
    camera.left=frameCenter.x-viewHeight*aspect/2;camera.right=frameCenter.x+viewHeight*aspect/2;
    camera.top=frameCenter.y+viewHeight/2;camera.bottom=frameCenter.y-viewHeight/2;camera.updateProjectionMatrix();
    renderer.setSize(width,height,false);
  }
  function dispose(){
    const geometries=new Set(),materials=new Set();
    scene.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material)materials.add(object.material);});
    geometries.forEach(item=>item.dispose());materials.forEach(item=>item.dispose());renderer.dispose();
  }
  return {render,resize,dispose,framing:{width:frameSize.x,height:frameSize.y}};
}

export async function mountRobotScene(host){
  const canvas=host.querySelector('canvas'),toggle=host.querySelector('[data-robot-toggle]');
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let scene;
  try{scene=await createRobotScene(canvas);}catch(error){host.dataset.robotState='fallback';console.warn('Robot scene uses its still image.',error);return;}
  let elapsed=reducedMotion.matches?CYCLE_SECONDS:0,lastTime=0,frame=0,visible=true,paused=reducedMotion.matches;
  const draw=()=>{
    const playback=sampleRobotPlayback(elapsed);
    canvas.style.opacity=String(playback.opacity);
    scene.render(playback.time);
  };
  function tick(time){
    if(lastTime)elapsed=(elapsed+Math.min((time-lastTime)/1000,.1))%LOOP_SECONDS;
    lastTime=time;draw();
    frame=requestAnimationFrame(tick);
  }
  function sync(){
    cancelAnimationFrame(frame);frame=0;lastTime=0;
    toggle.setAttribute('aria-label',paused?'Play robot animation':'Pause robot animation');
    toggle.dataset.paused=String(paused);
    if(visible&&!document.hidden&&!paused)frame=requestAnimationFrame(tick);
    else draw();
  }
  const resize=new ResizeObserver(entries=>{const {width,height}=entries[0].contentRect;scene.resize(width,height);draw();});resize.observe(host);
  const visibility=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:0});visibility.observe(host);
  toggle.hidden=false;toggle.addEventListener('click',()=>{if(paused&&reducedMotion.matches&&elapsed===CYCLE_SECONDS)elapsed=0;paused=!paused;sync();});
  const onMotion=()=>{paused=reducedMotion.matches;if(paused)elapsed=CYCLE_SECONDS;sync();};reducedMotion.addEventListener('change',onMotion);
  document.addEventListener('visibilitychange',sync);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();paused=true;cancelAnimationFrame(frame);canvas.style.opacity='';host.dataset.robotState='fallback';toggle.hidden=true;});
  host.dataset.robotState='ready';
  scene.resize(host.clientWidth,host.clientHeight);draw();sync();
  window.addEventListener('pagehide',event=>{if(event.persisted)return;cancelAnimationFrame(frame);resize.disconnect();visibility.disconnect();reducedMotion.removeEventListener('change',onMotion);document.removeEventListener('visibilitychange',sync);scene.dispose();},{once:true});
}
