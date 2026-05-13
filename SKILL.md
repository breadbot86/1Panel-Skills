---
name: 1panel-api
description: 1Panel 开源面板 API Skill。提供 Node.js 工具/MCP tools 调用来管理网站、容器、数据库、文件等模块，避免让 Agent 手写 curl。
version: 0.2.0
author: 面包机 / breadbot86
license: MIT
metadata:
  hermes:
    tags: [1panel, devops, mcp, nodejs, server-management]
---

# 1Panel API Skills

🎯 **用工具调用管理 1Panel，而不是让 Agent 临时拼 curl。**

本仓库包含 1Panel API 文档和一个零依赖 Node.js 工具层：

- `tools/1panel-tool.js`：命令行 / JSON tool-call 运行器
- `tools/1panel-mcp.js`：MCP stdio server，向支持 MCP 的 Agent 暴露 tools
- `tools/1panel-lib.js`：Token 计算、API 请求、端点索引解析
- `docs/SKILL-*.md`：按模块整理的 1Panel API 端点文档

## 快速开始

### 1. 准备 Node.js

需要 Node.js 18+，因为工具使用内置 `fetch`，不需要安装 npm 依赖。

```bash
node --version
```

### 2. 配置 1Panel 连接信息

首次使用请提供或设置以下信息：

| 信息 | 环境变量 | 说明 | 示例 |
|------|----------|------|------|
| 1Panel 地址 | `ONEPANEL_BASE_URL` | 服务器 IP/域名 + 面板端口 | `http://192.168.1.100:8888` |
| API Key | `ONEPANEL_API_KEY` | 面板「设置」→「API 密钥」生成 | `xxxxxxxx` |
| 允许自签 HTTPS | `ONEPANEL_INSECURE` | 自签证书时可设为 `true` | `true` |

```bash
export ONEPANEL_BASE_URL='http://你的地址:8888'
export ONEPANEL_API_KEY='你的 API Key'
```

### 3. 获取 API Key

1. 登录 1Panel 面板
2. 进入「设置」→「API 密钥」
3. 点击「创建」生成新密钥
4. 复制生成的密钥到 `ONEPANEL_API_KEY`

## Agent 使用规则

当 Agent 使用本 Skill 管理 1Panel 时：

1. **优先使用 Node tool / MCP tool**，不要手写 `curl`。
2. 不确定接口路径时，先调用 `onepanel_endpoint_search` 搜索端点。
3. 确认接口后，再调用 `onepanel_get`、`onepanel_post` 或 `onepanel_request`。
4. 对删除、停止服务、重启服务、覆盖配置、清理文件等危险操作，先向用户确认影响范围。
5. 返回给用户时说明调用了哪个 tool、哪个 endpoint、状态码和关键结果。

## MCP tools

`tools/1panel-mcp.js` 暴露以下 tools：

| Tool | 作用 |
|------|------|
| `onepanel_endpoint_search` | 搜索本仓库内置的 1Panel API 端点索引 |
| `onepanel_modules` | 列出内置 API 模块 |
| `onepanel_get` | GET 一个 1Panel API endpoint |
| `onepanel_post` | POST 一个 1Panel API endpoint |
| `onepanel_request` | 任意方法调用 1Panel API endpoint |

### MCP 配置示例

把下面配置加入支持 MCP 的 Agent 配置中：

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

如果使用 Hermes Agent，可用：

```bash
hermes mcp add 1panel --command "node /absolute/path/to/1Panel-Skills/tools/1panel-mcp.js"
```

然后在 Hermes 的环境变量中设置 `ONEPANEL_BASE_URL` 和 `ONEPANEL_API_KEY`，重启会话后即可使用 MCP tools。

## CLI / JSON tool-call 用法

### 搜索端点

```bash
node tools/1panel-tool.js endpoints --keyword container --limit 5
```

### 查询模块

```bash
node tools/1panel-tool.js modules
```

### GET 请求

```bash
node tools/1panel-tool.js get /containers/status
```

### POST 请求

```bash
node tools/1panel-tool.js post /containers/search \
  --body '{"page":1,"pageSize":20}'
```

### 通用 request

```bash
node tools/1panel-tool.js request \
  --method GET \
  --path /containers/status
```

### JSON tool-call 模式

```bash
node tools/1panel-tool.js tool-call '{
  "tool": "onepanel_request",
  "args": {
    "method": "GET",
    "path": "/containers/status"
  }
}'
```

返回值统一是 JSON，包含：

```json
{
  "ok": true,
  "status": 200,
  "statusText": "OK",
  "url": "http://example:8888/api/v2/containers/status",
  "data": {}
}
```

## 认证实现

Node 工具内部自动完成 1Panel API 认证，不需要 Agent 手动计算 token。

认证逻辑：

```text
timestamp = 当前 Unix 秒级时间戳
token = md5("1panel" + apiKey + timestamp)
headers:
  1Panel-Token: token
  1Panel-Timestamp: timestamp
  Content-Type: application/json
```

## 功能模块

| 模块 | 说明 |
|------|------|
| [Apps](./docs/SKILL-apps.md) | 应用商店、已安装应用管理 |
| [Websites](./docs/SKILL-websites.md) | 网站创建、配置、反向代理、SSL |
| [Containers](./docs/SKILL-containers.md) | Docker 容器管理 |
| [Databases](./docs/SKILL-databases.md) | MySQL、PostgreSQL、Redis、MongoDB |
| [Files](./docs/SKILL-files.md) | 文件上传、下载、压缩、解压 |
| [Backups](./docs/SKILL-backups.md) | 备份与恢复 |
| [Cronjobs](./docs/SKILL-cronjobs.md) | 定时任务 |
| [Runtimes](./docs/SKILL-runtimes.md) | PHP、Node、Python、Go、Java 运行环境 |
| [Hosts](./docs/SKILL-hosts.md) | 主机监控、防火墙、SSH、磁盘管理 |
| [Settings](./docs/SKILL-settings.md) | 系统配置、用户管理 |

完整端点索引见 [INDEX.md](./INDEX.md)，详细 API 文档见 [docs](./docs/) 目录。

## 常见工作流

### 查看 Docker / 容器状态

1. 搜索端点：`onepanel_endpoint_search({"keyword":"containers status"})`
2. 调用：`onepanel_get({"path":"/containers/status"})`
3. 根据返回的容器数量、镜像数量、网络数量汇报结果。

### 分页查询容器

调用：

```json
{
  "tool": "onepanel_post",
  "args": {
    "path": "/containers/search",
    "body": {"page": 1, "pageSize": 20}
  }
}
```

### 调用未知接口

1. 用 `onepanel_endpoint_search` 按关键词或模块查路径。
2. 阅读对应 `docs/SKILL-*.md` 中的参数表。
3. 用 `onepanel_request` 传 `method`、`path`、`query`、`body`。

## 验证

```bash
npm test
```

该命令会检查 Node 文件语法，并确认端点索引可以从 `docs/` 正常解析。
