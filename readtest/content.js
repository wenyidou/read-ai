/**
 * 益阅读 - 内容脚本
 * 负责在网页中注入阅读模式功能，包括：
 * 1. 提取网页正文内容并优化显示
 * 2. 集成 AI 对话助手
 * 3. 提供笔记本功能
 * 4. 支持自定义阅读设置
 */

// ==================== 常量定义 ====================

/** 阅读模式覆盖层的 DOM ID */
const OVERLAY_ID = "reader-overlay";

/** 阅读模式激活时添加到 body 的 CSS 类名 */
const BODY_ACTIVE_CLASS = "reader-mode-active";

/** 默认阅读设置配置 */
const DEFAULT_SETTINGS = {
  fontSize: 18,                    // 字体大小（像素）
  lineHeight: 1.8,                 // 行高（倍数）
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;',  // 字体族
  backgroundColor: "#ffffff",       // 背景颜色
  textColor: "#1f2933",            // 文字颜色
  maxWidth: "1000px",              // 最大宽度
  darkMode: false,                 // 暗色模式开关
};

// ==================== 聊天状态管理 ====================

/** AI 聊天状态对象 */
const chatState = {
  loading: false,                  // 是否正在发送请求
  apiKey: 'ms-d7f96938-101e-4e72-9b7f-bd84fa41dbec',  // ModelScope API 密钥
  messages: [                      // 聊天消息历史
    {
      "role": "system",
      "content": "You are a helpful assistant."
    }
  ],
  currentIndex: 0                  // 当前消息索引（暂未使用）
};

// ==================== 阅读模式核心函数 ====================

/**
 * 判断当前页面是否处于阅读模式
 * @returns {boolean} 如果阅读模式已激活返回 true，否则返回 false
 */
function isReaderActive() {
  return Boolean(document.getElementById(OVERLAY_ID));
}

/**
 * 关闭阅读模式
 * 移除覆盖层并恢复页面原始状态
 */
function removeReader() {
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) {
    overlay.remove();
  }
  document.body.classList.remove(BODY_ACTIVE_CLASS);
}

/**
 * 应用阅读设置到容器元素
 * 将用户配置的字体、颜色等样式应用到文章容器
 * @param {HTMLElement} container - 要应用样式的容器元素
 * @param {Object} settings - 阅读设置对象
 */
function applySettings(container, settings) {
  container.style.fontSize = `${settings.fontSize}px`;
  container.style.lineHeight = settings.lineHeight;
  container.style.fontFamily = settings.fontFamily;
  container.style.maxWidth = settings.maxWidth;
  container.style.color = settings.textColor;
  container.style.backgroundColor = settings.backgroundColor;
}

/**
 * 从 Chrome 存储中获取阅读设置
 * 如果存储中没有设置，则使用默认设置
 * @returns {Promise<Object>} 返回合并后的设置对象
 */
async function fetchReaderSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get("readerSettings", (data) => {
      // 将默认设置与用户设置合并，用户设置优先
      resolve(Object.assign({}, DEFAULT_SETTINGS, data.readerSettings || {}));
    });
  });
}

/**
 * 创建文章元信息部分
 * 包含网站名称、作者、时间等信息
 * @param {Object} article - 文章对象
 * @returns {string} 格式化后的元信息字符串，用 " · " 分隔
 */
function createMetaSection(article) {
  const fragments = [];
  if (article.siteName) fragments.push(article.siteName);
  if (article.byline) fragments.push(article.byline);
  const time = new Date().toLocaleString();
  fragments.push(time);
  return fragments.join(" · ");
}

// ==================== AI 聊天相关函数 ====================

  /**
   * 滚动消息容器到底部
   * 确保最新消息可见
   */
function scrollToBottom() {
    const container = document.getElementById("messagesContainer");
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  };

/**
 * 渲染所有聊天消息
 * 遍历消息历史并创建对应的 DOM 元素显示
 */
