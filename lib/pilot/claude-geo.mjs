import {publicLink} from './geo.mjs';
export const claudeModel='claude-haiku-4-5-20251001';
export async function measureClaude({key,prompt,fetcher=fetch}){
 const res=await fetcher('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'x-api-key':key,'anthropic-version':'2023-06-01','Content-Type':'application/json'},signal:AbortSignal.timeout(65000),body:JSON.stringify({model:claudeModel,max_tokens:2400,system:'Busca en la web para responder con información verificable y cita las fuentes. Responde en español.',tools:[{type:'web_search_20250305',name:'web_search',max_uses:1,user_location:{type:'approximate',country:'MX',city:'Mexico City',timezone:'America/Mexico_City'}}],messages:[{role:'user',content:prompt}]})});
 if(!res.ok){const error=new Error('provider_failed');error.status=res.status;throw error;}
 const result=await res.json();if(result.stop_reason!=='end_turn')throw new Error('incomplete');
 const content=result.content||[],searches=content.filter(x=>x.type==='web_search_tool_result');
 if(!searches.some(x=>Array.isArray(x.content)))throw new Error('search_not_observed');
 if(searches.some(x=>x.content?.type==='web_search_tool_result_error'))throw new Error('search_failed');
 const blocks=content.filter(x=>x.type==='text');let response='',annotations=[];const citations=[];
 for(const block of blocks){response+=block.text;for(const c of block.citations||[]){const url=publicLink(c.url);if(c.type!=='web_search_result_location'||!url)continue;citations.push(url);const start=response.length;response+=' [fuente]';annotations.push({start,end:response.length,url,title:String(c.title||'Fuente').slice(0,300)});}response+='\n';}
 if(response.trim().length<20)throw new Error('empty_response');
 const input=result.usage?.input_tokens??null,output=result.usage?.output_tokens??null;
 return {response:response.trimEnd(),citations:[...new Set(citations)].join('\n'),model:result.model||claudeModel,responseId:result.id,usage:{annotations,input_tokens:input,output_tokens:output,total_tokens:input!==null&&output!==null?input+output:null,web_search_calls:result.usage?.server_tool_use?.web_search_requests??searches.length}};
}
