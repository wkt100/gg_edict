import { getDb } from './db';
import { callAgent } from './agents';
import { AgentRole, TaskStatus, Task, SubTask } from '../src/types';
import { v4 as uuidv4 } from 'uuid';

export async function processWorkflow() {
  const db = await getDb();
  
  // 1. Find tasks needing processing
  const tasks = await db.all<Task[]>('SELECT * FROM tasks WHERE status NOT IN (?, ?, ?)', 
    [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.ESCALATED]);

  for (const task of tasks) {
    try {
      await handleTask(task);
    } catch (error) {
      console.error(`Error processing task ${task.id}:`, error);
      await logAudit(task.id, AgentRole.SHANGSHU, 'ERROR', String(error));
    }
  }
}

async function handleTask(task: Task) {
  const db = await getDb();

  switch (task.status) {
    case TaskStatus.PENDING:
      await runTriage(task);
      break;
    case TaskStatus.TRIAGE:
      await runPlanning(task);
      break;
    case TaskStatus.PLANNING:
    case TaskStatus.VETOED:
      await runReview(task);
      break;
    case TaskStatus.REVIEW:
      await runDispatch(task);
      break;
    case TaskStatus.EXECUTING:
      await checkExecution(task);
      break;
    case TaskStatus.REDUCING:
      await runReduction(task);
      break;
  }
}

async function runTriage(task: Task) {
  const db = await getDb();
  const result = await callAgent(AgentRole.TAIZI, task.originalPrompt, true);
  
  if (result.missing_ambiguities && result.missing_ambiguities.length > 0) {
    await updateTaskStatus(task.id, TaskStatus.FAILED, { 
      error: "Ambiguous request", 
      ambiguities: result.missing_ambiguities 
    });
    await logAudit(task.id, AgentRole.TAIZI, 'TRIAGE_FAILED', `Ambiguities found: ${result.missing_ambiguities.join(', ')}`);
  } else {
    await db.run('UPDATE tasks SET title = ?, description = ?, status = ?, metadata = ? WHERE id = ?',
      [result.title, result.description, TaskStatus.TRIAGE, JSON.stringify(result), task.id]);
    await logAudit(task.id, AgentRole.TAIZI, 'TRIAGE_COMPLETED', `Intent extracted: ${result.title}`);
  }
}

async function runPlanning(task: Task) {
  const db = await getDb();
  const prompt = `Task: ${task.title}\nDescription: ${task.description}\nMetadata: ${task.metadata}`;
  const result = await callAgent(AgentRole.ZHONGSHU, prompt, true);
  
  await db.run('UPDATE tasks SET status = ?, metadata = ? WHERE id = ?',
    [TaskStatus.PLANNING, JSON.stringify({ ...JSON.parse(task.metadata || '{}'), plan: result }), task.id]);
  await logAudit(task.id, AgentRole.ZHONGSHU, 'PLANNING_COMPLETED', `Plan generated with ${result.subtasks.length} subtasks.`);
}

async function runReview(task: Task) {
  const db = await getDb();
  const metadata = JSON.parse(task.metadata || '{}');
  const plan = metadata.plan;
  
  const prompt = `Review this plan for Task "${task.title}":\n${JSON.stringify(plan, null, 2)}`;
  const result = await callAgent(AgentRole.MENXIA, prompt, true);
  
  if (result.approved) {
    await updateTaskStatus(task.id, TaskStatus.REVIEW);
    await logAudit(task.id, AgentRole.MENXIA, 'REVIEW_APPROVED', result.feedback);
  } else {
    const newVetoCount = (task.vetoCount || 0) + 1;
    if (newVetoCount >= 3) {
      await updateTaskStatus(task.id, TaskStatus.ESCALATED, { reason: "Max vetoes reached", feedback: result.feedback });
      await logAudit(task.id, AgentRole.MENXIA, 'ESCALATED', `Plan vetoed 3 times. Escalating to Emperor.`);
    } else {
      await db.run('UPDATE tasks SET status = ?, vetoCount = ? WHERE id = ?', [TaskStatus.VETOED, newVetoCount, task.id]);
      await logAudit(task.id, AgentRole.MENXIA, 'VETOED', `Veto #${newVetoCount}: ${result.feedback}. Action: ${result.required_action}`);
      // In VETOED state, it will loop back to planning in the next cycle
      await runPlanning(task); 
    }
  }
}

