import {isPlatformOwner} from '../../owner-access';
import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { MAX_FILE_BYTES, fileType } from '../../homework-data';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request){
 const user=await getChatGPTUser();if(!user)return json({error:'请先登录'},401);
 if(!isPlatformOwner(user))return json({error:'仅组长可以访问原文件'},403);
 if(!env.DB)return json({error:'数据库尚未连接'},503);
 try{const studentId=new URL(request.url).searchParams.get('studentId');
 const sql='SELECT id, student_id AS studentId, name, size, content_type AS contentType, created_at AS createdAt FROM homework_files WHERE user_id = ?'+(studentId?' AND student_id = ?':'')+' ORDER BY created_at DESC LIMIT 5000';
 const files=await env.DB.prepare(sql).bind(...(studentId?[user.userId,studentId]:[user.userId])).all();return json({files:files.results});
 }catch{return json({error:'读取文件列表失败，请重试'},500);}
}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return json({error:'请先登录'},401);
 if(!isPlatformOwner(user))return json({error:'仅组长可以访问原文件'},403);
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'请求来源不匹配'},403);
 if(!env.DB||!env.BUCKET)return json({error:'文件存储尚未连接，请稍后重试'},503);
 const url=new URL(request.url),studentId=url.searchParams.get('studentId'),name=url.searchParams.get('name')?.trim();
 if(!studentId||!name||name.length>200||/[\x00-\x1f\x7f\\/]/.test(name)||!fileType(name))return json({error:'文件名称或格式不支持，请上传 SW 原文件、CAD 文件、截图、PDF 或压缩包'},400);
 if(!request.body)return json({error:'文件为空'},400);
 if(Number(request.headers.get('content-length'))>MAX_FILE_BYTES)return json({error:'单个文件不能超过 20 MB'},413);
 try{
  const row=await env.DB.prepare('SELECT payload FROM training_workspaces WHERE user_id = ?').bind(user.userId).first<{payload:string}>();
  const workspace=row?JSON.parse(row.payload):null;
  if(!workspace?.students?.some((s:{id:string})=>s.id===studentId))return json({error:'请先保存新人档案，再上传作业'},400);
  const quota=await env.DB.prepare('SELECT COUNT(*) AS count, COALESCE(SUM(size), 0) AS bytes FROM homework_files WHERE user_id = ?').bind(user.userId).first<{count:number;bytes:number}>();
  if((quota?.count??0)>=5000)return json({error:'文件数量已达上限'},413);
  const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;
  while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>MAX_FILE_BYTES){await reader.cancel();return json({error:'单个文件不能超过 20 MB'},413);}chunks.push(part.value);}
  if(!size)return json({error:'文件为空'},400);
  if((quota?.bytes??0)+size>2*1024*1024*1024)return json({error:'文件存储已达 2 GB 上限，请先整理作业'},413);
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  const ext=fileType(name),contentType=ext==='.png'?'image/png':ext==='.jpg'||ext==='.jpeg'?'image/jpeg':ext==='.pdf'?'application/pdf':'application/octet-stream';
  const id=crypto.randomUUID(),createdAt=new Date().toISOString(),objectKey='homework/'+encodeURIComponent(user.userId)+'/'+id;
  await env.BUCKET.put(objectKey,bytes,{httpMetadata:{contentType}});
  try{await env.DB.prepare('INSERT INTO homework_files (id, user_id, student_id, name, size, content_type, object_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(id,user.userId,studentId,name,size,contentType,objectKey,createdAt).run();}
  catch(e){await env.BUCKET.delete(objectKey);throw e;}
  return json({file:{id,studentId,name,size,contentType,createdAt}},201);
 }catch{return json({error:'上传失败，请重试。未上传的文件仍保留在本机。'},500);}
}
