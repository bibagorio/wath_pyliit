(function () {
  const DRAFT_KEY = "pyliit:draft";
  const HISTORY_KEY = "pyliit:history";
  const WRAP_KEY = "pyliit:wrap";
  const THEME_KEY = "pyliit:theme";
  const LAST_NAME = "pyliit:lastname";
  const MAX_HISTORY = 12;
  const HISTORY_PLACEHOLDER = "__placeholder__";
  const EXAMPLES = [
    {
      id: "hello",
      label: "Hello Output",
      code: "print('Hello from pyLiit')\nprint('2 + 2 =', 2 + 2)\n",
    },
    {
      id: "math",
      label: "Math and Trig",
      code:
        "import math\n\nradius = 7\nprint('Area:', round(math.pi * radius ** 2, 2))\nprint('sin(pi / 6):', math.sin(math.pi / 6))\n",
    },
    {
      id: "datetime",
      label: "Datetime",
      code:
        "from datetime import datetime, timedelta\n\nnow = datetime.now()\nprint('Now:', now.strftime('%Y-%m-%d %H:%M:%S'))\nprint('In 3 days:', (now + timedelta(days=3)).date())\n",
    },
    {
      id: "primes",
      label: "Prime Generator",
      code:
        "def primes(limit):\n    found = []\n    for value in range(2, limit + 1):\n        if all(value % prime != 0 for prime in found):\n            found.append(value)\n    return found\n\nprint(primes(50))\n",
    },
    {
      id: "pattern",
      label: "Pattern Matching",
      code:
        "def describe(value):\n    match value:\n        case {'kind': 'point', 'x': x, 'y': y}:\n            return f'Point({x}, {y})'\n        case [first, second, *rest]:\n            return f'List starting with {first}, {second}; rest={rest}'\n        case _:\n            return 'Unknown'\n\nprint(describe({'kind': 'point', 'x': 4, 'y': 9}))\nprint(describe([1, 2, 3, 4]))\n",
    },
  ];

  const codeEl = document.getElementById("code");
  const outputEl = document.getElementById("output");
  const runBtn = document.getElementById("runBtn");
  const clearBtn = document.getElementById("clearBtn");
  const lineNums = document.getElementById("lineNums");
  const statusMsg = document.getElementById("statusMsg");
  const saveBtn = document.getElementById("saveBtn");
  const settingsBtn = document.getElementById("settingsBtn");
  const settingsOverlay = document.getElementById("settingsOverlay");
  const settingsClose = document.getElementById("settingsClose");
  const wrapBtn = document.getElementById("wrapBtn");
  const saveOverlay = document.getElementById("saveOverlay");
  const saveDialogClose = document.getElementById("saveDialogClose");
  const saveFilenameEl = document.getElementById("saveFilename");
  const overwriteWarn = document.getElementById("overwriteWarn");
  const saveCancelBtn = document.getElementById("saveCancelBtn");
  const saveConfirmBtn = document.getElementById("saveConfirmBtn");
  const exampleSelect = document.getElementById("exampleSelect");
  const historySelect = document.getElementById("historySelect");

  let currentHistory = loadHistory();
  let wrapOn = localStorage.getItem(WRAP_KEY) === "on";
  let currentTheme = localStorage.getItem(THEME_KEY) || "minecraft";
  let pendingFilename = null;

  setStatus("initialising...");
  populateExamples();
  renderHistorySelect();
  applyWrap();
  applyTheme(currentTheme);
  waitForBrython();

  wrapBtn.addEventListener("click", () => {
    wrapOn = !wrapOn;
    localStorage.setItem(WRAP_KEY, wrapOn ? "on" : "off");
    applyWrap();
  });

  document.getElementById("themeGrid").addEventListener("click", (event) => {
    const btn = event.target.closest(".theme-btn");
    if (!btn) {
      return;
    }
    currentTheme = btn.dataset.theme;
    localStorage.setItem(THEME_KEY, currentTheme);
    applyTheme(currentTheme);
  });

  settingsBtn.addEventListener("click", openSettings);
  settingsClose.addEventListener("click", closeSettings);
  settingsOverlay.addEventListener("click", (event) => {
    if (event.target === settingsOverlay) {
      closeSettings();
    }
  });

  codeEl.addEventListener("scroll", () => {
    lineNums.scrollTop = codeEl.scrollTop;
  });

  const savedDraft = localStorage.getItem(DRAFT_KEY);
  if (savedDraft !== null) {
    codeEl.value = savedDraft;
  }
  updateLineNums();

  codeEl.addEventListener("input", () => {
    localStorage.setItem(DRAFT_KEY, codeEl.value);
    updateLineNums();
  });

  exampleSelect.addEventListener("change", () => {
    if (!exampleSelect.value) {
      return;
    }
    const snippet = EXAMPLES.find((item) => item.id === exampleSelect.value);
    if (!snippet) {
      return;
    }
    loadCode(snippet.code, "");
    exampleSelect.selectedIndex = 0;
    setStatus("example loaded");
  });

  historySelect.addEventListener("change", () => {
    const value = historySelect.value;
    if (!value || value === HISTORY_PLACEHOLDER) {
      return;
    }
    const historyItem = currentHistory[Number(value)];
    if (!historyItem) {
      return;
    }
    loadCode(historyItem.code, historyItem.output || "");
    setStatus("history restored");
  });

  clearBtn.addEventListener("click", () => {
    outputEl.innerHTML = "";
    setStatus("");
  });

  saveBtn.addEventListener("click", openSaveDialog);
  saveDialogClose.addEventListener("click", closeSaveDialog);
  saveCancelBtn.addEventListener("click", closeSaveDialog);
  saveOverlay.addEventListener("click", (event) => {
    if (event.target === saveOverlay) {
      closeSaveDialog();
    }
  });

  saveFilenameEl.addEventListener("input", () => {
    overwriteWarn.classList.add("hidden");
    saveConfirmBtn.textContent = "SAVE";
    pendingFilename = null;
  });

  saveConfirmBtn.addEventListener("click", () => {
    let name = saveFilenameEl.value.trim();
    if (!name) {
      return;
    }
    if (!name.endsWith(".py")) {
      name += ".py";
    }
    saveFilenameEl.value = name;
    if (pendingFilename === name) {
      doSave(name);
      return;
    }
    const droid = typeof Android !== "undefined" ? Android : null;
    if (droid && typeof droid.checkFileExists === "function" && droid.checkFileExists(name) === "true") {
      overwriteWarn.classList.remove("hidden");
      saveConfirmBtn.textContent = "OVERWRITE";
      pendingFilename = name;
      return;
    }
    doSave(name);
  });

  runBtn.addEventListener("click", () => {
    if (typeof window.pyRunCode !== "function") {
      outputEl.textContent = "Brython is still initialising. Please wait a moment and try again.";
      setStatus("not ready");
      return;
    }
    setStatus("running...");
    window.pyRunCode(codeEl.value);
    pushHistory(codeEl.value, outputEl.textContent);
    setStatus("done");
  });

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      runBtn.click();
      return;
    }

    if (event.key === "Escape") {
      if (!saveOverlay.classList.contains("hidden")) {
        closeSaveDialog();
      } else if (!settingsOverlay.classList.contains("hidden")) {
        closeSettings();
      }
    }
  });

  function applyWrap() {
    if (wrapOn) {
      codeEl.style.whiteSpace = "pre-wrap";
      codeEl.style.overflowX = "hidden";
      lineNums.style.display = "none";
      wrapBtn.textContent = "WRAP: ON";
    } else {
      codeEl.style.whiteSpace = "pre";
      codeEl.style.overflowX = "auto";
      lineNums.style.display = "";
      wrapBtn.textContent = "WRAP: OFF";
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    document.querySelectorAll(".theme-btn").forEach((button) => {
      button.classList.toggle("active", button.dataset.theme === theme);
    });
  }

  function openSettings() {
    settingsOverlay.classList.remove("hidden");
    settingsOverlay.setAttribute("aria-hidden", "false");
  }

  function closeSettings() {
    settingsOverlay.classList.add("hidden");
    settingsOverlay.setAttribute("aria-hidden", "true");
  }

  function updateLineNums() {
    const count = codeEl.value.split("\n").length;
    let text = "";
    for (let i = 1; i <= count; i += 1) {
      text += i + "\n";
    }
    lineNums.textContent = text;
    lineNums.scrollTop = codeEl.scrollTop;
  }

  function openSaveDialog() {
    const last = localStorage.getItem(LAST_NAME) || "script.py";
    saveFilenameEl.value = last;
    overwriteWarn.classList.add("hidden");
    saveConfirmBtn.textContent = "SAVE";
    pendingFilename = null;
    saveOverlay.classList.remove("hidden");
    saveOverlay.setAttribute("aria-hidden", "false");
    window.setTimeout(() => saveFilenameEl.focus(), 50);
  }

  function closeSaveDialog() {
    saveOverlay.classList.add("hidden");
    saveOverlay.setAttribute("aria-hidden", "true");
    pendingFilename = null;
  }

  function doSave(name) {
    localStorage.setItem(LAST_NAME, name);
    const droid = typeof Android !== "undefined" ? Android : null;
    if (droid && typeof droid.saveFile === "function") {
      droid.saveFile(codeEl.value, name);
      setStatus("saving...");
    } else {
      setStatus("save unavailable");
    }
    closeSaveDialog();
  }

  window.onFileSaved = function (ok, name) {
    setStatus(ok ? "saved: " + name : "save failed");
    window.setTimeout(() => setStatus(""), 3000);
  };

  function setStatus(message) {
    if (statusMsg) {
      statusMsg.textContent = message ? "- " + message : "";
    }
  }

  function pushHistory(code, output) {
    currentHistory.unshift({ label: new Date().toLocaleString(), code, output });
    currentHistory = currentHistory.slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(currentHistory));
    renderHistorySelect();
  }

  function loadHistory() {
    try {
      const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  }

  function loadCode(code, output) {
    codeEl.value = code;
    outputEl.textContent = output || "";
    localStorage.setItem(DRAFT_KEY, codeEl.value);
    updateLineNums();
    codeEl.focus();
  }

  function populateExamples() {
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Examples";
    exampleSelect.appendChild(placeholder);

    EXAMPLES.forEach((snippet) => {
      const option = document.createElement("option");
      option.value = snippet.id;
      option.textContent = snippet.label;
      exampleSelect.appendChild(option);
    });

    exampleSelect.value = "";
  }

  function renderHistorySelect() {
    historySelect.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = HISTORY_PLACEHOLDER;
    placeholder.textContent = currentHistory.length ? "Recent Runs" : "No History Yet";
    historySelect.appendChild(placeholder);

    currentHistory.forEach((item, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = makeHistoryLabel(item);
      historySelect.appendChild(option);
    });

    historySelect.value = HISTORY_PLACEHOLDER;
  }

  function makeHistoryLabel(item) {
    const firstLine = (item.code || "").split("\n")[0].trim() || "Untitled run";
    const preview = firstLine.length > 24 ? firstLine.slice(0, 24) + "..." : firstLine;
    return item.label + " - " + preview;
  }

  function waitForBrython() {
    if (typeof window.pyRunCode === "function") {
      setRunReady(true);
      setStatus("");
      return;
    }

    setRunReady(false);
    const timer = window.setInterval(() => {
      if (typeof window.pyRunCode === "function") {
        window.clearInterval(timer);
        setRunReady(true);
        setStatus("");
      }
    }, 150);
  }

  function setRunReady(isReady) {
    runBtn.disabled = !isReady;
    runBtn.setAttribute("aria-disabled", String(!isReady));
  }
})();
