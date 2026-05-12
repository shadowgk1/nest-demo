import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

const server = new McpServer({
    name:'Example MCP Server',
    description:'An Examaple MCP Server',
    version:'1.0.0'
})

// 工具1：查询数据库
import { handleDatabaseQuery } from './tools/database.tool'
import { handleFileOperation } from './tools/file.tool'
import { handleWeatherQuery } from './tools/weather.tool'
server.registerTool(
    'queryDatabase',
    {
        description:'Query the databbase for users based on name, role, and limit',
        inputSchema:z.object({
            name:z.string().optional(),
            role:z.enum(['admin','user','guest']).optional(),
            limit:z.string().optional()
        }),
    },
    async (args:any) => {
        try {
            const result = await handleDatabaseQuery(args);
            return {content : [{type:'text',text:result}]}
        } catch (error:any) {
            console.error(error)
            return {content: [{type:'text',text:'An error occurred while querying the database'}]}
        }
    }
)

// 工具2 读取文件
server.registerTool(
    'readFile',
    {
        description:'Read the conetents of a file given its path',
        inputSchema:z.object({
            filePath:z.string()
        }),
    },
    async (args) => {
        const { filePath } = args;
        try {
            const content = await handleFileOperation({operation:'read',filePath})
            return {content:[{type:'text',text:content}]}
        } catch (error:any) {
            console.error(error)
            return {content:[{type:'text',text:'An error occurred while reading a file'}]}
        }
    }
)

// 工具3 天气查询
server.registerTool(
    'weatherQuery',
    {
        description:'Get the current weather for a given location',
        inputSchema:z.object({
            location:z.string()
        })
    },
    async (args) =>{
        const { location } = args ;
        const result = await handleWeatherQuery({location})
        return {content:[{type:'text',text:result}]}
    }
)

// 启动服务
async function startServe(){
    try {
        const transport = new StdioServerTransport();
        await server.connect(transport)
        console.log('MCP server in running on port 3000');
    } catch (error) {
        console.error(error)
    }
}
startServe().catch(console.error)