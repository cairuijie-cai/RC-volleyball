export const dynamic='force-dynamic';
const retired=()=>Response.json({error:'账号关联已停用，直接打开首页即可查看。'},{status:410,headers:{'Cache-Control':'no-store'}});
export const GET=retired;
export const POST=retired;
