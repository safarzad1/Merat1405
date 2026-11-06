/* Release checks for phase 14 (runs with mocked SQL; NO live data mutation).
 * From project root: NODE_PATH=$(npm root -g) node src/tests/news-phase14-release.cjs
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
let passed=0;
function check(desc,truth){assert.ok(truth,desc);passed++;console.log('PASS',desc)}
const compiled={};
function load(source,depends={}){
  const abs=path.join(root,source);
  const js=ts.transpileModule(fs.readFileSync(abs,'utf8'),{fileName:abs,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const mod={exports:{}};
  const context={module:mod,exports:mod.exports,Buffer,File:globalThis.File,Uint8Array,Error,console};
  context.require=id=>{
    if (id in depends) return depends[id];
    if (id==='node:crypto'||id==='crypto') return require('node:crypto');
    if (id==='path') return require('node:path');
    throw Error('Unknown dependency: '+id);
  };
  vm.runInNewContext(js,context,{filename:abs});
  return mod.exports;
}
const signature=load('lib/newsAttachmentValidation.ts').newsAttachmentSignatureValid;
const jpeg=Buffer.from([0xff,0xd8,0xff,0xe0,0x00,0x10]);
const png=Buffer.from([0x89,0x50,0x4e,0x47,13,10,26,10,0,0]);
const mp3=Buffer.from('ID3\x04\x00\x00\x00','binary');
const webm=Buffer.from([0x1a,0x45,0xdf,0xa3,0x9f,0x42]);
const mp4=Buffer.concat([Buffer.from([0,0,0,24]),Buffer.from('ftypisom'),Buffer.alloc(8)]);
const mov=Buffer.concat([Buffer.from([0,0,0,12]),Buffer.from('moov'),Buffer.alloc(4)]);
check('JPEG signature accepted',signature('.jpg',jpeg));
check('JPEG alternative extension accepted',signature('.jpeg',jpeg));
check('PNG signature accepted',signature('.png',png));
check('MP3 ID3 signature accepted',signature('.mp3',mp3));
check('MP3 audio frame signature accepted',signature('.mp3',Buffer.from([255,251,0x90,0x64])));
check('MP4 ftyp signature accepted',signature('.mp4',mp4));
check('M4V ftyp signature accepted',signature('.m4v',mp4));
check('WebM EBML header accepted',signature('.webm',webm));
check('QuickTime atom accepted',signature('.mov',mov));
check('fake renamed JPG rejected',!signature('.jpg',Buffer.from('<script>alert(1)</script>')));
check('wrong image signature rejected',!signature('.png',jpeg));
check('PDF renamed as MP4 rejected',!signature('.mp4',Buffer.from('%PDF-1.7')));
check('HTML renamed as audio rejected',!signature('.mp3',Buffer.from('<html></html>')));
check('short/truncated file rejected',!signature('.png',Buffer.from([0x89,0x50])));
check('unsupported extension rejected',!signature('.svg',Buffer.from('<svg></svg>')));
let executed=0, active=true, requester=10;
const fakeSql={BigInt:'bigint',Int:'int',MAX:-1,NVarChar:n=>'nvarchar('+n+')',VarBinary:n=>'varbinary('+n+')'};
const fakePool={request(){let vals={};return {input(k,t,v){vals[k]=v;return this;},async execute(proc){executed++;return {recordset:[{Files:jpeg,FileName:'a.jpg'}]};}};}};
const shared={authorize:req=>req.cookies.get('token')?.value==='signed'?null:{status:401},
  async assertSessionUser(req,user){if(!active)throw Error('UNAUTHORIZED');if(user!==requester)throw Error('FORBIDDEN')},
  positiveNumber(v,name){const n=Number(v);if(!Number.isSafeInteger(n)||n<=0)throw Error('BAD_NUMBER');return n},
  NewsInputError:class extends Error {constructor(message){super(message);this.name='NewsInputError';}},
  errorResponse(err){return {status:err.message==='FORBIDDEN'?403:err.message==='UNAUTHORIZED'?401:400,body:{error:err.message}}}
};
const NextResponse=class {constructor(body,options){this.body=body;this.status=options.status;this.headers=options.headers;}
  static json(body,options){return {status:options?.status||200,body,headers:options?.headers||{}}}}
const routeMocks={'next/server':{NextResponse},'mssql':fakeSql,'@/lib/db':{getConnection:async()=>fakePool},'../_shared':shared,
  '@/lib/newsAttachmentValidation':{newsAttachmentSignatureValid:signature}};
const upload=load('app/Api/Akhbar/UploadAttachment/route.ts',routeMocks).POST;
const download=load('app/Api/Akhbar/GetAttachmentFile/route.ts',routeMocks).GET;
function cookie(token='signed'){return {get:()=>token?{value:token}:null}}
function file(name,bytes){return new File([bytes],name)}
function uploadRequest(name,bytes,userId=10){return {cookies:cookie(),headers:{get:()=>null},async formData(){return new Map([['shomareKhabar','41'],['userId',String(userId)],['file',file(name,bytes)]])}}}
(async()=>{
 let before=executed;
 let r=await upload(uploadRequest('unsafe.jpg',Buffer.from('<html></html>')));
 check('spoofed extension rejected by HTTP endpoint',r.status===400 && executed===before);
 r=await upload(uploadRequest('valid.png',png));
 check('valid image reaches SQL upload procedure',r.status===200 && executed===before+1);
 before=executed;
 r=await upload(uploadRequest('valid.jpg',jpeg,11));
 check('cross-account upload rejected before SQL',r.status===403 && executed===before);
 r=await upload(uploadRequest('fake.mp4',Buffer.from('notvideo')));
 check('fake video rejected before SQL',r.status===400 && executed===before);
 const query=(fileName,userId=10)=>({cookies:cookie(),nextUrl:{searchParams:new URLSearchParams({shomareKhabar:'41',userId:String(userId),fileName})}});
 r=await download(query('x.unknown'));
 check('unknown legacy download uses binary MIME',r.status===200 && r.headers['Content-Type']==='application/octet-stream' && r.headers['Content-Disposition']==='attachment');
 before=executed;
 r=await download(query('../invalid.png'));
 check('unsafe attachment name rejected before SQL',r.status===400 && executed===before);
 r=await download(query('x.jpg',11));
 check('cross-account download rejected',r.status===403 && executed===before);
 const extensions=['','.ts','.tsx','.js','.jsx','.json','.css','.scss','.d.ts'];
 function exists(spec,f){const target=spec.startsWith('@/')?path.join(root,spec.slice(2)):path.resolve(path.dirname(f),spec);return extensions.some(x=>fs.existsSync(target+x)&&fs.statSync(target+x).isFile()) ||extensions.some(x=>fs.existsSync(path.join(target,'index'+x)));}
 let imports=0,unresolved=[];
 function walk(d){for(const entry of fs.readdirSync(d,{withFileTypes:true})){const f=path.join(d,entry.name);if(entry.isDirectory())walk(f);else if(/\.(ts|tsx|js|jsx)$/.test(entry.name)){
   const s=fs.readFileSync(f,'utf8');let m;const exp=/(?:\bfrom\s*|\bimport\s*\(|\brequire\s*\()\s*['"]([^'"]+)['"]/g;
   while((m=exp.exec(s)))if(m[1].startsWith('@/')||m[1].startsWith('./')||m[1].startsWith('../')){
     imports++;if(!exists(m[1],f))unresolved.push(`${path.relative(root,f)}: ${m[1]}`);
   }
 }}}
 walk(root);
 check(`all ${imports} project-local imports resolve`,unresolved.length===0);
 console.log('Phase 14 checks:',passed,'passed; mock DB only; no production certification.');
})().catch(err=>{console.error(err);process.exitCode=1});
