import { ChatOllama } from '@langchain/ollama';
import { Injectable } from '@nestjs/common';
import { config } from '../config';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate,PromptTemplate,FewShotPromptTemplate } from '@langchain/core/prompts'

@Injectable()
export class PromptsService {
    // 创建模型实例
    private llm = new ChatOllama({
        model: config.ollama.chatModel,
        temperature: config.ollama.temperature,
        baseUrl: config.ollama.host,
        think: false
    });

    // 多消息对话模板
    async transform(text: string,target:string){
        const prompt = ChatPromptTemplate.fromMessages([
            ['system', '你是一个翻译助手，只输出翻译结果，帮用户将文本翻译成指定的语言'],
            ['user','将{text}翻译成{target}']
        ])
        const chain = prompt.pipe(this.llm).pipe(new StringOutputParser())
        const response = await chain.invoke({text,target})
        return response
    }

    // 文本总结
    async summarize(text: string,maxLength: number){
        const prompt = ChatPromptTemplate.fromTemplate('请把以下内容总结成不超过{maxLength}个字的内容：{text}')
        const chain = prompt.pipe(this.llm).pipe(new StringOutputParser())
        const response = await chain.invoke({text,maxLength})
        return response
    }

    // 文本分类
    async classify(text: string){
        const example = [
            {text:'今天天气真好，适合出去玩',label:'积极'},
            {text:'这个产品太差了，我非常不满意',label:'消极'},
            {text:'这个电影还行，感觉一般般',label:'中立'}
        ]
        const examplePrompt = PromptTemplate.fromTemplate('输入{text}\n输出{label}')
        const fewShotPrompt = new FewShotPromptTemplate({
            examples: example,
            examplePrompt,
            prefix: '请根据输入的内容进行情感分类，输出积极、消极或中立',
            suffix: '{text}\n输出',
            inputVariables  : ['text'],
        })
        const formattedPrompt = await fewShotPrompt.format({text})
        const responese = await this.llm.invoke(formattedPrompt)
        return responese.content
    }

    // 代码审查
     async codeReview(text: string,language: string){
        const prompt = ChatPromptTemplate.fromMessages([
            ['system', '你是一个资深{language}程序员，请根据输入的代码进行审查，并给出改进建议'],
            ['user','请审查以下{language}代码,并指出其中的错误并提供改进建议：\n{text}']
        ])
        const chain = prompt.pipe(this.llm).pipe(new StringOutputParser())
        const response = await chain.invoke({text,language})
        return response
    }
}
