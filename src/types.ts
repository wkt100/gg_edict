import { z } from 'zod';

export enum AgentRole {
  EMPEROR = 'EMPEROR',
  TAIZI = 'TAIZI',
  ZHONGSHU = 'ZHONGSHU',
  MENXIA = 'MENXIA',
  SHANGSHU = 'SHANGSHU',
  HUBU = 'HUBU',
  LIBU = 'LIBU',
  BINGBU = 'BINGBU',
  XINGBU = 'XINGBU',
  GONGBU = 'GONGBU',
  LIBU_HR = 'LIBU_HR',
  ZAOCHAO = 'ZAOCHAO'
}

export enum TaskStatus {
  PENDING = 'PENDING',
  TRIAGE = 'TRIAGE',
  PLANNING = 'PLANNING',
  REVIEW = 'REVIEW',
  VETOED = 'VETOED',
  DISPATCHING = 'DISPATCHING',
  EXECUTING = 'EXECUTING',
  REDUCING = 'REDUCING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  ESCALATED = 'ESCALATED'
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  originalPrompt: string;
  metadata: string;
  createdAt: number;
  updatedAt: number;
  vetoCount: number;
}

export interface SubTask {
  id: string;
  taskId: string;
  ministry: AgentRole;
  description: string;
  status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED';
  result?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AuditLog {
  id: string;
  taskId: string;
  agent: AgentRole;
  action: string;
  content: string;
  timestamp: number;
}

export const TriageSchema = z.object({
  edict_type: z.string(),
  urgency_level: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  explicit_parameters: z.record(z.string(), z.any()),
  missing_ambiguities: z.array(z.string()),
  title: z.string(),
  description: z.string()
});

export const PlanningSchema = z.object({
  task_id: z.string(),
  strategy: z.string(),
  subtasks: z.array(z.object({
    ministry: z.nativeEnum(AgentRole),
    description: z.string(),
    dependencies: z.array(z.string()).optional()
  })),
  target_ministries: z.array(z.nativeEnum(AgentRole))
});

export const ReviewSchema = z.object({
  approved: z.boolean(),
  violation_code: z.string().optional(),
  required_action: z.string().optional(),
  feedback: z.string()
});
