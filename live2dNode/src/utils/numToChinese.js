// 阿拉伯数字 -> 中文读法，解决 F5-TTS 把数字读成英文的问题
const D = "零一二三四五六七八九";
const S = ["", "十", "百", "千"];   // 段内单位
const B = ["", "万", "亿", "兆"];   // 段单位

/** 0~9999 段内整数转中文 */
function section(n) {
  if (n === 0) return "零";
  let s = "", zero = false;
  for (let i = 0; i < 4; i++) {
    const d = Math.floor(n / 10 ** (3 - i)) % 10; // 千位 -> 个位
    if (d === 0) { if (s) zero = true; continue; }
    if (zero) { s += "零"; zero = false; }
    if (d === 1 && i === 2 && !s) s += "十"; // "一十/一十五"省略开头的"一"
    else s += D[d] + (i < 3 ? S[3 - i] : "");
  }
  return s;
}

/** 任意整数转中文（按 万/亿/兆 分段，段间自动补零） */
function intToCn(n) {
  if (n === 0) return "零";
  const parts = [];
  while (n > 0) { parts.push(n % 10000); n = Math.floor(n / 10000); }
  let s = "";
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i] === 0) continue;               // 整段为零则跳过
    if (s && parts[i] < 1000) s += "零";        // 高位段有零需补零
    s += section(parts[i]) + B[i];
  }
  return s;
}

/** 含小数的数字转中文 */
function numToCn(str) {
  const [i, f] = str.split(".");
  return f ? intToCn(+i) + "点" + [...f].map((d) => D[+d]).join("") : intToCn(+i);
}

// 全角数字/符号 -> 半角（解决全角输入如 １９９２ 无法被 \d 匹配的问题）
const FW_CHARS = "０１２３４５６７８９．－，";
const HW_CHARS = "0123456789.-,";
function toHalfWidth(s) {
  return s.replace(/[０-９．－，]/g, (c) => HW_CHARS[FW_CHARS.indexOf(c)]);
}

/** 文本中数字统一转中文读法 */
export function numToChinese(text) {
  if (!text) return "";
  return toHalfWidth(text)
    .replace(/(\d+(?:\.\d+)?)%/g, (_, n) => "百分之" + numToCn(n))            // 50% -> 百分之五十
    .replace(/(\d{4})年/g, (_, n) => [...n].map((d) => D[+d]).join("") + "年") // 2024年 -> 二零二四年
    .replace(/-?\d{1,3}(?:,\d{3})+(?:\.\d+)?|-?\d+(?:\.\d+)?/g, (s) => {       // 千分位/小数/负数/整数
      const neg = s[0] === "-";
      const body = neg ? s.slice(1).replace(/,/g, "") : s.replace(/,/g, "");
      return (neg ? "负" : "") + numToCn(body);
    });
}