function renderMessages() {
    /**
   * 格式化消息内容
   * 如果 Marked.js 可用，则将 Markdown 转换为 HTML
   * @param {string} content - 原始消息内容
   * @returns {string} 格式化后的 HTML 或纯文本
   */
  function formatContent(content) {
    if (typeof marked !== 'undefined' && marked.parse) {
      return marked.parse(content);
    }
    return content;
  }


  const container = document.getElementById("messagesContainer");
  if (!container) return;
  
  // 清空容器，准备重新渲染
  container.innerHTML = '';
  
  // 遍历所有消息（跳过系统消息）
  chatState.messages.forEach((item, index) => {
    if (index === 0) return; // 跳过系统消息
    
    // 创建消息容器
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${item.role === 'user' ? 'user' : 'assistant'}`;
    
    // 创建消息头部（显示角色）
    const headerDiv = document.createElement("div");
    headerDiv.className = "message-header";
    headerDiv.textContent = item.role === 'user' ? '你：' : 'AI：';
    
    // 创建消息内容区域
    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";
    
    // AI 消息使用 Markdown 渲染，用户消息使用纯文本
    if (item.role === 'assistant') {
      contentDiv.innerHTML = formatContent(item.content) || '';
    } else {
      contentDiv.textContent = item.content || '';
    }
    
    messageDiv.appendChild(headerDiv);
    messageDiv.appendChild(contentDiv);
    container.appendChild(messageDiv);
  });
  
  // 滚动到底部显示最新消息
  // scrollToBottom();
}

/**
 * 显示消息提示（控制台输出）
 * 可以扩展为更友好的 UI 提示
 * @param {string} type - 消息类型（如 'error', 'warning', 'success'）
 * @param {string} message - 消息内容
 */
function showMessage(type, message) {
  console.log(`[${type}] ${message}`);
  // 可以在这里添加更友好的提示UI，比如 toast 通知
  // TODO: 可以实现一个全局的 toast 提示组件
}

/**
 * 提取当前网页内容（不重建界面）
 * 如果阅读器已存在，只提取内容；否则创建阅读器
 * @returns {Promise<string>} 返回提取的文章文本内容
 */
async function extractArticleContent() {
  // 使用 Readability 提取文章内容
  const article = ReaderAbility.extractFromDocument(document);
  if (!article) {
    throw new Error("未能提取正文内容");
  }
  // 返回纯文本内容
  return article.textContent || '';
}

/**
 * 提取当前网页内容并添加到聊天上下文
 * 将提取的文章文本、图片和视频信息作为用户消息发送给 AI
 */
async function querycontent(){
  // 如果阅读器已经存在，只提取内容，不重建界面
  if (isReaderActive()) {
    const article = ReaderAbility.extractFromDocument(document);
    if (!article) {
      throw new Error("未能提取正文内容");
    }
    let cleanText =article.textContent.trim();
    let contentMessage = `分析网页内容：${cleanText}`;
    
    // 添加图片信息
    if (article.images && article.images.length > 0) {
      contentMessage += `\n\n包含 ${article.images.length} 张图片`;
      article.images.slice(0, 5).forEach((img, index) => {
        contentMessage += `\n图片${index + 1}: ${img.alt || img.title || '无标题'}`;
      });
      if (article.images.length > 5) {
        contentMessage += `\n...还有 ${article.images.length - 5} 张图片`;
      }
    }
    
    // 添加视频信息
    if (article.videos && article.videos.length > 0) {
      contentMessage += `\n\n包含 ${article.videos.length} 个视频`;
      article.videos.forEach((video, index) => {
        const videoInfo = video.type === 'video' 
          ? `视频${index + 1}: ${video.title || '无标题'}${video.duration ? ` (时长: ${Math.floor(video.duration / 60)}分${video.duration % 60}秒)` : ''}`
          : `视频${index + 1}: ${video.type} 平台嵌入视频 - ${video.title || '无标题'}`;
        contentMessage += `\n${videoInfo}`;
      });
    }
    
    // 将网页内容添加到消息历史
    chatState.messages.push({
      "role": "user",
      "content": contentMessage
    });
    // 更新消息显示
    renderMessages();
  } else {
    // 如果阅读器不存在，创建阅读器（这会自动提取内容）
    const articleText = await openReader();
    const cleanText = articleText.trim();
    console.log(cleanText);
    // 将网页内容添加到消息历史
    chatState.messages.push({
      "role": "user",
      "content": `网页内容：${cleanText}`
    });
    // 更新消息显示
    renderMessages();
  }
}

/**
 * 主要的 AI 聊天函数
 * 处理用户输入，调用 ModelScope API，并实时显示流式响应
 */
async function askChatGPT() {
 
  // 获取输入框元素
  const userInput = document.getElementById("userInput");
  if (!userInput) {
    console.error('找不到输入框');
    return;
  }
  
  // 获取并验证用户输入
  const inputText = userInput.value.trim();
  
  if (!inputText) {
    showMessage('warning', '请输入内容');
    return;
  }

  // 防止重复发送
  if (chatState.loading) return;
  
  // 设置加载状态
  chatState.loading = true;
  const sendButton = document.getElementById("sendButton");
  if (sendButton) {
    sendButton.disabled = true;
    sendButton.textContent = '发送中...';
    scrollToBottom();
  }
 
  // 添加用户消息到历史记录
  chatState.messages.push({
    "role": "user",
    "content":inputText
  });
  renderMessages();
  console.log(chatState.messages)
  
  // 清空输入框
  userInput.value = '';
  
  try {
    // 调用 ModelScope API 发送请求
    const response = await fetch('https://api-inference.modelscope.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${chatState.apiKey}`
      },
      body: JSON.stringify({
        model: 'Qwen/Qwen2.5-7B-Instruct',  // 使用的 AI 模型
        messages: chatState.messages,        // 完整的对话历史
        stream: true,                        // 启用流式响应
        temperature: 0.7,                    // 生成随机性（0-1）
        max_tokens: 2000                     // 最大生成 token 数
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // 添加助手消息占位符（用于流式更新）
    chatState.messages.push({
      "role": "assistant",
      "content": ""
    });
    renderMessages();

    // 处理流式响应
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';              // 缓冲区，用于处理不完整的行
    let accumulatedContent = '';  // 累积的完整内容
    
    // 循环读取流数据
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      // 解码数据并添加到缓冲区
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // 保留最后一行（可能不完整）到缓冲区
      buffer = lines.pop() || '';
      
      // 处理每一行数据
      for (const line of lines) {
        if (line.trim() === '') continue;
        if (line === 'data: [DONE]') continue;  // 流结束标记
        
        // 解析 SSE 格式的数据行（格式：data: {...}）
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));
            // 提取增量内容
            if (data.choices && data.choices[0] && data.choices[0].delta) {
              const content = data.choices[0].delta.content || '';
              if (content) {
                // 累积内容并实时更新显示
                accumulatedContent += content;
                chatState.messages[chatState.messages.length - 1].content = accumulatedContent;
                renderMessages();
              }
            }
          } catch (e) {
            console.warn('解析JSON失败:', e);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('请求失败:', error);
    
    // 移除空的助手消息
    chatState.messages.pop();
    renderMessages();
    
    // 恢复用户输入（方便重试）
    userInput.value = inputText;
    
    showMessage('error', '请求失败: ' + error.message);
  } finally {
    // 恢复按钮状态
    chatState.loading = false;
    const sendButton = document.getElementById("sendButton");
    if (sendButton) {
      sendButton.disabled = false;
      sendButton.textContent = '发送';
    }

    scrollToBottom();
  }
}

/**
 * 处理键盘事件
 * Enter 键发送消息，Shift+Enter 换行
 * @param {KeyboardEvent} event - 键盘事件对象
 */
function handleKeyPress(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    askChatGPT();
  }
}

