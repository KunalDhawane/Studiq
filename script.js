
const KEY = "studiq-v2", D = 864e5, $ = id => document.getElementById(id);
const ld = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const today = () => ld(new Date()), ad = n => ld(new Date(Date.now() + n * D));
const gap = (a, b) => Math.round((new Date(a + "T00:00") - new Date(b + "T00:00")) / D);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let SUBS = [];
// subjects take the four palette colors in turn
const col = s => ['var(--c1)', 'var(--c3)', 'var(--c4)', 'var(--text)'][Math.max(0, SUBS.indexOf(s)) % 4];
let S = null, filter = "All";
try { S = JSON.parse(localStorage.getItem(KEY)) } catch (e) { }
if (!S) {
    S = { tasks: [], log: [], rev: [] }; const sub = ["DBMS", "Algorithms", "OS", "Maths"];
    [["DBMS ER diagram assignment", "DBMS", 1, "High", 2], ["Binary tree problem set", "Algorithms", 2, "High", 3], ["OS scheduling notes", "OS", 4, "Medium", 1.5], ["Discrete maths worksheet", "Maths", 6, "Low", 2], ["Mini project report draft", "DBMS", 3, "Medium", 4]]
        .forEach((t, i) => S.tasks.push({ id: i + 1, title: t[0], subject: t[1], due: ad(t[2]), prio: t[3], est: t[4], done: false }));
    for (let i = 0; i < 110; i++)if ((i * 7 + i % 5) % 3) { S.log.push({ subject: sub[i % 4], min: 20 + ((i * 37) % 100), date: ad(-i) }) }
    S.demo = 1
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)) } catch (e) { } };
const toast = m => { const t = $("toast"); t.textContent = m; t.classList.add("on"); setTimeout(() => t.classList.remove("on"), 2600) };
const W = { High: 3, Medium: 2, Low: 1 };
const score = t => { const l = gap(t.due, today()); return ((l < 0 ? 100 - l : 40 / (l + 1)) * W[t.prio]) / 2 + t.est };
const rel = d => { const l = gap(d, today()); return l < 0 ? `Overdue ${-l}d` : l == 0 ? "Due today" : l == 1 ? "Due tomorrow" : `Due in ${l}d` };

function parse(s) {
    let prio = "Medium", est = 1, due = today(), subject = "General";
    s = s.replace(/#(\S+)/, (m, a) => (subject = a, ""));
    s = s.replace(/\b(\d+(?:\.\d+)?)\s?h\b/i, (m, a) => (est = +a, ""));
    s = s.replace(/\b(high|urgent)\b|!!/i, () => (prio = "High", ""));
    s = s.replace(/\blow\b/i, () => (prio = "Low", ""));
    s = s.replace(/\btoday\b/i, "").replace(/\btomorrow\b/i, () => (due = ad(1), ""));
    s = s.replace(/\bin (\d+)\s?d\b/i, (m, a) => (due = ad(+a), ""));
    s = s.replace(/\b(sun|mon|tue|wed|thu|fri|sat)[a-z]*\b/i, (m, a) => { const i = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].indexOf(a.toLowerCase()); let n = (i - new Date().getDay() + 7) % 7 || 7; due = ad(n); return "" });
    return { title: s.replace(/\s+/g, " ").trim(), prio, est, due, subject }
}
$("qa").oninput = () => { const p = parse($("qa").value); $("hint").innerHTML = p.title ? `<div class="m">Adds <b>${esc(p.title)}</b><span>${esc(p.subject)}</span><span>${p.due}</span><span>${p.prio}</span><span>${p.est}h</span></div>` : "Use <b>#subject</b>, a day (fri, tomorrow, in 3d), <b>high/low</b> and a duration like <b>2h</b>." };
const addTask = () => { const p = parse($("qa").value); if (!p.title) return; S.tasks.push({ id: Date.now(), done: false, ...p }); $("qa").value = ""; $("qa").oninput(); save(); render(); toast("Task added") };
$("add").onclick = addTask; $("qa").onkeydown = e => { if (e.key === "Enter") addTask() };
document.onkeydown = e => { if (e.key === "/" && document.activeElement.tagName !== "INPUT") { e.preventDefault(); $("qa").focus() } };

