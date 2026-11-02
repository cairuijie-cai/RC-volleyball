import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),ts=require('typescript');
await mkdir('.sites-runtime/roster-test',{recursive:true});await mkdir('outputs',{recursive:true});
await writeFile('.sites-runtime/roster-test/package.json','{"type":"commonjs"}');
for(const name of ['homework-data','assessment-data','training-data','roster-import']){const input=await readFile('app/'+name+'.ts','utf8');const code=ts.transpileModule(input,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;await writeFile('.sites-runtime/roster-test/'+name+'.js',code);}
const {workspaceSchema,initialWorkspace,emptyRecord}=require('../.sites-runtime/roster-test/training-data.js');
const {applyRoster,rosterBatchSchema}=require('../.sites-runtime/roster-test/roster-import.js');
const batch=rosterBatchSchema.parse({batchId:'ac8f51b4-32fb-4da4-b8d1-0de0d209fbdc',recipientEmail:'test@example.com',students:[{name:'验证甲',className:'26测试一',studentNumber:'02600001'},{name:'验证乙',className:'25测试二',studentNumber:'02500002'}]});
const base=initialWorkspace();base.students.push({id:'existing',name:'验证甲',experience:'接触过建模',hours:6,note:'已有档案'});base.records.push(emptyRecord('existing','task-1'));
const merged=applyRoster(workspaceSchema.parse(base),batch,'test@example.com');assert.equal(merged.students.length,2);assert.equal(merged.students[0].id,'existing');assert.equal(merged.students[0].hours,6);assert.equal(merged.students[0].note,'已有档案');assert.deepEqual(merged.records,base.records);assert.equal(merged.students[1].hours,null);assert.equal(merged.students[1].experience,'待了解');assert.equal(merged.students[0].studentNumber,'02600001');
assert.equal(applyRoster(merged,batch,'test@example.com'),null);assert.equal(applyRoster(workspaceSchema.parse(base),batch,'other@example.com'),null);assert.equal(rosterBatchSchema.safeParse({...batch,students:[batch.students[0],batch.students[0]]}).success,false);
const ambiguous=workspaceSchema.parse(base);ambiguous.students.push({...ambiguous.students[0],id:'duplicate-name'});assert.throws(()=>applyRoster(ambiguous,batch,'test@example.com'),/同名/);
const checks=['按学号或唯一旧姓名合并，保留编号、基础、投入时间及进度','未提供的基础和时间保持待填写，学号前导零保留','重复导入不重复建档，指定邮箱之外不会获得名单','重复学号及同名歧义会被拒绝'];
const {browser,from:playwrightFrom}=await (await import('./browser-runtime.mjs')).launchBrowser();
const page=await browser.newPage({viewport:{width:1440,height:960}});const url=process.env.VERIFY_BASE_URL||'http://127.0.0.1:5173';let original;
console.log('playwright:',playwrightFrom,'| base:',url);
try{
 await page.goto(url+'/signin-with-chatgpt?return_to=/',{waitUntil:'networkidle'});await page.getByRole('heading',{name:'最终考核',exact:true}).waitFor();original=await(await page.request.get(url+'/api/workspace')).json();
 assert.ok(original.data.appliedRosterImports.includes('5f0900b6-38f4-4601-9a29-d39639994102'));assert.ok(original.data.students.some(s=>s.studentNumber==='02600001'));assert.ok(original.data.students.some(s=>s.studentNumber==='02500002'));
 const again=await(await page.request.get(url+'/api/workspace')).json();assert.equal(again.revision,original.revision);checks.push('指定账号首次读取时保存名单，刷新不再重复写入');
 await page.getByRole('navigation').getByRole('button',{name:/^新人名单/}).click();await page.getByRole('cell',{name:'02600001',exact:true}).waitFor();await page.screenshot({path:'outputs/roster-desktop.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.getByRole('textbox',{name:'搜索新人'}).fill('02500002');assert.equal(await page.locator('tbody tr').count(),1);await page.getByRole('textbox',{name:'搜索新人'}).fill('');checks.push('班级和学号显示正常，可按学号搜索');
 const promise=page.waitForEvent('download');await page.getByRole('button',{name:'导出名单',exact:true}).click();const download=await promise;const text=await readFile(await download.path(),'utf8');assert.ok(text.startsWith('\uFEFF'));assert.ok(text.includes('"姓名","班级","学号"'));assert.ok(text.includes('"02600001"'));checks.push('名单 CSV 包含班级、完整学号和中文编码标记');
 const next=structuredClone(original.data);next.students=next.students.filter(s=>s.studentNumber!=='02600001');next.records=next.records.filter(r=>next.students.some(s=>s.id===r.studentId));next.homework=next.homework.filter(h=>next.students.some(s=>s.id===h.studentId));assert.equal((await page.request.put(url+'/api/workspace',{data:{data:next,revision:original.revision}})).status(),200);const deleted=await(await page.request.get(url+'/api/workspace')).json();assert.ok(!deleted.data.students.some(s=>s.studentNumber==='02600001'));checks.push('导入完成后删除成员，刷新不会重新出现');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'outputs/roster-mobile.png',fullPage:true});checks.push('手机名单表格可横向滚动，页面无横向溢出');
 console.log(JSON.stringify({passed:true,checks},null,2));await writeFile('outputs/roster-verification.json',JSON.stringify({passed:true,checks},null,2));
}finally{if(original){const latest=await(await page.request.get(url+'/api/workspace')).json();await page.request.put(url+'/api/workspace',{data:{data:original.data,revision:latest.revision}});}await browser.close();}
