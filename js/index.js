"use strict";

let y = {
    PARTICLE_NUM: 500,
    PARTICLE_BASE_RADIUS: 1.4,
    DEFAULT_SPEED: 2,
    PARTICLE_COLOR: "#D4F9FF",
    PARTICLE_CHECK: true,
    BACKGROUND_CHECK: true,
    CANVAS_IMAGE: "images/default.jpg",
    FONT_CHECK: true,
    HUD_CHECK: true,
    NETWORK_CHECK: true,
    KTV_CHECK: true,
    KTV_STYLE: 0,
    KTV_EFFECT_MODE: 3,
    KTV_COLOR_STYLE: 0,
    KTV_INTENSITY: 1.0,
    KTV_RIPPLE_SPEED: 1.0,
    KTV_RIPPLE_SPREAD: 1.0,
    KTV_CORE_SIZE: 1.0,
    MUSIC_MODE: 1,
    MUSIC_OPACITY: 55,
    LANG: 0
};

let musicTrack = null;
let audioStarted = false;

let u = document.getElementById("c"),
    L = u.getContext("2d"),
    m, N, R, x, P = 2,
    p = [], M,
    D = { image: null, x: 0, y: 0, w: 0, h: 0 };

const audioState = {
    bands: new Array(32).fill(0),
    peaks: new Array(32).fill(0),
    peakHold: new Array(32).fill(0),
    peakTimer: new Array(32).fill(0)
};

const BAND_WEIGHTS = [0.30, 0.25, 0.15, 0.10, 0.08, 0.07, 0.05];
const BAND_RANGES_HZ = [[20,60],[60,130],[130,300],[300,1000],[1000,4000],[4000,8000],[8000,20000]];

const audioAnalysis = {
    rawBands:     new Float32Array(7),
    bands:        new Float32Array(7),
    smoothed:     new Float32Array(7),
    peaks:        new Float32Array(7),
    peakTimer:    new Uint16Array(7),
    totalEnergy:  0,
    centroid:     0,
    centroidBin:  0
};

const state = { cpu:{val:35}, mem:{used:8.2,total:16}, disk:{read:12,write:5,max:500}, gpu:{val:28,mhz:1650,vram:4}, net:{down:15,up:8} };
let tgt = { cpu:35, memUsed:8.2, diskR:12, diskW:5, gpu:28, gpuMhz:1650, gpuVram:4, netDown:15, netUp:8 };

function lerp(a,b,t){return a+(b-a)*t;}
function softNorm(x){ return x / (x + 0.4); }
// color style: 0=dreamy(full spectrum) 1=geek(cyan-blue)
function cHue(h) { return y.KTV_COLOR_STYLE ? 175 + (h % 360) / 360 * 75 : h; }
function cSat(s) { return y.KTV_COLOR_STYLE ? Math.round(s * 0.5) : s; }

let synthTimer = 0;


function setBar(id, pct){ const el=document.getElementById(id); if(el) el.style.width=Math.min(100,Math.max(0,pct))+'%'; }
function setText(id, txt){ const el=document.getElementById(id); if(el) el.innerHTML = txt; }

