import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';
import { Injectable } from '@nestjs/common';
import { config } from '../config';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';

@Injectable()
export class RagService {
  // 创建模型实例
  private llm = new ChatOllama({
    model: config.ollama.chatModel,
    temperature: config.ollama.temperature,
    baseUrl: config.ollama.host,
    think: false,
  });

  // 创建向量化模型实例 (把文本转成数字向量，用于比较相似度)
  private embeddings = new OllamaEmbeddings({
    model: config.ollama.embedModel,
    baseUrl: config.ollama.host,
  });

  //   向量数据库（null 表示未初始化）
  private vectorStore: MemoryVectorStore | null = null;
  private docCount = 0;

  //   加载文档到向量库
  async readDocuments(
    documents: { id: string; content: string; source?: string }[],
  ) {
    const spiller = new RecursiveCharacterTextSplitter({
        chunkSize: 500,  //每块最大的字符数
        chunkOverlap: 50,  //相邻块重叠的字符数

        // 分隔符优先级，从上到下依次尝试
        separators:[
            "\n\n",  //段落分隔符
            "\n",  //行分隔符
            "。",  //句号分隔符
            "！","？",  //感叹号和问号分隔符
            "；",  //分号分隔符
            " ",  //空格分隔符
            ""  //强制按字符数分割
        ]
    })
    const allDocs:Document[] = [];

    for (const doc of documents) {
        const chunks = await spiller.createDocuments(
            [doc.content],
            [{source: doc.source || doc.id, docId: doc.id}]
        );
        allDocs.push(...chunks);
    }

    // 内部调用MemoryVectorStore，转成向量
    this.vectorStore = await MemoryVectorStore.fromDocuments(allDocs, this.embeddings);
    this.docCount = documents.length;

    return{
        success: true,
        originDocs: documents.length,
        allChunks: allDocs.length,
        message: `加载${documents.length}个文档，共${allDocs.length}个块`
    }
  }
}
