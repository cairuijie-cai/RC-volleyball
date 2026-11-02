import {requireChatGPTUser} from '../chatgpt-auth';
import {isPlatformOwner} from '../owner-access';
import TrainingApp from '../training-app';
export const dynamic='force-dynamic';
export default async function Manage(){
 const user=await requireChatGPTUser('/manage');
 if(!isPlatformOwner(user))return <main className="simple-content"><h1>仅组长可管理</h1><p className="public-note">当前账号没有修改权限。</p><a className="text-btn" href="/">返回查看页面</a></main>;
 return <TrainingApp/>;
}
