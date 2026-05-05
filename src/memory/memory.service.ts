import { ChatOllama } from '@langchain/ollama';
import { Injectable } from '@nestjs/common';
import { config } from '../config';
import {
  SystemMessage,
  HumanMessage,
  AIMessage,
  BaseMessage,
} from '@langchain/core/messages';

@Injectable()
export class MemoryService {
  private llm = new ChatOllama({
    model: config.ollama.chatModel,
    temperature: config.ollama.temperature,
    baseUrl: config.ollama.host,
    think: false,
  });

  private sessions = new Map<string, BaseMessage[]>();

  // 修正：SystemMessage 需要用对象参数
  private systemMessage = new SystemMessage({
    content: '你是一个智能助手，能记住对话历史，根据上下文进行准确的回答',
  });

  private getOrCreate(sessionId: string): BaseMessage[] {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, [this.systemMessage]);
    }
    return this.sessions.get(sessionId) as BaseMessage[];
  }

  async chat(sessionId: string, userMessage: string) {
    // 添加参数验证
    if (!userMessage || typeof userMessage !== 'string') {
      throw new Error('userMessage 必须是有效的字符串');
    }

    const history = this.getOrCreate(sessionId);

    // 创建并添加用户消息
    const humanMessage = new HumanMessage({ content: userMessage });
    history.push(humanMessage);

    try {
      const response = await this.llm.invoke(history);

      console.log('=== Response ===');
      console.log('Response content:', response.content);

      // 确保正确添加 AI 消息
      const aiMessage = new AIMessage({ content: response.content });
      history.push(aiMessage);

      return {
        sessionId,
        messages: userMessage,
        reply: response.content,
        turns: Math.floor((history.length - 1) / 2),
      };
    } catch (error) {
      console.error('Invoke error:', error);
      throw error;
    }
  }

  async getHistory(sessionId: string) {
    const history = this.sessions.get(sessionId);
    if (!history) {
      return {
        sessionId,
        exist: false,
        messages: [],
      };
    }

    const messages = history
      .filter((m) => !(m instanceof SystemMessage))
      .map((m, i) => ({
        index: i + 1,
        role: m instanceof HumanMessage ? 'user' : 'assistant',
        content: m.content,
      }));

    return {
      sessionId,
      exists: true,
      turns: Math.floor((history.length - 1) / 2),
      messages,
    };
  }

  async deleteHistory(sessionId: string) {
    if (!this.sessions.has(sessionId)) {
      return { sessionId, cleared: false, message: '会话不存在' };
    }
    this.sessions.set(sessionId, [this.systemMessage]);
    return { sessionId, cleared: true, message: '会话已清除' };
  }

  async getSessions() {
    const sessions = Array.from(this.sessions.entries()).map(([id, h]) => ({
      sessionId: id,
      turns: Math.floor((h.length - 1) / 2),
    }));
    return { total: sessions.length, sessions };
  }
}
