/* ============================================================
   Дело о четырёх решениях — движок курса.
   Контент лежит в content.js. Здесь только логика.
   ============================================================ */

(function () {
  "use strict";

  var STORAGE_KEY = "ai-safety-course-v1";
  var SCREENS = window.COURSE.screens;
  var EPISODES = window.COURSE.episodes;

  var state = {
    index: 0,
    answers: {},
    score: 0,
    quizAttempts: 0,
    quizBest: null,
    startedAt: null
  };

  var root = document.getElementById("app");
  var nextBtn = document.getElementById("nextBtn");
  var progressFill = document.getElementById("progressFill");
  var episodeLabel = document.getElementById("episodeLabel");
  var scoreLabel = document.getElementById("scoreLabel");
  var progressBar = document.querySelector(".progress");

  /* ---------- Сохранение ---------- */
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* приватный режим — молча продолжаем */ }
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || typeof data.index !== "number") return null;
      return data;
    } catch (e) { return null; }
  }

  function resetProgress() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    state = { index: 0, answers: {}, score: 0, quizAttempts: 0, quizBest: null, startedAt: Date.now() };
    closeOverlay();
    render();
  }

  /* ---------- Иконки ---------- */
  var ICONS = {
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/>',
    building: '<path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M8 8h3M8 12h3M8 16h3M2 21h20"/>',
    shieldCheck: '<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/>',
    shield: '<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z"/>',
    shieldAlert: '<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z"/><path d="M12 8v4M12 16h.01"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    stop: '<path d="M8 3h8l5 5v8l-5 5H8l-5-5V8l5-5z"/><path d="M12 8v4M12 16h.01"/>',
    folder: '<path d="M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7z"/>',
    pause: '<rect x="7" y="5" width="3.5" height="14" rx="1"/><rect x="13.5" y="5" width="3.5" height="14" rx="1"/>',
    send: '<path d="M21 3L10 14M21 3l-7 18-4-7-7-4 18-7z"/>',
    pin: '<path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    chevron: '<path d="M6 9l6 6 6-6"/>'
  };

  function icon(name, tone) {
    return '<svg class="ico' + (tone ? " tone-" + tone : "") + '" width="22" height="22" ' +
      'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || "") + "</svg>";
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* ---------- Оверлей «продолжить» ---------- */
  var overlay = document.getElementById("resumeOverlay");

  function closeOverlay() { overlay.hidden = true; }

  document.getElementById("resumeContinue").addEventListener("click", function () {
    var data = load();
    if (data) state = data;
    closeOverlay();
    render();
  });

  document.getElementById("resumeRestart").addEventListener("click", resetProgress);

  /* ---------- Дев-панель ---------- */
  var devpanel = document.getElementById("devpanel");
  var devList = document.getElementById("devList");

  function buildDevList() {
    devList.innerHTML = SCREENS.map(function (s, i) {
      return '<button class="devpanel__item' + (i === state.index ? " devpanel__item--active" : "") +
        '" data-jump="' + i + '" type="button">' + (i + 1) + ". " + esc(s.id) + "</button>";
    }).join("");
  }

  function toggleDev(force) {
    devpanel.hidden = force === undefined ? !devpanel.hidden : !force;
    if (!devpanel.hidden) buildDevList();
  }

  devList.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-jump]");
    if (!btn) return;
    state.index = parseInt(btn.getAttribute("data-jump"), 10);
    toggleDev(false);
    render();
  });

  document.getElementById("devClose").addEventListener("click", function () { toggleDev(false); });
  document.getElementById("devReset").addEventListener("click", resetProgress);

  document.addEventListener("keydown", function (e) {
    if (e.shiftKey && (e.key === "D" || e.key === "d") && !e.target.matches("input,textarea")) {
      toggleDev();
    }
    if (e.key === "Escape" && !devpanel.hidden) toggleDev(false);
  });

  if (location.hash === "#dev") setTimeout(function () { toggleDev(true); }, 300);

  /* ---------- Переходы ---------- */
  function goTo(i) {
    if (i < 0 || i >= SCREENS.length) return;
    state.index = i;
    save();
    render();
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  function next() { goTo(state.index + 1); }

  nextBtn.addEventListener("click", next);

  function setNext(visible, label) {
    nextBtn.hidden = !visible;
    if (label) nextBtn.textContent = label;
  }

  function addScore(id, value) {
    var prev = state.answers[id];
    if (prev) return;                 /* экран уже решён — балл не начисляем заново */
    state.answers[id] = { score: value || 0, done: true };
    state.score += value || 0;
    save();
    updateChrome();
  }

  /* ---------- Хром ---------- */
  function updateChrome() {
    var screen = SCREENS[state.index];
    var pct = Math.round(((state.index + 1) / SCREENS.length) * 100);
    progressFill.style.width = pct + "%";
    progressBar.setAttribute("aria-valuenow", String(pct));
    episodeLabel.textContent = EPISODES[screen.episode] || "";
    var answered = Object.keys(state.answers).length;
    scoreLabel.textContent = "Верных решений: " + state.score + " из 12";
    document.title = screen.title ? screen.title + " — Дело о четырёх решениях" : "Дело о четырёх решениях";
  }

  /* ---------- Рендер ---------- */
  function render() {
    var s = SCREENS[state.index];
    setNext(true);
    root.innerHTML = "";
    var el = document.createElement("div");
    el.className = "screen";

    var view = VIEWS[s.type];
    if (!view) {
      el.innerHTML = "<p>Неизвестный тип экрана: " + esc(s.type) + "</p>";
    } else {
      view.build(s, el);
    }

    root.appendChild(el);
    updateChrome();

    var h1 = el.querySelector("h1");
    if (h1) { h1.setAttribute("tabindex", "-1"); h1.focus({ preventScroll: true }); }
  }

  /* ---------- Общие блоки ---------- */
  function head(s) {
    return (s.kicker ? '<div class="kicker">' + esc(s.kicker) + "</div>" : "") +
      (s.title ? "<h1>" + esc(s.title) + "</h1>" : "");
  }

  function note(text, cls) {
    return '<div class="note' + (cls ? " " + cls : "") + '">' + text + "</div>";
  }

  function feedbackBox(text, cls) {
    return '<div class="feedback ' + (cls || "feedback--note") + '" role="status">' + text + "</div>";
  }

  function avatar(person) {
    var initials = person.initials || (person.name || "?").slice(0, 1).toUpperCase();
    return '<div class="avatar" style="background:' + esc(person.color || "#5B6270") + '" aria-hidden="true">' +
      esc(initials) + "</div>";
  }

  /* ============================================================
     ЭКРАНЫ
     ============================================================ */
  var VIEWS = {};

  /* ---- Титул ---- */
  VIEWS.cover = {
    build: function (s, el) {
      el.innerHTML =
        '<div class="cover">' +
          '<div class="cover__stamp">' + esc(s.stamp) + "</div>" +
          "<h1>" + esc(s.title) + "</h1>" +
          '<div class="cover__sub">' + esc(s.subtitle) + "</div>" +
          '<div class="cover__meta">' + esc(s.meta) + "</div>" +
          '<button class="btn btn--primary" type="button" data-cta="1">' + esc(s.cta) + "</button>" +
        "</div>";
      el.querySelector("[data-cta]").addEventListener("click", next);
      setNext(false);
    }
  };

  /* ---- Сюжетный экран ---- */
  VIEWS.story = {
    build: function (s, el) {
      var v = s.variant || "theory";
      var html = head(s);

      if (v === "scene") {
        html += '<div class="scene">' + avatar(s.person) +
          '<div class="scene__body">' +
            '<div class="scene__name">' + esc(s.person.name) + "</div>" +
            '<div class="scene__role">' + esc(s.person.role || "") + "</div>" +
            '<div class="bubble bubble--plain">' + esc(s.text) + "</div>" +
          "</div></div>";
        if (s.expand) {
          html += '<div style="margin-top:14px">' +
            '<button class="btn btn--ghost" type="button" data-expand="1">' + esc(s.expand.label) + "</button>" +
            '<div class="note" data-expand-text hidden>' + esc(s.expand.text) + "</div></div>";
        }
        if (s.cta) {
          html += '<div style="margin-top:22px"><button class="btn btn--primary btn--wide" type="button" data-cta="1">' +
            esc(s.cta) + "</button></div>";
        }
      } else {
        if (s.intro) html += '<p class="lead">' + esc(s.intro) + "</p>";
        if (s.blocks) html += renderBlocks(s.blocks);
        if (s.accordion) html += renderAccordion(s.accordion);
        if (s.finale) html += '<div class="note" style="font-family:Lora,serif;font-size:24px;line-height:1.35;padding:24px">' + esc(s.finale) + "</div>";
        if (s.finalNote) html += note(esc(s.finalNote));
        if (s.cta) {
          html += '<div style="margin-top:22px"><button class="btn btn--primary btn--wide" type="button" data-cta="1">' +
            esc(s.cta) + "</button></div>";
        }
      }

      el.innerHTML = html;

      var exp = el.querySelector("[data-expand]");
      if (exp) {
        exp.addEventListener("click", function () {
          var box = el.querySelector("[data-expand-text]");
          box.hidden = !box.hidden;
          exp.setAttribute("aria-expanded", String(!box.hidden));
        });
      }
      var cta = el.querySelector("[data-cta]");
      if (cta) { cta.addEventListener("click", next); setNext(false); }
      bindAccordions(el);
    }
  };

  function renderBlocks(blocks) {
    return blocks.map(function (b) {
      if (b.p) return "<p>" + esc(b.p) + "</p>";
      if (b.marker) return '<p><span class="marker-line">' + esc(b.marker) + "</span></p>";
      if (b.steps) {
        return '<ul class="rules">' + b.steps.map(function (t, i) {
          return '<li><span class="rules__num">' + (i + 1) + "</span><span>" + esc(t) + "</span></li>";
        }).join("") + "</ul>";
      }
      if (b.chain) {
        return '<div class="note" style="font-size:15px">' + b.chain.map(function (t, i) {
          return '<span style="white-space:nowrap">' + esc(t) + "</span>" + (i < b.chain.length - 1 ? ' <span class="muted">→</span> ' : "");
        }).join("") + "</div>";
      }
      if (b.table) {
        return '<table class="table"><thead><tr>' + b.table.head.map(function (h) {
          return "<th>" + esc(h) + "</th>";
        }).join("") + "</tr></thead><tbody>" + b.table.rows.map(function (r) {
          return "<tr>" + r.map(function (c) { return "<td>" + esc(c) + "</td>"; }).join("") + "</tr>";
        }).join("") + "</tbody></table>";
      }
      return "";
    }).join("");
  }

  function renderAccordion(items) {
    return items.map(function (it) {
      return '<details class="acc">' +
        '<summary class="acc__head">' +
          '<span class="acc__icon tone-' + esc(it.tone || "ok") + '">' + icon(it.icon, it.tone) + "</span>" +
          "<span>" + esc(it.label) + "</span>" +
          '<span class="acc__chev">' + icon("chevron") + "</span>" +
        "</summary>" +
        '<div class="acc__body">' + esc(it.text) + "</div>" +
      "</details>";
    }).join("");
  }

  function bindAccordions(el) {
    /* нативный details работает сам; нужен только aria */
    el.querySelectorAll("details.acc").forEach(function (d) {
      d.addEventListener("toggle", function () {
        d.setAttribute("aria-expanded", String(d.open));
      });
    });
  }

  /* ---- Мессенджер ---- */
  VIEWS.chat = {
    build: function (s, el) {
      var html = "<h1>" + esc(s.title) + "</h1>";
      html += '<button class="btn btn--ghost" type="button" data-reveal="1">' + esc(s.revealLabel) + "</button>";
      html += '<div class="chat" data-chat hidden>' + s.messages.map(function (m) {
        var out = m.dir === "out";
        var body = m.typing
          ? '<span class="chat__typing" aria-label="печатает"><i></i><i></i><i></i></span>'
          : esc(m.text);
        return '<div class="chat__row chat__row--' + (out ? "out" : "in") + '">' +
          avatar({ name: m.author, initials: (m.author || "?").slice(0, 1), color: m.role === "ИБ" ? "#8C2A15" : "#3A4A6B" }) +
          '<div class="chat__msg">' +
            '<div class="chat__author">' + esc(m.author) + (m.role ? " · " + esc(m.role) : "") + "</div>" +
            body +
          "</div></div>";
      }).join("") + "</div>";

      el.innerHTML = html;

      el.querySelector("[data-reveal]").addEventListener("click", function (e) {
        el.querySelector("[data-chat]").hidden = false;
        e.target.remove();
      });
    }
  };

  /* ---- Поиск по документу ---- */
  VIEWS.hotspots = {
    build: function (s, el) {
      var found = 0;
      var totalCorrect = Object.keys(s.zones).filter(function (k) { return s.zones[k].correct; }).length;
      var misses = 0;

      var html = head(s);
      if (s.intro) html += '<p class="lead">' + esc(s.intro) + "</p>";
      html += '<div class="counter" data-counter>Найдено 0 из ' + totalCorrect + "</div>";
      html += '<div class="doc"><div class="doc__title">' + esc(s.docTitle) + "</div>";
      html += s.doc.map(function (part) {
        if (!part.z) return esc(part.t);
        return '<button class="zone" type="button" data-zone="' + esc(part.z) + '">' + esc(part.t) + "</button>";
      }).join("");
      html += '<div style="margin-top:16px"><div data-fb></div></div></div>';
      html += '<div data-final hidden>' + note(esc(s.finalNote)) + "</div>";

      el.innerHTML = html;
      setNext(false);

      var counter = el.querySelector("[data-counter]");
      var fb = el.querySelector("[data-fb]");

      el.querySelectorAll(".zone").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var key = btn.getAttribute("data-zone");
          var zone = s.zones[key];
          if (btn.classList.contains("zone--found") || btn.classList.contains("zone--missed")) return;

          if (zone.correct) {
            btn.classList.add("zone--found");
            found++;
            counter.textContent = "Найдено " + found + " из " + totalCorrect;
            fb.innerHTML = feedbackBox("<strong>Это проблема.</strong> " + esc(zone.feedback), "feedback--ok");
          } else {
            misses++;
            btn.classList.add("zone--missed");
            fb.innerHTML = feedbackBox("<strong>Это не маркер.</strong> " + esc(zone.feedback), "feedback--note");
            if (misses === 2) {
              var left = totalCorrect - found;
              counter.textContent += " · осталось найти " + left;
            }
          }

          if (found === totalCorrect) {
            el.querySelector("[data-final]").hidden = false;
            addScore(s.id, 1);
            setNext(true);
          }
        });
      });
    }
  };

  /* ---- Сортировка карточек ---- */
  VIEWS.bins = {
    build: function (s, el) {
      var i = 0;
      var correctCount = 0;
      var html = head(s);
      if (s.intro) html += '<p class="lead">' + esc(s.intro) + "</p>";
      html += '<div data-stage></div>';
      el.innerHTML = html;
      setNext(false);

      var stage = el.querySelector("[data-stage]");

      function drawCard() {
        var card = s.cards[i];
        stage.innerHTML =
          '<div class="card-stage">' +
            '<div class="card-stage__label">Карточка ' + (i + 1) + " из " + s.cards.length + "</div>" +
            '<div class="card-stage__text">' + esc(card.text) + "</div>" +
          "</div>" +
          '<div class="bins">' + s.bins.map(function (b) {
            return '<button class="bin bin--' + esc(b.tone) + '" type="button" data-bin="' + esc(b.id) + '">' +
              '<span class="bin__icon">' + icon(b.icon, b.tone) + "</span>" +
              "<span>" + esc(b.label) + "</span></button>";
          }).join("") + "</div>" +
          '<div data-fb style="margin-top:16px"></div>';

        stage.querySelectorAll("[data-bin]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var chosen = btn.getAttribute("data-bin");
            var ok = chosen === card.bin;
            if (ok) correctCount++;

            var binLabel = s.bins.filter(function (b) { return b.id === card.bin; })[0].label;

            stage.querySelectorAll("[data-bin]").forEach(function (b) { b.disabled = true; });
            var box = stage.querySelector("[data-fb]");
            box.innerHTML = feedbackBox(
              (ok ? "<strong>Верно: " + esc(binLabel) + ".</strong> " : "<strong>Уровень: " + esc(binLabel) + ".</strong> ") + esc(card.feedback),
              ok ? "feedback--ok" : "feedback--near"
            ) + '<div style="margin-top:14px"><button class="btn btn--primary btn--wide" type="button" data-nextcard="1">' +
              (i === s.cards.length - 1 ? "Показать итог" : "Следующая карточка") + "</button></div>";

            box.querySelector("[data-nextcard]").addEventListener("click", function () {
              i++;
              if (i < s.cards.length) {
                drawCard();
              } else {
                showSummary();
              }
            });
          });
        });
      }

      function showSummary() {
        var threshold = Math.ceil(s.cards.length * 0.75);
        var solved = correctCount >= threshold;

        stage.innerHTML =
          '<div class="result">' +
            '<div class="result__score">' + correctCount + " из " + s.cards.length + "</div>" +
            '<p class="muted">Верно разложено карточек. ' +
              (solved ? "Упражнение засчитано." : "Для зачёта нужно " + threshold + ".") + "</p>" +
          "</div>";
        addScore(s.id, solved ? 1 : 0);
        setNext(true);
      }

      drawCard();
    }
  };

  /* ---- Выбор варианта ---- */
  VIEWS.choice = {
    build: function (s, el) {
      var html = head(s);
      if (s.question) html += '<p class="lead">' + esc(s.question) + "</p>";
      if (s.contextLine) html += '<div class="note" style="font-family:Georgia,serif">' + esc(s.contextLine) + "</div>";
      html += '<div style="margin-top:18px" data-options>' + s.options.map(function (o, idx) {
        return '<button class="option" type="button" data-opt="' + idx + '">' +
          '<span class="option__mark">' + (idx + 1) + "</span>" +
          "<span>" + esc(o.text) + "</span></button>";
      }).join("") + "</div>";
      html += '<div data-fb></div>';
      if (s.afterNote) html += '<div data-after hidden>' + note(esc(s.afterNote)) + "</div>";
      if (s.finalNote) html += '<div data-final hidden>' + note(esc(s.finalNote)) + "</div>";

      el.innerHTML = html;
      setNext(false);

      var fb = el.querySelector("[data-fb]");

      el.querySelectorAll("[data-opt]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var idx = parseInt(btn.getAttribute("data-opt"), 10);
          var opt = s.options[idx];

          el.querySelectorAll("[data-opt]").forEach(function (b) {
            b.classList.remove("option--picked");
            b.disabled = true;
          });
          btn.classList.add("option--picked");

          fb.innerHTML = feedbackBox(
            "<strong>" + (opt.score > 0 ? "Верно." : "Не лучший вариант.") + "</strong> " + esc(opt.feedback),
            opt.score > 0 ? "feedback--ok" : "feedback--near"
          );

          if (s.afterNote) el.querySelector("[data-after]").hidden = false;
          if (s.finalNote) el.querySelector("[data-final]").hidden = false;

          addScore(s.id, opt.score > 0 ? 1 : 0);
          setNext(true);
        });
      });
    }
  };

  /* ---- Чек-лист допуска ---- */
  VIEWS.calculator = {
    build: function (s, el) {
      var answers = new Array(s.items.length).fill(null);
      var html = head(s);
      if (s.intro) html += '<p class="lead">' + esc(s.intro) + "</p>";
      html += '<div style="margin-top:18px">' + s.items.map(function (q, i) {
        return '<div class="calc-row">' +
          '<div class="calc-row__q">' + esc(q) + "</div>" +
          '<div class="calc-row__opts" role="group" aria-label="' + esc(q) + '">' +
            '<button class="chip" type="button" data-i="' + i + '" data-v="yes">Да</button>' +
            '<button class="chip" type="button" data-i="' + i + '" data-v="no">Нет</button>' +
          "</div></div>";
      }).join("") + "</div>";
      html += '<div data-verdict class="verdict verdict--stop">' +
        "<div>Ответьте на все пять вопросов</div>" +
        '<div class="verdict__hint">' + esc(s.hint) + "</div></div>";

      el.innerHTML = html;

      var verdict = el.querySelector("[data-verdict]");

      el.querySelectorAll(".chip").forEach(function (chip) {
        chip.addEventListener("click", function () {
          var i = parseInt(chip.getAttribute("data-i"), 10);
          var v = chip.getAttribute("data-v");
          answers[i] = v;

          el.querySelectorAll('.chip[data-i="' + i + '"]').forEach(function (c) {
            c.classList.remove("chip--on-yes", "chip--on-no");
          });
          chip.classList.add(v === "yes" ? "chip--on-yes" : "chip--on-no");

          update();
        });
      });

      function update() {
        if (answers.indexOf(null) !== -1) {
          verdict.className = "verdict verdict--stop";
          verdict.innerHTML = "<div>Ответьте на все пять вопросов</div>" +
            '<div class="verdict__hint">' + esc(s.hint) + "</div>";
          setNext(false);
          return;
        }

        var yes = answers.filter(function (a) { return a === "yes"; }).length;
        var key = yes === 5 ? "ok" : (yes >= 3 ? "warn" : "stop");
        var v = s.verdicts[key];

        verdict.className = "verdict verdict--" + v.tone;
        verdict.innerHTML = "<div>" + esc(v.label) + "</div>" +
          '<div class="verdict__hint">' + esc(s.hint) + "</div>";

        if (!state.answers[s.id]) {
          addScore(s.id, key === "ok" || key === "warn" ? 1 : 0);
        } else if (state.answers[s.id].score === 0 && (key === "ok" || key === "warn")) {
          /* передумали и довели до допустимого вердикта — засчитываем один раз */
          state.answers[s.id].score = 1;
          state.score += 1;
          save();
          updateChrome();
        }
        setNext(true);
      }

      update();
    }
  };

  /* ---- Тест ---- */
  VIEWS.quiz = {
    build: function (s, el) {
      var qIndex = 0;
      var correct = 0;
      var answered = false;

      var html = head(s);
      html += '<div data-quizbody></div>';
      el.innerHTML = html;
      setNext(false);

      var body = el.querySelector("[data-quizbody]");

      function drawQuestion() {
        answered = false;
        var q = s.questions[qIndex];

        body.innerHTML =
          '<div class="qmeta">Вопрос ' + (qIndex + 1) + " из " + s.questions.length + "</div>" +
          "<h2>" + esc(q.q) + "</h2>" +
          '<div data-opts style="margin-top:16px">' + q.options.map(function (o, i) {
            return '<button class="option" type="button" data-qopt="' + i + '">' +
              '<span class="option__mark">' + String.fromCharCode(65 + i) + "</span>" +
              "<span>" + esc(o.text) + "</span></button>";
          }).join("") + "</div>" +
          '<div data-qfb></div>' +
          '<div data-qnext hidden style="margin-top:16px">' +
            '<button class="btn btn--primary btn--wide" type="button" data-qgo="1">' +
            (qIndex === s.questions.length - 1 ? "Показать результат" : "Следующий вопрос") + "</button></div>";

        body.querySelectorAll("[data-qopt]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            if (answered) return;
            answered = true;

            var idx = parseInt(btn.getAttribute("data-qopt"), 10);
            var opt = q.options[idx];
            if (opt.correct) correct++;

            body.querySelectorAll("[data-qopt]").forEach(function (b, i) {
              b.disabled = true;
              if (q.options[i].correct) b.classList.add("option--picked");
            });

            body.querySelector("[data-qfb]").innerHTML = feedbackBox(
              "<strong>" + (opt.correct ? "Верно." : "Почти.") + "</strong> " + esc(opt.feedback),
              opt.correct ? "feedback--ok" : "feedback--near"
            );
            body.querySelector("[data-qnext]").hidden = false;
          });
        });

        body.querySelector("[data-qgo]").addEventListener("click", function () {
          qIndex++;
          if (qIndex < s.questions.length) {
            drawQuestion();
          } else {
            showResult();
          }
        });
      }

      function showResult() {
        var passed = correct >= s.passScore;
        state.quizAttempts++;
        if (state.quizBest === null || correct > state.quizBest) state.quizBest = correct;
        save();

        body.innerHTML =
          '<div class="result">' +
            '<div class="result__score">' + correct + " из " + s.questions.length + "</div>" +
            "<h2>" + (passed ? "Зачёт" : "Пока не зачёт") + "</h2>" +
            '<p class="muted">Проходной балл — ' + s.passScore + " из " + s.questions.length + "</p>" +
            '<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:20px">' +
              (passed
                ? '<button class="btn btn--primary" type="button" data-finish="1">Завершить</button>'
                : '<button class="btn btn--primary" type="button" data-retry="1">Пройти ещё раз</button>' +
                  '<button class="btn btn--ghost" type="button" data-finish="1">Завершить без зачёта</button>') +
            "</div>" +
          "</div>";

        var retry = body.querySelector("[data-retry]");
        if (retry) {
          retry.addEventListener("click", function () {
            qIndex = 0;
            correct = 0;
            setNext(false);
            drawQuestion();
          });
        }

        body.querySelector("[data-finish]").addEventListener("click", function () {
          state.score += 0; /* баллы теста считаются отдельно */
          save();
          next();
        });

        setNext(false);
      }

      drawQuestion();
    }
  };

  /* ---- Памятка ---- */
  VIEWS.summary = {
    build: function (s, el) {
      var html = head(s);
      if (s.intro) html += '<p class="lead">' + esc(s.intro) + "</p>";
      html += '<ul class="rules">' + s.rules.map(function (r, i) {
        return '<li><span class="rules__num">' + (i + 1) + "</span><span>" + esc(r) + "</span></li>";
      }).join("") + "</ul>";
      html += '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:22px">' +
        '<button class="btn btn--ghost" type="button" data-download="1">Скачать памятку</button>' +
        '<button class="btn btn--ghost" type="button" data-print="1">Распечатать</button>' +
        '<button class="btn btn--primary" type="button" data-next="1">' + esc(s.cta) + "</button>" +
      "</div>";

      el.innerHTML = html;

      el.querySelector("[data-download]").addEventListener("click", function () {
        var content = '<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">' +
          "<title>Памятка — дело о четырёх решениях</title><style>" +
          "body{font-family:Georgia,serif;max-width:640px;margin:40px auto;padding:0 20px;color:#16181D;line-height:1.6}" +
          "h1{font-size:26px;margin-bottom:6px}p.sub{color:#5B6270;margin-top:0}" +
          "li{margin-bottom:12px;font-size:17px}" +
          "</style></head><body><h1>Памятка: работа с ИИ-инструментами</h1>" +
          '<p class="sub">Дело о четырёх решениях · Атлас Групп</p><ol>' +
          s.rules.map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("") +
          "</ol></body></html>";

        var blob = new Blob([content], { type: "text/html;charset=utf-8" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "pamyatka-ii-bezopasnost.html";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      });

      el.querySelector("[data-print]").addEventListener("click", function () { window.print(); });
      el.querySelector("[data-next]").addEventListener("click", next);
      setNext(false);
    }
  };

  /* ---- Финал ---- */
  VIEWS.end = {
    build: function (s, el) {
      var html = '<div class="result">' +
        "<h1>" + esc(s.title) + "</h1>" +
        '<p class="muted" style="font-size:18px">' + esc(s.text) + "</p>" +
        '<div style="margin:26px 0;padding:20px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)">' +
          '<div class="small muted">Верных решений</div>' +
          '<div class="result__score">' + state.score + " из 12</div>" +
          '<div class="small muted" style="margin-top:10px">Тест</div>' +
          '<div class="result__score">' + (state.quizBest === null ? "—" : state.quizBest + " из 6") + "</div>" +
        "</div>" +
        '<button class="btn btn--primary" type="button" data-restart="1">Пройти заново</button>' +
      "</div>";

      el.innerHTML = html;
      el.querySelector("[data-restart]").addEventListener("click", resetProgress);
      setNext(false);
    }
  };

  /* ============================================================
     СТАРТ
     ============================================================ */
  function boot() {
    var saved = load();

    if (saved && saved.index > 0 && saved.index < SCREENS.length) {
      state = saved;
      render();
      overlay.hidden = false;
      document.getElementById("resumeContinue").focus();
    } else {
      state.startedAt = Date.now();
      render();
    }
  }

  boot();
})();
