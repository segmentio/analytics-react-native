import { UserTraits } from '../types';
import {
  chunk,
  allSettled,
  deepCompare,
  getURL,
  stripQueryString,
  validateApiHost,
} from '../util';

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

describe('getURL function', () => {
  // Positive Test Cases
  it('should return correct URL for valid host and path', () => {
    expect(getURL('www.example.com', '/home')).toBe(
      'https://www.example.com/home'
    );
    expect(getURL('blog.example.com', '/posts')).toBe(
      'https://blog.example.com/posts'
    );
  });

  it('should return the root URL when the path is empty', () => {
    expect(getURL('www.example.com', '')).toBe('https://www.example.com');
  });

  it('should handle query parameters correctly in the URL path', () => {
    expect(getURL('www.example.com', '/search?q=test')).toBe(
      'https://www.example.com/search?q=test'
    );
  });

  it('should handle special characters in the URL path', () => {
    expect(getURL('www.example.com', '/about#section1')).toBe(
      'https://www.example.com/about#section1'
    );
  });

  // Negative Test Cases
  it('should throw an error for empty host', () => {
    expect(() => getURL('', '/home')).toThrow('Invalid URL has been passed');
  });

  it('should throw an error for invalid characters in the host', () => {
    expect(() => getURL('invalid host.com', '/path')).toThrow(
      'Invalid URL has been passed'
    );
  });

  it('should throw when an explicit http:// host is passed without opt-in', () => {
    expect(() => getURL('http://proxy.example.com', '/path')).toThrow(
      'Insecure HTTP proxy URL rejected'
    );
  });

  it('should allow http:// host when allowInsecure is true', () => {
    expect(getURL('http://proxy.example.com', '/path', true)).toBe(
      'http://proxy.example.com/path'
    );
  });
});

describe('stripQueryString', () => {
  it('returns the URL unchanged when there is no query string', () => {
    expect(stripQueryString('myapp://example.com/reset')).toBe(
      'myapp://example.com/reset'
    );
  });

  it('strips the query string, keeping scheme, host and path', () => {
    expect(stripQueryString('myapp://example.com/reset?token=abc123')).toBe(
      'myapp://example.com/reset'
    );
  });

  it('strips multiple query params', () => {
    expect(stripQueryString('https://example.com/cb?code=xyz&state=abc')).toBe(
      'https://example.com/cb'
    );
  });

  it('handles a URL with no path, only query string', () => {
    expect(stripQueryString('myapp://?token=secret')).toBe('myapp://');
  });
});

describe('validateApiHost', () => {
  it('accepts a bare hostname', () => {
    expect(validateApiHost('api.segment.io')).toBe(true);
  });

  it('accepts hostname with path (normal Segment format)', () => {
    expect(validateApiHost('api.segment.io/v1')).toBe(true);
    expect(validateApiHost('events.eu1.segmentapis.com')).toBe(true);
  });

  it('accepts hostname with port', () => {
    expect(validateApiHost('api.segment.io:443/v1')).toBe(true);
  });

  it('rejects values with a scheme', () => {
    expect(validateApiHost('https://api.segment.io/v1')).toBe(false);
    expect(validateApiHost('http://api.segment.io/v1')).toBe(false);
  });

  it('rejects values with credentials', () => {
    expect(validateApiHost('user:pass@api.segment.io')).toBe(false);
  });

  it('rejects values with a query string', () => {
    expect(validateApiHost('attacker.com/collect?x=')).toBe(false);
  });

  it('rejects values with a fragment', () => {
    expect(validateApiHost('attacker.com/path#fragment')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateApiHost('')).toBe(false);
  });
});
