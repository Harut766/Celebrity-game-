// Панель стримера «Гонки Наций»: управление раундом, симулятор, уровни, лог подарков.
(function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) }).then(r => r.json());
  const flag = id => `<img class="flag" src="${window.RaceArt.flagUrl(id, 28, 19)}" alt="">`;
  const POWER = { nitro: 'dash', turbo: 'dash', shield: 'shieldSec', rocket: 'knockback', super: 'knockback', chaos: 'spinSec', legend: 'dash' };
  let data = null, formFilled = false;

  async function load() {
    try { data = await (await fetch('/api/race/panel')).json(); } catch { return; }
    const s = data.settings, snap = data.snapshot;
    const phase = { countdown: 'отсчёт', running: 'гонка', finished: 'финиш' }[snap.phase] || snap.phase;
    $('race').textContent = `Раунд ${snap.round} · ${phase}${snap.paused ? ' (пауза)' : ''} · ${Math.ceil(snap.timeLeft)} с · игроков ${data.teams}${data.pending ? ` · ждут старта: ${data.pending}` : ''}${data.active ? '' : ' · ⚠ в config.json не выбрана игра race'}`;
    if (!formFilled) fillForm(s);
    renderCountries(s, data.people);
    renderLog(data.gifts);
  }
  async function loadStatus() {
    try {
      const st = await (await fetch('/api/race/status')).json();
      $('conn').textContent = `TikTok: ${st.message}`;
      $('conn').className = st.connected ? 'ok' : '';
    } catch {}
  }

  function fillForm(s) {
    formFilled = true;
    $('roundSec').value = s.roundSec; $('finalSec').value = s.finalSec;
    $('autoNext').checked = s.autoNextRound !== false; $('dragonOn').checked = s.dragon?.enabled !== false;
    $('volMaster').value = s.volume?.master ?? .9; $('volMusic').value = s.volume?.music ?? .35; $('tts').checked = !!s.tts;
    $('simCountry').innerHTML = '<option value="">— нет (уйдёт последнему)</option>' + s.countries.map(c => `<option value="${c.id}">${c.flag} ${esc(c.name)}</option>`).join('');
    $('quick').innerHTML = s.tiers.map(t => `<button data-coins="${t.min}">${t.icon} ${t.min}</button>`).join('');
    $('tiers').querySelector('tbody').innerHTML = s.tiers.map(t => `<tr data-id="${t.id}"><td>${t.icon}</td><td>${esc(t.name)}</td>
      <td><input type="number" min="1" data-k="min" value="${t.min}"></td><td><input type="number" min="1" data-k="${POWER[t.id] || 'dash'}" value="${t[POWER[t.id] || 'dash'] ?? ''}"></td></tr>`).join('');
  }

  function renderCountries(s, people) {
    const wins = people.wins || {}, counts = people.counts || {}, caps = people.captains || {};
    $('countries').querySelector('tbody').innerHTML = s.countries.map(c => `<tr><td>${flag(c.id)} <b>${esc(c.name)}</b> <span class="muted">${c.aliases.join(', ')}</span></td>
      <td>👥 ${counts[c.id] || 0}</td><td>🏆 ${wins[c.id] || 0}</td><td>${caps[c.id] ? `👑 ${esc(caps[c.id].name)}` : ''}</td></tr>`).join('');
  }

  let logKey = '';
  function renderLog(list) {
    const key = list.length + (list.at(-1)?.time || '');
    if (key === logKey) return;
    logKey = key;
    $('log').querySelector('tbody').innerHTML = list.slice().reverse().map(g => `<tr class="${g.sim ? 'sim' : ''}"><td>${esc(g.time)}</td>
      <td>${esc(g.user)}${g.login && !g.sim ? ` <span class="muted">@${esc(g.login)}</span>` : ''}${g.sim ? ' <span class="pill">тест</span>' : ''}</td>
      <td>${esc(g.gift)}</td><td>${g.coins}</td><td>${g.country ? flag(g.country) : ''}</td><td>${esc(g.tier)}</td></tr>`).join('');
  }

  document.addEventListener('click', async e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.act) {
      if (b.dataset.act === 'resetDay' && !confirm('Обнулить победы и топ дня?')) return;
      await post('/api/race/control', { action: b.dataset.act });
    } else if (b.dataset.sim || b.dataset.coins) {
      const kind = b.dataset.sim || 'gift';
      const coins = b.dataset.coins || $('simCoins').value;
      await post('/api/race/sim', { kind, user: $('simUser').value || 'Nar', country: $('simCountry').value, coins, count: 30, text: $('simText').value });
    } else if (b.id === 'stress') {
      await post('/api/race/stress', { count: 50, sec: 10 });
    } else if (b.id === 'saveSettings') {
      await post('/api/race/settings', {
        roundSec: +$('roundSec').value, finalSec: +$('finalSec').value, autoNextRound: $('autoNext').checked,
        dragon: { enabled: $('dragonOn').checked }, volume: { master: +$('volMaster').value, music: +$('volMusic').value }, tts: $('tts').checked,
      });
      b.textContent = '✓ Сохранено'; setTimeout(() => { b.textContent = '💾 Сохранить'; }, 1500);
    } else if (b.id === 'saveTiers') {
      const tiers = data.settings.tiers.map(t => {
        const row = document.querySelector(`#tiers tr[data-id="${t.id}"]`);
        const out = { ...t };
        row.querySelectorAll('input').forEach(i => { out[i.dataset.k] = Number(i.value) || out[i.dataset.k]; });
        return out;
      });
      await post('/api/race/settings', { tiers });
      formFilled = false;
      b.textContent = '✓ Сохранено'; setTimeout(() => { b.textContent = '💾 Сохранить уровни'; }, 1500);
    }
    load();
  });

  load(); loadStatus();
  setInterval(load, 1500);
  setInterval(loadStatus, 3000);
})();
