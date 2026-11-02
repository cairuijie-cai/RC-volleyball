import { getChatGPTUser } from './chatgpt-auth';
import {isPlatformOwner} from './owner-access';
import PublicPage from './public-page';
import TrainingApp from './training-app';
export const dynamic = 'force-dynamic';
export default async function Home() {
  return isPlatformOwner(await getChatGPTUser())?<TrainingApp />:<PublicPage/>;
}