function render() {
    SUBS = [...new Set([...S.tasks.map(t => t.subject), ...S.log.map(l => l.subject)])].sort();
    const td = today(), pend = S.tasks.filter(t => !t.done), cap = +$("cap").value;
    const byDay = {}; S.log.forEach(l => byDay[l.date] = (byDay[l.date] || 0) + l.min);
    let st = 0, d = byDay[td] ? 0 : 1; while (byDay[ad(-d)]) { st++; d++ } if (byDay[td]) st++;
    const wk = Object.entries(byDay).filter(([k]) => gap(td, k) < 7 && gap(td, k) >= 0).reduce((a, [, v]) => a + v, 0);
    const risk = new Set(); let cum = 0;[...pend].sort((a, b) => a.due.localeCompare(b.due)).forEach(t => { cum += t.est; if (cum > cap * (Math.max(0, gap(t.due, td)) + 1)) risk.add(t.id) });
    $("stats").innerHTML = [["Streak", st + " day" + (st == 1 ? "" : "s")], ["This week", (wk / 60).toFixed(1) + " h"], ["Pending", pend.length], ["At risk", risk.size]]
        .map(([k, v]) => `<div class="stat"><b>${v}</b><span>${k}</span></div>`).join("");
    // plan
    let used = 0, pl = [];[...pend].sort((a, b) => score(b) - score(a)).forEach(t => { if (used >= cap) return; const h = Math.min(t.est, cap - used); pl.push({ t, h, start: used }); used += h });
    $("plan").innerHTML = pl.length ? `<div class="seg">${pl.map(p => `<i style="width:${p.h / cap * 100}%;background:${col(p.t.subject)}" title="${esc(p.t.title)}"></i>`).join("")}</div>` +
        pl.map(p => {
            const m = 9 * 60 + p.start * 60, f = x => String(Math.floor(x / 60)).padStart(2, "0") + ":" + String(Math.round(x % 60)).padStart(2, "0");
            return `<div class="pl"><span class="tm">${f(m)}</span><span class="dot" style="background:${col(p.t.subject)}"></span><div class="t">${esc(p.t.title)}<div class="m"><span>${esc(p.t.subject)}</span><span>${p.h}h${p.h < p.t.est ? " of " + p.t.est + "h" : ""}</span><span>${rel(p.t.due)}</span></div></div>${risk.has(p.t.id) ? '<span class="pill risk">At risk</span>' : ""}</div>`
        }).join("") +
        `<div class="m" style="margin-top:8px">Ranked by deadline urgency × priority. Plan fills ${used.toFixed(1)} of ${cap} h.</div>` : `<div class="empty">Nothing planned. Add a task above.</div>`;
    // tasks
    $("tabs").innerHTML = ["All", "Pending", "Done"].map(f => `<button class="${f == filter ? "on" : ""}" data-f="${f}">${f}</button>`).join("");
    const items = S.tasks.filter(t => filter == "All" || (filter == "Done") == t.done).sort((a, b) => a.done - b.done || a.due.localeCompare(b.due));
    $("list").innerHTML = items.length ? items.map(t => `<div class="task ${t.done ? "done" : ""}"><input type="checkbox" data-c="${t.id}" ${t.done ? "checked" : ""} aria-label="Done">
  <div class="t">${esc(t.title)}<div class="m"><span class="dot" style="background:${col(t.subject)}"></span>${esc(t.subject)}<span class="${!t.done && t.due < td ? "late" : ""}">${t.done ? t.due : rel(t.due)}</span><span>${t.est}h</span><span class="pill ${t.prio}">${t.prio}</span>${!t.done && risk.has(t.id) ? '<span class="pill risk">At risk</span>' : ""}</div></div>
  <button class="x" data-d="${t.id}" aria-label="Delete">✕</button></div>`).join("") : `<div class="empty">No tasks here.</div>`;
    // revision
    const dueR = S.rev.filter(r => r.due <= td); $("rn").textContent = S.rev.length ? `${dueR.length} due, ${S.rev.length - dueR.length} upcoming` : "";
    $("rev").innerHTML = dueR.length ? dueR.map(r => `<div class="pl"><span class="dot" style="background:${col(r.subject)}"></span><div class="t">${esc(r.title)}<div class="m"><span>${esc(r.subject)}</span><span>Revision ${r.n} of 3</span></div></div><button data-r="${r.id}">Reviewed</button></div>`).join("")
        : `<div class="empty">Complete a task to schedule spaced revisions (+1, +3, +7 days).</div>`;
    // subjects
    const cur = $("tsub").value; $("tsub").innerHTML = (SUBS.length ? SUBS : ["General"]).map(s => `<option>${esc(s)}</option>`).join(""); if (SUBS.includes(cur)) $("tsub").value = cur;
    $("subj").innerHTML = SUBS.map(s => {
        const m = S.log.filter(l => l.subject == s && gap(td, l.date) < 7 && gap(td, l.date) >= 0).reduce((a, l) => a + l.min, 0);
        return `<div><div class="m" style="justify-content:space-between"><b style="color:var(--text)">${esc(s)}</b><span>${Math.round(m / 60 * 10) / 10} / 5 h</span></div><div class="bar"><i style="width:${Math.min(100, m / 3)}%;background:${col(s)}"></i></div></div>`
    }).join("") || `<div class="empty">No subjects yet.</div>`;
    // heatmap: studied days are highlighted
    const dow = new Date().getDay(), n = 16 * 7 + dow; let h = "";
    for (let i = n; i >= 0; i--) {
        const k = ad(-i), m = byDay[k] || 0, a = !m ? 0 : m < 30 ? 35 : m < 60 ? 55 : m < 100 ? 78 : 100;
        h += `<i title="${k}: ${m} min" style="${a ? `background:color-mix(in srgb,var(--hl) ${a}%,var(--cell))` : ""}"></i>`
    }
    $("heat").innerHTML = h;
}
$("cap").onchange = render;
$("tabs").onclick = e => { if (e.target.dataset.f) { filter = e.target.dataset.f; render() } };
$("list").onclick = e => {
    const c = e.target.dataset.c, d = e.target.dataset.d;
    if (c) {
        const t = S.tasks.find(t => t.id == c); t.done = !t.done; S.rev = S.rev.filter(r => r.tid != t.id);
        if (t.done) { [1, 3, 7].forEach((n, i) => S.rev.push({ id: t.id + "-" + n, tid: t.id, title: t.title, subject: t.subject, due: ad(n), n: i + 1 })); toast("Done. Revisions scheduled") }
    }
    if (d) { S.tasks = S.tasks.filter(t => t.id != d); S.rev = S.rev.filter(r => r.tid != d) }
    if (c || d) { save(); render() }
};
$("rev").onclick = e => { if (e.target.dataset.r) { S.rev = S.rev.filter(r => r.id != e.target.dataset.r); save(); render(); toast("Revision logged") } };
$("reset").onclick = () => { S = { tasks: [], log: [], rev: [] }; save(); render(); toast("All data cleared") };

