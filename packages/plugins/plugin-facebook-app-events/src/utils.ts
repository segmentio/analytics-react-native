import {
  isNumber,
  isString,
  unknownToString,
} from '@segment/analytics-react-native';

export const sanitizeValue = (value: unknown): string | number | undefined => {
  if (isNumber(value) || isString(value)) {
    return value;
  }
  return unknownToString(value);
};
