// Actually demo: plays the design screens (screens/*.html) as one app with motion.
import { h, render, Component, Fragment } from '/vendor/preact.mjs';

const ROUTES = {
  Main: '/', Claim: '/claim', Live: '/live', Permission: '/permission', Import: '/import',
  Reveal: '/reveal', Remind: '/remind', Swipe: '/sort', Home: '/today', HomeEmpty: '/today-empty',
  Orders: '/orders', OrderDetail: '/order', Closet: '/closet', Sizes: '/brands', Brand: '/brand/nike',
  BrandZara: '/brand/zara', BrandAritzia: '/brand/aritzia', BrandEverlane: '/brand/everlane',
  BrandLevis: '/brand/levis', ForYou: '/for-you', Earn: '/earn', Friends: '/feed', MyFeed: '/my-feed',
  Push: '/alert', Goal: '/goal', RevealEarn: '/reveal/earn', RevealShare: '/reveal/share',
  HomeEarn: '/today/earn', HomeShare: '/today/share', EarnAlerts: '/alerts', Wallet: '/points',
  ShopCash: '/shop/nike', FindPeople: '/people',
};
const BY_PATH = Object.fromEntries(Object.entries(ROUTES).map(([k, v]) => [v, k]));
// Depth in the story: lower = earlier. Used to pick slide direction.
const DEPTH = {
  Push: 0, Main: 1, Claim: 2, Goal: 2.5, Live: 3, Permission: 4, Import: 5, Reveal: 6, RevealEarn: 6, RevealShare: 6, Remind: 7, Swipe: 13,
  Home: 10, HomeEmpty: 10, HomeEarn: 10, HomeShare: 10, EarnAlerts: 7, Wallet: 11, ShopCash: 12, FindPeople: 12, Orders: 10, Closet: 10, Friends: 10, Earn: 10, ForYou: 11, MyFeed: 11,
  OrderDetail: 12, Sizes: 11, Brand: 12, BrandZara: 12, BrandAritzia: 12, BrandEverlane: 12, BrandLevis: 12,
};
const PRELOAD = Object.keys(ROUTES);

// ---------- loading and compiling screens ----------
class DCLogic {
  constructor(p) { this.props = p || {}; this.state = {}; }
  setState(patch) {
    const p = typeof patch === 'function' ? patch(this.state, this.props) : patch;
    this.state = { ...this.state, ...p };
    this.__force && this.__force();
  }
}
const cache = {};
const styleTag = document.createElement('style');
document.head.appendChild(styleTag);
const cssDone = new Set();

function scopeCss(name, css) {
  const frames = [];
  css = css.replace(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*[^{}]*)\}/g, (_, n, body) => {
    frames.push(`@keyframes ${n}__${name}{${body}}`); return '';
  });
  const names = frames.map(f => f.match(/@keyframes ([\w-]+)__/)[1]);
  css = css.replace(/(animation(?:-name)?\s*:\s*)([^;}]*)/g, (_, k, v) =>
    k + v.replace(/[\w-]+/g, w => (names.includes(w) ? `${w}__${name}` : w)));
  return `[data-s="${name}"]{${css}}\n${frames.join('\n')}`;
}

async function load(name) {
  if (cache[name]) return cache[name];
  const html = await (await fetch(`/screens/${name}.html`)).text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const root = doc.querySelector('x-dc');
  const helmet = root.querySelector('helmet');
  const css = helmet ? [...helmet.querySelectorAll('style')].map(s => s.textContent).join('\n') : '';
  helmet && helmet.remove();
  if (!cssDone.has(name)) { cssDone.add(name); styleTag.textContent += scopeCss(name, css); }
  const m = html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/);
  const code = m ? m[1] : 'class Component extends DCLogic { renderVals(){ return {}; } }';
  const Cls = new Function('DCLogic', `${code}\nreturn Component;`)(DCLogic);
  cache[name] = { root, make: () => new Cls({}) };
  return cache[name];
}

// ---------- rendering the x-dc markup ----------
function lookup(path, scope) {
  const parts = path.trim().split('.');
  if (parts[0] === 'true') return true;
  if (parts[0] === 'false') return false;
  for (let i = scope.length - 1; i >= 0; i--) {
    if (parts[0] in scope[i]) {
      let v = scope[i][parts[0]];
      for (const k of parts.slice(1)) v = v == null ? undefined : v[k];
      return v;
    }
  }
  return undefined;
}
const interp = (s, scope) => s.replace(/\{\{([^}]+)\}\}/g, (_, p) => { const v = lookup(p, scope); return v == null ? '' : String(v); });
const raw = (s, scope) => { const m = s.trim().match(/^\{\{([^}]+)\}\}$/); return m ? lookup(m[1], scope) : s; };
const EVENTS = ['onClick', 'onPointerDown', 'onPointerMove', 'onPointerUp', 'onPointerCancel', 'onPointerLeave',
  'onInput', 'onChange', 'onKeyDown', 'onScroll', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'onFocus', 'onBlur'];
const EVMAP = Object.fromEntries(EVENTS.map(e => [e.toLowerCase(), e]));
const VOID = new Set(['img', 'input', 'br', 'hr', 'meta', 'link']);

function itemKey(item, i, seen) {
  const base = item && typeof item === 'object'
    ? JSON.stringify(item, (_k, v) => (typeof v === 'function' ? undefined : v)) : String(item);
  const n = seen.get(base) || 0; seen.set(base, n + 1);
  return n ? `${base}#${n}` : base || String(i);
}

function nodes(list, scope, ctx) {
  const out = [];
  for (const n of list) {
    const r = node(n, scope, ctx, out.length);
    if (Array.isArray(r)) out.push(...r); else if (r != null) out.push(r);
  }
  return out;
}

