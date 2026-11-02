import {z} from 'zod';
import type {Workspace} from './training-data';
export const assessmentLabels={daily:'日常作业',drawing:'三视图建模',phone:'测绘',assembly:'零件装配'} as const;
export const assessmentKeys=['daily','drawing','phone','assembly'] as const;
export const finalAssessmentKeys=['drawing','phone','assembly'] as const;
export type AssessmentKind=typeof assessmentKeys[number];
const text=(max:number)=>z.string().max(max);
export const defaultAssessment={
 formatVersion:2, weights:{daily:0,drawing:20,phone:35,assembly:45},
 deadline:'',
 requirements:{
  daily:'',
  drawing:'根据组长提供的带尺寸三视图独立建模。提交题目原图、SLDPRT、模型三视图与关键尺寸截图；附简短建模说明。只使用已学操作。',
  phone:'测量自己的手机，建立简化外形模型。提交实测尺寸表、带尺具的测量照片、SLDPRT 和标注截图；写明是否带壳、工具、测量单位及误差估计。不要求内部结构和复杂曲面。',
  assembly:'使用组长给定的零件完成装配。提交题目与预期运动说明、SLDASM 和全部关联零件（打包）、配合树截图、干涉检查结果；说明固定件、应保留的运动和装配思路。',
 },
 rubrics:{
  daily:'',
  drawing:'按 100 分评价：几何与尺寸正确 50、草图约束与特征选择 25、文件及截图完整 15、建模说明与修改能力 10。截图不能证明的尺寸、完全定义或重建结果标为待核查。',
  phone:'按 100 分评价：测量方法及尺寸记录 35、模型与实测尺寸一致 35、关键外形表达 20、单位与误差说明 10。按每个人的实物和既定简化要求评价，不按手机复杂程度加减分。',
  assembly:'按 100 分评价：零件齐全与相对位置 25、配合与预期运动 40、干涉检查及解释 20、文件打包与装配说明 15。不以“全部锁死”作为正确标准。',
 },
};
const fourText=z.object({daily:text(5000),drawing:text(5000),phone:text(5000),assembly:text(5000)});
export const assessmentConfigSchema=z.object({formatVersion:z.number().int().min(1).max(2).default(1),weights:z.object({daily:z.number().min(0).max(100),drawing:z.number().min(0).max(100),phone:z.number().min(0).max(100),assembly:z.number().min(0).max(100)}).refine(w=>Math.abs(Object.values(w).reduce((a,b)=>a+b,0)-100)<0.00001,'四项分值合计必须为 100'),deadline:text(20).refine(v=>!v||/^\d{4}-\d{2}-\d{2}$/.test(v),'截止日期格式不正确'),requirements:fourText,rubrics:fourText}).refine(c=>c.formatVersion!==2||c.weights.daily===0,'当前考核不包含日常学习');
export const blankAssessmentScore={score:null,reason:'',evidence:[] as string[],unverified:[] as string[]};
const item=z.object({score:z.number().min(0).max(100).nullable(),reason:text(4000),evidence:z.array(text(1000)).max(30),unverified:z.array(text(1000)).max(30)});
export const assessmentScoresSchema=z.object({daily:item.default(blankAssessmentScore),drawing:item,phone:item,assembly:item});
export const assessmentReviewSchema=z.object({studentId:text(100).min(1),basis:text(100).min(1),scores:assessmentScoresSchema,summary:text(4000),confirmed:z.boolean().default(false),source:z.enum(['gpt','leader']),updatedAt:text(40)});
export type AssessmentReview=z.infer<typeof assessmentReviewSchema>;
export function assessmentMaterial(data:Workspace,id:string){return data.homework.filter(h=>h.studentId===id&&h.kind!=='daily').sort((a,b)=>a.id.localeCompare(b.id));}
export function assessmentBasis(data:Workspace,id:string){
 const s=data.students.find(s=>s.id===id);
 const text=JSON.stringify({student:s?{id:s.id,name:s.name}:null,config:data.assessment,materials:assessmentMaterial(data,id)});
 let hash=BigInt('14695981039346656037');for(const c of new TextEncoder().encode(text)){hash^=BigInt(c);hash=BigInt.asUintN(64,hash*BigInt('1099511628211'));}return hash.toString(16).padStart(16,'0');
}
export function assessmentReady(data:Workspace,id:string){const materials=assessmentMaterial(data,id);return assessmentKeys.every(k=>data.assessment.weights[k]===0||materials.some(h=>h.kind===k));}
export function assessmentTotal(data:Workspace,review?:AssessmentReview){if(!review||review.basis!==assessmentBasis(data,review.studentId)||!assessmentReady(data,review.studentId))return null;let total=0;for(const k of assessmentKeys){const w=data.assessment.weights[k],s=review.scores[k].score;if(w>0&&s===null)return null;total+=(s??0)*w/100;}return Math.round(total*10)/10;}
export function emptyAssessmentReview(data:Workspace,id:string):AssessmentReview{return {studentId:id,basis:assessmentBasis(data,id),scores:{daily:{score:null,reason:'',evidence:[],unverified:[]},drawing:{score:null,reason:'',evidence:[],unverified:[]},phone:{score:null,reason:'',evidence:[],unverified:[]},assembly:{score:null,reason:'',evidence:[],unverified:[]}},summary:'',confirmed:false,source:'leader',updatedAt:''};}
export function upgradeFinalAssessmentInput(input:unknown):unknown|null{
 if(!input||typeof input!=='object'||Array.isArray(input))return null;
 const raw=input as {assessment?:unknown;assessmentReviews?:unknown};
 const checked=assessmentConfigSchema.safeParse(raw.assessment);
 if(!checked.success||checked.data.formatVersion===2)return null;
 const config=checked.data;
 return {...raw,assessment:{...config,formatVersion:2,weights:{daily:0,drawing:20,phone:35,assembly:45},requirements:{...config.requirements,daily:''},rubrics:{...config.rubrics,daily:''}},assessmentReviews:Array.isArray(raw.assessmentReviews)?raw.assessmentReviews.map(r=>r&&typeof r==='object'?{...r,confirmed:false}:r):raw.assessmentReviews};
}
