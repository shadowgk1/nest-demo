import { Body, Controller, Post } from '@nestjs/common';
import { FunctionCallingService } from './function-calling.service';

@Controller('function-calling')
export class FunctionCallingController {
    constructor(private readonly functionCallingService: FunctionCallingService) {}

    @Post('call')
    async runFunctionCalling(@Body() body: {message: string}) {
        return this.functionCallingService.runFunctionCalling(body.message);
    }
}
