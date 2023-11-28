export const getContext = jest.fn().mockResolvedValue({
  app: {
    build: '1',
    name: 'Segment Example',
    namespace: 'com.segment.example.analytics',
    version: '1.0',
  },
  device: {
    id: '123-456-789',
    manufacturer: 'Apple',
    model: 'x86_64',
    name: 'iPhone',
    type: 'phone',
  },
  library: {
    name: '@segment/analytics-react-native',
    version: '2.0.0-pilot.1',
  },
  locale: 'en_US',
  network: {
    cellular: false,
    wifi: true,
  },
  os: {
    name: 'iOS',
    version: '14.1',
  },
  screen: {
    density: 2.625,
    height: 800,
    width: 600,
  },
  timezone: 'Europe/London',
  traits: {},
});
