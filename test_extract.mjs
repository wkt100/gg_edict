function extractJson(text) {
  const lines = text.split("\n");
  let endIdx = lines.length;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^```$/.test(lines[i].trim())) {
      endIdx = i;
      break;
    }
  }
  let candidate = lines.slice(1, endIdx).join("\n").trim();
  try { JSON.parse(candidate); return candidate; } catch {}

  const first = lines[0].trim();
  if (/^```$/.test(first)) {
    candidate = lines.slice(1, endIdx).join("\n").trim();
    try { JSON.parse(candidate); return candidate; } catch {}
  }

  return text.trim();
}

// Test
const t = "```json\n{\n  \"intent\": \"count\"\n}\n```\n\n1, 2, 3.";
console.log("result:", extractJson(t));
console.log("parsed:", JSON.parse(extractJson(t)));
