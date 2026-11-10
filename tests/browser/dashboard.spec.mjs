import {test,expect} from '@playwright/test';
test('dashboard shows imported evidence, missing dates, period filters and mobile layout',async({page})=>{
 const org={id:'00000000-0000-4000-8000-000000000001',slug:'matdepot',name:'MatDepot'};
 const reports=[{id:'g1',source:'googleanalytics4',account_id:'536869166',date_from:'2026-10-09',date_to:'2026-11-05',fetched_at:'2026-11-09T20:00:00Z',method:'assisted_import',rows:[{date:'2026-11-05',sessions:74,engaged_sessions:39,screen_page_views:229}]}];
 await page.addInitScript(()=>localStorage.setItem('mood-pilot-auth',JSON.stringify({access_token:'test.token.signature',refresh_token:'test-refresh',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:'00000000-0000-4000-8000-000000000002',email:'test@example.com'}})));
 await page.route('https://funfgwutdzpgtrcfppnr.supabase.co/**',route=>{const u=route.request().url();return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(u.includes('growth_organizations')?org:u.includes('growth_reports')?reports:[])});});
 await page.route('**/api/pilot/reports',route=>route.fulfill({status:200,contentType:'application/json',body:'{}'}));
 await page.route('**/api/pilot/geo',route=>route.fulfill({status:200,contentType:'application/json',body:'{}'}));
 await page.goto('/piloto');const dash=page.locator('.analytics-dashboard');await expect(dash.getByRole('heading',{name:'Dashboard de marketing'})).toBeVisible();await expect(dash).toContainText('1 / 28 días recibidos');await expect(dash).toContainText('Sin comparación completa');
 await dash.getByRole('combobox',{name:'Período'}).selectOption('7');await expect(dash).toContainText('1 / 7 días recibidos');await expect(dash).toContainText('2026-10-30 a 2026-11-05');
 await dash.getByText('Ver tabla del período · Google Analytics 4',{exact:true}).click();await expect(dash.locator('tbody').first()).toContainText('Sin datos');await expect(dash.locator('tbody').first()).toContainText('74');
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
