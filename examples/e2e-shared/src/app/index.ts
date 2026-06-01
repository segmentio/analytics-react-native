export { default as Home } from './Home';
export { default as SecondPage } from './SecondPage';
export { default as Modal } from './Modal';
export {
  segmentClient,
  logger,
  reconnect,
  onClientChange,
  onError,
} from './client';
export type { EventEntry } from './plugins/Logger';
