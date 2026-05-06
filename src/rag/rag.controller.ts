import { Body, Controller, Post } from '@nestjs/common';
import { RagService } from './rag.service';

@Controller('rag')
export class RagController {
    constructor(private readonly ragService: RagService) {}

    @Post('read')
    async readDocuments(@Body() body:{documents:{id: string,content: string,source?: string}[]}) {
        return this.ragService.readDocuments(body.documents);
    }
}
