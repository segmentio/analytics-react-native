/* globals expect */

/**
 * Custom Jest matchers for Segment analytics E2E tests
 */
export const setupMatchers = () => {
  expect.extend({
    /**
     * Checks if events array contains an event of a specific type
     * @example expect(events).toHaveEvent('track')
     */
    toHaveEvent(events, eventType) {
      return {
        message: () => `Expect events to contain a ${eventType} event`,
        pass: events.some(item => item.type === eventType),
      };
    },

    /**
     * Checks if events array contains an event with specific attributes
     * @example expect(events).toHaveEventWith({type: 'track', event: 'Button Clicked'})
     */
    toHaveEventWith(events, eventAtts) {
      const hasEvent = events.some(item => {
        let isValid = true;
        for (const [key, value] of Object.entries(eventAtts)) {
          if (!(key in item)) {
            isValid = false;
          } else if (key in item && item[key] !== value) {
            isValid = false;
          }
        }
        return isValid;
      });

      return {
        message: () =>
          `Expect events to contain an object with attributes: ${JSON.stringify(
            eventAtts,
          )}`,
        pass: hasEvent,
      };
    },
  });
};
