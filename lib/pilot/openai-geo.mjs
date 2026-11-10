import {publicLink} from './geo.mjs';
export async function measureOpenAI({key,prompt,fetcher=fetch}){
 const res=await fetcher('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(65000),body:JSON.stringify({model:'gpt-5-mini',store:false,reasoning:{effort:'low'},max_output_tokens:2400,max_tool_calls:1,tools:[{type:'web_search',search_context_size:'low',user_location:{type:'approximate',country:'MX',city:'Mexico City',timezone:'America/Mexico_City'}}],tool_choice:'required',input:prompt})});
 if(!res.ok){const error=new Error('provider_failed');error.status=res.status;throw error;}
 const result=await res.json();if(result.status!=='completed')throw new Error('incomplete');
 const blocks=(result.output||[]).filter(x=>x.type==='message').flatMap(x=>x.content||[]).filter(x=>x.type==='output_text');
 const response=blocks.map(x=>x.text).join('\n');if(response.length<20)throw new Error('empty_response');
 const citations=[...new Set(blocks.flatMap(x=>x.annotations||[]).filter(a=>a.type==='url_citation').map(a=>publicLink(a.url)).filter(Boolean))];
 let offset=0;const annotations=[];for(const block of blocks){for(const a of block.annotations||[]){if(a.type==='url_citation'&&publicLink(a.url)&&Number.isInteger(a.start_index)&&Number.isInteger(a.end_index))annotations.push({start:offset+a.start_index,end:offset+a.end_index,url:publicLink(a.url),title:String(a.title||'Fuente').slice(0,300)});}offset+=block.text.length+1;}
 if(!(result.output||[]).some(x=>x.type==='web_search_call'))throw new Error('search_not_observed');
 return {response,citations:citations.join('\n'),model:result.model||'gpt-5-mini',responseId:result.id,usage:{annotations,input_tokens:result.usage?.input_tokens??null,output_tokens:result.usage?.output_tokens??null,total_tokens:result.usage?.total_tokens??null,web_search_calls:(result.output||[]).filter(x=>x.type==='web_search_call').length}};
}
