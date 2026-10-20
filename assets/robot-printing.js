import * as THREE from './vendor/three/three.module.min.js';
import { PRISM_RADIUS,PRISM_HEIGHT,PRINT_LAYERS,PRINT_PATHS,clamp } from './robot-motion.js';

function layerGeometry(){
  const shape=new THREE.Shape(),bevel=.0017,radius=PRISM_RADIUS-bevel/Math.cos(Math.PI/6);
  for(let i=0;i<6;i++){
    const x=radius*Math.cos(i*Math.PI/3),y=radius*Math.sin(i*Math.PI/3);
    if(i)shape.lineTo(x,y);else shape.moveTo(x,y);
  }
  shape.closePath();
  const height=PRISM_HEIGHT/PRINT_LAYERS;
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:height-2*bevel,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,steps:1});
  geometry.translate(0,0,-height+bevel);
  return geometry;
}

// Flattened filament beads follow exactly the same segments as the nozzle.
// Each small indexed section has an end distance, allowing a progressive reveal.
function filamentGeometry(segments,body,topSkin=false){
  const positions=[],indices=[],ends=[],stepsPerRing=8;
  const halfHeight=body?PRISM_HEIGHT/PRINT_LAYERS*.46:.003;
  for(const segment of segments){
    if(!segment.deposit)continue;
    const radius=body?(topSkin&&!segment.perimeter?.0255:.0128):.014;
    const dx=segment.to[0]-segment.from[0],dy=segment.to[1]-segment.from[1],length=Math.hypot(dx,dy);
    const steps=Math.max(1,Math.ceil(length/.006)),offset=positions.length/3;
    for(let step=0;step<=steps;step++){
      const fraction=step/steps;
      for(let ring=0;ring<stepsPerRing;ring++){
        const angle=ring/stepsPerRing*Math.PI*2;
        positions.push(segment.from[0]+dx*fraction-dy/length*Math.cos(angle)*radius,
          segment.from[1]+dy*fraction+dx/length*Math.cos(angle)*radius,
          segment.to[2]-halfHeight+Math.sin(angle)*halfHeight);
      }
    }
    for(let step=0;step<steps;step++){
      for(let ring=0;ring<stepsPerRing;ring++){
        const a=offset+step*stepsPerRing+ring,b=offset+step*stepsPerRing+(ring+1)%stepsPerRing;
        indices.push(a,b,a+stepsPerRing,b,b+stepsPerRing,a+stepsPerRing);
      }
      ends.push({distance:segment.start+(segment.end-segment.start)*(step+1)/steps,count:indices.length});
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  return {geometry,ends};
}

export function createPrintedBlock(color,piece){
  const group=new THREE.Group(),path=PRINT_PATHS[piece],solidGeometry=layerGeometry();
  const base=new THREE.Color(color);
  const materials=[.92,1,.97].map(factor=>new THREE.MeshStandardMaterial({color:base.clone().multiplyScalar(factor),roughness:.83}));
  const letterMaterial=new THREE.MeshStandardMaterial({color:base.clone().multiplyScalar(.72),roughness:.85});
  const layers=path.layers.map((layer,index)=>{
    const solid=layer.body?new THREE.Mesh(solidGeometry,materials[index%3]):null;
    if(solid){solid.position.z=layer.z-(index===PRINT_LAYERS-1?.004:0);solid.castShadow=solid.receiveShadow=true;group.add(solid);}
    const {geometry,ends}=filamentGeometry(path.segments.filter(segment=>segment.layer===index),layer.body,index===PRINT_LAYERS-1);
    const beads=new THREE.Mesh(geometry,layer.body?materials[index%3]:letterMaterial);
    beads.castShadow=beads.receiveShadow=true;group.add(beads);
    return {...layer,solid,beads,ends};
  });
  let last=-1;
  group.userData.print=progress=>{
    if(progress===last)return;last=progress;
    const distance=clamp(progress)*path.length;
    group.visible=progress>0;
    layers.forEach((layer,index)=>{
      const complete=distance>=layer.end;
      if(layer.solid)layer.solid.visible=complete;
      // Keep the top skin's filament lines visible on the finished object.
      layer.beads.visible=distance>layer.start&&(!complete||index>=PRINT_LAYERS-1);
      let count=0;
      for(const end of layer.ends){if(end.distance>distance)break;count=end.count;}
      layer.beads.geometry.setDrawRange(0,count);
    });
  };
  group.userData.print(0);
  return group;
}
