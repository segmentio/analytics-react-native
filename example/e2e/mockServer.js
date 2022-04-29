const express = require('express');
const bodyParser = require('body-parser');

const port = 9091;

let server;

export const startServer = async (mockServerListener) => {
  if (server) {
    throw new Error('Server is already running');
  }

  return new Promise((resolve) => {
    const app = express();

    app.use(bodyParser.text());

    // Handles batch events
    app.post('/events', (req, res) => {
      console.log(`➡️  Received request`);
      const body = JSON.parse(req.body);
      mockServerListener(body);

      res.status(200).send({ mockSuccess: true });
    });

    // Handles settings calls
    app.get('/settings/:writeKey/*', (req, res) => {
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