/**
 * 初始化聊天界面
 * 渲染消息并聚焦到输入框
 */
function initializeChatInterface() {
  // 初始渲染消息
  renderMessages();
  
  // 自动聚焦到输入框
  const userInput = document.getElementById('userInput');
  if (userInput) {
    userInput.focus();
  }
}

// ==================== 笔记本功能 ====================

/**
 * 保存笔记到 Chrome 存储
 * @param {string} content - 笔记内容
 * @returns {Promise<void>}
 */
async function saveNotebook(content) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ notebookContent: content }, () => {
      resolve();
    });
  });
}

/**
 * 从 Chrome 存储加载笔记
 * @returns {Promise<string>} 返回笔记内容
 */
async function loadNotebook() {
  return new Promise((resolve) => {
    chrome.storage.local.get('notebookContent', (data) => {
      resolve(data.notebookContent || '');
    });
  });
}

/**
 * 导出笔记为文本文件
 * @param {string} content - 笔记内容
 */
function exportNotebookAsText(content) {
  if (!content || !content.trim()) {
    showMessage('warning', '笔记内容为空，无法导出');
    return;
  }

  // 创建 Blob 对象
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  
  // 创建下载链接
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  // 生成文件名（包含时间戳）
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_');
  link.download = `笔记_${dateStr}.txt`;
  
  // 触发下载
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // 释放 URL 对象
  setTimeout(() => URL.revokeObjectURL(url), 100);
  
  showMessage('success', '笔记已导出');
}

