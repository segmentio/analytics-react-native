import { getUUID } from '../uuid';
import uuid from 'react-native-uuid';

describe('#uuid', () => {
  it('should get a UUID from react-native-uuid', () => {
    const uuidSpy = jest.spyOn(uuid, 'v4');

    getUUID();
    expect(uuidSpy).toBeCalled();
  });
});
