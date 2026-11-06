/* Read-only SQL Server workflow consistency audit.
 * Run explicitly in a staging copy of MeratDB:
 *   MERAT_NEWS_DB_AUDIT=1 node src/tests/news-phase13-db.cjs
 * Uses existing DB_SERVER, DB_USER, DB_PASSWORD and DB_DATABASE variables.
 * Does not call any action/refresh stored procedure, and does not mutate data.
 */
'use strict';
const assert=require('node:assert/strict');
if(process.env.MERAT_NEWS_DB_AUDIT!=='1'){
 console.error('For an explicit read-only audit set MERAT_NEWS_DB_AUDIT=1 on a staging database.');
 process.exit(2);
}
if(!['DB_SERVER','DB_USER','DB_PASSWORD','DB_DATABASE'].every(k=>process.env[k])){
 console.error('DB_SERVER, DB_USER, DB_PASSWORD and DB_DATABASE are required.');process.exit(2);
}
if(process.env.DB_DATABASE!=='MeratDB'){
 console.error('The audit only supports DB_DATABASE=MeratDB.');process.exit(2);
}
const sql=require('mssql');
const objectNames=[
 'Akhbar.Khabar','Akhbar.KhabarKartabl','Akhbar.KhabarGardeshLog',
 'Akhbar.KhabarReassignmentAudit','Akhbar.KhabarSendRequest',
 'Akhbar.NewsOverdueThreshold','Akhbar.NewsOverdueAlert',
 'Akhbar.SP_SendKhabar','Akhbar.SP_ReturnKhabar','Akhbar.SP_ReassignKhabar',
 'Akhbar.SP_GetKhabarPage','Akhbar.SP_GetNewsAnalytics',
 'Akhbar.SP_RefreshNewsOverdueAlerts','Akhbar.SP_CheckKhabarWorkflowIntegrity',
 'Akhbar.FN_CanViewKhabar','Akhbar.FN_CanEditKhabar'
];
(async()=>{
 let pool;
 try {
  pool=await new sql.ConnectionPool({server:process.env.DB_SERVER,port:Number(process.env.DB_PORT||1433),
   user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_DATABASE,
   options:{encrypt:process.env.DB_ENCRYPT==='true',trustServerCertificate:true}}).connect();
  const obj=await pool.request().query('SELECT name, type FROM sys.objects WHERE schema_id=SCHEMA_ID(N\'Akhbar\')');
  const installed=new Set(obj.recordset.map(r=>'Akhbar.'+r.name));
  const missing=objectNames.filter(n=>!installed.has(n));
  console.log(JSON.stringify({kind:'phase13_dependency_check',total:objectNames.length,missing},null,2));
  if(missing.length)throw Error('Missing news objects: install the prerequisite migrations first.');
  const checks={
   activeInboxDuplicates:`SELECT COUNT_BIG(*) AS Failures FROM (SELECT ShomareKhabar FROM Akhbar.KhabarKartabl WHERE IsActive=1 GROUP BY ShomareKhabar HAVING COUNT_BIG(*)>1) X`,
   openWithoutInbox:`SELECT COUNT_BIG(*) AS Failures FROM Akhbar.Khabar K WHERE K.IsDelete=0 AND (K.CurrentStatusCode LIKE N'KARTABL_%' OR K.CurrentStatusCode LIKE N'BARGASHT_%') AND NOT EXISTS (SELECT 1 FROM Akhbar.KhabarKartabl KT WHERE KT.ShomareKhabar=K.ShomareKhabar AND KT.IsActive=1)`,
   activeInboxOwnerMismatch:`SELECT COUNT_BIG(*) AS Failures FROM Akhbar.KhabarKartabl KT JOIN Akhbar.Khabar K ON K.ShomareKhabar=KT.ShomareKhabar WHERE KT.IsActive=1 AND (K.IsDelete=1 OR K.CurrentUserId<>KT.CurrentUserId OR K.CurrentPostId<>KT.CurrentPostId OR K.CurrentMahal<>KT.CurrentMahal)`,
   finalNewsActiveInbox:`SELECT COUNT_BIG(*) AS Failures FROM Akhbar.Khabar K WHERE K.IsDelete=0 AND K.CurrentStatusCode=N'TAEED_NAHAEI_SETAD' AND EXISTS (SELECT 1 FROM Akhbar.KhabarKartabl KT WHERE KT.ShomareKhabar=K.ShomareKhabar AND KT.IsActive=1)`,
   activeInboxInactiveOwner:`SELECT COUNT_BIG(*) AS Failures FROM Akhbar.KhabarKartabl KT LEFT JOIN dbo.Users U ON U.UserId=KT.CurrentUserId WHERE KT.IsActive=1 AND (U.UserId IS NULL OR ISNULL(U.IsActive,0)=0)`,
   activeInboxOrgMismatch:`SELECT COUNT_BIG(*) AS Failures FROM Akhbar.KhabarKartabl KT JOIN dbo.Users U ON U.UserId=KT.CurrentUserId WHERE KT.IsActive=1 AND (U.PostId<>KT.CurrentPostId OR U.Mahal<>KT.CurrentMahal)`,
   sentRequestDuplicateKeys:`SELECT COUNT_BIG(*) AS Failures FROM (SELECT RequestKey FROM Akhbar.KhabarSendRequest GROUP BY RequestKey HAVING COUNT_BIG(*)>1) X`,
   totalActiveInboxes:`SELECT COUNT_BIG(*) AS Failures FROM Akhbar.KhabarKartabl WHERE IsActive=1`
  };
  const report={kind:'phase13_read_only_workflow_audit',database:process.env.DB_DATABASE,checks:{}};
  for(const [key,query] of Object.entries(checks)){
   const result=await pool.request().query(query);
   const value=Number(result.recordset?.[0]?.Failures??0);
   assert(Number.isFinite(value));report.checks[key]=value;
  }
  const org=await pool.request().query(`SELECT P.RollId,COUNT_BIG(*) AS ActiveUsers
    FROM dbo.Users U INNER JOIN dbo.Posts P ON P.PostId=U.PostId
    WHERE U.IsActive=1 AND P.RollId IN(1,2,3,4)
    GROUP BY P.RollId ORDER BY P.RollId`);
  report.activeUsersByRollId=org.recordset;
  console.log(JSON.stringify(report,null,2));
  const bad=Object.entries(report.checks).filter(([k,n])=>k!=='totalActiveInboxes'&&n>0);
  console.log(bad.length?`Attention: ${bad.length} consistency checks need review. No data were modified.`:
   'No mismatches found in the included read-only checks. This does not certify end-to-end workflows.');
  if(bad.length&&process.env.MERAT_NEWS_DB_STRICT==='1')process.exitCode=1;
 }catch(e){console.error('Phase 13 DB audit failed:',e.message);process.exitCode=1}
 finally{if(pool)await pool.close()}
})();
