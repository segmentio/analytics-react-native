import { generateMapTransform } from '../mapTransform';

describe('mapTransform', () => {
  const keyMap: { [key: string]: string } = {
    oldId: 'newId',
    veryOldKey: 'muchNewerKey',
    oldArray: 'newArray',
  };

  const transformMap: { [key: string]: (value: any) => any } = {
    muchNewerKey: (value: string) => value.slice(0, 3),
    newArray: (value: any[]) => value.slice(0, 1),
  };

  const testMapTransform = generateMapTransform(keyMap, transformMap);

  it('maps keys to new values', () => {
    const oldObject = {
      oldId: 1,
      veryOldKey: '123456',
      nestedObject: {
        veryOldKey: '123456',
        nestedObject: {
          veryOldKey: '123456',
        },
      },
      oldArray: [
        {
          veryOldKey: '123456',
          doNotTransform: 'nope',
        },
        {
          veryOldKey: '123456',
          doNotTransform: 'nope',
        },
        {
          veryOldKey: '123456',
          doNotTransform: 'nope',
        },
      ],
    };

    const clone = JSON.parse(JSON.stringify(oldObject));

    const newObject = testMapTransform(oldObject);

    // Original object shouldn't have mutated
    expect(oldObject).toMatchObject(clone);
    // New object should have new keys and values transformed
    expect(newObject).toMatchSnapshot();
  });
});
