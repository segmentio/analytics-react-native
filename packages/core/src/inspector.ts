import { Platform } from 'react-native';
import { io, Socket } from 'socket.io-client';
import type { TraceData } from '@segment/inspector-core';
import type { AnalyticsReactNativeModule } from './types';
import { getNativeModule } from './util';

const nativeModule = getNativeModule(
  'AnalyticsReactNative'
) as AnalyticsReactNativeModule;

class Sequence<T> extends Array<T> {
  private callbacks: Map<string, (...items: T[]) => void> = new Map();
  push(...items: T[]): number {
    const ret = super.push(...items);
    this.callbacks.forEach((cb) => cb(...items));
    return ret;
  }

  addPushListener(id: string, cb: (...items: T[]) => void): void {
    this.callbacks.set(id, cb);
  }

  removePushListener(id: string): void {
    this.callbacks.delete(id);
  }
}

export class Inspector {
  private static queue: Sequence<TraceData> = new Sequence();
  private static socket: Socket;

  static async init() {
    // Inspector has already been initialized
    if (typeof this.socket === 'object') return;

    // announce the presence of this session
    this.socket = io('http://localhost:3000', {
      query: {
        platform: Platform.OS,
        sdk: 'React Native',
        appName: await nativeModule.getAppName(),
      },
    });

    // welcome the inspector client when it joins, and get it up to speed
    this.socket.on('inspector-joined', async (sid: string) => {
      const send = async (method: string, args: object): Promise<boolean> => {
        const status = (await this.socket.emitWithAck(
          'inspector-api',
          sid,
          method,
          args
        )) as number;

        return status === 200;
      };

      const sendTraces = async (traces: TraceData[]) => {
        for (const trace of traces) {
          if (!(await send('trace', trace))) return false;
        }

        return true;
      };

      const traces = this.queue;

      const isSuccessfullBootup =
        (await send('start', {})) && (await sendTraces(traces));

      if (!isSuccessfullBootup) {
        console.log('Inspector went rogue after joining');
        return;
      }

      let prevBatch: Promise<boolean> = Promise.resolve(true);
      this.queue.addPushListener(sid, (...newTraces) => {
        // every new batch of traces will wait for the delivery of preceding batch
        prevBatch = prevBatch.then(() => sendTraces(newTraces));
      });
    });

    this.socket.on('inspector-left', (sid: string, callback: () => void) => {
      this.queue.removePushListener(sid);
      callback();
    });
  }

  static trace(traceData: TraceData) {
    this.queue.push(traceData);
  }
}
