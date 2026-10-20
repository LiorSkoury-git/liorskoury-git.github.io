import * as THREE from './vendor/three/three.module.min.js';
import { PRISM_RADIUS as R,PRISM_HEIGHT as H,CUT_RADIUS,CUT_DEPTH,cutSegments,millingSample,SOURCES,BUILD_ORDER,PRINTED_PIECES,WORK_AREAS,phaseTime } from './robot-motion.js';
const corners=Array.from({length:6},(_,i)=>[R*Math.cos(i*Math.PI/3),R*Math.sin(i*Math.PI/3)]);
// Clip a regular surface grid against the exact hexagon. Shared vertices keep
// the dynamically carved top watertight; the separate side mesh stays crisp.
function clip(poly,a,b){
  const side=p=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
  const result=[];
  for(let i=0;i<poly.length;i++){
    const p=poly[i],q=poly[(i+1)%poly.length],dp=side(p),dq=side(q);
    if(dp>=-1e-10)result.push(p);
    if((dp>0&&dq<0)||(dp<0&&dq>0)){
      const t=dp/(dp-dq);result.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);
    }
  }
  return result;
}
function topGeometry(){
  const vertices=[],indices=[],lookup=new Map(),step=R*2/88;
  const vertex=p=>{
    const key=p.map(v=>Math.round(v*1e7)).join(',');
    if(!lookup.has(key)){lookup.set(key,vertices.length/3);vertices.push(...p,H/2);}
    return lookup.get(key);
  };
  for(let x=-R;x<R-1e-8;x+=step)for(let y=-R;y<R-1e-8;y+=step){
    let poly=[[x,y],[x+step,y],[x+step,y+step],[x,y+step]];
    for(let i=0;i<6&&poly.length;i++)poly=clip(poly,corners[i],corners[(i+1)%6]);
    if(poly.length<3)continue;
    const ids=poly.map(vertex);
    for(let i=1;i<ids.length-1;i++)if(new Set([ids[0],ids[i],ids[i+1]]).size===3)indices.push(ids[0],ids[i],ids[i+1]);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(vertices.length).fill(1),3));
  geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
