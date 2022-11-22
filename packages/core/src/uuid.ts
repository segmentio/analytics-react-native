import uuid from 'react-native-uuid';

export const getUUID = (): string => {
  let UUID = uuid.v4().toString();
  return UUID;
};
