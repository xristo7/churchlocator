// Temporary availability switch. Re-enable styles here without changing saved rooms.
export const enabledMeditationTemplates = Object.freeze(['timer']);
export function isMeditationRoomEnabled(room = {}) {
  const legacyStyles = { 'room-healing': 'ripple', 'room-secret-place': 'journey', 'room-psalms': 'nature', 'room-victory': 'sunburst' };
  return enabledMeditationTemplates.includes(room.template || legacyStyles[room.id] || 'timer');
}
