import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';
import { Injectable } from '@nestjs/common';
import { config } from '../config';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';
// 内存存储方式
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
// 真实的业务存储 pgvector
import { PGVectorStore, DistanceStrategy, PGVectorStoreArgs } from '@langchain/community/vectorstores/pgvector';
import { Pool } from 'pg';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { VectorStore } from '@langchain/core/vectorstores';

@Injectable()
export class RagdbService {
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

    //   postgresql pgvector 连接池
    private pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    //   pgvectorstore的配置
    private pgVectorStoreConfig = {
        pool: this.pgPool,
        tableName: 'langchain_pg_embedding',
        distanceStrategy: 'cosine' as DistanceStrategy,
        columns: {
          idColumnName: 'id',
          vectorColumnName: 'embedding',
          contentColumnName: 'content',
          metadataColumnName: 'metadata',
        },
      } as unknown as PGVectorStoreArgs;

    private docCount = 0;

    //   加载文档到向量库
    async readDocuments(
        documents: { id: string; content: string; source?: string }[],
    ) {
        const spiller = new RecursiveCharacterTextSplitter({
            chunkSize: 500,  //每块最大的字符数
            chunkOverlap: 50,  //相邻块重叠的字符数

            // 分隔符优先级，从上到下依次尝试
            separators: [
                "\n\n",  //段落分隔符
                "\n",  //行分隔符
                "。",  //句号分隔符
                "！", "？",  //感叹号和问号分隔符
                "；",  //分号分隔符
                " ",  //空格分隔符
                ""  //强制按字符数分割
            ]
        })
        const allDocs: Document[] = [];

        for (const doc of documents) {
            const chunks = await spiller.createDocuments(
                [doc.content],
                [{ source: doc.source || doc.id, docId: doc.id }]
            );
            allDocs.push(...chunks);
        }

        // 内部调用MemoryVectorStore，转成向量

        // 使用pgvectorstore存到pgvector数据库中
        // pgVectorStore.fromDocuments 内部会调用 this.embeddings.embedDocuments 把文本转化成向量
        // 1.首次调用会自动创建相关表结构
        // 2.后续调用会自动将向量数据插入 langchain-pg-embedding 表，文档数据插入 langchain-pg-collection 表
        const vectorStore = await PGVectorStore.fromDocuments(
            allDocs,
            this.embeddings,
            this.pgVectorStoreConfig
          );
        this.docCount += documents.length;

        return {
            success: true,
            originDocs: documents.length,
            allChunks: allDocs.length,
            message: `加载${documents.length}个文档，共${allDocs.length}个块`
        }
    }

    async loadDocuments() {
        try {
          const res = await this.pgPool.query(
            `SELECT COUNT(*) FROM ${this.pgVectorStoreConfig.tableName}`
          );
          const count = parseInt(res.rows[0].count, 10);
    
          return {
            model: 'pgvector',
            loaded: count > 0,
            vectorCount: count,
            message: count > 0 ? `数据库已加载，共${count}条向量` : '数据库为空',
          };
        } catch (err) {
          console.error('获取状态失败', err);
          return {
            model: 'pgvector',
            loaded: false,
            vectorCount: 0,
            message: '获取失败',
          };
        }
      }

      async searchDocuments(query: string, topK = 3) {
        const vectorStore = await PGVectorStore.initialize(
          this.embeddings,
          this.pgVectorStoreConfig
        );
    
        const results = await vectorStore.similaritySearchWithScore(query, topK);
    
        return {
          query,
          results: results.map(([doc, score]) => ({
            content: doc.pageContent,
            source: doc.metadata,
            score: parseFloat(score.toFixed(4)),
          })),
        };
      }

    async queryDocuments(question: string, topK = 3) {
        const vectorStore = await PGVectorStore.initialize(
            this.embeddings,
            this.pgVectorStoreConfig
          );
        // 第一步，检索相关的文档块
        const results = await vectorStore.similaritySearchWithScore(question, topK);
       
        // 第二步，把检索结果拼成字符串
        const filtered = results.filter(([doc,sorce])=>sorce < 0.5)
        if (!filtered.length) {
            return {
                success: false,
                question,
                message: '知识库中未找到相关内容'
            }
        }
        const context = filtered.map(([doc], i) => { `[${i + 1}] ${doc.pageContent}` }).join('\n\n');
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
        const answer = await chain.invoke({ context, question })
        return {
            success: true,
            question,
            answer,
            sources: results.map(([doc, score]) => ({
                content: doc.pageContent,
                source: doc.metadata.source,
                similarity:(1 - parseFloat(score.toFixed(4))).toFixed(4)
            })),
        }
    }

    async deleteDocuments() {
        this.pgPool.query(`DELETE FROM ${this.pgVectorStoreConfig.tableName}`)
        this.docCount = 0 
        return {
            success: true,
            message: '已清空知识库'
        }
    }

    async onModuleDestory(){
        await this.pgPool.end()
        console.log('数据库连接已关闭');
        
    }
}
