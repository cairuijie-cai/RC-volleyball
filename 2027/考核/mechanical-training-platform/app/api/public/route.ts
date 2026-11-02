import {readPublicTrainingData} from '../../public-data';
export const dynamic='force-dynamic';
export async function GET(){
 try{return Response.json(await readPublicTrainingData(),{headers:{'Cache-Control':'no-store'}});}
 catch{return Response.json({error:'平台暂时无法读取，请稍后重试。'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
