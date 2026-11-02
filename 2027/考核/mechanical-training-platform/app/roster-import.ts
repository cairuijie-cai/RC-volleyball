import { z } from 'zod';
import { workspaceSchema, type Workspace } from './training-data';
const entry=z.object({name:z.string().trim().min(1).max(60),className:z.string().trim().min(1).max(60),studentNumber:z.string().regex(/^\d{1,30}$/)});
export const rosterBatchSchema=z.object({batchId:z.string().uuid(),recipientEmail:z.string().email(),students:z.array(entry).min(1).max(300)}).refine(b=>new Set(b.students.map(s=>s.studentNumber)).size===b.students.length,'名单中存在重复学号');
export function applyRoster(data:Workspace,batch:z.infer<typeof rosterBatchSchema>,email:string){
 if(batch.recipientEmail.toLowerCase()!==email.toLowerCase()||data.appliedRosterImports.includes(batch.batchId))return null;
 const next=structuredClone(data);
 for(const s of batch.students){
  let existing=next.students.find(x=>x.studentNumber===s.studentNumber);
  if(!existing){const matches=next.students.filter(x=>!x.studentNumber&&x.name===s.name);if(matches.length>1)throw new Error('同名新人无法自动匹配，请先补充学号');existing=matches[0];}
  if(existing)Object.assign(existing,s);
  else next.students.push({id:crypto.randomUUID(),...s,experience:'待了解',hours:null,note:''});
 }
 next.appliedRosterImports.push(batch.batchId);return workspaceSchema.parse(next);
}
