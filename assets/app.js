// Progressive enhancement only: all research content and links are static HTML.
const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('#main-nav');
function closeMenu(){menu?.setAttribute('aria-expanded','false');nav?.removeAttribute('data-open');}
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.toggleAttribute('data-open',open);});
nav?.addEventListener('click',event=>{if(event.target.closest('a')) closeMenu();});
document.addEventListener('keydown',event=>{if(event.key==='Escape' && menu?.getAttribute('aria-expanded')==='true'){closeMenu();menu.focus();}});
document.addEventListener('pointerdown',event=>{if(menu?.getAttribute('aria-expanded')==='true' && !menu.closest('.site-header')?.contains(event.target))closeMenu();});
window.addEventListener('resize',()=>{if(matchMedia('(min-width: 861px)').matches)closeMenu();});

for(const contents of document.querySelectorAll('.project-contents nav')){
  const links=[...contents.querySelectorAll('a[href^="#"]')];
  const headerLinks=[...document.querySelectorAll('.research-submenu a[href^="#"]')];
  const sections=links.map(link=>document.getElementById(link.hash.slice(1)));
  if(!links.length || sections.some(section=>!section))continue;
  let scheduled=false;
  const update=()=>{
    scheduled=false;
    const headerHeight=document.querySelector('.site-header')?.getBoundingClientRect().height || 0;
    const marker=headerHeight+Math.min(100,window.innerHeight*.15);
    let current=0;
    sections.forEach((section,index)=>{
      if(section.getBoundingClientRect().top<=marker)current=index;
    });
    if(window.scrollY+window.innerHeight>=document.documentElement.scrollHeight-3)current=links.length-1;
    const activeHash=links[current].hash;
    [...links,...headerLinks].forEach(link=>{
      if(link.hash===activeHash)link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    });
  };
  const schedule=()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(update);
  };
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule);
  window.addEventListener('hashchange',schedule);
  window.addEventListener('load',schedule,{once:true});
  schedule();
}

const backToTop=document.querySelector('[data-back-to-top]');
if(backToTop){
  backToTop.classList.add('is-managed');
  const updateBackToTop=()=>backToTop.classList.toggle('is-visible',window.scrollY>Math.max(300,window.innerHeight*.6));
  window.addEventListener('scroll',updateBackToTop,{passive:true});
  window.addEventListener('resize',updateBackToTop);
  updateBackToTop();
}

for(const imageLink of document.querySelectorAll('[data-demo-reveal]')){
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const touchPreview=matchMedia('(hover: none) and (pointer: coarse)');
  let current=touchPreview.matches?50:-10;
  let target=current;
  if(touchPreview.matches)imageLink.style.setProperty('--reveal-progress','50%');
  let frame=0;
  let lastTime=0;
  let pointerTarget=50;
  let touchStartX;
  let touchMoved=false;
  let suppressTouchClick=false;
  function render(time){
    const elapsed=lastTime?Math.min(time-lastTime,64):16;
    lastTime=time;
    current+=(target-current)*(1-Math.exp(-elapsed/120));
    if(Math.abs(target-current)<.2){current=target;frame=0;lastTime=0;}
    else frame=requestAnimationFrame(render);
    imageLink.style.setProperty('--reveal-progress',`${current.toFixed(2)}%`);
  }
  function moveTo(value){
    target=value;
    if(reducedMotion.matches){
      if(frame)cancelAnimationFrame(frame);
      frame=0;lastTime=0;current=target;
      imageLink.style.setProperty('--reveal-progress',`${current}%`);
    }else if(!frame)frame=requestAnimationFrame(render);
  }
  function moveAtX(clientX){
    const bounds=imageLink.getBoundingClientRect();
    const position=Math.max(0,Math.min(1,(clientX-bounds.left)/bounds.width));
    pointerTarget=position*120-10;
    moveTo(pointerTarget);
  }
  function updateReveal(event){
    if(event.pointerType==='mouse' || event.pointerType==='pen')moveAtX(event.clientX);
  }
  imageLink.addEventListener('pointerenter',updateReveal);
  imageLink.addEventListener('pointermove',updateReveal);
  imageLink.addEventListener('pointerdown',event=>{
    if(event.pointerType!=='touch')return;
    touchStartX=event.clientX;
    touchMoved=false;
    suppressTouchClick=false;
  });
  imageLink.addEventListener('pointermove',event=>{
    if(event.pointerType!=='touch' || touchStartX===undefined)return;
    if(!touchMoved && Math.abs(event.clientX-touchStartX)<8)return;
    touchMoved=true;
    moveAtX(event.clientX);
  });
  imageLink.addEventListener('pointerup',event=>{
    if(event.pointerType!=='touch')return;
    if(touchMoved){moveAtX(event.clientX);suppressTouchClick=true;}
    touchStartX=undefined;
  });
  imageLink.addEventListener('pointerleave',event=>{if(event.pointerType!=='touch')moveTo(imageLink.matches(':focus-visible')?50:-10);});
  imageLink.addEventListener('pointercancel',event=>{if(event.pointerType==='touch'){touchStartX=undefined;touchMoved=false;}else moveTo(-10);});
  imageLink.addEventListener('click',event=>{if(suppressTouchClick){event.preventDefault();suppressTouchClick=false;}},true);
  imageLink.addEventListener('focus',()=>{if(imageLink.matches(':focus-visible'))moveTo(50);});
  imageLink.addEventListener('blur',()=>moveTo(touchPreview.matches?50:imageLink.matches(':hover')?pointerTarget:-10));
}

const submenuShell=document.querySelector('.home-submenu-shell');
if(submenuShell){
  const submenuHeader=submenuShell.closest('.site-header');
  const headerBar=submenuHeader.querySelector('.header-bar');
  const submenu=submenuShell.querySelector('.home-submenu');
  const submenuToggle=submenuHeader.querySelector('.home-submenu-toggle');
  let overHeader=false;
  let overSubmenu=false;
  let mobileSubmenuOpen=window.scrollY<24;
  let mobileScrollIntent;
  let touchStartY;
  let closeTimer;
  const mobileSubmenu=()=>matchMedia('(max-width: 700px)').matches;
  const footer=submenuShell.classList?.contains('side-submenu-shell')?document.querySelector('.site-footer'):null;
  function keepSubmenuAboveFooter(){
    if(!footer)return;
    if(mobileSubmenu() || !submenuHeader.classList.contains('is-expanded')){
      submenuShell.style.removeProperty('--side-menu-footer-shift');
      submenuShell.classList.remove('is-near-footer');
      return;
    }
    const menuBottom=window.innerHeight/2+submenuShell.getBoundingClientRect().height/2;
    const shift=Math.max(0,Math.ceil(menuBottom+16-footer.getBoundingClientRect().top));
    submenuShell.style.setProperty('--side-menu-footer-shift',`${shift}px`);
    submenuShell.classList.toggle('is-near-footer',shift>0);
  }
  function alignSubmenu(){
    const activeLink=nav?.querySelector('[aria-current="page"]');
    const anchor=menu && getComputedStyle(menu).display!=='none'?menu:activeLink;
    if(!anchor)return;
    const region=submenuShell.parentElement.getBoundingClientRect();
    const anchorRect=anchor.getBoundingClientRect();
    const links=[...submenu.querySelectorAll('a')];
    const style=getComputedStyle(submenu);
    const gap=parseFloat(style.columnGap)||0;
    const contentWidth=links.reduce((sum,link)=>sum+link.getBoundingClientRect().width,0)+gap*(links.length-1)+parseFloat(style.paddingLeft)+parseFloat(style.paddingRight);
    const gutter=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gutter'))||22;
    const width=Math.min(Math.ceil(contentWidth),region.width-2*gutter);
    const height=Math.ceil(submenu.getBoundingClientRect().height);
    const anchorCenter=anchorRect.left+anchorRect.width/2-region.left;
    const menuCenter=Math.max(gutter+width/2,Math.min(anchorCenter,region.width-gutter-width/2));
    submenuShell.style.setProperty('--indicator-center',`${anchorCenter}px`);
    submenuShell.style.setProperty('--menu-center',`${menuCenter}px`);
    submenuShell.style.setProperty('--submenu-width',`${width}px`);
    submenuShell.style.setProperty('--submenu-height',`${height}px`);
  }
  function syncSubmenu(){
    const expanded=mobileSubmenu()
      ? !nav?.hasAttribute('data-open') && mobileSubmenuOpen
      : window.scrollY<24 || overHeader || overSubmenu || !!submenuHeader.querySelector(':focus-visible');
    submenuHeader.classList.toggle('is-expanded',expanded);
    submenuToggle?.setAttribute('aria-expanded',String(expanded));
    keepSubmenuAboveFooter();
  }
  function expandSubmenu(){if(mobileSubmenu())return;clearTimeout(closeTimer);submenuHeader.classList.add('is-expanded');keepSubmenuAboveFooter();}
  function scheduleCollapse(){clearTimeout(closeTimer);closeTimer=setTimeout(syncSubmenu,240);}
  headerBar.addEventListener('pointerenter',event=>{if(mobileSubmenu() || event.pointerType==='touch')return;overHeader=true;expandSubmenu();});
  headerBar.addEventListener('pointerleave',event=>{if(mobileSubmenu() || event.pointerType==='touch')return;overHeader=false;scheduleCollapse();});
  submenuShell.addEventListener('pointerenter',event=>{if(mobileSubmenu() || event.pointerType==='touch')return;overSubmenu=true;expandSubmenu();});
  submenuShell.addEventListener('pointerleave',event=>{if(mobileSubmenu() || event.pointerType==='touch')return;overSubmenu=false;scheduleCollapse();});
  submenuShell.addEventListener('click',()=>{if(!mobileSubmenu() && !submenuHeader.classList.contains('is-expanded'))expandSubmenu();});
  submenuToggle?.addEventListener('click',()=>{
    if(!mobileSubmenu())return;
    const expanded=submenuHeader.classList.contains('is-expanded');
    closeMenu();
    mobileSubmenuOpen=!expanded;
    mobileScrollIntent=undefined;
    syncSubmenu();
  });
  menu?.addEventListener('click',syncSubmenu);
  submenu.addEventListener('click',event=>{
    if(mobileSubmenu() && event.target.closest('a')){
      mobileSubmenuOpen=false;
      mobileScrollIntent=undefined;
      syncSubmenu();
    }
  });
  document.addEventListener('pointerdown',event=>{
    if(!submenuHeader.contains(event.target)){
      if(mobileSubmenu() && window.scrollY>=24){mobileSubmenuOpen=false;mobileScrollIntent=undefined;}
      if(window.scrollY>=24)syncSubmenu();
    }
  });
  document.addEventListener('touchstart',event=>{touchStartY=event.touches[0]?.clientY;},{passive:true});
  document.addEventListener('touchmove',event=>{
    if(!mobileSubmenu() || touchStartY===undefined)return;
    const delta=event.touches[0].clientY-touchStartY;
    if(delta<-12){mobileScrollIntent='down';if(mobileSubmenuOpen){mobileSubmenuOpen=false;syncSubmenu();}}
    else if(delta>12){mobileScrollIntent='up';if(window.scrollY<=4 && !mobileSubmenuOpen){mobileSubmenuOpen=true;mobileScrollIntent=undefined;syncSubmenu();}}
  },{passive:true});
  document.addEventListener('touchend',()=>{touchStartY=undefined;},{passive:true});
  window.addEventListener('wheel',event=>{
    if(!mobileSubmenu() || Math.abs(event.deltaY)<2)return;
    mobileScrollIntent=event.deltaY>0?'down':'up';
    if(mobileScrollIntent==='down' && mobileSubmenuOpen){mobileSubmenuOpen=false;syncSubmenu();}
    else if(mobileScrollIntent==='up' && window.scrollY<=4 && !mobileSubmenuOpen){mobileSubmenuOpen=true;mobileScrollIntent=undefined;syncSubmenu();}
  },{passive:true});
  document.addEventListener('keydown',event=>{
    if(!mobileSubmenu() || submenuHeader.contains(event.target) || event.target.closest('input, textarea, select'))return;
    if(['PageDown','ArrowDown','End',' '].includes(event.key)){mobileScrollIntent='down';if(mobileSubmenuOpen){mobileSubmenuOpen=false;syncSubmenu();}}
    else if(['Home','PageUp','ArrowUp'].includes(event.key))mobileScrollIntent='up';
  });
  submenuHeader.addEventListener('focusin',expandSubmenu);
  submenuHeader.addEventListener('focusout',()=>queueMicrotask(syncSubmenu));
  alignSubmenu();
  submenuHeader.classList.add('is-ready');
  syncSubmenu();
  window.addEventListener('scroll',()=>{
    if(mobileSubmenu() && mobileScrollIntent==='up' && window.scrollY<=4){mobileSubmenuOpen=true;mobileScrollIntent=undefined;}
    syncSubmenu();
  },{passive:true});
  let wasMobile=mobileSubmenu();
  window.addEventListener('resize',()=>{
    const isMobile=mobileSubmenu();
    if(isMobile!==wasMobile){mobileSubmenuOpen=window.scrollY<24;mobileScrollIntent=undefined;wasMobile=isMobile;}
    alignSubmenu();syncSubmenu();
  });
  window.addEventListener('load',()=>{alignSubmenu();syncSubmenu();});
  document.fonts?.ready.then(alignSubmenu);
}