/**
 * 初始化笔记本功能
 * 加载已保存的笔记内容并绑定事件
 */
async function initializeNotebook() {
  const notebookTextarea = document.getElementById('notebookTextarea');
  const saveBtn = document.getElementById('saveNotebookBtn');
  const exportBtn = document.getElementById('exportNotebookBtn');

  if (!notebookTextarea) return;

  // 加载已保存的笔记
  const savedContent = await loadNotebook();
  if (savedContent) {
    notebookTextarea.value = savedContent;
  }

  // 绑定保存按钮事件
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const content = notebookTextarea.value;
      await saveNotebook(content);
      saveBtn.textContent = '已保存';
      saveBtn.style.background = '#4caf50';
      setTimeout(() => {
        saveBtn.textContent = '保存笔记';
        saveBtn.style.background = '';
      }, 2000);
      showMessage('success', '笔记已保存');
    });
  }

  // 绑定导出按钮事件
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const content = notebookTextarea.value;
      exportNotebookAsText(content);
    });
  }

  // 自动保存（可选：每次输入后延迟保存）
  let saveTimeout = null;
  if (notebookTextarea) {
    notebookTextarea.addEventListener('input', () => {
      // 清除之前的定时器
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      // 延迟 2 秒后自动保存
      saveTimeout = setTimeout(async () => {
        const content = notebookTextarea.value;
        await saveNotebook(content);
        console.log('笔记已自动保存');
      }, 2000);
    });
  }
}

/**
 * 触发阅读器（核心功能）
 * 提取网页正文内容，创建阅读模式界面，并初始化所有交互功能
 * @returns {Promise<string>} 返回提取的文章内容文本
 */
