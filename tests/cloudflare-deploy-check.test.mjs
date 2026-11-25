import test from 'node:test';
import assert from 'node:assert/strict';
import {deploymentSettings} from '../scripts/cloudflare-deploy-check.mjs';

const project={name:'toma-oshikatsubu',subdomain:'toma-oshikatsubu.pages.dev',production_branch:'production',deployment_configs:{production:{env_vars:{YOUTUBE_API_KEY:{type:'secret_text'}},kv_namespaces:{YOUTUBE_CACHE:{namespace_id:'existing-cache'}}}}};
const options={accountId:'a'.repeat(32),token:'test-only',target:'production'};
const fetchProject=value=>async()=>Response.json({success:true,result:value});

test('deployment uses the existing production branch and bindings without changing the project',async()=>{
  const calls=[];
  const settings=await deploymentSettings({...options,fetcher:async(url,init)=>{calls.push({url,init});return fetchProject(project)();}});
  assert.deepEqual(settings,{branch:'production'});
  assert.equal(calls.length,1);
  assert.equal(calls[0].init.method,undefined);
  assert.equal(calls[0].url,'https://api.cloudflare.com/client/v4/accounts/'+options.accountId+'/pages/projects/toma-oshikatsubu');
});

test('missing credentials, a different project, or missing production bindings stop deployment',async()=>{
  await assert.rejects(deploymentSettings({...options,token:'',fetcher:()=>{throw new Error('must not call');}}),/Secrets/);
  await assert.rejects(deploymentSettings({...options,fetcher:fetchProject({...project,name:'another-project'})}),/既存/);
  await assert.rejects(deploymentSettings({...options,fetcher:fetchProject({...project,deployment_configs:{}})}),/YOUTUBE_API_KEY/);
  await assert.rejects(deploymentSettings({...options,fetcher:async()=>new Response('private API error',{status:403})}),error=>error.message.includes('403')&&!error.message.includes('private API error'));
});

test('preview cannot target production, inject command arguments, or create a new project',async()=>{
  const preview={...options,target:'preview',previewBranch:'pr-2',fetcher:fetchProject({...project,deployment_configs:{}})};
  assert.deepEqual(await deploymentSettings(preview),{branch:'pr-2'});
  await assert.rejects(deploymentSettings({...preview,previewBranch:'production'}),/separate/);
  await assert.rejects(deploymentSettings({...preview,previewBranch:'pr-2 --branch=production'}),/separate/);
  await assert.rejects(deploymentSettings({...preview,fetcher:fetchProject({...project,production_branch:'pr-2'})}),/separate/);
  await assert.rejects(deploymentSettings({...preview,fetcher:async()=>new Response('',{status:404})}),/404/);
});
