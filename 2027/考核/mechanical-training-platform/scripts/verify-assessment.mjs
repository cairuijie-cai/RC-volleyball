import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
// CommonJS is required here: the app's .ts modules are transpiled to CJS on the
// fly so their schema logic can be asserted without a bundler.
const require=createRequire(import.meta.url);
const {browser}=await (await import('./browser-runtime.mjs')).launchBrowser();
const {transpileModule,ModuleKind,ScriptTarget}=require(process.cwd()+'/node_modules/typescript');
await mkdir('.sites-runtime/assessment-tests',{recursive:true});
for(const name of ['assessment-data','assessment-evidence','homework-data','training-data']){let source=await readFile('app/'+name+'.ts','utf8');source=source.replaceAll("'./assessment-data'","'./assessment-data.cjs'").replaceAll("'./homework-data'","'./homework-data.cjs'");await writeFile('.sites-runtime/assessment-tests/'+name+'.cjs',transpileModule(source,{compilerOptions:{module:ModuleKind.CommonJS,target:ScriptTarget.ES2020}}).outputText);}
const {initialWorkspace,workspaceSchema}=require(process.cwd()+'/.sites-runtime/assessment-tests/training-data.cjs');
const {assessmentBasis,assessmentTotal,upgradeFinalAssessmentInput}=require(process.cwd()+'/.sites-runtime/assessment-tests/assessment-data.cjs');
const {homeworkSummary}=require(process.cwd()+'/.sites-runtime/assessment-tests/homework-data.cjs');
const checks=[];
const legacy=initialWorkspace();delete legacy.assessment;delete legacy.assessmentReviews;
assert.deepEqual(workspaceSchema.parse(legacy).assessment.weights,{daily:0,drawing:20,phone:35,assembly:45});checks.push('缺少考核配置的备份补全三项 20/35/45 分值');
const invalid=initialWorkspace();invalid.assessment.weights.phone=21;assert.equal(workspaceSchema.safeParse(invalid).success,false);checks.push('拒绝合计不为 100 的分值');
const old=initialWorkspace();delete old.assessment.formatVersion;old.assessment.weights={daily:20,drawing:30,phone:20,assembly:30};old.assessmentReviews=[{confirmed:true}];
const migrated=upgradeFinalAssessmentInput(old);assert.deepEqual(migrated.assessment.weights,{daily:0,drawing:20,phone:35,assembly:45});assert.equal(migrated.assessmentReviews[0].confirmed,false);assert.deepEqual(migrated.homework,old.homework);assert.equal(upgradeFinalAssessmentInput(migrated),null);migrated.assessment.weights={daily:0,drawing:25,phone:30,assembly:45};assert.equal(upgradeFinalAssessmentInput(migrated),null);checks.push('旧配置迁移一次，保留历史并取消旧成绩确认；以后自定义分值不重置');
const base=process.env.VERIFY_BASE_URL||'http://127.0.0.1:5173';
const context=await browser.newContext({viewport:{width:1440,height:1080}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));let original;
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aM9sAAAAASUVORK5CYII=','base64');
const mcp=async(name,args={})=>(await (await context.request.post(base+'/mcp',{data:{jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}}})).json()).result;
const value=r=>JSON.parse(r.content[0].text);
const getState=async()=>(await (await context.request.get(base+'/api/workspace')).json());
const put=async(data)=>{const s=await getState();return context.request.put(base+'/api/workspace',{data:{data,revision:s.revision}});};
try{
 const init=await context.request.post(base+'/mcp',{data:{jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-03-26'}}});assert.equal(init.status(),200);
 const list=await context.request.post(base+'/mcp',{data:{jsonrpc:'2.0',id:2,method:'tools/list'}});assert.equal((await list.json()).result.tools.length,4);
 assert.equal((await context.request.post(base+'/mcp',{data:{jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'list_assessment_students'}}})).status(),401);checks.push('MCP 初始化和发现不含私人数据，读取需要用户身份');
 await page.goto(base+'/signin-with-chatgpt?return_to=/',{waitUntil:'networkidle'});original=await getState();
 const data=structuredClone(original.data),id=randomUUID(),other=randomUUID();data.students=[{id,name:'本机最终考核验证',className:'测试班',studentNumber:'009876',experience:'待了解',hours:null,note:''},{id:other,name:'另一位验证新人',className:'',studentNumber:'009875',experience:'待了解',hours:null,note:''}];data.records=[];data.homework=[];data.assessmentReviews=[];
 assert.equal((await put(data)).status(),200);
 const upload=await context.request.post(base+'/api/files?studentId='+id+'&name='+encodeURIComponent('日常作业.png'),{data:png});const dailyFile=(await upload.json()).file;
 data.homework=[{kind:'daily',id:randomUUID(),studentId:id,date:'2026-10-11',lesson:'本机测试日常作业',files:[dailyFile.id],status:'reviewed',grade:80,feedback:'本机测试检查',note:'',includeFinal:true,updatedAt:new Date().toISOString()}];assert.equal((await put(data)).status(),200);
 await page.reload({waitUntil:'networkidle'});await page.getByRole('navigation').getByRole('button',{name:'最终考核',exact:true}).click();
 await page.getByRole('row').filter({has:page.getByRole('cell',{name:'本机最终考核验证',exact:true})}).getByRole('button',{name:'查看 / 上传',exact:true}).click();
 for(const [,label] of [['drawing','三视图建模'],['phone','测绘'],['assembly','零件装配']]){
  const section=page.getByRole('row').filter({has:page.getByRole('cell',{name:label,exact:true})});await section.getByRole('button',{name:'上传',exact:true}).click();
  const dialog=page.getByRole('dialog');await dialog.getByLabel('考核题目或对象',{exact:true}).fill('本机测试'+label);await dialog.getByLabel('操作说明与现场检查记录',{exact:true}).fill('仅用于平台流程测试，不代表实际模型检查。');await dialog.getByLabel('选择作业文件',{exact:true}).setInputFiles({name:label+'证据.png',mimeType:'image/png',buffer:png});await dialog.getByRole('button',{name:'上传并保存',exact:true}).click();await dialog.waitFor({state:'hidden'});
 }
 let state=await getState();assert.equal(state.data.homework.length,4);assert.deepEqual(state.data.homework.map(h=>h.kind).sort(),['assembly','daily','drawing','phone']);assert.equal(homeworkSummary(state.data.homework).count,1);assert.equal(homeworkSummary(state.data.homework).average,80);checks.push('三项最终材料上传并保存，历史作业保持完整');
 const duplicate=structuredClone(state.data);duplicate.homework.push({...duplicate.homework[1],id:randomUUID(),files:[dailyFile.id]});assert.equal((await put(duplicate)).status(),400);
 const mismatch=structuredClone(state.data);mismatch.homework[1].studentId=other;assert.equal((await put(mismatch)).status(),400);checks.push('拒绝重复最终考核及跨新人文件关联');
 const roster=value(await mcp('list_assessment_students'));assert.equal(roster.students.length,2);assert.equal(roster.students[0].submissions.every(s=>s.count===1),true);
 const materials=value(await mcp('get_assessment_materials',{studentId:id}));assert.equal(materials.sections.length,3);assert.equal(materials.sections[0].submissions.length,1);assert.equal(materials.basis,assessmentBasis(state.data,id));
 assert.equal((await mcp('read_assessment_file',{fileId:dailyFile.id})).isError,true);assert.equal(materials.sections.some(s=>s.kind==='daily'),false);assert.equal(materials.resultTemplate.scores.daily,undefined);const finalFile=state.data.homework.find(h=>h.kind==='drawing').files[0];const image=await mcp('read_assessment_file',{fileId:finalFile});assert.equal(image.content[1].type,'image');assert.deepEqual(Buffer.from(image.content[1].data,'base64'),png);assert.equal((await mcp('read_assessment_file',{fileId:randomUUID()})).isError,true);checks.push('GPT 接口按人读取评分标准、材料和真实截图字节');
 const native=(await (await context.request.post(base+'/api/files?studentId='+id+'&name=model.sldprt',{data:Buffer.from([0,1,2,255])})).json()).file;state=await getState();state.data.homework[1].files.push(native.id);assert.equal((await put(state.data)).status(),200);
 assert.match(value(await mcp('read_assessment_file',{fileId:native.id})).limitation,/无法直接解析/);checks.push('原生 SW 文件明确返回无法解析，防止伪称已检查模型');
 const evidence=value(await mcp('get_assessment_materials',{studentId:id}));const draft=evidence.resultTemplate;draft.source='gpt';for(const [k,n] of [['drawing',90],['phone',70],['assembly',85]])draft.scores[k]={score:n,reason:'仅本机测试建议评分',evidence:['截图 '+finalFile],unverified:['实际 CAD 模型需组长检查']};draft.summary='本机测试综合评语';
 const args={studentId:id,basis:draft.basis,scores:draft.scores,summary:draft.summary};const saved=await mcp('save_assessment_review',args);assert.equal(saved.isError,undefined);assert.equal(value(saved).total,80.8);state=await getState();assert.equal(state.data.assessmentReviews[0].confirmed,false);assert.equal(state.data.assessmentReviews[0].source,'gpt');checks.push('GPT 建议分按权重得到 80.8 分，保存为待复核');
 const outOfRange=structuredClone(args);outOfRange.scores.drawing.score=101;assert.equal((await mcp('save_assessment_review',outOfRange)).isError,true);
 const wrong={...args,studentId:other};assert.equal((await mcp('save_assessment_review',wrong)).isError,true);
 const invalidConfirmed=structuredClone(state.data);invalidConfirmed.assessmentReviews[0].basis='outdated';invalidConfirmed.assessmentReviews[0].confirmed=true;assert.equal((await put(invalidConfirmed)).status(),400);checks.push('拒绝越界、错配新人和过期评分确认');
 await page.reload({waitUntil:'networkidle'});await page.getByRole('navigation').getByRole('button',{name:'最终考核',exact:true}).click();await page.getByRole('row').filter({has:page.getByRole('cell',{name:'本机最终考核验证',exact:true})}).getByRole('button',{name:'查看 / 上传',exact:true}).click();await page.getByText('本机测试综合评语',{exact:true}).waitFor();await page.getByRole('button',{name:'确认最终成绩',exact:true}).click();await page.getByRole('button',{name:'取消确认',exact:true}).waitFor();state=await getState();assert.equal(state.data.assessmentReviews[0].confirmed,true);assert.equal((await mcp('save_assessment_review',args)).isError,true);checks.push('组长可确认，GPT 无法覆盖已确认成绩');
 await page.getByRole('button',{name:'返回名单',exact:true}).click();await page.getByRole('button',{name:'分值与要求',exact:true}).click();await page.getByLabel('三视图建模分值',{exact:true}).fill('25');await page.getByLabel('测绘分值',{exact:true}).fill('30');await page.getByRole('button',{name:'保存考核设置',exact:true}).click();await page.locator('.assessment-settings').waitFor({state:'hidden'});state=await getState();assert.equal(state.data.assessmentReviews[0].confirmed,false);assert.equal(assessmentTotal(state.data,state.data.assessmentReviews[0]),null);assert.equal((await mcp('save_assessment_review',args)).isError,true);checks.push('改动权重后旧分失效，过期 GPT 结果不能覆盖新材料');
 const fresh=value(await mcp('get_assessment_materials',{studentId:id}));const nowArgs={...args,basis:fresh.basis};await mcp('save_assessment_review',nowArgs);state=await getState();const missing=structuredClone(state.data);missing.homework=missing.homework.filter(h=>h.kind!=='phone');missing.assessmentReviews[0].basis=assessmentBasis(missing,id);assert.equal(assessmentTotal(missing,missing.assessmentReviews[0]),null);checks.push('材料未齐时不计算总分');
 await page.reload({waitUntil:'networkidle'});await page.getByRole('navigation').getByRole('button',{name:'最终考核',exact:true}).click();
 const csv=page.waitForEvent('download');await page.getByRole('button',{name:'导出成绩',exact:true}).click();assert.match((await csv).suggestedFilename(),/\.csv$/);
 await page.getByRole('row').filter({has:page.getByRole('cell',{name:'本机最终考核验证',exact:true})}).getByRole('button',{name:'查看 / 上传',exact:true}).click();await page.getByText('评分材料导入 / 导出',{exact:true}).click();const packet=page.waitForEvent('download');await page.getByRole('button',{name:'导出评分材料',exact:true}).click();const exported=await packet,raw=JSON.parse(await readFile(await exported.path(),'utf8'));assert.equal(raw.student.id,id);assert.equal(raw.config.weights.drawing,25);checks.push('成绩和当前评分材料可导出');
 await page.screenshot({path:'outputs/assessment-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'outputs/assessment-mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.getByRole('row').filter({has:page.getByRole('cell',{name:'测绘',exact:true})}).getByRole('button',{name:'编辑',exact:true}).click();await page.screenshot({path:'outputs/assessment-form-mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.getByRole('dialog').getByRole('button',{name:'取消',exact:true}).click();checks.push('手机考核页与上传弹窗无横向溢出');
 assert.deepEqual(errors,[]);checks.push('页面交互无脚本错误');
 await writeFile('outputs/assessment-verification.json',JSON.stringify({passed:true,checks},null,2));console.log(JSON.stringify({passed:true,checks},null,2));
}finally{if(original){const response=await put(original.data);assert.equal(response.status(),200);}await browser.close();}
