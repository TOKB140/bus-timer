(() => {
  const DEFAULT_DIR = 'home_to_station'; // 春日神社→荻窪駅 を起動時のデフォルトに
  const STATE = {
    timetable: null,
    currentDir: null, // "home_to_station" | "station_to_home"
    tickHandle: null,
  };

  const $ = (id) => document.getElementById(id);

  async function loadTimetable() {
    const res = await fetch('timetable.json?_=' + Date.now());
    if (!res.ok) throw new Error('timetable.json の読み込みに失敗');
    STATE.timetable = await res.json();
    if (STATE.timetable._revisedDate) {
      $('revisedDate').textContent = '改正: ' + STATE.timetable._revisedDate;
    }
    if (STATE.timetable.route && STATE.timetable.viaDescription) {
      $('routeInfo').textContent = `${STATE.timetable.route} ${STATE.timetable.viaDescription}`;
    }
  }

  // 平日 / 土曜 / 日祝 を判定
  function getDayType(date) {
    const day = date.getDay(); // 0=日, 6=土
    const ymd = formatYMD(date);
    if (STATE.timetable.holidays && STATE.timetable.holidays.includes(ymd)) {
      return 'holiday';
    }
    if (day === 0) return 'holiday';
    if (day === 6) return 'saturday';
    return 'weekday';
  }

  function dayTypeLabel(t) {
    return { weekday: '平日', saturday: '土曜', holiday: '日祝' }[t] || t;
  }

  function formatYMD(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatHM(date) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  function parseHMtoMinutes(hm) {
    const [h, m] = hm.split(':').map(Number);
    return h * 60 + m;
  }

  // 当日と翌日（深夜の繰越用）の時刻表から、現在以降の上位N本を取り出す
  function getUpcoming(now, dir, n = 3) {
    const today = new Date(now);
    const todayType = getDayType(today);
    const todayTimes = STATE.timetable.directions[dir][todayType] || [];
    const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

    const results = [];
    for (const hm of todayTimes) {
      const t = parseHMtoMinutes(hm);
      if (t >= nowMin) {
        results.push({ hm, atDate: setHM(today, hm) });
        if (results.length >= n) return results;
      }
    }
    // 当日分が足りなければ翌日から補充
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowType = getDayType(tomorrow);
    const tomorrowTimes = STATE.timetable.directions[dir][tomorrowType] || [];
    for (const hm of tomorrowTimes) {
      results.push({ hm, atDate: setHM(tomorrow, hm) });
      if (results.length >= n) return results;
    }
    return results;
  }

  function setHM(baseDate, hm) {
    const [h, m] = hm.split(':').map(Number);
    const d = new Date(baseDate);
    d.setHours(h, m, 0, 0);
    return d;
  }

  function diffMinutesCeil(future, now) {
    const diffMs = future - now;
    return Math.max(0, Math.ceil(diffMs / 60000));
  }

  function setDirection(dir) {
    STATE.currentDir = dir;
    document.querySelectorAll('.dir-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.dir === dir);
    });
    render();
  }

  function render() {
    const now = new Date();
    $('now').textContent = formatHM(now);
    const dt = getDayType(now);
    $('dayType').textContent = dayTypeLabel(dt);

    const dir = STATE.currentDir;
    const upcoming = getUpcoming(now, dir, 3);
    const nextBox = document.querySelector('.next-bus');
    nextBox.classList.remove('warn', 'done');

    if (upcoming.length === 0) {
      $('count1').textContent = '—';
      $('time1').textContent = '本日終了';
      $('count2').textContent = '—'; $('time2').textContent = '--:--';
      $('count3').textContent = '—'; $('time3').textContent = '--:--';
      return;
    }

    const m1 = diffMinutesCeil(upcoming[0].atDate, now);
    $('count1').textContent = m1;
    $('time1').textContent = upcoming[0].hm;
    if (m1 <= 3) nextBox.classList.add('warn');

    if (upcoming[1]) {
      $('count2').textContent = diffMinutesCeil(upcoming[1].atDate, now);
      $('time2').textContent = upcoming[1].hm;
    } else {
      $('count2').textContent = '—'; $('time2').textContent = '--:--';
    }
    if (upcoming[2]) {
      $('count3').textContent = diffMinutesCeil(upcoming[2].atDate, now);
      $('time3').textContent = upcoming[2].hm;
    } else {
      $('count3').textContent = '—'; $('time3').textContent = '--:--';
    }
  }

  function startTicker() {
    if (STATE.tickHandle) clearInterval(STATE.tickHandle);
    // 毎秒は重いので10秒間隔。"分後"表示には十分。
    STATE.tickHandle = setInterval(render, 10000);
  }

  // 画面復帰時に即時更新（スリープ復帰後など）
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) render();
  });

  // 方向ボタン
  document.querySelectorAll('.dir-btn').forEach(btn => {
    btn.addEventListener('click', () => setDirection(btn.dataset.dir));
  });

  // 再読み込み
  $('reloadBtn').addEventListener('click', async () => {
    await loadTimetable();
    setDirection(DEFAULT_DIR);
  });

  // PWA service worker 登録
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }

  // 起動
  (async () => {
    try {
      await loadTimetable();
      setDirection(DEFAULT_DIR);
      startTicker();
    } catch (e) {
      $('time1').textContent = 'データ読込失敗';
      console.error(e);
    }
  })();
})();
