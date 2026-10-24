(() => {
  if (document.documentElement.dataset.rittyReady) return;
  document.documentElement.dataset.rittyReady = 'true';
  const dialog = document.getElementById('join-preview');
  const opener = document.getElementById('preview-complete');
  if (!dialog || !opener) return;
  opener?.addEventListener('click', () => dialog.showModal());
  dialog?.querySelector('.close-dialog')?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', (event) => {
    const box = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
  });
  dialog?.addEventListener('close', () => {
    document.getElementById('beta-message').hidden = true;
    opener.focus();
  });
  document.getElementById('beta-preview')?.addEventListener('click', () => {
    document.getElementById('beta-message').hidden = false;
  });
})();

(() => {
  const root = document.querySelector('.ritty-site');
  if (!root || root.dataset.interactiveReady) return;
  root.dataset.interactiveReady = 'true';
  const translations = JSON.parse(root.querySelector('#landing-translations')?.textContent || '{}');
  const t = text => translations[text] || text;
  const controller = new AbortController();
  window.addEventListener('ritty:dispose', () => controller.abort(), {once:true, signal:controller.signal});
  const scenes = [
    ['harvest','01 / GARDEN',t('오늘은 무얼 수확할까?'),t('씨앗을 심고 물을 줘서 작물을 길러요. 텃밭을 넓히면 더 많이 심을 수 있어요.'),t('수확하는 손을 바라보는 회색 리티'),'#harvest'],
    ['cooking','02 / COOKING',t('뭘 만들어 줄까?'),t('수확한 재료로 요리를 만들어 리티에게 줘보세요. 어떤 음식을 좋아할까요?'),t('요리를 기다리는 회색 리티'),'#cooking'],
    ['home','03 / OUR HOME',t('직접 만들어 꾸미는 집'),t('재료를 모아 가구를 만들고 원하는 곳에 놓아요. 집을 넓혀 더 많은 가구를 배치할 수도 있어요.'),t('가구 제작 곁에서 부품을 살피는 회색 리티'),'#our-home'],
    ['fishing','04 / OUTSIDE',t('낚시도 하고, 마을도 가고'),t('바다에서 낚시를 즐기고, 돌아오는 길엔 마을 상점에도 들러요.'),t('낚시 찌를 살피는 회색 리티'),'#outside'],
  ];
  const lifeDialogue = [t('우와, 이거 네가 키운 거야?'), t('한 입만! 지금 먹어도 돼?'), t('새 가구야? 나도 구경할래!'), t('방금 움직였어! 물고기 아니야?')];
  const lifeCopies = [...root.querySelectorAll('[data-life-copy]')];
  let lifeIndex=0;
  function animateSwap(element, direction=1){
    if(matchMedia('(prefers-reduced-motion: reduce)').matches || root.classList.contains('motion-paused'))return;
    element.getAnimations().forEach(animation=>animation.cancel());
    element.animate([{opacity:.25,transform:`translateX(${direction*28}px) scale(1.035)`},{opacity:1,transform:'translateX(0) scale(1)'}],{duration:560,easing:'cubic-bezier(.2,.7,.2,1)'});
  }
  function selectLife(index){
    const direction=index>=lifeIndex?1:-1;
    lifeIndex=(index+scenes.length)%scenes.length;const scene=scenes[lifeIndex];
    // Real carousel panels are present in the initial HTML. Only the selected
    // panel is displayed, using the existing layout and animation.
    if(lifeCopies.length){
      lifeCopies.forEach((panel,i)=>{
        panel.hidden=i!==lifeIndex;
        ['span','h3','p'].forEach(tag=>panel.querySelector(tag).removeAttribute('id'));
      });
      const panel=lifeCopies[lifeIndex];
      panel.querySelector('span').id='life-number';panel.querySelector('h3').id='life-title';panel.querySelector('p').id='life-description';
    }
    const art=document.getElementById('life-preview-art');art.src='/ritty/'+scene[0]+'.webp';art.alt=scene[4];
    document.getElementById('life-number').textContent=scene[1];document.getElementById('life-title').textContent=scene[2];document.getElementById('life-description').textContent=scene[3];
    document.getElementById('life-dialogue').textContent=lifeDialogue[lifeIndex];
    root.querySelectorAll('[data-life-slide]').forEach((dot,i)=>dot.setAttribute('aria-pressed',String(i===lifeIndex)));
    document.getElementById('life-panel').dataset.scene=scene[0];
    animateSwap(art,direction);
    animateSwap(document.getElementById('life-speech'),direction);
    animateSwap(lifeCopies[lifeIndex]||root.querySelector('.life-panel-copy'),direction);
  }
  root.querySelectorAll('[data-life-step]').forEach(button=>button.addEventListener('click',()=>selectLife(lifeIndex+Number(button.dataset.lifeStep))));
  root.querySelectorAll('[data-life-slide]').forEach(button=>button.addEventListener('click',()=>selectLife(Number(button.dataset.lifeSlide))));
  document.getElementById('life-panel').addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();selectLife(lifeIndex+(e.key==='ArrowRight'?1:-1))}});
  // Replace name/concept/story with approved character settings when available.
  const cats=JSON.parse(document.getElementById('resident-data').textContent);
  const catTabs=[...root.querySelectorAll('[data-cat]')];
  let catIndex=0;
  function selectCat(index,focus=false,direction=1){
    index=((index%cats.length)+cats.length)%cats.length;
    catIndex=index;
    const cat=cats[index];catTabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1});
    catTabs.forEach((tab,i)=>{const position=(i-index+cats.length)%cats.length;tab.hidden=position>=4;tab.style.order=String(position)});
    document.getElementById('cat-profile').setAttribute('aria-labelledby',catTabs[index].id);
    document.getElementById('cat-name').textContent=cat.name||cat.role;
    document.getElementById('cat-trait').textContent=cat.upcoming?t('새로운 친구가 찾아올 예정이에요'):cat.role+' · '+cat.personality;
    const likes=document.getElementById('cat-likes');likes.hidden=!cat.likes;likes.textContent=cat.likes?t('좋아하는 것: ')+cat.likes:'';
    const quote=document.getElementById('cat-quote');quote.hidden=!cat.quote;quote.textContent=cat.quote?'“'+cat.quote+'”':'';
    document.getElementById('cat-story').textContent=cat.story;
    root.querySelector('.cat-story').scrollTop=0;
    const portrait=document.getElementById('cat-portrait'),unknown=document.getElementById('cat-unknown');
    portrait.hidden=!cat.art;unknown.hidden=!!cat.art;
    if(cat.art){portrait.src='/ritty/residents/'+cat.art+'-cutout.webp';portrait.alt=(cat.name||cat.role)+t(' 일러스트');animateSwap(portrait,direction)}
    else {document.getElementById('cat-unknown-label').textContent=cat.upcoming?t('새로운 만남을 기다려 주세요'):t('어떤 모습일까요?');animateSwap(unknown,direction)}
    animateSwap(document.getElementById('cat-name'),direction);
    animateSwap(root.querySelector('.cat-story'),direction);
    document.getElementById('resident-status').textContent=cat.name||cat.role;
    root.querySelector('.cat-world').dataset.resident=String(index);
    if(focus)catTabs[index].focus();
  }
  catTabs.forEach((tab,index)=>{tab.addEventListener('click',()=>selectCat(index));tab.addEventListener('keydown',e=>{
    let next=index;if(e.key==='ArrowRight')next=(index+1)%cats.length;else if(e.key==='ArrowLeft')next=(index+cats.length-1)%cats.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=cats.length-1;else return;e.preventDefault();selectCat(next,true,e.key==='ArrowLeft'?-1:1);
  })});
  root.querySelectorAll('[data-cat-step]').forEach(button=>button.addEventListener('click',()=>{const step=Number(button.dataset.catStep);selectCat(catIndex+step,false,step)}));
  const catPanel=document.getElementById('cat-profile');
  catPanel.addEventListener('keydown',e=>{if(e.target!==catPanel||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const step=e.key==='ArrowRight'?1:-1;selectCat(catIndex+step,false,step)});
  let swipeStart=null;
  catPanel.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'||e.target.closest('button,a,input'))return;swipeStart={x:e.clientX,y:e.clientY,id:e.pointerId}});
  catPanel.addEventListener('pointercancel',()=>{swipeStart=null});
  catPanel.addEventListener('pointerup',e=>{if(!swipeStart||swipeStart.id!==e.pointerId)return;const dx=e.clientX-swipeStart.x,dy=e.clientY-swipeStart.y;swipeStart=null;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.3){const step=dx<0?1:-1;selectCat(catIndex+step,false,step)}});
  const videoDialog=document.getElementById('video-dialog'),video=document.getElementById('ritty-video'),placeholder=document.getElementById('video-placeholder');
  let videoOpener, videoRequest=0;
  const caption=videoDialog.querySelector('.video-caption');
  import('/ritty/media-config.js').then(({media})=>{
    root.querySelectorAll('[data-video]').forEach(button=>{
      if(media[button.dataset.video]){
        const label=button.querySelector('small');
        if(label)label.textContent=t('플레이 영상 보기');
      }
    });
  }).catch(()=>{});
  root.querySelectorAll('[data-video]').forEach(button=>button.addEventListener('click',async()=>{
    const request=++videoRequest;videoOpener=button;
    document.getElementById('video-title').textContent=button.dataset.video==='life'?t('리티 생활 플레이'):t('리티와 대화하기');
    video.pause();video.removeAttribute('src');video.load();video.hidden=true;placeholder.hidden=false;
    caption.textContent=t('실제 플레이 영상이 들어갈 자리입니다. 현재는 영상이 등록되지 않았어요.');
    videoDialog.showModal();
    try {
      const {media}=await import('/ritty/media-config.js');
      if(request!==videoRequest || !videoDialog.open)return;
      const source=media[button.dataset.video];
      if(source){const url=new URL(source,location.href);if(!['https:','http:'].includes(url.protocol))return;video.src=url.href;video.hidden=false;placeholder.hidden=true;caption.textContent=t('실제 플레이 영상');}
    } catch {caption.textContent=t('영상을 아직 불러올 수 없어요. 잠시 후 다시 확인해 주세요.');}
  }));
  video.addEventListener('error',()=>{video.hidden=true;placeholder.hidden=false;caption.textContent=t('영상을 불러오지 못했어요. 영상 파일 주소를 확인해 주세요.')});
  videoDialog.querySelector('.close-video').addEventListener('click',()=>videoDialog.close());
  videoDialog.addEventListener('click',e=>{const b=videoDialog.getBoundingClientRect();if(e.target===videoDialog&&(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom))videoDialog.close()});
  videoDialog.addEventListener('close',()=>{videoRequest++;video.pause();videoOpener?.focus()});
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(pointer:fine)');
  const hero=document.getElementById('home'),motionButton=root.querySelector('.motion-toggle');
  let paused=reduced.matches,raf=0;
  function applyMotion(){root.classList.toggle('motion-paused',paused);motionButton.setAttribute('aria-pressed',String(paused));motionButton.setAttribute('aria-label',paused?t('배경 움직임 재생하기'):t('배경 움직임 멈추기'));motionButton.textContent=paused?'▷':'Ⅱ';hero.style.setProperty('--mx','0px');hero.style.setProperty('--my','0px')}
  applyMotion();motionButton.addEventListener('click',()=>{paused=!paused;applyMotion()});
  reduced.addEventListener('change',e=>{paused=e.matches;applyMotion()},{signal:controller.signal});
  hero.addEventListener('pointermove',e=>{if(paused||!fine.matches||raf)return;raf=requestAnimationFrame(()=>{const b=hero.getBoundingClientRect();hero.style.setProperty('--mx',((e.clientX-b.left)/b.width-.5)*10+'px');hero.style.setProperty('--my',((e.clientY-b.top)/b.height-.5)*6+'px');raf=0})});
  hero.addEventListener('pointerleave',()=>{hero.style.setProperty('--mx','0px');hero.style.setProperty('--my','0px')});
  const links=[...root.querySelectorAll('[data-nav]')];
  let ticking=false;
  function updateNavigation(){const y=window.scrollY;const sections=['home','day','meet-ritty','news'];const active=sections.filter(id=>document.getElementById(id).offsetTop<=y+170).pop()||'home';links.forEach(a=>{if(a.dataset.nav===active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});root.querySelector('.site-nav').classList.toggle('scrolled',y>60);ticking=false}
  window.addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(updateNavigation)}},{passive:true,signal:controller.signal});updateNavigation();
})();
