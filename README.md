# 1Panel API Skills

🎯 **OpenClaw / Hermes Skill - 1Panel 服务器管理面板 API 工具与文档**

本 Skill 提供 1Panel 开源服务器管理面板的 API 文档，并新增 **Node.js tool / MCP server**，让 Agent 通过结构化工具调用访问 1Panel，而不是临时手写 `curl` 请求。

## 关于

本 Skill 由 **面包（OneKB）** 委托其 AI 助手 **面包机** 编写，源码基于 1Panel 官方源码反推整理。

- 👤 委托者：面包 / OneKB
- 🤖 编写者：面包机（🍞 OpenClaw AI 助手）
- 📦 面包机仓库：https://github.com/breadbot86
- 🌐 1Panel 官网：https://1panel.cn/

## 能力

- 24 个模块、500+ 个 API endpoint 文档
- 零依赖 Node.js CLI：`tools/1panel-tool.js`
- 零依赖 MCP stdio server：`tools/1panel-mcp.js`
- 自动计算 `1Panel-Token` / `1Panel-Timestamp`
- 内置 endpoint 索引搜索，Agent 不必猜接口路径

## 快速开始

```bash
export ONEPANEL_BASE_URL='http://你的地址:8888'
export ONEPANEL_API_KEY='你的 API Key'

# 搜索接口
node tools/1panel-tool.js endpoints --keyword container --limit 5

# 调用接口
node tools/1panel-tool.js get /containers/status
```

MCP 配置示例：

```json
{
  "mcpServers": {
    "1panel": {
      "command": "node",
      "args": ["/absolute/path/to/1Panel-Skills/tools/1panel-mcp.js"],
      "env": {
        "ONEPANEL_BASE_URL": "http://你的地址:8888",
        "ONEPANEL_API_KEY": "你的 API Key"
      }
    }
  }
}
```

首次使用请查看 [SKILL.md](./SKILL.md)。

## 功能模块

| 模块 | 说明 |
|------|------|
| Apps | 应用商店、已安装应用 |
| Websites | 网站管理、SSL 证书 |
| Containers | Docker 容器管理 |
| Databases | 数据库管理 |
| Files | 文件管理 |
| Backups | 备份恢复 |
| Cronjobs | 定时任务 |
| Runtimes | 运行环境 |
| Hosts | 主机监控、防火墙 |
| Settings | 系统设置 |
| ... | 更多模块见 docs 目录 |

## 文档

详细 API 文档见 [docs](./docs/) 目录。

## 验证

```bash
npm test
```

## License

MIT License
