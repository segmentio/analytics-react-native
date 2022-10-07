import Branch from 'react-native-branch';
//@ts-ignore
import type { IdentifyEventType } from '@segment/analytics-react-native';

export default (event: IdentifyEventType) => {
  const userId = event.userId;
  if (userId !== undefined) {
    Branch.setIdentity(userId);
  }
};
