"use strict";

const i18nStrings = {
    zh: {
        "hud.cpu": "CPU",
        "hud.mem": "内存 RAM",
        "hud.disk": "磁盘 DISK",
        "hud.gpu": "GPU",
        "hud.net": "网络 NET",
        "hud.clock": "时钟 CLOCK",
        "tick.used": "已用"
    },
    en: {
        "hud.cpu": "CPU",
        "hud.mem": "RAM",
        "hud.disk": "DISK",
        "hud.gpu": "GPU",
        "hud.net": "NET",
        "hud.clock": "CLOCK",
        "tick.used": "Used"
    }
};

let currentLang = "zh";

function t(key) {
    return (i18nStrings[currentLang] && i18nStrings[currentLang][key])
        || (i18nStrings.zh && i18nStrings.zh[key])
        || key;
}

function setLang(langCode) {
    if (i18nStrings[langCode]) {
        currentLang = langCode;
    }
}

function updateHUDTitles() {
    const elCpu = document.getElementById("hud-title-cpu");
    const elMem = document.getElementById("hud-title-mem");
    const elDisk = document.getElementById("hud-title-disk");
    const elGpu = document.getElementById("hud-title-gpu");
    const elNet = document.getElementById("hud-title-net");
    const elClock = document.getElementById("hud-title-clock");
    if (elCpu) elCpu.textContent = t("hud.cpu");
    if (elMem) elMem.textContent = t("hud.mem");
    if (elDisk) elDisk.textContent = t("hud.disk");
    if (elGpu) elGpu.textContent = t("hud.gpu");
    if (elNet) elNet.textContent = t("hud.net");
    if (elClock) elClock.textContent = t("hud.clock");
}
