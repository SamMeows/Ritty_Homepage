const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const destination = path.resolve(process.argv[2] || path.join(root, 'preview-dist'));
const raw = fs.readFileSync(path.join(root,'lib/home-markup.ts'),'utf8');
const markup = raw.slice(raw.indexOf('`')+1, raw.lastIndexOf('`'));
fs.mkdirSync(destination,{recursive:true});
fs.mkdirSync(path.join(destination,'images'),{recursive:true});
fs.cpSync(path.join(root,'public/ritty'),path.join(destination,'ritty'),{recursive:true,filter:(source)=>!source.endsWith('qa.html')});
fs.copyFileSync(path.join(root,'public/images/rittyLogo.png'),path.join(destination,'images/rittyLogo.png'));
for (const social of JSON.parse(fs.readFileSync(path.join(root,'lib/i18n/dictionaries/kr.json'),'utf8')).social) { fs.copyFileSync(path.join(root,'public',social.sidebarIcon),path.join(destination,social.sidebarIcon)); }
fs.writeFileSync(path.join(destination,'index.html'),'<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>리티 | 말하는 고양이와 함께 사는 생활게임</title><meta name="description" content="말하는 고양이와 함께 살아가는 생활게임 리티. 홈페이지 디자인 미리보기."><link rel="stylesheet" href="/ritty/site.css"></head><body>'+markup+'<script src="/ritty/site.js" defer></script></body></html>');
console.log('Exported homepage preview to '+destination);
