import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

@Injectable()
export class McpClientService implements OnModuleInit, OnModuleDestroy {
    private client: Client;
    private transport: StdioClientTransport;

    async onModuleInit() {
        this.client = new Client({
            name: 'Example MCP Client',
            description: 'An example MCP client implemented in TypeScript',
            version: '1.0.0'
        });
        this.transport = new StdioClientTransport({
            command: 'ts-node',
            args: ['src/mcp-server/server.ts'],
            env: { ...process.env } as Record<string, string>
        })

        await this.client.connect(this.transport)
        console.log('MCP client server initialized');
    }

    async listTools() {
        const response = this.client.listTools();
        return (await response).tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
        }))
    }

    async callTool(toolName: string, args: Record<string, any>) {
        const response = await this.client.callTool({
            name: toolName,
            arguments: args
        })
        return {
            toolName,
            isError: response.isError,
            content: response
        }
    }

    async onModuleDestroy() {
        await this.client.close()
        console.log('MCP client server destroyed');
    }
}
