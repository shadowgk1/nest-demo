// 读取文件工具
export function handleFileOperation(args: {operation:string,filePath:string}):string{
    const { operation,filePath } = args;
    if (operation === 'read') {
        return `Reading file at path: ${filePath}`;
    }else if(operation === 'write'){
        return `Writing to file at path: ${filePath}`
    }else{
        return 'Unsupported file operation'
    }
}