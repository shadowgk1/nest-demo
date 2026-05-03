import { Body, Controller, Post } from '@nestjs/common';
import { CreateDtoPost } from './DTO/create-post.dto';
import { PostService } from './post.service';

@Controller('post')
export class PostController {
    constructor(private readonly postService: PostService) {}
    @Post('create')
    create(@Body() createDtoPost: CreateDtoPost) {
        return this.postService.createpost(createDtoPost);
    }
}
