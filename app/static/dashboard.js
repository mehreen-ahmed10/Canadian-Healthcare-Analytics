
const $ = id => document.getElementById(id);

let charts = {};
let yearly = [], provinces = [], genders = [], ages = [];

const palette = [
  "#3979e8", "#48b8a7", "#9476df", "#eda451",
  "#6a9bc9", "#d77b9b", "#87b58e", "#b6a0d7",
  "#e2bf70", "#72aebd"
];

const fmt = value =>
  Number(value || 0).toLocaleString("en-CA", {
    maximumFractionDigits: 2
  });

async function api(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status}: ${await response.text()}`);
  }
  return response.json();
}

function toast(message) {
  const element = $("toast");
  if (!element) return;

  element.textContent = message;
  element.classList.add("show");

  setTimeout(() => element.classList.remove("show"), 2500);
}

function chart(id, type, labels, values, options = {}) {
  const canvas = $(id);
  if (!canvas) return;

  if (charts[id]) charts[id].destroy();

  charts[id] = new Chart(canvas, {
    type,
    data: {
      labels,
      datasets: [{
        data: values,
        label: options.label || "",
        backgroundColor: options.colors || palette[0],
        borderColor: options.border || palette[0],
        borderWidth: type === "line" ? 2 : 0,
        fill: type === "line",
        tension: 0.35,
        pointRadius: type === "line" ? 2 : 0,
        borderRadius: type === "bar" ? 5 : 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: options.legend || false,
          position: "bottom",
          labels: {
            usePointStyle: true,
            boxWidth: 7,
            font: { size: 9 }
          }
        }
      },
      scales: options.noAxes ? {} : {
        x: {
          grid: { display: false },
          ticks: { font: { size: 9 }, color: "#8c98a9" }
        },
        y: {
          grid: { color: "#eff2f6" },
          ticks: {
            font: { size: 9 },
            color: "#8c98a9",
            maxTicksLimit: 5
          }
        }
      }
    }
  });
}

// YEARLY EXPENDITURE
function drawYear() {
  const totals = new Map();

  yearly.forEach(row => {
    const year = Number(row.year);
    totals.set(
      year,
      (totals.get(year) || 0) + Number(row.total_expenditure || 0)
    );
  });

  const years = [...totals.keys()].sort((a, b) => a - b);

  chart(
    "trendChart",
    "line",
    years,
    years.map(year => totals.get(year)),
    {
      label: "Total expenditure",
      colors: "rgba(57,121,232,.14)",
      border: "#3979e8"
    }
  );

  $("trendEmpty").style.display = years.length ? "none" : "grid";
}

// PROVINCE ANALYSIS
function drawProvince() {
  let rows = provinces;
  const selected = $("regionFilter").value;

  if (selected !== "all") {
    rows = rows.filter(row => row.geography_name === selected);
  }

  rows = [...rows].sort(
    (a, b) => Number(b.total_expenditure) - Number(a.total_expenditure)
  );

  chart(
    "provinceChart",
    "bar",
    rows.map(row => row.geography_name),
    rows.map(row => Number(row.total_expenditure)),
    { colors: palette }
  );

  $("provinceEmpty").style.display = rows.length ? "none" : "grid";

  renderTable(rows);
}

// DATA EXPLORER
function renderTable(rows) {
  const query = ($("tableSearch")?.value || "").trim().toLowerCase();

  const filtered = rows.filter(row =>
    row.geography_name.toLowerCase().includes(query)
  );

  $("provinceTable").innerHTML = filtered.length
    ? filtered.map(row => `
      <tr>
        <td>${row.geography_name}</td>
        <td><span class="pill">${row.geography_type}</span></td>
        <td>${fmt(row.total_expenditure)}</td>
        <td>${fmt(row.avg_per_capita)}</td>
      </tr>
    `).join("")
    : '<tr><td colspan="4" class="loading">No matching regions found.</td></tr>';

  $("regionCount").textContent = `${filtered.length} regions`;
}

// GENDER, AGE AND PER-CAPITA ANALYSIS
async function drawSegment() {
  const year = $("yearFilter").value || "2022";

  const [genderRows, ageRows] = await Promise.all([
    api(`/api/dashboard/gender?year=${year}`),
    api(`/api/dashboard/age?year=${year}`)
  ]);

  genders = genderRows;
  ages = ageRows;

  chart(
    "genderChart",
    "doughnut",
    genders.map(row =>
      row.gender_category.replace("Expenditure per year, ", "")
    ),
    genders.map(row => Number(row.total_expenditure)),
    {
      colors: ["#3979e8", "#48b8a7"],
      noAxes: true,
      legend: true
    }
  );

  $("genderEmpty").style.display = genders.length ? "none" : "grid";

  $("genderLegend").innerHTML = genders.map((row, index) => `
    <span>
      <i style="background:${["#3979e8", "#48b8a7"][index]}"></i>
      ${row.gender_category.replace("Expenditure per year, ", "")}
    </span>
  `).join("");

  chart(
    "ageChart",
    "pie",
    ages.map(row => row.age_group),
    ages.map(row => Number(row.total_expenditure)),
    { colors: palette, noAxes: true, legend: true }
  );

  $("ageEmpty").style.display = ages.length ? "none" : "grid";

  chart(
    "perCapitaChart",
    "bar",
    ages.map(row => row.age_group),
    ages.map(row => Number(row.per_capita_expenditure)),
    { colors: palette }
  );

  $("perCapitaEmpty").style.display = ages.length ? "none" : "grid";
}

// LOAD DASHBOARD DATA
async function load() {
  try {
    const [summary, yearlyRows, provinceRows] = await Promise.all([
      api("/api/dashboard/summary"),
      api("/api/dashboard/yearly"),
      api("/api/dashboard/provinces")
    ]);

    yearly = yearlyRows;
    provinces = provinceRows;

    $("regions").textContent = fmt(summary.regions);

    $("years").textContent =
      fmt(Number(summary.last_year) - Number(summary.first_year) + 1);

    $("records").textContent = fmt(summary.fact_records);

    const yearOptions = [
      ...new Set(yearly.map(row => Number(row.year)))
    ].sort((a, b) => a - b);

    $("yearFilter").innerHTML = yearOptions.map(year => `
      <option value="${year}" ${year === 2022 ? "selected" : ""}>
        ${year}
      </option>
    `).join("");

    $("regionFilter").innerHTML =
      '<option value="all">All provinces & territories</option>' +
      provinces.map(row => `
        <option value="${row.geography_name}">
          ${row.geography_name}
        </option>
      `).join("");

    drawYear();
    drawProvince();
    await drawSegment();

  } catch (error) {
    console.error(error);

    [
      "trendEmpty",
      "provinceEmpty",
      "genderEmpty",
      "ageEmpty",
      "perCapitaEmpty"
    ].forEach(id => {
      if ($(id)) {
        $(id).textContent = "Data unavailable — check database/API connection";
        $(id).style.display = "grid";
      }
    });

    toast("Could not load data. Check browser console.");
  }
}

// CSV EXPORT
function exportCSV() {
  const rows = [
    ["Region", "Type", "Total expenditure", "Average per capita"],
    ...provinces.map(row => [
      row.geography_name,
      row.geography_type,
      row.total_expenditure,
      row.avg_per_capita
    ])
  ];

  const csv = rows.map(row =>
    row.map(value =>
      `"${String(value ?? "").replaceAll('"', '""')}"`
    ).join(",")
  ).join("\n");

  const link = document.createElement("a");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8;" })
  );

  link.href = url;
  link.download = "canadian_healthcare_regional_expenditure.csv";
  link.click();

  URL.revokeObjectURL(url);
}

