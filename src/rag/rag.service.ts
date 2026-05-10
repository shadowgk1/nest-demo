import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';
import { Injectable } from '@nestjs/common';
import { config } from '../config';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

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

  async loadDocuments() {
    return {
      success: true,
      docCount: this.docCount,
      message: this.docCount?`加载了${this.docCount}个文档`:'未加载文档'
    }
  }

  async searchDocuments(query: string, topK=3) {
    if (!this.vectorStore) {
      return {
        success: false,
        message: '未加载文档'
      }
    }
    const results = await this.vectorStore.similaritySearchWithScore(query, topK);
    return {
      success: true,
      query,
      results: results.map(([doc, score]) => ({
        content: doc.pageContent,
        source: doc.metadata.source,
        score:parseFloat(score.toFixed(4)),
      }))
    }
  }

  async queryDocuments(question: string, topK=3) {
    if (!this.vectorStore) {
      return {
        success: false,
        message: '未加载文档'
      }
    }
    // 第一步，检索相关的文档块
    const results = await this.vectorStore.similaritySearchWithScore(question, topK);
    if (!results.length) {
      return {
        success: false,
        question,
        message: '知识库中未找到相关内容'
      }
    }
    // 第二步，把检索结果拼成字符串
    const context = results.map(([doc],i)=>{`[${i+1}] ${doc.pageContent}`}).join('\n\n');
    // 第三步，把问题和检索结果拼成提示词，让模型严格按照这个格式回答
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', `你是一个文档助手，根据用户的问题，严格基于文档中的参考资料回答
        规则：
        1. 只基于文档中的参考资料回答问题，不要使用其他信息
        2. 如果文档中没有相关信息，不要乱编，直接回答“知识库中未找到相关内容”
        3. 回答简洁明了，使用中文回答
        参考资料：{context}
        `],
      ['user', '问题：{question}']
    ])
    const chain = prompt.pipe(this.llm).pipe(new StringOutputParser())
    const answer = await chain.invoke({context,question})
    return {
      success: true,
      question,
      answer,
      sources: results.map(([doc,score])=>({
        content: doc.pageContent,
        source: doc.metadata.source,
        score:parseFloat(score.toFixed(4)),
      })),
    }
  }

  async deleteDocuments() {
    this.vectorStore = null;
    this.docCount = 0;
    return {
      success: true,
      message: '已清空知识库'
    }
  }
}
