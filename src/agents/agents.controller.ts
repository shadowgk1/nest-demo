import { Body, Controller, Post } from '@nestjs/common';
import { AgentsService } from './agents.service';

@Controller('agents')
export class AgentsController {
    constructor(private readonly agentsService: AgentsService) {}

    @Post('/order')
    async runAgent(@Body() body: {messages: string}) {
        return this.agentsService.runAgent(body.messages);
    }
}
