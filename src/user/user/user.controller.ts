import { Controller, Get, Post, Body, Param, Delete, Query, Put } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './User';
import { CreateUserDto } from './DTO/create-user.dto';
import { UpdateUserDto } from './DTO/update-user.dto';
import { QueryUserDto } from './DTO/query-user.dto';

@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Post('createUser')
    addUser(@Body() user: CreateUserDto) {
        return this.userService.createUser(user);
    }

    @Get('list')
    findAll(){
        return this.userService.findAll();
    }
    
    @Get('search')
    searchUser(@Query() query : QueryUserDto) {
        return this.userService.searchUser(query);
    }
    
    @Get('/:id')
    getUserById(@Param('id') id: string) {
        return this.userService.getUserById(id);
    }

    @Delete('/:id')
    deleteUser(@Param('id') id: string) {
        return this.userService.deleteUser(id);
    }

    @Put('/:id')
    updateUser(@Param('id') id: string, @Body() user: UpdateUserDto) {
        return this.userService.updateUser(id, user);
    }

}
