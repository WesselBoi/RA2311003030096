const http = require('http');
const express = require('express');

const app = express();
const PORT = 8000;

const TEST_API_BEARER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJzbTQzNTlAc3JtaXN0LmVkdS5pbiIsImV4cCI6MTc3NzcwMjA4MiwiaWF0IjoxNzc3NzAxMTgyLCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiZGViODEwYWQtOWM0Ni00NjIwLWJlYjUtZGE5MGRjOTg2MjM3IiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoic2Frc2hhbSBtYXRodXIiLCJzdWIiOiI0YjY5MWY0NC1hNmU5LTRkMWMtOTNhNS02NmFiZTNkZjk0NjUifSwiZW1haWwiOiJzbTQzNTlAc3JtaXN0LmVkdS5pbiIsIm5hbWUiOiJzYWtzaGFtIG1hdGh1ciIsInJvbGxObyI6InJhMjMxMTAwMzAzMDA5NiIsImFjY2Vzc0NvZGUiOiJRa2JweEgiLCJjbGllbnRJRCI6IjRiNjkxZjQ0LWE2ZTktNGQxYy05M2E1LTY2YWJlM2RmOTQ2NSIsImNsaWVudFNlY3JldCI6InlFZkFaVWhLeUFhY1JjQUoifQ.cTRU8mQPvUEYNUEFtp0p--lu27dlmSXx0FXRzAQ2XJc"

const stacks = ['backend', 'frontend'];
const levels = ['debug', 'info', 'warn', 'error', 'fatal'];
const packages = ['cache', 'controller', 'cron_job', 'db', 'domain', 'handler', 'repository', 'route', 'service', 'api', 'component', 'hook', 'page', 'state', 'style', 'auth', 'config', 'middleware', 'utils'];

function Log(stack, level, packageName, message) {
  if (!stacks.includes(stack)) return console.log('Invalid stack');
  if (!levels.includes(level)) return console.log('Invalid level');
  if (!packages.includes(packageName)) return console.log('Invalid package');
  if (!message) return console.log('No message provided');

  return new Promise((resolve, reject) => {
    const logBody = JSON.stringify({
      stack: stack,
      level: level,
      package: packageName,
      message: message,
    });

    const options = {
      hostname: '20.207.122.201',
      port: 80,
      path: '/evaluation-service/logs',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(logBody),
        'Authorization': `Bearer ${TEST_API_BEARER_TOKEN}`
      }
    };

    const req = http.request(options, (serverRes) => {
      let responseData = '';

      serverRes.on('data', (chunk) => {
        responseData += chunk;
      });

      serverRes.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          if (serverRes.statusCode >= 200 && serverRes.statusCode < 300) {
            resolve(result);
            return;
          }

          const error = new Error(result.message || 'Failed to create log');
          error.statusCode = serverRes.statusCode;
          error.response = result;
          reject(error);
        } catch (e) {
          const error = new Error('failed to get server response');
          error.statusCode = serverRes.statusCode;
          error.response = responseData;
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(logBody);
    req.end();
  });
}

function requireBearerToken(req, res, next) {
  const authorizationHeader = req.headers.authorization || '';
  if (!authorizationHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authorizationHeader.slice(7);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.bearerToken = token;
  next();
}

app.use(express.json());

app.get("/", (_,res) => {
    res.send("Testing 123");
})

app.post('/log', requireBearerToken, async (req, res) => {
  try {
    const stack = req.body.stack;
    const level = req.body.level;
    const packageName = req.body.package;
    const message = req.body.message;

    const result = await Log(stack, level, packageName, message);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json(error.response || { error: error.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))

module.exports = { Log, requireBearerToken };