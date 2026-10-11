/* Phase 28 sketches : moteur commun (HTML + JS à plat, pas de build). Tuiles réelles de la Géoplateforme, forêt de Fontainebleau, zoom 15. */
(function () {
  const ICON = {
    layers: '<path d="M12 3 3 8l9 5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/>',
    map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2Z"/><path d="M9 4v14M15 6v14"/>',
    earth: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5Z"/>',
    doc: '<path d="M7 3h7l4 4v14H7Z"/><path d="M14 3v4h4M9.5 12h6M9.5 16h6"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v12H4Z"/><circle cx="12" cy="13.5" r="3.5"/>',
    leaf: '<path d="M5 19c0-9 5-14 15-14 0 10-5 15-14 15"/><path d="M5 19c3-5 6-8 10-10"/>',
    swap: '<path d="M4 8h15m-4-4 4 4-4 4M20 16H5m4-4-4 4 4 4"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    dl: '<path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 10a4 4 0 0 1-.5 8"/><path d="M12 12v8m-3-3 3 3 3-3"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.2v.3"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.6v.3"/>',
    time: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    cloudoff: '<path d="M7 18a4.5 4.5 0 0 1-.5-9 6 6 0 0 1 4-3.5M18 10a4 4 0 0 1-.5 8H9"/><path d="M4 4l16 16"/>',
    chev: '<path d="m9 5 7 7-7 7"/>',
    locate: '<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="1.6"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    radioOn: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5" fill="currentColor" stroke="none"/>',
    radioOff: '<circle cx="12" cy="12" r="8.5"/>',
  };
  const ic = (n, s) =>
    `<svg width="${s || 20}" height="${s || 20}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICON[n]}</svg>`;

  const TILE = { map: ["plan", "png"], satellite: ["ortho", "jpg"], etat: ["etat", "jpg"], c1950: ["c1950", "jpg"], p1950: ["p1950", "png"] };
  const L = {
    map: { name: "Plan", short: "Plan", year: "Aujourd'hui", glyph: "map", vintage: "Mis à jour régulièrement.", src: "Plan : données mises à jour régulièrement par l'IGN.", max: 19 },
    satellite: { name: "Satellite", short: "Satellite", year: "Aujourd'hui", glyph: "earth", vintage: "Photographies aériennes récentes.", src: "Satellite : photographies aériennes récentes, millésime variable selon le département.", max: 18 },
    etat: { name: "Carte d'état-major (1820-1866)", short: "État-major", year: "1820-1866", glyph: "compass", vintage: "Levés de 1825 à 1866, mises à jour jusqu'en 1889.", cov: "Couvre la France métropolitaine.", src: "Carte d'état-major : levés de 1825 à 1866, mises à jour jusqu'en 1889.", max: 15, cad: 0.7, extra: true },
    c1950: { name: "Carte de 1950", short: "Carte 1950", year: "vers 1950", glyph: "doc", vintage: "Cartes au 1 : 50 000, dernière édition disponible vers 1959.", cov: "Couvre la France métropolitaine et la plupart des territoires d'outre-mer.", src: "Carte de 1950 : cartes au 1 : 50 000, dernière édition disponible vers 1959.", max: 15, cad: 0.7, extra: true },
    p1950: { name: "Photos aériennes (1950-1965)", short: "Photos 1950", year: "1950-1965", glyph: "camera", vintage: "Prises de vues de 1950 à 1965, en niveaux de gris.", cov: "Couvre la France métropolitaine et la plupart des territoires d'outre-mer.", src: "Photos aériennes : prises de vues de 1950 à 1965, en niveaux de gris.", max: 18, offMax: 17, extra: true },
  };
  const BASES = ["map", "satellite", "etat", "c1950", "p1950"];
  const FOREST = { name: "Types de forêt", glyph: "leaf", vintage: "Inventaire de 2007 à 2018, millésime variable selon le département. Peuplements de 0,5 ha au moins.", cov: "Couvre la France métropolitaine.", max: 16, extra: true };
  const SRC_COMMON = "© Institut national de l'information géographique et forestière (IGN), Géoplateforme, Licence Ouverte. Carte : MapLibre.";

  // Téléchargement : paquets en séquence, poids estimés en Mo (zone de 4 km sur 4 km, photos 1950 plafonnées au zoom 17 hors ligne)
  const PACKS = [
    { n: "Plan et cadastre", mb: 18, base: true },
    { n: "Satellite", mb: 35, base: true },
    { n: "Carte d'état-major (1820-1866)", mb: 1 },
    { n: "Carte de 1950", mb: 1 },
    { n: "Photos aériennes (1950-1965)", mb: 28 },
    { n: "Types de forêt", mb: 1 },
  ];
  const shared = { policy: "all", subs: [] };
  const LK = (window.LK = { ic, L, shared });
  LK.setPolicy = (p) => { shared.policy = p; shared.subs.forEach((f) => f()); };

  const W = 375, H = 780, TOPN = 62;
  const lay = (key, cls, op) => {
    const [t, e] = key; let h = "";
    for (let ci = 0; ci < 2; ci++) for (let ri = 0; ri < 3; ri++) h += `<img src="../map-layers-tiles/${t}-${16628 + ci}-${11334 + ri}.${e}" style="left:${ci * 256}px;top:${ri * 256}px" draggable="false">`;
    return `<div class="lay ${cls}" style="opacity:${op}">${h}</div>`;
  };
  const POLY = [
    ["190,330 262,318 280,380 205,396", "#5f9a34", "high"],
    ["262,318 340,312 352,372 280,380", "#d9a032", "mid", true],
    ["205,396 280,380 292,452 214,466", "#cd5833", "low"],
    ["280,380 352,372 366,440 292,452", "none", "none"],
    ["120,300 190,330 205,396 130,380", "#5f9a34", "high"],
    ["340,312 410,330 420,392 352,372", "#d9a032", "mid"],
  ];
  const parcels = (casing, mode, light) => {
    if (mode === "none") return "";
    const set = mode === "ibp" ? POLY.filter((p) => p[1] !== "none") : POLY;
    let h = '<svg viewBox="0 0 512 768">';
    if (casing) set.forEach((p) => (h += `<polygon points="${p[0]}" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="6" vector-effect="non-scaling-stroke"/>`));
    set.forEach((p) => (h += `<polygon points="${p[0]}" fill="${p[1] === "none" ? "rgba(255,255,255,.06)" : p[1]}" fill-opacity="${light ? 0.2 : 0.38}" stroke="${p[3] ? "#1d2a17" : p[1] === "none" ? "#5b6a52" : p[1]}" stroke-width="${p[3] ? 3 : 1.6}" vector-effect="non-scaling-stroke"/>`));
    return h + "</svg>";
  };
  const worldHTML = (base, overlay, mode) => {
    mode = mode || "all";
    const old = base === "etat" || base === "c1950";
    const casing = old || base === "p1950" || overlay;
    let h = lay(TILE[base], "base-" + base, 1);
    if (overlay) h += lay(["foret", "png"], "ov", 0.55);
    if (mode === "all") h += lay(["cad", "png"], "cad", L[base].cad || 0.9);
    return h + parcels(casing, mode, old);
  };

  LK.createApp = function (root, cfg) {
    cfg = Object.assign({ entry: "capsule", tags: "spec", chip: "left", id: "a" }, cfg || {});
    const S = {};
    let tm = null, dlTimer = null, hideTm = null, dlDoneTm = null;
    const reset = () => {
      clearInterval(dlTimer); clearTimeout(hideTm); clearTimeout(dlDoneTm);
      Object.assign(S, { sw: false, lock: false, chooser: null, parcels: "all", panel: null, base: "map", saved: "map", overlay: false, compare: false, sideA: "map", sideB: "p1950", target: "right", z: 15, cx: 256, cy: 384, offline: false, covered: true, err: null, hidPill: false, x: W / 2, seg: "explore", leaving: false, entering: false, dl: { st: "idle", pct: 0, scen: "ok" }, dlPanelOpened: false });
    };
    reset();
        root.innerHTML = `<div class="phone" style="width:${W}px;height:${H}px">
      <div class="mapwrap"><div class="stack"><div class="world" data-w="a"></div></div><div class="clipb"><div class="stack"><div class="world" data-w="b"></div></div></div><div class="clipc" style="position:absolute;inset:0;display:none;z-index:2"><div class="stack"><div class="world" data-w="c"></div></div></div><div class="mks"></div>
        <div class="handle"></div></div>
      <div class="tagl"></div><div class="lockui"></div>
      <div class="status"><span>9:41</span><span>5G ▮▮▮</span></div>
      <div class="exit"></div><div class="notices"></div><div class="capsule glass"></div><div class="locate glass"></div><div class="ovbtn glass" data-act="ovbtn" style="display:none"></div><div class="chooser-w"></div><div class="chipw"></div><div class="barp"></div>
      <div class="sheet" style="display:none"></div>
      <div class="tb"><div>Accueil</div><div>Mes relevés</div><div class="on">Explorer</div><div>Rechercher</div></div><div class="homebar"></div></div>`;
    const $ = (s) => root.querySelector(s);
    const phone = $(".phone"), wa = $('[data-w="a"]'), wb = $('[data-w="b"]'), wc = $('[data-w="c"]'), clipc = $(".clipc"), clipb = $(".clipb"), handle = $(".handle"), mks = $(".mks"), capsule = $(".capsule"), locate = $(".locate");
    const mapwrapEl = () => $(".mapwrap"); const lockui = $(".lockui"); const chooserW = $(".chooser-w"); const notices = $(".notices"), exitEl = $(".exit"), chipw = $(".chipw"), sheet = $(".sheet"), tagl = $(".tagl"), barp = $(".barp");
    let key = "";

    const avail = (k) => {
      if (!S.offline) return true;
      if (k === "map" || k === "satellite") return true;
      return S.covered && shared.policy === "all";
    };
    const shown = () => (S.compare ? [S.sideA, S.sideB] : [S.base]);
    const dotOn = () => S.base !== S.saved || S.overlay || S.compare || S.parcels !== "all";
    const scale = () => 1.02 * Math.pow(2, S.z - 15);
    const clampView = () => {
      const s = scale(), hw = W / 2 / s, hh = H / 2 / s;
      S.cx = Math.min(Math.max(S.cx, hw), 512 - hw); S.cy = Math.min(Math.max(S.cy, hh), Math.max(hh, 768 - hh));
      if (hh >= 384) S.cy = 384;
    };
    const place = () => {
      clampView();
      const s = scale(), tr = `translate(${W / 2 - S.cx * s}px,${H / 2 - S.cy * s}px) scale(${s})`;
      wa.style.transform = tr; wb.style.transform = tr; wc.style.transform = tr;
      let h = "";
      [[235, 360, "3"], [250, 425, "1"], [372, 345, "2"], [160, 345, "4"]].forEach((m) => {
        const x = W / 2 + (m[0] - S.cx) * s, y = H / 2 + (m[1] - S.cy) * s;
        h += `<div class="mk ${m[2] === "1" ? "s" : ""}" style="left:${x}px;top:${y}px">${m[2] === "1" ? "" : m[2]}</div>`;
      });
      mks.innerHTML = S.compare ? "" : h;
    };
    const buildMaps = () => {
      const k = [S.compare, S.compare ? S.sideA : S.base, S.sideB, S.overlay, S.parcels].join("|");
      if (k === key) return; key = k;
      wa.innerHTML = worldHTML(S.compare ? S.sideA : S.base, S.overlay, S.parcels);
      wb.innerHTML = S.compare ? worldHTML(S.sideB, S.overlay, S.parcels) : "";
    };
    const place2 = () => { place(); };

    // ---- rideau ----
    const curtainR = () => {
      clipb.style.display = S.compare ? "block" : "none"; handle.style.display = S.compare ? "block" : "none"; tagl.style.display = S.compare ? "block" : "none";
      if (!S.compare) { tagl.innerHTML = ""; return; }
      clipb.style.clipPath = `inset(0 0 0 ${S.x}px)`; handle.style.left = S.x + "px";
      const kt = cfg.tags === "mid" ? Math.round(H * 0.5) : Math.round(H * 0.32);
      const knobHTML = cfg.tags === "dates" ? `<div class="grab" style="top:${kt}px"><i></i></div>` : `<div class="knob glass" style="top:${kt}px">${ic("swap", 22)}</div>`;
      handle.innerHTML = `<div class="hl"></div>${knobHTML}`;
      const A = L[S.sideA], B = L[S.sideB];
      const off = (k) => (S.offline && !avail(k) ? ic("cloudoff", 14) : "");
      let t = "";
      if (cfg.tags === "mid") {
        const bot = 84 + 14;
        t = `<div class="tag glass" style="left:14px;bottom:${bot}px">${off(S.sideA)}${A.short}</div><div class="tag glass" style="right:14px;bottom:${bot}px">${off(S.sideB)}${B.short}</div>`;
      } else {
        const topY = kt - (cfg.tags === "dates" ? 22 : 16);
        const gap = cfg.tags === "dates" ? 16 : 30; const wl = S.x - gap - 14, wr = W - S.x - gap - 14;
        const two = cfg.tags === "dates" ? " two" : "";
        const body = (X) => (cfg.tags === "dates" ? `<span>${off(X === "l" ? S.sideA : S.sideB)}${(X === "l" ? A : B).short}</span><small>${(X === "l" ? A : B).year}</small>` : `${off(X === "l" ? S.sideA : S.sideB)}${(X === "l" ? A : B).short}`);
        t = `<div class="tag glass nt${two}" style="top:${topY}px;right:${W - S.x + gap}px;max-width:${Math.max(wl, 0)}px;opacity:${wl < 72 ? 0 : 1}">${body("l")}</div>
             <div class="tag glass nt${two}" style="top:${topY}px;left:${S.x + gap}px;max-width:${Math.max(wr, 0)}px;opacity:${wr < 72 ? 0 : 1}">${body("r")}</div>`;
      }
      if (S.lock && cfg.cmpMode === "swipe") {
        const pg = (cx, k) => `<div class="pager glass" style="left:${cx}px;top:${Math.round(H * 0.42)}px"><span>‹</span>${BASES.map((b) => `<i class="${b === k ? "on" : ""}"></i>`).join("")}<span>›</span></div>`;
        t += pg(S.x / 2, S.sideA) + pg((W + S.x) / 2, S.sideB);
      }
      tagl.innerHTML = t;
    };
    const enterCompare = () => {
      S.compare = true; S.leaving = false; S.x = W; clipb.classList.add("nt"); handle.classList.add("nt"); render();
      requestAnimationFrame(() => requestAnimationFrame(() => { clipb.classList.remove("nt"); handle.classList.remove("nt"); S.x = W / 2; curtainR(); }));
      S.hidPill = true; clearTimeout(hideTm); hideTm = setTimeout(() => { S.hidPill = false; render(); }, 4000);
    };
    const leaveCompare = () => {
      if (!S.compare) return; S.leaving = true; S.x = W; clipb.classList.remove("nt"); handle.classList.remove("nt"); curtainR();
      setTimeout(() => { S.compare = false; S.base = S.sideA; S.leaving = false; S.hidPill = false; render(); }, 250);
    };
    // glisser la poignée
    let dragH = false, dragM = null;
    handle.addEventListener("pointerdown", (e) => { dragH = true; handle.setPointerCapture(e.pointerId); clipb.classList.add("nt"); handle.classList.add("nt"); e.stopPropagation(); });
    handle.addEventListener("pointermove", (e) => { if (!dragH) return; const r = phone.getBoundingClientRect(); S.x = Math.min(Math.max(e.clientX - r.left, 22), W - 22); curtainR(); });
    handle.addEventListener("pointerup", () => { dragH = false; if (cfg.swipe && S.compare) { if (S.x < 40) { S.base = S.sideB; S.compare = false; render(); } else if (S.x > W - 40) { S.base = S.sideA; S.compare = false; render(); } } });
    // déplacer la carte
    $(".mapwrap").addEventListener("pointerdown", (e) => { if (e.target.closest(".handle")) return; if ((S.lock && cfg.cmpMode === "swipe") || lockedBase()) { swp = { x0: e.clientX, y0: e.clientY, base: lockedBase() }; return; }
      if (cfg.entry === "keep" && S.chooser && !(cfg.chooser === "card" && S.chooser === "base" && S.compare)) { S.chooser = null; chooserR(); } dragM = { x: e.clientX, y: e.clientY }; });
    let swp = null;
    window.addEventListener("pointerup", (e) => {
      if (!swp) return; const g = swp; swp = null; const dx = e.clientX - g.x0;
      if (g.base) {
        const r0 = phone.getBoundingClientRect(); const dir = dx < 0 ? 1 : -1;
        if (cfg.baseMode === "wipe" && g.wk) {
          const commit = Math.abs(dx) > W * 0.28; clipb.classList.remove("nt");
          if (commit) { clipb.style.clipPath = "inset(0 0 0 0)"; setTimeout(() => { setBase(g.wk); S.wipe = null; clipb.style.display = "none"; render(); }, 380); }
          else { clipb.style.clipPath = dx < 0 ? `inset(0 0 0 ${W}px)` : `inset(0 ${W}px 0 0)`; setTimeout(() => { clipb.style.display = "none"; wb.innerHTML = ""; key = ""; S.wipe = null; render(); }, 380); }
          return;
        }
        if (cfg.baseMode === "swipe" && Math.abs(dx) > 36) { setBase(neighbor(S.base, dir)); render(); }
        if (Math.abs(dx) < 6 && Math.abs(e.clientY - g.y0) < 6) { S.chooser = null; render(); }
        return;
      }
      if (Math.abs(dx) < 36 || Math.abs(e.clientY - g.y0) > 80) return;
      const r = phone.getBoundingClientRect(), side = g.x0 - r.left < S.x ? "left" : "right", other = side === "left" ? S.sideB : S.sideA, cur = side === "left" ? S.sideA : S.sideB;
      const list = BASES.filter((k) => avail(k) && k !== other); let i = list.indexOf(cur); i = (i + (dx < 0 ? 1 : -1) + list.length) % list.length;
      assign(list[i], side); render();
    });
    window.addEventListener("pointermove", (e) => {
      if (!swp || !swp.base || cfg.baseMode !== "wipe") return;
      const r = phone.getBoundingClientRect(), dx = e.clientX - swp.x0; if (Math.abs(dx) < 6) return;
      const fx = Math.min(Math.max(e.clientX - r.left, 0), W), k = neighbor(S.base, dx < 0 ? 1 : -1); swp.wk = k; S.wipe = { k };
      if (swp.cur !== k) { swp.cur = k; wb.innerHTML = worldHTML(k, S.overlay, S.parcels); place(); }
      clipb.style.display = "block"; clipb.classList.add("nt");
      clipb.style.clipPath = dx < 0 ? `inset(0 0 0 ${fx}px)` : `inset(0 ${W - fx}px 0 0)`;
      lockui.innerHTML = `<div class="lkp glass"><b>${L[k].name.replace(/ \(.*\)/, "")}</b><small>${L[k].year}</small></div>`;
    });
    window.addEventListener("pointermove", (e) => { if (!dragM) return; const s = scale(); S.cx -= (e.clientX - dragM.x) / s; S.cy -= (e.clientY - dragM.y) / s; dragM = { x: e.clientX, y: e.clientY }; place(); });
    window.addEventListener("pointerup", () => { dragM = null; });
    $(".mapwrap").addEventListener("wheel", (e) => { e.preventDefault(); zoom(e.deltaY < 0 ? 1 : -1); }, { passive: false });
    const zoom = (d) => { S.z = Math.min(17, Math.max(15, S.z + d)); render(); };


    // glisser un fond sur la carte (mode drag)
    let gd = null;
    root.addEventListener("pointerdown", (e) => {
      const t = e.target.closest('[data-drag="1"]'); if (!t || cfg.cmpMode !== "drag" || !S.compare) return;
      gd = { k: t.dataset.k, x0: e.clientX, y0: e.clientY, on: false, el: null };
    });
    window.addEventListener("pointermove", (e) => {
      if (!gd) return; const r = phone.getBoundingClientRect();
      if (!gd.on && Math.hypot(e.clientX - gd.x0, e.clientY - gd.y0) > 8) {
        gd.on = true; gd.el = document.createElement("div"); gd.el.className = "ghost"; const tt = TILE[gd.k]; gd.el.style.backgroundImage = `url(../map-layers-tiles/${tt[0]}-16629-11335.${tt[1]})`; phone.appendChild(gd.el);
        gd.dz = document.createElement("div"); gd.dz.className = "dz"; gd.dz.innerHTML = `<div class="dzl">Gauche</div><div class="dzr">Droite</div>`; gd.dz.style.cssText = ""; phone.appendChild(gd.dz);
      }
      if (gd.on) { const px = e.clientX - r.left, py = e.clientY - r.top; gd.el.style.left = px - 32 + "px"; gd.el.style.top = py - 32 + "px"; const side = px < S.x ? "left" : "right"; gd.dz.dataset.side = side; gd.dz.style.display = py < H - 230 ? "flex" : "none"; gd.dz.children[0].style.opacity = side === "left" ? 1 : 0.35; gd.dz.children[1].style.opacity = side === "right" ? 1 : 0.35; gd.dz.children[0].style.width = S.x + "px"; gd.dz.children[1].style.width = W - S.x + "px"; }
    });
    window.addEventListener("pointerup", (e) => {
      if (!gd) return; const g = gd; gd = null;
      if (!g.on) return;
      const r = phone.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      g.el.remove(); g.dz.remove(); window.__dragged = true; setTimeout(() => (window.__dragged = false), 50);
      if (py < H - 230 && avail(g.k)) { assign(g.k, px < S.x ? "left" : "right"); render(); }
    });

    // ---- moteur balayage (sketch 022) ----
    let swTm = null, swg = null;
    const swBounds = (side) => (side === "left" ? [0, S.x] : side === "right" ? [S.x, W] : [0, W]);
    const swLayer = (side) => (side === "left" ? S.sideA : side === "right" ? S.sideB : S.base);
    const swOther = (side) => (side === "left" ? S.sideB : side === "right" ? S.sideA : null);
    const swNeighbor = (side, dir) => { const other = swOther(side); const l = BASES.filter((b) => avail(b) && b !== other); const i = Math.max(0, l.indexOf(swLayer(side))); return l[(i + dir + l.length) % l.length]; };
    const swClip = (a, b, dx, fx) => { const l = dx < 0 ? Math.max(fx, a) : a, r = dx < 0 ? b : Math.min(fx, b); return `inset(0 ${W - r}px 0 ${l}px)`; };
    const swR = () => {
      if (!cfg.swipe) return;
      lockui.classList.toggle("cmp", !!S.compare);
      if (!S.sw) { if (!(swg && swg.k)) lockui.innerHTML = ""; return; }
      const both = cfg.swipe.cmp === "button" || cfg.swipe.cmp === "both";
      let h = "";
      if (!S.compare) {
        const l = L[S.base];
        h += `<div class="lkp glass"><span>‹</span><b>${l.name.replace(/ \(.*\)/, "")}</b><small>${l.year}</small><span>›</span></div><div class="lkd">${BASES.map((b) => `<i class="${b === S.base ? "on" : ""}"></i>`).join("")}</div>`;
        h += `<div class="lkh">${cfg.swipe.cmp === "button" ? "Glissez sur la carte pour changer de fond" : "Glissez. Lâchez au milieu pour comparer"}</div><div style="display:flex;gap:8px"><div class="pill glass tap lkdone" data-act="swdone">Terminé</div>${both ? `<div class="pill glass tap lkdone" data-act="swcmp">${ic("swap", 16)}Comparer</div>` : ""}</div>`;
      } else {
        h += `<div class="lkh">Glissez sur un côté pour changer son fond</div><div class="lkh" style="margin-top:0">Tirez la ligne au bord pour quitter</div><div class="pill glass tap lkdone" data-act="swdone">Terminé</div>`;
      }
      lockui.innerHTML = h;
      clearTimeout(swTm); swTm = setTimeout(() => { if (S.sw && !swg) { S.sw = false; render(); } }, 8000);
    };
    mapwrapEl().addEventListener("pointerdown", (e) => {
      if (!cfg.swipe || !S.sw || e.target.closest(".handle")) return;
      e.stopImmediatePropagation(); const r = phone.getBoundingClientRect(), x = e.clientX - r.left;
      swg = { x0: e.clientX, y0: e.clientY, side: S.compare ? (x < S.x ? "left" : "right") : "full", k: null, dx: 0 };
    }, true);
    window.addEventListener("pointermove", (e) => {
      if (!swg) return; const dx = e.clientX - swg.x0; if (Math.abs(dx) < 6) return;
      const r = phone.getBoundingClientRect(), [a, b] = swBounds(swg.side), fx = Math.min(Math.max(e.clientX - r.left, a), b);
      const k = swNeighbor(swg.side, dx < 0 ? 1 : -1); swg.dx = dx; swg.fx = fx;
      if (swg.k !== k) { swg.k = k; wc.innerHTML = worldHTML(k, S.overlay, S.parcels); place(); }
      clipc.style.display = "block"; clipc.style.transition = "none"; clipc.style.clipPath = swClip(a, b, dx, fx);
      const rev = dx < 0 ? (b - fx) / (b - a) : (fx - a) / (b - a); swg.rev = rev;
      let msg = "Lâchez pour changer de fond";
      if (swg.side === "full" && cfg.swipe.cmp !== "button" && rev > 0.2 && rev < 0.8) msg = "Lâchez pour comparer";
      lockui.innerHTML = `<div class="lkp glass"><b>${L[k].name.replace(/ \(.*\)/, "")}</b><small>${L[k].year}</small></div><div class="lkh">${msg}</div>`;
    });
    window.addEventListener("pointerup", (e) => {
      if (!swg) return; const g = swg; swg = null;
      if (!g.k) { if (Math.abs(e.clientX - g.x0) < 6 && Math.abs(e.clientY - g.y0) < 6 && !S.compare) { S.sw = false; } render(); return; }
      const [a, b] = swBounds(g.side), dx = g.dx, rev = g.rev;
      const toCmp = g.side === "full" && cfg.swipe.cmp !== "button" && rev >= 0.2 && rev <= 0.8;
      const commit = !toCmp && rev > (g.side === "full" && cfg.swipe.cmp !== "button" ? 0.8 : 0.33);
      clipc.style.transition = "clip-path .22s ease";
      const done = () => { clipc.style.display = "none"; wc.innerHTML = ""; clipc.style.transition = "none"; };
      if (toCmp) {
        const fx = g.fx;
        if (dx < 0) { S.sideA = S.base; S.sideB = g.k; } else { S.sideA = g.k; S.sideB = S.base; }
        S.compare = true; S.x = fx; key = ""; clipb.classList.add("nt"); handle.classList.add("nt"); done(); render();
        requestAnimationFrame(() => { clipb.classList.remove("nt"); handle.classList.remove("nt"); }); return;
      }
      if (commit) { clipc.style.clipPath = `inset(0 ${W - b}px 0 ${a}px)`; setTimeout(() => { if (g.side === "full") setBase(g.k); else if (g.side === "left") S.sideA = g.k; else S.sideB = g.k; done(); key = ""; render(); }, 240); }
      else { clipc.style.clipPath = dx < 0 ? `inset(0 ${W - b}px 0 ${b}px)` : `inset(0 ${W - a}px 0 ${a}px)`; setTimeout(() => { done(); render(); }, 240); }
    });
    // ---- notices sur la carte ----
    const noticesR = () => {
      let h = "";
      if (S.compare && S.hidPill) h += `<div class="pill glass fade">Les relevés sont masqués pendant la comparaison.</div>`;
      shown().forEach((k) => { if (!avail(k)) h += `<div class="pill glass fade">${ic("cloudoff", 16)}${L[k].name} n'est pas téléchargée pour cette zone.</div>`; });
      if (S.overlay && S.offline && !avail("foret")) h += `<div class="pill glass fade">${ic("cloudoff", 16)}Types de forêt n'est pas téléchargée pour cette zone.</div>`;
      if (S.err === "cover") h += `<div class="pill glass fade">${ic("alert", 16)}Carte d'état-major ne couvre pas cette zone.</div>`;
      if (S.err === "load") h += `<div class="pill glass fade">${ic("alert", 16)}Impossible d'afficher ${L[S.compare ? S.sideB : S.base].name}. <a data-act="retry">Réessayer</a></div>`;
      let over = null;
      shown().forEach((k) => { const mx = S.offline && L[k].offMax ? L[k].offMax : L[k].max; if (S.z >= mx + 1) over = "base"; });
      if (!over && S.overlay && S.z >= FOREST.max + 1) over = "ov";
      if (over) h += `<div class="pill glass fade">${ic("info", 16)}${over === "base" ? "Fond peu détaillé à cette échelle" : "Superposition peu détaillée à cette échelle"}</div>`;
      notices.innerHTML = h;
    };

    // ---- capsule, pastilles ----
    const capsuleR = () => {
      const keep = cfg.entry === "keep";
      const second = cfg.entry === "capsule" || (keep && cfg.ov === "capsule"), noSw = cfg.entry === "layers";
      const sw = S.base === "map" ? "earth" : "map";
      let btns = noSw ? "" : `<button class="cbtn ${S.compare ? "off" : ""}" data-act="basemap" title="Changer de fond">${ic(sw, 24)}</button>`;
      if (second) btns += `<button class="cbtn" data-act="${keep ? "ovbtn" : "study"}" title="Superposition">${ic("layers", 24)}${(keep ? ovDot() : dotOn()) ? '<i class="dot"></i>' : ""}</button>`;
      if (keep && !noSw) btns = btns.replace(`title="Changer de fond">${ic(sw, 24)}`, `title="Changer de fond">${ic(sw, 24)}${S.base !== S.saved || S.compare ? '<i class="dot"></i>' : ""}`);
      btns += `<button class="cbtn" data-act="download" title="Télécharger la zone">${ic("dl", 24)}</button>`;
      capsule.innerHTML = btns;
      const n = second ? 3 : noSw ? 1 : 2;
      capsule.style.top = TOPN + "px"; capsule.style.height = n * 50 + (n - 1) + "px";
      if (!keep) locate.style.top = TOPN + n * 50 + (n - 1) + 10 + "px"; locate.innerHTML = ic("locate", 24);
      capsule.dataset.dlIndex = n - 1;
      const ovb = root.querySelector(".ovbtn");
      if (keep) {
        locate.style.top = "auto"; locate.style.bottom = 84 + 14 + (S.panel ? sheet.offsetHeight : 0) + "px";
        if (cfg.ov !== "capsule") { ovb.style.display = "flex"; ovb.style.top = TOPN + n * 50 + (n - 1) + 10 + "px"; ovb.innerHTML = ic("layers", 24) + (ovDot() ? '<i class="dot"></i>' : ""); } else ovb.style.display = "none";
      } else if (ovb) ovb.style.display = "none";
      // pastille « Couches » (variante B)
      let ex = "";
      const dotI = dotOn() ? '<i style="width:8px;height:8px;border-radius:50%;background:var(--moss);display:inline-block"></i>' : "";
      if (keep) ex = S.compare ? `<div class="pill round glass tap" data-act="exit" title="Quitter la comparaison">${ic("close", 20)}</div>` : "";
      else if (cfg.entry === "layers") ex = `<div style="display:flex;gap:8px"><div class="pill glass tap" data-act="study">${ic("layers", 18)}Couches${dotI}</div>${S.compare ? `<div class="pill round glass tap" data-act="exit" title="Quitter la comparaison">${ic("close", 20)}</div>` : ""}</div>`;
      else if (S.compare) ex = `<div class="pill round glass tap" data-act="exit" title="Quitter la comparaison">${ic("close", 20)}</div>`;
      else if (cfg.entry === "pill") ex = `<div class="pill glass tap" data-act="study">${ic("layers", 18)}Couches${dotOn() ? '<i style="width:8px;height:8px;border-radius:50%;background:var(--moss);display:inline-block"></i>' : ""}</div>`;
      exitEl.style.top = TOPN + "px"; exitEl.innerHTML = ex;
    };
    const chipR = () => {
      chipw.innerHTML = ""; barp.innerHTML = "";
      const d = S.dl; const sheetOpenDl = S.panel === "download";
      if (d.st === "idle" || sheetOpenDl) return;
      const txt = d.st === "running" ? `Téléchargement : ${Math.round(d.pct)} %` : d.st === "done" ? "Zone disponible hors connexion" : d.st === "partial" ? "Zone enregistrée, sauf certaines couches" : "Téléchargement échoué";
      const g = d.st === "running" ? "dl" : d.st === "failed" ? "alert" : "check";
      if (d.st === "done" && d.hide) return;
      if (cfg.chip === "bar") {
        if (d.st === "running") barp.innerHTML = `<div style="position:absolute;left:0;right:0;top:46px;height:4px;background:rgba(255,255,255,.55);z-index:19"><div style="width:${d.pct}%;height:100%;background:var(--moss)"></div></div>`;
        return;
      }
      const pill = `<div class="pill glass tap" data-act="chip" ${d.st === "failed" ? 'style="color:var(--ink)"' : ""}>${ic(g, 16)}${txt}</div>`;
      if (cfg.chip === "top") { notices.insertAdjacentHTML("afterbegin", pill); return; }
      const idx = +capsule.dataset.dlIndex; const y = TOPN + idx * 51 + 5;
      chipw.style.top = y + "px"; chipw.style.right = 14 + 50 + 8 + "px"; chipw.innerHTML = pill;
    };

    // ---- feuille ----
    const baseRow = (k) => {
      const l = L[k], ok = avail(k), on = S.compare ? S.sideA === k || S.sideB === k : S.base === k;
      const side = S.compare ? (S.sideA === k ? "Gauche" : S.sideB === k ? "Droite" : "") : "";
      const meta = ok ? l.vintage : "Indisponible hors connexion : zone non téléchargée.";
      const radio = !ok ? ic("cloudoff", 20) : `<span style="display:contents">${ic(on ? "radioOn" : "radioOff", 22)}</span>${side ? `<span>${side}</span>` : ""}`;
      return `<div class="row ${ok ? "" : "dis"}" data-act="base" data-k="${k}"><div class="tile">${ic(l.glyph, 18)}</div><div class="t"><b>${l.name}</b><span>${meta}${ok && l.cov && k !== "map" ? "" : ""}</span></div><div class="r ${on && ok ? "on" : ""}">${radio}</div></div>`;
    };
    const studyHTML = () => {
      let h = "";
      if (S.offline) h += `<div class="notice">${ic("cloudoff", 18)}<span>${S.covered ? "Hors connexion : seules les couches téléchargées pour cette zone sont disponibles." : "Aucune zone téléchargée ici : aucune couche n'est disponible hors connexion à cet endroit."}</span></div>`;
      if (S.err === "load") h += `<div class="notice err">${ic("alert", 18)}<span>Impossible d'afficher ${L[S.compare ? S.sideB : S.base].name}. Vérifiez votre connexion. <a class="lnk" data-act="retry">Réessayer</a> · <a class="lnk" data-act="toplan">Revenir au plan</a></span></div>`;
      if (cfg.entry === "layers") {
        if (!S.compare) h += `<div class="btn ghost" data-act="cmp">${ic("swap", 18)} Comparer deux fonds</div>`;
      } else h += `<div class="row" style="min-height:56px;border:0;padding:0" data-act="cmp"><div class="t"><b>Comparer deux fonds</b></div><div class="sw ${S.compare ? "on" : ""}"></div></div>`;
      if (S.compare) {
        h += `<div class="slots"><div class="slot ${S.target === "left" ? "t" : ""}" data-act="tgt" data-s="left"><small>Côté gauche</small><b>${L[S.sideA].short}</b></div><div class="swapb" data-act="swap" title="Inverser les côtés">${ic("swap", 22)}</div><div class="slot ${S.target === "right" ? "t" : ""}" data-act="tgt" data-s="right"><small>Côté droit</small><b>${L[S.sideB].short}</b></div></div><div class="helper">Touchez un fond pour le placer côté ${S.target === "left" ? "gauche" : "droit"}. Les relevés sont masqués pendant la comparaison.</div>${cfg.entry === "layers" ? `<div class="btn ghost" data-act="cmp">Arrêter la comparaison</div>` : ""}`;
      }
      h += `<div class="sec">Fonds de carte</div><div>${BASES.map(baseRow).join("")}</div>`;
      if (S.offline && S.covered && shared.policy === "base") h += `<div class="helper">Les couches supplémentaires ne sont pas téléchargées avec votre réglage actuel.</div>`;
      h += `<div class="sec">Superposition</div>`;
      const fok = avail("foret");
      h += `<div class="row ${fok ? "" : "dis"}" data-act="ov" style="border:0"><div class="tile">${ic("leaf", 18)}</div><div class="t"><b>${FOREST.name}</b><span>${fok ? FOREST.vintage : "Indisponible hors connexion : zone non téléchargée."}${fok ? " " + FOREST.cov : ""}${S.compare && fok ? " S'applique aux deux côtés de la comparaison." : ""}</span></div>${fok ? `<div class="sw ${S.overlay ? "on" : ""}"></div>` : `<div class="r">${ic("cloudoff", 20)}</div>`}</div>`;
      if (cfg.entry === "layers") h += `<div class="sec" style="margin-top:6px">Parcelles</div><div class="seg" style="margin:0"><div class="${S.parcels === "all" ? "on" : ""}" data-act="parc" data-m="all">Toutes</div><div class="${S.parcels === "ibp" ? "on" : ""}" data-act="parc" data-m="ibp">Avec IBP</div><div class="${S.parcels === "none" ? "on" : ""}" data-act="parc" data-m="none">Aucune</div></div><div class="helper">${S.parcels === "all" ? "Cadastre et toutes les parcelles." : S.parcels === "ibp" ? "Seulement les parcelles qui ont un relevé IBP, sans le cadastre." : "Ni cadastre ni parcelles."}</div>`;
      if (S.overlay) h += `<div class="legend"><span><i style="background:#e0a63a"></i>Feuillus</span><span><i style="background:#2f7d32"></i>Conifères</span><span><i style="background:#7aa34a"></i>Forêts mélangées</span><span><i style="background:#9a7bb0"></i>Peupleraies</span><span><i style="background:#c9b68a"></i>Landes et forêts ouvertes</span></div>`;
      const sh = shown().filter(Boolean).map((k) => `<p>${L[k].src}</p>`).join("") + (S.overlay ? `<p>Types de forêt : ${FOREST.vintage}</p>` : "");
      h += `<div class="sec">Sources et licences</div><div class="src">${sh}<p>${SRC_COMMON}</p></div>`;
      if (dotOn()) h += `<div class="back" data-act="reset">Revenir à l'Explorer</div>`;
      return h;
    };
    const estimate = () => {
      const all = shared.policy === "all";
      return { total: all ? 84 : 53, line2: all ? "Fonds de carte : 53 Mo. Autres couches : 31 Mo." : "Fonds de carte seulement, réglable dans Paramètres.", line3: all ? "Réglable dans Paramètres, Cartes." : "" };
    };
    const dlHTML = () => {
      const d = S.dl, e = estimate();
      const head = `<div class="dl">`;
      if (d.st === "idle") return head + `<h3>Télécharger cette zone</h3><div class="meta">Environ 4 km sur 4 km autour de la vue.</div><div class="meta" style="margin-top:8px;color:var(--text)"><b>Environ ${e.total} Mo</b></div><div class="meta">${e.line2}</div>${e.line3 ? `<div class="meta">${e.line3}</div>` : ""}<div class="btn" style="margin-top:14px" data-act="dlstart">Télécharger</div></div>`;
      if (d.st === "running") { const cur = curPack(); return head + `<h3>Zone de Fontainebleau</h3><div class="pb"><i style="width:${d.pct}%"></i></div><div class="meta" style="color:var(--text)">Téléchargement : ${Math.round(d.pct)} %</div><div class="meta">${Math.round(d.pct * 54)} sur 5 400 tuiles</div><div class="meta">En cours : ${cur.n}</div></div>`; }
      if (d.st === "done") return head + `<h3>Zone disponible hors connexion</h3><div class="meta">Fontainebleau est enregistrée sur ce téléphone.</div><div class="btn ghost" style="margin-top:12px" data-act="dlclose">Terminé</div></div>`;
      if (d.st === "partial") return head + `<h3>Zone disponible hors connexion</h3><div class="meta">Fontainebleau est enregistrée sur ce téléphone.</div><div class="notice err">${ic("alert", 16)}<span>Ces couches n'ont pas pu être téléchargées : Photos aériennes (1950-1965). Les fonds de carte fonctionnent hors connexion.</span></div><div class="btn ghost" style="margin-top:6px" data-act="dlclose">Terminé</div></div>`;
      return head + `<h3>Le téléchargement a échoué</h3><div class="meta">Vérifiez votre connexion, puis réessayez.</div><div class="btn" style="margin-top:12px" data-act="dlstart">Réessayer</div></div>`;
    };
    const packs = () => PACKS.filter((p) => shared.policy === "all" || p.base);
    const curPack = () => { const ps = packs(), tot = ps.reduce((a, p) => a + p.mb, 0); let acc = 0; const cur = (S.dl.pct / 100) * tot; for (const p of ps) { acc += p.mb; if (cur < acc) return p; } return ps[ps.length - 1]; };

    const ovDot = () => S.overlay || S.parcels !== "all";
    const th = (k) => { const [t, e] = TILE[k]; return `style="background-image:url(../map-layers-tiles/${t}-16629-11335.${e})"`; };
    const badge = (k) => (S.compare ? (S.sideA === k ? "G" : S.sideB === k ? "D" : "") : "");
    const isOn = (k) => (S.compare ? S.sideA === k || S.sideB === k : S.base === k);
    const slotsLine = () => (S.compare ? `<div class="chhelp">Touchez un fond pour le placer côté ${S.target === "left" ? "gauche" : "droit"}.</div>` : "");
    const cmpBtn = () => (S.compare ? `<div class="chbtn on" data-act="cmp">${ic("swap", 16)} Arrêter</div>` : `<div class="chbtn" data-act="cmp">${ic("swap", 16)} Comparer</div>`);

    const assign = (k, side) => {
      if (side === "left") { if (S.sideB === k) S.sideB = S.sideA; S.sideA = k; } else { if (S.sideA === k) S.sideA = S.sideB; S.sideB = k; }
    };
    const xbtn = () => `<div class="xmini" data-act="cclose">${ic("close", 18)}</div>`;
    const bhead = (title, right) => `<div class="sthead"><b>${title}</b><div style="display:flex;gap:8px;align-items:center">${right || ""}${xbtn()}</div></div>`;
    const tbtn = (k, size, act, extra) => `<div class="sth ${isOn(k) ? "on" : ""} ${avail(k) ? "" : "dis"}" data-act="${act || "pick"}" data-k="${k}" ${extra || ""}><div class="thb ${size || ""}" ${th(k)}>${size === "xs" || !badge(k) ? "" : `<em>${badge(k)}</em>`}${avail(k) ? "" : `<span class="off">${ic("cloudoff", 16)}</span>`}</div>${size === "xs" ? "" : `<small>${L[k].short}</small>`}</div>`;
    const rowFor = (side) => BASES.map((k) => { const on = side === "left" ? S.sideA === k : S.sideB === k; return `<div class="sth ${on ? "on" : ""} ${avail(k) ? "" : "dis"}" data-act="pickside" data-k="${k}" data-side="${side}" style="width:56px"><div class="thb xs" ${th(k)}>${avail(k) ? "" : `<span class="off">${ic("cloudoff", 14)}</span>`}</div></div>`; }).join("");
    const slot = (side) => { const k = side === "left" ? S.sideA : S.sideB; return `<div class="sth slotb ${S.target === side ? "tg" : ""}" data-act="tgt" data-s="${side}" style="width:70px"><div class="thb" ${th(k)} style="width:58px;height:58px;background-image:url(../map-layers-tiles/${TILE[k][0]}-16629-11335.${TILE[k][1]})"></div><small>${side === "left" ? "Gauche" : "Droite"}</small></div>`; };
    const cardBase = () => {
      const head = bhead("Fonds de carte", cmpBtn());
      if (!S.compare && cfg.baseMode === "carousel") return `${head}<div class="carwrap"><div class="carsel"></div><div class="carscroll">${BASES.map((k) => `<div class="sth ${S.base === k ? "on" : ""} ${avail(k) ? "" : "dis"}" data-k="${k}" style="width:70px"><div class="thb" ${th(k)}>${avail(k) ? "" : `<span class="off">${ic("cloudoff", 16)}</span>`}</div></div>`).join("")}</div></div><div class="carname"><b>${L[S.base].name}</b> <small>${L[S.base].year}</small></div>`;
      if (!S.compare && (cfg.baseMode === "swipe" || cfg.baseMode === "wipe")) return `${head}<div class="chhelp" style="padding:0 14px 6px">Glissez sur la carte pour changer de fond. La carte est fixe pendant ce choix.</div><div class="stscroll">${BASES.map((k) => tbtn(k, "sm2")).join("")}</div>`;
      if (!S.compare) return `${head}<div class="stscroll">${BASES.map((k) => tbtn(k)).join("")}</div>`;
      const m = cfg.cmpMode || "flip";
      if (m === "rows") return `${head}<div class="rws"><div class="rl">Gauche</div><div class="rr">${rowFor("left")}</div><div class="rl">Droite</div><div class="rr">${rowFor("right")}</div></div>`;
      if (m === "drag") return `${head}<div class="chhelp">Glissez un fond sur la carte, à gauche ou à droite de la ligne (ou touchez-le).</div><div class="stscroll">${BASES.map((k) => tbtn(k, "", "pick", 'data-drag="1"')).join("")}</div>`;
      if (m === "swipe") return S.lock
        ? `${bhead("Fonds de carte", cmpBtn())}<div class="cbody"><div class="notice" style="padding-top:0">${ic("info", 18)}<span>La carte est fixe. Glissez vers la gauche ou la droite sur chaque côté pour changer de fond.</span></div><div class="btn" data-act="lock">Terminé</div></div>`
        : `${head}<div class="cbody"><div class="btn" data-act="lock">${ic("swap", 18)} Changer les fonds en glissant sur la carte</div><div class="chhelp" style="padding:8px 0 0">Ou touchez une vignette : elle va du côté ciblé.</div></div><div class="stscroll" style="padding-top:8px">${BASES.map((k) => tbtn(k, "sm2", "pick")).join("")}</div>`;
      if (m === "ends") return `${head}<div class="ends">${slot("left")}<div class="stscroll mid">${BASES.map((k) => tbtn(k, "sm2")).join("")}</div>${slot("right")}</div><div class="chhelp">Touchez Gauche ou Droite, puis un fond.</div>`;
      return `${head}${slotsLine()}<div class="stscroll">${BASES.map((k) => tbtn(k)).join("")}</div>`;
    };
    const cardOv = () => `${bhead("Superpositions", "")}<div class="ovrow"><div class="ovchip ${S.overlay ? "on" : ""} ${avail("foret") ? "" : "dis"}" data-act="ov">${ic("leaf", 18)} Types de forêt <span class="sw ${S.overlay ? "on" : ""}" style="margin:0 0 0 8px;width:38px;height:22px"></span></div></div>${S.overlay ? `<div class="legend" style="margin:6px 12px 0"><span><i style="background:#e0a63a"></i>Feuillus</span><span><i style="background:#2f7d32"></i>Conifères</span><span><i style="background:#7aa34a"></i>Mélangées</span><span><i style="background:#9a7bb0"></i>Peupleraies</span></div>` : ""}<div class="chh" style="padding:10px 14px 4px">Parcelles</div><div class="seg" style="margin:0 12px"><div class="${S.parcels === "all" ? "on" : ""}" data-act="parc" data-m="all">Toutes</div><div class="${S.parcels === "ibp" ? "on" : ""}" data-act="parc" data-m="ibp">Avec IBP</div><div class="${S.parcels === "none" ? "on" : ""}" data-act="parc" data-m="none">Aucune</div></div>`;
    const cardDl = () => {
      const d = S.dl, e = estimate();
      if (d.st === "failed") return `${bhead("Le téléchargement a échoué", "")}<div class="cbody"><div class="meta">Vérifiez votre connexion, puis réessayez.</div><div class="btn" data-act="dlstart" style="margin-top:10px">Réessayer</div></div>`;
      if (d.st === "partial") return `${bhead("Zone disponible hors connexion", "")}<div class="cbody"><div class="notice err" style="padding-top:0">${ic("alert", 16)}<span>Ces couches n'ont pas pu être téléchargées : Photos aériennes (1950-1965). Les fonds de carte fonctionnent hors connexion.</span></div><div class="btn ghost" data-act="dlclose" style="margin-top:6px">Terminé</div></div>`;
      return `${bhead("Télécharger cette zone", "")}<div class="cbody dlrow"><div><div class="meta" style="color:var(--text)"><b>Environ ${e.total} Mo</b> · 4 km sur 4 km autour de la vue</div><div class="meta">${e.line2}</div>${e.line3 ? `<div class="meta">${e.line3}</div>` : ""}</div><div class="btn" data-act="dlstart">Télécharger</div></div>`;
    };
    const bottomCardR = () => {
      let h = "", kind = null;
      if (cfg.dlcard && S.panel === "download") { kind = "dl"; h = cardDl(); }
      else if (S.chooser === "base" && !(cfg.nocard && !S.compare)) { kind = "base"; h = cardBase(); }
      else if (S.chooser === "ov" && cfg.ovcard) { kind = "ov"; h = cardOv(); }
      chooserW.innerHTML = kind ? `<div class="chooser bcard glass" data-kind="${kind}">${h}</div>` : "";
      const c = chooserW.firstElementChild;
      locate.style.bottom = 84 + 14 + (c ? c.offsetHeight + 14 : 0) + "px";
      if (kind === "base" && !S.compare && cfg.baseMode === "carousel") carouselInit();
      return kind;
    };

    let lkTm = null;
    const lockedBase = () => !cfg.swipe && cfg.chooser === "card" && (cfg.baseMode === "swipe" || cfg.baseMode === "wipe") && S.chooser === "base" && !S.compare;
    const neighbor = (k, dir) => { const l = BASES.filter((b) => avail(b)); const i = Math.max(0, l.indexOf(k)); return l[(i + dir + l.length) % l.length]; };
    const lockuiR = () => {
      if (!lockedBase()) { lockui.innerHTML = ""; return; }
      const l = L[S.base];
      lockui.innerHTML = `<div class="lkp glass"><span>‹</span><b>${l.name.replace(/ \(.*\)/, "")}</b><small>${l.year}</small><span>›</span></div><div class="lkd">${BASES.map((b) => `<i class="${b === S.base ? "on" : ""}"></i>`).join("")}</div><div class="lkh">Glissez sur la carte pour changer de fond</div><div class="pill glass tap lkdone" data-act="cclose">Terminé</div>`;
      clearTimeout(lkTm); lkTm = setTimeout(() => { if (lockedBase()) { S.chooser = null; render(); } }, 7000);
    };
    const setBase = (k) => { S.base = k; if (k === "map" || k === "satellite") S.saved = k; };
    const carouselInit = () => {
      const sc = chooserW.querySelector(".carscroll"); if (!sc) return;
      const items = [...sc.querySelectorAll(".sth")], cur = items.find((x) => x.dataset.k === S.base);
      const nm = chooserW.querySelector(".carname");
      const center = (el) => { sc.scrollLeft = el.offsetLeft - (sc.clientWidth - el.offsetWidth) / 2; };
      if (cur) center(cur);
      let tm2 = null;
      sc.addEventListener("scroll", () => {
        const mid = sc.scrollLeft + sc.clientWidth / 2; let best = null, bd = 1e9;
        items.forEach((x) => { const d = Math.abs(x.offsetLeft + x.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = x; } });
        if (!best) return;
        items.forEach((x) => x.classList.toggle("on", x === best));
        clearTimeout(tm2);
        tm2 = setTimeout(() => { const k = best.dataset.k; if (k !== S.base && avail(k)) { setBase(k); buildMaps(); place(); capsuleR(); } if (nm) nm.innerHTML = `<b>${L[best.dataset.k].name}</b> <small>${L[best.dataset.k].year}</small>`; }, 90);
        if (nm) nm.innerHTML = `<b>${L[best.dataset.k].name}</b> <small>${L[best.dataset.k].year}</small>`;
      });
      items.forEach((x) => x.addEventListener("click", () => { if (avail(x.dataset.k)) center(x); }));
    };
    const chooserR = () => {
      if (cfg.chooser === "card" && !(S.chooser === "ov" && !cfg.ovcard)) { if (cfg.entry === "keep") bottomCardR(); return; }
      if (cfg.chooser === "card") locate.style.bottom = 84 + 14 + "px";
      chooserW.innerHTML = "";
      if (cfg.entry !== "keep" || !S.chooser) return;
      if (S.chooser === "ov") {
        const fok = avail("foret");
        chooserW.innerHTML = `<div class="chooser pop ov glass" style="top:${parseFloat(root.querySelector(".ovbtn").style.top || capsule.style.top)}px"><div class="chh">Superpositions</div>
          <div class="crow" data-act="ov"><div class="th2">${ic("leaf", 20)}</div><div class="ct"><b>Types de forêt</b><span>${fok ? "Feuillus, conifères, mélangées" : "Indisponible hors connexion"}</span></div><div class="sw ${S.overlay ? "on" : ""}" style="margin:0"></div></div>
          <div class="chh" style="margin-top:6px">Parcelles</div><div class="seg" style="margin:0 0 4px"><div class="${S.parcels === "all" ? "on" : ""}" data-act="parc" data-m="all">Toutes</div><div class="${S.parcels === "ibp" ? "on" : ""}" data-act="parc" data-m="ibp">Avec IBP</div><div class="${S.parcels === "none" ? "on" : ""}" data-act="parc" data-m="none">Aucune</div></div></div>`;
        return;
      }
      const items = BASES.map((k) => ({ k, ok: avail(k) }));
      if (cfg.chooser === "strip") {
        chooserW.innerHTML = `<div class="chooser strip glass"><div class="sthead"><b>Fonds de carte</b>${cmpBtn()}</div>${slotsLine()}<div class="stscroll">${items.map((i) => `<div class="sth ${isOn(i.k) ? "on" : ""} ${i.ok ? "" : "dis"}" data-act="pick" data-k="${i.k}"><div class="thb" ${th(i.k)}>${badge(i.k) ? `<em>${badge(i.k)}</em>` : ""}${i.ok ? "" : `<span class="off">${ic("cloudoff", 18)}</span>`}</div><small>${L[i.k].short}</small></div>`).join("")}</div></div>`;
      } else if (cfg.chooser === "grid") {
        chooserW.innerHTML = `<div class="chooser grid glass"><div class="grip"></div><div class="sthead"><b>Fonds de carte</b>${cmpBtn()}</div>${slotsLine()}<div class="gr">${items.map((i) => `<div class="sth ${isOn(i.k) ? "on" : ""} ${i.ok ? "" : "dis"}" data-act="pick" data-k="${i.k}"><div class="thb big" ${th(i.k)}>${badge(i.k) ? `<em>${badge(i.k)}</em>` : ""}${i.ok ? "" : `<span class="off">${ic("cloudoff", 18)}</span>`}</div><small>${L[i.k].short}</small></div>`).join("")}</div></div>`;
      } else {
        chooserW.innerHTML = `<div class="chooser pop glass" style="top:${TOPN}px"><div class="chh">Fonds de carte</div>${items.map((i) => `<div class="crow ${i.ok ? "" : "dis"}" data-act="pick" data-k="${i.k}"><div class="thb sm ${isOn(i.k) ? "on" : ""}" ${th(i.k)}>${i.ok ? "" : `<span class="off">${ic("cloudoff", 16)}</span>`}</div><div class="ct"><b>${L[i.k].short}</b><span>${L[i.k].year}</span></div><div class="bd">${badge(i.k) || (isOn(i.k) ? ic("radioOn", 20) : "")}</div></div>`).join("")}${slotsLine()}<div style="padding-top:6px">${cmpBtn()}</div></div>`;
      }
    };
    const sheetR = () => {
      const seg = cfg.entry === "segment";
      const open = cfg.dlcard && S.panel === "download" ? false : seg ? true : !!S.panel;
      sheet.style.display = open ? "flex" : "none";
      if (!open) return;
      const hgt = S.panel !== "download" && seg && S.seg === "explore" ? 188 : Math.round(H * 0.55) - 84;
      sheet.style.height = hgt + "px"; sheet.style.bottom = 84 + "px";
      let h = `<div class="grip"></div>`;
      if (seg) h += `<div class="seg"><div class="${S.seg === "explore" ? "on" : ""}" data-act="seg" data-m="explore">Explorer</div><div class="${S.seg === "study" ? "on" : ""}" data-act="seg" data-m="study">Étudier</div></div>`;
      if (seg && S.seg === "explore" && S.panel !== "download") {
        h += `<div class="sbody"><div class="row" style="border:0"><div class="t"><b>12 relevés dans cette zone</b><span>Touchez un repère pour ouvrir un relevé.</span></div></div></div>`;
      } else if (S.panel === "download") {
        h += `<div class="sh"><div><b>Zone hors ligne</b></div><div class="xbtn" data-act="close">${ic("close", 20)}</div></div><div class="sbody">${dlHTML()}</div>`;
      } else {
        h += `<div class="sh"><div><b>Mode étude</b><span>Changez de fond de carte, ajoutez une couche ou comparez deux fonds.</span></div>${seg ? "" : `<div class="xbtn" data-act="close">${ic("close", 20)}</div>`}</div><div class="sbody">${studyHTML()}</div>`;
      }
      const sb = sheet.querySelector(".sbody"), st = sb ? sb.scrollTop : 0;
      sheet.innerHTML = h; const nb = sheet.querySelector(".sbody"); if (nb) nb.scrollTop = st;
    };
    function render(skipCurtain) {
      buildMaps(); place();
      if (!skipCurtain) curtainR();
      noticesR(); sheetR(); capsuleR(); chooserR(); chipR(); lockuiR(); swR();
    }

    // ---- actions ----
    const startDl = () => {
      clearInterval(dlTimer); const scen = S.dl.scen;
      S.dl = { st: "running", pct: 0, scen };
      if (cfg.dlclose) S.panel = null;
      dlTimer = setInterval(() => {
        S.dl.pct += 100 / 80;
        if (scen === "fail" && S.dl.pct >= 30) { clearInterval(dlTimer); S.dl.st = "failed"; }
        else if (S.dl.pct >= 100) { clearInterval(dlTimer); S.dl.pct = 100; S.dl.st = scen === "partial" && shared.policy === "all" ? "partial" : "done"; if (S.panel !== "download") { dlDoneTm = setTimeout(() => { S.dl.hide = true; render(); }, 4000); } }
        render();
      }, 100);
      render();
    };
    root.addEventListener("click", (e) => {
      if (window.__dragged) return;
      const a = e.target.closest("[data-act]"); if (!a) return; const act = a.dataset.act;
      if (act === "study") { S.panel = S.panel === "study" ? null : "study"; if (cfg.entry === "segment") S.seg = "study"; }
      else if (act === "close") S.panel = null;
      else if (act === "download") { S.panel = S.panel === "download" ? null : "download"; S.chooser = null; }
      else if (act === "basemap" && cfg.swipe) { S.sw = !S.sw; S.chooser = null; S.panel = null; }
      else if (act === "swdone") S.sw = false;
      else if (act === "swcmp") { S.sideA = S.base; S.sideB = neighbor(S.base, 1); return enterCompare(); }
      else if (act === "basemap" && cfg.entry === "keep") { S.chooser = S.chooser === "base" ? null : "base"; S.panel = null; }
      else if (act === "ovbtn") { S.chooser = S.chooser === "ov" ? null : "ov"; S.panel = null; }
      else if (act === "lock") S.lock = !S.lock;
      else if (act === "cclose") { S.chooser = null; if (S.panel === "download") S.panel = null; }
      else if (act === "pickside") { const k = a.dataset.k; if (!avail(k)) return; assign(k, a.dataset.side); }
      else if (act === "pick" && cfg.chooser === "card" && S.compare && (cfg.cmpMode === "ends")) { const k = a.dataset.k; if (!avail(k)) return; assign(k, S.target); S.target = S.target === "right" ? "left" : "right"; }
      else if (act === "pick") {
        const k = a.dataset.k; if (!avail(k)) return;
        if (!S.compare) { S.base = k; if (k === "map" || k === "satellite") S.saved = k; }
        else { const side = S.target; if (side === "right") { if (S.sideA === k) S.sideA = S.sideB; S.sideB = k; } else { if (S.sideB === k) S.sideB = S.sideA; S.sideA = k; } S.target = side === "right" ? "left" : "right"; }
      }
      else if (act === "basemap" && !S.compare) { S.base = S.base === "map" ? "satellite" : "map"; S.saved = S.base; }
      else if (act === "base") {
        const k = a.dataset.k; if (!avail(k)) return;
        if (!S.compare) { S.base = k; }
        else {
          const side = S.target;
          if (side === "right") { if (S.sideA === k) { S.sideA = S.sideB; } S.sideB = k; } else { if (S.sideB === k) { S.sideB = S.sideA; } S.sideA = k; }
          S.target = side === "right" ? "left" : "right";
        }
      }
      else if (act === "ov") { if (avail("foret")) S.overlay = !S.overlay; }
      else if (act === "cmp") { if (S.compare) return leaveCompare(); S.sideA = S.base; S.sideB = S.base === "p1950" ? "satellite" : "p1950"; S.target = "right"; if (!avail(S.sideB)) { const f = BASES.find((k) => avail(k) && k !== S.base); S.sideB = f; } return enterCompare(); }
      else if (act === "exit") return leaveCompare();
      else if (act === "tgt") S.target = a.dataset.s;
      else if (act === "swap") { const t = S.sideA; S.sideA = S.sideB; S.sideB = t; }
      else if (act === "reset") { if (S.compare) { leaveCompare(); } S.base = S.saved; S.overlay = false; }
      else if (act === "retry" || act === "toplan") { S.err = null; if (act === "toplan") { S.base = "map"; S.compare = false; } }
      else if (act === "parc") S.parcels = a.dataset.m;
      else if (act === "chip") { if (cfg.dlclose && (S.dl.st === "failed" || S.dl.st === "partial")) S.panel = "download"; else if (!cfg.dlclose) S.panel = "download"; }
      else if (act === "seg") { S.seg = a.dataset.m; S.panel = S.seg === "study" ? "study" : null; }
      else if (act === "dlstart") return startDl();
      else if (act === "dlclose") { S.panel = null; S.dl = { st: "idle", pct: 0, scen: S.dl.scen }; }
      render();
    });
    shared.subs.push(() => render());

    // ---- états prédéfinis ----
    const P = {
      defaut: () => {},
      cBase: () => { S.chooser = "base"; },
      cDlOpen: () => { S.panel = "download"; },
      swOn: () => { S.sw = true; },
      swCmp: () => { S.sw = true; S.base = "map"; S.sideA = "map"; S.sideB = "p1950"; setTimeout(() => enterCompare(), 20); },
      swFree: () => { S.sw = false; S.base = "map"; S.sideA = "map"; S.sideB = "p1950"; setTimeout(() => enterCompare(), 20); },
      cSwipe: () => { S.chooser = "base"; render(); setTimeout(() => { root.querySelector('[data-act="cmp"]').click(); setTimeout(() => { root.querySelector('[data-act="lock"]') && root.querySelector('[data-act="lock"]').click(); }, 500); }, 30); },
      cOv: () => { S.chooser = "ov"; },
      cCmp: () => { S.chooser = "base"; render(); setTimeout(() => root.querySelector('[data-act="cmp"]').click(), 30); },
      cOld: () => { S.chooser = "base"; S.base = "etat"; },
      cOff: () => { S.chooser = "base"; S.offline = true; S.covered = false; },
      cParc: () => { S.chooser = "ov"; S.parcels = "ibp"; S.overlay = true; },
      panneau: () => { S.panel = "study"; },
      ancien: () => { S.base = "etat"; S.panel = "study"; },
      foret: () => { S.overlay = true; S.panel = "study"; },
      comparer: () => { S.panel = "study"; setTimeout(() => root.querySelector('[data-act="cmp"]').click(), 30); },
      comparerFerme: () => { S.panel = "study"; render(); setTimeout(() => { root.querySelector('[data-act="cmp"]').click(); setTimeout(() => { S.panel = null; render(); }, 450); }, 30); },
      surzoom: () => { S.base = "etat"; S.z = 17; },
      comparZoom: () => { S.base = "etat"; S.z = 16; setTimeout(() => root.querySelector('[data-act="cmp"]') ? 0 : 0, 0); S.panel = "study"; render(); setTimeout(() => { root.querySelector('[data-act="cmp"]').click(); setTimeout(() => { S.panel = null; render(); }, 450); }, 30); },
      comparForet: () => { S.overlay = true; S.panel = "study"; render(); setTimeout(() => { root.querySelector('[data-act="cmp"]').click(); }, 30); },
      dlDoneClosed: () => { S.dl = { st: "done", pct: 100, scen: "ok" }; },
      dlPartialClosed: () => { S.dl = { st: "partial", pct: 100, scen: "partial" }; },
      dlFailClosed: () => { S.dl = { st: "failed", pct: 30, scen: "fail" }; },
      horsligne: () => { S.offline = true; S.covered = true; S.panel = "study"; },
      horsZone: () => { S.offline = true; S.covered = false; S.panel = "study"; },
      horsComp: () => { S.offline = true; S.covered = false; S.panel = "study"; },
      erreur: () => { S.err = "load"; S.base = "etat"; S.panel = "study"; },
      couverture: () => { S.err = "cover"; S.base = "etat"; },
      dlForm: () => { S.panel = "download"; },
      dlRun: () => { S.panel = "download"; S.dl.scen = "ok"; setTimeout(startDl, 20); },
      dlRunClosed: () => { S.panel = "download"; S.dl.scen = "ok"; render(); setTimeout(() => { startDl(); setTimeout(() => { S.panel = null; render(); }, 40); }, 20); },
      dlPartial: () => { S.panel = "download"; S.dl.scen = "partial"; setTimeout(startDl, 20); },
      dlFail: () => { S.panel = "download"; S.dl.scen = "fail"; setTimeout(startDl, 20); },
    };
    const api = {
      preset(name) { reset(); if (name === "horsComp") { S.offline = true; S.covered = true; shared.policy = "all"; S.panel = "study"; render(); setTimeout(() => { root.querySelector('[data-act="cmp"]').click(); }, 30); return; } if (P[name]) P[name](); if (cfg.entry === "segment" && S.panel === "study") S.seg = "study"; render(); },
      zoom, setDark(d) { document.body.classList.toggle("dark", d); },
      get S() { return S; }, render,
    };
    render();
    return api;
  };

  // ---- réglages ----
  LK.createSettings = function (root) {
    const rowv = () => (shared.policy === "all" ? "Toutes les couches" : "Fonds de carte seulement");
    root.innerHTML = `<div class="phone settings" style="width:${W}px;height:${H}px"><div class="status"><span>9:41</span><span>5G ▮▮▮</span></div><div class="sethead"><b>Paramètres</b></div>
      <div class="gsec"><h4>Compte</h4><div class="glist"><div class="grow"><div class="tile">${ic("info", 16)}</div><b>Profil</b>${ic("chev", 16)}</div></div></div>
      <div class="gsec"><h4>Cartes</h4><div class="glist"><div class="grow"><div class="tile">${ic("map", 16)}</div><b>Cartes hors ligne</b><span>1 zone</span>${ic("chev", 16)}</div><div class="grow" data-act="open"><div class="tile">${ic("layers", 16)}</div><b>Couches hors ligne</b><span class="v">${rowv()}</span>${ic("chev", 16)}</div></div>
        <div class="gfoot">Fonds de carte seulement garde le plan, le satellite et le cadastre. Toutes les couches ajoute les cartes anciennes, les photos de 1950 et les types de forêt.</div></div>
      <div class="gsec"><h4>Application</h4><div class="glist"><div class="grow"><div class="tile">${ic("info", 16)}</div><b>À propos</b>${ic("chev", 16)}</div></div></div>
      <div class="asov" style="display:none"><div class="as"><div class="box"><div class="hd"><b>Couches hors ligne</b><span>Poids estimé pour une zone de 4 km sur 4 km. Le réglage s'applique aux prochains téléchargements, pas aux zones déjà enregistrées.</span></div><div class="op" data-act="all">Toutes les couches · environ 84 Mo</div><div class="op" data-act="base">Fonds de carte seulement · environ 53 Mo</div></div><div class="cancel" data-act="cancel">Annuler</div></div></div></div>`;
    const ov = root.querySelector(".asov"), v = root.querySelector(".v");
    const sync = () => (v.textContent = rowv());
    root.addEventListener("click", (e) => {
      const a = e.target.closest("[data-act]"); if (!a) return;
      if (a.dataset.act === "open") ov.style.display = "flex";
      else { if (a.dataset.act === "all") LK.setPolicy("all"); if (a.dataset.act === "base") LK.setPolicy("base"); ov.style.display = "none"; sync(); }
    });
    shared.subs.push(sync);
    return { open() { ov.style.display = "flex"; } };
  };

  // ---- page ----
  LK.mountSketch = function (host, variants) {
    const apps = {};
    let h = `<div class="bar" id="tabs"></div>`;
    variants.forEach((v) => (h += `<div class="var" id="var-${v.id}"><div class="vcol"><h2>${v.title}${v.win ? '<span class="winner">★ ' + v.win + "</span>" : ""}</h2><p>${v.desc}</p><ul class="pros">${v.points.map((p) => `<li>${p}</li>`).join("")}</ul><div class="cap">États à essayer</div><div class="states" id="st-${v.id}"></div><div class="cap">Carte</div><div class="states"><button class="sbtn" data-z="-1">Zoom −</button><button class="sbtn" data-z="1">Zoom +</button></div><div class="note">Glissez la carte (ou molette pour zoomer). Tuiles réelles de la Géoplateforme (forêt de Fontainebleau), zoom 15 : le flou au-delà du zoom 15 est celui des tuiles de démonstration.</div></div><div class="phones" id="ph-${v.id}"></div></div>`));
    host.innerHTML = h;
    const tabs = host.querySelector("#tabs");
    variants.forEach((v, i) => {
      const b = document.createElement("button"); b.className = "tabbtn" + (i ? "" : " on"); b.textContent = v.tab; b.onclick = () => show(v.id); b.dataset.v = v.id; tabs.appendChild(b);
      const phs = host.querySelector("#ph-" + v.id);
      const m = document.createElement("div"); phs.appendChild(m);
      apps[v.id] = LK.createApp(m, v.cfg); let sets = null;
      if (v.settings) { const s = document.createElement("div"); phs.appendChild(s); sets = LK.createSettings(s); }
      const st = host.querySelector("#st-" + v.id);
      v.states.forEach((s) => { const x = document.createElement("button"); x.className = "sbtn"; x.textContent = s[1]; x.onclick = () => (s[0] === "@settings" ? sets.open() : apps[v.id].preset(s[0])); st.appendChild(x); });
      host.querySelectorAll("#var-" + v.id + " [data-z]").forEach((z) => (z.onclick = () => apps[v.id].zoom(+z.dataset.z)));
    });
    const tog = document.createElement("button"); tog.className = "tog"; tog.textContent = "Clair / sombre"; tog.onclick = () => document.body.classList.toggle("dark"); tabs.appendChild(tog);
    function show(id) { host.querySelectorAll(".var").forEach((e) => e.classList.toggle("on", e.id === "var-" + id)); tabs.querySelectorAll(".tabbtn").forEach((b) => b.classList.toggle("on", b.dataset.v === id)); }
    show(variants[0].id);
    return apps;
  };
})();
