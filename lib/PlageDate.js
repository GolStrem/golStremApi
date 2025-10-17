const SLOT_DURATION = 30;
const SLOTS_PER_DAY = 24 * 60 / SLOT_DURATION;

function timeToSlot(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return Math.floor((h * 60 + m) / SLOT_DURATION);
}

function slotToTime(slot) {
  const totalMins = slot * SLOT_DURATION;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function fctDateToCode(ranges) {
  ranges = ranges.filter(d => d[0] !== d[1])
  if (ranges.length === 0) return '2RRVTHNXTR';

  let bitmap = 0n;
  for (const [start, end] of ranges) {
    const sSlot = timeToSlot(start);
    const eSlot = timeToSlot(end);
    for (let i = sSlot; i < eSlot; i++) {
      bitmap |= (1n << BigInt(i));
    }
  }
  return bitmap.toString(36);
}

function fctCodeToDate(code) {
  const bitmap = bigIntFromBase36(code);
  const ranges = [];
  let inRange = false;
  let start = 0;

  for (let i = 0; i <= SLOTS_PER_DAY; i++) {
    const bitSet = (bitmap >> BigInt(i)) & 1n;
    if (bitSet && !inRange) {
      start = i;
      inRange = true;
    } else if (!bitSet && inRange) {
      // fin d'une plage
      ranges.push([slotToTime(start), slotToTime(i)]);
      inRange = false;
    }
  }
  return ranges;
}

function bigIntFromBase36(str) {
  const digits = '0123456789abcdefghijklmnopqrstuvwxyz';
  let result = 0n;
  for (const c of str.toLowerCase()) {
    const val = BigInt(digits.indexOf(c));
    if (val < 0n) throw new Error(`Invalid base36 digit: ${c}`);
    result = result * 36n + val;
  }
  return result;
}


module.exports = {fctDateToCode,fctCodeToDate};