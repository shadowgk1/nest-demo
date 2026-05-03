import { Body, Controller, Post, Res } from '@nestjs/common';
import { ModelsService } from './models.service';
import type{ Response } from 'express';

@Controller('models')
export class ModelsController {
    constructor( private readonly modelsService: ModelsService) {}

    @Post('chat')
    baseChat(@Body() body: { messages : string }){
        return this.modelsService.baseChat(body.messages)
    }

    @Post('stream-chat')
    streamChat(@Body() messages : string ,@Res() res:Response){
        return this.modelsService.streamChat(messages,res)
    }

    @Post('chat-parser')
    chatParser(@Body()  messages : string ){
        return this.modelsService.chatParser(messages)
    }
}
