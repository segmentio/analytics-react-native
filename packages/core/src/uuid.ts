import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export const getUUID = (): string => {
  const UUID = uuidv4().toString();
  return UUID;
};
