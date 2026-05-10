import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { RagdbService } from './ragdb.service';

@Controller('ragdb')
export class RagdbController {
    constructor(private readonly ragdbService: RagdbService) {}

    @Post('read')
    async readDocuments(@Body() body:{documents:{id: string,content: string,source?: string}[]}) {
        return this.ragdbService.readDocuments(body.documents);
    }

    @Get('load')
    async loadDocuments() {
        return this.ragdbService.loadDocuments();
    }

    @Post('search')
    async searchDocuments(@Body() body:{query: string;topK: number}) {
        return this.ragdbService.searchDocuments(body.query, body.topK);
    }

    @Post('query')
    async queryDocuments(@Body() body:{question: string;topK: number}) {
        return this.ragdbService.queryDocuments(body.question, body.topK);
    }

    @Delete('delete')
    async deleteDocuments() {
        return this.ragdbService.deleteDocuments();
    }
}
