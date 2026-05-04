import { Body, Controller, Post } from '@nestjs/common';
import { ChainsService } from './chains.service';

@Controller('chains')
export class ChainsController {
    constructor(private readonly chainsService: ChainsService) {}

    @Post('/polish')
    async polish(@Body() body: {article: string}) {
        return this.chainsService.polish(body.article);
    }

    @Post('/blog')
    async generalBlog(@Body() body: {keywords: string,style: string}) {
        return this.chainsService.generalBlog(body.keywords, body.style);
    }

    @Post('/router')
    async smartRouter(@Body() body: {question:string}) {
        return this.chainsService.smartRouter(body.question);
    }
}
