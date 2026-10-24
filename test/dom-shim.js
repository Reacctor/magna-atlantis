// A tiny DOM, just enough to run js/engine.js (and its ?autotest=1 mode) inside node with no dependencies.
'use strict';

class ClassList {
  constructor(el) { this.el = el; }
  get set() { return new Set(this.el.className.split(/\s+/).filter(Boolean)); }
  write(s) { this.el.className = [...s].join(' '); }
  add(...c) { const s = this.set; c.forEach(x => s.add(x)); this.write(s); }
  remove(...c) { const s = this.set; c.forEach(x => s.delete(x)); this.write(s); }
  contains(c) { return this.set.has(c); }
  toggle(c, force) { const on = force === undefined ? !this.contains(c) : !!force; if (on) this.add(c); else this.remove(c); return on; }
}

class Element {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.className = '';
    this.classList = new ClassList(this);
    this.style = {};
    this.dataset = {};
    this.attrs = {};
    this.listeners = {};
    this._html = '';
    this.offsetWidth = 100;
  }
  set innerHTML(v) { this.children.forEach(c => { c.parentNode = null; }); this.children = []; this._html = String(v); }
  get innerHTML() { return this._html + this.children.map(c => c.innerHTML).join(''); }
  set textContent(v) { this.innerHTML = String(v); }
  get textContent() { return this.innerHTML.replace(/<[^>]+>/g, ''); }
  set src(v) {
    this.attrs.src = v;
    // no art files in tests: behave like a missing image
    if (this.onerror) setTimeout(() => this.onerror && this.onerror(), 0);
  }
  get src() { return this.attrs.src; }
  set id(v) { this.attrs.id = v; }
  get id() { return this.attrs.id; }
  appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.children.push(c); return c; }
  removeChild(c) { this.children = this.children.filter(x => x !== c); c.parentNode = null; return c; }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k] == null ? null : this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
  removeEventListener(t, f) { this.listeners[t] = (this.listeners[t] || []).filter(x => x !== f); }
  click() { if (this.onclick) this.onclick({ target: this }); (this.listeners.click || []).forEach(f => f({ target: this })); }
  find(fn) { if (fn(this)) return this; for (const c of this.children) { const r = c.find(fn); if (r) return r; } return null; }
  findAll(fn, out) { out = out || []; if (fn(this)) out.push(this); this.children.forEach(c => c.findAll(fn, out)); return out; }
}

function install(g, search) {
  const body = new Element('body');
  const listeners = {};
  const store = {};
  g.document = {
    body,
    readyState: 'complete',
    createElement: t => new Element(t),
    getElementById: id => body.find(e => e.id === id),
    addEventListener: () => {},
  };
  g.window = g;
  g.location = { search: search || '' };
  g.innerWidth = 1280; g.innerHeight = 720;
  g.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  g.addEventListener = (t, f) => { (listeners[t] = listeners[t] || []).push(f); };
  g.dispatch = (t, e) => (listeners[t] || []).forEach(f => f(e));
  return { body, Element };
}

module.exports = { install, Element };