async function openReader() {
  // 使用 Readability 提取文章内容
  const article = ReaderAbility.extractFromDocument(document);
  if (!article) {
    throw new Error("未能提取正文内容");
  }

  // 获取用户设置
  const settings = await fetchReaderSettings();
  
  // 如果已有阅读模式，先移除
  removeReader();
  
  // ==================== 创建阅读器界面结构 ====================
  
  // 创建主覆盖层容器
  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.dataset.theme = settings.darkMode ? "dark" : "light";

  // 创建工具栏
  const toolbar = document.createElement("div");
  toolbar.className = "reader-toolbar";
  toolbar.innerHTML = `
    <span>益阅读模式</span>
    <div class="reader-toolbar-actions">
      <button type="button" data-action="setnote">笔记本</button>
      <button type="button" data-action="ai">ai模型</button>
      <button type="button" data-action="toggle-theme">${settings.darkMode ? "浅色模式" : "暗色模式"}</button>
      <button type="button" data-action="close">退出</button>
    </div>
  `;
  
  // 创建主内容区域（包含文章和侧边栏）
  const maincontent = document.createElement('div');
  maincontent.className = "maincontent";
  
  // 创建文章容器
  const articleBox = document.createElement("article");
  articleBox.className = "reader-article";
  applySettings(articleBox, settings);
  
  // 创建文章元信息（网站名、作者、时间）
  const meta = document.createElement("div");
  meta.className = "reader-meta";
  meta.textContent = createMetaSection(article);

  // 创建文章标题
  const title = document.createElement("h1");
  title.textContent = article.title || document.title || "未命名文章";

  // 创建文章内容容器
  const content = document.createElement("div");
  content.className = "reader-content";
  content.innerHTML = article.content;
  
  // ==================== 处理代码块中的 HTML 实体编码 ====================
  
  // 处理所有代码块，确保特殊字符正确显示
  // 问题：某些符号如 =, (), <, > 等可能被编码为 HTML 实体，需要解码
  const codeElements = content.querySelectorAll('pre code, pre');
  codeElements.forEach(element => {
    // 获取当前的 innerHTML
    let htmlContent = element.innerHTML;
    
    // 创建一个临时容器来解析 HTML
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = htmlContent;
    
    // 获取纯文本内容（这会自动解码所有 HTML 实体）
    const plainText = tempContainer.textContent || tempContainer.innerText || '';
    
    // 使用 textContent 设置内容，这样可以：
    // 1. 正确显示所有符号（=, (), <, > 等）
    // 2. 保留代码的原始格式（空格、换行等）
    // 3. 避免 HTML 标签被解析
    element.textContent = plainText;
  });
  
  // 处理行内代码（保留 HTML 结构，但确保实体被正确解码）
  const inlineCodeElements = content.querySelectorAll('code:not(pre code)');
  inlineCodeElements.forEach(element => {
    // 对于行内代码，如果包含 HTML 实体，也进行解码
    const htmlContent = element.innerHTML;
    if (htmlContent.includes('&') && !htmlContent.includes('<')) {
      // 只处理纯文本的行内代码（不包含 HTML 标签）
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = htmlContent;
      element.textContent = tempContainer.textContent || tempContainer.innerText || '';
    }
  });
  
  // ==================== 处理文章内容中的元素 ====================
  
  // 处理图片：添加样式类、懒加载、创建 figure 结构
  content.querySelectorAll("img").forEach((img) => {
    img.classList.add("reader-image-media");
    img.removeAttribute("width");
    img.removeAttribute("height");
    img.loading = "lazy";      // 启用懒加载
    img.decoding = "async";     // 异步解码

    // 查找或创建 figure 元素包裹图片
    let figure = img.closest("figure");
    if (!figure) {
      figure = document.createElement("figure");
      figure.className = "reader-image";
      img.parentNode.insertBefore(figure, img);
      figure.appendChild(img);
    } else {
      figure.classList.add("reader-image");
    }

    // 如果有标题或 alt 文本，创建图片说明
    if (!figure.querySelector("figcaption")) {
      const captionText = img.getAttribute("title") || img.getAttribute("alt");
      if (captionText) {
        const caption = document.createElement("figcaption");
        caption.textContent = captionText;
        figure.appendChild(caption);
      }
    }
  });
  
  // 处理视频：添加样式类、创建容器结构
  content.querySelectorAll("video").forEach((video) => {
    video.classList.add("reader-video-media");
    video.removeAttribute("width");
    video.removeAttribute("height");
    video.setAttribute("controls", "true");  // 确保有控制条
    video.setAttribute("preload", "metadata");  // 预加载元数据

    // 查找或创建 figure 元素包裹视频
    let figure = video.closest("figure");
    if (!figure) {
      figure = document.createElement("figure");
      figure.className = "reader-video";
      video.parentNode.insertBefore(figure, video);
      figure.appendChild(video);
    } else {
      figure.classList.add("reader-video");
    }

    // 如果有标题，创建视频说明
    if (!figure.querySelector("figcaption")) {
      const captionText = video.getAttribute("title");
      if (captionText) {
        const caption = document.createElement("figcaption");
        caption.textContent = captionText;
        figure.appendChild(caption);
      }
    }
  });

  // 处理 iframe 嵌入的视频（YouTube、Bilibili 等）
  content.querySelectorAll("iframe").forEach((iframe) => {
    const src = iframe.getAttribute("src") || "";
    
    // 判断是否是视频嵌入
    const isVideoEmbed = src.includes("youtube.com") || 
                        src.includes("youtu.be") || 
                        src.includes("bilibili.com") || 
                        src.includes("b23.tv") ||
                        src.includes("youku.com") ||
                        src.includes("v.qq.com") ||
                        src.includes("iqiyi.com") ||
                        src.includes("vimeo.com") ||
                        src.includes("dailymotion.com");

    if (isVideoEmbed) {
      iframe.classList.add("reader-video-embed");
      iframe.removeAttribute("width");
      iframe.removeAttribute("height");
      
      // 创建响应式容器包裹 iframe
      let wrapper = iframe.parentElement;
      if (!wrapper || !wrapper.classList.contains("reader-video-wrapper")) {
        wrapper = document.createElement("div");
        wrapper.className = "reader-video-wrapper";
        iframe.parentNode.insertBefore(wrapper, iframe);
        wrapper.appendChild(iframe);
      }

      // 查找或创建 figure 元素
      let figure = wrapper.closest("figure");
      if (!figure) {
        figure = document.createElement("figure");
        figure.className = "reader-video";
        wrapper.parentNode.insertBefore(figure, wrapper);
        figure.appendChild(wrapper);
      } else {
        figure.classList.add("reader-video");
      }

      // 如果有标题，创建视频说明
      if (!figure.querySelector("figcaption")) {
        const captionText = iframe.getAttribute("title");
        if (captionText) {
          const caption = document.createElement("figcaption");
          caption.textContent = captionText;
          figure.appendChild(caption);
        }
      }
    }
  });
  
  // 处理表格：添加样式类、移除固定尺寸、添加包装容器
  content.querySelectorAll("table").forEach((table) => {
    table.classList.add("reader-table");
    table.removeAttribute("width");
    table.removeAttribute("height");
    // 创建包装容器以便响应式滚动
    const wrapper = document.createElement("div");
    wrapper.className = "reader-table-wrap";
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });
  
  // 清理过短的列表项和 span（可能是装饰性元素）
  const paragraphs = content.querySelectorAll('li,span');
  paragraphs.forEach(paragraph => {
    const text = paragraph.textContent.trim();
    if (text.length < 3) {
      paragraph.remove();
    }
  });

  // 组装文章结构
  articleBox.appendChild(title);
  articleBox.appendChild(meta);
  articleBox.appendChild(content);
  
  // 创建可拖拽调整宽度的控制条
  const resizer1 = document.createElement('div');
  resizer1.className = "resizer";

  // 创建 AI 智能阅读侧边栏（包含 AI 对话和笔记本两个标签页）
  const aiframe = document.createElement('div');
  aiframe.className = "ai-iframe";
  aiframe.innerHTML = `
  <div id="tab1" class="tab-panel active">
    <div class="chat-header">
      <h2>AI 对话助手</h2>
    </div> 
    <div>
      <button class="queryweb">提取网页内容</button>
    </div>
    <div class="messages-container" id="messagesContainer"></div>
    <div class="input-area">
      <textarea id="userInput" 
               placeholder="输入你的问题" 
               autofocus
               rows="5"></textarea>
      <button id="sendButton" class="button-container">
        发送
      </button>
    </div>
  </div>
  <div id="tab2" class="tab-panel">
    <div class="notebook-header">
      <h2>笔记本</h2>
    </div>
    <textarea class="notebook-textarea" id="notebookTextarea" placeholder="在这里记录笔记..."></textarea>
    <div class="notebook-footer">
      <button class="notebook-save-btn" id="saveNotebookBtn">保存笔记</button>
      <button class="notebook-export-btn" id="exportNotebookBtn">导出为文本文件</button>
    </div>
  </div>
`;

  // 创建页脚
  const footer = document.createElement("div");
  footer.className = "reader-footer";
  footer.textContent = "由 益阅读 提供更纯粹的阅读体验";
  
  // ==================== 组装 DOM 结构 ====================
  overlay.appendChild(toolbar);
  overlay.appendChild(maincontent);
  maincontent.appendChild(articleBox);
  maincontent.appendChild(resizer1);
  maincontent.appendChild(aiframe);
  overlay.appendChild(footer);
  document.body.appendChild(overlay);
  document.body.classList.add(BODY_ACTIVE_CLASS);

  // ==================== 绑定事件监听器 ====================
  
  // 绑定聊天界面事件
  const sendButton = aiframe.querySelector('#sendButton');
  const userInput = aiframe.querySelector('#userInput');
  const queryweb = aiframe.querySelector('.queryweb');
  
  // 发送按钮点击事件
  if (sendButton) {
    sendButton.addEventListener('click', function(e) {
      e.preventDefault();
      askChatGPT();
    });
  }
  
  // 提取网页内容按钮点击事件
  if (queryweb) {
    queryweb.addEventListener('click', function(e) {
      e.preventDefault();
      querycontent();
    });
  }
  
  // 输入框键盘事件
  if (userInput) {
    userInput.addEventListener('keydown', handleKeyPress);
    userInput.focus();
  }

  // 设置 CSS 变量，用于在 CSS 中引用背景图片
  // 使用 chrome.runtime.getURL() 获取扩展资源的正确路径
  // const backgroundUrl = chrome.runtime.getURL('icons/background.jpg');
  // overlay.style.setProperty('--background-image-url', `url("${backgroundUrl}")`);

  // 延迟初始化聊天界面（确保 DOM 已完全渲染）
  setTimeout(initializeChatInterface, 0);
  
  // 如果默认显示的是笔记本标签页，初始化笔记本功能
  const defaultActiveTab = aiframe.querySelector('.tab-panel.active');
  if (defaultActiveTab && defaultActiveTab.id === 'tab2') {
    setTimeout(() => {
      initializeNotebook();
    }, 0);
  }

  // 工具栏按钮点击事件处理
  toolbar.addEventListener("click", async (event) => {
    const action = event.target.dataset.action;
    if (!action) return;
    
    if (action === "close") {
      // 关闭阅读模式
      removeReader();
    } else if (action === "toggle-theme") {
      // 切换暗色/浅色主题
      const current = overlay.dataset.theme === "dark";
      overlay.dataset.theme = current ? "light" : "dark";
      event.target.textContent = current ? "暗色模式" : "浅色模式";
      // 保存设置到 Chrome 存储
      chrome.storage.sync.set({
        readerSettings: Object.assign({}, settings, { darkMode: !current }),
      });
    } else if (action === "setnote") {
      // 切换到笔记本标签页
      const tabPanels = aiframe.querySelectorAll('.tab-panel');
      tabPanels.forEach(panel => {
        panel.classList.remove('active');
      });
      const notebookTab = aiframe.querySelector('#tab2');
      if (notebookTab) {
        notebookTab.classList.add('active');
        // 初始化笔记本功能（如果还未初始化）
        setTimeout(() => {
          initializeNotebook();
        }, 0);
      }
      console.log('切换到笔记本模式');
    } else if (action === "ai") {
      // 切换到 AI 对话标签页
      const tabPanels = aiframe.querySelectorAll('.tab-panel');
      tabPanels.forEach(panel => {
        panel.classList.remove('active');
      });
      const aiTab = aiframe.querySelector('#tab1');
      if (aiTab) {
        aiTab.classList.add('active');
        // 重新聚焦到输入框
        const userInput = aiTab.querySelector('#userInput');
        if (userInput) {
          userInput.focus();
        }
      }
      console.log('切换到AI模式');
    }
  });
  
  // ==================== 实现拖拽调整阅读区域宽度 ====================
  
  const resizer = document.querySelector('.resizer');  
  const leftPanel = document.querySelector('.reader-article');

  if (!leftPanel) {
    console.error('找不到 reader-article 元素');
    return;
  }

  let isResizing = false;  // 是否正在调整大小

  // 鼠标按下事件：开始调整大小
  resizer.addEventListener('mousedown', function(e) {
    e.preventDefault(); // 阻止默认行为避免焦点冲突
    
    if (!leftPanel) return;  // 安全检查
    
    isResizing = true;
    
    // 改变鼠标样式和禁用文本选择
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    
    // 记录初始位置和宽度
    const startX = e.clientX;
    const startWidth = leftPanel.offsetWidth;

    // 鼠标移动事件：实时调整宽度
    function onMouseMove(e) {
      if (!isResizing || !leftPanel) return;
      e.preventDefault(); // 防止拖动时触发其他事件
      
      // 计算新的宽度（限制在 200px 到 1200px 之间）
      const dx = e.clientX - startX;
      const newWidth = Math.max(200, Math.min(1200, startWidth + dx));
      leftPanel.style.width = newWidth + 'px';
    }

    // 鼠标释放事件：结束调整大小
    function onMouseUp(e) {
      e.preventDefault();
      isResizing = false;
      // 恢复鼠标样式和文本选择
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      // 移除事件监听器
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    // 添加全局事件监听器
    document.addEventListener('mousemove', onMouseMove, { passive: false });
    document.addEventListener('mouseup', onMouseUp, { passive: false });
  });

  // 防止在调整大小时选中文本
  resizer.addEventListener('selectstart', function(e) {
    e.preventDefault();
  });
  resizer.addEventListener('dragstart', function(e) {
    e.preventDefault();
  });
  
  // 返回提取的文章内容（用于 AI 对话功能）
  return article.content;
}

/**
 * 切换阅读模式
 * 如果已激活则关闭，否则打开
 * @returns {Promise<Object>} 返回状态对象 { active: boolean }
 */
function toggleReader() {
  if (isReaderActive()) {
    removeReader();
    return { active: false };
  }
  return openReader().then(
    () => ({ active: true }),
    (error) => {
      console.error("Reader mode error:", error);
      removeReader();
      throw error;
    }
  );
}

// ==================== Chrome 扩展消息监听 ====================

/**
 * 监听来自扩展其他部分（popup、background）的消息
 * 处理阅读模式的开启、关闭和状态查询
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // 切换阅读模式
  if (message.action === "toggle-reader") {
    toggleReader()
      .then((state) => sendResponse({ success: true, ...state }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;  // 表示将异步调用 sendResponse
  }

  // 获取阅读模式状态
  if (message.action === "get-reader-state") {
    sendResponse({ success: true, active: isReaderActive() });
    return true;
  }

  // 关闭阅读模式
  if (message.action === "close-reader") {
    removeReader();
    sendResponse({ success: true, active: false });
    return true;
  }

  return false;  // 不处理此消息
});

// ==================== 全局函数暴露 ====================

// 将函数暴露到全局作用域，方便调试或外部调用
window.askChatGPT = askChatGPT;
window.handleKeyPress = handleKeyPress;
