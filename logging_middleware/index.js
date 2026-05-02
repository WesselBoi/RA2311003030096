const http = require('http');
const express = require('express');

const app = express();
const PORT = 8000;

const TEST_API_BEARER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJzbTQzNTlAc3JtaXN0LmVkdS5pbiIsImV4cCI6MTc3NzcwNDUxMiwiaWF0IjoxNzc3NzAzNjEyLCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiYzMzZTVjOWItZDMyNS00Yjk4LTgxZTMtODM1YjQwMGEyMzI5IiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoic2Frc2hhbSBtYXRodXIiLCJzdWIiOiI0YjY5MWY0NC1hNmU5LTRkMWMtOTNhNS02NmFiZTNkZjk0NjUifSwiZW1haWwiOiJzbTQzNTlAc3JtaXN0LmVkdS5pbiIsIm5hbWUiOiJzYWtzaGFtIG1hdGh1ciIsInJvbGxObyI6InJhMjMxMTAwMzAzMDA5NiIsImFjY2Vzc0NvZGUiOiJRa2JweEgiLCJjbGllbnRJRCI6IjRiNjkxZjQ0LWE2ZTktNGQxYy05M2E1LTY2YWJlM2RmOTQ2NSIsImNsaWVudFNlY3JldCI6InlFZkFaVWhLeUFhY1JjQUoifQ.B5-fVBIBTCiUjIIHVLUJOo22LGjSLo4WqlNIL1bbIok";

function Log(stack, level, packageName, message) {
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify({
      stack,
      level,
      package: packageName,
      message,
    });

    const requestOptions = {
      hostname: '20.207.122.201',
      port: 80,
      path: '/evaluation-service/logs',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody),
        Authorization: `Bearer ${TEST_API_BEARER_TOKEN}`,
      },
    };

    const request = http.request(requestOptions, (response) => {
      let responseData = '';

      response.on('data', (chunk) => {
        responseData += chunk;
      });

      response.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);

          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(parsed.logID);
            return;
          }

          reject(new Error(parsed.message || 'Failed to create log'));
        } catch (error) {
          reject(new Error('Failed to parse log API response'));
        }
      });
    });

    request.on('error', (error) => {
      reject(error);
    });

    request.write(requestBody);
    request.end();
  });
}

app.use(express.json());

app.post('/log', async (req, res) => {
  try {
    const { stack, level, package: packageName, message } = req.body;
    const logID = await Log(stack, level, packageName, message);

    res.status(200).json({
      logID,
      message: 'log created successfully',
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Logging middleware running on port ${PORT}`);
  });
}

module.exports = { Log, app };
