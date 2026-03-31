/**
 * Minimax API 调用模块
 * API 文档: https://www.minimaxi.com/document
 */

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY!;
const MINIMAX_BASE_URL = process.env.MINIMAX_BASE_URL || "https://api.minimax.chat";
const MINIMAX_MODEL = process.env.MINIMAX_MODEL || "MiniMax-M2.7";

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
  const url = `${MINIMAX_BASE_URL}/text/chatcompletion_v2`;

  const messages: MinimaxMessage[] = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: userPrompt });

  const payload: Record<string, any> = {
    model: MINIMAX_MODEL,
    messages,
  };

  if (jsonMode) {
    // Minimax 支持 json_object 响应格式
    payload.response_format = { type: "json_object" };
  }

  const headers = {
    "Authorization": `Bearer ${MINIMAX_API_KEY}`,
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Minimax API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json() as { choices?: MinimaxChoice[]; base_resp?: { status_code?: number; status_msg?: string } };

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
