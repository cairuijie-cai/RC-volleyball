'use client';
import {useState} from 'react';
import type {PublicTrainingData} from './public-data';

export default function PublicView({data}:{data:PublicTrainingData}){
 const [tab,setTab]=useState<'assessment'|'students'>('assessment'),[query,setQuery]=useState('');
 const students=data.students.filter(s=>(s.name+' '+s.className).includes(query));
 return <div className="simple-shell"><header className="simple-header"><strong className="simple-brand">机械新人考核 <small>2027</small></strong><nav aria-label="主要导航"><button aria-current={tab==='students'?'page':undefined} onClick={()=>setTab('students')}>新人名单</button><button aria-current={tab==='assessment'?'page':undefined} onClick={()=>setTab('assessment')}>最终考核</button></nav><div className="simple-tools"><span className="muted">只读</span><a className="text-btn" href="/manage" target="_top">组长管理</a></div></header>
  <main className="simple-content"><div className="page-heading"><h1>{tab==='students'?'新人名单':'最终考核'}</h1></div>
   {tab==='assessment'&&<><p className="weight-line">{data.assessment.items.map(i=>i.title+' '+i.weight+' 分').join(' · ')}{data.assessment.deadline&&<><br/>截止日期：{data.assessment.deadline}</>}</p><details className="quiet-details"><summary>考核要求与评分标准</summary>{data.assessment.items.map(i=><div className="requirement-item" key={i.kind}><strong>{i.title}</strong><p>{i.requirement}</p><p className="muted">{i.rubric}</p></div>)}</details><p className="public-note">成绩由组长确认后显示，刷新页面可查看最新记录。</p></>}
   <section className="panel"><div className="table-toolbar"><input className="search-input" aria-label="搜索新人" placeholder="姓名或班级" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="table-scroll"><table><thead><tr><th>姓名</th><th>班级</th>{tab==='assessment'&&<>{data.assessment.items.map(i=><th key={i.kind}>{i.title}</th>)}<th>总分</th></>}</tr></thead><tbody>{students.map((s,index)=><tr key={index}><td>{s.name}</td><td>{s.className||'—'}</td>{tab==='assessment'&&<>{s.submissions.map(i=><td key={i.kind}>{i.submitted?'已提交':'未提交'}{s.scores&&<small className="score-state">{s.scores.find(v=>v.kind===i.kind)?.score??'—'} / 100</small>}</td>)}<td className="score-cell">{s.total??'待确认'}</td></>}</tr>)}</tbody></table></div>{!students.length&&<p className="no-results">{data.students.length?'没有匹配的新人':'暂无新人'}</p>}</section>
  </main></div>;
}
