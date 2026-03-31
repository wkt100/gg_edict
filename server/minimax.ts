/**
 * Minimax API 调用模块
 * API 文档: https://www.minimaxi.com/document
 */

// 注意：这些在模块加载时求值，必须在 dotenv 之后才能读到 env 变量
// 因此改为函数内访问 process.env

interface MinimaxMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface MinimaxChoice {
  message: {
    role: string;
    content: string;
  };
}

/**
 * 调用 Minimax Chat API
 */
export async function callMinimax(
  systemPrompt: string,
  userPrompt: string,
  jsonMode: boolean = false
): Promise<string> {
  const url = `${process.env.MINIMAX_BASE_URL}/text/chatcompletion_v2`;

  const messages: MinimaxMessage[] = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: userPrompt });

  const payload: Record<string, any> = {
    model: process.env.MINIMAX_MODEL || "MiniMax-M2.7",
    messages,
  };

  if (jsonMode) {
    // Minimax 支持 json_object 响应格式
    payload.response_format = { type: "json_object" };
  }

  const headers = {
    "Authorization": `Bearer ${process.env.MINIMAX_API_KEY}`,
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Minimax API error: ${response.status} ${response.statusText} - ${errorText.slice(0, 200)}`);
  }

  const contentType = response.headers.get("content-type") || "";
  let data: any;
  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    // Non-JSON response (e.g., HTML error page)
    const text = await response.text();
    throw new Error(`Minimax API returned non-JSON response (${response.status}): ${text.slice(0, 200)}`);
  }

  const choices = data.choices;
  if (choices && choices.length > 0) {
    return choices[0].message.content;
  }

  // 检查错误信息
  const baseResp = data.base_resp;
  if (baseResp && baseResp.status_code !== 0) {
    throw new Error(`Minimax API error: ${baseResp.status_msg || "Unknown error"}`);
  }

  throw new Error(`Unexpected Minimax API response: ${JSON.stringify(data)}`);
}
