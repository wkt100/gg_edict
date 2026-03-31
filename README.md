# Edict Architecture

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

六部多智能体任务编排系统。基于 LLM 的多 Agent 工作流，支持中文/English 双语界面。

## 功能特性

- 🤖 **多 Agent 协作**：太子（分类）、中书省（规划）、门下省（审核）、尚书省（调度）、六部（执行）
- 🔄 **完整工作流**：TRIAGE → PLANNING → REVIEW → DISPATCH → EXECUTING → REDUCING → COMPLETED
- 🌐 **双语言界面**：内置中英文切换
- 🗂️ **任务管理**：支持重试、删除、升级等 API 操作
- 🔌 **多 Provider 支持**：DeepSeek / Minimax / Gemini 一键切换

## 快速启动

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.local.example .env.local
# 编辑 .env.local，填入你的 API Key

# 启动服务
npm run dev
# 或使用脚本
./scripts/start.sh
```

访问 `http://localhost:3000`

## 环境变量

```bash
# AI Provider: deepseek | minimax | gemini
AI_PROVIDER=deepseek

# DeepSeek
DEEPSEEK_API_KEY=your_key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

# Minimax
MINIMAX_API_KEY=your_key
MINIMAX_BASE_URL=https://api.minimax.chat/v1
MINIMAX_MODEL=MiniMax-M2.7

# Gemini
GEMINI_API_KEY=your_key
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/tasks` | 获取所有任务 |
| `POST` | `/api/tasks` | 创建新任务 |
| `GET` | `/api/tasks/:id` | 获取任务详情（含 subtasks、logs） |
| `DELETE` | `/api/tasks/:id` | 删除指定任务 |
| `DELETE` | `/api/tasks?statuses=...` | 批量删除（按状态） |
| `PATCH` | `/api/tasks/:id` | 更新任务字段 |
| `POST` | `/api/tasks/:id/retry` | 重试 ESCALATED/FAILED 任务 |
| `POST` | `/api/tasks/:id/escalate` | 人工升级任务 |

## 服务管理脚本

```bash
./scripts/start.sh    # 启动服务
./scripts/stop.sh     # 停止服务
./scripts/restart.sh  # 重启服务
```

## 工作流状态

```
TRIAGE → PLANNING → REVIEW → EXECUTING → REDUCING → COMPLETED
                ↓
           [3次否决]
                ↓
            ESCALATED（人工介入）
```

## 技术栈

- **Frontend**: React + Vite + TypeScript + TailwindCSS
- **Backend**: Node.js + Express + better-sqlite3
- **AI**: DeepSeek / Minimax / Gemini（可配置）
