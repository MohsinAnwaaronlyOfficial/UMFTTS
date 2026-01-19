export {
  listVoices,
  listModels,
  textToSpeechToFile,
  textToSpeechStream,
  voiceCloneCreate,
  voiceDelete,
  getVoice,
  testApiKey,
  ElevenLabsError,
} from './client.js';

export {
  ElevenLabsWebSocket,
  createWebSocketStream,
  streamTextViaWebSocket,
  type WebSocketStreamEvents,
} from './websocket.js';