// timer: the highlighter sweeps across the digits as time passes
let total = 1500, left = 1500, end = 0, tick = null;
const fmt = s => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(Math.ceil(s % 60) % 60).padStart(2, "0");
const paint = () => { $("clock").textContent = fmt(Math.ceil(left)); $("sweep").style.width = (100 * (1 - left / total)) + "%" };
const setLen = () => { total = left = $("len").value * 60; $("tlab").textContent = "Ready"; paint() };
$("len").onchange = () => { if (!tick) setLen() };
$("go").onclick = () => {
    if (tick) { clearInterval(tick); tick = null; $("go").textContent = "Resume"; $("tlab").textContent = "Paused"; return }
    end = Date.now() + left * 1000; $("go").textContent = "Pause"; $("tlab").textContent = "Focusing on " + ($("tsub").value || "General");
    tick = setInterval(() => {
        left = Math.max(0, (end - Date.now()) / 1000); paint(); document.title = fmt(Math.ceil(left)) + " · Studiq";
        if (left <= 0) { clearInterval(tick); tick = null; S.log.push({ subject: $("tsub").value || "General", min: +$("len").value, date: today() }); save(); render(); setLen(); $("go").textContent = "Start"; document.title = "Studiq"; toast("Session complete. Time logged") }
    }, 250)
};
$("rs").onclick = () => { clearInterval(tick); tick = null; $("go").textContent = "Start"; document.title = "Studiq"; setLen() };
render(); $("qa").oninput(); paint();
