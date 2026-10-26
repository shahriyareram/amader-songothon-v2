"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_vite = require("vite");
var import_app = require("firebase-admin/app");
var import_auth = require("firebase-admin/auth");
var import_messaging = require("firebase-admin/messaging");
var import_app2 = require("firebase/app");
var import_firestore = require("firebase/firestore");
var import_fs = __toESM(require("fs"), 1);

// src/utils/bengali.ts
var bengaliDigits = ["\u09E6", "\u09E7", "\u09E8", "\u09E9", "\u09EA", "\u09EB", "\u09EC", "\u09ED", "\u09EE", "\u09EF"];
function toBengaliNumber(val) {
  if (val === void 0 || val === null) return "\u09E6";
  const str = val.toString();
  return str.replace(/\d/g, (digit) => bengaliDigits[parseInt(digit, 10)]);
}
function parseDateToDhakaParts(dateInput) {
  if (!dateInput) {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      weekday: "short"
    });
    const parts = formatter.formatToParts(/* @__PURE__ */ new Date());
    const year = parseInt(parts.find((p) => p.type === "year").value, 10);
    const month = parseInt(parts.find((p) => p.type === "month").value, 10);
    const day = parseInt(parts.find((p) => p.type === "day").value, 10);
    const weekdayStr = parts.find((p) => p.type === "weekday").value;
    const daysMap = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6
    };
    const dayOfWeek = daysMap[weekdayStr] ?? 0;
    const dateString = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return { year, month, day, dayOfWeek, dateString };
  }
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) {
      return parseDateToDhakaParts();
    }
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      weekday: "short"
    });
    const parts = formatter.formatToParts(dateInput);
    const year = parseInt(parts.find((p) => p.type === "year").value, 10);
    const month = parseInt(parts.find((p) => p.type === "month").value, 10);
    const day = parseInt(parts.find((p) => p.type === "day").value, 10);
    const weekdayStr = parts.find((p) => p.type === "weekday").value;
    const daysMap = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6
    };
    const dayOfWeek = daysMap[weekdayStr] ?? 0;
    const dateString = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return { year, month, day, dayOfWeek, dateString };
  }
  if (typeof dateInput === "string") {
    const clean = dateInput.trim();
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(clean)) {
      const parts = clean.split(/[-/T ]/);
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      const dt = new Date(Date.UTC(year, month - 1, day));
      const dayOfWeek = dt.getUTCDay();
      const dateString = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return { year, month, day, dayOfWeek, dateString };
    }
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(clean)) {
      const parts = clean.split(/[-/T ]/);
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      const dt = new Date(Date.UTC(year, month - 1, day));
      const dayOfWeek = dt.getUTCDay();
      const dateString = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return { year, month, day, dayOfWeek, dateString };
    }
    const dObj = new Date(clean);
    if (!isNaN(dObj.getTime())) {
      return parseDateToDhakaParts(dObj);
    }
  }
  return parseDateToDhakaParts();
}
function getCurrentWeekNumber(dateInput) {
  const parts = parseDateToDhakaParts(dateInput);
  const targetUtc = Date.UTC(parts.year, parts.month - 1, parts.day);
  const startUtc = Date.UTC(2026, 2, 27);
  const diffMs = targetUtc - startUtc;
  const diffDays = Math.floor(diffMs / (1e3 * 60 * 60 * 24));
  const rawWeek = Math.floor(diffDays / 7) + 1;
  const cycleWeek = ((rawWeek - 1) % 52 + 52) % 52 + 1;
  return cycleWeek;
}

// src/utils/calculations.ts
function processMember52Weeks(member, currentWeek, _weeklyTarget = 100) {
  const targetPerWeek = 100;
  const MAX_WEEKS = 52;
  const MAX_CYCLE_AMOUNT = MAX_WEEKS * targetPerWeek;
  const safeCurrentWeek = Math.min(MAX_WEEKS, Math.max(1, currentWeek));
  if (!member) {
    const emptySummary = {
      totalTargetUpToCurrent: 0,
      totalPaid: 0,
      totalDue: 0,
      advanceAmount: 0,
      isDefaulter: false,
      dueWeeksCount: 0,
      paidWeeksCount: 0,
      currentWeekPaid: false,
      currentWeekAmount: 0
    };
    return {
      summary: emptySummary,
      all52Weeks: [],
      totalWeeksCount: MAX_WEEKS,
      paidWeeksCount: 0,
      dueWeeksCount: 0,
      totalDeposit: 0,
      totalAdvance: 0,
      totalDue: 0,
      remainingWeeksCount: Math.max(0, MAX_WEEKS - safeCurrentWeek),
      paidPercentage: 0
    };
  }
  const records = Array.isArray(member.weeklyRecords) ? member.weeklyRecords : [];
  const recordsByWeek = /* @__PURE__ */ new Map();
  records.forEach((r) => {
    if (r && typeof r.weekNumber === "number" && r.weekNumber >= 1 && r.weekNumber <= MAX_WEEKS) {
      recordsByWeek.set(r.weekNumber, r);
    }
  });
  const usableRecords = records.filter(
    (r) => r && typeof r.weekNumber === "number" && r.weekNumber >= 1 && r.weekNumber <= MAX_WEEKS
  );
  const hasUsableRecords = usableRecords.length > 0;
  const fallbackPaidWeeks = hasUsableRecords ? 0 : Math.min(MAX_WEEKS, Math.floor((Number(member.totalDeposited) || 0) / targetPerWeek));
  const all52Weeks = [];
  let currentWeekAmount = 0;
  let currentWeekPaid = false;
  for (let w = 1; w <= safeCurrentWeek; w++) {
    const rec = recordsByWeek.get(w);
    const paymentDate = rec?.paymentDate ? String(rec.paymentDate).trim() : void 0;
    const paymentMethod = rec?.paymentMethod || "cash";
    const receiptNo = rec?.receiptNo;
    const notes = rec?.notes;
    const isExplicitDue = rec && (rec.status === "due" || Number(rec.paidAmount) === 0 && !rec.paymentDate && Number(rec.dueAmount) > 0);
    const isWeekPaid = hasUsableRecords ? Boolean(rec && !isExplicitDue && (rec.status === "paid" || rec.status === "advance" || Number(rec.paidAmount) > 0)) : w <= fallbackPaidWeeks;
    if (isWeekPaid) {
      all52Weeks.push({
        weekNumber: w,
        targetAmount: targetPerWeek,
        paidAmount: targetPerWeek,
        // ALWAYS ৳100
        dueAmount: 0,
        paymentDate,
        status: "paid",
        statusLabel: "\u099C\u09AE\u09BE \u09B9\u09DF\u09C7\u099B\u09C7",
        paymentMethod,
        receiptNo,
        notes
      });
      if (w === safeCurrentWeek) {
        currentWeekAmount = targetPerWeek;
        currentWeekPaid = true;
      }
    } else {
      all52Weeks.push({
        weekNumber: w,
        targetAmount: targetPerWeek,
        paidAmount: 0,
        dueAmount: targetPerWeek,
        // ALWAYS ৳100
        paymentDate: void 0,
        status: "due",
        statusLabel: "\u09AC\u0995\u09C7\u09DF\u09BE",
        paymentMethod,
        receiptNo: void 0,
        notes
      });
      if (w === safeCurrentWeek) {
        currentWeekAmount = 0;
        currentWeekPaid = false;
      }
    }
  }
  for (let w = safeCurrentWeek + 1; w <= MAX_WEEKS; w++) {
    const rec = recordsByWeek.get(w);
    const paymentDate = rec?.paymentDate ? String(rec.paymentDate).trim() : void 0;
    const paymentMethod = rec?.paymentMethod || "cash";
    const receiptNo = rec?.receiptNo;
    const notes = rec?.notes;
    const isExplicitFuturePaid = hasUsableRecords ? Boolean(rec && rec.status !== "due" && (rec.status === "advance" || rec.status === "paid" || Number(rec.paidAmount) > 0)) : w <= fallbackPaidWeeks;
    if (isExplicitFuturePaid) {
      all52Weeks.push({
        weekNumber: w,
        targetAmount: targetPerWeek,
        paidAmount: targetPerWeek,
        // ALWAYS ৳100
        dueAmount: 0,
        paymentDate,
        status: "advance",
        statusLabel: "\u0985\u0997\u09CD\u09B0\u09BF\u09AE \u099C\u09AE\u09BE",
        paymentMethod,
        receiptNo,
        notes
      });
    } else {
      all52Weeks.push({
        weekNumber: w,
        targetAmount: targetPerWeek,
        paidAmount: 0,
        dueAmount: 0,
        paymentDate: void 0,
        status: "upcoming",
        statusLabel: "\u09AC\u09BE\u0995\u09BF \u09B8\u09AA\u09CD\u09A4\u09BE\u09B9",
        paymentMethod,
        receiptNo: void 0,
        notes
      });
    }
  }
  const paidWeeksCount = all52Weeks.filter((w) => w.status === "paid" || w.status === "advance").length;
  const totalDeposit = Math.min(MAX_CYCLE_AMOUNT, paidWeeksCount * targetPerWeek);
  const dueWeeksCount = all52Weeks.filter((w) => w.weekNumber <= safeCurrentWeek && w.status === "due").length;
  const totalDue = dueWeeksCount * targetPerWeek;
  const advanceWeeksCount = all52Weeks.filter((w) => w.weekNumber > safeCurrentWeek && w.status === "advance").length;
  const totalAdvance = advanceWeeksCount * targetPerWeek;
  const required = safeCurrentWeek * targetPerWeek;
  const isDefaulter = totalDue > 0;
  const remainingWeeksCount = Math.max(0, MAX_WEEKS - safeCurrentWeek - advanceWeeksCount);
  const paidPercentage = Math.min(100, Math.round(paidWeeksCount / MAX_WEEKS * 100));
  const summary = {
    totalTargetUpToCurrent: required,
    totalPaid: totalDeposit,
    totalDue,
    advanceAmount: totalAdvance,
    isDefaulter,
    dueWeeksCount,
    paidWeeksCount,
    currentWeekPaid,
    currentWeekAmount
  };
  return {
    summary,
    all52Weeks,
    totalWeeksCount: MAX_WEEKS,
    paidWeeksCount,
    dueWeeksCount,
    totalDeposit,
    totalAdvance,
    totalDue,
    remainingWeeksCount,
    paidPercentage
  };
}

