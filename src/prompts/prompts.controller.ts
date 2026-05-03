import { Body, Controller, Post } from '@nestjs/common';
import { PromptsService } from './prompts.service';

@Controller('prompts')
export class PromptsController {
    constructor(private readonly promptsService: PromptsService) {}
    @Post('/transform')
    transform(@Body() body: { text: string,target: string}){
        return this.promptsService.transform(body.text, body.target)
    }

    @Post('/summarize')
    summarize(@Body() body: { text: string,maxLength: number}){
        return this.promptsService.summarize(body.text, body.maxLength)
    }

    @Post('/classify')
    classify(@Body() body: { text: string}){
        return this.promptsService.classify(body.text)
    }

    @Post('/code-review')
    codeReview(@Body() body: { text: string,language: string}){
        return this.promptsService.codeReview(body.text, body.language)
    }
}
