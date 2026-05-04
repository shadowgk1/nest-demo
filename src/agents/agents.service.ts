import { ChatOllama } from '@langchain/ollama';
import { Injectable } from '@nestjs/common';
import { config } from '../config';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { SystemMessage, HumanMessage} from '@langchain/core/messages';
import { AIMessage, ToolMessage } from '@langchain/core/messages';

@Injectable()
export class AgentsService {
  // 创建模型实例
  private llm = new ChatOllama({
    model: config.ollama.chatModel,
    temperature: config.ollama.temperature,
    baseUrl: config.ollama.host,
    think: false,
  });

  // 工具1.查询商品的库存和价格，输入参数是商品的名字，输出是一个字符串，包含商品的价格和库存
  private checkProductTool = tool(
    ({ productName }: { productName: string }) => {
      const products: Record<
        string,
        { price: number; stock: number; category: string }
      > = {
        'iPhone 14': { price: 6999, stock: 100, category: '手机' },
        'iPhone 14 Pro': { price: 9999, stock: 10, category: '手机' },
        'MacBook Pro': { price: 14999, stock: 50, category: '电脑' },
        MacBook: { price: 10999, stock: 0, category: '电脑' },
        'AirPods Pro': { price: 1999, stock: 200, category: '耳机' },
        'Nike MAX': { price: 999, stock: 300, category: '运动鞋' },
      };

      const product = products[productName];
      if (!product) {
        return `抱歉，我们暂时没有${productName}这款商品`;
      }
      if (product.stock == 0) {
        return `抱歉，${productName}已经售罄`;
      }
      return `您好，${productName}的价格是${product.price}元，库存还有${product.stock}件`;
    },
    {
      name: 'check_product',
      description:
        '查询商品的库存和价格,输入参数是商品名字，输出是一个字符串，包含商品的价格和库存',
      schema: z.object({
        productName: z.string().describe('查询的商品名字'),
      }),
    },
  );

  //   工具2 创建订单
  private createOrderTool = tool(
    ({
      productName,
      quantity,
      custmerName,
    }: {
      productName: string;
      quantity: number;
      custmerName: string;
    }) => {
      const prices = {
        'iPhone 14': 6999,
        'iPhone 14 Pro': 9999,
        'MacBook Pro': 14999,
        MacBook: 10999,
        'AirPods Pro': 1999,
        'Nike MAX': 999,
      };
      const price = prices[productName] ?? 0;
      const totalPrice = price * quantity;
      if (!price) {
        return `抱歉，我们暂时没有${productName}这款商品`;
      }
      const orderId = `ORDER-${Date.now().toString().slice(-6)}`;
      return `成功创建订单：订单ID：${orderId}，商品：${productName}，数量：${quantity}，总价：${totalPrice}元，客户：${custmerName}`;
    },
    {
      name: 'create_order',
      description:
        '创建订单，输入参数是商品名字，数量，客户名字，输出是一个字符串，包含订单的详细信息',
      schema: z.object({
        productName: z.string().describe('创建订单的商品名字'),
        quantity: z.number().describe('创建订单的商品数量'),
        custmerName: z.string().describe('创建订单的客户名字'),
      }),
    },
  );

  // 工具3 查询订单状态
  private checkOrderTool = tool(
    ({ orderId }: { orderId: string }) => {
      const statuses = [
        '待支付',
        '已支付',
        '待发货',
        '已发货',
        '已完成',
        '已取消',
      ];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const extra = status === '已取消' ? '，订单已取消' : '';
      return `订单ID${status}当前的状态为${extra}`;
    },
    {
      name: 'check_order',
      description:
        '查询订单状态，输入参数是订单ID，输出是一个字符串，包含订单的当前状态',
      schema: z.object({
        orderId: z.string().describe('查询订单状态的订单ID,列如ORDER-123456'),
      }),
    },
  );

  // 工具4 订单退款
  private refundTool = tool(
    ({ orderId,reason }: { orderId: string,reason:string }) => {
        const refundId = `REFUND-${Date.now().toString().slice(-6)}`
        return `订单ID${orderId}已退款，退款ID为${refundId}，退款原因${reason}`
    },
    {
      name: 'refund_order',
      description:
        '订单退款，输入参数是订单ID和退款原因，输出是一个字符串，包含退款ID和退款原因',
      schema: z.object({
        orderId: z.string().describe('退款订单的订单ID,例如REFUND-123456'),
        reason: z.string().describe('退款原因'),
      }),
    }
  );

  // agents.service.ts 的简化版本
async runAgent(userMessage: string) {
  const toolsMap = {
    check_product: this.checkProductTool,
    create_order: this.createOrderTool,
    check_order: this.checkOrderTool,
    refund_order: this.refundTool,
  };

  const messages: any[] = [
    new SystemMessage(`你是一个智能客服助手。
    
      当需要查询商品时，回复格式：TOOL_CALL:check_product|{"productName":"商品名"}
      当需要创建订单时，回复格式：TOOL_CALL:create_order|{"productName":"商品名","quantity":数量,"custmerName":"客户名"}
      当需要查询订单时，回复格式：TOOL_CALL:check_order|{"orderId":"订单ID"}
      当需要退款时，回复格式：TOOL_CALL:refund_order|{"orderId":"订单ID","reason":"原因"}
      
      如果不需要调用工具，直接正常回复用户。`),
    new HumanMessage(userMessage),
  ];

  let response = await this.llm.invoke(messages);
  let count = 0;
  const steps:string[] = [];

  while (count < 5) {
    count++;
    const content = response.content.toString();
    
    // 检查是否需要调用工具
    if (content.startsWith('TOOL_CALL:')) {
      const [, toolCall] = content.split('TOOL_CALL:');
      const [toolName, argsStr] = toolCall.split('|');
      const args = JSON.parse(argsStr);
      
      steps.push(`调用工具: ${toolName}, 参数: ${argsStr}`);
      
      const toolFn = toolsMap[toolName];
      if (toolFn) {
        const result = await toolFn.invoke(args);
        steps.push(`工具结果: ${result}`);
        
        // 将结果添加回对话
        messages.push(response);
        messages.push(new HumanMessage(`工具返回结果: ${result}，请继续帮助用户。`));
        response = await this.llm.invoke(messages);
      }
    } else {
      steps.push(`最终回答: ${content}`);
      break;
    }
  }

  return {
    answer: response.content,
    steps,
    totalRounds: count,
  };
}
}
