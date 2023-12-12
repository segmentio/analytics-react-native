/* globals expect */

export const setupMatchers = () => {
  expect.extend({
    toHaveEvent(events, eventType) {
      return {
        message: () => `Expect events to contain a ${eventType} event`,
        pass: events.some((item) => item.type === eventType),
      };
    },

    toHaveEventWith(events, eventAtts) {
      const hasEvent = events.some((item) => {
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
            eventAtts
          )}`,
        pass: hasEvent,
      };
    },
  });
};
