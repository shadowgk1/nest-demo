import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { MemoryService } from './memory.service';

@Controller('memory')
export class MemoryController {
    constructor(private readonly memoryService: MemoryService) {}

    @Post('chat')
    async chat(@Body() body:{sessionId: string,userMessage: string}) {
        return this.memoryService.chat(body.sessionId, body.userMessage)
    }

    @Get('history/:sessionId')
    async getHistory(@Param('sessionId') sessionId: string) {
        return this.memoryService.getHistory(sessionId)
    }

    @Delete('history/:sessionId')
    async deleteHistory(@Param('sessionId') sessionId: string) {
        return this.memoryService.deleteHistory(sessionId)
    }

    @Get('sessions')
    async getSessions() {
        return this.memoryService.getSessions()
    }
}
