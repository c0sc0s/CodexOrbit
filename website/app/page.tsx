import Image from 'next/image';
import { ArrowDown, Check, Command, Filter, RotateCcw, Search, ShieldCheck, Tags } from 'lucide-react';

const tags = [
  { label: 'Bug', color: 'violet' },
  { label: '需求', color: 'blue' },
  { label: '调研', color: 'orange' },
  { label: 'Pending', color: 'yellow' },
];

const features = [
  { icon: Command, index: '01', title: 'Orbit · 扩展运行时', body: '统一管理本地连接、模块加载与资源清理，为每个扩展提供一致的运行基础。' },
  { icon: Tags, index: '02', title: 'Orbit Tags · 第一个扩展', body: '标签筛选、智能命名与本地内容搜索，让会话整理成为完整的工作流。' },
  { icon: Filter, index: '03', title: '独立演进，自由组合', body: '核心与业务包分别测试、分别发布。未来的功能和 Tags 平级，共用 Orbit 的扩展协议。' },
];

export default function Home() {
  return (
    <main>
      <nav className="nav shell" aria-label="主导航">
        <a className="brand" href="#top" aria-label="OrbitAI 首页"><span className="brand-mark"><span /></span><span>Orbit<b>AI</b></span></a>
        <div className="nav-links">
          <a href="#features">扩展平台</a><a href="#protocol">Orbit Tags</a>
          <a className="nav-cta" href="#install">安装预览版 <ArrowDown size={15} /></a>
        </div>
      </nav>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <div className="eyebrow">LOCAL EXTENSIONS FOR CODEX · SOURCE PREVIEW</div>
          <h1>让 Codex，<br /><em>进入你的轨道。</em></h1>
          <p className="hero-lede">Orbit 承载扩展，Orbit Tags 整理会话。<br className="desktop-break" />一个在本地运行、可以持续生长的 Codex 扩展平台。</p>
          <div className="hero-actions">
            <a className="primary-button" href="#install">开始使用 <ArrowDown size={17} /></a>
            <a className="text-link" href="#how">看看它如何工作 <span>→</span></a>
          </div>
          <div className="trust-row">
            <span><ShieldCheck size={15} /> 不修改 app.asar</span><span><RotateCcw size={15} /> 随时可恢复</span><span><Command size={15} /> 数据不出本机</span>
          </div>
        </div>

        <div className="hero-visual" aria-label="Orbit Tags 会话看板预览">
          <div className="tag-rail" aria-hidden="true">{tags.map((tag) => <span className={`mini-tag ${tag.color}`} key={tag.label}>{tag.label}</span>)}</div>
          <div className="screenshot-frame">
            <div className="window-bar"><i /><i /><i /><span>会话看板</span></div>
            <Image src="/codex-tags-screenshot.png" alt="Orbit Tags 会话看板，包含本地搜索、标签筛选和会话结果" width={3024} height={1898} priority />
          </div>
          <div className="floating-note note-one"><Search size={14} /> 搜索：高价值 <b>4 个结果</b></div>
          <div className="floating-note note-two"><span className="mini-tag violet">调研</span> 已聚焦</div>
        </div>
      </section>

      <section className="ticker" aria-label="支持的标签格式"><div><span>[Bug]Fix sidebar</span><i>✦</i><span>[Feature]发布首页</span><i>✦</i><span>[Research] Search ranking</span><i>✦</i><span>[Pending] Review API</span></div></section>

      <section className="feature-section shell" id="features">
        <div className="section-heading">
          <p className="section-kicker">ONE RUNTIME, INDEPENDENT EXTENSIONS</p><h2>可靠的基础，<br />独立生长的能力。</h2>
          <p>Orbit 专注连接与生命周期，业务扩展专注你的工作。Tags 是起点，更多能力从同一套基础上生长。</p>
        </div>
        <div className="feature-grid">
          {features.map(({ icon: Icon, index, title, body }) => <article className="feature-card" key={index}><div className="feature-top"><span>{index}</span><Icon size={21} /></div><h3>{title}</h3><p>{body}</p></article>)}
        </div>
      </section>

      <section className="protocol-section" id="protocol"><div className="shell protocol-grid">
        <div><p className="section-kicker">ORBIT TAGS</p><h2>给任务一个位置。</h2><p className="protocol-copy">把一个标签写在任务名前面，使用 [Tag]Title 格式，不添加日期。没有标签的任务归入未分类。</p>
          <div className="checks"><span><Check size={16} /> 标签与未分类任务统一展示</span><span><Check size={16} /> 标签可按你的团队语言自由定义</span><span><Check size={16} /> 原生标题和无障碍属性完整保留</span></div>
        </div>
        <div className="protocol-card" aria-label="任务命名示例">
          <div className="protocol-line"><span className="mini-tag violet">Bug</span><strong>Fix sidebar</strong></div><div className="protocol-source">[Bug]Fix sidebar</div><div className="divider" />
          <div className="protocol-line"><span className="mini-tag blue">需求</span><strong>高光即刻发布</strong></div><div className="protocol-source">【需求】高光即刻发布</div><div className="divider" />
          <div className="protocol-line"><span className="uncategorized">未分类</span><strong>Weekly planning</strong></div><div className="protocol-source">Weekly planning</div>
        </div>
      </div></section>

      <section className="how-section shell" id="how">
        <div className="how-copy"><p className="section-kicker">LOCAL BY DESIGN</p><h2>增强界面，<br />不侵入 Codex。</h2></div>
        <div className="flow" aria-label="OrbitAI 工作流程"><div><span>01</span><b>Codex Desktop</b><p>官方应用与本地 CDP 连接</p></div><i>→</i><div><span>02</span><b>Orbit</b><p>模块生命周期与独立服务进程</p></div><i>→</i><div><span>03</span><b>Orbit Tags</b><p>会话标签、命名与本地搜索</p></div></div>
      </section>

      <section className="install-section" id="install"><div className="install-glow" /><div className="shell install-inner">
        <div><p className="section-kicker">MACOS PREVIEW</p><h2>把任务，从列表<br />变成工作系统。</h2><p>当前版本面向 macOS，适合愿意体验本地增强工作流的 Codex 用户。</p></div>
        <div className="terminal" aria-label="安装命令"><div className="terminal-head"><span><i /><i /><i /></span><b>Terminal</b></div><pre><code><span>$</span> npm ci{`\n`}<span>$</span> npm run verify{`\n`}<span>$</span> node packages/orbit/dist/cli.js install{`\n`}<span>$</span> node packages/orbit/dist/cli.js plugin add ./packages/orbit-tags{`\n`}<span>$</span> node packages/orbit/dist/cli.js start</code></pre><div className="terminal-status"><span><Check size={14} /> 源码安装 · Tags 可选</span><small>npm 候选版本尚未发布，请先阅读 README</small></div></div>
      </div></section>

      <footer className="shell footer"><a className="brand" href="#top"><span className="brand-mark"><span /></span><span>Orbit<b>AI</b></span></a><p>你的 Codex，你的轨道。会话内容始终留在本地。</p><span>源码预览 · 2026</span></footer>
    </main>
  );
}
