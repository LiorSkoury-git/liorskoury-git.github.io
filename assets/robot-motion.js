// Metres, Z up. This is a visual choreography, not a machine controller.
import { Matrix4 } from './vendor/three/three.module.min.js';

export const LETTERS='PORTFOLIO';
export const PRISM_RADIUS=.23;
export const PRISM_HEIGHT=.14;
export const CUT_DEPTH=.024;
export const CUT_RADIUS=.016;
export const TOOL_REACH=.60; // A5 to cutter tip / gripper grasp centre
export const MOVE_SECONDS=24;
export const INTRO_SECONDS=2.4;
export const MOTION_SPEED=1.56;
export const PRINTED_PIECES=new Set([6,8,1,3]);
export const processTool=piece=>PRINTED_PIECES.has(piece)?'print':'mill';
export const PROCESS_SECONDS=piece=>PRINTED_PIECES.has(piece)?20:6.4;
export const BUILD_ORDER=[5,6,7,8,0,1,2,3,4];
export const START_TIMES=BUILD_ORDER.map((_,i)=>INTRO_SECONDS+BUILD_ORDER.slice(0,i).reduce((sum,p)=>sum+MOVE_SECONDS+PROCESS_SECONDS(p)-6.4,0));
export const CYCLE_SECONDS=(START_TIMES.at(-1)+MOVE_SECONDS+PROCESS_SECONDS(BUILD_ORDER.at(-1))-6.4)/MOTION_SPEED;
export const LOOP_SECONDS=CYCLE_SECONDS+4;
export function sampleRobotPlayback(elapsed){
  const time=((elapsed%LOOP_SECONDS)+LOOP_SECONDS)%LOOP_SECONDS;
  return {time,opacity:Math.min(1,time/.5,(LOOP_SECONDS-time)/.5)};
}
// Convert a familiar choreography phase into wall-clock seconds for QA.
export const phaseTime=(index,t)=>{
  const duration=PROCESS_SECONDS(BUILD_ORDER[index]);
  return (START_TIMES[index]+(t<2.1?t:t<8.5?2.1+(t-2.1)*duration/6.4:t+duration-6.4))/MOTION_SPEED;
};
export const WORK_AREAS={centerX:1.65,width:2,sourceY:-.94,sourceDepth:1.56,assemblyY:.83,assemblyDepth:.46};
export const SOURCES=Array.from(LETTERS,(_,i)=>[WORK_AREAS.centerX+((i%3)-1)*.49,-1.42+Math.floor(i/3)*.48,.18]);
const rowHeight=Math.sqrt(3)*PRISM_RADIUS;
export const DESTINATIONS=Array.from(LETTERS,(_,i)=>{
  const column=i<5?i:i-5;
  return [WORK_AREAS.centerX+(column-2)*PRISM_RADIUS*1.5,WORK_AREAS.assemblyY,.12+rowHeight*(.5+(column%2)*.5+(i<5?1:0))];
});
export const STATION={x:-1.12,y:.65,yaw:Math.PI/2};
export const DOCK_OFFSETS={mill:0,grip:.59,print:-.59};
export const DOCKS=Object.fromEntries(Object.entries(DOCK_OFFSETS).map(([tool,offset])=>[tool,[STATION.x,STATION.y+offset,.37]]));
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ease=t=>{t=clamp(t);return t*t*t*(t*(t*6-15)+10);};
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*ease(t));
const above=(p,height=1.45)=>[p[0],p[1],height];
// Follow a circular transfer around the base when travelling to the rear rack.
// A straight chord between the two workspaces would pass through the robot.
function transfer(from,to,t){
  const fraction=ease(t),start=Math.atan2(from[1],from[0]),end=Math.atan2(to[1],to[0]);
  const delta=Math.atan2(Math.sin(end-start),Math.cos(end-start));
  const radius=Math.hypot(from[0],from[1])+(Math.hypot(to[0],to[1])-Math.hypot(from[0],from[1]))*fraction;
  const angle=start+delta*fraction;
  return [radius*Math.cos(angle),radius*Math.sin(angle),from[2]+(to[2]-from[2])*fraction];
}
const oval=(cx,cy,rx,ry,start=0,end=Math.PI*2)=>Array.from({length:25},(_,i)=>{
  const angle=start+(end-start)*i/24;return [cx+rx*Math.cos(angle),cy+ry*Math.sin(angle)];
});
const strokes={
  P:[[[-.065,-.11],[-.065,.11],[.015,.11],...oval(.015,.055,.06,.055,Math.PI/2,-Math.PI/2).slice(1),[-.065,0]]],
  O:[oval(0,0,.075,.11)],
  R:[[[-.065,-.11],[-.065,.11],[.015,.11],...oval(.015,.055,.06,.055,Math.PI/2,-Math.PI/2).slice(1),[-.065,0]],[[0,0],[.078,-.11]]],
  T:[[[-.085,.11],[.085,.11]],[[0,.11],[0,-.11]]],
  F:[[[-.065,-.11],[-.065,.11],[.075,.11]],[[-.065,.015],[.055,.015]]],
  L:[[[-.065,.11],[-.065,-.11],[.075,-.11]]],
  I:[[[-.065,.11],[.065,.11]],[[0,.11],[0,-.11]],[[-.065,-.11],[.065,-.11]]]
};
function makePath(letter){
  const segments=[];
  let previous=[...strokes[letter][0][0],.075],length=0;
  const add=(to,cut=false)=>{
    const distance=Math.hypot(...to.map((v,i)=>v-previous[i]));
    segments.push({from:previous,to,cut,start:length,end:length+distance});
    length+=distance;previous=to;
  };
  for(const stroke of strokes[letter]){
    add([...stroke[0],.075]);add([...stroke[0],-CUT_DEPTH],true);
    for(const point of stroke.slice(1))add([...point,-CUT_DEPTH],true);
    add([...stroke.at(-1),.075]);
  }
  return {segments,length};
}
export const MILLING_PATHS=Array.from(LETTERS,makePath);
export const PRINT_LAYERS=5;
function makePrintPath(letter){
  const segments=[],layers=[];
  let previous=null,length=0;
  function add(to,deposit,layer,perimeter=false){
    if(previous){
      const distance=Math.hypot(...to.map((v,i)=>v-previous[i]));
      if(distance>1e-9){segments.push({from:previous,to,deposit,layer,perimeter,start:length,end:length+distance});length+=distance;}
    }
    previous=to;
  }
  for(let layer=0;layer<PRINT_LAYERS;layer++){
    const z=-PRISM_HEIGHT/2+(layer+1)*PRISM_HEIGHT/PRINT_LAYERS;
    const first=[PRISM_RADIUS-.012,0,z],start=length;
    add(first,false,layer);
    for(let side=1;side<=6;side++)add([(PRISM_RADIUS-.012)*Math.cos(side*Math.PI/3),(PRISM_RADIUS-.012)*Math.sin(side*Math.PI/3),z],true,layer,true);
    // Sparse internal support, followed by a dense top skin.
    const spacing=layer===PRINT_LAYERS-1?.05:.09;
    let reverse=false;
    for(let y=-.17;y<=.175;y+=spacing){
      const halfWidth=PRISM_RADIUS-.018-Math.abs(y)/Math.sqrt(3);
      const a=[reverse?halfWidth:-halfWidth,y,z],b=[-a[0],y,z];
      add(a,false,layer);add(b,true,layer);reverse=!reverse;
    }
    layers.push({start,end:length,z,body:true});
  }
  // Two deposited layers create raised lettering as part of the print.
  for(let level=0;level<2;level++){
    const layer=PRINT_LAYERS+level,z=PRISM_HEIGHT/2+(level+1)*.006,start=length;
    for(const stroke of strokes[letter]){
      add([...previous.slice(0,2),z+.025],false,layer);
      add([...stroke[0],z+.025],false,layer);
      add([...stroke[0],z],false,layer);
      for(const point of stroke.slice(1))add([...point,z],true,layer);
    }
    layers.push({start,end:length,z,body:false});
  }
  return {segments,layers,length};
}
export const PRINT_PATHS=Array.from(LETTERS,makePrintPath);
export function printingSample(piece,progress){
  const path=PRINT_PATHS[piece],distance=clamp(progress)*path.length;
  const segment=path.segments.find(segment=>segment.end>distance)||path.segments.at(-1);
  const fraction=clamp((distance-segment.start)/(segment.end-segment.start||1));
  return {local:segment.from.map((v,i)=>v+(segment.to[i]-v)*fraction),depositing:segment.deposit,segment,distance};
}
export function millingSample(piece,progress){
  const path=MILLING_PATHS[piece],distance=clamp(progress)*path.length;
  const segment=path.segments.find(segment=>segment.end>distance)||path.segments.at(-1);
  const fraction=clamp((distance-segment.start)/(segment.end-segment.start||1));
  const local=segment.from.map((v,i)=>v+(segment.to[i]-v)*fraction);
  return {local,cutting:segment.cut&&local[2]<0,segment,distance};
}
export function cutSegments(piece,progress){
  const distance=clamp(progress)*MILLING_PATHS[piece].length;
  return MILLING_PATHS[piece].segments.filter(s=>s.cut&&s.start<distance).map(s=>{
    const fraction=clamp((distance-s.start)/(s.end-s.start||1));
    return {from:s.from,to:s.from.map((v,i)=>v+(s.to[i]-v)*fraction)};
  });
}
// Closed-form position IK plus X-Y-X wrist decomposition. The tool turns with
// the block, from downward milling to horizontal wall placement.
export function solveRobotPose(target,tilt=0,yaw=0){
  const direction=[-Math.sin(yaw)*Math.sin(tilt),Math.cos(yaw)*Math.sin(tilt),-Math.cos(tilt)];
  const [x,y,z]=target.map((v,i)=>v-TOOL_REACH*direction[i]);
  const a=1.35,b=Math.hypot(1.42,.115),beta=Math.atan2(1.42,.115);
  const r=Math.hypot(x,y)-.33,h=z-.645;
  const elbow=Math.acos(clamp((r*r+h*h-a*a-b*b)/(2*a*b),-1,1));
  const q1=Math.atan2(y,x);
  const q2=Math.atan2(r,h)-Math.atan2(b*Math.sin(elbow),a+b*Math.cos(elbow));
  const q3=elbow-beta;
  const desired=new Matrix4().makeRotationZ(yaw).multiply(new Matrix4().makeRotationX(tilt)).multiply(new Matrix4().makeRotationY(Math.PI/2));
  const wrist=new Matrix4().makeRotationY(-q2-q3).multiply(new Matrix4().makeRotationZ(-q1)).multiply(desired).elements;
  return [q1,q2,q3,Math.atan2(wrist[1],-wrist[2]),Math.acos(clamp(wrist[0],-1,1)),Math.atan2(wrist[4],wrist[8])];
}
export function sampleRobotMotion(time){
  const seconds=Math.max(0,time)*MOTION_SPEED;
  if(seconds<INTRO_SECONDS){
    const motion=sampleRobotMotion(INTRO_SECONDS/MOTION_SPEED);
    const target=seconds<.9?mix(above(DOCKS.mill),DOCKS.mill,seconds/.9):seconds<1.4?DOCKS.mill:mix(DOCKS.mill,above(DOCKS.mill),(seconds-1.4));
    return {...motion,target,yaw:STATION.yaw,angles:solveRobotPose(target,0,STATION.yaw),tool:seconds<1.15?null:'mill',phase:'Mounting spindle'};
  }
  const complete=time>=CYCLE_SECONDS;
  const index=Math.max(0,START_TIMES.findLastIndex(start=>seconds>=start)),piece=BUILD_ORDER[index];
  const duration=PROCESS_SECONDS(piece),raw=seconds-START_TIMES[index];
  const t=complete?24:raw<2.1?raw:raw<2.1+duration?2.1+(raw-2.1)*6.4/duration:raw-(duration-6.4);
  const workingTool=processTool(piece),nextTool=processTool(BUILD_ORDER[Math.min(8,index+1)]);
  const dock=DOCKS[workingTool],nextDock=DOCKS[nextTool],printed=PRINTED_PIECES.has(piece);
  const source=SOURCES[piece],destination=DESTINATIONS[piece];
  const sampleProcess=printed?printingSample:millingSample;
  const pathStart=sampleProcess(piece,0).local;
  const start=[source[0]+pathStart[0],source[1]+pathStart[1],source[2]+pathStart[2]+(printed?0:PRISM_HEIGHT/2)];
  const pathEnd=sampleProcess(piece,1).local;
  const end=[source[0]+pathEnd[0],source[1]+pathEnd[1],source[2]+pathEnd[2]+(printed?0:PRISM_HEIGHT/2)];
  const front=[destination[0],destination[1]-.52,destination[2]];
  const pieces=SOURCES.map((position,i)=>({position:[...position],tilt:0,cut:0,printed:PRINTED_PIECES.has(i)}));
  for(let i=0;i<index;i++)Object.assign(pieces[BUILD_ORDER[i]],{position:[...DESTINATIONS[BUILD_ORDER[i]]],tilt:Math.PI/2,cut:1});
  let target,tilt=0,yaw=0,opening=1,tool=workingTool,phase=printed?'Printing':'Milling',progress=0,cutting=false,depositing=false,held=-1;
  const move=(from,to,fromTime,toTime)=>mix(from,to,(t-fromTime)/(toTime-fromTime));
  if(t<1.3){target=transfer(above(dock),above(start),t/1.3);yaw=STATION.yaw*(1-ease(t/1.3));}
  else if(t<2.1)target=move(above(start),start,1.3,2.1);
  else if(t<8.5){
    progress=(t-2.1)/6.4;
    const sample=sampleProcess(piece,progress);
    target=[source[0]+sample.local[0],source[1]+sample.local[1],source[2]+(printed?0:PRISM_HEIGHT/2)+sample.local[2]];
    cutting=!printed&&sample.cutting;depositing=printed&&sample.depositing;
  }
  else if(t<9.1)target=move(end,above(end),8.5,9.1);
  else if(t<10){target=transfer(above(end),above(dock),(t-9.1)/.9);yaw=STATION.yaw*ease((t-9.1)/.9);}
  else if(t<10.6)target=move(above(dock),dock,10,10.6);
  else if(t<11)target=dock;
  else if(t<11.6)target=move(dock,above(dock),11,11.6);
  else if(t<12.2)target=move(above(dock),above(DOCKS.grip),11.6,12.2);
  else if(t<12.8)target=move(above(DOCKS.grip),DOCKS.grip,12.2,12.8);
  else if(t<13.1)target=DOCKS.grip;
  else if(t<13.7)target=move(DOCKS.grip,above(DOCKS.grip),13.1,13.7);
  else if(t<14.5){target=transfer(above(DOCKS.grip),above(source),(t-13.7)/.8);yaw=STATION.yaw*(1-ease((t-13.7)/.8));}
  else if(t<15.1)target=move(above(source),source,14.5,15.1);
  else if(t<15.5){target=source;opening=1-ease((t-15.1)/.4);}
  else if(t<16.2){target=move(source,above(source),15.5,16.2);opening=0;held=piece;}
  else if(t<17.6){target=move(above(source),above(front),16.2,17.6);tilt=ease((t-16.2)/1.4)*Math.PI/2;opening=0;held=piece;}
  else if(t<18.4){target=move(above(front),destination,17.6,18.4);tilt=Math.PI/2;opening=0;held=piece;}
  else if(t<18.8){target=destination;tilt=Math.PI/2;opening=ease((t-18.4)/.4);}
  else if(t<19.4){target=move(destination,front,18.8,19.4);tilt=Math.PI/2;}
  else if(t<20.4){
    const progress=t-19.4;
    if(progress<.3){target=mix(front,above(front),progress/.3);tilt=(1-ease(progress/.3))*Math.PI/2;}
    else{target=transfer(above(front),above(DOCKS.grip),(progress-.3)/.7);yaw=STATION.yaw*ease((progress-.3)/.7);}
  }
  else if(t<21)target=move(above(DOCKS.grip),DOCKS.grip,20.4,21);
  else if(t<21.3)target=DOCKS.grip;
  else if(t<21.9)target=move(DOCKS.grip,above(DOCKS.grip),21.3,21.9);
  else if(t<22.5)target=move(above(DOCKS.grip),above(nextDock),21.9,22.5);
  else if(t<23.1)target=move(above(nextDock),nextDock,22.5,23.1);
  else if(t<23.4)target=nextDock;
  else target=move(nextDock,above(nextDock),23.4,24);
  if(t>=10&&t<13.7 || t>=20.4)yaw=STATION.yaw;
  if(t>=8.5)progress=1;
  if(t>=10.8&&t<12.95 || t>=21.15&&t<23.25)tool=null;
  else if(t>=12.95&&t<21.15)tool='grip';
  else if(t>=23.25)tool=nextTool;
  if(t>=9.1&&t<13.7 || t>=19.4)phase='Changing tool';
  else if(t>=13.7)phase='Placing';
  pieces[piece].cut=progress;
  if(held>=0){pieces[piece].position=[...target];pieces[piece].tilt=tilt;}
  else if(t>=18.4){pieces[piece].position=[...destination];pieces[piece].tilt=Math.PI/2;}
  return {target,tilt,yaw,angles:solveRobotPose(target,tilt,yaw),opening,tool,pieces,held,piece,index,progress,cutting,depositing,phase,complete};
}
