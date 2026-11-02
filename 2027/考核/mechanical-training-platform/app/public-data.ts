import {env} from 'cloudflare:workers';
import {initialWorkspace,workspaceSchema,type Workspace} from './training-data';
import {assessmentTotal,finalAssessmentKeys,assessmentLabels,upgradeFinalAssessmentInput} from './assessment-data';

// Explicit projection: never send the private workspace, file IDs, student
// numbers, internal notes, draft reviews or grading evidence to visitors.
export function publicTrainingData(data:Workspace){
 return {
  assessment:{deadline:data.assessment.deadline,items:finalAssessmentKeys.map(kind=>({kind,title:assessmentLabels[kind],weight:data.assessment.weights[kind],requirement:data.assessment.requirements[kind],rubric:data.assessment.rubrics[kind]}))},
  students:data.students.map(s=>{
   const review=data.assessmentReviews.find(r=>r.studentId===s.id),total=assessmentTotal(data,review),confirmed=!!review?.confirmed&&total!==null;
   return {name:s.name,className:s.className,submissions:finalAssessmentKeys.map(kind=>({kind,submitted:data.homework.some(h=>h.studentId===s.id&&h.kind===kind)})),scores:confirmed?finalAssessmentKeys.map(kind=>({kind,score:review!.scores[kind].score})):null,total:confirmed?total:null};
  }),
 };
}
export type PublicTrainingData=ReturnType<typeof publicTrainingData>;
export async function readSharedWorkspace(){
 if(!env.DB||!env.PLATFORM_OWNER_USER_ID)throw Error('平台暂时无法读取，请稍后重试。');
 const row=await env.DB.prepare('SELECT payload FROM training_workspaces WHERE user_id = ?').bind(env.PLATFORM_OWNER_USER_ID).first<{payload:string}>();
 const input=row?JSON.parse(row.payload):initialWorkspace();
 return workspaceSchema.parse(upgradeFinalAssessmentInput(input)??input);
}
export async function readPublicTrainingData(){return publicTrainingData(await readSharedWorkspace());}
