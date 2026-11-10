import {test} from 'node:test';
import assert from 'node:assert/strict';
import {safeSiteUrl,readSite,sitemapEntries,robotsAllows,inspectHtml,overlapCandidates,auditSummary} from '../lib/pilot/seo.mjs';
import {geoEvidence,publicLink} from '../lib/pilot/geo.mjs';
import {measureOpenAI} from '../lib/pilot/openai-geo.mjs';
test('crawler restricts domain, redirects, credentials, query strings and XML entities',async()=>{
 for(const url of ['http://www.matdepotmex.com/','https://matdepotmex.com.evil.test','https://user:pass@matdepotmex.com/','https://matdepotmex.com:8443/','https://matdepotmex.com/?secret=x','file:///etc/passwd'])assert.equal(safeSiteUrl(url),null);
 assert.equal(safeSiteUrl('/blog/test.html'),'https://www.matdepotmex.com/blog/test.html');
 let calls=0;await assert.rejects(readSite('https://www.matdepotmex.com/',{fetcher:async()=>{calls++;return new Response('',{status:302,headers:{location:'http://127.0.0.1/private'}});}}),/outside_site/);assert.equal(calls,1);
 await assert.rejects(readSite('https://www.matdepotmex.com/',{fetcher:async()=>new Response('x'.repeat(2000001))}),/too_large/);
 assert.throws(()=>sitemapEntries('<!DOCTYPE x><urlset/>'),/unsafe_xml/);
 assert.deepEqual(sitemapEntries('<urlset><url><loc>https://www.matdepotmex.com/blog.html</loc></url><url><loc>https://evil.example/</loc></url></urlset>').urls,['https://www.matdepotmex.com/blog.html']);
 assert.equal(robotsAllows('User-agent: *\nDisallow: /private*','https://www.matdepotmex.com/private/file'),false);
});
test('HTML audit preserves errors, checks noindex and distinguishes no images from missing alt',()=>{
 const p=inspectHtml({url:'https://www.matdepotmex.com/blog.html',status:200,robots:'noindex',text:'<title>Gimnasio &amp; piso</title><meta name="description" content="Información"><h1>Gimnasio</h1><script type="application/ld+json">{broken}</script><a href="javascript:alert(1)">x</a>'});
 assert.equal(p.title,'Gimnasio & piso');assert.equal(p.schemaErrors,1);assert.equal(p.checks.find(x=>x.id==='indexable').status,'revisar');assert.equal(p.checks.find(x=>x.id==='alt').status,'no_aplica');assert.deepEqual(p.links,[]);assert.equal(p.canonical,null);
 assert.equal(auditSummary({inventory:[p.url],pages:[{url:p.url,error:'failed'}]}).score,null);
 assert.equal(overlapCandidates('piso gimnasio',{inventory:[p.url],pages:[p]})[0].url,p.url);
});
test('GEO separates brand mentions from domain citations and rejects fake host matches',()=>{
 assert.deepEqual(geoEvidence({response:'Mat Depot es una opción.',citations:'https://matdepotmex.com.evil.test/'}),{mentioned:true,cited:false,citedUrls:['https://matdepotmex.com.evil.test/']});
 assert.equal(geoEvidence({response:'Consulta el catálogo',citations:'https://www.matdepotmex.com/'}).cited,true);assert.equal(publicLink('javascript:alert(1)'),null);
});
test('OpenAI query is bounded, does not seed the brand, and never exposes provider errors',async()=>{
 let body;const result=await measureOpenAI({key:'test-secret',prompt:'Proveedores de pisos en México',fetcher:async(url,opts)=>{assert.equal(url,'https://api.openai.com/v1/responses');body=JSON.parse(opts.body);return Response.json({id:'r1',status:'completed',model:'gpt-5-mini',output:[{type:'web_search_call'},{type:'message',content:[{type:'output_text',text:'Una respuesta de prueba con fuentes.',annotations:[{type:'url_citation',url:'https://www.matdepotmex.com/'}]}]}],usage:{total_tokens:123}});}});
 assert.equal(body.input,'Proveedores de pisos en México');assert.equal(body.store,false);assert.equal(body.max_tool_calls,1);assert.equal(result.usage.total_tokens,123);assert.equal(result.citations,'https://www.matdepotmex.com/');
 await assert.rejects(measureOpenAI({key:'secret',prompt:'test',fetcher:async()=>new Response('secret',{status:401})}),e=>e.message==='provider_failed'&&e.status===401);
});
