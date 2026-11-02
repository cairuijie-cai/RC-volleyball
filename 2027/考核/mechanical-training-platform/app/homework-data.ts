import { z } from 'zod';
export const MAX_FILE_BYTES=20*1024*1024;
export const FILE_ACCEPT='.sldprt,.sldasm,.slddrw,.step,.stp,.iges,.igs,.stl,.x_t,.x_b,.dwg,.dxf,.zip,.7z,.rar,.png,.jpg,.jpeg,.pdf';
export const homeworkStatuses={submitted:'待检查',revise:'待修改',reviewed:'已检查'} as const;
export const homeworkSchema=z.object({
 kind:z.enum(['daily','drawing','phone','assembly']).default('daily'),
 id:z.string().uuid(),studentId:z.string().min(1).max(100),
 date:z.string().refine(v=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v,'学习日期不正确'),
 lesson:z.string().trim().min(1,'请填写当天所学章节或模型名称').max(300),
 files:z.array(z.string().uuid()).max(20).default([]),
 status:z.enum(['submitted','revise','reviewed']),grade:z.number().min(0).max(100).nullable(),
 feedback:z.string().max(3000),note:z.string().max(2000),includeFinal:z.boolean().default(true),updatedAt:z.string().max(40),
}).superRefine((h,ctx)=>{
 if(new Set(h.files).size!==h.files.length)ctx.addIssue({code:'custom',message:'作业文件重复',path:['files']});
 if(h.kind!=='daily'&&!h.files.length)ctx.addIssue({code:'custom',message:'请至少上传一个考核材料文件',path:['files']});
});
export type Homework=z.infer<typeof homeworkSchema>;
export type HomeworkFile={id:string;studentId:string;name:string;size:number;contentType:string;createdAt:string};
export function fileType(name:string){const ext=name.toLowerCase().slice(name.lastIndexOf('.'));return FILE_ACCEPT.split(',').includes(ext)?ext:null;}
export function fileSize(size:number){return size<1024*1024?(size/1024).toFixed(1)+' KB':(size/1024/1024).toFixed(1)+' MB';}
export function homeworkSummary(items:Homework[]){items=items.filter(h=>h.kind==='daily');const selected=items.filter(h=>h.includeFinal);const scored=selected.filter(h=>h.status==='reviewed'&&h.grade!==null);return {days:new Set(items.map(h=>h.date)).size,count:items.length,selected:selected.length,checked:selected.filter(h=>h.status==='reviewed').length,scored:scored.length,average:scored.length?Math.round(scored.reduce((a,h)=>a+h.grade!,0)/scored.length*10)/10:null};}
