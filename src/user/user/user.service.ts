import { Injectable } from '@nestjs/common';
import { User } from './User';
import { CreateUserDto } from './DTO/create-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserDto } from './DTO/update-user.dto';
import { QueryUserDto } from './DTO/query-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) { }
  async findAll(){
    const user = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    return {
      success: true,
      total: user.length,
      data: user,
    }
  }
  async createUser(CreateUserDto : CreateUserDto) {
    const user = await this.prisma.user.create({
      data: {
        name: CreateUserDto.name,
        email: CreateUserDto.email,
        password: CreateUserDto.password,
        role: CreateUserDto.role || 'user',
      },
    })
    return {
      success: true,
      message: `用户${user.name}创建成功`,
      data: user
    };
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: {id: parseInt(id)},
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        posts: {
        select: {
          id: true,
          title: true,
          content: true,
          published: true,
          createdAt: true,
          updatedAt: true,
        }
      }
      }
    });
    if (!user) {
      return {
        success: false,
        message: `用户${id}不存在`,
      }
    }
    return {
      success: true,
      message: `用户${id}查询成功`,
      data: user
    }
  }

  deleteUser(id: string) {
    return this.prisma.user.delete({
      where: {id: parseInt(id)},
    }).then(() => {
      return {
        success: true,
        message: `用户${id}删除成功`,
      }
    }).catch((err) => {
      return {
        success: false,
        message: `用户${id}不存在`
      }
    })
  }

  async updateUser(id: string, data: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: {id: parseInt(id)},
    });
    if (!user) {
      return {
        success: false,
        message: `用户${id}不存在`,
      }
    }
    return this.prisma.user.update({
      where: {id: parseInt(id)},
      data: data,
    }).then(() => {
      return {
        success: true,
        message: `用户${id}更新成功`,
      }
    }).catch(() => {
      return {
        success: false,
        message: `用户${id}更新失败`,}
      })
  }

  async searchUser(query: QueryUserDto) {
    const { page = '1',size = '10',name,role} = query;
    // 计算分页逻辑
    // skip = 前面跳过多少条
    // 比如page=1，size=10，那我要看的是第1页，每页10条，所以skip=（1-1）*10=0，从第一条开始取
    // 比如page=3，size=20，那我要看的是第3页，每页20条，所以skip=（3-1）*20=40，从第41条开始取
    const skip = (parseInt(page) - 1) * parseInt(size);
    const take = parseInt(size);
    const where:any = {};
    if (name) {
      where.name = {
        contains: name,
        mode:'insensitive'//模糊搜索，忽略大小写
      }
    }
    if (role) {
      where.role = role
    }
    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({where}),//获取总页数
      this.prisma.user.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        }
      })
    ]);
    const totalPage = Math.ceil(total / take);
    return {
      success: true,
      total,//总条数
      totalPage,//总页数
      currentPage: parseInt(page),//当前页
      pageSize: parseInt(size),//每页条数
      data: users
    }
  }
}