function tick(){
    state.cpu.val = lerp(state.cpu.val, tgt.cpu, 0.08);
    let cpuPct = Math.max(0,Math.min(100,state.cpu.val));
    setText('cpu-val', `<span style="color:${cpuPct>85?'#f87171':cpuPct>60?'#fbbf24':'#93c5fd'}">${cpuPct.toFixed(0)}</span>%`);
    setText('cpu-freq', `<span class="hud-dot" style="background:#60a5fa"></span>${(tgt.gpuMhz/1000).toFixed(2)} GHz · 52°C`);
    setBar('cpu-bar', cpuPct);

    state.mem.used = lerp(state.mem.used, tgt.memUsed, 0.08);
    let memPct = (state.mem.used / state.mem.total) * 100 || 50;
    setText('mem-val', `<span style="color:${memPct>85?'#f87171':memPct>65?'#fbbf24':'#c4b5fd'}">${state.mem.used.toFixed(1)}</span> GB`);
    setText('mem-sub', `<span class="hud-dot" style="background:#a78bfa"></span>${state.mem.used.toFixed(1)} / ${state.mem.total} GB ${t("tick.used")}`);
    setBar('mem-bar', memPct);

    state.gpu.val = lerp(state.gpu.val, tgt.gpu, 0.08);
    let gpuPct = Math.max(0,Math.min(100,state.gpu.val));
    setText('gpu-val', `<span style="color:${gpuPct>85?'#f87171':gpuPct>65?'#fbbf24':'#fdba74'}">${gpuPct.toFixed(0)}</span>%`);
    setText('gpu-sub', `<span class="hud-dot" style="background:#fb923c"></span>${tgt.gpuMhz.toFixed(0)} MHz · ${tgt.gpuVram.toFixed(1)} GB`);
    setBar('gpu-bar', gpuPct);

    state.net.down = lerp(state.net.down, tgt.netDown, 0.15);
    state.net.up = lerp(state.net.up, tgt.netUp, 0.15);
    let netTotal = state.net.down + state.net.up;
    setText('net-val', `${netTotal.toFixed(1)} MB/s`);
    setText('net-sub', `<span class="hud-dot" style="background:#22d3ee"></span>D:${state.net.down.toFixed(1)} U:${state.net.up.toFixed(1)}`);
    setBar('net-bar', Math.min(100, netTotal*1.5));

    // clock (DOM)
    let now = new Date();
    let hh = String(now.getHours()).padStart(2,"0");
    let mm = String(now.getMinutes()).padStart(2,"0");
    let ss = String(now.getSeconds()).padStart(2,"0");
    setText('clock-val', hh + ":" + mm + ":" + ss);
    setText('clock-sub', now.getFullYear() + "/" + String(now.getMonth()+1).padStart(2,"0") + "/" + String(now.getDate()).padStart(2,"0"));
}
setInterval(tick, 700);
tick();

const hud = document.getElementById("hud");
let isDragging = false, prevX, prevY;

function updateHUDVisibility(){
    hud.style.display = y.HUD_CHECK ? "grid" : "none";
    document.getElementById("net-card").style.display = y.NETWORK_CHECK ? "block" : "none";
    document.getElementById("clock-card").style.display = y.FONT_CHECK ? "block" : "none";
}

function updateLoadingText() {
    const el = document.getElementById("loading-text");
    if (el) el.textContent = t("loading.wait");
}

function updateMusicInfoVisibility(){
    const el = document.getElementById("music-info");
    if (!el) return;
    if (y.MUSIC_MODE === 0 && musicTrack && musicTrack.title) {
        el.classList.add("visible");
    } else {
        el.classList.remove("visible");
    }
}

const saved = localStorage.getItem("hudPosition");
let hudPosValid = false;
if(saved){
    try {
        const pos = JSON.parse(saved);
        const savedLeft = parseFloat(pos.left);
        const savedTop = parseFloat(pos.top);
        if (!isNaN(savedLeft) && !isNaN(savedTop)
            && savedLeft >= -100 && savedTop >= -100
            && savedLeft < window.innerWidth - 80
            && savedTop < window.innerHeight - 80) {
            hud.style.left = pos.left;
            hud.style.top = pos.top;
            hudPosValid = true;
        }
    } catch(e) {}
}
if(!hudPosValid){
    hud.style.right = "40px";
    hud.style.bottom = "80px";
    hud.style.left = "auto";
    hud.style.top = "auto";
}

function v(t) {
    t.x = Math.random()*m;
    t.y = Math.random()*N;
    t.z = 1500*Math.random() + 500;
    return t;
}

function resetParticles() {
    p = [];
    for(let i=0; i<y.PARTICLE_NUM; i++) p.push(v({}));
}

function loadBackground() {
    if(!y.BACKGROUND_CHECK) return;
    const img = new Image();
    img.src = y.CANVAS_IMAGE;
    img.onload = () => {
        D.image = img;
        let ratio = img.width / img.height;
        let w = m, h = w / ratio;
        if(h < N){ h = N; w = h * ratio; }
        D.w = w; D.h = h;
        D.x = (m - w)/2;
        D.y = (N - h)/2;
    };
}

function resize() {
    u.width = m = window.innerWidth;
    u.height = N = window.innerHeight;
    R = m/2; x = N/2;
    resetParticles();
    loadBackground();
}

let ripples = [];
let prevCoreIntensity = 0;

function getCentroid(bands) {
    let tw = 0, ws = 0;
    for (let b = 0; b < 32; b++) { ws += bands[b] * b; tw += bands[b]; }
    return tw > 0 ? ws / tw : 0;
}

