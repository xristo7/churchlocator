import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const studio=readFileSync(new URL('../public/creator-studio.js',import.meta.url),'utf8');
const section=studio.slice(studio.indexOf('  function meditationStyleMarkup('),studio.indexOf('  function editorRecord('));
const render=new Function('fieldMarkup',section+';return meditationStyleMarkup;')((field,data)=>`<input data-field="${field[0]}" value="${data[field[0]]||''}">`);

test('all meditation styles expose and preserve their uploaded cover field',()=>{
 for(const template of ['timer','ripple','journey','nature','sunburst']){
  const html=render({template,cover:'/media/creator-media/cover.png',audioSrc:'/media/creator-media/audio.mp3'});
  assert.equal((html.match(/data-field="cover"/g)||[]).length,1);
  assert.ok(html.includes('value="/media/creator-media/cover.png"'));
  assert.ok(html.includes('value="/media/creator-media/audio.mp3"'));
 }
});
