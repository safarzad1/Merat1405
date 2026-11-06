import PanelPage from "@/component/PanelPage";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import sql from "mssql";
import { getAuthActor } from "@/lib/userScope";
import { getConnection } from "@/lib/db";
import DashboardTabs from "./DashboardTabs";
import type { DashboardData, SeriesItem } from "./DashboardCharts";

export const dynamic = "force-dynamic";

function items(rows: Array<{label:unknown;amount:unknown}>): SeriesItem[] {
  return rows.map(r=>({label:String(r.label ?? ""),value:Number(r.amount ?? 0)}));
}

// Scope research by the same geographic hierarchy used by news; do not expose global
// counts from the old dashboard to county or province users.
async function researchForUser(userId:number):Promise<DashboardData> {
  const pool = await getConnection();
  const result = await pool.request().input("UserId",sql.BigInt,userId).query(`
    DECLARE @Mahal BIGINT, @PostId INT, @RollId INT;
    SELECT @Mahal=U.Mahal,@PostId=U.PostId,@RollId=P.RollId
    FROM dbo.Users U JOIN dbo.Posts P ON P.PostId=U.PostId
    WHERE U.UserId=@UserId AND U.IsActive=1;
    IF @Mahal IS NULL THROW 52571,N'کاربر معتبر نیست.',1;
    SELECT E.ErjaId,E.CreateDateTime,E.MahalSender
      INTO #MyErja FROM Tahghighat.Erja E
    WHERE ISNULL(E.IsDelete,0)=0 AND (
      (@RollId=1 AND @Mahal=1)
      OR (@RollId IN(2,5) AND (@PostId BETWEEN 50 AND 56) AND
          (E.MahalSender=@Mahal OR EXISTS (SELECT 1 FROM dbo.Citys C
            WHERE C.CityId=E.MahalSender AND C.PCityId=@Mahal)))
      OR (@RollId=3 AND @PostId IN(60,61) AND
          (E.MahalSender=@Mahal OR EXISTS (SELECT 1 FROM dbo.Citys C
            WHERE C.CityId=E.MahalSender AND C.CityIdHozeh=@Mahal)))
      OR (@RollId=4 AND @PostId=70 AND E.MahalSender=@Mahal)
    );
    CREATE UNIQUE CLUSTERED INDEX IX_DashboardMyErja ON #MyErja(ErjaId);
    SELECT TOP(18) LEFT(LTRIM(RTRIM(E.CreateDateTime)),10) label,COUNT_BIG(*) amount
      FROM #MyErja E WHERE LEN(LTRIM(RTRIM(E.CreateDateTime)))>=10
      AND SUBSTRING(LTRIM(RTRIM(E.CreateDateTime)),5,1)='/'
      GROUP BY LEFT(LTRIM(RTRIM(E.CreateDateTime)),10) ORDER BY label DESC;
    SELECT TOP(18) LEFT(LTRIM(RTRIM(E.CreateDateTime)),7) label,COUNT_BIG(*) amount
      FROM #MyErja E WHERE LEN(LTRIM(RTRIM(E.CreateDateTime)))>=7
      AND SUBSTRING(LTRIM(RTRIM(E.CreateDateTime)),5,1)='/'
      GROUP BY LEFT(LTRIM(RTRIM(E.CreateDateTime)),7) ORDER BY label DESC;
    SELECT TOP(15) COALESCE(C.Name,N'نامشخص') label,COUNT_BIG(*) amount
      FROM #MyErja E LEFT JOIN dbo.Citys C ON C.CityId=E.MahalSender
      GROUP BY C.Name ORDER BY amount DESC;
    SELECT (SELECT COUNT_BIG(*) FROM #MyErja) referrals,
      COUNT_BIG(T.TahghighId) assigned,
      COUNT_BIG(CASE WHEN T.IsDone=1 THEN 1 END) done
      FROM #MyErja E LEFT JOIN Tahghighat.Erja_Tahghigh T
        ON T.ErjaId=E.ErjaId AND T.IsDelete=0;
  `);
  const rs = result.recordsets ?? [];
  return {
    news:{daily:[],monthly:[],provinces:[]},
    research:{daily:items(rs[0] ?? []).reverse(), monthly:items(rs[1] ?? []).reverse(), provinces:items(rs[2] ?? [])},
    totals:{news:0,referrals:Number(rs[3]?.[0]?.referrals ?? 0),assigned:Number(rs[3]?.[0]?.assigned ?? 0),done:Number(rs[3]?.[0]?.done ?? 0)}
  };
}

export default async function DashboardPage({searchParams}:{searchParams?:Promise<{tab?:string}>}) {
  const token=(await cookies()).get("token")?.value;
  if(!token) redirect("/Login");
  let userId:number;
  try { userId=(await getAuthActor(token)).userId; }
  catch { redirect("/Login"); }
  const pool=await getConnection();
  const actor=await pool.request().input("UserId",sql.BigInt,userId)
    .query("SELECT PostId FROM dbo.Users WHERE UserId=@UserId AND IsActive=1");
  const postId=Number(actor.recordset?.[0]?.PostId ?? 0);
  const canSeeNews=![54,55,56].includes(postId);
  const tab=(await searchParams)?.tab;
  let research:DashboardData|null=null;
  let researchError=false;
  try { research=await researchForUser(userId); }
  catch(err) {console.error("Scoped research dashboard failed:",err);researchError=true;}
  return <PanelPage title="داشبورد">
    <DashboardTabs initialTab={tab==="research"?"research":"news"} canSeeNews={canSeeNews} research={research} researchError={researchError}/>
  </PanelPage>;
}
