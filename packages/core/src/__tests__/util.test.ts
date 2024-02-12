import { UserTraits } from '../types';
import { chunk, allSettled, deepCompare } from '../util';

describe('#chunk', () => {
  it('handles empty array', () => {
    expect(chunk([], 5)).toEqual([]);
  });

  it('handles chunk to 1', () => {
    expect(chunk([1, 2, 3, 4], 1)).toEqual([[1], [2], [3], [4]]);
  });

  it('handles chunk to 2', () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it('handles remainders', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('handles max kb', () => {
    const almost1KBString =
      'heisxxohwswnetphtpnwyhluoeariblrgbksynoricexcoylnpmkymrgxmtuslveckeoulxqfwmemyxqvgyjnnclrmzcsacxkpdwzdthtudexkphsshjhlplvgryuqbqecgpbyussbgwuearvcmmrnkghcmcmynzxcswkghgrkhumeswvmhnhvymohluqooxmlbqdtxmeyikacyxvdkntrlwggoyrldmeaezowghoyukeeuaulxohknbbpyxpotonrtwfhoevysrfonevjtpjfywpptklmshzobtyklrahpkqnjifqtnxbeleeqxjacnphcomsdplxqmkcvnpxwbbmnmmzqvxmvpdrqaytlybmyghuckxnqlkgzptowgycanrenlgsgtwwbyudctiqmlszpzczfoglfoeuvdkublajngfmgstufgaroktarkeydqpmrgspuhbsqxqebzhycttsxkfcbgdqgctjgkrahoubqrvscdowafwfbysqerxqmzmakqibepyrjxjgcsnabjmovsgothxcawjsqzprxdnolyyhjfujgcxvniupmffqkhzknkzglazjflnnloazwslomxpegluqywyuvalysliziukrunfprejkojyihjjfcqdgsundoinipuzoxkqthslqgminkwcqglrjuhbqcirmuowdvizfsyubnllxxtjxqrctlzqmbfunxwzzbovogpvgrzeunvucaniqmqhwzcwqwzqvjaaeuajxgdhgitsekkowqejuouhaguudfkbyyivkayzsyoiymvavbabvtrgwmoadkvxxvgenttbohzngbzqiguficxkqvbxlrvkpycotawgalfdpmnmcfligffhivuzjtuxrwjjmzqcvbaocxfdmhnrcwhdmnpccikjvrskojxwnoiskacbivzfmbwyqfrhzjtdsjomzifswvaqdlorszbasmskosoullyyzpzjjzzkuvgoqwrzasqiroyaomrrxyqgzdigcwde';
    expect(
      chunk([almost1KBString, almost1KBString, almost1KBString], 5, 1)
    ).toEqual([[almost1KBString], [almost1KBString], [almost1KBString]]);
  });

  it('handles max kb and count at the same time', () => {
    const about500bString =
      'jfywukefmafvjroiisrqxudmmkqibiwaknaywfberhhtiymwrzcyoitzemqhwqamkccbgccsinagjddhhnijndpqyejfaztdbmcunmdaewraamfzssfwyzddttjkdpwehphowxrbpohntfohxvmufgoyovfguxlghvoisbmtufpyxqgqylufzhvavjylkhavobvmzyqbojniyjhkgssmnujyicucskiaenpeutaqbxsnzuinhnvfqbkmmoxzxhangjxhnuhskmldksucmridbyacvhycxpdgkkibypdphhwrkpmwivtgbvnfkilxmwvxbxuxklqstjltilksgaaxqmhdtmublkwzobrcoofiyygahosrmbmgftybdmdpyptsrntukfyczdusqlfgyexyojcfuloyyuepgkyhivmiqruqxbvixfotvwzjbamrqopsjiyftiuwmhbcfsvkrmjpmwthpwwszgjarargfpmxxkuwaofahreb';
    expect(
      chunk([about500bString, about500bString, about500bString], 2, 1)
    ).toEqual([[about500bString, about500bString], [about500bString]]);
  });
});

describe('allSettled', () => {
  it('handles all resolved and rejected promises properly', async () => {
    const promises: (Promise<number> | number)[] = [];
    promises.push(Promise.resolve(1));
    promises.push(2);
    promises.push(Promise.reject(3));

    const results = await allSettled(promises);

    expect(results).toEqual([
      {
        status: 'fulfilled',
        value: 1,
      },
      {
        status: 'fulfilled',
        value: 2,
      },
      {
        status: 'rejected',
        reason: 3,
      },
    ]);
  });
});

describe('deepCompare', () => {
  const base: UserTraits = {
    age: 30,
    address: {
      city: 'San Francisco',
      country: 'USA',
    },
    company: {
      name: 'Twilio',
    },
    deepNested: {
      level1: {
        level2: {
          level3: true,
        },
      },
    },
  };

  it('shallow compare, same object should return true', () => {
    const a: UserTraits = { ...base };
    const b: UserTraits = a;
    expect(deepCompare(a, b)).toBe(true);
  });

  it('deep compare, object copy should return true', () => {
    const a: UserTraits = { ...base };
    const b: UserTraits = { ...base };
    expect(deepCompare(a, b)).toBe(true);
  });

  it('deep compare, different key objects should return false', () => {
    const a: UserTraits = { ...base };
    const b: UserTraits = {
      age: 20,
      deepNested: {
        level1: {
          level2: {
            level3: false,
          },
        },
      },
    };
    expect(deepCompare(a, b)).toBe(false);
  });

  it('deep compare, modified objects should return false', () => {
    const a: UserTraits = { ...base };
    const b: UserTraits = {
      ...base,
      age: 20,
      deepNested: {
        level1: {
          level2: {
            level3: false,
          },
        },
      },
    };
    expect(deepCompare(a, b)).toBe(false);
  });

  it('deep compare, different nested objects should return false', () => {
    const a: UserTraits = { ...base };
    const b: UserTraits = {
      ...base,
      age: 20,
      deepNested: {
        level1: {
          level2: {
            level3: true,
          },
          anotherLevel2: {
            level3: true,
          },
        },
      },
    };
    expect(deepCompare(a, b)).toBe(false);
  });

  it('deep compare, mistmatching nested object type should return false', () => {
    const a: UserTraits = { ...base };
    const b: UserTraits = {
      ...base,
      age: 20,
      deepNested: {
        level1: {
          level2: 1,
        },
      },
    };
    expect(deepCompare(a, b)).toBe(false);
  });
});
