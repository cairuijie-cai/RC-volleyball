import {env} from 'cloudflare:workers';
import type {ChatGPTUser} from './chatgpt-auth';
import type {Workspace} from './training-data';
import {publicTrainingData} from './public-data';
import type {ViewerRow,ViewerState} from './viewer-types';
export const viewerColumns='user_id AS userId, student_id AS studentId, email, display_name AS displayName, first_seen AS firstSeen, last_seen AS lastSeen, visits';
export async function getViewer(user:ChatGPTUser){
 if(!env.DB||!env.PLATFORM_OWNER_USER_ID)throw Error('平台暂时无法读取，请稍后重试。');
 return env.DB.prepare('SELECT '+viewerColumns+' FROM training_viewers WHERE owner_id = ? AND user_id = ?').bind(env.PLATFORM_OWNER_USER_ID,user.userId).first<ViewerRow>();
}
export async function recordViewerVisit(user:ChatGPTUser){
 if(!env.DB||!env.PLATFORM_OWNER_USER_ID)throw Error('平台暂时无法读取，请稍后重试。');
 const now=new Date().toISOString();
 return env.DB.prepare('INSERT INTO training_viewers (owner_id, user_id, email, display_name, first_seen, last_seen, visits) VALUES (?, ?, ?, ?, ?, ?, 1) ON CONFLICT(owner_id, user_id) DO UPDATE SET email = excluded.email, display_name = excluded.display_name, last_seen = excluded.last_seen, visits = training_viewers.visits + 1 RETURNING '+viewerColumns).bind(env.PLATFORM_OWNER_USER_ID,user.userId,user.email,user.displayName,now,now).first<ViewerRow>();
}
export function viewerState(data:Workspace,row:ViewerRow|null):ViewerState{
 const student=row?.studentId?data.students.find(s=>s.id===row.studentId):null;
 return student?{member:{name:student.name,className:student.className},choices:[],data:publicTrainingData(data)}:{member:null,choices:data.students.map(s=>({id:s.id,name:s.name,className:s.className})),data:null};
}
