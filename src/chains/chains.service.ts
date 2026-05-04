import { ChatOllama } from '@langchain/ollama';
import { Injectable } from '@nestjs/common';
import { config } from '../config';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence,RunnablePassthrough } from '@langchain/core/runnables'

@Injectable()
export class ChainsService {
     // 创建模型实例
    private llm = new ChatOllama({
        model: config.ollama.chatModel,
        temperature: config.ollama.temperature,
        baseUrl: config.ollama.host,
        think: false
    });

    // 多步链式执行，上一次的输出作为下一次的输入
    async polish(article: string){
        const analysisPrompt = ChatPromptTemplate.fromMessages([
            ['system','你是一个文学专家，只输出文章主题，风格，问题的列表，不要输出其他的信息'],
            ['user','请分析以下文章，简述文章的主题，风格，以及可能出现的问题等信息：{article}']
        ])
        const polishPrompt = ChatPromptTemplate.fromMessages([
            ['system','你是一个文章润色助手，根据输出的列表，润色文章，使文章更加清晰流畅，更有文学吸引力'],
            ['user','请根据以下结果润色这篇文章：{analysis}，文章内容是：{article}']
        ])
        const analysisChain = analysisPrompt.pipe(this.llm).pipe(new StringOutputParser())
        const fullChain = await RunnableSequence.from([
            {article: new RunnablePassthrough(), analysis: analysisChain},
            polishPrompt.pipe(this.llm).pipe(new StringOutputParser())
        ])
        const polishChain = await fullChain.invoke({article})
        return {
            origin: article,
            polish: polishChain
        }
    }

    // 更复杂的多步链式调用，三步或更多
    async generalBlog(keywords: string,style:string){
        // 三条chain 顺序执行： 关键词 -> 大纲 -> 文章 ->SEO标题
        const outlinePrompt = ChatPromptTemplate.fromMessages([
            ['system','你是一个博客大纲生成助手，根据用户提供的关键词和风格生产一篇博客文章的大纲'],
            ['user','请根据以下关键词和风格要求生成一篇博客文章的大纲。关键词:{keywords}，风格要求:{style}']
        ]).pipe(this.llm).pipe(new StringOutputParser())

        const articlePrompt = ChatPromptTemplate.fromMessages([
            ['system','你是一个博客文章生成助手，根据用户提供的博客大纲和风格要求生成一篇博客文章。'],
            ['user','请根据以下博客大纲和风格要求生成一篇博客文章。博客大纲:{outline}']
        ]).pipe(this.llm).pipe(new StringOutputParser())

        const seoTitlePrompt = ChatPromptTemplate.fromMessages([
            ['system','你是一个SE0标题生成助手，根据用户提供的博客文章内容和风格要求生成3个SEO标题'],
            ['user','请根据以下博客文章内容和风格要求生成3个SEO标题。博客文章内容:{article}']
        ]).pipe(this.llm).pipe(new StringOutputParser())

        const outline = await outlinePrompt.invoke({keywords,style})
        const article = await articlePrompt.invoke({outline})
        const seoTitle = await seoTitlePrompt.invoke({article})
        return {keywords,style,outline,article,seoTitle}
    }

    // 条件链式调用
    // 这里用智能路由举例，根据用户提供的问题，判断用哪个功能模块来处理这个问题
    async smartRouter(question:string){
        // 第一步分类
        const routerprompt = ChatPromptTemplate.fromMessages([
            ['system','分析用户的问题，只输出分类标签：技术问题-TECH，退款问题-REFUND，订单问题-ORDER，投诉建议-COMPLAINT，其他问题-OTHER'],
            ['user','{question}']
        ]).pipe(this.llm).pipe(new StringOutputParser())
        const categroy = await routerprompt.invoke({question})
        // 第二步，根据分类调用不同的处理函数
        const systemMap: Record<string,string> = {
            TECH: '你是一个技术支持助手，帮助用户解决技术问题',
            REFUND: '你是一个客服处理助手，帮助用户解决退款问题',
            ORDER: '你是一个订单问题处理助手，帮助用户解决订单问题',
            COMPLAINT: '你是一个投诉建议处理助手，帮助用户解决投诉建议问题',
            OTHER: '你是一个通用问题处理助手，帮助用户解决各种问题'
        }
        const systemMessage = systemMap[categroy] || systemMap['OTHER']
        // 第三步，把判断出的分类和问题，再次交给大模型，让它做最终相应的处理
        const answerPrompt = ChatPromptTemplate.fromMessages([
            ['system',systemMessage],
            ['user','{question}']
        ]).pipe(this.llm).pipe(new StringOutputParser())
        const answer = await answerPrompt.invoke({question})
        return { question,categroy,answer }
    }
}
