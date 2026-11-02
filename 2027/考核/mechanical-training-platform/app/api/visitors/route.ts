import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {getChatGPTUser} from '../../chatgpt-auth';
import {isPlatformOwner} from '../../owner-access';
import {readSharedWorkspace} from '../../public-data';
import {viewerColumns} from '../../viewer-access';
import type {ViewerRow} from '../../viewer-types';
export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(){
 const user=await getChatGPTUser();if(!user)return json({error:'请先登录'},401);if(!isPlatformOwner(user))return json({error:'仅组长可以查看登录记录'},403);
 try{
  const data=await readSharedWorkspace(),rows=await env.DB!.prepare('SELECT '+viewerColumns+' FROM training_viewers WHERE owner_id = ? ORDER BY last_seen DESC LIMIT 1000').bind(user.userId).all<ViewerRow>();
  return json({visitors:rows.results.map(r=>{const s=data.students.find(s=>s.id===r.studentId);return {...r,studentName:s?.name??'待关联',className:s?.className??''};}),registered:data.students.filter(s=>rows.results.some(r=>r.studentId===s.id)).length,total:data.students.length});
 }catch{return json({error:'读取登录记录失败，请稍后重试'},503);}
}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return json({error:'请先登录'},401);if(!isPlatformOwner(user))return json({error:'仅组长可以解除关联'},403);
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'请求来源不匹配'},403);
 const raw=await request.text();if(raw.length>2000)return json({error:'提交内容过大'},413);
 let id:string;try{id=z.object({userId:z.string().min(1).max(200)}).strict().parse(JSON.parse(raw)).userId;}catch{return json({error:'账号格式不正确'},400);}
 try{const r=await env.DB!.prepare('UPDATE training_viewers SET student_id = NULL WHERE owner_id = ? AND user_id = ? RETURNING user_id').bind(user.userId,id).first();return r?json({saved:true}):json({error:'账号记录不存在'},404);}
 catch{return json({error:'解除关联失败，请重试'},503);}
}
