// Local integration test config; Sites auth is simulated by verify-members.mjs on loopback only. Never use as the production build config.
import {defineConfig} from 'vite';
import vinext from 'vinext';
import {cloudflare} from '@cloudflare/vite-plugin';
export default defineConfig({server:{host:'127.0.0.1',port:5181,strictPort:true},plugins:[vinext(),cloudflare({viteEnvironment:{name:'rsc',childEnvironments:['ssr']},persistState:{path:'.sites-runtime/member-preview'},inspectorPort:false,config:{main:'./build/sites-worker.ts',compatibility_flags:['nodejs_compat'],d1_databases:[{binding:'DB',database_name:'site-creator-d1',database_id:'00000000-0000-4000-8000-000000000000'}],r2_buckets:[{binding:'BUCKET',bucket_name:'site-creator-r2'}]}})]});
