import test from 'node:test';
import assert from 'node:assert/strict';
import {validateEntity} from '../src/trusted-platform.js';

test('owner gathering objects and legacy schedule pairs survive church validation',()=>{
 const base={name:'Local church',city:'Toronto',country:'CA'};
 const schedule=[{id:'gathering-1',title:'Sunday gathering',time:'Sunday 12:15 PM',location:'Local hall',description:'Owner-edited gathering',image:'/assets/cover.png'}];
 assert.deepEqual(validateEntity('churches',{...base,schedule}).schedule,schedule);
 assert.deepEqual(validateEntity('churches',{...base,schedule:[['Sunday','10:00 AM']]}).schedule,[['Sunday','10:00 AM']]);
 assert.throws(()=>validateEntity('churches',{...base,schedule:[{title:'No time'}]}),{status:400});
 assert.throws(()=>validateEntity('churches',{...base,schedule:Array.from({length:13},()=>schedule[0])}),{status:400});
});
