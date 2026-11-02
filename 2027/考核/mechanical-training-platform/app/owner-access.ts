import {env} from 'cloudflare:workers';
import type {ChatGPTUser} from './chatgpt-auth';

// The trusted Sites identity is different from the account ID in sharing settings.
// Missing configuration denies management access, including in a public deployment.
export function isPlatformOwner(user:ChatGPTUser|null,ownerId=env.PLATFORM_OWNER_USER_ID):boolean{
 return typeof ownerId==='string'&&ownerId.length>0&&user!==null&&user.userId===ownerId;
}
