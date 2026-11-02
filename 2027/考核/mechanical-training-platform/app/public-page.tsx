import PublicView from './public-view';
import {readPublicTrainingData} from './public-data';
export default async function PublicPage(){
 try{return <PublicView data={await readPublicTrainingData()}/>;}
 catch{return <main className="simple-content"><h1>机械新人考核</h1><p className="public-note">平台暂时无法读取，请稍后刷新。</p><a className="text-btn" href="/manage" target="_top">组长管理</a></main>;}
}
