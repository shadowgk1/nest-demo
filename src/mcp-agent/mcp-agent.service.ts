import { ChatOllama } from '@langchain/ollama';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { config } from '../config';
import { SystemMessage, HumanMessage, ToolMessage, AIMessage } from '@langchain/core/messages';
import { MultiServerMCPClient } from '@langchain/mcp-adapters'

@Injectable()
export class McpAgentService implements OnModuleInit,OnModuleDestroy{
    // 创建模型实例
    private llm = new ChatOllama({
        model: config.ollama.chatModel,
        temperature: config.ollama.temperature,
        baseUrl: config.ollama.host,
        think: false,
    });
    private mcpClient:MultiServerMCPClient
    private mcpTools :any [] = []

    async onModuleInit() {
        this.mcpClient = new MultiServerMCPClient({
            // 连接配置：可以同时连接多个mcp服务器
            mcpServers:{
                // 自定义本地的mcp服务器，用stdio方式通信，适用于独立的mcp服务器进程通信
                'local-tools':{
                    transport:'stdio',
                    command:'ts-node',
                    args:['src/mcp-server/server.ts'],
                    env:{...process.env} as Record<string,string>
                }
            }
        })
        // 把所有mcp server中的工具转成统一的格式，储存在mcptools变量中，方便后续调用
        this.mcpTools = await this.mcpClient.getTools()
        console.log('mcp 服务已启动');
    }

    async toolList(){
        return this.mcpTools.map(tool => ({
            name:tool.name,
            description: tool.description,
            inputSchema:tool.inputSchema
        }))
    }

    async runAgent(message:string){
        if (!this.mcpTools.length) {
            return {error:'暂无可用工具'}
        }
        const llmWithTools = this.llm.bindTools(this.mcpTools)
        const toolMap = Object.fromEntries(this.mcpTools.map(tool => [tool.name,tool]))
        const messages:any [] = [
            new SystemMessage(`
                    你是一个智能助手，可以使用以下工具帮助用户：
                    -queryDatabase:查询用户数据库
                    -readFile:读取项目文件
                    -get_weather:查询天气
                    根据用户的问题，选择合适的工具获取信息后回答，回答时使用中文
                `),
                new HumanMessage(message)
        ]
        const steps:string[] = []
        let roundCount = 0
        while (roundCount<6){
            roundCount++
            const response = await llmWithTools.invoke(messages)
            messages.push(response)
            if (!response.tool_calls || response.tool_calls.length == 0) {
                steps.push(`最终回答：${response.content}`)
                break
            }
            for (const toolCall of response.tool_calls){
                steps.push(`模型调用工具：${toolCall.name},输入参数：${JSON.stringify(toolCall.args)}`)
                const toolFunc = toolMap[toolCall.name]
                if (!toolFunc) {
                    const errorMsg = `未找到工具函数：${toolCall.name}`
                    steps.push(`错误 ${errorMsg}`)
                    messages.push(new ToolMessage({ content:errorMsg,tool_call_id:toolCall.id ?? ''}))
                    continue
                }
                const toolResult = await toolFunc.invoke(toolCall.args)
                steps.push(`工具执行结果：${toolResult}`)
                messages.push(new ToolMessage({ content:String(toolResult),tool_call_id:toolCall.id ?? ''}))
            }
        }
        const finalReponse = [...messages].reverse().find(msg => msg instanceof AIMessage) || '很抱歉，我无法处理你的要求'
        return {
            message,
            steps,
            totalRounds:roundCount,
            answer: finalReponse instanceof AIMessage ? finalReponse.content : finalReponse
        }
    }

    async onModuleDestroy() {
        await this.mcpClient.close()
        console.log('mcp服务已关闭');
    }
}
