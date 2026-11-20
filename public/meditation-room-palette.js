/* Room-owned colours affect this meditation document only, never the parent shell. */
(function (root) {
  const keys = ['--primary', '--primary-h', '--primary-s', '--primary-l'];
  let saved = null;
  function clear() {
    if (!saved) return;
    const style = document.documentElement.style;
    for (const [key, value, priority] of saved) {
      if (value) style.setProperty(key, value, priority);
      else style.removeProperty(key);
    }
    saved = null;
  }
  function apply(value) {
    clear();
    let hex = String(value || '').trim();
    if (!/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(hex)) return false;
    if (hex.length === 4) hex = '#' + [...hex.slice(1)].map(c => c + c).join('');
    const [r,g,b] = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255);
    const max = Math.max(r,g,b), min = Math.min(r,g,b), delta = max-min, l = (max+min)/2;
    let h = 0, s = 0;
    if (delta) {
      s = delta/(1-Math.abs(2*l-1));
      h = max===r ? ((g-b)/delta)%6 : max===g ? (b-r)/delta+2 : (r-g)/delta+4;
      h = (h*60+360)%360;
    }
    const style = document.documentElement.style;
    saved = keys.map(key => [key,style.getPropertyValue(key),style.getPropertyPriority(key)]);
    for (const [key,color] of Object.entries({'--primary':hex,'--primary-h':h,'--primary-s':s*100+'%','--primary-l':l*100+'%'})) style.setProperty(key,String(color));
    return true;
  }
  root.MWEMeditationRoomPalette = {apply,clear};
})(window);
