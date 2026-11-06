/* Run from project root: node src/tests/news-phase13-api.cjs
 * Mocked HTTP + SQL-boundary regressions; no live database is used.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
let active=true,authId=10,hasPerson=true,dbShouldFail=false;
const executions=[];
let dbRequestCount=0;
const fakeSql={BigInt:'bigint',Int:'int',TinyInt:'tinyint',UniqueIdentifier:'uuid',Bit:'bit',MAX:-1,
 NChar:n=>'nchar('+n+')',NVarChar:n=>'nvarchar('+n+')',VarBinary:n=>'varbinary('+n+')'};
const fakePool={request(){dbRequestCount++;const values={};return {
 input(k,t,v){values[k]=v;return this},
 async query(q){executions.push({mode:'query',q,values}); if(q.includes('HasPerson'))return {recordset:hasPerson?[{HasPerson:1}]:[]};return {recordset:[]};},
 async execute(proc){executions.push({mode:'execute',proc,values});if(dbShouldFail)throw new Error('SQL internal: Invalid object dbo.SecretTable');return {recordset:[{ShomareKhabar:100,StateName:'ارسال شد'}],recordsets:[]};}
};}};
const cache={};
const mocks={
 'next/server':{NextResponse:{json:(body,opt={})=>({status:opt.status||200,body,headers:opt.headers||{}})}},
 'mssql':fakeSql,
 '@/lib/db':{getConnection:async()=>fakePool},
 '@/lib/auth':{verifyToken:(v)=>{if(v!=='signed')throw Error('bad token');return {userId:authId};}},
 '@/lib/userScope':{getAuthActor:async(token)=>{if(token!=='signed'||!active)throw Error('UNAUTHORIZED');return {userId:authId,mahal:101};}}
};
function load(filename){const file=path.join(root,filename);if(cache[file])return cache[file];
 const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true},fileName:file}).outputText;
 const mod={exports:{}};const ctx={module:mod,exports:mod.exports,Buffer,File:globalThis.File,Error,SyntaxError,console:{error:()=>{}}};
 ctx.require=(id)=>{
   if(id==='../_shared')return load('app/Api/Akhbar/_shared.ts');
   if(id==='@/lib/newsPhase13Validation')return load('lib/newsPhase13Validation.ts');
   if(id in mocks)return mocks[id];
   if(id==='path')return require('node:path');
   throw Error('Unexpected import: '+id+' in '+filename);
 };
 vm.runInNewContext(js,ctx,{filename});cache[file]=mod.exports;return mod.exports;
}
const request=(body,token='signed')=>({cookies:{get:()=>token?{value:token}:undefined},json:async()=>body,
 headers:{get:()=>null},nextUrl:{searchParams:new URLSearchParams()}});
let total=0;
async function check(label,fn){await fn();total++;console.log('PASS',label);}
const post=(name,body,token)=>load('app/Api/Akhbar/'+name+'/route.ts').POST(request(body,token));
const news={createUserId:10,lastEditUserId:10,shomareKhabar:100,tabaqehBandi:1,noeKhabar:1,manbaKhabarId:2,
 onvanKhabar:'تیتر',sharhKhabar:'متن',molahazatKhabar:'',tarikhNameh:'',tarikhEnteshar:'',shomareNameh:''};
(async()=>{
 await check('cross-account creation is rejected before SQL write',async()=>{
  const before=executions.length;const r=await post('Insert',{...news,createUserId:11});assert.equal(r.status,403);assert.equal(executions.length,before);
 });
 await check('expired/disabled account is rejected',async()=>{
  active=false;const r=await post('Insert',news);assert.equal(r.status,401);active=true;
 });
 await check('unsigned requests fail',async()=>{const r=await post('Insert',news,null);assert.equal(r.status,401)});
 await check('new draft accepts empty optional Jalali dates',async()=>{
  const r=await post('Insert',news);assert.equal(r.status,200);
  const x=executions.at(-1);assert.equal(x.proc,'Akhbar.SP_InsertKhabar');assert.equal(x.values.TarikhNameh,null);
 });
 await check('update carries the same validated fields as insert',async()=>{
  const r=await post('Update',{...news,tarikhNameh:'1403/07/30',tarikhEnteshar:'1403/01/01'});assert.equal(r.status,200);
  const x=executions.at(-1);assert.equal(x.proc,'Akhbar.SP_UpdateKhabar');assert.equal(x.values.ShomareKhabar,100);
 });
 await check('today is allowed for both news dates',async()=>{
  const today=load('lib/newsPhase13Validation.ts').todayJalaliIran();
  const r=await post('Insert',{...news,tarikhNameh:today,tarikhEnteshar:today});
  assert.equal(r.status,200);
  const x=executions.at(-1);assert.equal(x.values.TarikhNameh,today);assert.equal(x.values.TarikhEnteshar,today);
 });
 await check('future letter or publication date is rejected before DB in create and update',async()=>{
  const before=executions.length;
  for(const endpoint of ['Insert','Update']){
   for(const field of ['tarikhNameh','tarikhEnteshar']){
    const r=await post(endpoint,{...news,[field]:'1499/01/01'});
    assert.equal(r.status,400);
    assert.match(r.body.error,/بعد از تاریخ امروز/);
   }
  }
  assert.equal(executions.length,before);
 });
 await check('invalid Jalali month lengths rejected before SQL',async()=>{
  const before=executions.length;const r=await post('Insert',{...news,tarikhNameh:'1403/07/31'});
  assert.equal(r.status,400);assert.equal(executions.length,before);
 });
 await check('invalid/oversized headlines cannot be silently truncated',async()=>{
  const before=executions.length;
  for(const v of ['', 'x'.repeat(501)]){const r=await post('Insert',{...news,onvanKhabar:v});assert.equal(r.status,400)}
  assert.equal(executions.length,before);
 });
 await check('invalid source ID and non-string descriptions are rejected',async()=>{
  assert.equal((await post('Insert',{...news,manbaKhabarId:2147483648})).status,400);
  assert.equal((await post('Insert',{...news,sharhKhabar:{spoofed:'content'}})).status,400);
 });
 await check('invalid hotspot id cannot be silently ignored',async()=>{
  const r=await post('Update',{...news,noghteKhabarkhizId:'invalid'});assert.equal(r.status,400);
 });
 await check('person search rejects NaN, fractions and excessive page size',async()=>{
  for(const overrides of [{page:'abc'},{page:1.3},{sizePage:100},{search:'x'.repeat(151)}]){
   const r=await post('SearchPersons',{userId:10,shomareKhabar:100,...overrides});assert.equal(r.status,400);
  }
 });
 await check('person search valid page stays within bounded SQL parameters',async()=>{
  const r=await post('SearchPersons',{userId:10,shomareKhabar:100,page:2,sizePage:10,search:'احمد'});
  assert.equal(r.status,200);const x=executions.at(-1);assert.equal(x.proc,'Akhbar.SP_SearchAshkhas');assert.equal(x.values.Page,2);
 });
 await check('blank hotspot is rejected',async()=>{
  const r=await post('InsertHotspot',{createUserId:10,onvan:'   '});assert.equal(r.status,400);
 });
 const key='550e8400-e29b-41d4-a716-446655440000';
 await check('send requires an associated person',async()=>{
  hasPerson=false;const r=await post('Send',{userId:10,shomareKhabar:100,requestKey:key});assert.equal(r.status,422);hasPerson=true;
 });
 await check('send rejects invalid request identifier',async()=>{
  const r=await post('Send',{userId:10,shomareKhabar:100,requestKey:'not-uuid'});assert.equal(r.status,422);
 });
 await check('send rejects malformed expected receiver instead of bypassing preflight',async()=>{
  const r=await post('Send',{userId:10,shomareKhabar:100,requestKey:key,expectedToUserId:'abc'});assert.equal(r.status,400);
 });
 await check('valid send passes the same UUID and recipient to SQL procedure',async()=>{
  const r=await post('Send',{userId:10,shomareKhabar:100,requestKey:key,expectedToUserId:50});assert.equal(r.status,200);
  const x=executions.at(-1);assert.equal(x.proc,'Akhbar.SP_SendKhabar');assert.equal(x.values.RequestKey,key);assert.equal(x.values.ExpectedToUserId,50);
 });
 await check('return allows free-text-only reason without predefined tags',async()=>{
  const r=await post('Return',{userId:10,shomareKhabar:100,tozihat:'توضیح علت برگشت',eshkalatIds:''});
  assert.equal(r.status,200);const x=executions.at(-1);assert.equal(x.proc,'Akhbar.SP_ReturnKhabar');assert.equal(x.values.EshkalatIds,'');
 });
 await check('return rejects oversized or nonnumeric tag IDs',async()=>{
  assert.equal((await post('Return',{userId:10,shomareKhabar:100,tozihat:'علت آزاد',eshkalatIds:'x'.repeat(501)})).status,400);
  assert.equal((await post('Return',{userId:10,shomareKhabar:100,tozihat:'علت آزاد',eshkalatIds:'1;DROP'})).status,400);
 });
 await check('return rejects an empty reason',async()=>{
  const r=await post('Return',{userId:10,shomareKhabar:100,tozihat:'  ',eshkalatIds:''});assert.equal(r.status,400);
 });
 await check('database internal errors are not sent to browser',async()=>{
  dbShouldFail=true;const r=await post('Update',news);dbShouldFail=false;
  assert.equal(r.status,500);assert.ok(!JSON.stringify(r.body).includes('SecretTable'));
 });
 await check('wrong user cannot read inbox or history',async()=>{
  for(const name of ['GetList','GetWorkflow','GetAttachments']){
   const r=await post(name,{userId:99,shomareKhabar:100});assert.equal(r.status,403);
  }
 });
 console.log(`Phase 13 HTTP boundary suite passed: ${total} scenarios (mocked SQL; no live workflow claims).`);
})().catch(e=>{console.error(e);process.exitCode=1});
