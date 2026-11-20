/* Text-field labels remain accessible while their concise prompts live inside the controls. */
(function () {
  'use strict';
  const selector='form input:not([type]),form input:is([type=text],[type=email],[type=password],[type=tel],[type=url],[type=search],[type=number]),form textarea';
  function shortText(text) {
    return String(text || '').replace(/\s+/g,' ').replace(/\s*[*]$/,'').replace(/\s*\(?optional\)?\s*$/i,'').replace(/[:*]\s*$/,'').trim();
  }
  function textOf(label) {
    const copy=label.cloneNode(true);
    copy.querySelectorAll('input,textarea,select,button,svg,[aria-hidden=true],.member-auth-helper,.auth-field-helper,[role=alert]').forEach(node=>node.remove());
    return shortText(copy.textContent);
  }
  function prompt(input, label) {
    let text=label || shortText(input.getAttribute('aria-label'));
    if (!text) {
      const existing=shortText(input.getAttribute('placeholder'));
      if (existing && existing.length <= 40 && existing.split(' ').length <= 5) text=existing;
      else if(input.type==='email') text='Email address';
      else if(input.type==='password') text='Password';
      else if(input.type==='tel') text='Phone number';
      else if(input.tagName==='TEXTAREA') text=input.name==='description'?'Description':input.name==='body'||input.name==='message'?'Message':'Your text';
      else text=shortText(String(input.name || 'Your answer').replace(/[_-]+/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2'));
    }
    if(input.type==='password') text=input.autocomplete==='new-password' || input.name==='newPassword' ? 'Password (8+)' : 'Password';
    if(text.length>48 || text.split(' ').length>7) text=text.split(' ').slice(0,5).join(' ').slice(0,40);
    return text;
  }
  function present(input) {
    if (!input.matches(selector) || input.matches('[data-keep-label],.mwe-code-boxes input,[autocomplete="one-time-code"]')) return;
    const labels=[...(input.labels || [])];
    let labelText='';
    for(const label of labels) {
      if(label.hasAttribute('data-keep-label') || label.querySelectorAll('input,textarea,select').length>1) continue;
      labelText ||= textOf(label);
      label.classList.add('form-prompt-label');
      [...label.childNodes].forEach(node=>{
        if(label.contains(input) && !(node.compareDocumentPosition(input)&Node.DOCUMENT_POSITION_FOLLOWING)) return;
        if(node.nodeType===Node.TEXT_NODE && node.textContent.trim()) {
          const span=document.createElement('span');span.className='form-prompt-caption';node.replaceWith(span);span.append(node);
        } else if(node.nodeType===Node.ELEMENT_NODE && node!==input && node.textContent.trim() && !node.contains(input) && !node.matches('button,svg,[role=alert],[data-validation-error]') && !node.querySelector('input,textarea,select,button')) {
          node.classList.add('form-prompt-caption');
        }
      });
    }
    let next=prompt(input,labelText);
    if(!input.required && labels.some(label=>/\boptional\b/i.test(label.textContent)) && next.length<30 && !/optional/i.test(next)) next+=' (optional)';
    if(next && input.getAttribute('placeholder')!==next) input.setAttribute('placeholder',next);
    input.classList.add('form-prompt-control');
  }
  function scan(root) {
    if(root.nodeType!==Node.ELEMENT_NODE && root.nodeType!==Node.DOCUMENT_NODE)return;
    if(root.matches?.(selector))present(root);
    root.querySelectorAll(selector).forEach(present);
    root.querySelectorAll('.member-auth-helper,.auth-field-helper').forEach(node=>node.remove());
  }
  let queued=false;
  const roots=new Set();
  function queue(root) { roots.add(root);if(!queued){queued=true;queueMicrotask(()=>{queued=false;const batch=[...roots];roots.clear();batch.forEach(scan);});} }
  function start() {
    scan(document);
    new MutationObserver(records=>records.forEach(record=>{
      if(record.type==='attributes') { if(record.target.matches(selector))present(record.target); return; }
      const label=record.target.closest?.('label');
      if(label) { label.control && present(label.control); }
      record.addedNodes.forEach(node=>{if(node.nodeType===Node.ELEMENT_NODE)queue(node);});
    })).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['placeholder','type']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
