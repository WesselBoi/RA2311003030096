const express = require('express');
const http = require('http');
const { Log } = require('../logging_middleware');

const PORT = 8001;
const app = express();

const bearer_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJzbTQzNTlAc3JtaXN0LmVkdS5pbiIsImV4cCI6MTc3NzcwNDUxMiwiaWF0IjoxNzc3NzAzNjEyLCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiYzMzZTVjOWItZDMyNS00Yjk4LTgxZTMtODM1YjQwMGEyMzI5IiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoic2Frc2hhbSBtYXRodXIiLCJzdWIiOiI0YjY5MWY0NC1hNmU5LTRkMWMtOTNhNS02NmFiZTNkZjk0NjUifSwiZW1haWwiOiJzbTQzNTlAc3JtaXN0LmVkdS5pbiIsIm5hbWUiOiJzYWtzaGFtIG1hdGh1ciIsInJvbGxObyI6InJhMjMxMTAwMzAzMDA5NiIsImFjY2Vzc0NvZGUiOiJRa2JweEgiLCJjbGllbnRJRCI6IjRiNjkxZjQ0LWE2ZTktNGQxYy05M2E1LTY2YWJlM2RmOTQ2NSIsImNsaWVudFNlY3JldCI6InlFZkFaVWhLeUFhY1JjQUoifQ.B5-fVBIBTCiUjIIHVLUJOo22LGjSLo4WqlNIL1bbIok";

function httpGet(hostname, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      port: 80,
      path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${bearer_token}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse response'));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function logMaybe(stack, level, packageName, message) {
  return Log(stack, level, packageName, message).catch(() => null);
}

async function fetchDepots() {
  try {
    const response = await httpGet('20.207.122.201', '/evaluation-service/depots');
    await logMaybe('backend', 'info', 'service', 'Fetched depots successfully');
    return response.depots || [];
  } catch (error) {
    await logMaybe('backend', 'error', 'service', `Failed to fetch depots: ${error.message}`);
    throw error;
  }
}

async function fetchVehicles() {
  try {
    const response = await httpGet('20.207.122.201', '/evaluation-service/vehicles');
    await logMaybe('backend', 'info', 'service', 'Fetched vehicles successfully');
    return response.vehicles || [];
  } catch (error) {
    await logMaybe('backend', 'error', 'service', `Failed to fetch vehicles: ${error.message}`);
    throw error;
  }
}

function optimizeSchedule(depots, vehicles, budget) {
  const tasks = [];

  vehicles.forEach((vehicle) => {
    tasks.push({
      id: vehicle.TaskID,
      duration: vehicle.Duration,
      impact: vehicle.Impact,
      vehicleId: vehicle.TaskID
    });
  });

  tasks.sort((a, b) => (b.impact / b.duration) - (a.impact / a.duration));

  const selected = [];
  let totalHours = 0;
  let totalImpact = 0;

  for (const task of tasks) {
    if (totalHours + task.duration <= budget) {
      selected.push(task);
      totalHours += task.duration;
      totalImpact += task.impact;
    }
  }

  return {
    selected,
    totalHours,
    totalImpact,
    efficiency: selected.length > 0 ? (totalImpact / totalHours).toFixed(2) : 0
  };
}

app.use(express.json());

app.get('/', (_, res) => {
  res.send('Testing server running on port 8001');
});

app.post('/schedule', async (req, res) => {
  try {
    const { budget } = req.body;

    if (!budget || budget <= 0) {
      return res.status(400).json({ error: 'Budget must be a positive number' });
    }

    await logMaybe('backend', 'info', 'route', `Received scheduling request with budget: ${budget}`);

    const depots = await fetchDepots();
    const vehicles = await fetchVehicles();

    await logMaybe('backend', 'info', 'service', `Starting optimization with ${vehicles.length} vehicles and ${budget} mechanic-hours budget`);

    const result = optimizeSchedule(depots, vehicles, budget);

    await logMaybe('backend', 'info', 'service', `Optimization complete: selected ${result.selected.length} tasks with ${result.totalImpact} total impact`);

    res.json({
      budget,
      selected_tasks: result.selected,
      total_hours_used: result.totalHours,
      total_impact_score: result.totalImpact,
      efficiency: result.efficiency
    });
  } catch (error) {
    await logMaybe('backend', 'error', 'handler', `Scheduling request failed: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  logMaybe('backend', 'info', 'service', `Vehicle Maintenance Scheduler running on port ${PORT}`);
  console.log(`Server running on port ${PORT}`);
});

module.exports = { optimizeSchedule, fetchDepots, fetchVehicles };