import Image from 'next/image';
import { ArrowDown, Check, Command, Filter, RotateCcw, Search, ShieldCheck, Tags } from 'lucide-react';

const tags = [
  { label: 'Bug', color: 'violet' },
  { label: '需求', color: 'blue' },
  { label: '调研', color: 'orange' },
  { label: 'Pending', color: 'yellow' },
];

const features = [
  { icon: Tags, index: '01', title: '一眼看清任务类型', body: '结构化任务名会自动拆出标签与时间，原有标题仍然完整保留。' },
  { icon: Filter, index: '02', title: '从几十个会话里快速聚焦', body: '按标签筛选和排序，让 Bug、需求、调研不再挤在同一条时间线里。' },
  { icon: Search, index: '03', title: '搜索标题，也搜索正文', body: '在本地索引会话内容，给出命中摘要，直接回到你要找的任务。' },
];

export default function Home() {
  return (
    <main>
      <nav className="nav shell" aria-label="主导航">
        <a className="brand" href="#top" aria-label="Codex Tags 首页"><span className="brand-mark"><span /></span><span>Codex <b>Tags</b></span></a>
        <div className="nav-links">
          <a href="#features">能力</a><a href="#protocol">命名规则</a>
          <a className="nav-cta" href="#install">安装预览版 <ArrowDown size={15} /></a>
        </div>
      </nav>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span className="pulse" /> macOS PRODUCTIZATION PREVIEW · v0.2.0</div>
          <h1>给每个 Codex 任务，<br /><em>一个清晰的位置。</em></h1>
          <p className="hero-lede">用标签整理任务，用全文搜索找回上下文。<br className="desktop-break" />一个克制、可恢复、只在本地工作的 Codex 桌面增强。</p>
          <div className="hero-actions">
            <a className="primary-button" href="#install">开始使用 <ArrowDown size={17} /></a>
            <a className="text-link" href="#how">看看它如何工作 <span>→</span></a>
          </div>
          <div className="trust-row">
            <span><ShieldCheck size={15} /> 不修改 app.asar</span><span><RotateCcw size={15} /> 随时可恢复</span><span><Command size={15} /> 数据不出本机</span>
          </div>
        </div>

        <div className="hero-visual" aria-label="Codex Tags 会话看板预览">
          <div className="tag-rail" aria-hidden="true">{tags.map((tag) => <span className={`mini-tag ${tag.color}`} key={tag.label}>{tag.label}</span>)}</div>
          <div className="screenshot-frame">
            <div className="window-bar"><i /><i /><i /><span>会话看板</span></div>
            <Image src="/codex-tags-screenshot.png" alt="Codex Tags 会话看板，包含本地搜索、标签筛选和会话结果" width={3024} height={1898} priority />
          </div>
          <div className="floating-note note-one"><Search size={14} /> 搜索：高价值 <b>4 个结果</b></div>
          <div className="floating-note note-two"><span className="mini-tag violet">调研</span> 已聚焦</div>
        </div>
      </section>

      <section className="ticker" aria-label="支持的标签格式"><div><span>[Bug][09-04] Fix sidebar</span><i>✦</i><span>【需求】【今天】发布首页</span><i>✦</i><span>[Research] Search ranking</span><i>✦</i><span>[Pending] Review API</span></div></section>

      <section className="feature-section shell" id="features">
        <div className="section-heading">
          <p className="section-kicker">FOCUS, WITHOUT FRICTION</p><h2>少一点翻找，<br />多一点推进。</h2>
          <p>不改变你的使用习惯。只要照常给任务命名，剩下的整理工作交给 Codex Tags。</p>
        </div>
        <div className="feature-grid">
          {features.map(({ icon: Icon, index, title, body }) => <article className="feature-card" key={index}><div className="feature-top"><span>{index}</span><Icon size={21} /></div><h3>{title}</h3><p>{body}</p></article>)}
        </div>
      </section>

      <section className="protocol-section" id="protocol"><div className="shell protocol-grid">
        <div><p className="section-kicker">THE NAMING PROTOCOL</p><h2>你已经会用了。</h2><p className="protocol-copy">把标签写在任务名前面。时间是可选的，中英文括号都支持；没有标签的任务会留在“未分类”，一个也不会消失。</p>
          <div className="checks"><span><Check size={16} /> 零迁移，现有任务照常显示</span><span><Check size={16} /> 标签可按你的团队语言自由定义</span><span><Check size={16} /> 原生标题和无障碍属性完整保留</span></div>
        </div>
        <div className="protocol-card" aria-label="任务命名示例">
          <div className="protocol-line"><span className="mini-tag violet">Bug</span><span className="date-tag">09-04</span><strong>Fix sidebar</strong></div><div className="protocol-source">[Bug][09-04] Fix sidebar</div><div className="divider" />
          <div className="protocol-line"><span className="mini-tag blue">需求</span><strong>高光即刻发布</strong></div><div className="protocol-source">【需求】高光即刻发布</div><div className="divider" />
          <div className="protocol-line"><span className="uncategorized">未分类</span><strong>Weekly planning</strong></div><div className="protocol-source">Weekly planning</div>
        </div>
      </div></section>

      <section className="how-section shell" id="how">
        <div className="how-copy"><p className="section-kicker">LOCAL BY DESIGN</p><h2>增强界面，<br />不侵入 Codex。</h2></div>
        <div className="flow" aria-label="Codex Tags 工作流程"><div><span>01</span><b>本地控制器</b><p>仅监听 loopback CDP 端点</p></div><i>→</i><div><span>02</span><b>自包含运行时</b><p>不加载远程脚本、样式或资源</p></div><i>→</i><div><span>03</span><b>可逆界面增强</b><p>恢复后回到原生 Codex</p></div></div>
      </section>

      <section className="install-section" id="install"><div className="install-glow" /><div className="shell install-inner">
        <div><p className="section-kicker">MACOS PREVIEW</p><h2>把任务，从列表<br />变成工作系统。</h2><p>当前版本面向 macOS，适合愿意体验本地增强工作流的 Codex 用户。</p></div>
        <div className="terminal" aria-label="安装命令"><div className="terminal-head"><span><i /><i /><i /></span><b>Terminal</b></div><pre><code><span>$</span> npm ci{`\n`}<span>$</span> npm run build{`\n`}<span>$</span> node scripts/manage.mjs install{`\n`}<span>$</span> node scripts/manage.mjs enable</code></pre><div className="terminal-status"><span><Check size={14} /> Ready</span><small>运行前请先阅读项目 README</small></div></div>
      </div></section>

      <footer className="shell footer"><a className="brand" href="#top"><span className="brand-mark"><span /></span><span>Codex <b>Tags</b></span></a><p>为专注工作而做。会话内容始终留在本地。</p><span>v0.2.0 · 2026</span></footer>
    </main>
  );
}
