// 查询数据库的工具
import {Pool} from 'pg'
import 'dotenv/config'
// 创建mcp server，是一个独立进程，需要初始化数据库连接
const pool = new Pool({connectionString: process.env.DATABASE_URL});

export async function handleDatabaseQuery(args:{name?:string,role?:string,limit?:number}):Promise<string>{
    const { name,role,limit = 10} = args;
    const conditions:string[] = [];
    if (name) {
        conditions.push(`name ILIKE '%${name}%'`)
    }
    if (role) {
        conditions.push(`role = '${role}'`)
    }

    const query = `
        SELECT id,name,role
        FROM users
        ${conditions.length > 0 ? 'WHERE' + conditions.join('AND'):''}
        LIMIT ${limit}
    `
    const result = await pool.query(query)
    const user = result.rows

    const userList = user.map(user => `ID: ${user.id},Name: ${user.name},Role: ${user.role}`).join('\n')
    return `Found ${userList.length} users: \n ${userList}`
}