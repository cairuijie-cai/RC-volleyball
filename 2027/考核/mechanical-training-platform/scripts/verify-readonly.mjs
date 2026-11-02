import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {launchBrowser} from './browser-runtime.mjs';
const require=createRequire(import.meta.url),{transpileModule,ModuleKind,ScriptTarget}=require(process.cwd()+'/node_modules/typescript');
await mkdir('.sites-runtime/reader-tests',{recursive:true});await mkdir('outputs',{recursive:true});
for(const name of ['assessment-data','homework-data','training-data','public-data','owner-access']){
 let s=await readFile('app/'+name+'.ts','utf8');s=s.replace("import {env} from 'cloudflare:workers';","const env = {};");
 for(const module of ['assessment-data','homework-data','training-data'])s=s.replaceAll("'./"+module+"'","'./"+module+".cjs'");
 await writeFile('.sites-runtime/reader-tests/'+name+'.cjs',transpileModule(s,{compilerOptions:{module:ModuleKind.CommonJS,target:ScriptTarget.ES2020}}).outputText);
}
const {isPlatformOwner}=require(process.cwd()+'/.sites-runtime/reader-tests/owner-access.cjs');
assert.equal(isPlatformOwner({userId:'owner'},'owner'),true);assert.equal(isPlatformOwner({userId:'student'},'owner'),false);assert.equal(isPlatformOwner(null,'owner'),false);assert.equal(isPlatformOwner({userId:'owner'},undefined),false);assert.equal(isPlatformOwner({userId:'owner'},''),false);
const {assessmentBasis,emptyAssessmentReview}=require(process.cwd()+'/.sites-runtime/reader-tests/assessment-data.cjs');
const {workspaceSchema}=require(process.cwd()+'/.sites-runtime/reader-tests/training-data.cjs');
const {publicTrainingData}=require(process.cwd()+'/.sites-runtime/reader-tests/public-data.cjs');
const {browser}=await launchBrowser(),owner=await browser.newContext(),viewer=await browser.newContext({viewport:{width:1440,height:960}}),page=await viewer.newPage();
const base=process.env.VERIFY_BASE_URL||'http://127.0.0.1:5180',checks=['只允许固定组长身份，访客与其他账号无管理权限；未配置时拒绝管理'],errors=[];let original;
const get=async()=>(await(await owner.request.get(base+'/api/workspace')).json());
const put=async(data)=>{const state=await get();const response=await owner.request.put(base+'/api/workspace',{data:{data,revision:state.revision}});if(!response.ok())console.error(await response.text());return response;};
page.on('pageerror',e=>errors.push(e.message));
try{
 await owner.request.get(base+'/signin-with-chatgpt?return_to=/manage');original=await get();assert.ok(original.data);
 const id=randomUUID(),draftId=randomUUID();let data=structuredClone(original.data);
 data.students=[{id,name:'只读验证新人',className:'26测试',studentNumber:'000099887766',experience:'零基础',hours:null,note:'SECRET_STUDENT_NOTE'},{id:draftId,name:'未确认新人',className:'26测试',studentNumber:'',experience:'待了解',hours:null,note:''}];data.records=[];data.homework=[];data.assessmentReviews=[];assert.equal((await put(data)).status(),200);
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aM9sAAAAASUVORK5CYII=','base64');
 for(const kind of ['drawing','phone','assembly']){const r=await owner.request.post(base+'/api/files?studentId='+id+'&name='+kind+'.png',{data:png});assert.equal(r.status(),201);const file=(await r.json()).file;data.homework.push({id:randomUUID(),studentId:id,kind,date:'2026-10-11',lesson:'SECRET_LESSON',files:[file.id],status:'reviewed',grade:90,feedback:'SECRET_FEEDBACK',note:'SECRET_HOMEWORK_NOTE',includeFinal:true,updatedAt:new Date().toISOString()});}
 data=workspaceSchema.parse(data);const review=emptyAssessmentReview(data,id);for(const kind of ['drawing','phone','assembly'])review.scores[kind]={score:90,reason:'SECRET_REASON',evidence:['SECRET_EVIDENCE'],unverified:[]};review.confirmed=true;review.summary='SECRET_SUMMARY';review.updatedAt=new Date().toISOString();data.assessmentReviews=[review];
 const draft=emptyAssessmentReview(data,draftId);draft.scores.drawing.score=99;draft.summary='SECRET_DRAFT';data.assessmentReviews.push(draft);assert.equal((await put(data)).status(),200);
 let response=await viewer.request.get(base+'/api/public');assert.equal(response.status(),200);assert.equal(response.headers()['cache-control'],'no-store');const shared=await response.json();assert.deepEqual(shared,publicTrainingData(data));assert.equal(shared.students[0].total,90);assert.equal(shared.students[1].total,null);assert.equal(shared.students[1].scores,null);assert.equal(JSON.stringify(shared).includes('SECRET_'),false);assert.equal(JSON.stringify(shared).includes(id),false);assert.equal(JSON.stringify(shared).includes('000099887766'),false);checks.push('匿名读取组长的同一份数据，仅公开名单、要求、提交状态与已确认成绩');
 const legacyChange=structuredClone(data);legacyChange.homework.push({id:randomUUID(),studentId:id,kind:'daily',date:'2026-10-11',lesson:'SECRET_DAILY',files:[],status:'submitted',grade:null,feedback:'',note:'',includeFinal:true,updatedAt:''});assert.equal(assessmentBasis(legacyChange,id),assessmentBasis(data,id));assert.deepEqual(publicTrainingData(legacyChange),shared);checks.push('历史日常记录不影响或进入公开成绩');
 await page.goto(base+'/',{waitUntil:'networkidle'});assert.equal(page.url(),base+'/');await page.getByRole('heading',{name:'最终考核',exact:true}).waitFor();assert.ok(await page.getByText('只读',{exact:true}).isVisible());assert.equal(await page.getByRole('button',{name:/上传|保存|修改|确认|备份/}).count(),0);assert.equal((await page.content()).includes('SECRET_'),false);checks.push('无需登录直接打开，只读页面没有上传、修改或备份按钮');
 await page.getByText('考核要求与评分标准',{exact:true}).click();assert.ok(await page.getByText('根据组长提供的带尺寸三视图独立建模。',{exact:false}).isVisible());await page.screenshot({path:'outputs/readonly-desktop.png',fullPage:true});
 await page.getByRole('navigation').getByRole('button',{name:'新人名单',exact:true}).click();await page.getByLabel('搜索新人',{exact:true}).fill('只读验证');assert.equal(await page.locator('tbody tr').count(),1);assert.equal(await page.getByRole('button',{name:'添加新人',exact:true}).count(),0);checks.push('新人可查看考核要求和搜索名单');
 for(const path of ['/api/workspace','/api/files','/api/files/'+data.homework[0].files[0]])assert.equal((await viewer.request.get(base+path)).status(),401);
 assert.equal((await viewer.request.put(base+'/api/workspace',{data:{data,revision:0}})).status(),401);assert.equal((await viewer.request.post(base+'/api/files?studentId='+id+'&name=blocked.png',{data:png})).status(),401);assert.equal((await viewer.request.put(base+'/api/public',{data:{data}})).status(),405);
 const mcp={jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'save_assessment_review',arguments:{}}};assert.equal((await viewer.request.post(base+'/mcp',{data:mcp})).status(),401);
 assert.equal((await viewer.request.get(base+'/api/workspace',{headers:{'oai-authenticated-user-id':'local_seedy','oai-authenticated-user-email':'seedy@sites.test'}})).status(),401);checks.push('匿名或伪造身份不能读取管理数据、原文件、上传或通过 GPT 写入');assert.equal((await viewer.request.post(base+'/api/viewer',{data:{studentId:id}})).status(),410);checks.push('旧账号关联接口已停用，不会要求选择姓名或新增关联');
 const row=structuredClone(data);row.assessmentReviews[0].confirmed=false;assert.equal((await put(row)).status(),200);response=await viewer.request.get(base+'/api/public');assert.equal((await response.json()).students[0].total,null);assert.equal((await response.json()).students[0].scores,null);checks.push('组长取消成绩确认后，新人页面不再公开该分数');
 await page.getByLabel('搜索新人',{exact:true}).fill('');await page.getByRole('navigation').getByRole('button',{name:'最终考核',exact:true}).click();await page.setViewportSize({width:390,height:844});await page.screenshot({path:'outputs/readonly-mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);checks.push('手机查看页面无整体横向溢出或浏览器错误');
 await writeFile('outputs/readonly-verification.json',JSON.stringify({passed:true,checks},null,2));console.log(JSON.stringify({passed:true,checks},null,2));
}finally{if(original){assert.equal((await put(original.data)).status(),200);}await browser.close();}