function drawCenterOrb(ctx, cx, cy, radius, intensity, hue) {
    ctx.save();
    if (y.MUSIC_MODE === 0 && musicTrack && musicTrack.image) {
        const albumAlpha = y.MUSIC_OPACITY / 100;
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = albumAlpha + intensity * 0.15;
        // clip to circle and draw album art
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(musicTrack.image, cx - radius, cy - radius, radius * 2, radius * 2);
        ctx.restore();
        // glow ring (unclipped)
        ctx.globalAlpha = intensity * 0.4 * albumAlpha;
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${hue}, 80%, 70%, ${intensity * 0.5 * albumAlpha})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = `hsla(${hue}, 80%, 70%, ${0.35 * albumAlpha})`;
        ctx.shadowBlur = 12;
        ctx.stroke();
    } else {
        const orbAlpha = Math.min(1, (y.MUSIC_OPACITY + 30) / 100);
        let grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0, `hsla(${cHue(hue)}, ${cSat(80)}%, 97%, ${intensity * 0.9 * orbAlpha})`);
        grad.addColorStop(0.15, `hsla(${cHue(hue)}, ${cSat(90)}%, 72%, ${intensity * 0.6 * orbAlpha})`);
        grad.addColorStop(0.4, `hsla(${cHue((hue + 15) % 360)}, ${cSat(100)}%, 50%, ${intensity * 0.22 * orbAlpha})`);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawKTVBars() {
    if (!y.KTV_CHECK) return;

    synthTimer++;

    const ctx = L;
    const cx = m / 2, cy = N / 2;
    const maxR = Math.sqrt(cx * cx + cy * cy);
    const style = y.KTV_STYLE;          // 0=电音光圈 1=振膜音圈 2=魔幻流体
    const sub = y.KTV_EFFECT_MODE;      // 0=水波 1=脉冲 2=光晕 3=电音
    const spdMul = y.KTV_RIPPLE_SPEED;
    const spreadMul = y.KTV_RIPPLE_SPREAD;
    const coreMul = y.KTV_CORE_SIZE;
    const intensity = y.KTV_INTENSITY;

    // ===================================================================
    // STYLE 2: 魔幻流体 (original b99d8317 fluid)
    // ===================================================================
    if (style === 2) {
        const bands = audioState.bands;
        let bass = 0;
        for (let b = 0; b < 5; b++) bass += bands[b];
        bass = bass / 5 * intensity;
        let ci = Math.pow(bass * 4, 0.45);
        ci = Math.min(1, ci);
        let glowDelta = ci - prevCoreIntensity;
        let trigger = glowDelta > 0.004 && ci > 0.03;
        prevCoreIntensity = ci;

        let centroid = getCentroid(bands);
        let orbHue = (centroid * 7 + synthTimer * 1.8) % 360;

        if (ci > 0.02) {
            let cr = (30 + ci * 180) * coreMul;
            drawCenterOrb(ctx, cx, cy, cr, ci, orbHue);
        }

        if (trigger && typeof fluidSplatAtCenter === 'function') {
            fluidSplatAtCenter(ci);
        }
        return;
    }

    // ===================================================================
    // STYLE 1: 振膜音圈 (membrane gradient rendering)
    // ===================================================================
    if (style === 1) {
        const a = audioAnalysis;

        let chEnergy = [
            a.smoothed[0] * 0.6 + a.smoothed[1] * 0.4,
            a.smoothed[2] * 0.5 + a.smoothed[4] * 0.5,
            a.smoothed[3],
            a.smoothed[5] * 0.6 + a.smoothed[6] * 0.4
        ];

        let vocalEnergy = a.smoothed[2] * 0.3 + a.smoothed[3] * 0.5 + a.smoothed[4] * 0.2;
        let coreIntensity = (a.totalEnergy * 2.0 + vocalEnergy * 2.0) * intensity;
        coreIntensity = Math.min(1, coreIntensity);
        let orbHue = (a.centroid * 9 + synthTimer * 1.8) % 360;

        ctx.save();
        // source-over: alpha = opacity over black, no additive blowout
        ctx.globalCompositeOperation = "source-over";

        if (coreIntensity > 0.015) {
            let cr = (25 + coreIntensity * 185 + vocalEnergy * 60) * coreMul;
            drawCenterOrb(ctx, cx, cy, cr, coreIntensity, orbHue);
        }

        // per-channel triggers
        if (!drawKTVBars._prevCh) drawKTVBars._prevCh = new Float32Array(4);
        if (!drawKTVBars._lastTrig) drawKTVBars._lastTrig = new Uint16Array(4).fill(999);
        if (!drawKTVBars._ambCd) drawKTVBars._ambCd = 0;
        const prevCh = drawKTVBars._prevCh;
        const lastTrig = drawKTVBars._lastTrig;

        // [deltaMin, energyMin, cooldown] per channel
        const TRIG = [[0.012,0.06,5],[0.008,0.04,4],[0.004,0.025,5],[0.010,0.05,3]];
        // hue range per channel: kick, snare, vocal, hihat
        const CHUE = [[0,30],[185,225],[270,290],[40,70]];

        for (let c = 0; c < 4; c++) {
            let delta = chEnergy[c] - prevCh[c];
            prevCh[c] = chEnergy[c];
            if (lastTrig[c] < TRIG[c][2]) continue;
            if (delta > TRIG[c][0] && chEnergy[c] > TRIG[c][1]) {
                lastTrig[c] = 0;
                let riseRate = Math.min(1, delta * 100);
                let speed, maxLife;
                switch (sub) {
                    case 0: speed = (1 + riseRate * 7) * spdMul; maxLife = (100 + coreIntensity * 180) * spreadMul; break;
                    case 1: speed = (2.5 + riseRate * 14) * spdMul; maxLife = (50 + coreIntensity * 80) * spreadMul; break;
                    case 2: speed = (0.4 + riseRate * 3) * spdMul; maxLife = (250 + coreIntensity * 350) * spreadMul; break;
                    default: speed = (1 + riseRate * 10) * spdMul; maxLife = (60 + coreIntensity * 120) * spreadMul; break;
                }
                let srMul = [0.55, 0.42, 0.35, 0.18][c];
                let riHue = CHUE[c][0] + a.centroid * (CHUE[c][1] - CHUE[c][0]) + (Math.random() - 0.5) * 10;
                ripples.push({
                    r: (30 + coreIntensity * 180) * coreMul * srMul,
                    intensity: coreIntensity, hue: riHue, life: 0,
                    speed: speed, maxLife: maxLife
                });
            }
        }
        for (let c = 0; c < 4; c++) lastTrig[c]++;

        // continuous ambient waves
        drawKTVBars._ambCd--;
        if (drawKTVBars._ambCd <= 0 && coreIntensity > 0.03) {
            drawKTVBars._ambCd = 3;
            ripples.push({ r: 6, intensity: coreIntensity * 0.15, hue: orbHue, life: 0,
                speed: (1 + coreIntensity * 6) * spdMul, maxLife: (90 + coreIntensity * 160) * spreadMul });
        }

        while (ripples.length > 40) ripples.shift();

        // update & cull
        for (let i = ripples.length - 1; i >= 0; i--) {
            let rp = ripples[i]; rp.life++; rp.r += rp.speed;
            if (rp.life > rp.maxLife || rp.r > maxR * 1.15) ripples.splice(i, 1);
        }

        // merged gradient render
        let stops = [];
        for (let ri of ripples) {
            if (ri.life < 2) continue;
            let p = ri.life / ri.maxLife;
            let alpha, hueShift;
            switch (sub) {
                case 0: alpha = (1 - p * p) * ri.intensity; hueShift = p * 130; break;
                case 1: alpha = Math.pow(1 - p, 1.4) * ri.intensity * 1.2; hueShift = p * 80; break;
                case 2: alpha = Math.cos(p * Math.PI / 2) * ri.intensity; hueShift = p * 50; break;
                default: alpha = (1 - p * p * p) * ri.intensity; hueShift = p * 200; break;
            }
            if (alpha < 0.002) continue;
            let pos = ri.r / (maxR * 1.15);
            if (pos >= 1) continue;
            stops.push({ pos, hue: (ri.hue + hueShift) % 360, alpha });
        }
        stops.sort((a, b) => a.pos - b.pos);

        let grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 1.15);
        grad.addColorStop(0, "transparent");
        let merged = [];
        for (let s of stops) {
            let last = merged[merged.length - 1];
            if (last && s.pos - last.pos < 0.008 && Math.abs(s.hue - last.hue) < 40) {
                let w1 = last.alpha, w2 = s.alpha, tw = w1 + w2;
                last.pos = (last.pos * w1 + s.pos * w2) / tw;
                last.hue = (last.hue * w1 + s.hue * w2) / tw;
                last.alpha = Math.min(1, last.alpha + s.alpha * 0.7);
            } else if (merged.length < 60) {
                merged.push({ ...s });
            }
        }
        for (let s of merged) {
            grad.addColorStop(Math.min(0.99, s.pos),
                `hsla(${cHue(s.hue)}, ${cSat(75 + s.alpha * 25)}%, ${60 + s.alpha * 35}%, ${Math.min(0.9, s.alpha * 1.2)})`);
        }
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, maxR * 1.15, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        return;
    }

    // ===================================================================
    // STYLE 0: 电音光圈 (original b99d8317 + vocal recognition)
    // ===================================================================
    const bands = audioState.bands;
    const a = audioAnalysis;

    // bass energy (original trigger)
    let bass = 0;
    for (let b = 0; b < 5; b++) bass += bands[b];
    bass = bass / 5 * intensity;

    let coreIntensity = Math.pow(bass * 4, 0.45);
    coreIntensity = Math.min(1, coreIntensity);
    let ci = coreIntensity;

    let glowDelta = coreIntensity - prevCoreIntensity;
    let trigger = glowDelta > 0.004 && coreIntensity > 0.03;
    let riseRate = Math.min(1, glowDelta * 12);
    prevCoreIntensity = coreIntensity;

    // vocal energy from 7-band mid frequencies (bands 2-4: 130-4000Hz)
    let vocalEnergy = a.smoothed[2] * 0.3 + a.smoothed[3] * 0.5 + a.smoothed[4] * 0.2;
    // vocal delta trigger
    if (!drawKTVBars._vPrev) drawKTVBars._vPrev = 0;
    if (!drawKTVBars._vCd) drawKTVBars._vCd = 0;
    let vDelta = vocalEnergy - drawKTVBars._vPrev;
    drawKTVBars._vPrev = vocalEnergy;
    let vTrig = vDelta > 0.005 && vocalEnergy > 0.04;
    let vRise = Math.min(1, vDelta * 120);
    drawKTVBars._vCd--;

    let centroid = getCentroid(bands);
    let hue = (centroid * 7 + synthTimer * 1.8) % 360;

    ctx.save();
    ctx.globalCompositeOperation = "source-over";

    let orbPulse = vocalEnergy * 1.2;
    if (coreIntensity > 0.02) {
        let cr = (30 + coreIntensity * 180 + orbPulse * 50) * coreMul;
        drawCenterOrb(ctx, cx, cy, cr, coreIntensity, hue);
    }

    // bass ripple trigger
    let cooldown = [5, 7, 18, 3][sub];
    cooldown = Math.round(cooldown / spdMul);

    if (!drawKTVBars._cd) drawKTVBars._cd = 0;
    drawKTVBars._cd--;
    if (trigger && drawKTVBars._cd <= 0) {
        drawKTVBars._cd = cooldown;
        let crCore = (30 + coreIntensity * 180) * coreMul * 0.21;
        let rp = { r: crCore, intensity: ci, hue: hue, life: 0, _colorOffset: (Math.random() - 0.5) * 60 };
        switch (sub) {
            case 0:
                rp.speed = (1 + riseRate * 7) * spdMul;
                rp.maxLife = (100 + ci * 180) * spreadMul;
                break;
            case 1:
                rp.speed = (2.5 + riseRate * 14) * spdMul;
                rp.maxLife = (50 + ci * 80) * spreadMul;
                break;
            case 2:
                rp.speed = (0.4 + riseRate * 3) * spdMul;
                rp.maxLife = (250 + ci * 350) * spreadMul;
                break;
            case 3:
                rp.speed = (1 + riseRate * 10) * spdMul;
                rp.maxLife = (60 + ci * 120) * spreadMul;
                break;
        }
        ripples.push(rp);
    }

    // vocal ripple trigger (purple, smaller, medium speed)
    if (vTrig && drawKTVBars._vCd <= 0) {
        drawKTVBars._vCd = 10;  // vocal cooldown
        let vHue = 275 + (a.centroid - 0.4) * 20 + (Math.random() - 0.5) * 8;
        let vIntensity = Math.max(0.08, vocalEnergy * 1.5);
        let rp = { r: (30 + coreIntensity * 180) * coreMul * 0.15, intensity: vIntensity,
            hue: vHue, life: 0, _colorOffset: 0,
            speed: (0.8 + vRise * 6) * spdMul,
            maxLife: (70 + vocalEnergy * 180) * spreadMul };
        ripples.push(rp);
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
        let rp = ripples[i];
        rp.life++;
        rp.r += rp.speed;
        if (rp.life > rp.maxLife || rp.r > maxR * 1.15) {
            ripples.splice(i, 1);
        }
    }

    for (let ri of ripples) {
        let progress = ri.life / ri.maxLife;
        let alpha, ringW, hueShift;

        switch (sub) {
            case 0:
                alpha = (1 - progress * progress) * ri.intensity;
                if (alpha < 0.005) continue;
                hueShift = progress * 130;
                ringW = (25 + ri.intensity * 60) + progress * (50 + ri.intensity * 120);
                break;
            case 1:
                alpha = Math.pow(1 - progress, 1.4) * ri.intensity * 1.2;
                if (alpha < 0.004) continue;
                hueShift = progress * 80;
                ringW = (35 + ri.intensity * 90) + progress * 30;
                break;
            case 2:
                alpha = Math.cos(progress * Math.PI / 2) * ri.intensity;
                if (alpha < 0.003) continue;
                hueShift = progress * 50;
                ringW = (50 + ri.intensity * 100) + progress * 150;
                break;
            case 3:
                alpha = (1 - progress * progress * progress) * ri.intensity;
                if (alpha < 0.004) continue;
                hueShift = progress * 200;
                ringW = (12 + ri.intensity * 30) + progress * 30;
                break;
        }

        let hueNow = (ri.hue + ri._colorOffset + hueShift) % 360;
        if (alpha <= 0 || ringW <= 0) continue;

        let innerR = Math.max(0, ri.r - ringW / 2);
        let outerR = ri.r + ringW / 2;
        if (outerR <= 0) continue;

        let grad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
        grad.addColorStop(0, "transparent");
        grad.addColorStop(0.35, `hsla(${cHue(hueNow)}, ${cSat(80)}%, 65%, ${alpha * 0.5})`);
        grad.addColorStop(0.5, `hsla(${cHue(hueNow)}, ${cSat(90)}%, 75%, ${alpha})`);
        grad.addColorStop(0.65, `hsla(${cHue(hueNow)}, ${cSat(80)}%, 55%, ${alpha * 0.5})`);
        grad.addColorStop(1, "transparent");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
        if (innerR > 0) {
            ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
        }
        ctx.fill();
    }

    ctx.restore();
}

