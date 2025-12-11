import * as cheerio from 'cheerio';

// 配置
const BASE_URL = 'http://www.meimingce.com/guandi';
const TOTAL_PAGES = 100;
const CONCURRENCY = 5; // 并发数（一次同时请求多少个），建议不要设置太高以免封IP

interface PageResult {
  id: number;
  url: string;
  lines: string[]; // 这就是你要的 ["p1", "p2"] 格式
}

/**
 * 抓取单个页面的函数
 */
async function scrapePage(pageId: number): Promise<PageResult | null> {
  const url = `${BASE_URL}/${pageId}.html`;

  try {
    // 1. 发起请求
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`[失败] ID: ${pageId} - HTTP ${response.status}`);
      return null;
    }

    // 注意：如果是老旧中文网站，可能是 GBK 编码。
    // Bun 的 fetch 默认处理 UTF-8。如果出现乱码，需要用 ArrayBuffer + TextDecoder('gbk')
    // 这里假设是 UTF-8 或标准编码
    const html = await response.text();

    // 2. 解析 HTML
    const $ = cheerio.load(html);
    
    // 3. 提取 class="article-body-cont mt20" 下面的 p 标签
    // CSS选择器中，多个class连写中间没有空格，即 .class1.class2
    const lines: string[] = [];
    
    $('.article-body-cont.mt20 p').each((_, element) => {
      const text = $(element).text().trim(); // 获取文本并去除首尾空格
      if (text) {
        lines.push(text);
      }
    });

    console.log(`[成功] ID: ${pageId} - 抓取到 ${lines.length} 行`);
    
    return {
      id: pageId,
      url,
      lines
    };

  } catch (error) {
    console.error(`[错误] ID: ${pageId} - ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

/**
 * 主函数
 */
async function main() {
  console.time("总耗时");
  const allResults: PageResult[] = [];
  
  // 生成 1 到 100 的数组
  const pageIds = Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1);

  // 分批处理 (简单的并发控制)
  for (let i = 0; i < pageIds.length; i += CONCURRENCY) {
    const chunk = pageIds.slice(i, i + CONCURRENCY);
    console.log(`正在处理批次: ${chunk[0]} - ${chunk[chunk.length - 1]} ...`);

    // 等待这一批全部完成
    const promises = chunk.map(async (id) => {
      // 添加一个微小的随机延迟(100ms - 500ms)，避免触发反爬
      const delay = Math.floor(Math.random() * 400) + 100;
      await Bun.sleep(delay); 
      return scrapePage(id);
    });

    const results = await Promise.all(promises);
    
    // 过滤掉失败的结果并添加到总集
    results.forEach(res => {
      if (res) allResults.push(res);
    });
  }

  // 4. 保存结果到文件
  // 这里保存为一个 JSON 文件，方便后续使用
  await Bun.write("result.json", JSON.stringify(allResults, null, 2));

  console.log("\n==================================");
  console.log(`任务完成！`);
  console.log(`共爬取页面: ${allResults.length}/${TOTAL_PAGES}`);
  console.log(`结果已保存至 result.json`);
  console.timeEnd("总耗时");
}

main();