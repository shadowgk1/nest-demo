import { Injectable } from '@nestjs/common';
import { config } from '../config';
import { ChatOllama } from '@langchain/ollama';
import { HumanMessage } from '@langchain/core/messages';
import { Response } from 'express';
import { StringOutputParser } from '@langchain/core/output_parsers';

@Injectable()
export class ModelsService {
    // 创建模型实例
    private llm = new ChatOllama({
        model: config.ollama.chatModel,
        temperature: config.ollama.temperature,
        baseUrl: config.ollama.host,
        think: false
    });

    // 调用模型.普通输出
    async baseChat(messages: string){
        const response = await this.llm.invoke([
            new HumanMessage(messages)
        ])
        return {
            success: true,
            question: messages,
            answer: response.content,
            usage:response.usage_metadata
        }
    }

    // 流式输出
    async streamChat(messages: string,res:Response){
        // 设置响应头，告诉浏览器返回的是流式数据   
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        const stream = await this.llm.stream([
            new HumanMessage(messages)
        ])
        for await (const chunk of stream) {
            res.write(`data:${JSON.stringify(chunk)}\n\n`)
        }
        res.write(`data:[DONE]\n\n`)
        res.end()
    }

    // pipeline 组合多个模型一起使用的示例，先用一个模型生产提示词，再用另一个模型根据提示词生产答案
    async chatParser(messages: string){
        const chain = this.llm.pipe(new StringOutputParser())
        const answer = await chain.invoke([
            new HumanMessage(messages)
        ])
        return{
            success: true,
            question: messages,
            answer:answer
        }
    }
}