// SIDEBAR NAVIGATION
document.querySelectorAll(".nav-item[data-section]").forEach(link => {
  link.addEventListener("click", event => {
    event.preventDefault();

    const sectionId = link.dataset.section;
    const target = sectionId === "overview"
      ? $("overview")
      : $(sectionId);

    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }

    document.querySelectorAll(".nav-item").forEach(item => {
      item.classList.remove("active");
    });

    link.classList.add("active");

    $("breadcrumbTitle").textContent = link.textContent.trim();
    $("sidebar").classList.remove("open");
  });
});

// FILTERS
$("yearFilter").addEventListener("change", () => {
  drawSegment().catch(error => {
    console.error(error);
    toast("Could not update analysis charts.");
  });
});

$("regionFilter").addEventListener("change", drawProvince);

$("tableSearch").addEventListener("input", () => {
  const selected = $("regionFilter").value;

  const rows = selected === "all"
    ? provinces
    : provinces.filter(row => row.geography_name === selected);

  renderTable(rows);
});

$("reset").addEventListener("click", () => {
  $("yearFilter").value = "2022";
  $("regionFilter").value = "all";
  $("tableSearch").value = "";

  drawProvince();
  drawSegment().catch(console.error);
});

// BUTTONS
$("refresh").addEventListener("click", () =>
  load().then(() => toast("Dashboard refreshed"))
);

$("export").addEventListener("click", exportCSV);
$("exportReport").addEventListener("click", exportCSV);

$("printReport").addEventListener("click", () => window.print());

$("openMenu").addEventListener("click", () =>
  $("sidebar").classList.add("open")
);

$("closeMenu").addEventListener("click", () =>
  $("sidebar").classList.remove("open")
);

// INITIALIZE
load();
