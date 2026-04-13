const express = require('express');
const bodyParser = require('body-parser');

const port = 9091;

let server;

/**
 * Starts a mock Segment API server for E2E testing
 * @param {Function} mockServerListener - Jest mock function to capture requests
 * @returns {Promise<void>}
 */
export const startServer = async (mockServerListener) => {
  if (server) {
    throw new Error('Server is already running');
  }

  return new Promise((resolve) => {
    const app = express();

    app.use(bodyParser.json());

    // Handles batch events
    app.post('/v1/b', (req, res) => {
      console.log(`➡️  Received request`);
      const body = req.body;
      mockServerListener(body);

      res.status(200).send({ mockSuccess: true });
    });

    // Handles settings calls
    app.get('/v1/projects/yup/settings', (req, res) => {
      console.log(`➡️  Replying with Settings`);
      res.status(200).send({
        integrations: {
          'Segment.io': {},
        },
      });
    });

    server = app.listen(port, () => {
      console.log(`🚀 Started mock server on port ${port}`);
      resolve();
    });
  });
};

/**
 * Stops the mock Segment API server
 * @returns {Promise<void>}
 */
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
