const $ = (id) => document.getElementById(id);

let records = [];

function todayString() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");
}

$("date").value = todayString();

function readNumber(element) {
  const value = element.value.trim();
  if (value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

function setMessage(message) {
  $("message").textContent = message;
}

async function apiGetRecords() {
  const response = await fetch("/api/records", { headers: { "Accept": "application/json" } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Server returned ${response.status}`);
  return result.records || [];
}

async function apiSaveRecord(record) {
  const password = $("editPassword").value;
  if (!password) throw new Error("Enter the editing password before saving.");
  const response = await fetch("/api/records", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Edit-Password": password,
      "Accept": "application/json"
    },
    body: JSON.stringify(record)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Server returned ${response.status}`);
  return result;
}

async function loadRecords() {
  try {
    records = await apiGetRecords();
    render();
    setMessage("Connected. Records are loaded from the shared online database.");
  } catch (error) {
    records = [];
    render();
    setMessage("Could not load online records. Check the Cloudflare Pages and D1 setup. " + error.message);
  }
}

function addContainer() {
  const div = document.createElement("div");
  div.className = "container-entry";
  div.innerHTML = `
    <div class="grid">
      <div>
        <label>Container ID</label>
        <input class="containerName" placeholder="Tray A">
      </div>
      <div>
        <label>Soil moisture (%)</label>
        <input class="moisture" type="number" min="0" max="100" step="any">
      </div>
      <div>
        <label>Soil pH</label>
        <input class="ph" type="number" min="0" max="14" step="any">
      </div>
      <div>
        <label>Plant condition</label>
        <select class="condition">
          <option>Healthy</option>
          <option>Wilting</option>
          <option>Yellowing</option>
          <option>Pest damage</option>
          <option>Other</option>
        </select>
      </div>
    </div>
    <label>Container notes</label>
    <textarea class="notes" placeholder="Leaves, appearance, or other observations"></textarea>
    <button type="button" class="remove">Remove Container</button>
  `;
  div.querySelector(".remove").addEventListener("click", () => div.remove());
  $("containers").appendChild(div);
}

$("addContainer").addEventListener("click", addContainer);

$("saveRecord").addEventListener("click", async () => {
  const date = $("date").value;
  const entries = [...document.querySelectorAll(".container-entry")];

  if (!date || entries.length === 0) {
    alert("Choose a date and add at least one container.");
    return;
  }

  const low = readNumber($("tempLow"));
  const high = readNumber($("tempHigh"));
  const humidityLow = readNumber($("humidityLow"));
  const humidityHigh = readNumber($("humidityHigh"));
  const weatherValues = [low, high, humidityLow, humidityHigh];

  if (weatherValues.some(v => v !== null && !Number.isFinite(v))) {
    alert("Enter valid numbers for your weather readings.");
    return;
  }
  if (low !== null && high !== null && low > high) {
    alert("Low temperature cannot exceed high temperature.");
    return;
  }
  for (const humidity of [humidityLow, humidityHigh]) {
    if (humidity !== null && (humidity < 0 || humidity > 100)) {
      alert("Humidity must be between 0 and 100%.");
      return;
    }
  }
  if (humidityLow !== null && humidityHigh !== null && humidityLow > humidityHigh) {
    alert("Low humidity cannot exceed high humidity.");
    return;
  }

  const containers = [];
  for (const div of entries) {
    const name = div.querySelector(".containerName").value.trim();
    const moisture = readNumber(div.querySelector(".moisture"));
    const ph = readNumber(div.querySelector(".ph"));

    if (!name) {
      alert("Every container needs an ID, such as Tray A.");
      return;
    }
    if ([moisture, ph].some(v => v !== null && !Number.isFinite(v))) {
      alert("Enter valid numbers for soil moisture and pH.");
      return;
    }
    if (moisture !== null && (moisture < 0 || moisture > 100)) {
      alert("Soil moisture must be between 0 and 100%.");
      return;
    }
    if (ph !== null && (ph < 0 || ph > 14)) {
      alert("Soil pH must be between 0 and 14.");
      return;
    }

    containers.push({
      name,
      moisture,
      ph,
      condition: div.querySelector(".condition").value,
      notes: div.querySelector(".notes").value.trim()
    });
  }

  const record = {
    date,
    temperatureLow: low,
    temperatureHigh: high,
    humidityLow,
    humidityHigh,
    dailyNotes: $("dailyNotes").value.trim(),
    containers
  };

  if (records.some(r => r.date === date) &&
      !confirm("A record exists for this date. Replace that day's record?")) {
    return;
  }

  $("saveRecord").disabled = true;
  setMessage("Saving record...");
  try {
    await apiSaveRecord(record);
    await loadRecords();
    setMessage("Record saved to the shared online database.");

    $("dailyNotes").value = "";
    $("tempLow").value = "";
    $("tempHigh").value = "";
    $("humidityLow").value = "";
    $("humidityHigh").value = "";
    $("containers").innerHTML = "";
    addContainer();
  } catch (error) {
    setMessage("Save failed: " + error.message);
  } finally {
    $("saveRecord").disabled = false;
  }
});

function escapeHtml(value) {
  const replacements = {
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  };
  return String(value ?? "").replace(/[&<>"']/g, char => replacements[char]);
}

function render() {
  const sorted = records.slice().sort((a, b) => b.date.localeCompare(a.date));
  const rows = sorted.flatMap(record =>
    (record.containers || []).map(container => `
      <tr>
        <td>${escapeHtml(record.date)}</td>
        <td>${escapeHtml(container.name)}</td>
        <td>${container.moisture ?? "—"}</td>
        <td>${container.ph ?? "—"}</td>
        <td>${escapeHtml(container.condition || "—")}</td>
        <td>${escapeHtml(container.notes || "—")}</td>
        <td>${record.temperatureLow ?? "—"} / ${record.temperatureHigh ?? "—"}</td>
        <td>${record.humidityLow ?? "—"} / ${record.humidityHigh ?? "—"}</td>
        <td>${escapeHtml(record.dailyNotes || "—")}</td>
      </tr>
    `)
  );

  $("records").innerHTML = rows.length ? `
    <table>
      <thead><tr>
        <th>Date</th><th>Container ID</th><th>Moisture %</th><th>pH</th>
        <th>Condition</th><th>Container notes</th><th>Temp low/high °F</th>
        <th>Humidity low/high %</th><th>Daily notes</th>
      </tr></thead>
      <tbody>${rows.join("")}</tbody>
    </table>
  ` : "<p>No records saved yet.</p>";

  const names = [...new Set(records.flatMap(r =>
    (r.containers || []).map(c => c.name)
  ))].sort();

  const select = $("chartContainer");
  const previous = select.value;
  select.innerHTML = names.map(name =>
    `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`
  ).join("");
  if (names.includes(previous)) select.value = previous;
  drawChart();
}

function drawChart() {
  const canvas = $("moistureChart");
  const ctx = canvas.getContext("2d");
  const width = canvas.clientWidth || 600;
  const height = 220;
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const name = $("chartContainer").value;
  const points = records.flatMap(record =>
    (record.containers || [])
      .filter(c => c.name === name && c.moisture !== null && c.moisture !== "")
      .map(c => ({ date: record.date, value: Number(c.moisture) }))
  ).sort((a, b) => a.date.localeCompare(b.date));

  ctx.font = "11px Arial";
  ctx.fillStyle = "#526052";
  ctx.strokeStyle = "#dce5db";
  ctx.lineWidth = 1;
  if (!points.length) {
    ctx.font = "14px Arial";
    ctx.fillText("Save moisture readings to see the chart.", 12, 30);
    return;
  }

  const left = 42, right = 12, top = 18, bottom = 36;
  const chartW = Math.max(1, width - left - right);
  const chartH = height - top - bottom;
  for (let value = 0; value <= 100; value += 25) {
    const y = top + chartH * (1 - value / 100);
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(width - right, y);
    ctx.stroke();
    ctx.fillText(value + "%", 4, y + 4);
  }

  const xFor = i => points.length === 1
    ? left + chartW / 2
    : left + (i / (points.length - 1)) * chartW;
  const yFor = point => top + chartH * (1 - point.value / 100);

  ctx.strokeStyle = "#285b3b";
  ctx.fillStyle = "#285b3b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((point, i) => {
    if (i === 0) ctx.moveTo(xFor(i), yFor(point));
    else ctx.lineTo(xFor(i), yFor(point));
  });
  ctx.stroke();
  points.forEach((point, i) => {
    ctx.beginPath();
    ctx.arc(xFor(i), yFor(point), 4, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "#526052";
  ctx.textAlign = "left";
  ctx.fillText(points[0].date, left, height - 12);
  if (points.length > 1) {
    ctx.textAlign = "right";
    ctx.fillText(points[points.length - 1].date, width - right, height - 12);
  }
  ctx.textAlign = "left";
}

$("chartContainer").addEventListener("change", drawChart);
window.addEventListener("resize", drawChart);

$("exportCsv").addEventListener("click", () => {
  const header = [
    "Date", "Container ID", "Temperature Low F", "Temperature High F",
    "Humidity Low %", "Humidity High %", "Soil Moisture %", "Soil pH",
    "Plant Condition", "Container Notes", "Daily Notes"
  ];
  const rows = records.flatMap(r => (r.containers || []).map(c => [
    r.date, c.name, r.temperatureLow, r.temperatureHigh,
    r.humidityLow, r.humidityHigh, c.moisture, c.ph,
    c.condition, c.notes, r.dailyNotes
  ]));
  const csv = [header, ...rows].map(row =>
    row.map(value => '"' + String(value ?? "").replace(/"/g, '""') + '"').join(",")
  ).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "plant-tracker.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

addContainer();
loadRecords();
