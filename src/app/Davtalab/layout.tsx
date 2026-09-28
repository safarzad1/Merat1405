import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import AppTopbar from "@/component/AppTopbar";
import ResearchProviders from "@/component/ResearchProviders";
import {verifyToken} from "@/lib/auth";
import "./davtalab.css";

type SessionPayload={username?:string;fullName?:string;postId?:number};
export default async function DavtalabLayout({children}:{children:React.ReactNode}){
  const cookieStore=await cookies();
  const token=cookieStore.get("token")?.value;
  const hasSession=cookieStore.get("merat-new-session")?.value==="1";
  if(!token||!hasSession)redirect("/Login");
  let session:SessionPayload;
  try{session=verifyToken(token) as SessionPayload}catch{redirect("/Api/Auth/Logout")}
  return <div dir="rtl"><AppTopbar fullName={session.fullName||session.username} postId={Number(session.postId||0)}/><ResearchProviders><main className="davtalab-page-shell"><div className="davtalab-page-content">{children}</div></main></ResearchProviders></div>
}
