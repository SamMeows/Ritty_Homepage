const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const generated = 'C:/Users/csj09/.codex/generated_images/01a1623a-a0d2-78e3-95a3-b62be81da0f2';
const temp = 'C:/Users/csj09/AppData/Local/Temp';
const finals = {
  hero:'exec-f24da66b-fffa-477e-a0eb-c1c955a6fe45.png',
  harvest:'exec-51980e85-d345-45c9-845e-45ce61c711e1.png',
  cooking:'exec-54003719-075b-4e7d-99bd-6f520f3e8115.png',
  home:'exec-c814e964-fa7f-4bfc-9c72-4b17dd14998c.png',
  fishing:'exec-1b326698-8ad0-4e1c-84a5-b10158b72753.png',
};
const references = {
  village:'codex-clipboard-346e33f5-f319-462d-ac2f-48146763f5f3.png',
  'cat-gray':'codex-clipboard-43f51736-f117-4b1c-bc49-08d897b1e900.png',
  'cat-orange':'codex-clipboard-6cf3f6c1-6e81-40d3-974c-806fe13040da.png',
  'cat-calico':'codex-clipboard-6fd6b00a-dd68-4ef2-bcb9-7a973a6680ac.png',
  'cat-white':'codex-clipboard-54e2ee25-1490-40ec-9985-375d6a2cb36c.png',
};
(async () => {
  fs.mkdirSync(path.join(root,'art/life-v1'),{recursive:true});
  for (const [name,file] of Object.entries(finals)) {
    const source = path.join(generated,file);
    fs.copyFileSync(source,path.join(root,'art/life-v1',name+(name==='hero'?'-final.png':'-quadruped-final.png')));
    await sharp(source).webp({quality:88}).toFile(path.join(root,'public/ritty',name+'.webp'));
  }
  await sharp(path.join(generated,finals.hero)).resize({width:1000}).webp({quality:88}).toFile(path.join(root,'public/ritty/hero-mobile.webp'));
  for(const [name,file] of Object.entries(references)) {
    await sharp(path.join(temp,file)).resize({width:name==='village'?800:420}).webp({quality:88}).toFile(path.join(root,'public/ritty',name+'.webp'));
  }
  console.log('Prepared 5 concept artworks and 5 supplied references.');
})();
