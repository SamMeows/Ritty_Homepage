// Publish the built Korean page with its original CSS and a preview-only interaction layer.
// No application API, analytics, or collection forms are included in this static preview.
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const dest = path.resolve(process.argv[2] || 'preview-dist');
fs.mkdirSync(dest, { recursive: true });
fs.cpSync(path.join(root, 'public'), dest, { recursive: true, filter: p => !p.endsWith('qa.html') });
fs.cpSync(path.join(root, '.next/static'), path.join(dest, '_next/static'), { recursive: true });
let html = fs.readFileSync(path.join(root, '.next/server/app/kr.html'), 'utf8');
html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<link\b[^>]*(?:as="script"|rel="modulepreload")[^>]*>/gi, '')
  .replace(/\s(?:srcSet|imagesrcset|imageSrcSet)="[^"]*"/gi, '')
  .replace(/\/_next\/image\?url=([^&"]+)(?:&amp;|&)[^"]*/g, (_, url) => decodeURIComponent(url))
  .replace(/style="([^"]*opacity:0(?:;|"))/g, match => match.replace('opacity:0','opacity:1'))
  .replace(/name="robots" content="[^"]*"/, 'name="robots" content="noindex,nofollow"');
// Initial motion transforms are entry animations; publish their settled state.
html = html.replace(/transform:translate[XY]\([^)]*\)(?: scale\([^)]*\))?;?/g, '');
const dialog = `<dialog id="registration-preview" style="margin:auto;width:calc(100% - 32px);max-width:500px;background:#564596;color:white;border:1px solid #ffffff66;border-radius:24px;padding:32px;font-family:Paperlogy,sans-serif"><button data-close aria-label="닫기" style="float:right;font-size:28px">×</button><p style="color:#ddd0ff">사전등록 미리보기</p><h2 style="font-size:28px;font-weight:800;margin:20px 0">우리의 첫날을 기다려요</h2><p>출시 소식을 전할 준비를 하고 있어요.</p><label for="preview-email" style="display:block;margin:24px 0 8px">이메일 주소</label><input id="preview-email" disabled value="hello@example.com" style="width:100%;padding:12px;border:1px solid #ffffff55;border-radius:12px;background:#ffffff18"><fieldset style="margin-top:20px"><legend>사용 기기</legend><label><input type="radio" name="device" checked> iOS</label>　<label><input type="radio" name="device"> Android</label></fieldset><p style="font-size:14px;line-height:1.7;margin:24px 0">디자인 미리보기입니다. 이메일을 수집하거나 신청을 접수하지 않습니다. 출시일·보상·베타 일정은 추후 안내합니다.</p><button data-close style="padding:12px 24px;border-radius:16px;border:1px solid #fff;background:linear-gradient(90deg,#806cf5,#6858c6);width:100%">계속 둘러보기</button></dialog>`;
html = html.replace('</head>', '<style>dialog::backdrop{background:#0009}html{scroll-behavior:smooth}button:focus-visible,a:focus-visible{outline:3px solid #fffbc0;outline-offset:4px}</style></head>')
  .replace('</body>', dialog + '<script src="/ritty/original-preview.js" defer></script></body>');
fs.writeFileSync(path.join(dest, 'index.html'), html);
fs.writeFileSync(path.join(dest, 'ritty/original-preview.js'), `
const modal=document.getElementById('registration-preview');let prior;
document.querySelectorAll('button').forEach(button=>{
 if(button.textContent.trim()==='사전등록 안내'){button.addEventListener('click',()=>{prior=button;modal.showModal()})}
 if(button.getAttribute('aria-label')?.startsWith('리티 Ritty'))button.addEventListener('click',()=>document.getElementById('home').scrollIntoView({behavior:'smooth'}));
});
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>modal.close()));
modal.addEventListener('click',e=>{if(e.target===modal)modal.close()});modal.addEventListener('close',()=>prior?.focus());
document.querySelectorAll('button[aria-label="아래로 스크롤"]').forEach((b,i)=>b.addEventListener('click',()=>document.getElementById(i===0?'worldview':'ritty-intro').scrollIntoView({behavior:'smooth'})));
const music=document.querySelector('button[aria-label="배경 음악 토글"]');const audio=new Audio('/audio/bgm.wav');audio.loop=true;audio.volume=.3;
music?.addEventListener('click',async()=>{if(audio.paused){try{await audio.play();music.setAttribute('aria-pressed','true')}catch{music.setAttribute('aria-pressed','false')}}else{audio.pause();music.setAttribute('aria-pressed','false')}});
const language=document.querySelector('button[aria-label="언어 변경"]');
language?.addEventListener('click',()=>{let menu=document.getElementById('language-preview');if(menu){menu.remove();language.setAttribute('aria-expanded','false');return}menu=document.createElement('div');menu.id='language-preview';menu.style.cssText='position:absolute;right:0;top:60px;background:white;color:#564596;padding:16px;border-radius:12px;width:180px';menu.innerHTML='<p>한국어 · 현재 시안</p><a href="https://ritty.sam-meows.com/en" target="_blank" rel="noopener noreferrer">English 공식 사이트 ↗</a>';language.parentElement.append(menu);language.setAttribute('aria-expanded','true')});
const main=document.querySelector('main');main.addEventListener('scroll',()=>{document.querySelector('header').style.background=main.scrollTop>50?'rgba(35,25,60,.85)':''},{passive:true});
const floating=[...document.querySelectorAll('button')].find(b=>b.classList.contains('invisible')&&b.textContent.trim()==='사전등록 안내');
if(floating){const seen=new Set();const visibilityObserver=new IntersectionObserver(entries=>{entries.forEach(e=>e.isIntersecting?seen.add(e.target):seen.delete(e.target));floating.style.visibility=seen.size?'hidden':'visible';floating.style.opacity=seen.size?'0':'1'}, {root:main,threshold:.1});visibilityObserver.observe(document.getElementById('home'));visibilityObserver.observe(document.getElementById('footer'));}
`);
console.log('Exported original-design Korean preview: ' + dest);