async function runDispatch(task: Task) {
  const db = await getDb();
  const metadata = JSON.parse(task.metadata || '{}');
  const plan = metadata.plan;

  for (const st of plan.subtasks) {
    const subtaskId = uuidv4();
    await db.run('INSERT INTO subtasks (id, taskId, ministry, description, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [subtaskId, task.id, st.ministry, st.description, 'PENDING', Date.now(), Date.now()]);
  }

  await updateTaskStatus(task.id, TaskStatus.EXECUTING);
  await logAudit(task.id, AgentRole.SHANGSHU, 'DISPATCHED', `Dispatched ${plan.subtasks.length} subtasks to ministries.`);
}

async function checkExecution(task: Task) {
  const db = await getDb();
  const subtasks = await db.all<SubTask[]>('SELECT * FROM subtasks WHERE taskId = ?', [task.id]);
  
  const allCompleted = subtasks.every(st => st.status === 'COMPLETED');
  const anyFailed = subtasks.some(st => st.status === 'FAILED');

  if (anyFailed) {
    await updateTaskStatus(task.id, TaskStatus.FAILED, { error: "One or more subtasks failed" });
    return;
  }

  if (allCompleted) {
    await updateTaskStatus(task.id, TaskStatus.REDUCING);
    return;
  }

  // Process pending subtasks
  for (const st of subtasks) {
    if (st.status === 'PENDING') {
      // Simulate execution for now - in a real app, this would call the specific ministry agent
      await db.run('UPDATE subtasks SET status = ? WHERE id = ?', ['EXECUTING', st.id]);
      const result = await callAgent(st.ministry as AgentRole, st.description);
      await db.run('UPDATE subtasks SET status = ?, result = ?, updatedAt = ? WHERE id = ?', 
        ['COMPLETED', result, Date.now(), st.id]);
      await logAudit(task.id, st.ministry as AgentRole, 'SUBTASK_COMPLETED', `Completed: ${st.description}`);
    }
  }
}

async function runReduction(task: Task) {
  const db = await getDb();
  const subtasks = await db.all<SubTask[]>('SELECT * FROM subtasks WHERE taskId = ?', [task.id]);
  
  const prompt = `Summarize the results of these subtasks for Task "${task.title}":\n` + 
    subtasks.map(st => `${st.ministry}: ${st.result}`).join('\n');
    
  const finalResult = await callAgent(AgentRole.SHANGSHU, prompt);
  
  await db.run('UPDATE tasks SET status = ?, metadata = ? WHERE id = ?', 
    [TaskStatus.COMPLETED, JSON.stringify({ ...JSON.parse(task.metadata || '{}'), finalResult }), task.id]);
  await logAudit(task.id, AgentRole.SHANGSHU, 'WORKFLOW_COMPLETED', `Final result compiled.`);
}

async function updateTaskStatus(id: string, status: TaskStatus, metadataUpdate?: any) {
  const db = await getDb();
  if (metadataUpdate) {
    const task = await db.get<Task>('SELECT metadata FROM tasks WHERE id = ?', [id]);
    const metadata = { ...JSON.parse(task?.metadata || '{}'), ...metadataUpdate };
    await db.run('UPDATE tasks SET status = ?, metadata = ?, updatedAt = ? WHERE id = ?', [status, JSON.stringify(metadata), Date.now(), id]);
  } else {
    await db.run('UPDATE tasks SET status = ?, updatedAt = ? WHERE id = ?', [status, Date.now(), id]);
  }
}

async function logAudit(taskId: string, agent: AgentRole, action: string, content: string) {
  const db = await getDb();
  await db.run('INSERT INTO audit_logs (id, taskId, agent, action, content, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
    [uuidv4(), taskId, agent, action, content, Date.now()]);
}
