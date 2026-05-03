export const config = {
    ollama:{
        // ollama服务器的地址
        host: "http://localhost:11434",
        // 已在ollama安装好的模型
        chatModel: "qwen3.5:0.8b",
        // 用于向量化的模型
        embedModel: "tmxbai-embed-large:lates",
        // 生成文本的随机程度，值越小越确定，值越大越随机
        temperature: 0.3,
    }
}