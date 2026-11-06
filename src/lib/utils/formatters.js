/**
 * FORMATTERS AND DISPLAY HELPERS
 */

export function formatMessageTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(Number(timestamp));
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function formatConversationDate(timestamp) {
  if (!timestamp) return "";
  const date = new Date(Number(timestamp));
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return formatMessageTime(timestamp);
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return "Yesterday";
  }

  // Within past 6 days
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }

  return date.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatFullDateTime(timestamp) {
  if (!timestamp) return "—";
  const date = new Date(Number(timestamp));
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
}

export function getAppMeta(packageName) {
  if (!packageName || typeof packageName !== "string") {
    return { name: String(packageName || "Unknown"), color: "bg-gray-600", badgeColor: "text-gray-400 border-gray-600" };
  }
  
  const pkg = packageName.toLowerCase();
  if (pkg.includes("whatsapp")) {
    return { name: "WhatsApp", color: "bg-emerald-600", badgeColor: "text-emerald-400 border-emerald-700 bg-emerald-950/40" };
  }
  if (pkg.includes("vending") || pkg.includes("playstore")) {
    return { name: "Google Play Store", color: "bg-cyan-600", badgeColor: "text-cyan-400 border-cyan-700 bg-cyan-950/40" };
  }
  if (pkg.includes("messaging") || pkg.includes("mms") || pkg.includes("sms")) {
    return { name: "SMS Messages", color: "bg-amber-600", badgeColor: "text-amber-400 border-amber-700 bg-amber-950/40" };
  }
  if (pkg.includes("telegram")) {
    return { name: "Telegram", color: "bg-sky-500", badgeColor: "text-sky-400 border-sky-700 bg-sky-950/40" };
  }
  if (pkg.includes("gmail") || pkg.includes("android.gm")) {
    return { name: "Gmail", color: "bg-red-600", badgeColor: "text-red-400 border-red-700 bg-red-950/40" };
  }
  if (pkg.includes("dialer") || pkg.includes("telecom") || pkg.includes("phone")) {
    return { name: "Phone Call", color: "bg-green-600", badgeColor: "text-green-400 border-green-700 bg-green-950/40" };
  }
  if (pkg.includes("orca") || pkg.includes("facebook")) {
    return { name: "Facebook Messenger", color: "bg-blue-600", badgeColor: "text-blue-400 border-blue-700 bg-blue-950/40" };
  }
  if (pkg.includes("instagram")) {
    return { name: "Instagram", color: "bg-pink-600", badgeColor: "text-pink-400 border-pink-700 bg-pink-950/40" };
  }
  if (pkg.includes("googlequicksearchbox") || pkg.includes("google")) {
    return { name: "Google", color: "bg-blue-600", badgeColor: "text-blue-400 border-blue-700 bg-blue-950/40" };
  }
  if (pkg.includes("indeed")) {
    return { name: "Indeed Jobs", color: "bg-indigo-600", badgeColor: "text-indigo-400 border-indigo-700 bg-indigo-950/40" };
  }

  // Default
  const parts = packageName.split(".");
  const shortName = parts[parts.length - 1] || packageName;
  return {
    name: shortName.charAt(0).toUpperCase() + shortName.slice(1),
    color: "bg-slate-600",
    badgeColor: "text-slate-400 border-slate-700 bg-slate-900/40",
  };
}

export function getInitials(name) {
  if (!name) return "?";
  const clean = String(name).replace(/[()\[\]+]/g, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (name.slice(0, 2) || "?").toUpperCase();
}

