/* Plain-language camera, microphone and connection errors for live stages and meditation voice (brief 04.2 / 11). */
(function(root) {
  const device = kind => kind === 'video' ? 'camera' : 'microphone';
  function explain(error, kind = 'audio') {
    const name = error?.name || '', what = device(kind), message = String(error?.message || '');
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || /permission/i.test(message) && /denied|dismissed/i.test(message))
      return `Your ${what} is blocked for this site. Select the lock icon next to the web address, allow the ${what}, then try again.`;
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError')
      return `No ${what} was found. Connect one (or choose it in your computer's sound/camera settings), then try again.`;
    if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError')
      return `Your ${what} is being used by another app (for example Zoom, Teams or another tab). Close it, then try again.`;
    if (name === 'SecurityError' || name === 'InsecureContextError')
      return `The ${what} only works on a secure (https) page. Open the site with https:// and try again.`;
    if (name === 'LiveConnectionError') return message;
    if (error instanceof TypeError && /fetch|network|load/i.test(message))
      return 'Could not reach the live service. Check your internet connection, then try again.';
    return message || 'Something went wrong with live audio. Please try again.';
  }
  // Ask for the device before the provider does, so failures are explained before anyone goes live.
  async function preflight(kind = 'audio') {
    if (!root.isSecureContext) throw Object.assign(new Error('insecure'), { name: 'InsecureContextError' });
    if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error('This browser cannot use a ' + device(kind) + '. Try the latest Chrome, Edge, Firefox or Safari.'), { name: 'LiveConnectionError' });
    const stream = await navigator.mediaDevices.getUserMedia(kind === 'video' ? { video: true } : { audio: true });
    stream.getTracks().forEach(track => track.stop());
  }
  function connectionError(error) {
    if (error?.name && /NotAllowed|NotFound|NotReadable|Security|InsecureContext|LiveConnection/.test(error.name)) return error;
    const reason = error?.message && !/^\[object/.test(error.message) ? ' (' + error.message + ')' : '';
    return Object.assign(new Error('Could not connect to the live audio room' + reason + '. Check your internet connection, then try again.'), { name: 'LiveConnectionError' });
  }
  root.MWELiveErrors = { explain, preflight, connectionError };
})(window);
