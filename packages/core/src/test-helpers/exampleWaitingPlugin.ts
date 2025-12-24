import { PluginType, SegmentEvent } from '../types';
import { SegmentClient } from '../analytics';
import { DestinationPlugin, WaitingPlugin } from '../plugin';

export class ExampleWaitingPlugin extends WaitingPlugin {
  public type = PluginType.enrichment;
  public tracked = false;

  configure(analytics: SegmentClient) {
    console.log('exampleWaitingPlugin configure');
    super.configure(analytics);
    // Simulate async work (network, native module init, etc.)
    setTimeout(() => {
      console.log('ExampleWaitingPlugin: ready!');
      void analytics.resumeEventProcessing();
    }, 1000);
  }

  execute(event: SegmentEvent): SegmentEvent | undefined {
    super.execute(event);
    this.tracked = true;
    return event;
  }
}
export class ExampleWaitingPlugin1 extends WaitingPlugin {
  public type = PluginType.before;
  public tracked = false;

  constructor() {
    super();
  }
  configure(analytics: SegmentClient) {
    super.configure(analytics);
  }
  execute(event: SegmentEvent): SegmentEvent | undefined {
    console.log('ExampleWaitingPlugin1 received event', event.type);
    this.tracked = true;
    return event;
  }
}

export class ManualResumeWaitingPlugin extends WaitingPlugin {
  public type = PluginType.enrichment;
  public tracked = false;

  configure(analytics: SegmentClient) {
    super.configure(analytics);
  }

  execute(event: SegmentEvent): SegmentEvent | undefined {
    console.log('ManualResumeWaitingPlugin received event', event.type);
    this.tracked = true;
    return event;
  }
}

export class StubDestinationPlugin extends DestinationPlugin {
  key = 'StubDestination';
  protected isEnabled(_event: SegmentEvent): boolean {
    return true;
  }
}