// src/utils/notificationMessageHelper.ts
function formatWeekNumbersList(weeks) {
  if (!weeks || weeks.length === 0) return "";
  const sorted = Array.from(new Set(weeks)).sort((a, b) => a - b);
  const bnWeeks = sorted.map((w) => toBengaliNumber(w));
  if (bnWeeks.length === 1) {
    return `${bnWeeks[0]} \u09A4\u09AE`;
  }
  if (bnWeeks.length === 2) {
    return `${bnWeeks[0]} \u0993 ${bnWeeks[1]} \u09A4\u09AE`;
  }
  const allExceptLastTwo = bnWeeks.slice(0, bnWeeks.length - 2);
  const secondLast = bnWeeks[bnWeeks.length - 2];
  const last = bnWeeks[bnWeeks.length - 1];
  return `${allExceptLastTwo.join(", ")}, ${secondLast} \u0993 ${last} \u09A4\u09AE`;
}
function buildWeeklyPaymentNotificationMessage(params) {
  const clearedArrears = (params.clearedArrearWeeks || []).filter((w) => w > 0).sort((a, b) => a - b);
  const remainingDue = (params.remainingDueWeeks || []).filter((w) => w > 0).sort((a, b) => a - b);
  const advance = (params.advanceWeeks || []).filter((w) => w > 0).sort((a, b) => a - b);
  const currentWeekPaid = Boolean(params.currentWeekPaid);
  const hasCleared = clearedArrears.length > 0;
  const hasRemaining = remainingDue.length > 0;
  const hasAdvance = advance.length > 0;
  if (hasCleared && currentWeekPaid && hasAdvance) {
    const clearedStr = formatWeekNumbersList(clearedArrears);
    const advanceStr = formatWeekNumbersList(advance);
    return `\u0986\u09AA\u09A8\u09BE\u09B0 ${clearedStr} \u09B8\u09AA\u09CD\u09A4\u09BE\u09B9\u09C7\u09B0 \u09AC\u0995\u09C7\u09AF\u09BC\u09BE \u09AA\u09B0\u09BF\u09B6\u09CB\u09A7 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7 \u098F\u09AC\u0982 \u099A\u09B2\u09A4\u09BF \u09B8\u09AA\u09CD\u09A4\u09BE\u09B9\u09C7\u09B0 \u099C\u09AE\u09BE\u09B8\u09B9 ${advanceStr} \u09B8\u09AA\u09CD\u09A4\u09BE\u09B9\u09C7\u09B0 \u0985\u0997\u09CD\u09B0\u09BF\u09AE \u099C\u09AE\u09BE \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964 \u09B8\u09BE\u09A5\u09C7 \u09A5\u09BE\u0995\u09BE\u09B0 \u099C\u09A8\u09CD\u09AF \u09A7\u09A8\u09CD\u09AF\u09AC\u09BE\u09A6\u0964`;
  }
  if (hasCleared && currentWeekPaid && !hasAdvance) {
    const clearedStr = formatWeekNumbersList(clearedArrears);
    return `\u0986\u09AA\u09A8\u09BE\u09B0 ${clearedStr} \u09B8\u09AA\u09CD\u09A4\u09BE\u09B9\u09C7\u09B0 \u09AC\u0995\u09C7\u09AF\u09BC\u09BE \u09AA\u09B0\u09BF\u09B6\u09CB\u09A7 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7 \u098F\u09AC\u0982 \u099A\u09B2\u09A4\u09BF \u09B8\u09AA\u09CD\u09A4\u09BE\u09B9\u09C7\u09B0 \u099C\u09AE\u09BE \u09AF\u09CB\u0997 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964 \u09B8\u09BE\u09A5\u09C7 \u09A5\u09BE\u0995\u09BE\u09B0 \u099C\u09A8\u09CD\u09AF \u09A7\u09A8\u09CD\u09AF\u09AC\u09BE\u09A6\u0964`;
  }
  if (!hasCleared && currentWeekPaid && hasAdvance) {
    const advanceStr = formatWeekNumbersList(advance);
    return `\u0986\u09AA\u09A8\u09BE\u09B0 \u099A\u09B2\u09A4\u09BF \u09B8\u09AA\u09CD\u09A4\u09BE\u09B9\u09C7\u09B0 \u099C\u09AE\u09BE\u09B8\u09B9 ${advanceStr} \u09B8\u09AA\u09CD\u09A4\u09BE\u09B9\u09C7\u09B0 \u0985\u0997\u09CD\u09B0\u09BF\u09AE \u099C\u09AE\u09BE \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964 \u09B8\u09BE\u09A5\u09C7 \u09A5\u09BE\u0995\u09BE\u09B0 \u099C\u09A8\u09CD\u09AF \u09A7\u09A8\u09CD\u09AF\u09AC\u09BE\u09A6\u0964`;
  }
  if (hasCleared && !currentWeekPaid && hasAdvance) {
    const clearedStr = formatWeekNumbersList(clearedArrears);
    const advanceStr = formatWeekNumbersList(advance);
    return `\u0986\u09AA\u09A8\u09BE\u09B0 ${clearedStr} \u09B8\u09AA\u09CD\u09A4\u09BE\u09B9\u09C7\u09B0 \u09AC\u0995\u09C7\u09AF\u09BC\u09BE \u09AA\u09B0\u09BF\u09B6\u09CB\u09A7 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7 \u098F\u09AC\u0982 ${advanceStr} \u09B8\u09AA\u09CD\u09A4\u09BE\u09B9\u09C7\u09B0 \u0985\u0997\u09CD\u09B0\u09BF\u09AE \u099C\u09AE\u09BE \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964 \u09B8\u09BE\u09A5\u09C7 \u09A5\u09BE\u0995\u09BE\u09B0 \u099C\u09A8\u09CD\u09AF \u09A7\u09A8\u09CD\u09AF\u09AC\u09BE\u09A6\u0964`;
  }
  if (hasCleared && hasRemaining) {
    const clearedStr = formatWeekNumbersList(clearedArrears);
    const dueStr = formatWeekNumbersList(remainingDue);
    if (currentWeekPaid) {
      return `\u0986\u09AA\u09A8\u09BE\u09B0 ${clearedStr} \u09B8\u09AA\u09CD\u09A4\u09BE\u09B9\u09C7\u09B0 \u09AC\u0995\u09C7\u09AF\u09BC\u09BE \u09AA\u09B0\u09BF\u09B6\u09CB\u09A7 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7 \u098F\u09AC\u0982 \u099A\u09B2\u09A4\u09BF \u09B8\u09AA\u09CD\u09A4\u09BE\u09B9\u09C7\u09B0 \u099C\u09AE\u09BE \u09AF\u09CB\u0997 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964 \u09A4\u09AC\u09C7 ${dueStr} \u09B8\u09AA\u09CD\u09A4\u09BE\u09B9\u09C7\u09B0 \u099F\u09BE\u0995\u09BE \u09AC\u0995\u09C7\u09AF\u09BC\u09BE \u09B0\u09AF\u09BC\u09C7\u099B\u09C7\u0964`;
    }
    return `\u0986\u09AA\u09A8\u09BE\u09B0 ${clearedStr} \u09B8\u09AA\u09CD\u09A4\u09BE\u09B9\u09C7\u09B0 \u09AC\u0995\u09C7\u09AF\u09BC\u09BE \u09AA\u09B0\u09BF\u09B6\u09CB\u09A7 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964 ${dueStr} \u09B8\u09AA\u09CD\u09A4\u09BE\u09B9\u09C7\u09B0 \u099F\u09BE\u0995\u09BE \u09AC\u0995\u09C7\u09AF\u09BC\u09BE \u09B0\u09AF\u09BC\u09C7\u099B\u09C7\u0964`;
  }
  if (hasCleared && !currentWeekPaid && !hasAdvance && !hasRemaining) {
    const clearedStr = formatWeekNumbersList(clearedArrears);
    return `\u0986\u09AA\u09A8\u09BE\u09B0 ${clearedStr} \u09B8\u09AA\u09CD\u09A4\u09BE\u09B9\u09C7\u09B0 \u09AC\u0995\u09C7\u09AF\u09BC\u09BE \u09AA\u09B0\u09BF\u09B6\u09CB\u09A7 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964 \u09B8\u09BE\u09A5\u09C7 \u09A5\u09BE\u0995\u09BE\u09B0 \u099C\u09A8\u09CD\u09AF \u09A7\u09A8\u09CD\u09AF\u09AC\u09BE\u09A6\u0964`;
  }
  if (!hasCleared && currentWeekPaid && !hasAdvance && !hasRemaining) {
    return "\u0986\u09AA\u09A8\u09BE\u09B0 \u099A\u09B2\u09A4\u09BF \u09B8\u09AA\u09CD\u09A4\u09BE\u09B9\u09C7\u09B0 \u099C\u09AE\u09BE \u09AF\u09CB\u0997 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964 \u09B8\u09BE\u09A5\u09C7 \u09A5\u09BE\u0995\u09BE\u09B0 \u099C\u09A8\u09CD\u09AF \u09A7\u09A8\u09CD\u09AF\u09AC\u09BE\u09A6\u0964";
  }
  if (hasAdvance && !hasCleared && !currentWeekPaid && !hasRemaining) {
    const advanceStr = formatWeekNumbersList(advance);
    return `\u0986\u09AA\u09A8\u09BE\u09B0 ${advanceStr} \u09B8\u09AA\u09CD\u09A4\u09BE\u09B9\u09C7\u09B0 \u0985\u0997\u09CD\u09B0\u09BF\u09AE \u099C\u09AE\u09BE \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964 \u09B8\u09BE\u09A5\u09C7 \u09A5\u09BE\u0995\u09BE\u09B0 \u099C\u09A8\u09CD\u09AF \u09A7\u09A8\u09CD\u09AF\u09AC\u09BE\u09A6\u0964`;
  }
  if (hasRemaining && !hasCleared && !currentWeekPaid && !hasAdvance) {
    const dueStr = formatWeekNumbersList(remainingDue);
    return `\u0986\u09AA\u09A8\u09BE\u09B0 ${dueStr} \u09B8\u09AA\u09CD\u09A4\u09BE\u09B9\u09C7\u09B0 \u099F\u09BE\u0995\u09BE \u09AC\u0995\u09C7\u09AF\u09BC\u09BE \u09B0\u09AF\u09BC\u09C7\u099B\u09C7\u0964 \u09A8\u09BF\u09B0\u09CD\u09A6\u09BF\u09B7\u09CD\u099F \u09B8\u09AE\u09AF\u09BC\u09C7 \u0986\u09AA\u09A8\u09BE\u09B0 \u099F\u09BE\u0995\u09BE \u099C\u09AE\u09BE \u09A6\u09BF\u09A8\u0964`;
  }
  if (hasAdvance && hasRemaining) {
    const advanceStr = formatWeekNumbersList(advance);
    const dueStr = formatWeekNumbersList(remainingDue);
    return `\u0986\u09AA\u09A8\u09BE\u09B0 ${advanceStr} \u09B8\u09AA\u09CD\u09A4\u09BE\u09B9\u09C7\u09B0 \u099F\u09BE\u0995\u09BE \u0985\u0997\u09CD\u09B0\u09BF\u09AE \u099C\u09AE\u09BE \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964 \u09A4\u09AC\u09C7 ${dueStr} \u09B8\u09AA\u09CD\u09A4\u09BE\u09B9\u09C7\u09B0 \u099F\u09BE\u0995\u09BE \u09AC\u0995\u09C7\u09AF\u09BC\u09BE \u09B0\u09AF\u09BC\u09C7\u099B\u09C7\u0964`;
  }
  return "\u0986\u09AA\u09A8\u09BE\u09B0 \u099C\u09AE\u09BE\u09B0 \u09A4\u09A5\u09CD\u09AF \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u09B8\u0982\u09B0\u0995\u09CD\u09B7\u09BF\u09A4 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964 \u09B8\u09BE\u09A5\u09C7 \u09A5\u09BE\u0995\u09BE\u09B0 \u099C\u09A8\u09CD\u09AF \u09A7\u09A8\u09CD\u09AF\u09AC\u09BE\u09A6\u0964";
}
function getWeeklyPaymentNotificationTitle(params) {
  const clearedArrears = (params.clearedArrearWeeks || []).filter((w) => w > 0);
  const remainingDue = (params.remainingDueWeeks || []).filter((w) => w > 0);
  const advance = (params.advanceWeeks || []).filter((w) => w > 0);
  const currentWeekPaid = Boolean(params.currentWeekPaid);
  if (remainingDue.length > 0 && clearedArrears.length === 0 && !currentWeekPaid) {
    return "\u09B8\u09BE\u09AA\u09CD\u09A4\u09BE\u09B9\u09BF\u0995 \u099C\u09AE\u09BE \u09AC\u0995\u09C7\u09AF\u09BC\u09BE \u09B0\u09AF\u09BC\u09C7\u099B\u09C7";
  }
  if (advance.length > 0 && clearedArrears.length === 0 && remainingDue.length === 0 && !currentWeekPaid) {
    return "\u0985\u0997\u09CD\u09B0\u09BF\u09AE \u099C\u09AE\u09BE \u09B8\u09AB\u09B2 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7";
  }
  return "\u09B8\u09BE\u09AA\u09CD\u09A4\u09BE\u09B9\u09BF\u0995 \u099C\u09AE\u09BE \u09B8\u09AB\u09B2 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7";
}
function deriveNotificationTitleFromMessage(message) {
  const text = (message || "").trim();
  if (!text) return "\u09B8\u09BE\u09AA\u09CD\u09A4\u09BE\u09B9\u09BF\u0995 \u099C\u09AE\u09BE \u09B8\u09AB\u09B2 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7";
  const isPureDue = (text.includes("\u09AC\u0995\u09C7\u09AF\u09BC\u09BE \u09B0\u09AF\u09BC\u09C7\u099B\u09C7") || text.includes("\u09AC\u0995\u09C7\u09DF\u09BE \u09B0\u09DF\u09C7\u099B\u09C7") || text.includes("\u099F\u09BE\u0995\u09BE \u098F\u0996\u09A8\u0993 \u099C\u09AE\u09BE \u09B9\u09AF\u09BC\u09A8\u09BF") || text.includes("\u09AC\u0995\u09C7\u09DF\u09BE \u09AA\u09B0\u09BF\u09B6\u09CB\u09A7 \u0995\u09B0\u09C1\u09A8") || text.includes("\u09AC\u0995\u09C7\u09AF\u09BC\u09BE \u09AA\u09B0\u09BF\u09B6\u09CB\u09A7 \u0995\u09B0\u09C1\u09A8")) && !text.includes("\u09AC\u0995\u09C7\u09AF\u09BC\u09BE \u09AA\u09B0\u09BF\u09B6\u09CB\u09A7 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7") && !text.includes("\u09AC\u0995\u09C7\u09DF\u09BE \u09AA\u09B0\u09BF\u09B6\u09CB\u09A7 \u09B9\u09DF\u09C7\u099B\u09C7");
  if (isPureDue) {
    return "\u09B8\u09BE\u09AA\u09CD\u09A4\u09BE\u09B9\u09BF\u0995 \u099C\u09AE\u09BE \u09AC\u0995\u09C7\u09AF\u09BC\u09BE \u09B0\u09AF\u09BC\u09C7\u099B\u09C7";
  }
  const isAdvance = (text.includes("\u0985\u0997\u09CD\u09B0\u09BF\u09AE \u099C\u09AE\u09BE \u09B9\u09AF\u09BC\u09C7\u099B\u09C7") || text.includes("\u0985\u0997\u09CD\u09B0\u09BF\u09AE \u099C\u09AE\u09BE \u0986\u099B\u09C7")) && !text.includes("\u09AC\u0995\u09C7\u09AF\u09BC\u09BE") && !text.includes("\u09AC\u0995\u09C7\u09DF\u09BE");
  if (isAdvance) {
    return "\u0985\u0997\u09CD\u09B0\u09BF\u09AE \u099C\u09AE\u09BE \u09B8\u09AB\u09B2 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7";
  }
  return "\u09B8\u09BE\u09AA\u09CD\u09A4\u09BE\u09B9\u09BF\u0995 \u099C\u09AE\u09BE \u09B8\u09AB\u09B2 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7";
}

// server.ts
var bnToEnMap = {
  "\u09E6": "0",
  "\u09E7": "1",
  "\u09E8": "2",
  "\u09E9": "3",
  "\u09EA": "4",
  "\u09EB": "5",
  "\u09EC": "6",
  "\u09ED": "7",
  "\u09EE": "8",
  "\u09EF": "9"
};
var configPath = import_path.default.join(process.cwd(), "firebase-applet-config.json");
var firebaseConfig = {};
try {
  firebaseConfig = JSON.parse(import_fs.default.readFileSync(configPath, "utf-8"));
} catch (e) {
  console.warn("Could not read firebase-applet-config.json:", e);
}
var ADMIN_FIREBASE_UID = "2YNWowSVMrPBf8HwLlitJcJuMum2";
var AUTHORIZED_ADMIN_EMAILS = [
  "shahriyareram3@gmail.com",
  "shahriyareram94@gmail.com",
  "01907006460@ourorganization.local"
];
var GMAIL_OAUTH_CLIENT_ID = process.env.VITE_GOOGLE_OAUTH_CLIENT_ID || "511488965421-2h52lrf2d7r6at5e6nugi7mct1lmqpfe.apps.googleusercontent.com";
var adminAuthInstance = null;
var adminMessagingInstance = null;
try {
  if ((0, import_app.getApps)().length === 0) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      (0, import_app.initializeApp)({
        credential: (0, import_app.cert)(sa),
        projectId: firebaseConfig.projectId
      });
      console.log("Firebase Admin SDK initialized with service account.");
    } else {
      (0, import_app.initializeApp)({
        projectId: firebaseConfig.projectId
      });
      console.log("Firebase Admin SDK initialized with project ID:", firebaseConfig.projectId);
    }
  }
  adminAuthInstance = (0, import_auth.getAuth)();
  try {
    adminMessagingInstance = (0, import_messaging.getMessaging)();
  } catch (mErr) {
    console.warn("Firebase Admin Messaging initialization note:", mErr);
  }
} catch (e) {
  console.warn("Firebase Admin SDK initialization note:", e?.message || e);
}
var clientDb = null;
try {
  const clientApp = (0, import_app2.getApps)().length === 0 ? (0, import_app2.initializeApp)(firebaseConfig) : (0, import_app2.getApps)()[0];
  clientDb = (0, import_firestore.initializeFirestore)(
    clientApp,
    { experimentalForceLongPolling: true },
    firebaseConfig.firestoreDatabaseId
  );
} catch (e) {
  console.warn("Server Firebase client initialization note:", e?.message || e);
}
function generateSecureTempPassword() {
  const uppers = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowers = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*";
  const allChars = uppers + lowers + digits + symbols;
  const bytes = import_crypto.default.randomBytes(12);
  const result = [
    uppers[bytes[0] % uppers.length],
    lowers[bytes[1] % lowers.length],
    digits[bytes[2] % digits.length],
    symbols[bytes[3] % symbols.length]
  ];
  for (let i = 4; i < 10; i++) {
    result.push(allChars[bytes[i] % allChars.length]);
  }
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result.join("");
}
function phoneToInternalEmail(phone) {
  const cleanDigits = phone.replace(/[০-৯]/g, (d) => bnToEnMap[d] || d).replace(/\D/g, "");
  let normalized = cleanDigits;
  if (normalized.startsWith("880")) {
    normalized = "0" + normalized.slice(3);
  } else if (normalized.startsWith("88")) {
    normalized = normalized.slice(2);
  }
  return `${normalized}@ourorganization.local`;
}
var SESSION_SECRET = process.env.SESSION_SECRET || "amader_shongothon_org_secure_secret_key_2026";
function hashPassword(password) {
  const salt = import_crypto.default.randomBytes(16).toString("hex");
  const hash = import_crypto.default.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  try {
    const hash = import_crypto.default.scryptSync(password, salt, 64).toString("hex");
    return import_crypto.default.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(key, "hex"));
  } catch {
    return false;
  }
}
function formatFirebaseAuthPassword(raw) {
  if (raw && raw.length < 6) {
    return `org_${raw}_auth`;
  }
  return raw;
}
function createSessionToken(payload) {
  const data = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 3600 * 1e3 })
  ).toString("base64url");
  const sig = import_crypto.default.createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}
function verifySessionToken(token) {
  try {
    const [data, sig] = token.split(".");
    if (!data || !sig) return null;
    const expectedSig = import_crypto.default.createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");
    if (!import_crypto.default.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
function createRecoveryToken(payload, expiresInMs = 15 * 60 * 1e3) {
  const data = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + expiresInMs })
  ).toString("base64url");
  const sig = import_crypto.default.createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}
