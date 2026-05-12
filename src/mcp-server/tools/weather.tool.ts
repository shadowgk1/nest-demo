// 天气查询工具
export async function handleWeatherQuery(args:{ location:string}):Promise<string> {
    const { location } = args;
    return `The weather in ${location} is sunny with a temperature of 25C`
}