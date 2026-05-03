import { Injectable } from '@nestjs/common';
import { CreateDtoPost } from './DTO/create-post.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PostService {
    constructor(private readonly prisma:PrismaService) {}
    async createpost(createDtoPost:CreateDtoPost){
        const post = await this.prisma.post.create({
            data:{
                id:createDtoPost.id,
                title:createDtoPost.title,
                content:createDtoPost.content,
                published:createDtoPost.published ?? false,
                authorId:createDtoPost.authorId 
            }
        })
        return {success:true,message:"Post created successfully",data:post}
    }
}
