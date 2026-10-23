const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(process.argv[2]||'preview-dist');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(ids.length,new Set(ids).size,'Duplicate IDs');
for(const [,ref] of html.matchAll(/\b(?:src|href|srcset)="([^"]+)"/g)){
 if(ref.startsWith('#'))assert(ids.includes(ref.slice(1)),'Broken anchor '+ref);
 else if(ref.startsWith('/'))assert(fs.existsSync(path.join(root,ref)),'Missing asset '+ref);
}
const js=fs.readFileSync(path.join(root,html.includes('/ritty/original-preview.js')?'ritty/original-preview.js':'ritty/site.js'),'utf8');
new (require('vm').Script)(js);
assert(!/\b(fetch|XMLHttpRequest|localStorage|sessionStorage)\b/.test(js),'Preview must not send or store personal data');
assert(!/<form\b/.test(html),'No live signup form permitted');
assert(/id="preview-email"[^>]*disabled/.test(html),'Email entry must stay disabled');
console.log('Passed: local asset/anchor integrity, unique IDs, script syntax, preview-only signup.');
