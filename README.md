# English Words

一个为自己而做的英语高频词学习工具：打开、判断会不会、下一个。默认不需要账户、后端、任务压力或付费 API；可选邮箱登录只用于跨设备同步进度。

## 功能

- 25,000 个按原始频率顺序排列的英语词；可按频率、随机、不会、模糊或复习模式学习
- `new`、`unknown`、`fuzzy`、`known` 四种学习状态；按频率模式会记住当前位置
- 浏览器原生英语发音，以及可替换配置的在线词典跳转
- 简洁的进度、今日学习量、连续使用天数与最近词记录
- localStorage 导入、导出和双重确认的清空操作
- 手机优先、浅色/深色/跟随系统主题、键盘快捷键
- PWA：支持添加至主屏幕；首访后会缓存应用与词库，离线时也尽量可用
- 可选的邮箱验证码登录与 D1 云端同步：未登录时仍完全使用本机 localStorage

## 本地开发

需要 Node.js 20+ 与 pnpm。

```bash
pnpm install
pnpm dev
```

生产构建：

```bash
pnpm build
```

构建产物在 `dist/`，不需要 Node 服务端。

## Cloudflare Pages 部署

把仓库导入 Cloudflare Pages，填写：

| 项目项 | 值 |
| --- | --- |
| Framework preset | Vite |
| Build command | `pnpm build` |
| Build output directory | `dist` |
| Node version | 20 或更高 |

部署完成后即可通过 `https://xxx.pages.dev` 使用。未启用云端同步时，它是标准静态站点，无需环境变量或数据库。

仓库根目录的 `wrangler.jsonc` 同样将 Pages 构建输出固定为 `./dist`，避免重新导入项目时错误发布仓库源码。

### 可选：登录与云端同步

同步功能不会阻止任何人使用网站；未登录用户继续使用本机 localStorage。需要跨设备保存时，网站使用 Supabase Auth 的邮箱验证码确认身份，并由 Pages Functions 将该用户的进度保存到 Cloudflare D1。

1. 在 Supabase 创建项目，启用 Email provider。
2. 在 `Authentication → URL Configuration` 将 Site URL 设为 `https://english.learn.byflorune.com`，并把同一地址加入 Redirect URLs。
3. 默认邮件会发送登录链接；用户点击链接后会返回网站并自动同步。若之后配置了自定义 SMTP，可在 `Authentication → Emails → Templates` 的 Magic Link/OTP 模板中使用 `{{ .Token }}`，改为发送六码验证码。详情见 [Supabase 邮箱模板文档](https://supabase.com/docs/guides/auth/auth-email-templates)。
4. 在 Cloudflare Pages 项目 `Settings → Variables and Secrets` 添加两项普通变量：

| 名称 | 值 |
| --- | --- |
| `SUPABASE_URL` | Supabase 项目的 Project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase 项目的 Publishable key |

5. 在 `Settings → Bindings` 确认 D1 binding 名为 `PROGRESS_DB`，并重新部署。

Publishable key 可在浏览器使用，不是 Supabase 的 secret/service-role key；绝不能将 `service_role` 或 `sb_secret_` 密钥放入 Cloudflare Pages 变量或前端。Pages Function 会将访问令牌发送给 Supabase Auth 验证，再按 Supabase 用户 ID 隔离 D1 数据。`functions/api/progress.ts` 会在第一次同步时自动创建所需的 `word_progress` 表。

## 词库来源与许可

`public/data/words.json` 从 [aparrish/wordfreq-en-25000](https://github.com/aparrish/wordfreq-en-25000) 的 `wordfreq-en-25000-log.json` 一次性转换而来。保留了全部 25,000 个词、原始顺序和词频对数值，未筛除缩写、人名、地名或可能令人不适的词。

原始列表由 Allison Parrish 根据 [wordfreq](https://github.com/rspeer/wordfreq) 导出；词库数据按 [Creative Commons Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/)（CC BY-SA 4.0）许可提供。请在分发派生词库时保留以上署名与相同许可。wordfreq 的学术引用信息见其 [README](https://github.com/rspeer/wordfreq#citing-wordfreq)。生成脚本本身为本项目代码。

词页中的美式 IPA 由 [CMU Pronouncing Dictionary](https://github.com/cmusphinx/cmudict) 本地转换而来；其 BSD-style license 在 `CMUDICT-LICENSE` 中保留。它是发音参考，可能包含多种读音变体。播放按钮使用浏览器的 Web Speech API 和设备可用的系统语音，因此声音与清晰度会随浏览器、操作系统及所选 voice 而变化。

点击“显示信息”会展示本地中文释义。该数据从 [ECDICT](https://github.com/skywind3000/ECDICT) 的 `translation` 字段裁剪而来，命中 22,057 个词；其 MIT license 在 `ECDICT-LICENSE` 中保留。

## 本地数据与备份

词库不会复制到 localStorage。浏览器只保存已浏览/标记过的词进度、按频率刷词的位置、范围、主题和按日统计，键为 `word-pocket:state:v1`。

在“设置”中可导出 `english-progress.json`，导入同格式文件恢复进度；清空操作会经过两次确认。

## 重新生成词库（维护者）

原始下载文件不提交到仓库。需要更新时从上游取得 `wordfreq-en-25000-log.json`，再执行：

```bash
pnpm build:words
```

转换脚本会验证条目数量为 25,000，并输出统一的 `{ rank, word, frequency }` 格式。