const publicationLists=[...document.querySelectorAll('.publication-list--with-images')];
if(publicationLists.length){
  const cards=publicationLists.flatMap(list=>[...list.querySelectorAll('.publication--visual')]);
  let pending=false;
  function highlightCenteredPublication(){
    pending=false;
    const center=window.innerHeight/2;
    let selected=null;
    let distance=Infinity;
    for(const card of cards){
      const rect=card.getBoundingClientRect();
      if(rect.bottom<=0 || rect.top>=window.innerHeight)continue;
      const current=Math.abs((rect.top+rect.bottom)/2-center);
      if(current<distance){selected=card;distance=current;}
    }
    const active=cards.find(card=>card.classList.contains('is-centered'));
    if(active && selected && active!==selected){
      const rect=active.getBoundingClientRect();
      const activeDistance=Math.abs((rect.top+rect.bottom)/2-center);
      if(rect.bottom>0 && rect.top<window.innerHeight && activeDistance<distance+18)selected=active;
    }
    const selectedIndex=cards.indexOf(selected);
    for(const [index,card] of cards.entries()){
      card.classList.toggle('is-centered',index===selectedIndex);
      card.classList.toggle('is-before-centered',selectedIndex>=0 && index===selectedIndex-1);
      card.classList.toggle('is-after-centered',selectedIndex>=0 && index===selectedIndex+1);
    }
  }
  function scheduleHighlight(){
    if(pending)return;
    pending=true;
    requestAnimationFrame(highlightCenteredPublication);
  }
  publicationLists.forEach(list=>list.classList.add('is-scroll-ready'));
  scheduleHighlight();
  window.addEventListener('scroll',scheduleHighlight,{passive:true});
  window.addEventListener('resize',scheduleHighlight);
  window.addEventListener('load',scheduleHighlight);
}

const scrollTransitions=[...document.querySelectorAll('[data-scroll-transition]')];
if(scrollTransitions.length){
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let previousScrollY=window.scrollY;
  let scrollingUp=false;
  let frame;
  function updateScrollTransitions(){
    frame=undefined;
    const scrollY=window.scrollY;
    if(Math.abs(scrollY-previousScrollY)>2){
      scrollingUp=scrollY<previousScrollY;
      previousScrollY=scrollY;
    }
    const viewport=window.innerHeight;
    const headerBottom=document.querySelector('.site-header')?.getBoundingClientRect().bottom||0;
    for(const transition of scrollTransitions){
      transition.classList.toggle('is-scrolling-up',scrollingUp);
      if(reducedMotion)continue;
      const rect=transition.getBoundingClientRect();
      const fullLength=rect.height-64;
      const progress=scrollingUp
        ? Math.max(0,Math.min(1,(rect.bottom-headerBottom)/rect.height))
        : Math.max(0,Math.min(1,(viewport-rect.top)/rect.height));
      transition.style.setProperty('--arrow-length',`${Math.round(fullLength-(fullLength-28)*progress*progress)}px`);
    }
  }
  function scheduleScrollTransitions(){
    if(frame===undefined)frame=requestAnimationFrame(updateScrollTransitions);
  }
  updateScrollTransitions();
  window.addEventListener('scroll',scheduleScrollTransitions,{passive:true});
  window.addEventListener('resize',scheduleScrollTransitions);
}

const exploreCtas=[...document.querySelectorAll('.super-button')];
if(exploreCtas.length){
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries)entry.target.classList.toggle('is-visible',entry.isIntersecting);
    });
    exploreCtas.forEach(cta=>observer.observe(cta));
  }else exploreCtas.forEach(cta=>cta.classList.add('is-visible'));
}

for(const slideshow of document.querySelectorAll('[data-capability-slideshow]')){
  const slides=[...slideshow.querySelectorAll('[data-capability-slide]')];
  if(slides.length<2)continue;
  const controls=slideshow.querySelector('[data-capability-controls]');
  const count=controls?.querySelector('[data-capability-count]');
  let currentSlide=0;
  let slideshowVisible=false;
  let slideshowTimer;
  let manualPauseUntil=0;
  let resumeTimer;
  let touchStart;
  function showSlide(index){
    currentSlide=(index+slides.length)%slides.length;
    slides.forEach((slide,i)=>{
      const active=i===currentSlide;
      slide.classList.toggle('is-active',active);
      slide.setAttribute('aria-hidden',String(!active));
    });
    if(count)count.textContent=`${currentSlide+1} / ${slides.length}`;
  }
  function syncSlideshow(){
    clearInterval(slideshowTimer);
    if(Date.now()<manualPauseUntil || matchMedia('(prefers-reduced-motion: reduce)').matches || !slideshowVisible || document.hidden)return;
    slideshowTimer=setInterval(()=>showSlide((currentSlide+1)%slides.length),3000);
  }
  function navigateSlide(step){
    manualPauseUntil=Date.now()+8000;
    showSlide(currentSlide+step);
    syncSlideshow();
    clearTimeout(resumeTimer);
    resumeTimer=setTimeout(syncSlideshow,8050);
  }
  controls?.querySelector('[data-capability-previous]')?.addEventListener('click',()=>navigateSlide(-1));
  controls?.querySelector('[data-capability-next]')?.addEventListener('click',()=>navigateSlide(1));
  if(controls)controls.hidden=false;
  slideshow.addEventListener('touchstart',event=>{touchStart={x:event.changedTouches[0].clientX,y:event.changedTouches[0].clientY};},{passive:true});
  slideshow.addEventListener('touchend',event=>{
    if(!touchStart)return;
    const dx=event.changedTouches[0].clientX-touchStart.x;
    const dy=event.changedTouches[0].clientY-touchStart.y;
    touchStart=undefined;
    if(Math.abs(dx)>45 && Math.abs(dx)>Math.abs(dy)*1.2)navigateSlide(dx<0?1:-1);
  },{passive:true});
  if('IntersectionObserver' in window){
    new IntersectionObserver(entries=>{
      slideshowVisible=entries.at(-1).intersectionRatio>=.15;
      syncSlideshow();
    },{threshold:.15}).observe(slideshow);
  }else{
    slideshowVisible=true;
    syncSlideshow();
  }
  document.addEventListener('visibilitychange',syncSlideshow);
}

