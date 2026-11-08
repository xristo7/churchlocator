import test from 'node:test';
import assert from 'node:assert/strict';
import {validateEventStart} from '../src/trusted-platform.js';

test('new and rescheduled events require future starts without blocking historic metadata edits',()=>{
 const now=Date.parse('2030-01-01T00:00:00Z'),past={startsAt:'2029-01-01T12:00:00Z'},future={startsAt:'2031-01-01T12:00:00Z'};
 assert.throws(()=>validateEventStart(past,null,now),{status:400});
 assert.throws(()=>validateEventStart(past,future,now),{status:400});
 assert.doesNotThrow(()=>validateEventStart(future,null,now));
 assert.doesNotThrow(()=>validateEventStart(past,past,now));
});
