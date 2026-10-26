// Tiny CommonJS loader for TypeScript contract tests; never loads server credentials.
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const cache=new Map();
function load(relative){
 const file=path.resolve(relative);
 if(cache.has(file))return cache.get(file).exports;
 const module={exports:{}};cache.set(file,module);
 const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 function localRequire(name){
  if(name==='server-only')return {};
  if(name.startsWith('@/'))return load(fs.existsSync(name.slice(2)+'.ts')?name.slice(2)+'.ts':name.slice(2)+'.tsx');
  if(name.startsWith('.'))return load(fs.existsSync(path.resolve(path.dirname(file),name)+'.ts')?path.resolve(path.dirname(file),name)+'.ts':path.resolve(path.dirname(file),name)+'.tsx');
  return require(name);
 }
 new Function('require','module','exports',js)(localRequire,module,module.exports);
 return module.exports;
}
module.exports={load};
