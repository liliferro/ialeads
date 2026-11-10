import {test} from 'node:test';
import assert from 'node:assert/strict';
import {measureClaude} from '../lib/pilot/claude-geo.mjs';
const fixture=()=>({id:'msg1',stop_reason:'end_turn',content:[{type:'web_search_tool_result',content:[]},{type:'text',text:'Proveedores disponibles en México.',citations:[{type:'web_search_result_location',url:'https://www.matdepotmex.com/',title:'Catálogo'},{type:'web_search_result_location',url:'javascript:alert(1)'}]}],usage:{input_tokens:100,output_tokens:30,server_tool_use:{web_search_requests:1}}});
test('Claude key only reaches Anthropic; one search and citations preserve full response',async()=>{
 const result=await measureClaude({key:'test-secret',prompt:'Proveedores de pisos en México',fetcher:async(url,options)=>{
 assert.equal(url,'https://api.anthropic.com/v1/messages');assert.equal(options.headers['x-api-key'],'test-secret');
 const body=JSON.parse(options.body);assert.equal(body.tools[0].max_uses,1);assert.equal(body.messages[0].content,'Proveedores de pisos en México');assert.ok(!body.system.includes('MatDepot'));return Response.json(fixture());}});
 assert.equal(result.citations,'https://www.matdepotmex.com/');assert.equal(result.usage.total_tokens,130);assert.equal(result.usage.annotations.length,1);assert.ok(result.response.startsWith('Proveedores disponibles en México.'));
});
test('Claude rejects incomplete, missing search, search errors and sanitizes authentication errors',async()=>{
 for(const result of [{...fixture(),stop_reason:'max_tokens'},{...fixture(),content:[{type:'text',text:'Una respuesta sin búsqueda verificable.'}]},{...fixture(),content:[{type:'web_search_tool_result',content:{type:'web_search_tool_result_error',error_code:'unavailable'}}]}])await assert.rejects(measureClaude({key:'secret',prompt:'test',fetcher:async()=>Response.json(result)}));
 await assert.rejects(measureClaude({key:'secret',prompt:'test',fetcher:async()=>new Response('secret',{status:401})}),e=>e.message==='provider_failed'&&e.status===401);
});
