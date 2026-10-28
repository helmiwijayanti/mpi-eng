/* Shared helpers: progress, saved answers, keyboard navigation. No network calls. */
(function () {
  "use strict";
  var KEY = "spaylater-progress-v1";
  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; }
  }
  function write(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* storage unavailable: page still works */ }
  }
  document.addEventListener("DOMContentLoaded", function () {
    var body = document.body;
    var stage = parseInt(body.getAttribute("data-stage") || "0", 10);
    var data = read();
    if (stage > 0) {
      data.visited = data.visited || [];
      if (data.visited.indexOf(stage) === -1) { data.visited.push(stage); }
      data.lastStage = stage;
      write(data);
    }
    // Mark progress dots.
    var dots = document.querySelectorAll(".dots a[data-stage]");
    dots.forEach(function (a) {
      var n = parseInt(a.getAttribute("data-stage"), 10);
      if ((data.visited || []).indexOf(n) !== -1) { a.classList.add("done"); }
      if (n === stage) { a.classList.add("current"); a.setAttribute("aria-current", "page"); }
    });
    // Restore saved fields.
    document.querySelectorAll("[data-save]").forEach(function (el) {
      var id = el.getAttribute("data-save");
      if (data[id] !== undefined) { el.value = data[id]; }
      el.addEventListener("input", function () {
        var d = read(); d[id] = el.value; write(d);
      });
      el.addEventListener("change", function () {
        var d = read(); d[id] = el.value; write(d);
      });
    });
    // Keyboard navigation for presenter remote / TV: arrows only when not typing.
    document.addEventListener("keydown", function (ev) {
      var t = document.activeElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) { return; }
      var prev = document.querySelector("[data-nav-prev]");
      var next = document.querySelector("[data-nav-next]");
      if (ev.key === "ArrowLeft" && prev) { window.location.href = prev.getAttribute("href"); }
      if (ev.key === "ArrowRight" && next) { window.location.href = next.getAttribute("href"); }
    });
    // Optional reset button on the closing page.
    var reset = document.getElementById("reset-progress");
    if (reset) {
      reset.addEventListener("click", function () {
        try { localStorage.removeItem(KEY); } catch (e) {}
        window.location.href = "index.html";
      });
    }
  });
  window.SPayLater = {
    save: function (k, v) { var d = read(); d[k] = v; write(d); },
    load: function (k) { return read()[k]; },
    fmtRupiah: function (n) { return "Rp" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."); },
    // Render a multiple-choice set. Scoring is recomputed from the data:
    // score = round(correct / total * 100). Each question carries its own feedback.
    renderQuiz: function (rootId, questions, resultId) {
      var root = document.getElementById(rootId);
      if (!root) { return; }
      var answers = {};
      questions.forEach(function (q, i) {
        var box = document.createElement("div");
        box.className = "card";
        var h = document.createElement("h3");
        h.textContent = (i + 1) + ". " + q.q;
        box.appendChild(h);
        if (q.level) { var tag = document.createElement("span"); tag.className = "tag " + q.levelClass; tag.textContent = q.level; box.appendChild(tag); }
        if (q.reason) { var rq = document.createElement("p"); rq.className = "small"; rq.textContent = "Tulis alasanmu dulu di bawah, lalu pilih jawaban."; box.appendChild(rq); }
        q.options.forEach(function (opt, j) {
          var b = document.createElement("button");
          b.type = "button"; b.className = "choice"; b.textContent = "ABCD"[j] + ". " + opt;
          b.addEventListener("click", function () {
            if (answers[i] !== undefined) { return; }
            answers[i] = j;
            var btns = box.querySelectorAll(".choice");
            btns.forEach(function (x) { x.classList.remove("selected"); });
            b.classList.add("selected");
            if (j === q.answer) { b.classList.add("correct"); } else { b.classList.add("wrong"); btns[q.answer].classList.add("correct"); }
            var fb = document.createElement("div");
            fb.className = "feedback " + (j === q.answer ? "good" : "bad");
            fb.textContent = (j === q.answer ? "Benar. " : "Belum tepat. ") + q.feedback;
            box.appendChild(fb);
            update();
          });
          box.appendChild(b);
        });
        if (q.reason) {
          var ta = document.createElement("textarea");
          ta.placeholder = "Alasanku: …";
          ta.setAttribute("aria-label", "Alasan untuk soal " + (i + 1));
          box.appendChild(ta);
        }
        root.appendChild(box);
      });
      function update() {
        var answered = Object.keys(answers).length;
        var correct = 0;
        Object.keys(answers).forEach(function (k) { if (answers[k] === questions[k].answer) { correct++; } });
        var el = document.getElementById(resultId);
        if (el) { el.textContent = "Terjawab: " + answered + "/" + questions.length + " • Benar: " + correct + " • Skor sementara: " + Math.round(correct / questions.length * 100) + " dari 100"; }
      }
      var btn = document.createElement("button");
      btn.type = "button"; btn.className = "btn btn-primary"; btn.textContent = "CEK JAWABAN (lihat skor akhir)";
      btn.addEventListener("click", function () {
        var correct = 0;
        Object.keys(answers).forEach(function (k) { if (answers[k] === questions[k].answer) { correct++; } });
        var score = Math.round(correct / questions.length * 100);
        var el = document.getElementById(resultId);
        if (el) { el.textContent = "Skor akhir: " + score + " dari 100 (" + correct + " benar dari " + questions.length + " soal). " + (score >= 80 ? "Hebat, kamu sudah menguasai materi ini!" : score >= 60 ? "Bagus, ulangi soal yang masih salah dan baca pembahasannya." : "Jangan menyerah — baca pembahasan tiap soal, lalu coba lagi dengan tombol ULANGI."); }
        window.SPayLater.save(resultId, score);
      });
      root.appendChild(btn);
      var again = document.createElement("button");
      again.type = "button"; again.className = "btn"; again.textContent = "ULANGI";
      again.style.marginLeft = "10px";
      again.addEventListener("click", function () { window.location.reload(); });
      root.appendChild(again);
    }
  };
})();