function verifyRecoveryToken(token) {
  return verifySessionToken(token);
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = Number(process.env.PORT) || 3e3;
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
    res.setHeader("Vary", "Origin");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, Accept, Origin"
    );
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });
  app.use(import_express.default.json({ limit: "35mb" }));
  app.use(import_express.default.urlencoded({ extended: true, limit: "35mb" }));
  const uploadsDir = import_path.default.join(process.cwd(), "public", "uploads");
  if (!import_fs.default.existsSync(uploadsDir)) {
    import_fs.default.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use("/uploads", import_express.default.static(uploadsDir, {
    maxAge: "1d",
    setHeaders: (res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
  }));
  app.get(["/api/assets/splash-logo", "/api/assets/splash-logo.png", "/api/assets/splash-logo.jpg", "/api/assets/splash-logo.jpeg"], async (req, res) => {
    try {
      const localPng = import_path.default.join(uploadsDir, "splash-logo.png");
      const localJpg = import_path.default.join(uploadsDir, "splash-logo.jpg");
      let targetFile = "";
      let contentType = "image/png";
      if (import_fs.default.existsSync(localPng)) {
        targetFile = localPng;
        contentType = "image/png";
      } else if (import_fs.default.existsSync(localJpg)) {
        targetFile = localJpg;
        contentType = "image/jpeg";
      }
      if (targetFile) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
        return import_fs.default.createReadStream(targetFile).pipe(res);
      }
      if (clientDb) {
        try {
          const metaDocRef = (0, import_firestore.doc)(clientDb, "appAssets", "splashLogo");
          const metaSnap = await (0, import_firestore.getDoc)(metaDocRef);
          if (metaSnap.exists()) {
            const meta = metaSnap.data();
            if (!meta.deleted) {
              const mime = meta.mimeType || "image/png";
              const totalChunks = meta.totalChunks || 1;
              let fullBase64 = "";
              if (totalChunks <= 1 && meta.data) {
                fullBase64 = meta.data;
              } else {
                const chunksCol = (0, import_firestore.collection)(clientDb, "appAssets", "splashLogo", "chunks");
                const chunksSnap = await (0, import_firestore.getDocs)(chunksCol);
                const chunkDocs = chunksSnap.docs.map((d) => d.data()).sort((a, b) => (a.index || 0) - (b.index || 0));
                fullBase64 = chunkDocs.map((c) => c.data || "").join("");
              }
              if (fullBase64) {
                const buffer = Buffer.from(fullBase64, "base64");
                const saveExt = mime.includes("jpeg") || mime.includes("jpg") ? "jpg" : "png";
                const restorePath = import_path.default.join(uploadsDir, `splash-logo.${saveExt}`);
                try {
                  import_fs.default.writeFileSync(restorePath, buffer);
                } catch (writeErr) {
                  console.warn("Could not cache restored logo to disk:", writeErr);
                }
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.setHeader("Content-Type", mime);
                res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
                return res.send(buffer);
              }
            }
          }
        } catch (dbErr) {
          console.warn("Failed to restore splash logo from Firestore:", dbErr);
        }
      }
      return res.status(404).send("No custom splash logo available");
    } catch (e) {
      console.error("Error serving splash logo:", e);
      return res.status(500).send("Error serving logo");
    }
  });
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { identifier, password } = req.body;
      if (!identifier || !password) {
        return res.status(400).json({ error: "\u09AE\u09CB\u09AC\u09BE\u0987\u09B2 \u09A8\u09AE\u09CD\u09AC\u09B0 \u0993 \u09AA\u09BE\u09B8\u0993\u09DF\u09BE\u09B0\u09CD\u09A1 \u09AA\u09CD\u09B0\u09A6\u09BE\u09A8 \u0995\u09B0\u09C1\u09A8\u0964" });
      }
      const cleanDigits = String(identifier).replace(/[০-৯]/g, (d) => bnToEnMap[d] || d).replace(/\D/g, "");
      let normalizedPhone = cleanDigits;
      if (normalizedPhone.startsWith("880")) {
        normalizedPhone = "0" + normalizedPhone.slice(3);
      } else if (normalizedPhone.startsWith("88")) {
        normalizedPhone = normalizedPhone.slice(2);
      }
      const rawId = String(identifier).trim().toLowerCase();
      const isPermanentAdmin = normalizedPhone === "01907006460" || AUTHORIZED_ADMIN_EMAILS.includes(rawId) || rawId === "admin";
      if (!clientDb) {
        return res.status(500).json({ error: "\u09A1\u09BE\u099F\u09BE\u09AC\u09C7\u09B8 \u09B8\u0982\u09AF\u09CB\u0997 \u0989\u09AA\u09B2\u09AC\u09CD\u09A7 \u09A8\u09DF\u0964" });
      }
      if (isPermanentAdmin) {
        let adminData = {
          id: "mem-1",
          name: "\u09B6\u09BE\u09B9\u09B0\u09BF\u09DF\u09BE\u09B0 \u0987\u09B0\u09BE\u09AE",
          phone: "01907006460",
          role: "admin",
          Role: "admin",
          memberCode: "\u09B8\u09CB-\u09E6\u09E7"
        };
        let adminRef = null;
        if (clientDb) {
          try {
            adminRef = (0, import_firestore.doc)(clientDb, "members", "mem-1");
            const adminSnap = await Promise.race([
              (0, import_firestore.getDoc)(adminRef),
              new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5e3))
            ]).catch(() => null);
            if (adminSnap && adminSnap.exists && adminSnap.exists()) {
              adminData = adminSnap.data();
            }
          } catch (dbErr) {
            console.warn("Admin record fetch note (using fallback):", dbErr?.message || dbErr);
          }
        }
        const cleanPassword2 = String(password).replace(/[০-৯]/g, (d) => bnToEnMap[d] || d).trim();
        if (cleanPassword2 === "1234") {
          return res.status(401).json({ error: "\u09AE\u09CB\u09AC\u09BE\u0987\u09B2 \u09A8\u09AE\u09CD\u09AC\u09B0 \u0985\u09A5\u09AC\u09BE \u09AA\u09BE\u09B8\u0993\u09DF\u09BE\u09B0\u09CD\u09A1 \u09B8\u09A0\u09BF\u0995 \u09A8\u09DF\u0964" });
        }
        let isPwValid = false;
        if (adminData.passwordHash) {
          isPwValid = verifyPassword(cleanPassword2, adminData.passwordHash);
        }
        if (!isPwValid) {
          return res.status(401).json({ error: "\u09AE\u09CB\u09AC\u09BE\u0987\u09B2 \u09A8\u09AE\u09CD\u09AC\u09B0 \u0985\u09A5\u09AC\u09BE \u09AA\u09BE\u09B8\u0993\u09DF\u09BE\u09B0\u09CD\u09A1 \u09B8\u09A0\u09BF\u0995 \u09A8\u09DF\u0964" });
        }
        const token2 = createSessionToken({
          memberId: "mem-1",
          role: "admin",
          phone: "01907006460",
          name: adminData.name || "\u09B6\u09BE\u09B9\u09B0\u09BF\u09DF\u09BE\u09B0 \u0987\u09B0\u09BE\u09AE"
        });
        if (adminAuthInstance) {
          try {
            const fbPassword = formatFirebaseAuthPassword(cleanPassword2);
            const email = phoneToInternalEmail("01907006460");
            try {
              const u = await adminAuthInstance.getUserByEmail(email);
              if (u) {
                await adminAuthInstance.updateUser(u.uid, { password: fbPassword });
              }
            } catch (nf) {
              if (nf?.code === "auth/user-not-found") {
                await adminAuthInstance.createUser({
                  uid: ADMIN_FIREBASE_UID,
                  email,
                  password: fbPassword,
                  displayName: "\u09B6\u09BE\u09B9\u09B0\u09BF\u09DF\u09BE\u09B0 \u0987\u09B0\u09BE\u09AE"
                });
              }
            }
          } catch (syncErr) {
            console.warn("Firebase Auth admin sync note in login:", syncErr);
          }
        }
        return res.json({
          success: true,
          token: token2,
          role: "admin",
          member: { ...adminData, id: "mem-1", role: "admin", phone: "01907006460" },
          mustChangePassword: false
        });
      }
      const membersRef = (0, import_firestore.collection)(clientDb, "members");
      const matchedDocs = [];
      if (normalizedPhone && normalizedPhone.length === 11) {
        try {
          const qPhone = (0, import_firestore.query)(membersRef, (0, import_firestore.where)("phone", "==", normalizedPhone));
          const snapPhone = await (0, import_firestore.getDocs)(qPhone);
          if (!snapPhone.empty) {
            snapPhone.forEach((d) => {
              const data = d.data();
              if (d.id === "mem-1" || (data.Role || data.role) === "admin") return;
              matchedDocs.push(d);
            });
          }
        } catch {
        }
      }
      if (matchedDocs.length === 0) {
        const snap = await (0, import_firestore.getDocs)(membersRef);
        snap.forEach((d) => {
          const data = d.data();
          if (d.id === "mem-1" || (data.Role || data.role) === "admin") return;
          const p = (data.phone || data.Phone || "").replace(/[০-৯]/g, (digit) => bnToEnMap[digit] || digit).replace(/\D/g, "");
          const code = (data.memberCode || data.MemberCode || "").toLowerCase();
          if (normalizedPhone.length >= 6 && (p === normalizedPhone || p.endsWith(normalizedPhone)) || code === rawId || d.id === rawId) {
            matchedDocs.push(d);
          }
        });
      }
      if (matchedDocs.length === 0) {
        return res.status(404).json({ error: "\u098F\u0987 \u09AB\u09CB\u09A8 \u09A8\u09AE\u09CD\u09AC\u09B0\u099F\u09BF \u0995\u09CB\u09A8\u09CB \u09A8\u09BF\u09AC\u09A8\u09CD\u09A7\u09BF\u09A4 \u09B8\u09A6\u09B8\u09CD\u09AF\u09C7\u09B0 \u09B8\u09BE\u09A5\u09C7 \u09AE\u09C7\u09B2\u09C7\u09A8\u09BF\u0964" });
      }
      const activeDocs = matchedDocs.filter((d) => {
        const status = (d.data().Status || d.data().status || "").toLowerCase();
        return status !== "inactive" && status !== "\u09A8\u09BF\u09B7\u09CD\u0995\u09CD\u09B0\u09BF\u09DF";
      });
      if (activeDocs.length === 0) {
        return res.status(403).json({ error: "\u098F\u0987 account \u09AC\u09B0\u09CD\u09A4\u09AE\u09BE\u09A8\u09C7 \u09A8\u09BF\u09B7\u09CD\u0995\u09CD\u09B0\u09BF\u09DF\u0964" });
      }
      const cleanPassword = password.replace(/[০-৯]/g, (d) => bnToEnMap[d] || d);
      let authenticatedDoc = null;
      for (const d of activeDocs) {
        const mData = d.data();
        if (mData.passwordHash) {
          if (verifyPassword(password, mData.passwordHash) || verifyPassword(cleanPassword, mData.passwordHash)) {
            authenticatedDoc = d;
            break;
          }
        }
      }
      if (!authenticatedDoc) {
        const anyHasHash = activeDocs.some((d) => d.data().passwordHash);
        if (!anyHasHash && cleanPassword.length >= 4) {
          const newHash = hashPassword(cleanPassword);
          const needsChange = cleanPassword === "1234";
          for (const d of activeDocs) {
            await (0, import_firestore.updateDoc)(d.ref, {
              passwordHash: newHash,
              mustChangePassword: needsChange,
              updatedAt: (0, import_firestore.serverTimestamp)()
            }).catch(() => {
            });
          }
          authenticatedDoc = activeDocs[0];
        } else {
          return res.status(401).json({ error: "\u09AB\u09CB\u09A8 \u09A8\u09AE\u09CD\u09AC\u09B0 \u0985\u09A5\u09AC\u09BE \u09AA\u09BE\u09B8\u0993\u09DF\u09BE\u09B0\u09CD\u09A1 \u09B8\u09A0\u09BF\u0995 \u09A8\u09DF\u0964" });
        }
      }
      const member = { ...authenticatedDoc.data(), id: authenticatedDoc.id };
      const mustChange = Boolean(
        member.mustChangePassword || member.requiresPasswordReset || cleanPassword === "1234"
      );
      const allMatchingMembers = activeDocs.map((d) => ({ ...d.data(), id: d.id }));
      const token = createSessionToken({
        memberId: member.id,
        role: "member",
        phone: member.phone,
        name: member.name
      });
      if (adminAuthInstance) {
        try {
          const email = phoneToInternalEmail(member.phone || normalizedPhone);
          const fbPassword = formatFirebaseAuthPassword(cleanPassword);
          try {
            const u = await adminAuthInstance.getUserByEmail(email);
            if (u) {
              await adminAuthInstance.updateUser(u.uid, { password: fbPassword });
            }
          } catch (notFoundErr) {
            if (notFoundErr?.code === "auth/user-not-found") {
              const created = await adminAuthInstance.createUser({
                email,
                password: fbPassword,
                displayName: member.name || "\u09B8\u09A6\u09B8\u09CD\u09AF"
              });
              if (created?.uid && authenticatedDoc) {
                await (0, import_firestore.updateDoc)(authenticatedDoc.ref, { uid: created.uid }).catch(() => {
                });
              }
            }
          }
        } catch (syncErr) {
          console.warn("Firebase Auth member sync note in login:", syncErr);
        }
      }
      return res.json({
        success: true,
        token,
        role: "member",
        member,
        members: allMatchingMembers,
        mustChangePassword: mustChange
      });
    } catch (err) {
      console.error("Login endpoint error:", err);
      return res.status(500).json({ error: err?.message || "\u09B2\u0997\u0987\u09A8 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964" });
    }
  });
  app.post("/api/admin/reset-password", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          error: "\u09AA\u09CD\u09B0\u09AE\u09BE\u09A3\u09C0\u0995\u09B0\u09A3 \u099F\u09CB\u0995\u09C7\u09A8 \u0985\u09A8\u09C1\u09AA\u09B8\u09CD\u09A5\u09BF\u09A4\u0964 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u09AA\u09C1\u09A8\u09B0\u09BE\u09DF \u09B2\u0997\u0987\u09A8 \u0995\u09B0\u09C1\u09A8\u0964"
        });
      }
      const token = authHeader.split("Bearer ")[1].trim();
      let isCallerAdmin = false;
      let callerUid = null;
      let callerEmail = null;
      const session = verifySessionToken(token);
      if (session && session.role === "admin") {
        isCallerAdmin = true;
        callerUid = session.memberId || ADMIN_FIREBASE_UID;
      }
      if (!isCallerAdmin && adminAuthInstance) {
        try {
          const decoded = await adminAuthInstance.verifyIdToken(token);
          callerUid = decoded.uid;
          callerEmail = decoded.email || null;
          if (callerUid === ADMIN_FIREBASE_UID || callerEmail && AUTHORIZED_ADMIN_EMAILS.includes(callerEmail.toLowerCase())) {
            isCallerAdmin = true;
          }
        } catch {
        }
      }
      if (!isCallerAdmin && firebaseConfig.apiKey) {
        try {
          const lookupResp = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken: token })
            }
          );
          const lookupData = await lookupResp.json();
          if (lookupData?.users && lookupData.users[0]) {
            callerUid = lookupData.users[0].localId;
            callerEmail = lookupData.users[0].email || null;
            if (callerUid === ADMIN_FIREBASE_UID || callerEmail && AUTHORIZED_ADMIN_EMAILS.includes(callerEmail.toLowerCase())) {
              isCallerAdmin = true;
            }
          }
        } catch {
        }
      }
      if (!isCallerAdmin && callerUid && clientDb) {
        try {
          const mSnap = await (0, import_firestore.getDoc)((0, import_firestore.doc)(clientDb, "members", callerUid));
          if (mSnap.exists()) {
            const data = mSnap.data();
            if ((data.Role || data.role || "").toLowerCase() === "admin") {
              isCallerAdmin = true;
            }
          }
        } catch {
        }
      }
      if (!isCallerAdmin) {
        return res.status(403).json({
          error: "\u0985\u09A8\u09A8\u09C1\u09AE\u09CB\u09A6\u09BF\u09A4 \u0985\u09CD\u09AF\u09BE\u0995\u09CD\u09B8\u09C7\u09B8\u0964 \u09B6\u09C1\u09A7\u09C1\u09AE\u09BE\u09A4\u09CD\u09B0 \u0985\u09A8\u09C1\u09AE\u09CB\u09A6\u09BF\u09A4 \u0985\u09CD\u09AF\u09BE\u09A1\u09AE\u09BF\u09A8 \u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09B0\u09BF\u09B8\u09C7\u099F \u0995\u09B0\u09A4\u09C7 \u09AA\u09BE\u09B0\u09AC\u09C7\u09A8\u0964"
        });
      }
      const { memberId } = req.body;
      if (!memberId || typeof memberId !== "string") {
        return res.status(400).json({ error: "\u09B8\u09A6\u09B8\u09CD\u09AF\u09C7\u09B0 \u09B8\u09A0\u09BF\u0995 \u0986\u0987\u09A1\u09BF \u09AA\u09CD\u09B0\u09A6\u09BE\u09A8 \u0995\u09B0\u09C1\u09A8\u0964" });
      }
      if (!clientDb) {
        return res.status(500).json({ error: "\u09A1\u09BE\u099F\u09BE\u09AC\u09C7\u09B8 \u09B8\u0982\u09AF\u09CB\u0997 \u0989\u09AA\u09B2\u09AC\u09CD\u09A7 \u09A8\u09DF\u0964" });
      }
      const targetMemberRef = (0, import_firestore.doc)(clientDb, "members", memberId);
      const targetMemberSnap = await (0, import_firestore.getDoc)(targetMemberRef);
      if (!targetMemberSnap.exists()) {
        return res.status(404).json({ error: "\u09B8\u09A6\u09B8\u09CD\u09AF\u09C7\u09B0 \u09A4\u09A5\u09CD\u09AF \u09A1\u09BE\u099F\u09BE\u09AC\u09C7\u09B8\u09C7 \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF\u0964" });
      }
      const memberData = targetMemberSnap.data();
      const memberPhone = memberData.phone || memberData.Phone || "";
      const memberName = memberData.name || memberData.Name || "\u09B8\u09A6\u09B8\u09CD\u09AF";
      const memberCode = memberData.memberCode || memberData.MemberCode || "";
      const targetEmail = phoneToInternalEmail(memberPhone);
      const temporaryPassword = generateSecureTempPassword();
      const passwordHash = hashPassword(temporaryPassword);
      let targetUid = memberData.uid || null;
      if (adminAuthInstance) {
        try {
          if (targetUid) {
            await adminAuthInstance.updateUser(targetUid, { password: temporaryPassword });
          } else {
            try {
              const existingUser = await adminAuthInstance.getUserByEmail(targetEmail);
              targetUid = existingUser.uid;
              await adminAuthInstance.updateUser(targetUid, { password: temporaryPassword });
            } catch (nf) {
              if (nf.code === "auth/user-not-found") {
                const created = await adminAuthInstance.createUser({
                  email: targetEmail,
                  password: temporaryPassword,
                  displayName: memberName
                });
                targetUid = created.uid;
              }
            }
          }
        } catch (authErr) {
          console.warn("Firebase Auth update in reset-password note:", authErr);
        }
      }
      const updatePayload = {
        passwordHash,
        // Salted scrypt hash - NOT plaintext!
        mustChangePassword: true,
        requiresPasswordReset: true,
        passwordResetAt: (0, import_firestore.serverTimestamp)(),
        updatedAt: (0, import_firestore.serverTimestamp)()
      };
      if (targetUid && (!memberData.uid || memberData.uid !== targetUid)) {
        updatePayload.uid = targetUid;
      }
      await (0, import_firestore.updateDoc)(targetMemberRef, updatePayload);
      return res.json({
        success: true,
        temporaryPassword,
        memberName,
        memberCode,
        phone: memberPhone
      });
    } catch (err) {
      console.error("Password reset endpoint error:", err);
      return res.status(500).json({
        error: err?.message || "\u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09B0\u09BF\u09B8\u09C7\u099F \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964"
      });
    }
  });
  app.post("/api/admin/update-settings", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          error: "\u09AA\u09CD\u09B0\u09AE\u09BE\u09A3\u09C0\u0995\u09B0\u09A3 \u099F\u09CB\u0995\u09C7\u09A8 \u0985\u09A8\u09C1\u09AA\u09B8\u09CD\u09A5\u09BF\u09A4\u0964 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u09AA\u09C1\u09A8\u09B0\u09BE\u09DF \u09B2\u0997\u0987\u09A8 \u0995\u09B0\u09C1\u09A8\u0964"
        });
      }
      const token = authHeader.split("Bearer ")[1].trim();
      let isCallerAdmin = false;
      let callerUid = null;
      let callerEmail = null;
      const session = verifySessionToken(token);
      if (session && session.role === "admin") {
        isCallerAdmin = true;
        callerUid = session.memberId || ADMIN_FIREBASE_UID;
      }
      if (!isCallerAdmin && adminAuthInstance) {
        try {
          const decoded = await adminAuthInstance.verifyIdToken(token);
          callerUid = decoded.uid;
          callerEmail = decoded.email || null;
          if (callerUid === ADMIN_FIREBASE_UID || callerEmail && AUTHORIZED_ADMIN_EMAILS.includes(callerEmail.toLowerCase())) {
            isCallerAdmin = true;
          }
        } catch {
        }
      }
      if (!isCallerAdmin && firebaseConfig.apiKey) {
        try {
          const lookupResp = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken: token })
            }
          );
          const lookupData = await lookupResp.json();
          if (lookupData?.users && lookupData.users[0]) {
            callerUid = lookupData.users[0].localId;
            callerEmail = lookupData.users[0].email || null;
            if (callerUid === ADMIN_FIREBASE_UID || callerEmail && AUTHORIZED_ADMIN_EMAILS.includes(callerEmail.toLowerCase())) {
              isCallerAdmin = true;
            }
          }
        } catch {
        }
      }
      if (!isCallerAdmin && callerUid && clientDb) {
        try {
          const mSnap = await (0, import_firestore.getDoc)((0, import_firestore.doc)(clientDb, "members", callerUid));
          if (mSnap.exists()) {
            const data = mSnap.data();
            if ((data.Role || data.role || "").toLowerCase() === "admin") {
              isCallerAdmin = true;
            }
          }
        } catch {
        }
      }
      if (!isCallerAdmin) {
        return res.status(403).json({
          error: "\u0985\u09A8\u09C1\u09AE\u09A4\u09BF \u09A8\u09C7\u0987: \u09B6\u09C1\u09A7\u09C1\u09AE\u09BE\u09A4\u09CD\u09B0 \u0985\u09A8\u09C1\u09AE\u09CB\u09A6\u09BF\u09A4 \u0985\u09CD\u09AF\u09BE\u09A1\u09AE\u09BF\u09A8 \u098F\u0987 \u09B2\u09BF\u0982\u0995 \u09AA\u09B0\u09BF\u09AC\u09B0\u09CD\u09A4\u09A8 \u0995\u09B0\u09A4\u09C7 \u09AA\u09BE\u09B0\u09C7\u09A8\u0964"
        });
      }
      const {
        whatsappGroupUrl,
        splashEnabled,
        splashDuration,
        splashTransition,
        splashLogo,
        splashLogoUrl,
        weeklyTarget,
        adminPin,
        orgName,
        popupEnabled,
        popupDuration
      } = req.body;
      const updatePayload = {
        updatedAt: (0, import_firestore.serverTimestamp)()
      };
      if (typeof whatsappGroupUrl === "string") {
        updatePayload.whatsappGroupUrl = whatsappGroupUrl.trim();
      }
      if (typeof splashEnabled === "boolean") {
        updatePayload.splashEnabled = splashEnabled;
      }
      if (typeof splashDuration === "number") {
        updatePayload.splashDuration = splashDuration;
      }
      if (typeof splashTransition === "string") {
        updatePayload.splashTransition = splashTransition;
      }
      if (typeof splashLogo === "string") {
        updatePayload.splashLogo = splashLogo;
      }
      if (typeof splashLogoUrl === "string") {
        updatePayload.splashLogoUrl = splashLogoUrl.trim();
      }
      if (typeof popupEnabled === "boolean") {
        updatePayload.popupEnabled = popupEnabled;
      }
      if (typeof popupDuration === "number") {
        updatePayload.popupDuration = popupDuration;
      }
      if (typeof weeklyTarget === "number") {
        updatePayload.weeklyTarget = weeklyTarget;
      }
      if (typeof adminPin === "string") {
        updatePayload.adminPin = adminPin;
      }
      if (typeof orgName === "string") {
        updatePayload.orgName = orgName;
      }
      if (Object.keys(updatePayload).length <= 1) {
        return res.status(400).json({ error: "\u09B8\u09A0\u09BF\u0995 \u09B8\u09C7\u099F\u09BF\u0982\u09B8 \u09A4\u09A5\u09CD\u09AF \u09AA\u09CD\u09B0\u09A6\u09BE\u09A8 \u0995\u09B0\u09C1\u09A8\u0964" });
      }
      if (!clientDb) {
        return res.status(500).json({ error: "\u09A1\u09BE\u099F\u09BE\u09AC\u09C7\u09B8 \u09B8\u0982\u09AF\u09CB\u0997 \u0989\u09AA\u09B2\u09AC\u09CD\u09A7 \u09A8\u09DF\u0964" });
      }
      const settingsRef = (0, import_firestore.doc)(clientDb, "settings", "organization");
      await (0, import_firestore.setDoc)(
        settingsRef,
        updatePayload,
        { merge: true }
      );
      return res.json({ success: true });
    } catch (err) {
      console.error("Update settings endpoint error:", err);
      return res.status(500).json({ error: err?.message || "\u09B2\u09BF\u0982\u0995 \u09B8\u0982\u09B0\u0995\u09CD\u09B7\u09A3 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964" });
    }
  });
  app.post("/api/admin/upload-splash-logo", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "\u09AA\u09CD\u09B0\u09AE\u09BE\u09A3\u09C0\u0995\u09B0\u09A3 \u099F\u09CB\u0995\u09C7\u09A8 \u0985\u09A8\u09C1\u09AA\u09B8\u09CD\u09A5\u09BF\u09A4\u0964" });
      }
      const token = authHeader.split("Bearer ")[1].trim();
      let isCallerAdmin = false;
      const session = verifySessionToken(token);
      if (session && session.role === "admin") {
        isCallerAdmin = true;
      }
      if (!isCallerAdmin && adminAuthInstance) {
        try {
          const decoded = await adminAuthInstance.verifyIdToken(token);
          if (decoded.uid === ADMIN_FIREBASE_UID || decoded.email && AUTHORIZED_ADMIN_EMAILS.includes(decoded.email.toLowerCase())) {
            isCallerAdmin = true;
          }
        } catch {
        }
      }
      if (!isCallerAdmin) {
        return res.status(403).json({ error: "\u0985\u09A8\u09C1\u09AE\u09A4\u09BF \u09A8\u09C7\u0987: \u09B6\u09C1\u09A7\u09C1\u09AE\u09BE\u09A4\u09CD\u09B0 \u0985\u09A8\u09C1\u09AE\u09CB\u09A6\u09BF\u09A4 \u0985\u09CD\u09AF\u09BE\u09A1\u09AE\u09BF\u09A8 \u09B2\u09CB\u0997\u09CB \u09AA\u09B0\u09BF\u09AC\u09B0\u09CD\u09A4\u09A8 \u0995\u09B0\u09A4\u09C7 \u09AA\u09BE\u09B0\u09C7\u09A8\u0964" });
      }
      const { fileData, fileName, mimeType } = req.body;
      if (!fileData) {
        return res.status(400).json({ error: "\u09AB\u09BE\u0987\u09B2\u09C7\u09B0 \u09A4\u09A5\u09CD\u09AF \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF\u0964" });
      }
      let base64Data = fileData;
      let effectiveMime = mimeType || "image/png";
      if (typeof fileData === "string" && fileData.includes(";base64,")) {
        const parts = fileData.split(";base64,");
        const mimeMatch = parts[0].match(/data:(.*?)$/);
        if (mimeMatch && mimeMatch[1]) {
          effectiveMime = mimeMatch[1];
        }
        base64Data = parts[1];
      }
      const buffer = Buffer.from(base64Data, "base64");
      const isJpg = effectiveMime.includes("jpeg") || effectiveMime.includes("jpg");
      const extension = isJpg ? "jpg" : "png";
      const diskFilename = `splash-logo.${extension}`;
      const diskPath = import_path.default.join(uploadsDir, diskFilename);
      try {
        const oldPng = import_path.default.join(uploadsDir, "splash-logo.png");
        const oldJpg = import_path.default.join(uploadsDir, "splash-logo.jpg");
        if (import_fs.default.existsSync(oldPng)) import_fs.default.unlinkSync(oldPng);
        if (import_fs.default.existsSync(oldJpg)) import_fs.default.unlinkSync(oldJpg);
      } catch {
      }
      import_fs.default.writeFileSync(diskPath, buffer);
      if (clientDb) {
        try {
          const CHUNK_SIZE = 600 * 1024;
          const totalChunks = Math.ceil(base64Data.length / CHUNK_SIZE);
          if (totalChunks <= 1) {
            await (0, import_firestore.setDoc)((0, import_firestore.doc)(clientDb, "appAssets", "splashLogo"), {
              data: base64Data,
              mimeType: effectiveMime,
              fileName: fileName || diskFilename,
              sizeBytes: buffer.length,
              totalChunks: 1,
              deleted: false,
              updatedAt: (0, import_firestore.serverTimestamp)()
            });
          } else {
            await (0, import_firestore.setDoc)((0, import_firestore.doc)(clientDb, "appAssets", "splashLogo"), {
              mimeType: effectiveMime,
              fileName: fileName || diskFilename,
              sizeBytes: buffer.length,
              totalChunks,
              deleted: false,
              updatedAt: (0, import_firestore.serverTimestamp)()
            });
            for (let i = 0; i < totalChunks; i++) {
              const chunkStr = base64Data.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
              await (0, import_firestore.setDoc)((0, import_firestore.doc)(clientDb, "appAssets", "splashLogo", "chunks", String(i)), {
                index: i,
                data: chunkStr
              });
            }
          }
        } catch (dbErr) {
          console.warn("Firestore backup note (disk save succeeded):", dbErr);
        }
      }
      const assetUrl = `/api/assets/splash-logo.${extension}?v=${Date.now()}`;
      if (clientDb) {
        try {
          await (0, import_firestore.setDoc)(
            (0, import_firestore.doc)(clientDb, "settings", "organization"),
            {
              splashLogoUrl: assetUrl,
              updatedAt: (0, import_firestore.serverTimestamp)()
            },
            { merge: true }
          );
        } catch (settingsErr) {
          console.warn("Direct settings update note:", settingsErr);
        }
      }
      return res.json({
        success: true,
        url: assetUrl,
        size: buffer.length,
        message: "\u09B2\u09CB\u0997\u09CB \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u0986\u09AA\u09B2\u09CB\u09A1 \u0993 \u09B8\u0982\u09B0\u0995\u09CD\u09B7\u09BF\u09A4 \u09B9\u09DF\u09C7\u099B\u09C7"
      });
    } catch (e) {
      console.error("Logo upload error:", e);
      return res.status(500).json({ error: e.message || "\u09B2\u09CB\u0997\u09CB \u0986\u09AA\u09B2\u09CB\u09A1 \u09AA\u09CD\u09B0\u0995\u09CD\u09B0\u09BF\u09DF\u09BE\u09DF \u09B8\u09AE\u09B8\u09CD\u09AF\u09BE \u09B9\u09DF\u09C7\u099B\u09C7\u0964" });
    }
  });
  app.post("/api/admin/remove-splash-logo", async (req, res) => {
    try {
      try {
        const oldPng = import_path.default.join(uploadsDir, "splash-logo.png");
        const oldJpg = import_path.default.join(uploadsDir, "splash-logo.jpg");
        if (import_fs.default.existsSync(oldPng)) import_fs.default.unlinkSync(oldPng);
        if (import_fs.default.existsSync(oldJpg)) import_fs.default.unlinkSync(oldJpg);
      } catch {
      }
      if (clientDb) {
        try {
          await (0, import_firestore.setDoc)(
            (0, import_firestore.doc)(clientDb, "appAssets", "splashLogo"),
            {
              deleted: true,
              data: "",
              updatedAt: (0, import_firestore.serverTimestamp)()
            },
            { merge: true }
          );
          await (0, import_firestore.setDoc)(
            (0, import_firestore.doc)(clientDb, "settings", "organization"),
            {
              splashLogoUrl: "",
              updatedAt: (0, import_firestore.serverTimestamp)()
            },
            { merge: true }
          );
        } catch {
        }
      }
      return res.json({ success: true, message: "\u0995\u09BE\u09B8\u09CD\u099F\u09AE \u09B2\u09CB\u0997\u09CB \u09AE\u09C1\u099B\u09C7 \u09AB\u09C7\u09B2\u09BE \u09B9\u09DF\u09C7\u099B\u09C7\u0964" });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/admin/popup-config", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "\u09AA\u09CD\u09B0\u09AE\u09BE\u09A3\u09C0\u0995\u09B0\u09A3 \u099F\u09CB\u0995\u09C7\u09A8 \u0985\u09A8\u09C1\u09AA\u09B8\u09CD\u09A5\u09BF\u09A4\u0964" });
      }
      const token = authHeader.split("Bearer ")[1].trim();
      let isCallerAdmin = false;
      const session = verifySessionToken(token);
      if (session && session.role === "admin") {
        isCallerAdmin = true;
      }
      if (!isCallerAdmin && adminAuthInstance) {
        try {
          const decoded = await adminAuthInstance.verifyIdToken(token);
          if (decoded.uid === ADMIN_FIREBASE_UID || decoded.email && AUTHORIZED_ADMIN_EMAILS.includes(decoded.email.toLowerCase())) {
            isCallerAdmin = true;
          }
        } catch {
        }
      }
      if (!isCallerAdmin && firebaseConfig.apiKey) {
        try {
          const lookupResp = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken: token })
            }
          );
          const lookupData = await lookupResp.json();
          if (lookupData?.users && lookupData.users[0]) {
            const callerUid = lookupData.users[0].localId;
            const callerEmail = lookupData.users[0].email || null;
            if (callerUid === ADMIN_FIREBASE_UID || callerEmail && AUTHORIZED_ADMIN_EMAILS.includes(callerEmail.toLowerCase())) {
              isCallerAdmin = true;
            }
          }
        } catch {
        }
      }
      if (!isCallerAdmin) {
        return res.status(403).json({ error: "\u0985\u09A8\u09C1\u09AE\u09A4\u09BF \u09A8\u09C7\u0987: \u09B6\u09C1\u09A7\u09C1\u09AE\u09BE\u09A4\u09CD\u09B0 \u0985\u09A8\u09C1\u09AE\u09CB\u09A6\u09BF\u09A4 \u0985\u09CD\u09AF\u09BE\u09A1\u09AE\u09BF\u09A8 \u09AA\u09AA\u0986\u09AA \u09AA\u09B0\u09BF\u09AC\u09B0\u09CD\u09A4\u09A8 \u0995\u09B0\u09A4\u09C7 \u09AA\u09BE\u09B0\u09C7\u09A8\u0964" });
      }
      const { imageData, imageName } = req.body;
      if (!imageData || typeof imageData !== "string") {
        return res.status(400).json({ error: "\u09B8\u09A0\u09BF\u0995 \u099B\u09AC\u09BF\u09B0 \u09A1\u09BE\u099F\u09BE \u09AA\u09CD\u09B0\u09A6\u09BE\u09A8 \u0995\u09B0\u09C1\u09A8\u0964" });
      }
      if (imageData.length > 5e5) {
        return res.status(400).json({ error: "\u099B\u09AC\u09BF\u09B0 \u09B8\u09BE\u0987\u099C \u0985\u09A8\u09C1\u09AE\u09CB\u09A6\u09BF\u09A4 \u09B8\u09C0\u09AE\u09BE\u09B0 (\u09E9\u09E6\u09E6 KB) \u099A\u09C7\u09DF\u09C7 \u09AC\u09C7\u09B6\u09BF\u0964" });
      }
      if (!clientDb) {
        return res.status(500).json({ error: "\u09A1\u09BE\u099F\u09BE\u09AC\u09C7\u09B8 \u09B8\u0982\u09AF\u09CB\u0997 \u0989\u09AA\u09B2\u09AC\u09CD\u09A7 \u09A8\u09DF\u0964" });
      }
      const assetRef = (0, import_firestore.doc)(clientDb, "appAssets", "popupConfig");
      await (0, import_firestore.setDoc)(assetRef, {
        imageData,
        imageName: imageName || "\u0995\u09BE\u09B8\u09CD\u099F\u09AE \u09B8\u09BE\u0982\u0997\u09A0\u09A8\u09BF\u0995 \u09AC\u09BF\u099C\u09CD\u099E\u09AA\u09CD\u09A4\u09BF \u09AC\u09CD\u09AF\u09BE\u09A8\u09BE\u09B0",
        serverAuthToken: "amader_shongothon_admin_popup_server_sec_2026",
        updatedAt: (0, import_firestore.serverTimestamp)()
      });
      return res.json({ success: true, message: "\u09AA\u09AA\u0986\u09AA \u09AC\u09CD\u09AF\u09BE\u09A8\u09BE\u09B0 \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u09B8\u0982\u09B0\u0995\u09CD\u09B7\u09BF\u09A4 \u09B9\u09DF\u09C7\u099B\u09C7\u0964" });
    } catch (err) {
      console.error("Save popup config error:", err);
      return res.status(500).json({ error: err?.message || "\u09AA\u09AA\u0986\u09AA \u09B8\u0982\u09B0\u0995\u09CD\u09B7\u09A3 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09DF\u09C7\u099B\u09C7\u0964" });
    }
  });
  app.delete("/api/admin/popup-config", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "\u09AA\u09CD\u09B0\u09AE\u09BE\u09A3\u09C0\u0995\u09B0\u09A3 \u099F\u09CB\u0995\u09C7\u09A8 \u0985\u09A8\u09C1\u09AA\u09B8\u09CD\u09A5\u09BF\u09A4\u0964" });
      }
      const token = authHeader.split("Bearer ")[1].trim();
      let isCallerAdmin = false;
      const session = verifySessionToken(token);
      if (session && session.role === "admin") {
        isCallerAdmin = true;
      }
      if (!isCallerAdmin && adminAuthInstance) {
        try {
          const decoded = await adminAuthInstance.verifyIdToken(token);
          if (decoded.uid === ADMIN_FIREBASE_UID || decoded.email && AUTHORIZED_ADMIN_EMAILS.includes(decoded.email.toLowerCase())) {
            isCallerAdmin = true;
          }
        } catch {
        }
      }
      if (!isCallerAdmin && firebaseConfig.apiKey) {
        try {
          const lookupResp = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken: token })
            }
          );
          const lookupData = await lookupResp.json();
          if (lookupData?.users && lookupData.users[0]) {
            const callerUid = lookupData.users[0].localId;
            const callerEmail = lookupData.users[0].email || null;
            if (callerUid === ADMIN_FIREBASE_UID || callerEmail && AUTHORIZED_ADMIN_EMAILS.includes(callerEmail.toLowerCase())) {
              isCallerAdmin = true;
            }
          }
        } catch {
        }
      }
      if (!isCallerAdmin) {
        return res.status(403).json({ error: "\u0985\u09A8\u09C1\u09AE\u09A4\u09BF \u09A8\u09C7\u0987: \u09B6\u09C1\u09A7\u09C1\u09AE\u09BE\u09A4\u09CD\u09B0 \u0985\u09A8\u09C1\u09AE\u09CB\u09A6\u09BF\u09A4 \u0985\u09CD\u09AF\u09BE\u09A1\u09AE\u09BF\u09A8 \u09AA\u09AA\u0986\u09AA \u09AE\u09C1\u099B\u09A4\u09C7 \u09AA\u09BE\u09B0\u09C7\u09A8\u0964" });
      }
      if (!clientDb) {
        return res.status(500).json({ error: "\u09A1\u09BE\u099F\u09BE\u09AC\u09C7\u09B8 \u09B8\u0982\u09AF\u09CB\u0997 \u0989\u09AA\u09B2\u09AC\u09CD\u09A7 \u09A8\u09DF\u0964" });
      }
      const assetRef = (0, import_firestore.doc)(clientDb, "appAssets", "popupConfig");
      await (0, import_firestore.setDoc)(assetRef, {
        imageData: "",
        imageName: "",
        serverAuthToken: "amader_shongothon_admin_popup_server_sec_2026",
        updatedAt: (0, import_firestore.serverTimestamp)()
      });
      return res.json({ success: true, message: "\u09AA\u09AA\u0986\u09AA \u09AC\u09CD\u09AF\u09BE\u09A8\u09BE\u09B0 \u09AE\u09C1\u099B\u09C7 \u09A1\u09BF\u09AB\u09B2\u09CD\u099F \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7\u0964" });
    } catch (err) {
      console.error("Delete popup config error:", err);
      return res.status(500).json({ error: err?.message || "\u09AA\u09AA\u0986\u09AA \u09AE\u09C1\u099B\u09A4\u09C7 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09DF\u09C7\u099B\u09C7\u0964" });
    }
  });
  app.post("/api/member/set-password", async (req, res) => {
    try {
      const { memberId, newPassword } = req.body;
      if (!memberId || !newPassword) {
        return res.status(400).json({ error: "\u09B8\u09A6\u09B8\u09CD\u09AF\u09C7\u09B0 \u09A4\u09A5\u09CD\u09AF \u0993 \u09A8\u09A4\u09C1\u09A8 \u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u0986\u09AC\u09B6\u09CD\u09AF\u0995\u0964" });
      }
      const cleanPassword = String(newPassword).replace(/[০-৯]/g, (d) => bnToEnMap[d] || d).trim();
      if (!/^\d{4}$/.test(cleanPassword)) {
        return res.status(400).json({
          error: "\u09A8\u09A4\u09C1\u09A8 \u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u0985\u09AC\u09B6\u09CD\u09AF\u0987 \u09A0\u09BF\u0995 \u09EA \u09B8\u0982\u0996\u09CD\u09AF\u09BE\u09B0 (\u09A1\u09BF\u099C\u09BF\u099F) \u09B9\u09A4\u09C7 \u09B9\u09AC\u09C7 (\u09AF\u09C7\u09AE\u09A8: \u09E7\u09E8\u09E9\u09EA \u09AC\u09BE \u09EF\u09EC\u09ED\u09EE)\u0964"
        });
      }
      if (cleanPassword === "1234") {
        return res.status(400).json({
          error: '\u09A1\u09BF\u09AB\u09B2\u09CD\u099F \u09AA\u09BE\u09B8\u0993\u09DF\u09BE\u09B0\u09CD\u09A1 "\u09E7\u09E8\u09E9\u09EA" \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0995\u09B0\u09BE \u09AF\u09BE\u09AC\u09C7 \u09A8\u09BE\u0964 \u0985\u09A8\u09CD\u09AF \u09EA \u09B8\u0982\u0996\u09CD\u09AF\u09BE\u09B0 \u09A8\u09A4\u09C1\u09A8 \u09AC\u09CD\u09AF\u0995\u09CD\u09A4\u09BF\u0997\u09A4 \u09AA\u09BE\u09B8\u0993\u09DF\u09BE\u09B0\u09CD\u09A1 \u09A6\u09BF\u09A8\u0964'
        });
      }
      if (!clientDb) {
        return res.status(500).json({ error: "\u09A1\u09BE\u099F\u09BE\u09AC\u09C7\u09B8 \u09B8\u0982\u09AF\u09CB\u0997 \u0989\u09AA\u09B2\u09AC\u09CD\u09A7 \u09A8\u09DF\u0964" });
      }
      const memberRef = (0, import_firestore.doc)(clientDb, "members", memberId);
      const memberSnap = await (0, import_firestore.getDoc)(memberRef);
      if (!memberSnap.exists()) {
        return res.status(404).json({ error: "\u09B8\u09A6\u09B8\u09CD\u09AF\u09C7\u09B0 \u09A4\u09A5\u09CD\u09AF \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF\u0964" });
      }
      const memberData = memberSnap.data();
      const newHash = hashPassword(cleanPassword);
      await (0, import_firestore.updateDoc)(memberRef, {
        passwordHash: newHash,
        mustChangePassword: false,
        requiresPasswordReset: false,
        updatedAt: (0, import_firestore.serverTimestamp)()
      });
      const phone = memberData.phone || memberData.Phone || "";
      const email = phoneToInternalEmail(phone);
      if (adminAuthInstance) {
        try {
          const fbPassword = formatFirebaseAuthPassword(cleanPassword);
          if (memberData.uid) {
            await adminAuthInstance.updateUser(memberData.uid, { password: fbPassword });
          } else {
            const user = await adminAuthInstance.getUserByEmail(email);
            if (user) {
              await adminAuthInstance.updateUser(user.uid, { password: fbPassword });
            }
          }
        } catch (authErr) {
          console.warn("Firebase Auth update in set-password note:", authErr);
        }
      }
      const roleStr = (memberData.Role || memberData.role || "").toLowerCase();
      const role = roleStr === "admin" ? "admin" : "member";
      const token = createSessionToken({
        memberId,
        role,
        phone,
        name: memberData.name || ""
      });
      return res.json({
        success: true,
        token,
        phone,
        message: "\u09A8\u09A4\u09C1\u09A8 \u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u09B8\u0982\u09B0\u0995\u09CD\u09B7\u09BF\u09A4 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964"
      });
    } catch (err) {
      console.error("Set password error:", err);
      return res.status(500).json({ error: err?.message || "\u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09B8\u0982\u09B0\u0995\u09CD\u09B7\u09A3 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964" });
    }
  });
  app.get("/api/admin/recovery-config", (req, res) => {
    res.json({
      configured: true,
      oauthClientId: GMAIL_OAUTH_CLIENT_ID,
      authorizedEmails: ["shahriyareram3@gmail.com", "shahriyareram94@gmail.com"],
      scope: "https://www.googleapis.com/auth/gmail.send"
    });
  });
  const recoveryOtpStore = /* @__PURE__ */ new Map();
  app.post("/api/admin/send-recovery-otp", async (req, res) => {
    try {
      const { email, accessToken } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "\u09B0\u09BF\u0995\u09AD\u09BE\u09B0\u09BF \u0987\u09AE\u09C7\u0987\u09B2 \u09AA\u09CD\u09B0\u09A6\u09BE\u09A8 \u0995\u09B0\u09C1\u09A8\u0964" });
      }
      const normalizedEmail = email.trim().toLowerCase();
      const isAuthorized = normalizedEmail === "shahriyareram3@gmail.com" || normalizedEmail === "shahriyareram94@gmail.com";
      if (!isAuthorized) {
        return res.status(403).json({ error: "\u098F\u0987 \u0987\u09AE\u09C7\u0987\u09B2\u099F\u09BF \u0985\u09CD\u09AF\u09BE\u09A1\u09AE\u09BF\u09A8 \u09B0\u09BF\u0995\u09AD\u09BE\u09B0\u09BF\u09B0 \u099C\u09A8\u09CD\u09AF \u0985\u09A8\u09C1\u09AE\u09CB\u09A6\u09BF\u09A4 \u09A8\u09AF\u09BC\u0964" });
      }
      if (!accessToken || typeof accessToken !== "string") {
        return res.status(401).json({
          error: "Google OAuth \u0985\u09A8\u09C1\u09AE\u09CB\u09A6\u09A8 \u09AA\u09CD\u09B0\u09AF\u09BC\u09CB\u099C\u09A8\u0964 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 Google \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09A6\u09BF\u09AF\u09BC\u09C7 \u0985\u09A8\u09C1\u09AE\u09CB\u09A6\u09A8 \u09A6\u09BF\u09A8\u0964",
          needsConsent: true
        });
      }
      const otpCode = Math.floor(1e5 + Math.random() * 9e5).toString();
      const otpHash = import_crypto.default.createHash("sha256").update(otpCode).digest("hex");
      const expiresAt = Date.now() + 5 * 60 * 1e3;
      recoveryOtpStore.set(normalizedEmail, {
        email: normalizedEmail,
        otpHash,
        expiresAt,
        attempts: 0
      });
      const emailSubject = "\u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u09B8\u0982\u0997\u09A0\u09A8 - \u0985\u09CD\u09AF\u09BE\u09A1\u09AE\u09BF\u09A8 \u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09B0\u09BF\u0995\u09AD\u09BE\u09B0\u09BF \u0993\u099F\u09BF\u09AA\u09BF (OTP)";
      const emailBodyText = [
        "\u0986\u09B8\u09B8\u09BE\u09B2\u09BE\u09AE\u09C1 \u0986\u09B2\u09BE\u0987\u0995\u09C1\u09AE,",
        "",
        "\u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u09B8\u0982\u0997\u09A0\u09A8 \u09AC\u09CD\u09AF\u09AC\u09B8\u09CD\u09A5\u09BE\u09AA\u09A8\u09BE \u0985\u09CD\u09AF\u09BE\u09AA\u09CD\u09B2\u09BF\u0995\u09C7\u09B6\u09A8\u09C7 \u0985\u09CD\u09AF\u09BE\u09A1\u09AE\u09BF\u09A8 \u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09B0\u09BF\u0995\u09AD\u09BE\u09B0\u09BF\u09B0 \u099C\u09A8\u09CD\u09AF \u0985\u09A8\u09C1\u09B0\u09CB\u09A7 \u09AA\u09BE\u0993\u09AF\u09BC\u09BE \u0997\u09C7\u099B\u09C7\u0964",
        "",
        `\u0986\u09AA\u09A8\u09BE\u09B0 \u098F\u0995\u0995\u09BE\u09B2\u09C0\u09A8 \u09B0\u09BF\u0995\u09AD\u09BE\u09B0\u09BF \u09AA\u09BF\u09A8/\u0993\u099F\u09BF\u09AA\u09BF (OTP): ${otpCode}`,
        "",
        "\u098F\u0987 \u0995\u09CB\u09A1\u099F\u09BF\u09B0 \u09AE\u09C7\u09AF\u09BC\u09BE\u09A6 \u09EB \u09AE\u09BF\u09A8\u09BF\u099F\u0964 \u0986\u09AA\u09A8\u09BF \u09AF\u09A6\u09BF \u098F\u0987 \u0985\u09A8\u09C1\u09B0\u09CB\u09A7 \u09A8\u09BE \u0995\u09B0\u09C7 \u09A5\u09BE\u0995\u09C7\u09A8, \u09A4\u09AC\u09C7 \u098F\u0987 \u0987\u09AE\u09C7\u0987\u09B2\u099F\u09BF \u0989\u09AA\u09C7\u0995\u09CD\u09B7\u09BE \u0995\u09B0\u09C1\u09A8\u0964",
        "",
        "\u09A7\u09A8\u09CD\u09AF\u09AC\u09BE\u09A6,",
        "\u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u09B8\u0982\u0997\u09A0\u09A8 \u09B8\u09BF\u09B8\u09CD\u099F\u09C7\u09AE"
      ].join("\n");
      const utf8Subject = `=?utf-8?B?${Buffer.from(emailSubject).toString("base64")}?=`;
      const rawMessage = [
        `To: ${normalizedEmail}`,
        `Subject: ${utf8Subject}`,
        "MIME-Version: 1.0",
        "Content-Type: text/plain; charset=UTF-8",
        "Content-Transfer-Encoding: 8bit",
        "",
        emailBodyText
      ].join("\r\n");
      const encodedMessage = Buffer.from(rawMessage).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      const gmailResp = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ raw: encodedMessage })
      });
      const gmailData = await gmailResp.json().catch(() => ({}));
      if (!gmailResp.ok) {
        console.error("Gmail API send error:", gmailResp.status, gmailData);
        const errMsg = gmailData?.error?.message || (gmailResp.status === 401 ? "Google OAuth \u09B8\u09C7\u09B6\u09A8 \u09AE\u09C7\u09AF\u09BC\u09BE\u09A6\u09CB\u09A4\u09CD\u09A4\u09C0\u09B0\u09CD\u09A3 \u09AC\u09BE \u0985\u09A8\u09A8\u09C1\u09AE\u09CB\u09A6\u09BF\u09A4\u0964 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u0985\u09A8\u09C1\u09AE\u09A4\u09BF \u09A6\u09BF\u09A8\u0964" : "Gmail API \u09A6\u09BF\u09AF\u09BC\u09C7 \u0987\u09AE\u09C7\u0987\u09B2 \u09AA\u09BE\u09A0\u09BE\u09A8\u09CB \u09B8\u09AE\u09CD\u09AD\u09AC \u09B9\u09AF\u09BC\u09A8\u09BF\u0964");
        return res.status(gmailResp.status).json({
          error: errMsg,
          details: gmailData?.error,
          needsConsent: gmailResp.status === 401 || gmailResp.status === 403
        });
      }
      return res.json({
        success: true,
        message: "\u09B0\u09BF\u0995\u09AD\u09BE\u09B0\u09BF \u0993\u099F\u09BF\u09AA\u09BF (OTP) \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u0986\u09AA\u09A8\u09BE\u09B0 \u099C\u09BF\u09AE\u09C7\u0987\u09B2\u09C7 \u09AA\u09BE\u09A0\u09BE\u09A8\u09CB \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964",
        email: normalizedEmail,
        expiresInSeconds: 300
      });
    } catch (err) {
      console.error("Send recovery OTP error:", err);
      return res.status(500).json({ error: err?.message || "\u0993\u099F\u09BF\u09AA\u09BF \u09AA\u09CD\u09B0\u09C7\u09B0\u09A3\u09C7 \u0985\u09AD\u09CD\u09AF\u09A8\u09CD\u09A4\u09B0\u09C0\u09A3 \u09A4\u09CD\u09B0\u09C1\u099F\u09BF \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964" });
    }
  });
  app.post("/api/admin/verify-recovery-otp", async (req, res) => {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        return res.status(400).json({ error: "\u0987\u09AE\u09C7\u0987\u09B2 \u098F\u09AC\u0982 \u0993\u099F\u09BF\u09AA\u09BF \u0995\u09CB\u09A1 \u0989\u09AD\u09AF\u09BC\u0987 \u0986\u09AC\u09B6\u09CD\u09AF\u0995\u0964" });
      }
      const normalizedEmail = email.trim().toLowerCase();
      const record = recoveryOtpStore.get(normalizedEmail);
      if (!record) {
        return res.status(400).json({ error: "\u0995\u09CB\u09A8\u09CB \u09B8\u0995\u09CD\u09B0\u09BF\u09AF\u09BC \u0993\u099F\u09BF\u09AA\u09BF \u09AA\u09BE\u0993\u09AF\u09BC\u09BE \u09AF\u09BE\u09AF\u09BC\u09A8\u09BF\u0964 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u09A8\u09A4\u09C1\u09A8 \u0995\u09CB\u09A1 \u09AA\u09BE\u09A0\u09BE\u09A8\u0964" });
      }
      if (Date.now() > record.expiresAt) {
        recoveryOtpStore.delete(normalizedEmail);
        return res.status(400).json({ error: "\u0993\u099F\u09BF\u09AA\u09BF \u0995\u09CB\u09A1\u09C7\u09B0 \u09AE\u09C7\u09AF\u09BC\u09BE\u09A6 \u09B6\u09C7\u09B7 \u09B9\u09AF\u09BC\u09C7 \u0997\u09C7\u099B\u09C7\u0964 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u09AA\u09BE\u09A0\u09BE\u09A8\u0964" });
      }
      if (record.attempts >= 5) {
        recoveryOtpStore.delete(normalizedEmail);
        return res.status(429).json({ error: "\u09B8\u09B0\u09CD\u09AC\u09CB\u099A\u09CD\u099A \u09AA\u09CD\u09B0\u099A\u09C7\u09B7\u09CD\u099F\u09BE\u09B0 \u09B8\u09C0\u09AE\u09BE \u0985\u09A4\u09BF\u0995\u09CD\u09B0\u09AE \u0995\u09B0\u09C7\u099B\u09C7\u0964 \u09AA\u09C1\u09A8\u09B0\u09BE\u09AF\u09BC \u09A8\u09A4\u09C1\u09A8 \u0995\u09CB\u09A1 \u09AA\u09BE\u09A0\u09BE\u09A8\u0964" });
      }
      record.attempts += 1;
      const inputHash = import_crypto.default.createHash("sha256").update(String(otp).trim()).digest("hex");
      if (inputHash !== record.otpHash) {
        return res.status(400).json({ error: "\u09AD\u09C1\u09B2 \u0993\u099F\u09BF\u09AA\u09BF \u0995\u09CB\u09A1\u0964 \u09AA\u09C1\u09A8\u09B0\u09BE\u09AF\u09BC \u09AF\u09BE\u099A\u09BE\u0987 \u0995\u09B0\u09C1\u09A8\u0964" });
      }
      recoveryOtpStore.delete(normalizedEmail);
      const resetToken = createRecoveryToken(
        {
          role: "admin",
          memberId: "mem-1",
          purpose: "admin_password_recovery",
          email: normalizedEmail
        },
        15 * 60 * 1e3
        // 15 minutes
      );
      return res.json({
        success: true,
        message: "\u0993\u099F\u09BF\u09AA\u09BF \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u09AF\u09BE\u099A\u09BE\u0987 \u0995\u09B0\u09BE \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964",
        resetToken
      });
    } catch (err) {
      console.error("Verify recovery OTP error:", err);
      return res.status(500).json({ error: err?.message || "\u0993\u099F\u09BF\u09AA\u09BF \u09AF\u09BE\u099A\u09BE\u0987\u0995\u09B0\u09A3 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964" });
    }
  });
  app.post("/api/admin/reset-password-with-token", async (req, res) => {
    try {
      const { resetToken, newPassword } = req.body;
      if (!resetToken || !newPassword) {
        return res.status(400).json({ error: "\u09B0\u09BF\u0995\u09AD\u09BE\u09B0\u09BF \u099F\u09CB\u0995\u09C7\u09A8 \u098F\u09AC\u0982 \u09A8\u09A4\u09C1\u09A8 \u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u0989\u09AD\u09AF\u09BC\u0987 \u0986\u09AC\u09B6\u09CD\u09AF\u0995\u0964" });
      }
      const payload = verifyRecoveryToken(resetToken);
      if (!payload) {
        return res.status(401).json({ error: "\u09B0\u09BF\u0995\u09AD\u09BE\u09B0\u09BF \u09B8\u09C7\u09B6\u09A8 \u09AE\u09C7\u09AF\u09BC\u09BE\u09A6\u09CB\u09A4\u09CD\u09A4\u09C0\u09B0\u09CD\u09A3 \u09AC\u09BE \u0985\u09AC\u09C8\u09A7\u0964 \u0986\u09AC\u09BE\u09B0 \u0993\u099F\u09BF\u09AA\u09BF \u09AF\u09BE\u099A\u09BE\u0987 \u0995\u09B0\u09C1\u09A8\u0964" });
      }
      if (payload.purpose !== "admin_password_recovery") {
        return res.status(403).json({ error: "\u0985\u09AC\u09C8\u09A7 \u09B0\u09BF\u0995\u09AD\u09BE\u09B0\u09BF \u099F\u09CB\u0995\u09C7\u09A8\u0964" });
      }
      const cleanPassword = String(newPassword).replace(/[০-৯]/g, (d) => bnToEnMap[d] || d).trim();
      if (!/^\d{4}$/.test(cleanPassword)) {
        return res.status(400).json({
          error: "\u09A8\u09A4\u09C1\u09A8 \u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u0985\u09AC\u09B6\u09CD\u09AF\u0987 \u09A0\u09BF\u0995 \u09EA \u09B8\u0982\u0996\u09CD\u09AF\u09BE\u09B0 (\u09A1\u09BF\u099C\u09BF\u099F) \u09B9\u09A4\u09C7 \u09B9\u09AC\u09C7 (\u09AF\u09C7\u09AE\u09A8: \u09E7\u09E8\u09E9\u09EA \u09AC\u09BE \u09EF\u09EC\u09ED\u09EE)\u0964"
        });
      }
      if (!clientDb) {
        return res.status(500).json({ error: "\u09A1\u09BE\u099F\u09BE\u09AC\u09C7\u09B8 \u09B8\u0982\u09AF\u09CB\u0997 \u0989\u09AA\u09B2\u09AC\u09CD\u09A7 \u09A8\u09DF\u0964" });
      }
      const adminMemberRef = (0, import_firestore.doc)(clientDb, "members", "mem-1");
      const adminSnap = await (0, import_firestore.getDoc)(adminMemberRef);
      if (!adminSnap.exists()) {
        return res.status(404).json({ error: "\u0985\u09CD\u09AF\u09BE\u09A1\u09AE\u09BF\u09A8 \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09A4\u09A5\u09CD\u09AF \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF\u0964" });
      }
      const memberData = adminSnap.data();
      const newHash = hashPassword(cleanPassword);
      await (0, import_firestore.updateDoc)(adminMemberRef, {
        passwordHash: newHash,
        mustChangePassword: false,
        requiresPasswordReset: false,
        updatedAt: (0, import_firestore.serverTimestamp)()
      });
      const phone = memberData.phone || memberData.Phone || "01907006460";
      if (adminAuthInstance) {
        try {
          const fbPassword = formatFirebaseAuthPassword(cleanPassword);
          if (memberData.uid) {
            await adminAuthInstance.updateUser(memberData.uid, { password: fbPassword });
          } else {
            const email = phoneToInternalEmail(phone);
            const u = await adminAuthInstance.getUserByEmail(email);
            if (u) {
              await adminAuthInstance.updateUser(u.uid, { password: fbPassword });
            }
          }
        } catch (authErr) {
          console.warn("Firebase Auth update note in recovery:", authErr);
        }
      }
      const sessionToken = createSessionToken({
        memberId: "mem-1",
        role: "admin",
        phone,
        name: memberData.name || "\u09B6\u09BE\u09B9\u09B0\u09BF\u09DF\u09BE\u09B0 \u0987\u09B0\u09BE\u09AE"
      });
      return res.json({
        success: true,
        message: "\u0985\u09CD\u09AF\u09BE\u09A1\u09AE\u09BF\u09A8 \u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u0986\u09AA\u09A1\u09C7\u099F \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964",
        token: sessionToken,
        member: {
          id: "mem-1",
          name: memberData.name || "\u09B6\u09BE\u09B9\u09B0\u09BF\u09DF\u09BE\u09B0 \u0987\u09B0\u09BE\u09AE",
          phone,
          role: "admin",
          memberCode: memberData.memberCode || "\u09B8\u09CB-\u09E6\u09E7"
        }
      });
    } catch (err) {
      console.error("Reset admin password with token error:", err);
      return res.status(500).json({ error: err?.message || "\u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u0986\u09AA\u09A1\u09C7\u099F \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964" });
    }
  });
  app.get("/firebase-messaging-sw.js", (req, res, next) => {
    const swPath = import_path.default.join(process.cwd(), "public", "firebase-messaging-sw.js");
    if (import_fs.default.existsSync(swPath)) {
      res.setHeader("Content-Type", "application/javascript");
      res.sendFile(swPath);
    } else {
      next();
    }
  });
  app.post("/api/notifications/register-token", async (req, res) => {
    try {
      const { token, memberId, memberName, phone, role, platform } = req.body;
      if (!token || !memberId) {
        return res.status(400).json({ error: "Token and memberId are required" });
      }
      const tokenDocId = "tok_" + import_crypto.default.createHash("sha256").update(token).digest("hex").slice(0, 32);
      const tokenRef = (0, import_firestore.doc)(clientDb, "fcmTokens", tokenDocId);
      await (0, import_firestore.setDoc)(
        tokenRef,
        {
          token,
          memberId,
          memberName: memberName || "",
          phone: phone || "",
          role: role || "member",
          platform: platform || "android",
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          lastActiveAt: Date.now()
        },
        { merge: true }
      );
      try {
        const memberRef = (0, import_firestore.doc)(clientDb, "members", memberId);
        const memSnap = await (0, import_firestore.getDoc)(memberRef);
        const existingData = memSnap.exists() ? memSnap.data() : null;
        await (0, import_firestore.updateDoc)(memberRef, {
          fcmToken: token,
          fcmUpdatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          // Default to true only if not previously configured by Admin
          ...existingData && existingData.notificationsEnabled !== void 0 ? {} : { notificationsEnabled: true }
        });
      } catch (mErr) {
        console.warn("Could not update member document fcmToken directly:", mErr);
      }
      return res.json({ success: true, message: "FCM Token registered for profile " + memberId });
    } catch (err) {
      console.error("Register FCM token error:", err);
      return res.status(500).json({ error: err?.message || "Token registration failed" });
    }
  });
  app.post("/api/notifications/confirm-and-send", async (req, res) => {
    try {
      const { eventId, memberId, memberName, weekNumber, amount, date, message, title: requestedTitle } = req.body;
      if (!memberId) {
        return res.status(400).json({ error: "memberId is required" });
      }
      if (clientDb) {
        try {
          const memberRef = (0, import_firestore.doc)(clientDb, "members", memberId);
          const memberSnap = await (0, import_firestore.getDoc)(memberRef);
          if (memberSnap.exists()) {
            const memberData = memberSnap.data();
            if (memberData.notificationsEnabled === false) {
              if (eventId) {
                const eventRef = (0, import_firestore.doc)(clientDb, "notificationEvents", eventId);
                await (0, import_firestore.updateDoc)(eventRef, {
                  status: "skipped",
                  error: "Member notifications are disabled by Admin",
                  updatedAt: (/* @__PURE__ */ new Date()).toISOString()
                });
              }
              return res.json({
                success: false,
                skipped: true,
                message: "\u098F\u0987 \u09B8\u09A6\u09B8\u09CD\u09AF\u09C7\u09B0 \u09A8\u09CB\u099F\u09BF\u09AB\u09BF\u0995\u09C7\u09B6\u09A8 \u09AC\u09A8\u09CD\u09A7 \u09A5\u09BE\u0995\u09BE\u09DF \u09AA\u09BE\u09A0\u09BE\u09A8\u09CB \u09B9\u09DF\u09A8\u09BF\u0964"
              });
            }
            let finalNotificationBody = message;
            if (!finalNotificationBody && eventId) {
              try {
                const eventRef = (0, import_firestore.doc)(clientDb, "notificationEvents", eventId);
                const eventSnap = await (0, import_firestore.getDoc)(eventRef);
                if (eventSnap.exists()) {
                  finalNotificationBody = eventSnap.data()?.message;
                }
              } catch (e) {
                console.warn("Could not read message from notificationEvents:", e);
              }
            }
            if (!finalNotificationBody) {
              const weekNumBn = String(weekNumber || "").replace(
                /[0-9]/g,
                (d) => ({ "0": "\u09E6", "1": "\u09E7", "2": "\u09E8", "3": "\u09E9", "4": "\u09EA", "5": "\u09EB", "6": "\u09EC", "7": "\u09ED", "8": "\u09EE", "9": "\u09EF" })[d] || d
              );
              finalNotificationBody = `\u09B8\u09AE\u09CD\u09AE\u09BE\u09A8\u09BF\u09A4 ${memberName || memberData.name || ""}, \u0986\u09AA\u09A8\u09BE\u09B0 \u09B8\u09AA\u09CD\u09A4\u09BE\u09B9 ${weekNumBn}-\u098F\u09B0 \u099C\u09AE\u09BE \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u09B8\u0982\u09B0\u0995\u09CD\u09B7\u09BF\u09A4 \u09B9\u09DF\u09C7\u099B\u09C7\u0964 \u09A7\u09A8\u09CD\u09AF\u09AC\u09BE\u09A6\u0964`;
            }
            const notificationTitle = requestedTitle?.trim() || deriveNotificationTitleFromMessage(finalNotificationBody);
            let fcmSentSuccessfully = false;
            let fcmFailureReason = null;
            if (!adminMessagingInstance) {
              fcmFailureReason = "Firebase Admin Messaging \u09B8\u09BE\u09B0\u09CD\u09AD\u09BF\u09B8 \u09B8\u0995\u09CD\u09B0\u09BF\u09DF \u09A8\u09C7\u0987\u0964";
            } else if (!memberData.fcmToken) {
              fcmFailureReason = "\u098F\u0987 \u09B8\u09A6\u09B8\u09CD\u09AF\u09C7\u09B0 \u09A1\u09BF\u09AD\u09BE\u0987\u09B8\u09C7 \u09AA\u09C1\u09B6 \u09A8\u09CB\u099F\u09BF\u09AB\u09BF\u0995\u09C7\u09B6\u09A8 \u099A\u09BE\u09B2\u09C1 \u09A8\u09C7\u0987 (FCM Token \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF)\u0964";
            } else {
              try {
                await adminMessagingInstance.send({
                  token: memberData.fcmToken,
                  notification: {
                    title: notificationTitle,
                    body: finalNotificationBody
                  },
                  data: {
                    type: "deposit_confirmation",
                    memberId: String(memberId),
                    weekNumber: String(weekNumber || ""),
                    amount: String(amount || ""),
                    date: String(date || "")
                  },
                  android: {
                    priority: "high",
                    notification: {
                      channelId: "org_payment_alerts",
                      icon: "ic_stat_notification",
                      color: "#047857",
                      visibility: "public",
                      priority: "high",
                      defaultSound: true
                    }
                  },
                  webpush: {
                    fcmOptions: {
                      link: "/"
                    }
                  }
                });
                fcmSentSuccessfully = true;
              } catch (fcmErr) {
                console.warn("FCM send message warning:", fcmErr?.message || fcmErr);
                fcmFailureReason = "FCM \u09B8\u09BE\u09B0\u09CD\u09AD\u09BE\u09B0\u09C7 \u09A8\u09CB\u099F\u09BF\u09AB\u09BF\u0995\u09C7\u09B6\u09A8 \u09AA\u09BE\u09A0\u09BE\u09A4\u09C7 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09DF\u09C7\u099B\u09C7\u0964";
              }
            }
            if (fcmSentSuccessfully) {
              if (eventId) {
                const eventRef = (0, import_firestore.doc)(clientDb, "notificationEvents", eventId);
                await (0, import_firestore.updateDoc)(eventRef, {
                  status: "sent",
                  sentAt: (/* @__PURE__ */ new Date()).toISOString(),
                  confirmedAt: (/* @__PURE__ */ new Date()).toISOString(),
                  updatedAt: (/* @__PURE__ */ new Date()).toISOString()
                });
              }
              return res.json({
                success: true,
                message: "\u09A8\u09CB\u099F\u09BF\u09AB\u09BF\u0995\u09C7\u09B6\u09A8 \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u09AA\u09BE\u09A0\u09BE\u09A8\u09CB \u09B9\u09DF\u09C7\u099B\u09C7\u0964"
              });
            } else {
              if (eventId) {
                const eventRef = (0, import_firestore.doc)(clientDb, "notificationEvents", eventId);
                await (0, import_firestore.updateDoc)(eventRef, {
                  status: "failed",
                  error: fcmFailureReason || "\u09A8\u09CB\u099F\u09BF\u09AB\u09BF\u0995\u09C7\u09B6\u09A8 \u09AA\u09BE\u09A0\u09BE\u09A8\u09CB \u09AF\u09BE\u09DF\u09A8\u09BF\u0964",
                  updatedAt: (/* @__PURE__ */ new Date()).toISOString()
                });
              }
              return res.json({
                success: false,
                error: fcmFailureReason || "\u09A8\u09CB\u099F\u09BF\u09AB\u09BF\u0995\u09C7\u09B6\u09A8 \u09AA\u09BE\u09A0\u09BE\u09A8\u09CB \u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8 \u0995\u09B0\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF\u0964"
              });
            }
          } else {
            return res.status(404).json({
              success: false,
              error: "\u09B8\u09A6\u09B8\u09CD\u09AF\u09C7\u09B0 \u09A4\u09A5\u09CD\u09AF \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF\u0964"
            });
          }
        } catch (dbErr) {
          console.warn("Notification event confirm db update warning:", dbErr);
          return res.status(500).json({
            success: false,
            error: "\u09A1\u09BE\u099F\u09BE\u09AC\u09C7\u099C\u09C7 \u09A8\u09CB\u099F\u09BF\u09AB\u09BF\u0995\u09C7\u09B6\u09A8 \u0986\u09AA\u09A1\u09C7\u099F \u0995\u09B0\u09A4\u09C7 \u09B8\u09AE\u09B8\u09CD\u09AF\u09BE \u09B9\u09DF\u09C7\u099B\u09C7\u0964"
          });
        }
      }
      return res.status(500).json({
        success: false,
        error: "\u09A1\u09BE\u099F\u09BE\u09AC\u09C7\u099C \u09B8\u0982\u09AF\u09CB\u0997 \u09B8\u0995\u09CD\u09B0\u09BF\u09DF \u09A8\u09C7\u0987\u0964"
      });
    } catch (err) {
      console.error("Confirm and send notification error:", err);
      return res.status(500).json({ error: err?.message || "\u09A8\u09CB\u099F\u09BF\u09AB\u09BF\u0995\u09C7\u09B6\u09A8 \u09AA\u09BE\u09A0\u09BE\u09A8\u09CB \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09DF\u09C7\u099B\u09C7\u0964" });
    }
  });
  app.post("/api/scheduler/trigger", async (req, res) => {
    try {
      const expectedSecret = process.env.CRON_SECRET || process.env.SCHEDULER_SECRET_KEY;
      const providedSecret = req.headers["x-cron-secret"] || req.headers["x-scheduler-secret"];
      const authHeader = req.headers["authorization"];
      const bearerToken = authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ") ? authHeader.substring(7).trim() : null;
      const userAgent = req.headers["user-agent"] || "";
      const isAuthorized = (() => {
        if (expectedSecret) {
          return providedSecret === expectedSecret || bearerToken === expectedSecret;
        }
        if (bearerToken) {
          return true;
        }
        if (typeof userAgent === "string" && userAgent.includes("Google-Cloud-Scheduler")) {
          return true;
        }
        return false;
      })();
      if (!isAuthorized) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized: Missing or invalid authentication token/secret."
        });
      }
      const action = req.body?.action || req.body?.type;
      if (!action || action !== "morning_status" && action !== "night_due_reminder") {
        return res.status(400).json({
          success: false,
          error: 'Invalid action. Supported actions are: "morning_status", "night_due_reminder"'
        });
      }
      const dhakaDateString = getDhakaDateString();
      if (action === "morning_status") {
        console.log(`[CloudSchedulerTrigger] Triggering Friday morning notification for ${dhakaDateString}...`);
        await runFridayMorningNotifications(dhakaDateString);
        return res.json({
          success: true,
          action: "morning_status",
          date: dhakaDateString,
          message: "Friday morning notification completed successfully."
        });
      }
      if (action === "night_due_reminder") {
        console.log(`[CloudSchedulerTrigger] Triggering Friday night due reminder for ${dhakaDateString}...`);
        await runFridayNightDueReminders(dhakaDateString);
        return res.json({
          success: true,
          action: "night_due_reminder",
          date: dhakaDateString,
          message: "Friday night due reminder completed successfully."
        });
      }
    } catch (err) {
      console.error("[CloudSchedulerTrigger] Unexpected error in trigger endpoint:", err);
      return res.status(500).json({
        success: false,
        error: err?.message || "Internal server error while triggering scheduler."
      });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    initFridayMorningScheduler();
  });
}
function getDhakaDateString() {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "numeric",
    day: "numeric"
  });
  const parts = dtf.formatToParts(/* @__PURE__ */ new Date());
  const year = parts.find((p) => p.type === "year")?.value || (/* @__PURE__ */ new Date()).getFullYear().toString();
  const month = (parts.find((p) => p.type === "month")?.value || "").padStart(2, "0");
  const day = (parts.find((p) => p.type === "day")?.value || "").padStart(2, "0");
  return `${year}-${month}-${day}`;
}
async function runFridayMorningNotifications(dhakaDateString) {
  if (!clientDb || !adminMessagingInstance) {
    console.warn("[FridayScheduler] Cannot run: clientDb or adminMessagingInstance not initialized.");
    return;
  }
  const runDocId = `friday-8am-run-${dhakaDateString}`;
  const runDocRef = (0, import_firestore.doc)(clientDb, "notificationEvents", runDocId);
  try {
    const runDocSnap = await (0, import_firestore.getDoc)(runDocRef);
    if (runDocSnap.exists()) {
      const runData = runDocSnap.data();
      if (runData?.status === "completed") {
        console.log(`[FridayScheduler] Run ${runDocId} is already completed. Skipping.`);
        return;
      }
      if (runData?.status === "in_progress") {
        const STALE_LOCK_TIMEOUT_MS = 5 * 60 * 1e3;
        const startedAt = runData?.startedAt || runData?.updatedAt || runData?.createdAt;
        const startedTime = startedAt ? new Date(startedAt).getTime() : 0;
        const isStale = !startedTime || Date.now() - startedTime > STALE_LOCK_TIMEOUT_MS;
        if (!isStale) {
          console.log(`[FridayScheduler] Run ${runDocId} is actively in_progress (started at ${startedAt}). Skipping.`);
          return;
        }
        console.warn(
          `[FridayScheduler] Detected stale in_progress lock for ${runDocId} (started at ${startedAt}). Re-acquiring lock and recovering run.`
        );
      }
    }
    await (0, import_firestore.setDoc)(runDocRef, {
      id: runDocId,
      memberId: "system_scheduler",
      type: "weekly_reminder",
      message: `Friday 8:00 AM automatic weekly notification run for ${dhakaDateString}`,
      status: "in_progress",
      startedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdAt: runDocSnap.exists() && runDocSnap.data()?.createdAt ? runDocSnap.data().createdAt : (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (lockErr) {
    console.error("[FridayScheduler] Failed to check or acquire run lock:", lockErr);
    return;
  }
  console.log(`[FridayScheduler] Starting Friday 8:00 AM notification run for ${dhakaDateString}...`);
  let currentWeek = getCurrentWeekNumber();
  let weeklyTarget = 100;
  try {
    const settingsRef = (0, import_firestore.doc)(clientDb, "settings", "organization");
    const settingsSnap = await (0, import_firestore.getDoc)(settingsRef);
    if (settingsSnap.exists()) {
      const sData = settingsSnap.data();
      if (sData?.currentWeek) currentWeek = sData.currentWeek;
      if (sData?.weeklyTarget) weeklyTarget = sData.weeklyTarget;
    }
  } catch (setErr) {
    console.warn("[FridayScheduler] Notice reading settings, using default/calculated week:", setErr);
  }
  const membersList = [];
  try {
    const membersRef = (0, import_firestore.collection)(clientDb, "members");
    const membersSnap = await (0, import_firestore.getDocs)(membersRef);
    membersSnap.forEach((d) => {
      const mData = d.data();
      membersList.push({ id: d.id, ...mData });
    });
  } catch (mErr) {
    console.error("[FridayScheduler] Failed to load members from Firestore:", mErr);
    try {
      await (0, import_firestore.updateDoc)(runDocRef, {
        status: "failed",
        error: "Failed to load members from Firestore",
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (_) {
    }
    return;
  }
  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  for (const member of membersList) {
    if (member.id === "mem-1" || member.role === "admin" || member.Role === "admin") {
      skippedCount++;
      continue;
    }
    const status = (member.status || member.Status || "").toLowerCase();
    if (status === "inactive" || status === "\u09A8\u09BF\u09B7\u09CD\u0995\u09CD\u09B0\u09BF\u09DF") {
      skippedCount++;
      continue;
    }
    if (member.notificationsEnabled === false) {
      skippedCount++;
      continue;
    }
    const token = member.fcmToken;
    if (!token || typeof token !== "string" || !token.trim()) {
      skippedCount++;
      continue;
    }
    const eventId = `friday-8am-${dhakaDateString}-${member.id}`;
    const eventRef = (0, import_firestore.doc)(clientDb, "notificationEvents", eventId);
    try {
      const existingSnap = await (0, import_firestore.getDoc)(eventRef);
      if (existingSnap.exists() && existingSnap.data()?.status === "sent") {
        skippedCount++;
        continue;
      }
    } catch (e) {
    }
    const finances = processMember52Weeks(member, currentWeek, weeklyTarget);
    const remainingDue = finances.all52Weeks.filter((w) => w.weekNumber <= currentWeek && w.status === "due").map((w) => w.weekNumber);
    const advance = finances.all52Weeks.filter((w) => w.weekNumber > currentWeek && (w.status === "advance" || w.status === "paid")).map((w) => w.weekNumber);
    let notificationBody = "";
    let notificationTitle = "\u09B8\u09BE\u09AA\u09CD\u09A4\u09BE\u09B9\u09BF\u0995 \u099C\u09AE\u09BE \u09B8\u09AB\u09B2 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7";
    if (remainingDue.length > 0 || advance.length > 0) {
      notificationBody = buildWeeklyPaymentNotificationMessage({
        remainingDueWeeks: remainingDue,
        advanceWeeks: advance
      });
      notificationTitle = getWeeklyPaymentNotificationTitle({
        remainingDueWeeks: remainingDue,
        advanceWeeks: advance
      });
    } else {
      notificationBody = `\u09B8\u09AE\u09CD\u09AE\u09BE\u09A8\u09BF\u09A4 ${member.name}, \u0986\u09AA\u09A8\u09BE\u09B0 \u09B8\u09AA\u09CD\u09A4\u09BE\u09B9 ${toBengaliNumber(currentWeek)}-\u098F\u09B0 \u099C\u09AE\u09BE \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u09B8\u0982\u09B0\u0995\u09CD\u09B7\u09BF\u09A4 \u09B9\u09DF\u09C7\u099B\u09C7\u0964 \u09A7\u09A8\u09CD\u09AF\u09AC\u09BE\u09A6\u0964`;
      notificationTitle = "\u09B8\u09BE\u09AA\u09CD\u09A4\u09BE\u09B9\u09BF\u0995 \u099C\u09AE\u09BE \u09B8\u09AB\u09B2 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7";
    }
    try {
      await adminMessagingInstance.send({
        token: token.trim(),
        notification: {
          title: notificationTitle,
          body: notificationBody
        },
        data: {
          type: "weekly_reminder",
          memberId: String(member.id),
          weekNumber: String(currentWeek)
        },
        android: {
          priority: "high",
          notification: {
            channelId: "org_payment_alerts",
            icon: "ic_stat_notification",
            color: "#047857",
            visibility: "public",
            priority: "high",
            defaultSound: true
          }
        },
        webpush: {
          fcmOptions: {
            link: "/"
          }
        }
      });
      await (0, import_firestore.setDoc)(eventRef, {
        id: eventId,
        memberId: member.id,
        type: "weekly_reminder",
        memberName: member.name,
        memberPhone: member.phone || "",
        weekNumber: currentWeek,
        amount: weeklyTarget,
        message: notificationBody,
        status: "sent",
        sentAt: (/* @__PURE__ */ new Date()).toISOString(),
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      sentCount++;
    } catch (fcmErr) {
      console.warn(`[FridayScheduler] FCM send error for member ${member.id}:`, fcmErr?.message || fcmErr);
      try {
        await (0, import_firestore.setDoc)(eventRef, {
          id: eventId,
          memberId: member.id,
          type: "weekly_reminder",
          memberName: member.name,
          memberPhone: member.phone || "",
          weekNumber: currentWeek,
          amount: weeklyTarget,
          message: notificationBody,
          status: "failed",
          error: fcmErr?.message || "FCM send failed",
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      } catch (_) {
      }
      failedCount++;
    }
  }
  try {
    await (0, import_firestore.updateDoc)(runDocRef, {
      status: "completed",
      completedAt: (/* @__PURE__ */ new Date()).toISOString(),
      sentCount,
      failedCount,
      skippedCount,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    console.log(
      `[FridayScheduler] Completed Friday 8:00 AM notification run. Sent: ${sentCount}, Failed: ${failedCount}, Skipped: ${skippedCount}`
    );
  } catch (cErr) {
    console.warn("[FridayScheduler] Could not update run document completion status:", cErr);
  }
}
async function runFridayNightDueReminders(dhakaDateString) {
  if (!clientDb || !adminMessagingInstance) {
    console.warn("[FridayNightDueReminder] Cannot run: clientDb or adminMessagingInstance not initialized.");
    return;
  }
  const runDocId = `friday-10pm-run-${dhakaDateString}`;
  const runDocRef = (0, import_firestore.doc)(clientDb, "notificationEvents", runDocId);
  try {
    const runDocSnap = await (0, import_firestore.getDoc)(runDocRef);
    if (runDocSnap.exists()) {
      const runData = runDocSnap.data();
      if (runData?.status === "completed") {
        console.log(`[FridayNightDueReminder] Run ${runDocId} is already completed. Skipping.`);
        return;
      }
      if (runData?.status === "in_progress") {
        const STALE_LOCK_TIMEOUT_MS = 5 * 60 * 1e3;
        const startedAt = runData?.startedAt || runData?.updatedAt || runData?.createdAt;
        const startedTime = startedAt ? new Date(startedAt).getTime() : 0;
        const isStale = !startedTime || Date.now() - startedTime > STALE_LOCK_TIMEOUT_MS;
        if (!isStale) {
          console.log(`[FridayNightDueReminder] Run ${runDocId} is actively in_progress (started at ${startedAt}). Skipping.`);
          return;
        }
        console.warn(
          `[FridayNightDueReminder] Detected stale in_progress lock for ${runDocId} (started at ${startedAt}). Re-acquiring lock and recovering run.`
        );
      }
    }
    await (0, import_firestore.setDoc)(runDocRef, {
      id: runDocId,
      memberId: "system_scheduler",
      type: "weekly_reminder",
      message: `Friday 10:00 PM automatic due reminder run for ${dhakaDateString}`,
      status: "in_progress",
      startedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdAt: runDocSnap.exists() && runDocSnap.data()?.createdAt ? runDocSnap.data().createdAt : (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (lockErr) {
    console.error("[FridayNightDueReminder] Failed to check or acquire run lock:", lockErr);
    return;
  }
  console.log(`[FridayNightDueReminder] Starting Friday 10:00 PM due reminder run for ${dhakaDateString}...`);
  let currentWeek = getCurrentWeekNumber();
  let weeklyTarget = 100;
  try {
    const settingsRef = (0, import_firestore.doc)(clientDb, "settings", "organization");
    const settingsSnap = await (0, import_firestore.getDoc)(settingsRef);
    if (settingsSnap.exists()) {
      const sData = settingsSnap.data();
      if (sData?.currentWeek) currentWeek = sData.currentWeek;
      if (sData?.weeklyTarget) weeklyTarget = sData.weeklyTarget;
    }
  } catch (setErr) {
    console.warn("[FridayNightDueReminder] Notice reading settings, using default/calculated week:", setErr);
  }
  const membersList = [];
  try {
    const membersRef = (0, import_firestore.collection)(clientDb, "members");
    const membersSnap = await (0, import_firestore.getDocs)(membersRef);
    membersSnap.forEach((d) => {
      const mData = d.data();
      membersList.push({ id: d.id, ...mData });
    });
  } catch (mErr) {
    console.error("[FridayNightDueReminder] Failed to load members from Firestore:", mErr);
    try {
      await (0, import_firestore.updateDoc)(runDocRef, {
        status: "failed",
        error: "Failed to load members from Firestore",
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (_) {
    }
    return;
  }
  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  for (const member of membersList) {
    if (member.id === "mem-1" || member.role === "admin" || member.Role === "admin") {
      skippedCount++;
      continue;
    }
    const status = (member.status || member.Status || "").toLowerCase();
    if (status === "inactive" || status === "\u09A8\u09BF\u09B7\u09CD\u0995\u09CD\u09B0\u09BF\u09DF") {
      skippedCount++;
      continue;
    }
    if (member.notificationsEnabled === false) {
      skippedCount++;
      continue;
    }
    const token = member.fcmToken;
    if (!token || typeof token !== "string" || !token.trim()) {
      skippedCount++;
      continue;
    }
    const finances = processMember52Weeks(member, currentWeek, weeklyTarget);
    const remainingDue = finances.all52Weeks.filter((w) => w.weekNumber <= currentWeek && w.status === "due").map((w) => w.weekNumber);
    if (remainingDue.length === 0) {
      skippedCount++;
      continue;
    }
    const eventId = `friday-10pm-${dhakaDateString}-${member.id}`;
    const eventRef = (0, import_firestore.doc)(clientDb, "notificationEvents", eventId);
    try {
      const existingSnap = await (0, import_firestore.getDoc)(eventRef);
      if (existingSnap.exists() && existingSnap.data()?.status === "sent") {
        skippedCount++;
        continue;
      }
    } catch (e) {
    }
    const notificationBody = buildWeeklyPaymentNotificationMessage({
      remainingDueWeeks: remainingDue,
      advanceWeeks: []
    });
    const totalDueAmount = remainingDue.length * weeklyTarget;
    try {
      await adminMessagingInstance.send({
        token: token.trim(),
        notification: {
          title: "\u09B8\u09BE\u09AA\u09CD\u09A4\u09BE\u09B9\u09BF\u0995 \u099C\u09AE\u09BE \u09AC\u0995\u09C7\u09AF\u09BC\u09BE \u09B0\u09AF\u09BC\u09C7\u099B\u09C7",
          body: notificationBody
        },
        data: {
          type: "weekly_reminder",
          memberId: String(member.id),
          weekNumber: String(currentWeek),
          reminderType: "night_due_reminder"
        },
        android: {
          priority: "high",
          notification: {
            channelId: "org_payment_alerts",
            icon: "ic_stat_notification",
            color: "#047857",
            visibility: "public",
            priority: "high",
            defaultSound: true
          }
        },
        webpush: {
          fcmOptions: {
            link: "/"
          }
        }
      });
      await (0, import_firestore.setDoc)(eventRef, {
        id: eventId,
        memberId: member.id,
        type: "weekly_reminder",
        memberName: member.name,
        memberPhone: member.phone || "",
        weekNumber: currentWeek,
        amount: totalDueAmount,
        message: notificationBody,
        status: "sent",
        sentAt: (/* @__PURE__ */ new Date()).toISOString(),
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      sentCount++;
    } catch (fcmErr) {
      console.warn(`[FridayNightDueReminder] FCM send error for member ${member.id}:`, fcmErr?.message || fcmErr);
      try {
        await (0, import_firestore.setDoc)(eventRef, {
          id: eventId,
          memberId: member.id,
          type: "weekly_reminder",
          memberName: member.name,
          memberPhone: member.phone || "",
          weekNumber: currentWeek,
          amount: totalDueAmount,
          message: notificationBody,
          status: "failed",
          error: fcmErr?.message || "FCM send failed",
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      } catch (_) {
      }
      failedCount++;
    }
  }
  try {
    await (0, import_firestore.updateDoc)(runDocRef, {
      status: "completed",
      completedAt: (/* @__PURE__ */ new Date()).toISOString(),
      sentCount,
      failedCount,
      skippedCount,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    console.log(
      `[FridayNightDueReminder] Completed Friday 10:00 PM due reminder run. Sent: ${sentCount}, Failed: ${failedCount}, Skipped: ${skippedCount}`
    );
  } catch (cErr) {
    console.warn("[FridayNightDueReminder] Could not update run document completion status:", cErr);
  }
}
function checkAndTriggerFridayMorningNotification() {
  if (!clientDb || !adminMessagingInstance) return;
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23"
  });
  const parts = dtf.formatToParts(/* @__PURE__ */ new Date());
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value.padStart(2, "0");
  const day = parts.find((p) => p.type === "day")?.value.padStart(2, "0");
  const weekday = parts.find((p) => p.type === "weekday")?.value;
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
  const isFriday = weekday === "Fri";
  const is8AM = hour === 8;
  if (isFriday && is8AM && year && month && day) {
    const dhakaDateString = `${year}-${month}-${day}`;
    runFridayMorningNotifications(dhakaDateString).catch((err) => {
      console.error("[FridayScheduler] Unhandled error during Friday notification run:", err);
    });
  }
}
function checkAndTriggerFridayNightDueReminder() {
  if (!clientDb || !adminMessagingInstance) return;
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23"
  });
  const parts = dtf.formatToParts(/* @__PURE__ */ new Date());
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value.padStart(2, "0");
  const day = parts.find((p) => p.type === "day")?.value.padStart(2, "0");
  const weekday = parts.find((p) => p.type === "weekday")?.value;
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
  const isFriday = weekday === "Fri";
  const is10PM = hour === 22;
  if (isFriday && is10PM && year && month && day) {
    const dhakaDateString = `${year}-${month}-${day}`;
    runFridayNightDueReminders(dhakaDateString).catch((err) => {
      console.error("[FridayNightDueReminder] Unhandled error during Friday 10 PM due reminder run:", err);
    });
  }
}
function initFridayMorningScheduler() {
  console.log("[FridayScheduler] Initializing 60-second Friday notification scheduler (8:00 AM & 10:00 PM)...");
  checkAndTriggerFridayMorningNotification();
  checkAndTriggerFridayNightDueReminder();
  setInterval(() => {
    checkAndTriggerFridayMorningNotification();
    checkAndTriggerFridayNightDueReminder();
  }, 6e4);
}
startServer();
//# sourceMappingURL=server.cjs.map
