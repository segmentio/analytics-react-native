import { NativeModules, Platform } from 'react-native';
import type { EventPlugin } from './plugin';
import type { Timeline } from './timeline';

const sizeOf = (obj: unknown): number => {
  const size = encodeURI(JSON.stringify(obj)).split(/%..|./).length - 1;
  return size / 1024;
};

export const warnMissingNativeModule = () => {
  const MISSING_NATIVE_MODULE_WARNING =
    `The package 'analytics-react-native' can't access a custom native module. Make sure: \n\n` +
    Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
    '- You rebuilt the app after installing the package\n' +
    '- You are not using Expo managed workflow\n';
  console.warn(MISSING_NATIVE_MODULE_WARNING);
};

export const getNativeModule = (moduleName: string) => {
  const module = NativeModules[moduleName] || undefined;
  if (module === undefined) warnMissingNativeModule();
  return module;
};

export const chunk = <T>(array: T[], count: number, maxKB?: number): T[][] => {
  if (!array.length || !count) {
    return [];
  }

  let currentChunk = 0;
  let rollingKBSize = 0;
  const result: T[][] = array.reduce(
    (chunks: T[][], item: T, index: number) => {
      if (maxKB !== undefined) {
        rollingKBSize += sizeOf(item);
        // If we overflow chunk until the previous index, else keep going
        if (rollingKBSize >= maxKB) {
          chunks[++currentChunk] = [item];
          return chunks;
        }
      }

      if (index !== 0 && index % count === 0) {
        chunks[++currentChunk] = [item];
      } else {
        if (chunks[currentChunk] === undefined) {
          chunks[currentChunk] = [];
        }
        chunks[currentChunk].push(item);
      }

      return chunks;
    },
    []
  );

  return result;
};

export const getAllPlugins = (timeline: Timeline) => {
  const allPlugins = Object.values(timeline.plugins);
  if (allPlugins.length) {
    return allPlugins.reduce((prev = [], curr = []) => prev.concat(curr));
  }
  return [];
};

export const getPluginsWithFlush = (timeline: Timeline) => {
  if (!timeline) {
    return [];
  }

  const allPlugins = getAllPlugins(timeline);

  // checking for the existence of .flush()
  const eventPlugins = allPlugins?.filter(
    (f) => (f as EventPlugin).flush
  ) as EventPlugin[];

  return eventPlugins;
};

export const getPluginsWithReset = (timeline: Timeline) => {
  if (!timeline) {
    return [];
  }

  const allPlugins = getAllPlugins(timeline);

  // checking for the existence of .reset()
  const eventPlugins = allPlugins?.filter(
    (f) => (f as EventPlugin).reset
  ) as EventPlugin[];

  return eventPlugins;
};

type PromiseResult<T> =
  | {
      status: 'fulfilled';
      value: T;
    }
  | {
      status: 'rejected';
      reason: unknown;
    };

const settlePromise = async <T>(
  promise: Promise<T> | T
): Promise<PromiseResult<T>> => {
  try {
    const result = await promise;
    return {
      status: 'fulfilled',
      value: result,
    };
  } catch (error) {
    return {
      status: 'rejected',
      reason: error,
    };
  }
};

export const allSettled = async <T>(
  promises: (Promise<T> | T)[]
): Promise<PromiseResult<T>[]> => {
  return Promise.all(promises.map(settlePromise));
};
