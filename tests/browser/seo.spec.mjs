import {test,expect} from '@playwright/test';
test('SEO and GEO keep evidence, draft preparation and absence of measurements explicit',async({page})=>{
 const org={id:'00000000-0000-4000-8000-000000000001',slug:'matdepot',name:'MatDepot'};
 const url='https://www.matdepotmex.com/blog/mejor-piso-para-gimnasio.html';
 const audit={id:'a1',created_at:'2026-11-09T20:00:00Z',report:{updatedAt:'2026-11-09T20:00:00Z',inventory:[url],sitemap:'https://www.matdepotmex.com/sitemap.xml',pages:[{url,title:'Piso gimnasio',checks:[{id:'title',label:'Título presente',status:'verificado',evidence:'Piso gimnasio'}]}]}};
 await page.addInitScript(()=>localStorage.setItem('mood-pilot-auth',JSON.stringify({access_token:'test.token.signature',refresh_token:'test-refresh',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:'00000000-0000-4000-8000-000000000002',email:'test@example.com'}})));
 await page.route('https://funfgwutdzpgtrcfppnr.supabase.co/**',route=>{const u=route.request().url();const data=u.includes('growth_organizations')?org:u.includes('growth_seo_audits')?[audit]:[];return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});});
 await page.route('**/api/pilot/reports',route=>route.fulfill({status:200,contentType:'application/json',body:'{}'}));
 await page.route('**/api/pilot/geo',route=>route.fulfill({status:200,contentType:'application/json',body:'{"openaiConfigured":false}'}));
 await page.route('**/api/pilot/seo',route=>route.fulfill({status:200,contentType:'application/json',body:'{"created":10,"existing":0}'}));
 await page.goto('/piloto');const seo=page.locator('#seo-geo');await expect(seo.getByRole('heading',{name:'SEO & GEO'})).toBeVisible();await expect(seo).toContainText('100%');
 await seo.getByRole('button',{name:'Plan de 10 contenidos',exact:true}).click();await expect(seo.getByRole('link',{name:'Revisar URL principal ↗'})).toHaveCount(10);await seo.getByRole('button',{name:'Preparar los 10 briefs y borradores'}).click();await expect(seo.getByRole('status')).toContainText('10 borradores preparados');
 await seo.getByRole('button',{name:'Presencia en IA',exact:true}).click();await expect(seo).toContainText('Sin medir');await expect(seo.getByRole('button',{name:'Consultar OpenAI y guardar evidencia'})).toBeDisabled();
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('SEO and GEO API require authentication and reject cross-origin writes',async({request})=>{
 for(const path of ['/api/pilot/seo','/api/pilot/geo']){expect((await request.post(path,{headers:{origin:'https://wrong.example'},data:{}})).status()).toBe(403);expect((await request.post(path,{headers:{origin:'http://127.0.0.1:3210'},data:{}})).status()).toBe(401);}
});
