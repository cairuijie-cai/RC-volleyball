import { z } from 'zod';
import { homeworkSchema } from './homework-data';
import {assessmentConfigSchema,assessmentReviewSchema,defaultAssessment,assessmentBasis,assessmentReady,assessmentTotal} from './assessment-data';
const text = (max: number) => z.string().max(max);
const link = z.string().max(2000).refine(v => !v || /^https?:\/\//i.test(v), '链接必须以 http:// 或 https:// 开头');
export const statuses = { not_started: '未开始', learning: '学习中', submitted: '待检查', revise: '待修改', reviewed: '已完成' } as const;
export const stages = ['入门基础', '零件与装配', '机械基础', '综合检查'];
const studentSchema = z.object({ id: text(100).min(1), name: text(60).min(1), className: text(60).default(''), studentNumber: text(30).refine(v=>!v||/^\d+$/.test(v),'学号请填写数字').default(''), experience: text(100), hours: z.number().min(0).max(168).nullable().default(null), note: text(2000) });
const resourceSchema = z.object({ id: text(100).min(1), title: text(120).min(1), url: link, category: text(60), description: text(2000) });
const taskSchema = z.object({ id: text(100).min(1), title: text(120).min(1), stage: text(60), deadline: text(20).refine(v => !v || /^\d{4}-\d{2}-\d{2}$/.test(v)), resourceId: text(100), range: text(500), instructions: text(5000), deliverables: text(3000) });
const recordSchema = z.object({ studentId: text(100), taskId: text(100), status: z.enum(['not_started','learning','submitted','revise','reviewed']), progress: z.number().int().min(0).max(100), quality: z.number().min(0).max(100).nullable(), understanding: z.number().min(0).max(100).nullable(), improvement: z.number().min(0).max(100).nullable(), feedback: text(3000), workUrl: link, updatedAt: text(40) });
export const workspaceSchema = z.object({ teamName: text(80).min(1), students: z.array(studentSchema).max(300), resources: z.array(resourceSchema).max(100), tasks: z.array(taskSchema).max(200), records: z.array(recordSchema).max(10000), homework: z.array(homeworkSchema).max(3000).default([]), assessment:assessmentConfigSchema.default(defaultAssessment), assessmentReviews:z.array(assessmentReviewSchema).max(300).default([]), appliedRosterImports: z.array(text(100)).max(100).default([]) }).superRefine((s, ctx) => {
  for (const key of ['students','resources','tasks'] as const) if (new Set(s[key].map(x => x.id)).size !== s[key].length) ctx.addIssue({ code:'custom',message:'存在重复编号',path:[key] });
  const numbers=s.students.map(x=>x.studentNumber).filter(Boolean);if(new Set(numbers).size!==numbers.length)ctx.addIssue({code:'custom',message:'学号重复，请检查新人档案'});
  const pairs = new Set<string>();
  for (const r of s.records) {
    if (!s.students.some(x=>x.id===r.studentId) || !s.tasks.some(x=>x.id===r.taskId)) ctx.addIssue({code:'custom',message:'记录引用了不存在的新人或任务'});
    const pair = r.studentId + ':' + r.taskId;
    if (pairs.has(pair)) ctx.addIssue({code:'custom',message:'存在重复进度记录'});
    pairs.add(pair);
    if (r.status==='reviewed' && (r.progress!==100 || [r.quality,r.understanding,r.improvement].some(x=>x===null))) ctx.addIssue({code:'custom',message:'完成任务前请填写三项评分，并将进度设为 100%'});
  }
  for (const t of s.tasks) if(t.resourceId && !s.resources.some(r=>r.id===t.resourceId)) ctx.addIssue({code:'custom',message:'任务关联的资料不存在'});
  if(new Set(s.homework.map(h=>h.id)).size!==s.homework.length) ctx.addIssue({code:'custom',message:'每日作业编号重复'});
  const files=new Set<string>(),finalPairs=new Set<string>();
  for(const review of s.assessmentReviews){
    if(!s.students.some(x=>x.id===review.studentId))ctx.addIssue({code:'custom',message:'评分引用了不存在的新人'});
    if(s.assessmentReviews.filter(x=>x.studentId===review.studentId).length>1)ctx.addIssue({code:'custom',message:'存在重复最终评分'});
    if(review.confirmed&&(review.basis!==assessmentBasis(s,review.studentId)||!assessmentReady(s,review.studentId)||assessmentTotal(s,review)===null))ctx.addIssue({code:'custom',message:'材料或分值已变化，或者考核未齐全，请先取消确认并重新评分'});
  }
  for(const h of s.homework){
    if(h.kind!=='daily'){const pair=h.studentId+':'+h.kind;if(finalPairs.has(pair))ctx.addIssue({code:'custom',message:'每位新人每项最终考核只保留一条记录，请编辑现有记录'});finalPairs.add(pair);}
    if(!s.students.some(x=>x.id===h.studentId)) ctx.addIssue({code:'custom',message:'作业引用了不存在的新人'});
    for(const id of h.files){if(files.has(id))ctx.addIssue({code:'custom',message:'同一文件不能重复归入多份作业'});files.add(id);}
  }
});
export type Workspace = z.infer<typeof workspaceSchema>;
export type Student = Workspace['students'][number];
export type Task = Workspace['tasks'][number];
export type Resource = Workspace['resources'][number];
export type RecordEntry = Workspace['records'][number];
export function score(r?: RecordEntry) { return r && r.quality !== null && r.understanding !== null && r.improvement !== null ? Math.round((r.quality*.4+r.understanding*.4+r.improvement*.2)*10)/10 : null; }
export function emptyRecord(studentId:string, taskId:string):RecordEntry { return {studentId,taskId,status:'not_started',progress:0,quality:null,understanding:null,improvement:null,feedback:'',workUrl:'',updatedAt:''}; }
export function initialWorkspace(): Workspace {
  return { teamName:'ROBOCON 2027 机械组', students:[], records:[], homework:[], assessment:structuredClone(defaultAssessment), assessmentReviews:[], appliedRosterImports:[], resources:[
    {id:'sw',title:'阿奇 SOLIDWORKS 教学合集',url:'https://b23.tv/hzUjXcO',category:'软件入门',description:'组长提供的 SW 教学合集入口。按任务指定学习章节，并通过独立练习检查掌握情况。'},
    {id:'hust',title:'华中科技大学机械组培训合集',url:'https://b23.tv/OGCSs4k',category:'机械基础与进阶',description:'组长提供的合集入口，当前链接对应《齿轮、齿轮组与轴系》。任务中的学习范围由组长安排。'},
  ], tasks:[
    {id:'task-1',title:'第一阶段 · 草图与基础建模',stage:stages[0],deadline:'',resourceId:'sw',range:'从合集中选择草图、尺寸约束、拉伸与切除相关章节',instructions:'先跟做一个简单零件，再根据给定尺寸独立完成一个难度相近的零件。检查草图约束，并能现场修改一个尺寸。',deliverables:'跟做模型；独立练习模型；遇到的问题'},
    {id:'task-2',title:'第二阶段 · 零件与简单装配',stage:stages[1],deadline:'',resourceId:'sw',range:'从合集中选择零件建模与简单装配相关章节',instructions:'完成一个由少量零件组成的支架装配。解释连接方式，检查装配干涉；工程图要求按已教内容调整。',deliverables:'零件与装配文件；装配截图；连接方式说明'},
    {id:'task-3',title:'第三阶段 · 机械基础学习',stage:stages[2],deadline:'',resourceId:'hust',range:'由组长从机械组培训合集中指定章节；齿轮与轴系内容可按基础分阶段学习',instructions:'结合指定章节，识别常见机械零件，画出简单传动关系并解释。组长先讲解必要基础，再检查理解情况。',deliverables:'简短学习笔记；传动关系示意；疑问清单'},
    {id:'task-4',title:'第四阶段 · 检查、反馈与修改',stage:stages[3],deadline:'',resourceId:'',range:'回顾前三阶段的任务与反馈',instructions:'完成一个使用已学操作的小组件，每人现场讲解约 5 分钟，并根据组长指出的问题修改。评分兼顾完成质量、理解和修改能力。',deliverables:'最终模型；已教范围内的工程图；修改前后记录'},
  ] };
}
