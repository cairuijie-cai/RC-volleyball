import {isPlatformOwner} from '../../owner-access';
import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { initialWorkspace, workspaceSchema } from '../../training-data';
import { applyRoster, rosterBatchSchema } from '../../roster-import';
import { upgradeFinalAssessmentInput } from '../../assessment-data';
export const dynamic = 'force-dynamic';
const json = (data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET() {
  const user = await getChatGPTUser();
  if(!user) return json({error:'请先登录后打开管理台'},401);
  if(!isPlatformOwner(user))return json({error:'仅组长可以访问管理数据'},403);
  if(!env.DB) return json({error:'平台数据库尚未连接，请稍后重试'},503);
  try {
    const batch=env.INITIAL_STUDENT_ROSTER?rosterBatchSchema.parse(JSON.parse(env.INITIAL_STUDENT_ROSTER)):null;
    for(let attempt=0;attempt<3;attempt++){
      const row = await env.DB.prepare('SELECT payload, revision, updated_at FROM training_workspaces WHERE user_id = ?').bind(user.userId).first<{payload:string;revision:number;updated_at:string}>();
      const input=row?JSON.parse(row.payload):initialWorkspace(),upgraded=upgradeFinalAssessmentInput(input);
      const data=workspaceSchema.parse(upgraded??input),revision=row?.revision??0;
      const rostered=batch?applyRoster(data,batch,user.email):null;
      const next=rostered??(upgraded?data:null);
      if(!next)return json({data,revision,updatedAt:row?.updated_at??null});
      const now=new Date().toISOString();
      const saved=await env.DB.prepare('INSERT INTO training_workspaces (user_id, payload, revision, updated_at) SELECT ?, ?, 1, ? WHERE ? = 0 OR EXISTS (SELECT 1 FROM training_workspaces WHERE user_id = ? AND revision = ?) ON CONFLICT(user_id) DO UPDATE SET payload = excluded.payload, revision = training_workspaces.revision + 1, updated_at = excluded.updated_at WHERE training_workspaces.revision = ? RETURNING revision').bind(user.userId,JSON.stringify(next),now,revision,user.userId,revision,revision).first<{revision:number}>();
      if(saved)return json({data:next,revision:saved.revision,updatedAt:now});
    }
    return json({error:'记录正在更新，请稍后重新连接'},409);
  } catch { return json({error:'读取失败，请稍后重试'},500); }
}
export async function PUT(request:Request) {
  const user = await getChatGPTUser();
  if(!user) return json({error:'请先登录后保存'},401);
  if(!isPlatformOwner(user))return json({error:'仅组长可以修改数据'},403);
  const origin = request.headers.get('origin');
  if(origin && origin !== new URL(request.url).origin) return json({error:'请求来源不匹配'},403);
  if(!env.DB) return json({error:'平台数据库尚未连接'},503);
  const raw = await request.text();
  if(raw.length>1500000) return json({error:'提交内容过大'},413);
  let body;
  try { body=JSON.parse(raw); } catch { return json({error:'提交格式错误'},400); }
  if(!body || typeof body !== 'object' || Array.isArray(body)) return json({error:'提交格式错误'},400);
  const parsed = workspaceSchema.safeParse(upgradeFinalAssessmentInput(body.data)??body.data);
  if(!parsed.success || !Number.isSafeInteger(body.revision) || body.revision<0) return json({error:parsed.success?'版本格式错误':parsed.error.issues[0]?.message??'数据格式错误'},400);
  const now=new Date().toISOString();
  try {
    if(parsed.data.homework.some(h=>h.files.length>0)){
      const available=await env.DB.prepare('SELECT id, student_id AS studentId FROM homework_files WHERE user_id = ?').bind(user.userId).all<{id:string;studentId:string}>();
      const files=new Map(available.results.map(f=>[f.id,f.studentId]));
      if(parsed.data.homework.some(h=>h.files.some(id=>files.get(id)!==h.studentId)))return json({error:'作业文件不存在或不属于该新人，请重新选择文件'},400);
    }
    const row = await env.DB.prepare('INSERT INTO training_workspaces (user_id, payload, revision, updated_at) SELECT ?, ?, 1, ? WHERE ? = 0 OR EXISTS (SELECT 1 FROM training_workspaces WHERE user_id = ? AND revision = ?) ON CONFLICT(user_id) DO UPDATE SET payload = excluded.payload, revision = training_workspaces.revision + 1, updated_at = excluded.updated_at WHERE training_workspaces.revision = ? RETURNING revision').bind(user.userId,JSON.stringify(parsed.data),now,body.revision,user.userId,body.revision,body.revision).first<{revision:number}>();
    if(!row) return json({error:'另一窗口已修改数据。请先导出本地备份，再刷新页面重新编辑。'},409);
    return json({revision:row.revision,updatedAt:now});
  } catch { return json({error:'保存失败，修改仍保留在本页面，请重试或导出备份'},500); }
}
