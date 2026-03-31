/**
 * DeepSeek API 调用模块（OpenAI 兼容格式）
 * API 文档: https://api-docs.deepseek.com/
 */

interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface DeepSeekChoice {
  message: {
    role: string;
    content: string;
  };
}

/**
 * 调用 DeepSeek Chat API
 */
export async function callDeepSeek(
  systemPrompt: string,
  userPrompt: string,
  jsonMode: boolean = false
): Promise<string> {
  const url = `${process.env.DEEPSEEK_BASE_URL}/chat/completions`;

  const messages: DeepSeekMessage[] = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: userPrompt });

  const payload: Record<string, any> = {
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
    messages,
  };

  if (jsonMode) {
    payload.response_format = { type: "json_object" };
  }

  const headers = {
    "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} ${response.statusText} - ${errorText.slice(0, 200)}`);
  }

  const contentType = response.headers.get("content-type") || "";
  let data: any;
  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    throw new Error(`DeepSeek API returned non-JSON response (${response.status}): ${text.slice(0, 200)}`);
  }

  const choices = data.choices as DeepSeekChoice[] | undefined;
  if (choices && choices.length > 0) {
    return choices[0].message.content;
  }

  throw new Error(`Unexpected DeepSeek API response: ${JSON.stringify(data).slice(0, 200)}`);
}