const tabs=[...document.querySelectorAll('.system-tabs [role=tab]')];
const systemTabs=document.querySelector('.system-tabs');
const systemTabHighlight=systemTabs?.querySelector('.system-tab-highlight');
const systemExplorer=document.querySelector('.system-explorer');
const tabRotationDelay=6500;
const extendedTabRotationDelay=9500;
let tabRotationTimer;
let tabRotationStopped=false;
let explorerVisible=false;
function positionSystemTabHighlight(tab=tabs.find(item=>item.getAttribute('aria-selected')==='true')){
  if(!systemTabHighlight || !tab)return;
  const width=tab.offsetWidth;
  const height=tab.offsetHeight;
  const flareWidth=Math.min(90,width*.32);
  const flareHeight=32;
  const corner=14;
  const curve=.55228475;
  const shoulder=width-flareWidth;
  const curveControlX=shoulder+flareWidth*curve;
  const tabBottom=flareHeight+height;
  const totalHeight=tabBottom+flareHeight;
  const shape=`M ${corner} ${flareHeight} H ${shoulder} C ${curveControlX} ${flareHeight} ${width} ${flareHeight*curve} ${width} 0 V ${totalHeight} C ${width} ${tabBottom+flareHeight*(1-curve)} ${curveControlX} ${tabBottom} ${shoulder} ${tabBottom} H ${corner} Q 0 ${tabBottom} 0 ${tabBottom-corner} V ${flareHeight+corner} Q 0 ${flareHeight} ${corner} ${flareHeight} Z`;
  systemTabHighlight.setAttribute('viewBox',`0 0 ${width} ${totalHeight}`);
  systemTabHighlight.querySelector('path').setAttribute('d',shape);
  systemTabHighlight.style.top=`${tab.offsetTop-flareHeight}px`;
  systemTabHighlight.style.height=`${totalHeight}px`;
}
positionSystemTabHighlight();
requestAnimationFrame(()=>systemTabs?.classList.add('is-ready'));
window.addEventListener('resize',()=>positionSystemTabHighlight());
function pauseTabRotation(){
  clearTimeout(tabRotationTimer);
  tabRotationTimer=undefined;
}
function stopTabRotation(){
  tabRotationStopped=true;
  pauseTabRotation();
}
function scheduleTabRotation(){
  pauseTabRotation();
  if(tabRotationStopped || !explorerVisible || document.hidden || tabs.length<2)return;
  const activeTab=tabs.find(tab=>tab.getAttribute('aria-selected')==='true');
  const delay=activeTab && ['tab-engine','tab-interfaces'].includes(activeTab.id)?extendedTabRotationDelay:tabRotationDelay;
  tabRotationTimer=setTimeout(()=>{
    const activeIndex=tabs.findIndex(tab=>tab.getAttribute('aria-selected')==='true');
    selectTab(tabs[(activeIndex+1)%tabs.length],false);
  },delay);
}
const erdDiagram=document.querySelector('[data-erd-diagram]');
let erdImage=erdDiagram?.querySelector('[data-erd-image]');
let erdObserver;
let erdVisible=false;
const engineDiagram=document.querySelector('[data-engine-diagram]');
const engineFlowHost=engineDiagram?.querySelector('[data-engine-flow]');
const engineFlowTemplate=engineDiagram?.querySelector('[data-engine-flow-template]');
let engineObserver;
let engineVisible=false;
const actorDiagram=document.querySelector('[data-actor-diagram]');
const actorSvg=actorDiagram?.querySelector('.actor-full-svg');
const actorNodes=[...(actorSvg?.querySelectorAll(':scope > [data-actor-node]') || [])];
let actorAnimations=[];
let actorRevealTimer;
const serviceDiagram=document.querySelector('[data-service-diagram]');
const serviceSvg=serviceDiagram?.querySelector('.service-full-svg');
const serviceNodes=[...(serviceSvg?.querySelectorAll(':scope > [data-service-node]') || [])];
let serviceAnimations=[];
let serviceRevealTimer;
const interfaceVideo=document.querySelector('[data-interface-video]');
const interfaceVideoPlay=document.querySelector('[data-interface-video-play]');
let interfaceVisible=true;
function startInterfaceVideo(){
  const playback=interfaceVideo.play();
  playback?.then(()=>{if(interfaceVideoPlay)interfaceVideoPlay.hidden=true;},()=>{if(interfaceVideoPlay)interfaceVideoPlay.hidden=false;});
}
function syncInterfaceVideo(){
  if(!interfaceVideo)return;
  if(document.hidden || !interfaceVisible || document.getElementById('tab-interfaces')?.getAttribute('aria-selected')!=='true'){
    interfaceVideo.pause();
    return;
  }
  startInterfaceVideo();
}
interfaceVideoPlay?.addEventListener('click',startInterfaceVideo);
document.addEventListener('visibilitychange',syncInterfaceVideo);
if(interfaceVideo && 'IntersectionObserver' in window){
  interfaceVisible=false;
  new IntersectionObserver(entries=>{
    interfaceVisible=entries.at(-1).intersectionRatio>=.1;
    syncInterfaceVideo();
  },{threshold:.1}).observe(interfaceVideo);
}
function stopActorReveal(){
  clearTimeout(actorRevealTimer);
  for(const animation of actorAnimations)animation.cancel();
  actorAnimations=[];
}
function revealActors(){
  stopActorReveal();
  if(!actorSvg || !actorNodes.length || matchMedia('(prefers-reduced-motion: reduce)').matches || !Element.prototype.animate)return;
  const origin=actorNodes.find(node=>node.dataset.actorName==='TWICO');
  if(!origin)return;
  const start=origin.getBBox();
  const startX=start.x+start.width/2;
  const startY=start.y+start.height/2;
  const actorWave=actorNodes.filter(node=>!['TWICO','Engine','Virtual Actor'].includes(node.dataset.actorName))
    .map(node=>({node,box:node.getBBox()}))
    .sort((a,b)=>a.box.x-b.box.x || a.box.y-b.box.y);
  const actorOrder=new Map(actorWave.map(({node},index)=>[node,index]));
  for(const node of actorNodes){
    if(node===origin)continue;
    const box=node.getBBox();
    const dx=startX-box.x-box.width/2;
    const dy=startY-box.y-box.height/2;
    const delay=node.dataset.actorName==='Engine'?80:node.dataset.actorName==='Virtual Actor'?350:760+actorOrder.get(node)*32;
    actorAnimations.push(node.animate([
      {opacity:0,transform:`translate(${dx}px, ${dy}px) scale(.2)`},
      {opacity:1,transform:'translate(0px, 0px) scale(1)'}
    ],{duration:600,delay,easing:'cubic-bezier(.2,.7,.2,1)',fill:'backwards'}));
  }
  actorRevealTimer=setTimeout(stopActorReveal,2100);
}
function stopServiceReveal(){
  clearTimeout(serviceRevealTimer);
  for(const animation of serviceAnimations)animation.cancel();
  serviceAnimations=[];
}
function revealServices(){
  stopServiceReveal();
  if(!serviceSvg || !serviceNodes.length || matchMedia('(prefers-reduced-motion: reduce)').matches || !Element.prototype.animate)return;
  const origin=serviceNodes.find(node=>node.dataset.serviceName==='TWICO');
  if(!origin)return;
  const start=origin.getBBox();
  const startX=start.x+start.width/2;
  const startY=start.y+start.height/2;
  const serviceWave=serviceNodes.filter(node=>!['TWICO','Engine','Services'].includes(node.dataset.serviceName))
    .map(node=>({node,box:node.getBBox()}))
    .sort((a,b)=>a.box.x-b.box.x || a.box.y-b.box.y);
  const serviceOrder=new Map(serviceWave.map(({node},index)=>[node,index]));
  for(const node of serviceNodes){
    if(node===origin)continue;
    const box=node.getBBox();
    const dx=startX-box.x-box.width/2;
    const dy=startY-box.y-box.height/2;
    const delay=node.dataset.serviceName==='Engine'?80:node.dataset.serviceName==='Services'?350:760+serviceOrder.get(node)*76;
    serviceAnimations.push(node.animate([
      {opacity:0,transform:`translate(${dx}px, ${dy}px) scale(.2)`},
      {opacity:1,transform:'translate(0px, 0px) scale(1)'}
    ],{duration:600,delay,easing:'cubic-bezier(.2,.7,.2,1)',fill:'backwards'}));
  }
  serviceRevealTimer=setTimeout(stopServiceReveal,2100);
}
function stopEngineFlow(){
  if(!engineFlowHost)return;
  engineVisible=false;
  engineFlowHost.replaceChildren();
}
function resetErd(){
  if(!erdObserver || !erdImage)return;
  erdVisible=false;
  erdImage.hidden=true;
  erdImage.removeAttribute('src');
}
function replayErd(){
  const fresh=erdImage.cloneNode(false);
  fresh.hidden=true;
  fresh.removeAttribute('src');
  erdImage.replaceWith(fresh);
  erdImage=fresh;
  fresh.src=fresh.dataset.animatedSrc;
  fresh.hidden=false;
}
function activateTab(tab){
  for(const t of tabs){
    const selected=t===tab;
    t.setAttribute('aria-selected',String(selected));
    t.tabIndex=selected?0:-1;
    document.getElementById(t.getAttribute('aria-controls')).hidden=!selected;
  }
  positionSystemTabHighlight(tab);
  if(erdObserver){
    erdObserver.unobserve(erdDiagram);
    resetErd();
    erdObserver.observe(erdDiagram);
  }
  if(engineObserver){
    engineObserver.unobserve(engineDiagram);
    stopEngineFlow();
    engineObserver.observe(engineDiagram);
  }
  if(tab.id==='tab-actors')revealActors();
  else stopActorReveal();
  if(tab.id==='tab-services')revealServices();
  else stopServiceReveal();
  syncInterfaceVideo();
}
let tabTransitioning=false;
let queuedTab;
let queuedTabManual=false;
async function selectTab(tab,manual=true){
  if(!tab)return;
  if(manual)stopTabRotation();
  if(tabTransitioning){queuedTab=tab;queuedTabManual=manual;return;}
  if(tab.getAttribute('aria-selected')==='true')return;
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!systemTabHighlight?.animate || reducedMotion){
    activateTab(tab);
    if(!manual)scheduleTabRotation();
    return;
  }
  tabTransitioning=true;
  systemTabs.classList.add('is-retracting');
  const retract=systemTabHighlight.animate([{transform:'scaleX(1)'},{transform:'scaleX(0)'}],{duration:280,easing:'cubic-bezier(.55,0,1,.45)',fill:'forwards'});
  await retract.finished;
  systemTabHighlight.style.transform='scaleX(0)';
  retract.cancel();
  systemTabs.classList.remove('is-retracting');
  activateTab(tab);
  const expand=systemTabHighlight.animate([{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:360,easing:'cubic-bezier(0,.55,.2,1)',fill:'forwards'});
  await expand.finished;
  systemTabHighlight.style.transform='';
  expand.cancel();
  tabTransitioning=false;
  if(queuedTab && queuedTab!==tab){
    const next=queuedTab;
    const nextManual=queuedTabManual;
    queuedTab=undefined;
    queuedTabManual=false;
    selectTab(next,nextManual);
  }else{
    queuedTab=undefined;
    queuedTabManual=false;
    if(!manual)scheduleTabRotation();
  }
}
for(const tab of tabs){tab.addEventListener('click',()=>selectTab(tab));tab.addEventListener('keydown',event=>{const i=tabs.indexOf(tab);let next;if(['ArrowRight','ArrowDown'].includes(event.key))next=(i+1)%tabs.length;if(['ArrowLeft','ArrowUp'].includes(event.key))next=(i+tabs.length-1)%tabs.length;if(event.key==='Home')next=0;if(event.key==='End')next=tabs.length-1;if(next!==undefined){event.preventDefault();selectTab(tabs[next]);tabs[next].focus();}});}
if(systemExplorer && tabs.length>1 && !matchMedia('(prefers-reduced-motion: reduce)').matches){
  if('IntersectionObserver' in window){
    new IntersectionObserver(entries=>{
      explorerVisible=entries.at(-1).intersectionRatio>=.15;
      scheduleTabRotation();
    },{threshold:.15}).observe(systemExplorer);
  }else{
    explorerVisible=true;
    scheduleTabRotation();
  }
  document.addEventListener('visibilitychange',scheduleTabRotation);
  window.addEventListener('resize',scheduleTabRotation);
}
const threadDiagram=document.querySelector('[data-thread-diagram]');
if(threadDiagram && 'IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches){
  threadDiagram.classList.add('is-pending');
  const threadObserver=new IntersectionObserver(entries=>{
    if(entries.some(entry=>entry.isIntersecting)){
      threadDiagram.classList.remove('is-pending');
      threadDiagram.classList.add('is-building');
      threadObserver.disconnect();
    }
  },{threshold:.15});
  threadObserver.observe(threadDiagram);
}

if(erdImage){
  if(!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches){
    erdImage.src=erdImage.dataset.staticSrc;
    erdImage.hidden=false;
  }else{
    erdObserver=new IntersectionObserver(entries=>{
      const visible=entries.at(-1).intersectionRatio>=.15;
      if(visible && !erdVisible){erdVisible=true;replayErd();}
      else if(!visible && erdVisible)resetErd();
    },{threshold:.15});
    erdObserver.observe(erdDiagram);
  }
}

if(engineFlowHost && engineFlowTemplate && 'IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches){
  engineObserver=new IntersectionObserver(entries=>{
    const visible=entries.at(-1).intersectionRatio>=.15 && !document.hidden;
    if(visible && !engineVisible){
      engineVisible=true;
      engineFlowHost.replaceChildren(engineFlowTemplate.content.cloneNode(true));
    }else if(!visible && engineVisible)stopEngineFlow();
  },{threshold:.15});
  engineObserver.observe(engineDiagram);
  document.addEventListener('visibilitychange',()=>{
    engineObserver.unobserve(engineDiagram);
    stopEngineFlow();
    engineObserver.observe(engineDiagram);
  });
}

