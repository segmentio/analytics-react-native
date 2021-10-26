/**
 * Checks if value is a dictionary like object
 * @param value unknown object
 * @returns typeguard, value is dicitonary
 */
const isDictionary = (value: unknown): value is Record<string, unknown> =>
  value !== null &&
  value !== undefined &&
  typeof value === 'object' &&
  !Array.isArray(value);

/**
 * Generates a mapTransform function from a keymap and a transform map.
 * The resulting function can be called with any object/dictionary and return
 * a new object with key replacements and value transformations applied
 *
 * @param keyMap A dictionary of key mappings in format: ['OLD':'NEW']
 * @param transformMap A map of transformations by key (new key if the key was replaced)
 * @returns A function that maps keys from an object and transforms its values
 */
export const generateMapTransform = (
  keyMap: { [key: string]: string },
  transformMap: { [key: string]: (oldValue: any) => any }
) => {
  const mapTransform = (
    json: Record<string, unknown>
  ): Record<string, unknown> => {
    // Clone at top level
    const result: Record<string, unknown> = {};

    for (const key in json) {
      const newKey = keyMap[key] ?? key;

      let value = json[key];

      if (Array.isArray(value)) {
        value = value.map((nestedValue) => {
          if (isDictionary(nestedValue)) {
            return mapTransform(nestedValue);
          }
          return nestedValue;
        });
      } else if (isDictionary(value)) {
        value = mapTransform(value as Record<string, unknown>);
      }

      if (newKey in transformMap) {
        value = transformMap[newKey](value);
      }

      result[newKey] = value;
    }

    return result;
  };
  return mapTransform;
};