function animate() {
    cancelAnimationFrame(M);

    const fluidMode = y.KTV_CHECK && y.KTV_STYLE === 2;
    if (fluidMode) {
        if (typeof fluidStart === 'function') fluidStart();
        L.clearRect(0, 0, m, N);
    } else {
        if (typeof fluidStop === 'function') fluidStop();
        L.fillStyle = "rgba(0,0,0,1)";
        L.fillRect(0,0,m,N);
    }

    if(y.BACKGROUND_CHECK && D.image) L.drawImage(D.image, D.x, D.y, D.w, D.h);

    if (y.PARTICLE_CHECK) {
        L.fillStyle = y.PARTICLE_COLOR;
        L.beginPath();
        for(let i=0; i<y.PARTICLE_NUM; i++){
            let pt = p[i];
            pt.pastZ = pt.z;
            pt.z -= P;
            if(pt.z <= 0){ v(pt); continue; }
            let scale = 200 / pt.z;
            let pastScale = 200 / pt.pastZ;
            let x2 = R + (pt.x - R) * scale;
            let y2 = x + (pt.y - x) * scale;
            let r2 = y.PARTICLE_BASE_RADIUS * scale;
            let x1 = R + (pt.x - R) * pastScale;
            let y1 = x + (pt.y - x) * pastScale;
            let r1 = y.PARTICLE_BASE_RADIUS * pastScale;

            L.moveTo(x1, y1);
            L.arc(x1, y1, r1, 0, Math.PI*2);
            L.lineTo(x2 + r2, y2);
            L.arc(x2, y2, r2, 0, Math.PI*2);
        }
        L.fill();
    }

    drawKTVBars();

    M = requestAnimationFrame(animate);
}

function pulseInitRing() {
    if (y.KTV_STYLE === 2) {
        if (typeof fluidSplatAtCenter === 'function') fluidSplatAtCenter(0.12);
        return;
    }
    ripples.push({ r: (30 + 0.2 * 180) * y.KTV_CORE_SIZE * 0.21, intensity: 0.2, hue: 210, life: 0, speed: 5, maxLife: 250 });
}

resize();
resetParticles();
updateHUDVisibility();
updateHUDTitles();
updateLoadingText();
pulseInitRing();
animate();
