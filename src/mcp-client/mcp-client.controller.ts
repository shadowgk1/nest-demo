import { Body, Controller, Get, Post } from '@nestjs/common';
import { McpClientService } from './mcp-client.service';

@Controller('mcp-client')
export class McpClientController {
    constructor(private readonly mcpClientService: McpClientService) {}

    // 获取工具列表接口
    @Get('tools')
    listTools(){
        return this.mcpClientService.listTools();
    }

    @Post('call-tool')
    callTool(@Body() body:{ toolName:string,args: Record<string,any>}){
        return this.mcpClientService.callTool(body.toolName,body.args);
    }
}