for(const flowDiagram of document.querySelectorAll('[data-services-focus-diagram], [data-agent-flow-diagram], [data-optimization-graph-diagram]')){
  const flowHost=flowDiagram.querySelector('[data-services-focus-flow], [data-agent-flow-host], [data-optimization-graph-host]');
  const flowTemplate=flowDiagram.querySelector('[data-services-focus-flow-template], [data-agent-flow-template], [data-optimization-graph-template]');
  if(!flowHost || !flowTemplate)continue;
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let visible=false;
  const syncFlow=()=>{
    if(visible && !document.hidden && !reducedMotion.matches){
      if(!flowHost.firstChild)flowHost.replaceChildren(flowTemplate.content.cloneNode(true));
    }else flowHost.replaceChildren();
  };
  if('IntersectionObserver' in window){
    new IntersectionObserver(entries=>{visible=entries.at(-1).intersectionRatio>=.15;syncFlow();},{threshold:.15}).observe(flowDiagram);
  }else visible=true;
  document.addEventListener('visibilitychange',syncFlow);
  reducedMotion.addEventListener?.('change',syncFlow);
  syncFlow();
}

function spreadSvgNodes(nodes,active){
  const center=active?.getBBox();
  const ax=center?center.x+center.width/2:0;
  const ay=center?center.y+center.height/2:0;
  for(const node of nodes){
    node.classList.toggle('is-active',node===active);
    if(!active || node===active){node.style.removeProperty('--push-x');node.style.removeProperty('--push-y');continue;}
    const box=node.getBBox();
    const dx=box.x+box.width/2-ax;
    const dy=box.y+box.height/2-ay;
    const distance=Math.hypot(dx,dy)||1;
    const strength=Math.max(0,1-distance/320)*20;
    node.style.setProperty('--push-x',`${(dx/distance*strength).toFixed(1)}px`);
    node.style.setProperty('--push-y',`${(dy/distance*strength).toFixed(1)}px`);
  }
}
function wireSvgDiagram(diagram,nodes,kind){
  if(!diagram)return;
  const status=diagram.querySelector(`[data-${kind}-selection]`);
  const selected=()=>nodes.find(node=>node.getAttribute('aria-pressed')==='true');
  function activate(node){
    const wasSelected=node?.getAttribute('aria-pressed')==='true';
    for(const item of nodes)item.setAttribute('aria-pressed',String(!wasSelected && item===node));
    status.textContent=!node || wasSelected?'Select an icon to see its category.':`${node.dataset[`${kind}Name`]} · ${node.dataset[`${kind}Group`]}`;
    spreadSvgNodes(nodes,!node || wasSelected?null:node);
  }
  for(const node of nodes){
    node.addEventListener('pointerenter',()=>spreadSvgNodes(nodes,node));
    node.addEventListener('pointerleave',()=>spreadSvgNodes(nodes,selected()));
    node.addEventListener('focus',()=>spreadSvgNodes(nodes,node));
    node.addEventListener('blur',()=>spreadSvgNodes(nodes,selected()));
    node.addEventListener('click',()=>activate(node));
    node.addEventListener('keydown',event=>{
      if(event.key==='Enter' || event.key===' '){event.preventDefault();activate(node);}
    });
  }
}
wireSvgDiagram(actorDiagram,actorNodes,'actor');
wireSvgDiagram(serviceDiagram,serviceNodes,'service');

const robotHost=document.querySelector('[data-robot-scene]');
if(robotHost)import('./robot-scene.js').then(module=>module.mountRobotScene(robotHost)).catch(error=>{robotHost.dataset.robotState='fallback';console.warn('Robot animation unavailable; displaying its still image.',error);});

