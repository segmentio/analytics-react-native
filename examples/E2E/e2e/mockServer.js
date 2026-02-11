const express = require('express');
const bodyParser = require('body-parser');

const port = 9091;

let server;
let mockBehavior = 'success';
let mockOptions = {};

/**
 * Set the behavior of the mock server
 * @param {string} behavior - 'success', 'rate-limit', 'timeout', 'bad-request', 'server-error', 'custom'
 * @param {object} options - Additional options (e.g., {retryAfter: 10} for rate-limit)
 */
export const setMockBehavior = (behavior, options = {}) => {
  mockBehavior = behavior;
  mockOptions = options;
  console.log(`🔧 Mock behavior set to: ${behavior}`, options);
};

export const startServer = async mockServerListener => {
  if (server) {
    throw new Error('Server is already running');
  }

  return new Promise(resolve => {
    const app = express();

    app.use(bodyParser.json());

    // Handles batch events
    app.post('/v1/b', (req, res) => {
      console.log(`➡️  Received request with behavior: ${mockBehavior}`);
      const body = req.body;
      mockServerListener(body);

      // Handle different mock behaviors
      switch (mockBehavior) {
        case 'rate-limit':
          const retryAfter = mockOptions.retryAfter || 60;
          console.log(`⏱️  Returning 429 with Retry-After: ${retryAfter}s`);
          res.status(429).set('Retry-After', retryAfter.toString()).send({
            error: 'Too Many Requests',
          });
          break;

        case 'timeout':
          console.log(`⏱️  Returning 408 Request Timeout`);
          res.status(408).send({error: 'Request Timeout'});
          break;

        case 'bad-request':
          console.log(`❌ Returning 400 Bad Request`);
          res.status(400).send({error: 'Bad Request'});
          break;

        case 'server-error':
          console.log(`❌ Returning 500 Internal Server Error`);
          res.status(500).send({error: 'Internal Server Error'});
          break;

        case 'custom':
          // Custom handler passed in options
          if (typeof mockOptions === 'function') {
            mockOptions(req, res);
          } else {
            res.status(200).send({mockSuccess: true});
          }
          break;

        case 'success':
        default:
          console.log(`✅ Returning 200 OK`);
          res.status(200).send({mockSuccess: true});
          break;
      }
    });

    // Handles settings calls
    app.get('/v1/projects/yup/settings', (req, res) => {
      console.log(`➡️  Replying with Settings`);
      res.status(200).send({
        integrations: {
          'Segment.io': {},
        },
        httpConfig: {
          rateLimitConfig: {
            enabled: true,
            maxRetryCount: 100,
            maxRetryInterval: 300,
            maxTotalBackoffDuration: 43200,
          },
          backoffConfig: {
            enabled: true,
            maxRetryCount: 100,
            baseBackoffInterval: 0.5,
            maxBackoffInterval: 300,
            maxTotalBackoffDuration: 43200,
            jitterPercent: 10,
            retryableStatusCodes: [408, 410, 429, 460, 500, 502, 503, 504, 508],
          },
        },
      });
    });

    server = app.listen(port, () => {
      console.log(`🚀 Started mock server on port ${port}`);
      resolve();
    });
  });
};

export const stopServer = async () => {
  return new Promise((resolve, reject) => {
    if (server) {
      server.close(() => {
        console.log('✋ Mock server has stopped');
        server = undefined;
        resolve();
      });
    } else {
      reject('⚠️  Mock server is not running');
    }
  });
};
