import { chunk } from '../util';

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