function sideGeometry(){
  const vertices=[],triangle=(a,b,c)=>vertices.push(...a,...b,...c);
  for(let i=0;i<6;i++){
    const p=corners[i],q=corners[(i+1)%6];
    triangle([...p,-H/2],[...q,-H/2],[...q,H/2]);
    triangle([...p,-H/2],[...q,H/2],[...p,H/2]);
    triangle([0,0,-H/2],[...q,-H/2],[...p,-H/2]);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();return geometry;
}
const distanceToSegment=(x,y,a,b)=>{
  const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));
  return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);
};
export function createCarvedBlock(color,piece){
  const group=new THREE.Group(),geometry=topGeometry();
  const material=new THREE.MeshStandardMaterial({color,roughness:.83,metalness:0});
  const topMaterial=material.clone();topMaterial.vertexColors=true;
  const top=new THREE.Mesh(geometry,topMaterial),sides=new THREE.Mesh(sideGeometry(),material);
  top.castShadow=sides.castShadow=true;top.receiveShadow=sides.receiveShadow=true;
  group.add(top,sides);let last=-1;
  group.userData.carve=progress=>{
    if(progress===last)return;last=progress;
    const segments=cutSegments(piece,progress),positions=geometry.attributes.position,colors=geometry.attributes.color;
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),y=positions.getY(i);let depth=0;
      for(const segment of segments){
        const distance=distanceToSegment(x,y,segment.from,segment.to);
        if(distance<CUT_RADIUS){
          const plunge=Math.min(CUT_DEPTH,Math.max(0,-Math.min(segment.from[2],segment.to[2])));
          depth=Math.max(depth,plunge*Math.min(1,(CUT_RADIUS-distance)/.002));
        }
      }
      positions.setZ(i,H/2-depth);
      const shade=1-.42*depth/CUT_DEPTH;colors.setXYZ(i,shade,shade,shade);
    }
    positions.needsUpdate=true;colors.needsUpdate=true;geometry.computeVertexNormals();
  };
  return group;
}
// Deterministic fixed-step chip trajectories: gravity, collisions with the
// work surface, restitution, friction and tumbling followed by settling.
const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const insideBlank=(position,source)=>{
  const dx=Math.abs(position[0]-source[0]),dy=Math.abs(position[1]-source[1]);
  return dx<R&&dy<Math.sqrt(3)*R/2&&Math.sqrt(3)*dx+dy<Math.sqrt(3)*R;
};
export function chipTrajectory(origin,velocity,source,blanks=[source]){
  const frames=[],position=[...origin],v=[...velocity],dt=1/60;
  for(let frame=0;frame<=120;frame++){
    const previous=[...position];frames.push(previous);v[2]-=9.81*dt;
    for(let axis=0;axis<3;axis++)position[axis]+=v[axis]*dt;
    const onTable=Math.abs(position[0]-WORK_AREAS.centerX)<WORK_AREAS.width/2&&Math.abs(position[1]-WORK_AREAS.sourceY)<WORK_AREAS.sourceDepth/2;
    let floor=onTable?.11:0;
    for(const blank of blanks){
      if(!insideBlank(position,blank))continue;
      const top=blank[2]+H/2;
      if(previous[2]>=top+.003)floor=Math.max(floor,top);
      else if(position[2]<top&&!insideBlank(previous,blank)){
        // A side impact reflects horizontal motion instead of lifting a chip
        // through the neighbouring blank onto its top.
        position[0]=previous[0];position[1]=previous[1];v[0]*=-.35;v[1]*=-.35;
      }
    }
    if(position[2]<floor+.004 && v[2]<0){
      position[2]=floor+.004;v[2]=-v[2]*.28;v[0]*=.58;v[1]*=.58;
      if(Math.abs(v[2])<.06)v[2]=0;
    }
  }
  return frames;
}
export function createChips(palette){
  const records=[];
  BUILD_ORDER.forEach((piece,index)=>{
    if(PRINTED_PIECES.has(piece))return;
    for(let event=0;event<680;event++){
      const progress=(event+.5)/680,sample=millingSample(piece,progress);
      if(!sample.cutting)continue;
      const seed=piece*1000+event,angle=hash(seed)*Math.PI*2,speed=.45+hash(seed+1)*1.25;
      const source=SOURCES[piece],origin=[source[0]+sample.local[0],source[1]+sample.local[1],source[2]+H/2+.006];
      const velocity=[Math.cos(angle)*speed,Math.sin(angle)*speed,.35+hash(seed+2)*1.1];
      const remaining=BUILD_ORDER.slice(index).filter(i=>!PRINTED_PIECES.has(i));
      const frames=chipTrajectory(origin,velocity,source,remaining.map(i=>SOURCES[i]));
      const restingOn=frames.at(-1)[2]>.24?remaining.find(i=>insideBlank(frames.at(-1),SOURCES[i])):undefined;
      const pickTime=restingOn===undefined?Infinity:phaseTime(BUILD_ORDER.indexOf(restingOn),15.5);
      records.push({piece,birth:phaseTime(index,2.1+progress*6.4),frames,pickTime,seed,size:.006+hash(seed+3)*.008});
    }
  });
  const geometry=new THREE.TetrahedronGeometry(1),material=new THREE.MeshStandardMaterial({roughness:.95,metalness:0});
  const mesh=new THREE.InstancedMesh(geometry,material,records.length);
  mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;
  const dummy=new THREE.Object3D();
  const bounds=new THREE.Box3(),point=new THREE.Vector3();
  records.forEach(record=>record.frames.forEach(frame=>bounds.expandByPoint(point.set(...frame))));
  bounds.expandByScalar(.03);
  records.forEach((record,i)=>mesh.setColorAt(i,new THREE.Color(palette[record.piece])));
  return {mesh,bounds,update(time){
    records.forEach((record,i)=>{
      const age=time-record.birth;
      if(age<0){dummy.scale.setScalar(0);dummy.position.set(0,0,0);}
      else{
        const frame=Math.min(120,Math.floor(age*60)),fraction=Math.min(age*60-frame,1),a=record.frames[frame],b=record.frames[Math.min(120,frame+1)];
        dummy.position.set(...a.map((v,j)=>v+(b[j]-v)*fraction));
        dummy.scale.set(record.size*1.7,record.size,record.size*.6);
        const spin=Math.min(age,.9);dummy.rotation.set(record.seed+spin*12,record.seed*.7+spin*8,record.seed*.3+spin*9);
        if(time>record.pickTime&&dummy.position.z>.24)dummy.position.z-=Math.min(.14,4.9*(time-record.pickTime)**2);
      }
      dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate=true;
  }};
}
