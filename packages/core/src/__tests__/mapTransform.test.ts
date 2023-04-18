import { generateMapTransform } from '../mapTransform';
import { isString } from '../util';

describe('mapTransform', () => {
  const keyMap: { [key: string]: string } = {
    oldId: 'newId',
    veryOldKey: 'muchNewerKey',
    oldArray: 'newArray',
  };

  const transformMap: { [key: string]: (value: unknown) => unknown } = {
    muchNewerKey: (value: unknown) => {
      if (isString(value)) {
        return value.slice(0, 3);
      }
      return value;
    },
    newArray: (value: unknown) => {
      if (Array.isArray(value)) {
        return value.slice(0, 1) as unknown[];
      }
      return value;
    },
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

    const clone = JSON.parse(JSON.stringify(oldObject)) as object;

    const newObject = testMapTransform(oldObject);

    // Original object shouldn't have mutated
    expect(oldObject).toMatchObject(clone);
    // New object should have new keys and values transformed
    expect(newObject).toMatchSnapshot();
  });
});
