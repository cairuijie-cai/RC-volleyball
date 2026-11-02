import {isPlatformOwner} from '../../../owner-access';
import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../../chatgpt-auth';
export const dynamic='force-dynamic';
const json=(error:string,status:number)=>Response.json({error},{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const user=await getChatGPTUser();if(!user)return json('请先登录',401);
 if(!isPlatformOwner(user))return json('仅组长可以访问原文件',403);
 if(!env.DB||!env.BUCKET)return json('文件存储尚未连接',503);
 const {id}=await params;
 try{
  const row=await env.DB.prepare('SELECT name, content_type AS contentType, object_key AS objectKey FROM homework_files WHERE id = ? AND user_id = ?').bind(id,user.userId).first<{name:string;contentType:string;objectKey:string}>();
  if(!row)return json('文件不存在或无权访问',404);
  const file=await env.BUCKET.get(row.objectKey);if(!file)return json('文件已丢失，请重新上传',404);
  const preview=new URL(request.url).searchParams.get('preview')==='1'&&['image/png','image/jpeg'].includes(row.contentType);
  const headers=new Headers({'Content-Type':preview?row.contentType:'application/octet-stream','Content-Length':String(file.size),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
  const name=encodeURIComponent(row.name).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
  headers.set('Content-Disposition',(preview?'inline':'attachment')+"; filename*=UTF-8''"+name);
  return new Response(file.body,{headers});
 }catch{return json('读取文件失败，请重试',500);}
}