const dialog=document.querySelector('#video-dialog');
let videoTrigger;
for(const button of document.querySelectorAll('[data-video]'))button.addEventListener('click',()=>{videoTrigger=button;const url=new URL(button.dataset.video);if(!['www.youtube-nocookie.com','player.vimeo.com'].includes(url.hostname)||url.protocol!=='https:')return;document.querySelector('#video-title').textContent=button.dataset.title;const source=document.querySelector('#video-source');source.href=button.dataset.url;const frame=document.createElement('iframe');frame.src=url.href;frame.title=button.dataset.title;frame.allow='encrypted-media; fullscreen; picture-in-picture';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';document.querySelector('#video-container').replaceChildren(frame);dialog.showModal();});
dialog?.querySelector('.dialog-close')?.addEventListener('click',()=>dialog.close());
dialog?.addEventListener('click',event=>{if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();}});
dialog?.addEventListener('close',()=>{document.querySelector('#video-container').replaceChildren();videoTrigger?.focus();});

const vitaeLink=document.querySelector('#main-nav a[download]');
const vitaeDialog=document.querySelector('#vitae-dialog');
vitaeLink?.addEventListener('click',event=>{
  if(event.defaultPrevented || event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !vitaeDialog?.showModal)return;
  // Let the link's normal download action run before showing the message.
  setTimeout(()=>{if(!vitaeDialog.open)vitaeDialog.showModal();},0);
});
vitaeDialog?.querySelector('.vitae-dialog-close')?.addEventListener('click',()=>vitaeDialog.close());
vitaeDialog?.addEventListener('click',event=>{
  if(event.target!==vitaeDialog)return;
  const box=vitaeDialog.getBoundingClientRect();
  if(event.clientX<box.left || event.clientX>box.right || event.clientY<box.top || event.clientY>box.bottom)vitaeDialog.close();
});
vitaeDialog?.addEventListener('close',()=>{
  (vitaeLink?.getClientRects().length ? vitaeLink : menu)?.focus();
});

const imageDialog=document.querySelector('#image-dialog');
const imageDialogImage=document.querySelector('#image-dialog-image');
let imageTrigger;
document.addEventListener('click',event=>{
  const link=event.target.closest('a[data-image-fullsize]');
  if(!link || !imageDialog || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)return;
  event.preventDefault();
  imageTrigger=link;
  imageDialogImage.src=link.href;
  imageDialogImage.alt=link.querySelector('img')?.alt || link.closest('figure')?.getAttribute('aria-label') || 'Full-size image';
  imageDialog.showModal();
});
imageDialog?.querySelector('.dialog-close')?.addEventListener('click',()=>imageDialog.close());
imageDialog?.addEventListener('click',event=>{
  if(event.target!==imageDialog)return;
  const box=imageDialog.getBoundingClientRect();
  if(event.clientX<box.left || event.clientX>box.right || event.clientY<box.top || event.clientY>box.bottom)imageDialog.close();
});
imageDialog?.addEventListener('close',()=>{imageDialogImage.removeAttribute('src');imageTrigger?.focus();});

const satelliteGallery=document.querySelector('[data-satellite-gallery]');
if(satelliteGallery){
  const satelliteCards=[...satelliteGallery.querySelectorAll('[data-satellite-card]')];
  const satellitePage=satelliteGallery.closest('.satellite-page');
  const satelliteTrack=satelliteGallery.querySelector('[data-satellite-track]');
  const previewStacks=[...satelliteGallery.querySelectorAll('.satellite-preview-stack')];
  const previewButtons=[...satelliteGallery.querySelectorAll('[data-satellite-preview]')];
  const controls=satellitePage.querySelector('[data-satellite-controls]');
  const jumpButtons=[...controls.querySelectorAll('[data-satellite-jump]')];
  let current=0;
  let initialized=false;
  let activeTransition;
  const wrap=index=>(index+satelliteCards.length)%satelliteCards.length;
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  function updateSatelliteUI(){
    for(const button of previewButtons){
      const neighbor=wrap(current+Number(button.dataset.offset));
      const card=satelliteCards[neighbor];
      button.querySelector('img').src=card.querySelector('.satellite-card-media img').src;
      button.setAttribute('aria-label',`Show ${card.querySelector('h2').textContent}`);
      button.dataset.projectIndex=neighbor;
    }
    controls.querySelector('[data-satellite-count]').textContent=`${String(current+1).padStart(2,'0')} / ${String(satelliteCards.length).padStart(2,'0')}`;
    jumpButtons.forEach((button,i)=>button.setAttribute('aria-current',i===current?'true':'false'));
  }
  function finishSatelliteTransition(){
    if(!activeTransition)return;
    const {oldCard,animations}=activeTransition;
    oldCard.hidden=true;
    oldCard.classList.remove('is-exiting');
    satelliteTrack.style.height='';
    animations.forEach(animation=>animation.cancel());
    activeTransition=undefined;
  }
  function showSatellite(index){
    const next=wrap(index);
    if(initialized && next===current)return;
    finishSatelliteTransition();
    if(!initialized || reducedMotion.matches || !satelliteCards[0].animate){
      current=next;
      satelliteCards.forEach((card,i)=>{card.hidden=i!==current;});
      updateSatelliteUI();
      initialized=true;
      return;
    }
    const oldCard=satelliteCards[current];
    const newCard=satelliteCards[next];
    const forward=wrap(next-current);
    const direction=forward<=satelliteCards.length/2?1:-1;
    const oldHeight=oldCard.getBoundingClientRect().height;
    satelliteTrack.style.height=`${oldHeight}px`;
    oldCard.classList.add('is-exiting');
    newCard.hidden=false;
    const newHeight=newCard.getBoundingClientRect().height;
    current=next;
    updateSatelliteUI();
    const options={duration:460,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'};
    const animations=[
      oldCard.animate([{opacity:1,transform:'translateX(0) scale(1)'},{opacity:0,transform:`translateX(${-42*direction}px) scale(.98)`}],options),
      newCard.animate([{opacity:0,transform:`translateX(${42*direction}px) scale(.98)`},{opacity:1,transform:'translateX(0) scale(1)'}],options),
      satelliteTrack.animate([{height:`${oldHeight}px`},{height:`${newHeight}px`}],options),
      ...previewStacks.map(stack=>stack.animate([{opacity:.25},{opacity:1}],options))
    ];
    const transition={oldCard,animations};
    activeTransition=transition;
    Promise.allSettled(animations.map(animation=>animation.finished)).then(()=>{
      if(activeTransition===transition)finishSatelliteTransition();
    });
  }
  satelliteGallery.classList.add('is-enhanced');
  previewStacks.forEach(stack=>stack.hidden=false);
  controls.hidden=false;
  previewButtons.forEach(button=>button.addEventListener('click',()=>showSatellite(Number(button.dataset.projectIndex))));
  controls.querySelector('[data-satellite-previous]').addEventListener('click',()=>showSatellite(current-1));
  controls.querySelector('[data-satellite-next]').addEventListener('click',()=>showSatellite(current+1));
  jumpButtons.forEach(button=>button.addEventListener('click',()=>showSatellite(Number(button.dataset.satelliteJump))));
  let wheelDelta=0;
  let lastWheelNavigation=-Infinity;
  for(const frame of satelliteGallery.querySelectorAll('.satellite-card-media .media-frame')){
    frame.addEventListener('wheel',event=>{
      if(event.ctrlKey||event.metaKey)return;
      const delta=Math.abs(event.deltaY)>=Math.abs(event.deltaX)?event.deltaY:event.deltaX;
      if(!delta)return;
      event.preventDefault();
      const now=performance.now();
      if(now-lastWheelNavigation<540)return;
      wheelDelta+=delta*(event.deltaMode===1?16:event.deltaMode===2?window.innerHeight:1);
      if(Math.abs(wheelDelta)<40)return;
      showSatellite(current+(wheelDelta>0?1:-1));
      wheelDelta=0;
      lastWheelNavigation=now;
    },{passive:false});
    frame.addEventListener('pointerleave',()=>{wheelDelta=0;});
  }
  satellitePage.addEventListener('keydown',event=>{
    if(event.altKey||event.ctrlKey||event.metaKey||['INPUT','TEXTAREA'].includes(event.target.tagName))return;
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
      event.preventDefault();
      showSatellite(current+(event.key==='ArrowRight'?1:-1));
    }
  });
  let touchStart;
  satelliteGallery.addEventListener('touchstart',event=>{touchStart={x:event.changedTouches[0].clientX,y:event.changedTouches[0].clientY};},{passive:true});
  satelliteGallery.addEventListener('touchend',event=>{
    if(!touchStart)return;
    const dx=event.changedTouches[0].clientX-touchStart.x;
    const dy=event.changedTouches[0].clientY-touchStart.y;
    if(Math.abs(dx)>55 && Math.abs(dx)>Math.abs(dy)*1.4)showSatellite(current+(dx<0?1:-1));
    touchStart=undefined;
  },{passive:true});
  showSatellite(0);
}

function diagramScroller(animation,labels,onSelect){
  const figure=animation.parentElement;
  const controls=figure.querySelector('[data-diagram-scroller]');
  if(!controls)return {update(){},show(){}};
  const captions=[...figure.querySelectorAll('[data-diagram-caption-item]')];
  figure.classList.add('is-diagram-enhanced');
  const range=controls.querySelector('[data-diagram-range]');
  const previous=controls.querySelector('[data-diagram-previous]');
  const next=controls.querySelector('[data-diagram-next]');
  const count=controls.querySelector('[data-diagram-count]');
  let shown=-1;
  const update=index=>{
    if(index===shown)return;
    shown=index;
    range.value=String(index+1);
    range.style.setProperty('--diagram-progress',`${index/(labels.length-1)*100}%`);
    range.setAttribute('aria-valuetext',`${index+1} of ${labels.length}: ${labels[index]}`);
    previous.disabled=index===0;
    next.disabled=index===labels.length-1;
    count.textContent=`${String(index+1).padStart(2,'0')} / ${String(labels.length).padStart(2,'0')}`;
    captions.forEach((caption,captionIndex)=>caption.classList.toggle('is-current',captionIndex===index));
  };
  range.addEventListener('input',()=>onSelect(Number(range.value)-1));
  previous.addEventListener('click',()=>onSelect(Math.max(0,shown-1)));
  next.addEventListener('click',()=>onSelect(Math.min(labels.length-1,shown+1)));
  update(0);
  return {update,show:visible=>{controls.hidden=!visible;}};
}

const handoffAnimation=document.querySelector('[data-handoff-animation]');
if(handoffAnimation){
  const section=handoffAnimation.closest('#handoff');
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const duration=10500;
  const timing={duration,iterations:Infinity,fill:'both',easing:'linear'};
  let animations=[];
  let observer;
  let sectionVisible=false;
  let manualIndex=null;
  let scrollerTimer;
  const scroller=diagramScroller(handoffAnimation,['Digital to physical handoff','Unified task structure'],index=>{
    if(manualIndex===null){animations.forEach(animation=>animation.cancel());animations=[];}
    manualIndex=index;
    handoffAnimation.classList.add('is-manual');
    handoffAnimation.querySelectorAll('.handoff-scene').forEach((scene,sceneIndex)=>scene.classList.toggle('is-selected',sceneIndex===index));
    scroller.update(index);
  });
  const animate=(selector,keyframes)=>{
    for(const element of handoffAnimation.querySelectorAll(selector)){
      const animation=element.animate(keyframes,timing);
      animation.pause();
      animations.push(animation);
    }
  };
  const reveal=(start,end,hold,hide)=>[
    {opacity:0,offset:0},{opacity:0,offset:start},{opacity:1,offset:end},
    {opacity:1,offset:hold},{opacity:0,offset:hide},{opacity:0,offset:1}
  ];
  const line=(start,end)=>[
    {opacity:0,strokeDashoffset:'40',offset:0},{opacity:0,strokeDashoffset:'40',offset:start},
    {opacity:1,strokeDashoffset:'0',offset:end},{opacity:1,strokeDashoffset:'0',offset:.82},
    {opacity:0,strokeDashoffset:'40',offset:.88},{opacity:0,strokeDashoffset:'40',offset:1}
  ];
  const updatePlayback=()=>{for(const animation of animations)sectionVisible&&!document.hidden&&manualIndex===null?animation.play():animation.pause();};
  const clear=()=>{observer?.disconnect();observer=undefined;clearInterval(scrollerTimer);animations.forEach(animation=>animation.cancel());animations=[];sectionVisible=false;};
  const setup=()=>{
    clear();
    manualIndex=null;
    handoffAnimation.classList.remove('is-manual');
    handoffAnimation.querySelectorAll('.handoff-scene').forEach(scene=>scene.classList.remove('is-selected'));
    scroller.update(0);
    scroller.show(true);
    if(reducedMotion.matches || typeof handoffAnimation.animate!=='function'){
      manualIndex=0;
      handoffAnimation.classList.add('is-manual');
      handoffAnimation.querySelector('.handoff-scene--first').classList.add('is-selected');
      return;
    }
    animate('.handoff-scene--first',[
      {opacity:1,offset:0},{opacity:1,offset:.42},{opacity:0,offset:.49},
      {opacity:0,offset:.89},{opacity:1,offset:.96},{opacity:1,offset:1}
    ]);
    animate('.handoff-scene--second',[
      {opacity:0,offset:0},{opacity:0,offset:.42},{opacity:1,offset:.49},
      {opacity:1,offset:.89},{opacity:0,offset:.96},{opacity:0,offset:1}
    ]);
    // SVG 01 stores execution before sequencing; reveal them in reading order.
    animate('.handoff-svg--first > g:nth-of-type(1)',reveal(.02,.07,.82,.88));
    animate('.handoff-svg--first > line:nth-of-type(2)',line(.08,.12));
    animate('.handoff-svg--first > g:nth-of-type(2)',reveal(.13,.18,.82,.88));
    animate('.handoff-svg--first > line:nth-of-type(3)',line(.19,.23));
    animate('.handoff-svg--first > g:nth-of-type(4)',reveal(.24,.29,.82,.88));
    animate('.handoff-svg--first > line:nth-of-type(4)',line(.30,.34));
    animate('.handoff-svg--first > g:nth-of-type(3)',reveal(.33,.37,.82,.88));
    // SVG 05: outer categories, then the inner details, then the connected surroundings.
    animate('.handoff-svg--second #Layer_7, .handoff-svg--second #Layer_5 > text:nth-of-type(n+17), .handoff-svg--second #Layer_5 > g:nth-of-type(n+4):nth-of-type(-n+6)',reveal(.50,.57,.87,.95));
    animate('.handoff-svg--second #Layer_4, .handoff-svg--second #Layer_6 > g > :not(rect), .handoff-svg--second #Layer_5 > text:nth-of-type(-n+15)',reveal(.59,.66,.87,.95));
    animate('.handoff-svg--second #Layer_1, .handoff-svg--second #Layer_5 > g:nth-of-type(-n+3)',reveal(.68,.75,.87,.95));
    scrollerTimer=setInterval(()=>{
      if(!sectionVisible||manualIndex!==null||!animations.length)return;
      const time=(Number(animations[0].currentTime)||0)%duration;
      scroller.update(time>=duration*.49&&time<duration*.96?1:0);
    },120);
    if('IntersectionObserver' in window){
      observer=new IntersectionObserver(entries=>{
        const visible=entries.some(entry=>entry.isIntersecting);
        if(sectionVisible&&!visible&&manualIndex!==null){setup();return;}
        sectionVisible=visible;
        updatePlayback();
      },{threshold:0});
      observer.observe(section);
    }else{sectionVisible=true;updatePlayback();}
  };
  document.addEventListener('visibilitychange',updatePlayback);
  reducedMotion.addEventListener?.('change',setup);
  setup();
}

const threadAnimation=document.querySelector('[data-thread-animation]');
if(threadAnimation){
  const section=threadAnimation.closest('#thread');
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const scenes=Object.fromEntries([...threadAnimation.querySelectorAll('[data-thread-scene]')].map(scene=>[scene.dataset.threadScene,scene]));
  const bands=[...threadAnimation.querySelectorAll('[data-thread-band]')].map(rect=>({rect,x:Number(rect.getAttribute('x')),width:Number(rect.getAttribute('width'))}));
  const patches=[...scenes.chart.querySelectorAll('.thread-svg--chart > g[id^="patch_"]')];
  const chartTexts=[...scenes.chart.querySelectorAll('.thread-svg--chart > text')];
  // The SVG stores guides and wedges in matching order, but its callout texts are rearranged.
  const labelOrder=[5,4,2,1,3,0,11,10,9,8,7,6];
  const numberOrder=[10,9,11,2,3,1,0,5,4,6,8,7];
  const chartGroups=labelOrder.map((labelIndex,index)=>[patches[index],patches[index+12],chartTexts[labelIndex],chartTexts[12+numberOrder[index]]]);
  const flowStages=[0,1,2,3,3,2,1,0];
  const flowStageStarts=[0,700,1650,2350];
  const flowStageDurations=[700,950,700,600];
  const totalsTexts=[...scenes.totals.querySelectorAll('.thread-svg--totals > text')];
  const numbers=totalsTexts.slice(11,22).map(text=>{
    const span=text.querySelector('tspan');
    const final=span?.textContent.trim() || '0';
    return {span,final,value:Number(final),decimals:final.split('.')[1]?.length || 0};
  });
  const duration=11700;
  const clamp=value=>Math.min(1,Math.max(0,value));
  const ease=value=>1-Math.pow(1-clamp(value),3);
  let elapsed=0;
  let lastTimestamp;
  let frameId;
  let sectionVisible=false;
  let manualIndex=null;
  let scroller;
  const render=time=>{
    const t=time%duration;
    scroller?.update(t<4400?0:t<8100?1:2);
    scenes.flow.style.opacity=t<4400?1:0;
    scenes.chart.style.opacity=t>=4400&&t<8100?1:0;
    scenes.totals.style.opacity=t>=8100?1:0;
    const flowTime=t+100;
    bands.forEach(({rect,x,width},index)=>{
      const stage=flowStages[index];
      const amount=width*clamp((flowTime-flowStageStarts[stage])/flowStageDurations[stage]);
      rect.setAttribute('width',amount.toFixed(2));
      if(index>=4)rect.setAttribute('x',(x+width-amount).toFixed(2));
    });
    for(let index=0;index<chartGroups.length;index++){
      const opacity=t>=4400+index*230?1:0;
      for(const element of chartGroups[index])if(element)element.style.opacity=opacity;
    }
    const progress=ease((t-8100)/1500);
    for(const {span,final,value,decimals} of numbers){
      if(span)span.textContent=progress===1?final:decimals?(value*progress).toFixed(decimals):String(Math.round(value*progress));
    }
  };
  const tick=timestamp=>{
    if(lastTimestamp!==undefined)elapsed+=timestamp-lastTimestamp;
    lastTimestamp=timestamp;
    render(elapsed);
    frameId=requestAnimationFrame(tick);
  };
  const updatePlayback=()=>{
    const shouldPlay=sectionVisible&&!document.hidden&&!reducedMotion.matches&&manualIndex===null;
    if(shouldPlay && frameId===undefined){lastTimestamp=undefined;frameId=requestAnimationFrame(tick);}
    if(!shouldPlay && frameId!==undefined){cancelAnimationFrame(frameId);frameId=undefined;lastTimestamp=undefined;}
  };
  const showCompleteFigures=()=>{
    bands.forEach(({rect,x,width})=>{rect.setAttribute('x',x);rect.setAttribute('width',width);});
    [...patches,...chartTexts].forEach(element=>element.style.removeProperty('opacity'));
    numbers.forEach(({span,final})=>{if(span)span.textContent=final;});
  };
  scroller=diagramScroller(threadAnimation,['Design and fabrication links','Task types','Fabrication totals'],index=>{
    manualIndex=index;
    updatePlayback();
    showCompleteFigures();
    threadAnimation.classList.add('is-manual');
    Object.values(scenes).forEach((scene,sceneIndex)=>scene.classList.toggle('is-selected',sceneIndex===index));
    scroller.update(index);
  });
  const updateMotion=()=>{
    manualIndex=null;
    threadAnimation.classList.remove('is-manual');
    Object.values(scenes).forEach(scene=>scene.classList.remove('is-selected'));
    scroller.show(true);
    scroller.update(0);
    if(reducedMotion.matches){
      manualIndex=0;
      updatePlayback();
      threadAnimation.classList.remove('is-animated');
      threadAnimation.classList.add('is-manual');
      scenes.flow.classList.add('is-selected');
      Object.values(scenes).forEach(scene=>scene.style.removeProperty('opacity'));
      showCompleteFigures();
    }else{
      elapsed=0;
      threadAnimation.classList.add('is-animated');
      render(0);
      updatePlayback();
    }
  };
  if('IntersectionObserver' in window){
    new IntersectionObserver(entries=>{
      const visible=entries.some(entry=>entry.isIntersecting);
      if(sectionVisible&&!visible&&manualIndex!==null&&!reducedMotion.matches){
        manualIndex=null;
        threadAnimation.classList.remove('is-manual');
        Object.values(scenes).forEach(scene=>scene.classList.remove('is-selected'));
        elapsed=0;
        render(0);
      }
      sectionVisible=visible;
      updatePlayback();
    },{threshold:0}).observe(section);
  }else sectionVisible=true;
  document.addEventListener('visibilitychange',updatePlayback);
  reducedMotion.addEventListener?.('change',updateMotion);
  updateMotion();
}

const systemAnimation=document.querySelector('[data-system-animation]');
if(systemAnimation){
  const section=systemAnimation.closest('#architecture');
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const names=['sequence','patterns','engine','overview'];
  const scenes=Object.fromEntries(names.map(name=>[name,systemAnimation.querySelector(`[data-system-scene="${name}"]`)]));
  const svgNamespace='http://www.w3.org/2000/svg';
  const svgElement=(name,attributes={})=>{
    const element=document.createElementNS(svgNamespace,name);
    for(const [key,value] of Object.entries(attributes))element.setAttribute(key,String(value));
    return element;
  };
  const clamp=value=>Math.min(1,Math.max(0,value));
  const sequenceSvg=scenes.sequence.querySelector('svg');
  const sequenceNodes=[...sequenceSvg.querySelectorAll('circle.system-sequence-cls-2,circle.system-sequence-cls-3')]
    .filter(element=>Number(element.getAttribute('cx'))<820)
    .map(element=>({element,x:Number(element.getAttribute('cx')),y:Number(element.getAttribute('cy')),color:element.classList.contains('system-sequence-cls-2')?'blue':'orange'}));
  for(const node of sequenceNodes){
    const layer=Math.round((node.x-158.61)/123.95);
    const above=sequenceNodes.filter(other=>other.x===node.x&&other.color===node.color&&other.y<node.y).length;
    node.time=260+layer*870+above*350;
  }
  const nearestSequenceNode=(x,y)=>sequenceNodes.reduce((nearest,node)=>{
    const distance=Math.hypot(node.x-x,node.y-y);
    return distance<nearest.distance?{node,distance}:nearest;
  },{node:null,distance:Infinity}).node;
  const sequenceLabels=[...sequenceSvg.querySelectorAll('text')].map(element=>{
    const position=element.getAttribute('transform')?.match(/translate\(([-\d.]+)\s+([-\d.]+)/);
    if(!position || Number(position[1])>820)return null; // Actor 1 and Actor 2 remain a static legend.
    return {element,time:nearestSequenceNode(Number(position[1])+17,Number(position[2])-5)?.time};
  }).filter(item=>item?.time!==undefined);
  const sequenceLines=[...sequenceSvg.querySelectorAll('line')].map(element=>{
    const start=nearestSequenceNode(Number(element.getAttribute('x1')),Number(element.getAttribute('y1')));
    const end=nearestSequenceNode(Number(element.getAttribute('x2')),Number(element.getAttribute('y2')));
    return {element,time:Math.max(start?.time??0,end?.time??0)};
  });
  const patternSvg=scenes.patterns.querySelector('svg');
  const patternTitles=[...patternSvg.querySelectorAll('text')].filter(element=>/Two-Phase Commit|Synchronous Request-Response|Timeout-Based Operations|Fire-and-Forget/.test(element.textContent));
  const patternRoutes=[
    [{d:'M411.94 132.56H461.18V236.51',label:'Send',step:0},{d:'M440.35 161.12H391.01V114.39',label:'Ack',step:1,response:true},{d:'M411.94 189.68H461.28',label:'Wait',step:2,arrow:false},{d:'M440.35 218.24H391.01V114.39',label:'Response',step:3,response:true}],
    [{d:'M586.5 132.56H635.74V236.51',label:'Send',step:0},{d:'M586.5 189.68H635.84',label:'Wait',step:1,arrow:false},{d:'M614.92 218.24H565.58V114.39',label:'Response',step:2,response:true}],
    [{d:'M761.07 132.56H810.31V236.51',label:'Send',step:0},{d:'M761.07 189.68H810.41',label:'Wait',step:1,arrow:false},{d:'M789.48 218.24H740.14V114.39',label:'Response',step:2,response:true},{d:'M810.31 218.24V247.98',label:'Timeout',step:2,response:true,arrow:false}],
    [{d:'M935.63 132.56H984.87V236.51',label:'Send',step:0}]
  ];
  const patternTraces=patternRoutes.map((routes,index)=>routes.map(route=>{
    const path=svgElement('path',{d:route.d,pathLength:1,class:`system-pattern-trace${route.response?' system-pattern-trace--response':''}`});
    patternSvg.append(path);
    const arrow=route.arrow===false?null:svgElement('polygon',{points:'0,0 -7,-4 -7,4',class:`system-pattern-arrow${route.response?' system-pattern-arrow--response':''}`,opacity:0});
    if(arrow)patternSvg.append(arrow);
    const text=[...patternSvg.querySelectorAll('text')].find(element=>{
      const x=Number(element.getAttribute('transform')?.match(/translate\(([-\d.]+)/)?.[1]);
      return element.textContent.trim()===route.label && x>350+index*174 && x<530+index*174;
    });
    return {...route,path,arrow,text,length:path.getTotalLength()};
  }));
  const engineSvg=scenes.engine.querySelector('svg');
  const engineTexts=[...engineSvg.querySelectorAll('text')];
  // Thread 1 completes four distinct rounds. The other two threads run on their own clocks.
  const engineThread1=[
    {nodes:[['Connect AllVirtual Actors',152]],edges:['start-connect']},
    {nodes:[['IsFabricating?',370]],edges:['connect-main']},
    {nodes:[['IsAvailable',262]],edges:['main-true','thread1-start'],junctions:['main']},
    {nodes:[['HasTask?',266]],edges:['available-true']},
    {nodes:[['Pre-Send',277]],edges:['has-task-true']},
    {nodes:[['Send-Task',277]],edges:['pre-send']},
    {nodes:[],edges:['send-task'],junctions:['lower']},
    {nodes:[],edges:['send-merge'],junctions:['terminal']},
    {nodes:[],edges:['main-return'],junctions:['main']},
    {nodes:[['IsFabricating?',370]],edges:['main-recheck']},
    {nodes:[['IsAvailable',262]],edges:['main-true','thread1-start']},
    {nodes:[['Wait',185]],edges:['available-false']},
    {nodes:[['TaskDone?',175]],edges:['wait-task-done']},
    {nodes:[],edges:['task-done-false'],junctions:['upper']},
    {nodes:[],edges:['upper-lower'],junctions:['lower']},
    {nodes:[],edges:['send-merge'],junctions:['terminal']},
    {nodes:[],edges:['main-return'],junctions:['main']},
    {nodes:[['IsFabricating?',370]],edges:['main-recheck']},
    {nodes:[['IsAvailable',262]],edges:['main-true','thread1-start']},
    {nodes:[['Wait',185]],edges:['available-false']},
    {nodes:[['TaskDone?',175]],edges:['wait-task-done']},
    {nodes:[['Post-Send',185]],edges:['task-done-true']},
    {nodes:[],edges:['post-send'],junctions:['upper']},
    {nodes:[],edges:['upper-lower'],junctions:['lower']},
    {nodes:[],edges:['send-merge'],junctions:['terminal']},
    {nodes:[],edges:['main-return'],junctions:['main']},
    {nodes:[['IsFabricating?',370]],edges:['main-recheck']},
    {nodes:[['IsAvailable',262]],edges:['main-true','thread1-start']},
    {nodes:[['HasTask?',266]],edges:['available-true']},
    {nodes:[],edges:['has-task-false'],junctions:['terminal']},
    {nodes:[],edges:['main-return'],junctions:['main']},
    {nodes:[['IsFabricating?',370]],edges:['main-recheck']},
    {nodes:[['Disconnect AllVirtual Actors',511]],edges:['main-false']}
  ];
  const engineThread2=[
    {nodes:[['NewTasks?',476]],edges:['thread2-start']},
    {nodes:[['IsFabricating?',471]],edges:['new-tasks-false']},
    {nodes:[['NewTasks?',476]],edges:['thread2-loop']},
    {nodes:[['Inject To DB(local)',384]],edges:['new-tasks-true']},
    {nodes:[['IsFabricating?',471]],edges:['local-inject']}
  ];
  const engineThread3=[
    {nodes:[['TaskComplete?',659]],edges:['thread3-start']},
    {nodes:[['IsFabricating?',660]],edges:['task-complete-false']},
    {nodes:[['TaskComplete?',659]],edges:['thread3-loop']},
    {nodes:[['Inject To DB(Cloud)',573]],edges:['task-complete-true']},
    {nodes:[['IsFabricating?',660]],edges:['cloud-inject']}
  ];
  const engineEdgeData={
    'start-connect':['M95.5 101.64V131.77'],
    'connect-main':['M95.5 182.24V337.42'],
    'main-recheck':['M95.5 280.24V337.42'],
    'main-true':['M143.5 382.85H177.33',142.73,374.93],
    'thread1-start':['M188.14 272.28H301.36'],
    'thread2-start':['M188.14 482.73H301.36'],
    'thread3-start':['M188.14 671.68H301.36'],
    'available-true':['M382.63 272.28H446.48',401.26,268.81],
    'new-tasks-false':['M379.33 482.73H443.17',396.21,479.25],
    'task-complete-false':['M379.33 671.68H443.17',396.21,668.21],
    'has-task-true':['M523.63 272.28H587.48',542.26,268.81],
    'has-task-false':['M484.3 315.83V334.98H760.52',624.87,327.76],
    'thread2-loop':['M484.97 520.74V545.42H339.99V526.28',394.79,538.2],
    'thread3-loop':['M484.97 709.7V734.38H339.99V715.23',394.79,727.16],
    'pre-send':['M673.63 272.28H737.48'],
    'new-tasks-true':['M340.85 444.29V413.48',348.06,436.09],
    'task-complete-true':['M340.85 633.25V602.44',348.06,625.05],
    'send-task':['M824.63 272.28H888.48'],
    'local-inject':['M388.78 388.73H484.97V444.29'],
    'cloud-inject':['M388.78 577.69H484.97V633.25'],
    'send-merge':['M909.79 297.74V334.98H801.04'],
    'available-false':['M340.04 233.85V203.04',345.5,225.65],
    'thread2-exit':['M526.82 482.56H988.4',742.57,474.9],
    'thread3-exit':['M526.82 671.52H988.4',742.57,663.86],
    'wait-task-done':['M382.63 177.61H446.48'],
    'task-done-false':['M484.3 135.56V116.41H909.79V157.83',713.41,111.01],
    'task-done-true':['M523.63 177.61H587.48',542.26,172.83],
    'post-send':['M673.63 177.61H888.48'],
    'upper-lower':['M909.79 198.81V252.47'],
    'main-return':['M1012.4 382.16H1043.04V22.98H16.4V260.93H73.55'],
    'main-false':['M95.5 430.55V487.73',99.82,460.47]
  };
  const engineRects=[...engineSvg.querySelectorAll('rect')];
  const engineShapePositions={
    'Connect AllVirtual Actors:152':[47.51,133.72], 'Disconnect AllVirtual Actors:511':[47.51,490.75],
    'IsFabricating?:370':[61.57,348.91], 'IsAvailable:262':[312.01,244.26],
    'Wait:185':[301.36,161.52], 'HasTask?:266':[456.27,244.26],
    'Pre-Send:277':[590.89,253.52], 'Send-Task:277':[741.86,253.52],
    'TaskDone?:175':[456.27,152.26], 'Post-Send:185':[590.89,161.52],
    'NewTasks?:476':[311.97,454.7], 'Inject To DB(local):384':[298.26,368.06],
    'IsFabricating?:471':[456.94,454.7], 'TaskComplete?:659':[311.97,643.65],
    'Inject To DB(Cloud):573':[298.26,557.02], 'IsFabricating?:660':[456.94,643.65]
  };
  const engineBase=svgElement('g',{class:'system-engine-base'});
  [...engineSvg.children].filter(element=>element.tagName.toLowerCase()!=='defs').forEach(element=>engineBase.append(element));
  engineSvg.append(engineBase);
  const engineFocus=new Map();
  for(const step of [...engineThread1,...engineThread2,...engineThread3])for(const [label,y] of step.nodes){
    const key=`${label}:${y}`;
    if(engineFocus.has(key))continue;
    const text=engineTexts.find(element=>{
      const match=element.getAttribute('transform')?.match(/translate\(([-\d.]+)\s+([-\d.]+)/);
      return match && element.textContent.replace(/\s+/g,'')===label.replace(/\s+/g,'') && Math.abs(Number(match[2])-y)<8;
    });
    if(!text)continue;
    const [shapeX,shapeY]=engineShapePositions[key]??[];
    const shape=engineRects.find(element=>Math.abs(Number(element.getAttribute('x'))-shapeX)<.1&&Math.abs(Number(element.getAttribute('y'))-shapeY)<.1);
    if(!shape)continue;
    const group=svgElement('g',{class:'system-engine-node'});
    group.append(shape.cloneNode(true),text.cloneNode(true));
    const bounds=shape.getBoundingClientRect();
    const center=engineSvg.createSVGPoint();
    center.x=bounds.left+bounds.width/2;
    center.y=bounds.top+bounds.height/2;
    const location=center.matrixTransform(engineSvg.getScreenCTM().inverse());
    group.style.transformOrigin=`${location.x}px ${location.y}px`;
    engineSvg.append(group);
    engineFocus.set(key,group);
  }
  const engineEdges=new Map();
  for(const [key,[d,labelX,labelY]] of Object.entries(engineEdgeData)){
    const path=svgElement('path',{d,pathLength:1,class:'system-engine-edge'});
    const arrow=svgElement('polygon',{points:'0,0 -8,-4.5 -8,4.5',class:'system-engine-edge-arrow'});
    engineSvg.append(path,arrow);
    const label=labelX===undefined?null:engineTexts.find(element=>{
      const match=element.getAttribute('transform')?.match(/translate\(([-\d.]+)\s+([-\d.]+)/);
      return match&&Math.abs(Number(match[1])-labelX)<.1&&Math.abs(Number(match[2])-labelY)<.1;
    })?.cloneNode(true);
    if(label){label.classList.add('system-engine-edge-label');engineSvg.append(label);}
    engineEdges.set(key,{path,arrow,label,length:path.getTotalLength()});
  }
  const engineJunctions=[
    {key:'main',x:81.72,y:247.14},
    {key:'lower',x:896.01,y:259.81},
    {key:'upper',x:896.01,y:163.83},
    {key:'terminal',x:780.54,y:331.98,circle:true}
  ].map(({key,x,y,circle})=>{
    const source=circle?[...engineBase.querySelectorAll('circle')].find(element=>Math.abs(Number(element.getAttribute('cx'))-x)<.1&&Math.abs(Number(element.getAttribute('cy'))-y)<.1):engineRects.find(element=>Math.abs(Number(element.getAttribute('x'))-x)<.1&&Math.abs(Number(element.getAttribute('y'))-y)<.1);
    if(!source)return null;
    const group=svgElement('g',{class:'system-engine-junction'});
    group.append(source.cloneNode(true));
    const bounds=source.getBoundingClientRect();
    const center=engineSvg.createSVGPoint();
    center.x=bounds.left+bounds.width/2;
    center.y=bounds.top+bounds.height/2;
    const location=center.matrixTransform(engineSvg.getScreenCTM().inverse());
    group.style.transformOrigin=`${location.x}px ${location.y}px`;
    engineSvg.append(group);
    return {key,group};
  }).filter(Boolean);
  const overviewSvg=scenes.overview.querySelector('svg');
  const overviewRoutes=[
    ['M146.38 57.54H201.12',1550,0,'forward'],['M146.38 82.88H201.12',1550,230,'forward'],['M146.38 108.21H201.12',1550,460,'forward'],
    ['M107.28 319.8H154.96',1600,180,'forward'],['M107.28 345.13H154.96',1600,420,'forward'],['M107.28 370.47H154.96',1600,660,'forward'],
    ['M299.73 74.7H381.94',1450,350,'forward'],['M389 101.52H306.79',1450,760,'response'],
    ['M258.43 128.91V251.46',1800,500,'forward'],['M244.65 258.52V135.97',1800,1050,'response'],
    ['M409.76 181.7V120.94',1400,560,'forward'],['M436.58 120.94V181.7',1400,1010,'response'],
    ['M518.03 251.77H557.17',1350,800,'forward'],['M564.23 265.55H525.09',1350,1250,'response'],
    ['M704.63 275.13H831.93',1750,1150,'forward'],['M838.32 332.97H711.02',1750,1650,'response'],
    ['M390.99 359.23V390.07',1250,1200,'forward'],['M377.21 397.13V366.29',1250,1650,'response'],
    ['M223.09 392.62V507.04',2100,1400,'forward'],['M668.72 348.25V507.25',2100,1750,'response'],
    ['M273.32 515.06V359.23',2000,2050,'response'],['M475.33 515.06V359.23',2000,2250,'forward']
  ].map(([d,duration,delay,tone])=>{
    const path=svgElement('path',{d,fill:'none',stroke:'none'});
    const circle=svgElement('circle',{r:5,opacity:0,class:`system-overview-packet system-overview-packet--${tone}`});
    overviewSvg.append(path,circle);
    return {path,circle,duration,delay,length:path.getTotalLength()};
  });
  const engineBeat=650;
  const engineParallelStart=engineBeat*2;
  const engineMainFalseTime=engineBeat*31;
  const thread2Beat=660;
  const thread3Beat=910;
  const nextFabricatingCheck=beat=>{
    let index=Math.floor((engineMainFalseTime-engineParallelStart)/beat)+1;
    while(index%5!==1&&index%5!==4)index++;
    return engineParallelStart+index*beat;
  };
  const thread2Exit=nextFabricatingCheck(thread2Beat);
  const thread3Exit=nextFabricatingCheck(thread3Beat);
  const engineMotionDuration=Math.max(engineThread1.length*engineBeat,thread2Exit+thread2Beat,thread3Exit+thread3Beat);
  const engineDuration=engineMotionDuration+3000;
  const sceneDurations=[6200,12800,engineDuration,6500];
  const sceneStarts=sceneDurations.map((_,index)=>sceneDurations.slice(0,index).reduce((sum,duration)=>sum+duration,0));
  const totalDuration=sceneDurations.reduce((sum,duration)=>sum+duration,0);
  const patternStarts=[0,3900,7000,10400,12800];
  let elapsed=0;
  let lastTimestamp;
  let frameId;
  let sectionVisible=false;
  let lastScene=-1;
  let manualIndex=null;
  let scroller;
  const engineState=(steps,beat,time,repeat=false)=>{
    const boundedTime=repeat?time:Math.min(time,steps.length*beat-1);
    const index=Math.floor(boundedTime/beat);
    const step=steps[repeat?index%steps.length:Math.min(index,steps.length-1)];
    const previous=index>0?steps[repeat?(index-1)%steps.length:Math.min(index-1,steps.length-1)]:null;
    return {step,previous,within:boundedTime%beat,index};
  };
  const parallelState=(steps,beat,exitAt,exitStep,time)=>{
    if(time<engineParallelStart||time>=exitAt+beat)return null;
    if(time>=exitAt)return {step:exitStep,previous:null,within:time-exitAt};
    const state=engineState(steps,beat,time-engineParallelStart,true);
    if(state.index>0&&state.index%steps.length===0){
      state.step={...state.step,edges:[steps===engineThread2?'thread2-loop':'thread3-loop']};
    }
    return state;
  };
  const render=time=>{
    const cycle=time%totalDuration;
    const sceneIndex=sceneStarts.reduce((current,start,index)=>cycle>=start?index:current,0);
    const local=cycle-sceneStarts[sceneIndex];
    scroller?.update(sceneIndex);
    systemAnimation.classList.toggle('is-engine-rest',sceneIndex===2&&local>=engineMotionDuration);
    if(sceneIndex!==lastScene){
      names.forEach((name,index)=>scenes[name].classList.toggle('is-active',index===sceneIndex));
      lastScene=sceneIndex;
    }
    if(sceneIndex===0){
      for(const {element,time:entryTime} of [...sequenceNodes,...sequenceLabels,...sequenceLines]){
        element.classList.toggle('is-reached',local>=entryTime);
        element.classList.toggle('is-current',local>=entryTime&&local<entryTime+420);
      }
    }else if(sceneIndex===1){
      const patternIndex=patternStarts.reduce((current,start,index)=>local>=start&&index<4?index:current,0);
      const patternLocal=local-patternStarts[patternIndex];
      const patternDuration=patternStarts[patternIndex+1]-patternStarts[patternIndex];
      patternTitles.forEach((title,index)=>title.classList.toggle('is-current',index===patternIndex));
      patternTraces.forEach((routes,index)=>routes.forEach(({path,arrow,text,step,length})=>{
        const stepCount=Math.max(...routes.map(route=>route.step))+1;
        const stepDuration=(patternDuration-350)/stepCount;
        const stepLocal=patternLocal-150-step*stepDuration;
        const progress=index===patternIndex?clamp(stepLocal/Math.min(1150,stepDuration*.78)):0;
        path.style.strokeDashoffset=String(1-progress);
        text?.classList.toggle('is-current',index===patternIndex&&stepLocal>=0&&stepLocal<stepDuration);
        if(arrow){
          arrow.setAttribute('opacity',index===patternIndex&&progress>0?'1':'0');
          if(index===patternIndex&&progress>0){
            const position=path.getPointAtLength(progress*length);
            const before=path.getPointAtLength(Math.max(0,progress*length-2));
            const after=path.getPointAtLength(Math.min(length,progress*length+2));
            const angle=Math.atan2(after.y-before.y,after.x-before.x)*180/Math.PI;
            arrow.setAttribute('transform',`translate(${position.x} ${position.y}) rotate(${angle})`);
          }
        }
      }));
    }else if(sceneIndex===2&&local<engineMotionDuration){
      const states=[
        local<engineThread1.length*engineBeat?engineState(engineThread1,engineBeat,local):null,
        parallelState(engineThread2,thread2Beat,thread2Exit,{nodes:[['IsFabricating?',471]],edges:['thread2-exit']},local),
        parallelState(engineThread3,thread3Beat,thread3Exit,{nodes:[['IsFabricating?',660]],edges:['thread3-exit']},local)
      ].filter(Boolean);
      const activeNodes=new Set(states.flatMap(({step})=>step.nodes.map(([label,y])=>`${label}:${y}`)));
      const activeJunctions=new Set(states.flatMap(({step})=>step.junctions??[]));
      for(const [key,group] of engineFocus)group.classList.toggle('is-current',activeNodes.has(key));
      for(const {key,group} of engineJunctions)group.classList.toggle('is-current',activeJunctions.has(key));
      const activeEdges=new Map();
      const recentEdges=new Set();
      for(const {step,previous,within,index} of states){
        for(const key of step.edges){
          const drawTime=key==='main-return'?430:280;
          activeEdges.set(key,clamp((within-60)/drawTime));
        }
        if(index!==engineThread1.length-1)for(const key of previous?.edges??[])recentEdges.add(key);
      }
      for(const [key,{path,arrow,label,length}] of engineEdges){
        const current=activeEdges.has(key);
        const progress=activeEdges.get(key)??0;
        const recent=!current&&recentEdges.has(key);
        path.classList.toggle('is-current',current);
        path.classList.toggle('is-recent',recent);
        path.style.strokeDashoffset=String(current?1-progress:recent?0:1);
        arrow.classList.toggle('is-current',current&&progress>.82);
        arrow.classList.toggle('is-recent',recent);
        label?.classList.toggle('is-current',current);
        if(current&&progress>.82){
          const at=path.getPointAtLength(length);
          const before=path.getPointAtLength(Math.max(0,length-3));
          const angle=Math.atan2(at.y-before.y,at.x-before.x)*180/Math.PI;
          arrow.setAttribute('transform',`translate(${at.x} ${at.y}) rotate(${angle})`);
        }
      }
    }else if(sceneIndex===3){
      for(const {path,circle,duration,delay,length} of overviewRoutes){
        if(local<delay){circle.setAttribute('opacity','0');continue;}
        const progress=((local-delay)%duration)/duration;
        const point=path.getPointAtLength(progress*length);
        circle.setAttribute('cx',point.x.toFixed(2));
        circle.setAttribute('cy',point.y.toFixed(2));
        circle.setAttribute('opacity',String(Math.min(1,progress*10,(1-progress)*10)));
      }
    }
  };
  const tick=timestamp=>{
    if(lastTimestamp!==undefined)elapsed+=timestamp-lastTimestamp;
    lastTimestamp=timestamp;
    render(elapsed);
    frameId=requestAnimationFrame(tick);
  };
  let userPaused=false;
  const updatePauseState=()=>{
    systemAnimation.classList.toggle('is-paused',userPaused);
    systemAnimation.setAttribute('aria-pressed',String(userPaused));
    systemAnimation.setAttribute('aria-label',userPaused?'Resume animated system diagrams':'Pause animated system diagrams');
  };
  const updatePlayback=()=>{
    const shouldPlay=sectionVisible&&!document.hidden&&!reducedMotion.matches&&!userPaused&&manualIndex===null;
    if(shouldPlay && frameId===undefined){lastTimestamp=undefined;frameId=requestAnimationFrame(tick);}
    if(!shouldPlay && frameId!==undefined){cancelAnimationFrame(frameId);frameId=undefined;lastTimestamp=undefined;}
  };
  const resetFigures=()=>{
    [...sequenceNodes,...sequenceLabels,...sequenceLines].forEach(({element})=>element.classList.remove('is-reached','is-current'));
    patternTitles.forEach(title=>title.classList.remove('is-current'));
    patternTraces.flat().forEach(({path,arrow,text})=>{path.style.strokeDashoffset='1';arrow?.setAttribute('opacity','0');text?.classList.remove('is-current');});
    for(const group of engineFocus.values())group.classList.remove('is-current');
    for(const {group} of engineJunctions)group.classList.remove('is-current');
    for(const {path,arrow,label} of engineEdges.values()){
      path.classList.remove('is-current','is-recent');
      path.style.strokeDashoffset='1';
      arrow.classList.remove('is-current','is-recent');
      label?.classList.remove('is-current');
    }
    overviewRoutes.forEach(({circle})=>circle.setAttribute('opacity','0'));
  };
  const diagramNames=['Actor execution sequence','Communication patterns','Engine logic','Digital Twin architecture'];
  scroller=diagramScroller(systemAnimation,diagramNames,index=>{
    manualIndex=index;
    userPaused=false;
    updatePauseState();
    updatePlayback();
    resetFigures();
    systemAnimation.classList.add('is-manual');
    Object.values(scenes).forEach((scene,sceneIndex)=>scene.classList.toggle('is-selected',sceneIndex===index));
    systemAnimation.setAttribute('role','img');
    systemAnimation.removeAttribute('tabindex');
    systemAnimation.removeAttribute('aria-pressed');
    systemAnimation.setAttribute('aria-label',diagramNames[index]);
    scroller.update(index);
  });
  const updateMotion=()=>{
    manualIndex=null;
    userPaused=false;
    systemAnimation.classList.remove('is-manual','is-engine-rest','is-paused');
    Object.values(scenes).forEach(scene=>scene.classList.remove('is-selected'));
    scroller.show(true);
    scroller.update(0);
    if(reducedMotion.matches){
      manualIndex=0;
      updatePlayback();
      systemAnimation.classList.remove('is-animated');
      systemAnimation.classList.add('is-manual');
      scenes.sequence.classList.add('is-selected');
      Object.values(scenes).forEach(scene=>scene.classList.remove('is-active'));
      resetFigures();
      systemAnimation.removeAttribute('tabindex');
      systemAnimation.removeAttribute('aria-pressed');
      systemAnimation.setAttribute('role','img');
      systemAnimation.setAttribute('aria-label',diagramNames[0]);
    }else{
      elapsed=0;
      lastScene=-1;
      systemAnimation.classList.add('is-animated');
      systemAnimation.setAttribute('role','button');
      systemAnimation.setAttribute('tabindex','0');
      updatePauseState();
      render(0);
      updatePlayback();
    }
  };
  const togglePause=()=>{
    if(reducedMotion.matches||manualIndex!==null)return;
    userPaused=!userPaused;
    updatePauseState();
    updatePlayback();
  };
  systemAnimation.addEventListener('click',togglePause);
  systemAnimation.addEventListener('keydown',event=>{
    if(event.key==='Enter'||event.key===' '){event.preventDefault();togglePause();}
  });
  if('IntersectionObserver' in window){
    new IntersectionObserver(entries=>{
      const visible=entries.some(entry=>entry.isIntersecting);
      if(sectionVisible&&!visible&&manualIndex!==null&&!reducedMotion.matches){
        manualIndex=null;
        systemAnimation.classList.remove('is-manual');
        Object.values(scenes).forEach(scene=>scene.classList.remove('is-selected'));
        userPaused=false;
        systemAnimation.setAttribute('role','button');
        systemAnimation.setAttribute('tabindex','0');
        updatePauseState();
        elapsed=0;
        lastScene=-1;
        render(0);
      }
      sectionVisible=visible;
      updatePlayback();
    },{threshold:0}).observe(section);
  }else sectionVisible=true;
  document.addEventListener('visibilitychange',updatePlayback);
  reducedMotion.addEventListener?.('change',updateMotion);
  updateMotion();
}

for(const gallery of document.querySelectorAll('[data-case-gallery]')){
  const slides=[...gallery.querySelectorAll('[data-case-gallery-slide]')];
  const controls=gallery.querySelector('[data-case-gallery-controls]');
  const previous=controls.querySelector('[data-case-gallery-previous]');
  const next=controls.querySelector('[data-case-gallery-next]');
  const count=controls.querySelector('[data-case-gallery-count]');
  const range=controls.querySelector('[data-case-gallery-range]');
  const status=controls.querySelector('[data-case-gallery-status]');
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let current=0;
  let inView=false;
  let pausedByUser=false;
  let timer;
  const show=(index,announce=false)=>{
    current=(index+slides.length)%slides.length;
    slides.forEach((slide,i)=>slide.classList.toggle('is-current',i===current));
    const caption=slides[current].querySelector('[data-gallery-caption]').textContent.trim();
    range.value=String(current+1);
    range.setAttribute('aria-valuetext',`Image ${current+1} of ${slides.length}: ${caption}`);
    range.style.setProperty('--diagram-progress',`${slides.length>1?current/(slides.length-1)*100:0}%`);
    count.textContent=`${String(current+1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')}`;
    if(announce)status.textContent=`Image ${current+1} of ${slides.length}: ${caption}`;
  };
  const syncTimer=()=>{
    clearTimeout(timer);
    if(slides.length<2 || !inView || pausedByUser || reducedMotion.matches || document.hidden)return;
    timer=setTimeout(()=>{
      show((current+1)%slides.length);
      syncTimer();
    },5000);
  };
  const select=index=>{
    pausedByUser=true;
    show(index,true);
    syncTimer();
  };
  previous.addEventListener('click',()=>select(current-1));
  next.addEventListener('click',()=>select(current+1));
  range.addEventListener('input',()=>select(Number(range.value)-1));
  gallery.addEventListener('click',event=>{
    if(event.target.closest('.story-figure-image, .media-credit')){
      pausedByUser=true;
      syncTimer();
    }
  });
  gallery.addEventListener('focusin',()=>{
    pausedByUser=true;
    syncTimer();
  });
  show(0);
  gallery.classList.add('is-enhanced');
  controls.hidden=slides.length<2;
  if('IntersectionObserver' in window){
    new IntersectionObserver(([entry])=>{
      const visible=entry.isIntersecting;
      if(inView && !visible && !document.hidden)pausedByUser=false;
      inView=visible;
      syncTimer();
    },{threshold:0.1}).observe(gallery);
  }else{
    inView=true;
    syncTimer();
  }
  document.addEventListener('visibilitychange',syncTimer);
  reducedMotion.addEventListener?.('change',syncTimer);
}

// Local development reload stream; no analytics or remote scripts.
if(['localhost','127.0.0.1','::1'].includes(location.hostname)){const stream=new EventSource('/__events');stream.addEventListener('reload',()=>location.reload());window.addEventListener('pagehide',()=>stream.close(),{once:true});}
