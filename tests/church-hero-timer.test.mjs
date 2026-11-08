import test from 'node:test';
import assert from 'node:assert/strict';
import{readFileSync}from'node:fs';
const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const schedule=source.slice(source.indexOf('MWE.scheduleChurchHero = function()'),source.indexOf('\nMWE.setChurchHeroSlide ='));

test('hero scheduling pauses for either pointer or focus and never marks autoplay as user interaction',()=>{
 let hovered=false,focused=false,callback,scheduled=0;
 const root={matches:()=>hovered,contains:()=>focused,querySelector:()=>({classList:{contains:()=>false},querySelector:()=>null,dataset:{heroKind:'image'}})};
 const document={hidden:false,activeElement:{},getElementById:()=>root};
 const actions=[],MWE={churchHeroState:{slides:[{},{}],index:0},setChurchHeroSlide:(...args)=>actions.push(args)};
 new Function('MWE','document','clearTimeout','setTimeout',schedule)(MWE,document,()=>{},(fn,delay)=>{assert.equal(delay,7000);scheduled++;callback=fn;return 1;});
 MWE.scheduleChurchHero();assert.equal(scheduled,1);callback();assert.deepEqual(actions,[[1,false]]);
 scheduled=0;hovered=true;MWE.scheduleChurchHero();assert.equal(scheduled,0);
 hovered=false;focused=true;MWE.scheduleChurchHero();assert.equal(scheduled,0);
 focused=false;document.hidden=true;MWE.scheduleChurchHero();assert.equal(scheduled,0);
});