function node(n, scope, ctx, key) {
  if (n.nodeType === 3) return interp(n.textContent, scope);
  if (n.nodeType !== 1) return null;
  const tag = n.tagName.toLowerCase();
  if (tag === 'sc-if') {
    return raw(n.getAttribute('value') || '', scope) ? h(Fragment, { key }, nodes(n.childNodes, scope, ctx)) : null;
  }
  if (tag === 'sc-for') {
    const list = raw(n.getAttribute('list') || '', scope);
    const as = n.getAttribute('as') || 'item';
    if (!Array.isArray(list)) return null;
    const seen = new Map();
    return list.map((item, i) => h(Fragment, { key: `${key}-${itemKey(item, i, seen)}` },
      nodes(n.childNodes, [...scope, { [as]: item, [`${as}Index`]: i }], { ...ctx })));
  }
  const props = { key };
  let href = null;
  const inNav = ctx.inNav || tag === 'nav';
  for (const a of n.attributes) {
    const name = a.name, l = name.toLowerCase();
    if (l.startsWith('hint-')) continue;
    if (EVMAP[l]) { const fn = raw(a.value, scope); if (typeof fn === 'function') props[EVMAP[l]] = fn; continue; }
    const val = interp(a.value, scope);
    if (tag === 'a' && l === 'href') { href = val; props.href = val; continue; }
    if (tag === 'input' && l === 'value') { props.defaultValue = val; continue; }
    props[name] = val;
  }
  if (tag === 'a' && href != null) {
    const prev = props.onClick;
    props.onClick = e => {
      prev && prev(e);
      e.preventDefault();
      const m = href.match(/^([A-Za-z]+)\.dc\.html/);
      if (m && ROUTES[m[1]]) ctx.go(m[1], inNav ? 'fade' : null);
    };
    if (/\.dc\.html/.test(href)) props.href = ROUTES[href.replace('.dc.html', '')] || '#';
  }
  return h(tag, props, VOID.has(tag) ? null : nodes(n.childNodes, scope, { ...ctx, inNav }));
}

class Screen extends Component {
  constructor(p) {
    super(p);
    this.logic = p.data.make();
    this.logic.__force = () => this.forceUpdate();
  }
  componentDidMount() {
    this.logic.componentDidMount && this.logic.componentDidMount();
    if (this.props.name === 'Claim') typeName(this.base);
  }
  componentWillUnmount() {
    this.logic.componentWillUnmount && this.logic.componentWillUnmount();
    this.logic.__force = null;
  }
  shouldComponentUpdate() { return true; }
  render({ name, data, go }) {
    const vals = this.logic.renderVals() || {};
    return h('div', { class: 'scr', 'data-s': name }, nodes(data.root.childNodes, [vals], { go }));
  }
}

// The shopping email types itself out, like she just picked it.
function typeName(root) {
  const input = root && root.querySelector('#nm');
  if (!input) return;
  const word = input.value || 'sam';
  input.value = '';
  [...word].forEach((ch, i) => setTimeout(() => { input.value += ch; }, 450 + i * 160));
}

// ---------- app shell with transitions ----------
let uid = 0;
class App extends Component {
  constructor() {
    super();
    const name = BY_PATH[location.pathname] || 'Main';
    this.state = { layers: [], name };
    this.go = this.go.bind(this);
    window.addEventListener('popstate', () => this.show(BY_PATH[location.pathname] || 'Main', 'back', false));
  }
  async componentDidMount() {
    await this.show(this.state.name, 'first', false);
    PRELOAD.forEach(n => load(n).catch(() => {}));
  }
  go(name, mode) {
    const cur = this.state.name;
    if (name === cur) return;
    const dir = mode || ((DEPTH[name] ?? 10) < (DEPTH[cur] ?? 10) ? 'back' : 'fwd');
    this.show(name, dir, true);
  }
  async show(name, dir, push) {
    const data = await load(name);
    if (push) history.pushState({}, '', ROUTES[name]);
    const top = this.state.layers[this.state.layers.length - 1];
    const id = ++uid;
    const layers = dir === 'first' || !top
      ? [{ id, name, data, cls: 'in-first' }]
      : [{ ...top, cls: `out-${dir}` }, { id, name, data, cls: `in-${dir}` }];
    this.setState({ layers, name });
    clearTimeout(this.t);
    this.t = setTimeout(() => {
      this.setState({ layers: this.state.layers.filter(l => l.id === id).map(l => ({ ...l, cls: '' })) });
    }, dir === 'fade' ? 240 : 400);
    document.title = data.root.ownerDocument.title ? `${data.root.ownerDocument.title} · Actually` : 'Actually';
  }
  render(_, { layers }) {
    return h(Fragment, null, layers.map(l =>
      h('div', { key: l.id, class: `layer ${l.cls}` },
        h(Screen, { name: l.name, data: l.data, go: this.go }),
        h('div', { class: 'dim' }))));
  }
}

// Fit the phone to the window on desktop, full screen on a phone.
function fit() {
  const fitEl = document.getElementById('fit');
  const phone = document.getElementById('phone');
  if (window.innerWidth <= 500) { fitEl.style.width = fitEl.style.height = ''; phone.style.transform = ''; return; }
  const s = Math.min(1, (window.innerHeight - 40) / 844, (window.innerWidth - 40) / 390);
  fitEl.style.width = `${390 * s}px`;
  fitEl.style.height = `${844 * s}px`;
  phone.style.transform = `scale(${s})`;
}
window.addEventListener('resize', fit);
fit();
render(h(App), document.getElementById('phone'));
