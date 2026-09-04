"use strict";
var CodexTagsInjected = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // runtime/src/injected/entry.ts
  var entry_exports = {};
  __export(entry_exports, {
    installRuntime: () => installRuntime
  });

  // node_modules/preact/dist/preact.module.js
  var n;
  var l;
  var u;
  var t;
  var i;
  var r;
  var o;
  var e;
  var f;
  var c;
  var a;
  var s;
  var h;
  var p;
  var v;
  var y;
  var d = {};
  var w = [];
  var _ = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;
  var g = Array.isArray;
  function m(n2, l2) {
    for (var u3 in l2) n2[u3] = l2[u3];
    return n2;
  }
  function b(n2) {
    n2 && n2.parentNode && n2.parentNode.removeChild(n2);
  }
  function k(l2, u3, t2) {
    var i2, r2, o2, e2 = {};
    for (o2 in u3) "key" == o2 ? i2 = u3[o2] : "ref" == o2 ? r2 = u3[o2] : e2[o2] = u3[o2];
    if (arguments.length > 2 && (e2.children = arguments.length > 3 ? n.call(arguments, 2) : t2), "function" == typeof l2 && null != l2.defaultProps) for (o2 in l2.defaultProps) void 0 === e2[o2] && (e2[o2] = l2.defaultProps[o2]);
    return x(l2, e2, i2, r2, null);
  }
  function x(n2, t2, i2, r2, o2) {
    var e2 = { type: n2, props: t2, key: i2, ref: r2, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: null == o2 ? ++u : o2, __i: -1, __u: 0 };
    return null == o2 && null != l.vnode && l.vnode(e2), e2;
  }
  function S(n2) {
    return n2.children;
  }
  function C(n2, l2) {
    this.props = n2, this.context = l2;
  }
  function $(n2, l2) {
    if (null == l2) return n2.__ ? $(n2.__, n2.__i + 1) : null;
    for (var u3; l2 < n2.__k.length; l2++) if (null != (u3 = n2.__k[l2]) && null != u3.__e) return u3.__e;
    return "function" == typeof n2.type ? $(n2) : null;
  }
  function I(n2) {
    if (n2.__P && n2.__d) {
      var u3 = n2.__v, t2 = u3.__e, i2 = [], r2 = [], o2 = m({}, u3);
      o2.__v = u3.__v + 1, l.vnode && l.vnode(o2), q(n2.__P, o2, u3, n2.__n, n2.__P.namespaceURI, 32 & u3.__u ? [t2] : null, i2, null == t2 ? $(u3) : t2, !!(32 & u3.__u), r2), o2.__v = u3.__v, o2.__.__k[o2.__i] = o2, D(i2, o2, r2), u3.__e = u3.__ = null, o2.__e != t2 && P(o2);
    }
  }
  function P(n2) {
    if (null != (n2 = n2.__) && null != n2.__c) return n2.__e = n2.__c.base = null, n2.__k.some(function(l2) {
      if (null != l2 && null != l2.__e) return n2.__e = n2.__c.base = l2.__e;
    }), P(n2);
  }
  function A(n2) {
    (!n2.__d && (n2.__d = true) && i.push(n2) && !H.__r++ || r != l.debounceRendering) && ((r = l.debounceRendering) || o)(H);
  }
  function H() {
    try {
      for (var n2, l2 = 1; i.length; ) i.length > l2 && i.sort(e), n2 = i.shift(), l2 = i.length, I(n2);
    } finally {
      i.length = H.__r = 0;
    }
  }
  function L(n2, l2, u3, t2, i2, r2, o2, e2, f3, c2, a2) {
    var s2, h2, p2, v2, y2, _2, g2 = t2 && t2.__k || w, m2 = l2.length;
    for (f3 = T(u3, l2, g2, f3, m2), s2 = 0; s2 < m2; s2++) null != (p2 = u3.__k[s2]) && (h2 = -1 != p2.__i && g2[p2.__i] || d, p2.__i = s2, _2 = q(n2, p2, h2, i2, r2, o2, e2, f3, c2, a2), v2 = p2.__e, p2.ref && h2.ref != p2.ref && (h2.ref && J(h2.ref, null, p2), a2.push(p2.ref, p2.__c || v2, p2)), null == y2 && null != v2 && (y2 = v2), 4 & p2.__u ? (f3 = j(p2, f3, n2), h2.__e && (h2.__e = null)) : "function" == typeof p2.type && void 0 !== _2 ? f3 = _2 : v2 && (f3 = v2.nextSibling), p2.__u &= -7);
    return u3.__e = y2, f3;
  }
  function T(n2, l2, u3, t2, i2) {
    var r2, o2, e2, f3, c2, a2 = u3.length, s2 = a2, h2 = 0;
    for (n2.__k = new Array(i2), r2 = 0; r2 < i2; r2++) null != (o2 = l2[r2]) && "boolean" != typeof o2 && "function" != typeof o2 ? ("string" == typeof o2 || "number" == typeof o2 || "bigint" == typeof o2 || o2.constructor == String ? o2 = n2.__k[r2] = x(null, o2, null, null, null) : g(o2) ? o2 = n2.__k[r2] = x(S, { children: o2 }, null, null, null) : void 0 === o2.constructor && o2.__b > 0 ? o2 = n2.__k[r2] = x(o2.type, o2.props, o2.key, o2.ref ? o2.ref : null, o2.__v) : n2.__k[r2] = o2, f3 = r2 + h2, o2.__ = n2, o2.__b = n2.__b + 1, e2 = null, -1 != (c2 = o2.__i = O(o2, u3, f3, s2)) && (s2--, (e2 = u3[c2]) && (e2.__u |= 2)), null == e2 || null == e2.__v ? (-1 == c2 && (i2 > a2 ? h2-- : i2 < a2 && h2++), "function" != typeof o2.type && (o2.__u |= 4)) : c2 != f3 && (c2 == f3 - 1 ? h2-- : c2 == f3 + 1 ? h2++ : (c2 > f3 ? h2-- : h2++, o2.__u |= 4))) : n2.__k[r2] = null;
    if (s2) for (r2 = 0; r2 < a2; r2++) null != (e2 = u3[r2]) && 0 == (2 & e2.__u) && (e2.__e == t2 && (t2 = $(e2)), K(e2, e2));
    return t2;
  }
  function j(n2, l2, u3) {
    var t2, i2;
    if ("function" == typeof n2.type) {
      for (t2 = n2.__k, i2 = 0; t2 && i2 < t2.length; i2++) t2[i2] && (t2[i2].__ = n2, l2 = j(t2[i2], l2, u3));
      return l2;
    }
    n2.__e != l2 && (l2 && n2.type && !l2.parentNode && (l2 = $(n2)), l2 = u3.insertBefore(n2.__e, l2 || null));
    do {
      l2 = l2 && l2.nextSibling;
    } while (null != l2 && 8 == l2.nodeType);
    return l2;
  }
  function O(n2, l2, u3, t2) {
    var i2, r2, o2, e2 = n2.key, f3 = n2.type, c2 = l2[u3], a2 = null != c2 && 0 == (2 & c2.__u);
    if (null === c2 && null == e2 || a2 && e2 == c2.key && f3 == c2.type) return u3;
    if (t2 > (a2 ? 1 : 0)) {
      for (i2 = u3 - 1, r2 = u3 + 1; i2 >= 0 || r2 < l2.length; ) if (null != (c2 = l2[o2 = i2 >= 0 ? i2-- : r2++]) && 0 == (2 & c2.__u) && e2 == c2.key && f3 == c2.type) return o2;
    }
    return -1;
  }
  function z(n2, l2, u3) {
    "-" == l2[0] ? n2.setProperty(l2, null == u3 ? "" : u3) : n2[l2] = null == u3 ? "" : "number" != typeof u3 || _.test(l2) ? u3 : u3 + "px";
  }
  function N(n2, l2, u3, t2, i2) {
    var r2, o2;
    n: if ("style" == l2) if ("string" == typeof u3) n2.style.cssText = u3;
    else {
      if ("string" == typeof t2 && (n2.style.cssText = t2 = ""), t2) for (l2 in t2) u3 && l2 in u3 || z(n2.style, l2, "");
      if (u3) for (l2 in u3) t2 && u3[l2] == t2[l2] || z(n2.style, l2, u3[l2]);
    }
    else if ("o" == l2[0] && "n" == l2[1]) r2 = l2 != (l2 = l2.replace(s, "$1")), o2 = l2.toLowerCase(), l2 = o2 in n2 || "onFocusOut" == l2 || "onFocusIn" == l2 ? o2.slice(2) : l2.slice(2), n2.l || (n2.l = {}), n2.l[l2 + r2] = u3, u3 ? t2 ? u3[a] = t2[a] : (u3[a] = h, n2.addEventListener(l2, r2 ? v : p, r2)) : n2.removeEventListener(l2, r2 ? v : p, r2);
    else {
      if ("http://www.w3.org/2000/svg" == i2) l2 = l2.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
      else if ("width" != l2 && "height" != l2 && "href" != l2 && "list" != l2 && "form" != l2 && "tabIndex" != l2 && "download" != l2 && "rowSpan" != l2 && "colSpan" != l2 && "role" != l2 && "popover" != l2 && l2 in n2) try {
        n2[l2] = null == u3 ? "" : u3;
        break n;
      } catch (n3) {
      }
      "function" == typeof u3 || (null == u3 || false === u3 && "-" != l2[4] ? n2.removeAttribute(l2) : n2.setAttribute(l2, "popover" == l2 && 1 == u3 ? "" : u3));
    }
  }
  function V(n2) {
    return function(u3) {
      if (this.l) {
        var t2 = this.l[u3.type + n2];
        if (null == u3[c]) u3[c] = h++;
        else if (u3[c] < t2[a]) return;
        return t2(l.event ? l.event(u3) : u3);
      }
    };
  }
  function q(n2, u3, t2, i2, r2, o2, e2, f3, c2, a2) {
    var s2, h2, p2, v2, y2, d2, _2, k2, x2, M, I2, P2, A2, H2, T2, j2, F = u3.type;
    if (void 0 !== u3.constructor) return null;
    128 & t2.__u && (c2 = !!(32 & t2.__u), o2 = [f3 = u3.__e = t2.__e]), (s2 = l.__b) && s2(u3);
    n: if ("function" == typeof F) {
      h2 = e2.length;
      try {
        if (x2 = u3.props, M = F.prototype && F.prototype.render, I2 = (s2 = F.contextType) && i2[s2.__c], P2 = s2 ? I2 ? I2.props.value : s2.__ : i2, t2.__c ? k2 = (p2 = u3.__c = t2.__c).__ = p2.__E : (M ? u3.__c = p2 = new F(x2, P2) : (u3.__c = p2 = new C(x2, P2), p2.constructor = F, p2.render = Q), I2 && I2.sub(p2), p2.state || (p2.state = {}), p2.__n = i2, v2 = p2.__d = true, p2.__h = [], p2._sb = []), M && null == p2.__s && (p2.__s = p2.state), M && null != F.getDerivedStateFromProps && (p2.__s == p2.state && (p2.__s = m({}, p2.__s)), m(p2.__s, F.getDerivedStateFromProps(x2, p2.__s))), y2 = p2.props, d2 = p2.state, p2.__v = u3, v2) M && null == F.getDerivedStateFromProps && null != p2.componentWillMount && p2.componentWillMount(), M && null != p2.componentDidMount && p2.__h.push(p2.componentDidMount);
        else {
          if (M && null == F.getDerivedStateFromProps && x2 !== y2 && null != p2.componentWillReceiveProps && p2.componentWillReceiveProps(x2, P2), u3.__v == t2.__v || !p2.__e && null != p2.shouldComponentUpdate && false === p2.shouldComponentUpdate(x2, p2.__s, P2)) {
            u3.__v != t2.__v && (p2.props = x2, p2.state = p2.__s, p2.__d = false), u3.__e = t2.__e, u3.__k = t2.__k, u3.__k.some(function(n3) {
              n3 && (n3.__ = u3);
            }), w.push.apply(p2.__h, p2._sb), p2._sb = [], p2.__h.length && e2.push(p2), f3 = $(t2);
            break n;
          }
          null != p2.componentWillUpdate && p2.componentWillUpdate(x2, p2.__s, P2), M && null != p2.componentDidUpdate && p2.__h.push(function() {
            p2.componentDidUpdate(y2, d2, _2);
          });
        }
        if (p2.context = P2, p2.props = x2, p2.__P = n2, p2.__e = false, A2 = l.__r, H2 = 0, M) p2.state = p2.__s, p2.__d = false, A2 && A2(u3), s2 = p2.render(p2.props, p2.state, p2.context), w.push.apply(p2.__h, p2._sb), p2._sb = [];
        else do {
          p2.__d = false, A2 && A2(u3), s2 = p2.render(p2.props, p2.state, p2.context), p2.state = p2.__s;
        } while (p2.__d && ++H2 < 25);
        p2.state = p2.__s, null != p2.getChildContext && (i2 = m(m({}, i2), p2.getChildContext())), M && !v2 && null != p2.getSnapshotBeforeUpdate && (_2 = p2.getSnapshotBeforeUpdate(y2, d2)), T2 = null != s2 && s2.type === S && null == s2.key ? E(s2.props.children) : s2, f3 = L(n2, g(T2) ? T2 : [T2], u3, t2, i2, r2, o2, e2, f3, c2, a2), p2.base = u3.__e, u3.__u &= -161, p2.__h.length && e2.push(p2), k2 && (p2.__E = p2.__ = null);
      } catch (n3) {
        if (e2.length = h2, u3.__v = null, c2 || null != o2) {
          if (n3.then) {
            for (u3.__u |= c2 ? 160 : 128; f3 && 8 == f3.nodeType && f3.nextSibling; ) f3 = f3.nextSibling;
            null != o2 && (o2[o2.indexOf(f3)] = null), u3.__e = f3;
          } else if (null != o2) for (j2 = o2.length; j2--; ) b(o2[j2]);
        } else u3.__e = t2.__e;
        null == u3.__k && (u3.__k = t2.__k || []), n3.then || B(u3), l.__e(n3, u3, t2);
      }
    } else null == o2 && u3.__v == t2.__v ? (u3.__k = t2.__k, u3.__e = t2.__e) : f3 = u3.__e = G(t2.__e, u3, t2, i2, r2, o2, e2, c2, a2);
    return (s2 = l.diffed) && s2(u3), 128 & u3.__u ? void 0 : f3;
  }
  function B(n2) {
    n2 && (n2.__c && (n2.__c.__e = true), n2.__k && n2.__k.some(B));
  }
  function D(n2, u3, t2) {
    for (var i2 = 0; i2 < t2.length; i2++) J(t2[i2], t2[++i2], t2[++i2]);
    l.__c && l.__c(u3, n2), n2.some(function(u4) {
      try {
        n2 = u4.__h, u4.__h = [], n2.some(function(n3) {
          n3.call(u4);
        });
      } catch (n3) {
        l.__e(n3, u4.__v);
      }
    });
  }
  function E(n2) {
    return "object" != typeof n2 || null == n2 || n2.__b > 0 ? n2 : g(n2) ? n2.map(E) : void 0 !== n2.constructor ? null : m({}, n2);
  }
  function G(u3, t2, i2, r2, o2, e2, f3, c2, a2) {
    var s2, h2, p2, v2, y2, w2, _2, m2 = i2.props || d, k2 = t2.props, x2 = t2.type;
    if ("svg" == x2 ? o2 = "http://www.w3.org/2000/svg" : "math" == x2 ? o2 = "http://www.w3.org/1998/Math/MathML" : o2 || (o2 = "http://www.w3.org/1999/xhtml"), null != e2) {
      for (s2 = 0; s2 < e2.length; s2++) if ((y2 = e2[s2]) && "setAttribute" in y2 == !!x2 && (x2 ? y2.localName == x2 : 3 == y2.nodeType)) {
        u3 = y2, e2[s2] = null;
        break;
      }
    }
    if (null == u3) {
      if (null == x2) return document.createTextNode(k2);
      u3 = document.createElementNS(o2, x2, k2.is && k2), c2 && (l.__m && l.__m(t2, e2), c2 = false), e2 = null;
    }
    if (null == x2) m2 === k2 || c2 && u3.data == k2 || (u3.data = k2);
    else {
      if (e2 = "textarea" == x2 && null != k2.defaultValue ? null : e2 && n.call(u3.childNodes), !c2 && null != e2) for (m2 = {}, s2 = 0; s2 < u3.attributes.length; s2++) m2[(y2 = u3.attributes[s2]).name] = y2.value;
      for (s2 in m2) y2 = m2[s2], "dangerouslySetInnerHTML" == s2 ? p2 = y2 : "children" == s2 || s2 in k2 || "value" == s2 && "defaultValue" in k2 || "checked" == s2 && "defaultChecked" in k2 || N(u3, s2, null, y2, o2);
      for (s2 in k2) y2 = k2[s2], "children" == s2 ? v2 = y2 : "dangerouslySetInnerHTML" == s2 ? h2 = y2 : "value" == s2 ? w2 = y2 : "checked" == s2 ? _2 = y2 : c2 && "function" != typeof y2 || m2[s2] === y2 || N(u3, s2, y2, m2[s2], o2);
      if (h2) c2 || p2 && (h2.__html == p2.__html || h2.__html == u3.innerHTML) || (u3.innerHTML = h2.__html), t2.__k = [];
      else if (p2 && (u3.innerHTML = ""), L("template" == t2.type ? u3.content : u3, g(v2) ? v2 : [v2], t2, i2, r2, "foreignObject" == x2 ? "http://www.w3.org/1999/xhtml" : o2, e2, f3, e2 ? e2[0] : i2.__k && $(i2, 0), c2, a2), null != e2) for (s2 = e2.length; s2--; ) b(e2[s2]);
      c2 && "textarea" != x2 || (s2 = "value", "progress" == x2 && null == w2 ? u3.removeAttribute("value") : null != w2 && (w2 !== u3[s2] || "progress" == x2 && !w2 || "option" == x2 && w2 != m2[s2]) && N(u3, s2, w2, m2[s2], o2), s2 = "checked", null != _2 && _2 != u3[s2] && N(u3, s2, _2, m2[s2], o2));
    }
    return u3;
  }
  function J(n2, u3, t2) {
    try {
      if ("function" == typeof n2) {
        var i2 = "function" == typeof n2.__u;
        i2 && n2.__u(), i2 && null == u3 || (n2.__u = n2(u3));
      } else n2.current = u3;
    } catch (n3) {
      l.__e(n3, t2);
    }
  }
  function K(n2, u3, t2) {
    var i2, r2;
    if (l.unmount && l.unmount(n2), (i2 = n2.ref) && (i2.current && i2.current != n2.__e || J(i2, null, u3)), null != (i2 = n2.__c)) {
      if (i2.componentWillUnmount) try {
        i2.componentWillUnmount();
      } catch (n3) {
        l.__e(n3, u3);
      }
      i2.base = i2.__P = i2.__n = null;
    }
    if (i2 = n2.__k) for (r2 = 0; r2 < i2.length; r2++) i2[r2] && K(i2[r2], u3, t2 || "function" != typeof n2.type);
    t2 || b(n2.__e), n2.__c = n2.__ = n2.__e = void 0;
  }
  function Q(n2, l2, u3) {
    return this.constructor(n2, u3);
  }
  function R(u3, t2, i2) {
    var r2, o2, e2, f3;
    t2 == document && (t2 = document.documentElement), l.__ && l.__(u3, t2), o2 = (r2 = "function" == typeof i2) ? null : i2 && i2.__k || t2.__k, e2 = [], f3 = [], q(t2, u3 = (!r2 && i2 || t2).__k = k(S, null, [u3]), o2 || d, d, t2.namespaceURI, !r2 && i2 ? [i2] : o2 ? null : t2.firstChild ? n.call(t2.childNodes) : null, e2, !r2 && i2 ? i2 : o2 ? o2.__e : t2.firstChild, r2, f3), D(e2, u3, f3), u3.props.children = null;
  }
  n = w.slice, l = { __e: function(n2, l2, u3, t2) {
    for (var i2, r2, o2; l2 = l2.__; ) if ((i2 = l2.__c) && !i2.__) try {
      if ((r2 = i2.constructor) && null != r2.getDerivedStateFromError && (i2.setState(r2.getDerivedStateFromError(n2)), o2 = i2.__d), null != i2.componentDidCatch && (i2.componentDidCatch(n2, t2 || {}), o2 = i2.__d), o2) return i2.__E = i2;
    } catch (l3) {
      n2 = l3;
    }
    throw n2;
  } }, u = 0, t = function(n2) {
    return null != n2 && void 0 === n2.constructor;
  }, C.prototype.setState = function(n2, l2) {
    var u3;
    u3 = null != this.__s && this.__s != this.state ? this.__s : this.__s = m({}, this.state), "function" == typeof n2 && (n2 = n2(m({}, u3), this.props)), n2 && m(u3, n2), null != n2 && this.__v && (l2 && this._sb.push(l2), A(this));
  }, C.prototype.forceUpdate = function(n2) {
    this.__v && (this.__e = true, n2 && this.__h.push(n2), A(this));
  }, C.prototype.render = S, i = [], o = "function" == typeof Promise ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, e = function(n2, l2) {
    return n2.__v.__b - l2.__v.__b;
  }, H.__r = 0, f = Math.random().toString(8), c = "__d" + f, a = "__a" + f, s = /(PointerCapture)$|Capture$/i, h = 0, p = V(false), v = V(true), y = 0;

  // node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js
  var f2 = 0;
  function u2(e2, t2, n2, o2, i2, u3) {
    t2 || (t2 = {});
    var a2, c2, p2 = t2;
    if ("ref" in p2) for (c2 in p2 = {}, t2) "ref" == c2 ? a2 = t2[c2] : p2[c2] = t2[c2];
    var l2 = { type: e2, props: p2, key: n2, ref: a2, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --f2, __i: -1, __u: 0, __source: i2, __self: u3 };
    if ("function" == typeof e2 && (a2 = e2.defaultProps)) for (c2 in a2) void 0 === p2[c2] && (p2[c2] = a2[c2]);
    return l.vnode && l.vnode(l2), l2;
  }

  // runtime/src/injected/components/results-list.tsx
  function HighlightedText({ text, query }) {
    const needle = query.trim();
    if (!needle) return /* @__PURE__ */ u2(S, { children: text });
    const matcher = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "giu");
    const parts = [];
    let cursor = 0;
    for (const match of text.matchAll(matcher)) {
      const index = match.index ?? 0;
      if (index > cursor) parts.push(text.slice(cursor, index));
      parts.push(/* @__PURE__ */ u2("mark", { class: "codex-sidebar-search-mark", children: match[0] }, `match-${index}`));
      cursor = index + match[0].length;
    }
    if (cursor === 0) return /* @__PURE__ */ u2(S, { children: text });
    if (cursor < text.length) parts.push(text.slice(cursor));
    return /* @__PURE__ */ u2(S, { children: parts });
  }
  function ResultsList({ entries, query, sort, onOpen }) {
    let lastGroup = null;
    if (entries.length === 0) return /* @__PURE__ */ u2("div", { class: "codex-sidebar-results-empty", children: "\u6CA1\u6709\u5339\u914D\u7684\u4F1A\u8BDD" });
    return /* @__PURE__ */ u2(S, { children: entries.flatMap((entry) => {
      const nodes = [];
      if (sort === "tag" && entry.tag !== lastGroup) {
        lastGroup = entry.tag;
        nodes.push(/* @__PURE__ */ u2("div", { class: "codex-sidebar-result-group", children: entry.tag }, `group-${entry.tag}`));
      }
      nodes.push(
        /* @__PURE__ */ u2("button", { type: "button", class: "codex-sidebar-result", role: "listitem", title: entry.raw, onClick: () => onOpen(entry), children: [
          /* @__PURE__ */ u2("span", { class: "codex-sidebar-result-tag", "data-tone": entry.tone, children: entry.tag }),
          /* @__PURE__ */ u2("span", { class: "codex-sidebar-result-content", children: [
            /* @__PURE__ */ u2("span", { class: "codex-sidebar-result-title", children: /* @__PURE__ */ u2(HighlightedText, { text: entry.title, query }) }),
            entry.snippet ? /* @__PURE__ */ u2("span", { class: "codex-sidebar-result-snippet", children: /* @__PURE__ */ u2(HighlightedText, { text: entry.snippet, query }) }) : null
          ] })
        ] }, entry.key)
      );
      return nodes;
    }) });
  }
  function renderResultsList(host, props) {
    R(/* @__PURE__ */ u2(ResultsList, { ...props }), host);
  }

  // runtime/src/injected/codex-dom-adapter.ts
  var codexSelectors = {
    projectRow: "[data-app-action-sidebar-project-row]",
    projectsHeader: "[data-projects-header]",
    sectionToggle: "[data-app-action-sidebar-section-toggle]",
    threadRow: "[data-app-action-sidebar-thread-row]",
    threadTitle: "[data-thread-title]"
  };
  function queryThreadTitles(toolbarId) {
    return Array.from(document.querySelectorAll(codexSelectors.threadTitle)).filter(
      (node) => !node.closest(`#${toolbarId}`)
    );
  }
  function findNavigationButton(label) {
    return Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === label
    );
  }
  function findVisibleThreadRow(threadId) {
    if (!threadId) return null;
    return Array.from(document.querySelectorAll(codexSelectors.threadRow)).find(
      (row) => row.getAttribute("data-app-action-sidebar-thread-id") === threadId && row.getClientRects().length > 0
    ) ?? null;
  }
  function findProjectRow(projectId) {
    return Array.from(document.querySelectorAll(codexSelectors.projectRow)).find(
      (row) => row.getAttribute("data-app-action-sidebar-project-id") === projectId
    );
  }
  function mutationContainsSidebarNode(node) {
    if (!(node instanceof Element)) return false;
    const selector = Object.values(codexSelectors).join(",");
    return node.matches(selector) || Boolean(node.querySelector(selector));
  }

  // runtime/src/injected/search.ts
  function timeRank(value) {
    const match = /^(\d{1,2})[-/.](\d{1,2})$/.exec(value);
    return match ? Number(match[1]) * 100 + Number(match[2]) : -1;
  }
  function selectVisibleEntries(entries, state, contentMatches) {
    const query = state.query.trim().toLocaleLowerCase();
    const filtered = entries.flatMap((entry) => {
      if (state.tag !== "all" && entry.tag !== state.tag) return [];
      if (!query) return [{ ...entry, matchType: "none", snippet: "" }];
      if (`${entry.tag} ${entry.time} ${entry.title}`.toLocaleLowerCase().includes(query)) {
        return [{ ...entry, matchType: "title", snippet: "" }];
      }
      const contentMatch = contentMatches.get(entry.threadId ?? "");
      if (!contentMatch) return [];
      return [{ ...entry, matchType: "content", snippet: `${contentMatch.role}\uFF1A${contentMatch.snippet}` }];
    });
    if (state.sort === "time") return filtered.sort((left, right) => timeRank(right.time) - timeRank(left.time) || left.index - right.index);
    if (state.sort === "tag") return filtered.sort((left, right) => left.tag.localeCompare(right.tag, "zh-CN") || left.title.localeCompare(right.title, "zh-CN"));
    if (state.sort === "title") return filtered.sort((left, right) => left.title.localeCompare(right.title, "zh-CN", { numeric: true }));
    return filtered.sort((left, right) => left.index - right.index);
  }

  // runtime/src/injected/store.ts
  function createInitialState() {
    return {
      query: "",
      tag: "all",
      sort: "sidebar",
      sortOpen: false,
      open: false,
      view: "sessions",
      tagError: ""
    };
  }

  // runtime/src/injected/runtime.ts
  function installRuntime(config) {
    const { version, patternSource, toneEntries, searchBinding } = config;
    const STYLE_ID = "codex-sidebar-tags-style";
    const TOOLBAR_ID = "codex-sidebar-tags-toolbar";
    const CACHE_KEY = "codex-sidebar-tags-index-v1";
    const TAG_CONFIG_KEY = "codex-sidebar-tags-config-v1";
    const ENHANCED = "data-codex-sidebar-tags-enhanced";
    const RAW = "data-codex-sidebar-tags-raw";
    const previous = window.__codexSidebarTags;
    if (previous?.version === version) return previous.status();
    try {
      previous?.dispose?.();
    } catch {
    }
    const pattern = new RegExp(patternSource, "u");
    let tagDefinitions = toneEntries.map(([name, tone]) => ({ name, tone }));
    try {
      const savedDefinitions = JSON.parse(localStorage.getItem(TAG_CONFIG_KEY) ?? "null");
      if (Array.isArray(savedDefinitions)) {
        tagDefinitions = savedDefinitions.filter((item) => item && typeof item.name === "string" && typeof item.tone === "string");
      }
    } catch {
    }
    let tones = new Map(tagDefinitions.map(({ name, tone }) => [name.toLocaleLowerCase(), tone]));
    const contentMatches = /* @__PURE__ */ new Map();
    let searchRequestTimer = null;
    let activeSearchRequestId = 0;
    let searchLoading = false;
    let searchError = "";
    let searchIndexStatus = { phase: "idle", completed: 0, total: 0 };
    const state = createInitialState();
    const entryCache = /* @__PURE__ */ new Map();
    const originalNodeState = /* @__PURE__ */ new WeakMap();
    let host = null;
    let modal = null;
    let navTemplate = null;
    let queued = false;
    let renderedIndexSignature = null;
    let persistedCacheJson = null;
    let renderCount = 0;
    let observerRefreshCount = 0;
    let pinnedToggleRef = null;
    let pointerActive = false;
    let pendingToolbarRefresh = false;
    const debugEvents = [];
    const clearPendingSearch = () => {
      if (searchRequestTimer !== null) clearTimeout(searchRequestTimer);
      searchRequestTimer = null;
    };
    const trace = (event, details = {}) => {
      debugEvents.push({ at: (/* @__PURE__ */ new Date()).toISOString(), event, ...details });
      if (debugEvents.length > 80) debugEvents.shift();
    };
    const parse = (value) => {
      const raw = typeof value === "string" ? value.trim() : "";
      const match = pattern.exec(raw);
      if (!match) return raw ? { raw, tag: "\u672A\u5206\u7C7B", time: "", title: raw, tone: "neutral", tagged: false } : null;
      const tag = (match[1] ?? match[2] ?? "").trim();
      const time = (match[3] ?? match[4] ?? "").trim();
      const title = match[5].trim();
      if (!tag || !title) return null;
      return { raw, tag, time, title, tone: tones.get(tag.toLocaleLowerCase()) ?? "neutral", tagged: true };
    };
    try {
      const savedEntries = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "[]");
      if (Array.isArray(savedEntries)) {
        savedEntries.forEach((entry) => {
          if (entry && typeof entry.key === "string" && typeof entry.raw === "string") entryCache.set(entry.key, entry);
        });
        persistedCacheJson = JSON.stringify(savedEntries);
      }
    } catch {
    }
    const persistCache = () => {
      try {
        const savedEntries = Array.from(entryCache.values(), ({ node, row, ...entry }) => entry);
        const nextCacheJson = JSON.stringify(savedEntries);
        if (nextCacheJson === persistedCacheJson) return;
        localStorage.setItem(CACHE_KEY, nextCacheJson);
        persistedCacheJson = nextCacheJson;
      } catch {
      }
    };
    const persistTagDefinitions = () => {
      try {
        localStorage.setItem(TAG_CONFIG_KEY, JSON.stringify(tagDefinitions));
      } catch {
      }
    };
    const syncTagDefinitions = () => {
      tones = new Map(tagDefinitions.map(({ name, tone }) => [name.toLocaleLowerCase(), tone]));
      entryCache.forEach((entry) => {
        entry.tone = tones.get(entry.tag.toLocaleLowerCase()) ?? "neutral";
      });
      document.querySelectorAll(`[${ENHANCED}]`).forEach((node) => {
        const parsed = parse(node.getAttribute(RAW));
        const chip = node.querySelector(":scope > .codex-sidebar-tag-layout > .codex-sidebar-tag-chip");
        if (parsed && chip) chip.dataset.tone = parsed.tone;
      });
      persistCache();
      persistTagDefinitions();
    };
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      (document.head ?? document.documentElement).appendChild(style);
    }
    style.textContent = `
    [data-thread-title][${ENHANCED}] { min-width: 0; }
    .codex-sidebar-tag-layout { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 6px; min-width: 0; max-width: 100%; vertical-align: middle; }
    .codex-sidebar-filter-chip {
      display: inline-flex; flex: 0 0 auto; align-items: center; border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
      border-radius: 999px; font-weight: 650; letter-spacing: .01em;
    }
    .codex-sidebar-tag-chip, .codex-sidebar-result-tag {
      display: inline-flex; align-items: center; min-width: 0; height: 18px; padding: 0;
      border: 0; background: transparent; font-size: 10px; font-weight: 600; line-height: 18px; white-space: nowrap;
    }
    .codex-sidebar-tag-chip[data-tone="amber"], .codex-sidebar-result-tag[data-tone="amber"] { color: #9a6700; }
    .codex-sidebar-tag-chip[data-tone="blue"], .codex-sidebar-result-tag[data-tone="blue"] { color: #2c6db2; }
    .codex-sidebar-tag-chip[data-tone="red"], .codex-sidebar-result-tag[data-tone="red"] { color: #c53b3b; }
    .codex-sidebar-tag-chip[data-tone="purple"], .codex-sidebar-result-tag[data-tone="purple"] { color: #7651ad; }
    .codex-sidebar-tag-chip[data-tone="green"], .codex-sidebar-result-tag[data-tone="green"] { color: #277653; }
    .codex-sidebar-tag-chip[data-tone="neutral"], .codex-sidebar-result-tag[data-tone="neutral"] {
      color: var(--color-text-tertiary, var(--color-token-text-tertiary, #777));
    }
    .codex-sidebar-tag-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    #${TOOLBAR_ID} {
      display: contents; color: var(--color-text-foreground, var(--color-token-text-primary, inherit));
    }
    .codex-sidebar-dashboard-entry { display: contents; }
    .codex-sidebar-dashboard-launcher { width: 100%; color: inherit; font: inherit; }
    .codex-sidebar-dashboard-launcher[data-dashboard-fallback="true"] {
      display: flex; align-items: center; gap: 8px; min-height: 32px; padding: 0 12px; border: 0; border-radius: 6px;
      background: transparent; text-align: left; cursor: pointer;
    }
    .codex-sidebar-dashboard-launcher[data-dashboard-fallback="true"]:hover { background: var(--color-token-list-hover-background, #8882); }
    .codex-sidebar-dashboard-launcher:focus-visible { outline: 2px solid var(--color-border-focus, var(--color-token-focus-border, #4b8cff)); outline-offset: -2px; }

    .codex-sidebar-dashboard-overlay {
      position: fixed; inset: 0; z-index: 10000; display: grid; place-items: center; padding: 24px;
      background: #0006; backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px);
    }
    .codex-sidebar-dashboard-dialog {
      display: flex; width: min(680px, calc(100vw - 40px)); max-height: min(720px, calc(100vh - 48px)); flex-direction: column;
      border: 1px solid var(--color-border-light, var(--color-token-menu-border, #8884)); border-radius: 16px;
      color: var(--color-text-foreground, var(--color-token-text-primary, inherit)); background: var(--color-background-elevated-base, var(--color-token-menu-background, #181818));
      box-shadow: 0 24px 70px #0007, 0 4px 18px #0003; overflow: hidden;
    }
    .codex-sidebar-dashboard-header { display: flex; align-items: center; gap: 12px; padding: 15px 16px 12px; border-bottom: 1px solid var(--color-border-light, var(--color-token-border-light, #8883)); }
    .codex-sidebar-dashboard-heading { margin: 0; font-size: 17px; font-weight: 650; }
    .codex-sidebar-dashboard-subtitle { color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); font-size: 12px; }
    .codex-sidebar-dashboard-tabs { display: flex; gap: 3px; margin-left: auto; padding: 3px; border-radius: 8px; background: var(--color-background-control, var(--color-token-input-background, #8881)); }
    .codex-sidebar-dashboard-tab { height: 29px; padding: 0 11px; border: 0; border-radius: 6px; color: var(--color-text-secondary, inherit); background: transparent; font: inherit; font-size: 12px; cursor: pointer; }
    .codex-sidebar-dashboard-tab[aria-selected="true"] { color: var(--color-text-foreground, inherit); background: var(--color-background-elevated-high, var(--color-token-list-active-selection-background, #8883)); box-shadow: 0 1px 2px #0002; }
    .codex-sidebar-dashboard-close { display: grid; width: 28px; height: 28px; place-items: center; padding: 0; border: 0; border-radius: 7px; color: var(--color-text-tertiary, inherit); background: transparent; font: inherit; font-size: 17px; cursor: pointer; }
    .codex-sidebar-dashboard-close:hover { color: var(--color-text-foreground, inherit); background: var(--color-token-toolbar-hover-background, #8882); }
    .codex-sidebar-dashboard-body { min-height: 0; padding: 14px 16px 16px; overflow-y: auto; }
    .codex-sidebar-dashboard-controls { display: flex; align-items: center; gap: 8px; }
    .codex-sidebar-search {
      display: flex; flex: 1 1 auto; align-items: center; min-width: 0; height: 36px; border: 1px solid var(--color-border-light, var(--color-token-input-border, #8883)); border-radius: 8px;
      background: var(--color-background-control, var(--color-token-input-background, #8881)); transition: border-color 120ms ease, background 120ms ease, box-shadow 120ms ease;
    }
    .codex-sidebar-search:focus-within {
      border-color: var(--color-border-focus, var(--color-token-focus-border, #4b8cff));
      background: var(--color-background-control-opaque, var(--color-token-input-background, #8882));
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-border-focus, #4b8cff) 18%, transparent);
    }
    .codex-sidebar-search-icon { width: 29px; flex: 0 0 29px; color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); font-size: 15px; text-align: center; pointer-events: none; }
    .codex-sidebar-search-input {
      width: 100%; min-width: 0; border: 0; outline: 0; padding: 0 7px 0 0; color: var(--color-text-foreground, var(--color-token-input-foreground, inherit));
      background: transparent; font: inherit; font-size: 14px;
    }
    .codex-sidebar-search-input::placeholder { color: var(--color-text-tertiary, var(--color-token-input-placeholder-foreground, #888)); }
    .codex-sidebar-sort-control {
      position: relative; display: flex; flex: 0 0 144px; align-items: center; height: 36px;
    }
    .codex-sidebar-sort-trigger {
      display: flex; width: 100%; height: 36px; align-items: center; gap: 7px; padding: 0 10px; border: 1px solid var(--color-border-light, var(--color-token-input-border, #8883)); border-radius: 8px;
      color: var(--color-text-foreground, var(--color-token-input-foreground, inherit)); background: var(--color-background-control, var(--color-token-input-background, #8881)); font: inherit; font-size: 13px; cursor: pointer;
    }
    .codex-sidebar-sort-trigger:hover { background: var(--color-background-control-opaque, var(--color-token-list-hover-background, #8882)); }
    .codex-sidebar-sort-trigger:focus-visible, .codex-sidebar-sort-trigger[aria-expanded="true"] { outline: 0; border-color: var(--color-border-focus, var(--color-token-focus-border, #4b8cff)); box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-border-focus, #4b8cff) 18%, transparent); }
    .codex-sidebar-sort-label { color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); pointer-events: none; }
    .codex-sidebar-sort-value { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .codex-sidebar-sort-chevron { width: 7px; height: 7px; margin: -3px 2px 0 auto; border-right: 1.5px solid currentColor; border-bottom: 1.5px solid currentColor; opacity: .7; transform: rotate(45deg); transition: transform 120ms ease; }
    .codex-sidebar-sort-trigger[aria-expanded="true"] .codex-sidebar-sort-chevron { margin-top: 3px; transform: rotate(225deg); }
    .codex-sidebar-sort-menu {
      position: absolute; top: calc(100% + 5px); right: 0; z-index: 8; width: 144px; padding: 4px;
      border: 1px solid var(--color-border-light, var(--color-token-menu-border, #8884)); border-radius: 9px;
      color: var(--color-text-foreground, var(--color-token-dropdown-foreground, inherit)); background: var(--color-background-elevated-high, var(--color-token-menu-background, #202020));
      box-shadow: 0 12px 32px #0006, 0 2px 8px #0003;
    }
    .codex-sidebar-sort-option { display: flex; width: 100%; height: 32px; align-items: center; padding: 0 9px; border: 0; border-radius: 6px; color: inherit; background: transparent; font: inherit; font-size: 13px; text-align: left; cursor: pointer; }
    .codex-sidebar-sort-option:hover, .codex-sidebar-sort-option:focus-visible { outline: 0; background: var(--color-token-list-hover-background, #8882); }
    .codex-sidebar-sort-option[aria-selected="true"] { background: var(--color-token-list-active-selection-background, #8883); }
    .codex-sidebar-sort-check { width: 14px; margin-left: auto; color: var(--color-text-secondary, inherit); text-align: center; }
    .codex-sidebar-filter-rail { display: flex; gap: 5px; margin-top: 10px; padding: 0 1px 2px; overflow-x: auto; scrollbar-width: none; }
    .codex-sidebar-filter-rail::-webkit-scrollbar { display: none; }
    .codex-sidebar-filter-chip {
      height: 27px; padding: 0 7px; border-color: transparent; color: var(--color-text-secondary, var(--color-token-text-secondary, inherit));
      background: var(--color-background-control, var(--color-token-input-background, #8881)); font: inherit; font-size: 12px; cursor: pointer; transition: transform 100ms ease, color 100ms ease, background 100ms ease;
    }
    .codex-sidebar-filter-chip:hover { background: var(--color-background-control, var(--color-token-list-hover-background, #8882)); }
    .codex-sidebar-filter-chip:active { transform: scale(.97); }
    .codex-sidebar-filter-chip[aria-pressed="true"] {
      color: var(--color-text-foreground, var(--color-token-list-active-selection-foreground, inherit));
      border-color: var(--color-border-light, var(--color-token-border-light, #8884));
      background: var(--color-background-elevated-base, var(--color-token-list-active-selection-background, #8883)); box-shadow: 0 1px 2px #0001;
    }
    .codex-sidebar-filter-count { margin-left: 4px; opacity: .62; font-variant-numeric: tabular-nums; }
    .codex-sidebar-results {
      margin-top: 12px; padding: 6px; border: 1px solid var(--color-border-light, var(--color-token-border-light, #8883)); border-radius: 11px;
      background: var(--color-background-surface, var(--color-token-bg-secondary, #8881)); overflow-anchor: none;
    }
    .codex-sidebar-results-head { display: flex; align-items: center; justify-content: space-between; min-height: 26px; padding: 0 5px 5px 7px; color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); font-size: 12px; }
    .codex-sidebar-results-list { max-height: min(430px, calc(100vh - 250px)); overflow-y: auto; overscroll-behavior: contain; }
    .codex-sidebar-result-group {
      position: sticky; top: 0; z-index: 1; padding: 5px 7px 3px; color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888));
      background: var(--color-background-elevated-base, var(--color-token-menu-background, #181818)); font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
    }
    .codex-sidebar-result {
      display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: start; gap: 8px; width: 100%; min-height: 40px; padding: 8px;
      border: 0; border-radius: 8px; color: var(--color-text-foreground, var(--color-token-text-primary, inherit)); background: transparent; text-align: left; font: inherit; cursor: pointer;
    }
    .codex-sidebar-result:hover, .codex-sidebar-result:focus-visible { outline: 0; background: var(--color-token-list-hover-background, #8882); }
    .codex-sidebar-result-tag { font-size: 11px; }
    .codex-sidebar-result-content { min-width: 0; }
    .codex-sidebar-result-title { display: block; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; line-height: 1.4; }
    .codex-sidebar-result-snippet { display: -webkit-box; margin-top: 4px; overflow: hidden; color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); font-size: 11px; line-height: 1.5; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
    .codex-sidebar-search-mark {
      padding: 0 1px; border-radius: 3px; color: var(--color-text-foreground, var(--color-token-text-primary, inherit));
      background: color-mix(in srgb, var(--color-border-focus, var(--color-token-focus-border, #4b8cff)) 32%, transparent);
      font-weight: 650; box-decoration-break: clone; -webkit-box-decoration-break: clone;
    }
    .codex-sidebar-results-empty { padding: 17px 8px 19px; color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); font-size: 13px; text-align: center; }
    .codex-sidebar-tag-settings-note { margin: 0 0 12px; color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); font-size: 13px; line-height: 1.5; }
    .codex-sidebar-tag-form { display: grid; grid-template-columns: minmax(0, 1fr) 105px auto; gap: 8px; margin-bottom: 12px; }
    .codex-sidebar-tag-input, .codex-sidebar-tag-tone {
      height: 32px; min-width: 0; border: 1px solid var(--color-border-light, var(--color-token-input-border, #8883)); border-radius: 8px; outline: 0;
      color: var(--color-text-foreground, inherit); background: var(--color-background-control, var(--color-token-input-background, #8881)); font: inherit; font-size: 13px;
    }
    .codex-sidebar-tag-input { padding: 0 9px; }
    .codex-sidebar-tag-tone { padding: 0 20px 0 8px; }
    .codex-sidebar-tag-input:focus, .codex-sidebar-tag-tone:focus { border-color: var(--color-border-focus, var(--color-token-focus-border, #4b8cff)); box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-border-focus, #4b8cff) 18%, transparent); }
    .codex-sidebar-tag-add { height: 32px; padding: 0 12px; border: 1px solid var(--color-border-light, #8884); border-radius: 8px; color: var(--color-token-button-foreground, inherit); background: var(--color-token-button-background, #8882); font: inherit; font-size: 13px; cursor: pointer; }
    .codex-sidebar-tag-error { min-height: 18px; margin: -5px 0 5px; color: #c53b3b; font-size: 12px; }
    .codex-sidebar-tag-config-list { display: grid; gap: 5px; }
    .codex-sidebar-tag-config-row { display: grid; grid-template-columns: minmax(0, 1fr) 80px 28px; align-items: center; min-height: 36px; padding: 0 7px 0 10px; border-radius: 8px; background: var(--color-background-control, var(--color-token-input-background, #8881)); }
    .codex-sidebar-tag-config-tone { color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); font-size: 12px; }
    .codex-sidebar-tag-delete { display: grid; width: 26px; height: 26px; place-items: center; padding: 0; border: 0; border-radius: 6px; color: var(--color-text-tertiary, inherit); background: transparent; font: inherit; cursor: pointer; }
    .codex-sidebar-tag-delete:hover { color: #c53b3b; background: #ef444418; }
    @media (prefers-color-scheme: dark) {
      .codex-sidebar-tag-chip[data-tone="amber"], .codex-sidebar-result-tag[data-tone="amber"] { color: #f2b84b; }
      .codex-sidebar-tag-chip[data-tone="blue"], .codex-sidebar-result-tag[data-tone="blue"] { color: #6ba8ed; }
      .codex-sidebar-tag-chip[data-tone="red"], .codex-sidebar-result-tag[data-tone="red"] { color: #ef7777; }
      .codex-sidebar-tag-chip[data-tone="purple"], .codex-sidebar-result-tag[data-tone="purple"] { color: #b894e8; }
      .codex-sidebar-tag-chip[data-tone="green"], .codex-sidebar-result-tag[data-tone="green"] { color: #64bd8e; }
    }
    @media (max-width: 760px) {
      .codex-sidebar-dashboard-overlay { padding: 10px; }
      .codex-sidebar-dashboard-dialog { width: calc(100vw - 20px); max-height: calc(100vh - 20px); }
      .codex-sidebar-dashboard-header { flex-wrap: wrap; }
      .codex-sidebar-dashboard-tabs { order: 3; width: 100%; margin-left: 0; }
      .codex-sidebar-dashboard-tab { flex: 1; }
      .codex-sidebar-tag-form { grid-template-columns: 1fr 92px; }
      .codex-sidebar-tag-add { grid-column: 1 / -1; }
      .codex-sidebar-results-list { max-height: calc(100vh - 300px); }
    }
    @media (prefers-reduced-motion: reduce) { .codex-sidebar-filter-chip, .codex-sidebar-search { transition: none; } }
  `;
    const restoreNode = (node) => {
      const raw = node.getAttribute(RAW);
      if (raw === null) return;
      const original = originalNodeState.get(node);
      if (original) node.replaceChildren(...original.children.map((child) => child.cloneNode(true)));
      else node.replaceChildren(document.createTextNode(raw));
      node.removeAttribute(ENHANCED);
      node.removeAttribute(RAW);
      if (original?.ariaLabel === null || !original) node.removeAttribute("aria-label");
      else node.setAttribute("aria-label", original.ariaLabel);
      if (original?.title === null || !original) node.removeAttribute("title");
      else node.setAttribute("title", original.title);
      originalNodeState.delete(node);
    };
    const enhanceNode = (node) => {
      if (!(node instanceof HTMLElement) || node.closest(`#${TOOLBAR_ID}`)) return;
      const generated = node.querySelector(":scope > .codex-sidebar-tag-layout");
      if (node.getAttribute(ENHANCED) === version && generated) return;
      const existingRaw = node.getAttribute(RAW);
      const raw = existingRaw !== null && generated ? existingRaw : node.textContent?.trim() ?? "";
      const parsed = parse(raw);
      if (!parsed?.tagged) {
        if (existingRaw !== null) restoreNode(node);
        return;
      }
      if (!originalNodeState.has(node)) {
        originalNodeState.set(node, {
          children: [...node.childNodes].map((child) => child.cloneNode(true)),
          ariaLabel: node.getAttribute("aria-label"),
          title: node.getAttribute("title")
        });
      }
      const layout = document.createElement("span");
      layout.className = "codex-sidebar-tag-layout";
      const tag = document.createElement("span");
      tag.className = "codex-sidebar-tag-chip";
      tag.dataset.tone = parsed.tone;
      tag.textContent = parsed.tag;
      layout.appendChild(tag);
      const title = document.createElement("span");
      title.className = "codex-sidebar-tag-title";
      title.textContent = parsed.title;
      layout.appendChild(title);
      node.setAttribute(RAW, parsed.raw);
      node.setAttribute(ENHANCED, version);
      node.setAttribute("aria-label", parsed.raw);
      node.setAttribute("title", parsed.raw);
      node.replaceChildren(layout);
    };
    const titleNodes = () => queryThreadTitles(TOOLBAR_ID);
    const commonAncestor = (left, right) => {
      if (!left || !right) return left?.parentElement ?? null;
      const parents = /* @__PURE__ */ new Set();
      for (let node = left; node; node = node.parentElement) parents.add(node);
      for (let node = right; node; node = node.parentElement) if (parents.has(node)) return node;
      return null;
    };
    const ensureToolbar = (nodes) => {
      if (host?.isConnected) return host;
      host = document.getElementById(TOOLBAR_ID);
      if (host) return host;
      const pluginsButton = findNavigationButton("Plugins");
      if (pluginsButton) {
        navTemplate = pluginsButton;
        const anchor2 = pluginsButton.parentElement?.classList.contains("contents") ? pluginsButton.parentElement : pluginsButton;
        host = document.createElement("div");
        host.id = TOOLBAR_ID;
        host.setAttribute("aria-label", "\u770B\u677F");
        anchor2.insertAdjacentElement("afterend", host);
        return host;
      }
      const pinnedToggle = pinnedToggleRef?.isConnected ? pinnedToggleRef : document.querySelector(codexSelectors.sectionToggle);
      const projectRow = document.querySelector(codexSelectors.projectRow);
      const first = nodes[0] ?? pinnedToggle ?? projectRow;
      if (!first) return null;
      const projectsHeader = document.querySelector(codexSelectors.projectsHeader);
      const boundary = commonAncestor(first, projectsHeader ?? projectRow ?? nodes[nodes.length - 1] ?? first);
      if (!(boundary instanceof HTMLElement)) return null;
      let anchor = first;
      while (anchor.parentElement && anchor.parentElement !== boundary) anchor = anchor.parentElement;
      host = document.createElement("div");
      host.id = TOOLBAR_ID;
      host.setAttribute("aria-label", "\u4F1A\u8BDD\u770B\u677F");
      boundary.insertBefore(host, anchor);
      return host;
    };
    const projectIdForRow = (row) => {
      for (let parent = row?.parentElement; parent; parent = parent.parentElement) {
        const projectRows = parent.querySelectorAll(codexSelectors.projectRow);
        if (projectRows.length !== 1) continue;
        return projectRows[0].getAttribute("data-app-action-sidebar-project-id");
      }
      return null;
    };
    const sectionToggleForRow = (row) => {
      for (let parent = row?.parentElement; parent; parent = parent.parentElement) {
        const toggles = parent.querySelectorAll(codexSelectors.sectionToggle);
        if (toggles.length === 1) return toggles[0];
      }
      return null;
    };
    const entriesFrom = (nodes) => {
      nodes.forEach((node, index) => {
        const raw = node.getAttribute(RAW) ?? node.textContent?.trim() ?? "";
        const parsed = parse(raw);
        if (!parsed) return;
        const row = node.closest(codexSelectors.threadRow);
        const threadId = row?.getAttribute("data-app-action-sidebar-thread-id");
        const key = threadId ?? `title:${raw}`;
        const pinned = row?.getAttribute("data-app-action-sidebar-thread-pinned") === "true";
        if (pinned) pinnedToggleRef = sectionToggleForRow(row) ?? pinnedToggleRef;
        entryCache.set(key, {
          ...parsed,
          key,
          threadId,
          node,
          row,
          index: entryCache.get(key)?.index ?? index,
          pinned,
          projectId: projectIdForRow(row)
        });
      });
      persistCache();
      return Array.from(entryCache.values()).map((entry) => ({
        ...entry,
        node: entry.node?.isConnected ? entry.node : null,
        row: entry.row?.isConnected ? entry.row : null
      }));
    };
    const openEntry = async (entry) => {
      let row = entry.row?.isConnected && entry.row.getClientRects().length > 0 ? entry.row : findVisibleThreadRow(entry.threadId);
      trace("open-entry", { threadId: entry.threadId, projectId: entry.projectId, pinned: entry.pinned, visibleRow: Boolean(row) });
      if (!row && entry.pinned) {
        const pinnedToggle = pinnedToggleRef?.isConnected ? pinnedToggleRef : document.querySelector(codexSelectors.sectionToggle);
        if (pinnedToggle && !document.querySelector("[data-app-action-sidebar-thread-pinned='true']")) pinnedToggle.click();
      }
      if (!row && entry.projectId) {
        const projectRow = findProjectRow(entry.projectId);
        if (projectRow?.getAttribute("data-app-action-sidebar-project-collapsed") === "true") {
          trace("expand-project", { projectId: entry.projectId });
          projectRow.click();
        }
      }
      for (let attempt = 0; !row && attempt < 80; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        row = findVisibleThreadRow(entry.threadId);
      }
      if (row) {
        state.query = "";
        clearPendingSearch();
        contentMatches.clear();
        searchLoading = false;
        searchError = "";
        state.tag = "all";
        state.sortOpen = false;
        state.open = false;
        renderToolbar(entriesFrom(titleNodes()));
        row.scrollIntoView({ block: "nearest" });
        row.click();
      } else {
        entryCache.delete(entry.key);
        persistCache();
        renderToolbar(entriesFrom(titleNodes()));
      }
    };
    const indexSignature = (entries) => entries.map((entry) => [entry.key, entry.raw, entry.pinned, entry.projectId].join("")).join("");
    const scheduleContentSearch = (entries) => {
      clearPendingSearch();
      contentMatches.clear();
      searchError = "";
      const query = state.query.trim();
      if (!query) {
        searchLoading = false;
        return;
      }
      searchLoading = true;
      activeSearchRequestId += 1;
      const requestId = activeSearchRequestId;
      searchRequestTimer = setTimeout(() => {
        searchRequestTimer = null;
        const request = window[searchBinding];
        if (typeof request !== "function") {
          searchLoading = false;
          searchError = "\u672C\u5730\u641C\u7D22\u670D\u52A1\u5C1A\u672A\u8FDE\u63A5";
          renderToolbar(entriesFrom(titleNodes()), "search-unavailable");
          return;
        }
        request(JSON.stringify({
          type: "searchRequest",
          requestId,
          query,
          threadIds: entries.map(({ threadId }) => threadId).filter(Boolean),
          limit: 100
        }));
        trace("search-request", { requestId, queryLength: query.length, threads: entries.length });
      }, 200);
    };
    const button = (className, text) => {
      const element = document.createElement("button");
      element.type = "button";
      element.className = className;
      element.textContent = text;
      return element;
    };
    const renderToolbar = (entries, reason = "state") => {
      const toolbar = ensureToolbar(entries.map((entry2) => entry2.node).filter(Boolean));
      if (!toolbar) return;
      pendingToolbarRefresh = false;
      renderedIndexSignature = indexSignature(entries);
      renderCount += 1;
      trace("render", { reason, count: entries.length, open: state.open });
      const activeInput = document.activeElement?.matches?.(".codex-sidebar-search-input, .codex-sidebar-tag-input") ? document.activeElement : null;
      const activeInputClass = activeInput?.className ?? null;
      const selectionStart = activeInput?.selectionStart ?? null;
      modal?.remove();
      modal = null;
      toolbar.replaceChildren();
      const entry = document.createElement("div");
      entry.className = "codex-sidebar-dashboard-entry";
      const launcher = navTemplate?.cloneNode(true) ?? button("", "Tags");
      launcher.classList.add("codex-sidebar-dashboard-launcher");
      if (!navTemplate) launcher.dataset.dashboardFallback = "true";
      launcher.querySelector(".text-fade-truncate")?.replaceChildren(document.createTextNode("Tags"));
      const icon = launcher.querySelector("svg");
      if (icon) {
        icon.replaceChildren();
        [[2, 2], [8.5, 2], [2, 8.5], [8.5, 8.5]].forEach(([x2, y2]) => {
          const tile = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          tile.setAttribute("x", String(x2));
          tile.setAttribute("y", String(y2));
          tile.setAttribute("width", "5.5");
          tile.setAttribute("height", "5.5");
          tile.setAttribute("rx", "1");
          tile.setAttribute("stroke", "currentColor");
          tile.setAttribute("stroke-width", "1.15");
          icon.appendChild(tile);
        });
      }
      launcher.title = "\u6253\u5F00 Tags";
      launcher.setAttribute("aria-label", "\u6253\u5F00 Tags");
      launcher.setAttribute("aria-haspopup", "dialog");
      launcher.setAttribute("aria-expanded", String(state.open));
      launcher.addEventListener("click", () => {
        state.open = true;
        state.view = "sessions";
        state.sortOpen = false;
        renderToolbar(entriesFrom(titleNodes()), "open-dashboard");
      });
      entry.appendChild(launcher);
      toolbar.appendChild(entry);
      if (!state.open) return;
      const overlay = document.createElement("div");
      overlay.className = "codex-sidebar-dashboard-overlay";
      const dialog = document.createElement("section");
      dialog.className = "codex-sidebar-dashboard-dialog";
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");
      dialog.setAttribute("aria-label", "\u4F1A\u8BDD\u770B\u677F");
      const header = document.createElement("header");
      header.className = "codex-sidebar-dashboard-header";
      const headingGroup = document.createElement("div");
      const heading = document.createElement("h2");
      heading.className = "codex-sidebar-dashboard-heading";
      heading.textContent = state.view === "sessions" ? "\u4F1A\u8BDD\u770B\u677F" : "\u6807\u7B7E\u8BBE\u7F6E";
      const subtitle = document.createElement("div");
      subtitle.className = "codex-sidebar-dashboard-subtitle";
      subtitle.textContent = state.view === "sessions" ? `${entries.length} \u4E2A\u4F1A\u8BDD \xB7 ${searchIndexStatus.phase === "ready" ? "\u672C\u5730\u7D22\u5F15\u5DF2\u5C31\u7EEA" : "\u672C\u5730\u7D22\u5F15\u6309\u9700\u52A0\u8F7D"}` : `${tagDefinitions.length} \u4E2A\u5DF2\u914D\u7F6E\u6807\u7B7E`;
      headingGroup.append(heading, subtitle);
      const tabs = document.createElement("div");
      tabs.className = "codex-sidebar-dashboard-tabs";
      tabs.setAttribute("role", "tablist");
      [["sessions", "\u4F1A\u8BDD"], ["settings", "\u6807\u7B7E\u8BBE\u7F6E"]].forEach(([value, label]) => {
        const tab = button("codex-sidebar-dashboard-tab", label);
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-selected", String(state.view === value));
        tab.addEventListener("click", () => {
          state.view = value;
          state.sortOpen = false;
          state.tagError = "";
          renderToolbar(entriesFrom(titleNodes()), "dashboard-tab");
        });
        tabs.appendChild(tab);
      });
      const close = button("codex-sidebar-dashboard-close", "\xD7");
      close.title = "\u5173\u95ED";
      close.setAttribute("aria-label", "\u5173\u95ED\u4F1A\u8BDD\u770B\u677F");
      close.addEventListener("click", () => {
        state.open = false;
        state.sortOpen = false;
        renderToolbar(entriesFrom(titleNodes()), "close-dashboard");
      });
      header.append(headingGroup, tabs, close);
      const body = document.createElement("div");
      body.className = "codex-sidebar-dashboard-body";
      if (state.view === "sessions") {
        const controls = document.createElement("div");
        controls.className = "codex-sidebar-dashboard-controls";
        const search = document.createElement("label");
        search.className = "codex-sidebar-search";
        const searchIcon = document.createElement("span");
        searchIcon.className = "codex-sidebar-search-icon";
        searchIcon.textContent = "\u2315";
        const input = document.createElement("input");
        input.className = "codex-sidebar-search-input";
        input.type = "search";
        input.placeholder = "\u641C\u7D22\u4F1A\u8BDD\u540D\u79F0\u6216\u5185\u5BB9\u2026";
        input.value = state.query;
        input.setAttribute("aria-label", "\u641C\u7D22\u4F1A\u8BDD");
        let composing = false;
        input.addEventListener("compositionstart", () => {
          composing = true;
        });
        input.addEventListener("compositionend", (event) => {
          composing = false;
          state.query = event.currentTarget.value;
          const currentEntries = entriesFrom(titleNodes());
          scheduleContentSearch(currentEntries);
          renderToolbar(currentEntries, "compositionend");
        });
        input.addEventListener("input", (event) => {
          state.query = event.currentTarget.value;
          if (!composing && !event.isComposing) {
            const currentEntries = entriesFrom(titleNodes());
            scheduleContentSearch(currentEntries);
            renderToolbar(currentEntries, "query");
          }
        });
        search.append(searchIcon, input);
        const sortOptions = [["sidebar", "\u9ED8\u8BA4"], ["time", "\u65E5\u671F\u2193"], ["tag", "\u6807\u7B7E"], ["title", "\u6807\u9898"]];
        const sortControl = document.createElement("div");
        sortControl.className = "codex-sidebar-sort-control";
        const sortTrigger = button("codex-sidebar-sort-trigger", "");
        sortTrigger.setAttribute("aria-label", "\u4F1A\u8BDD\u6392\u5E8F");
        sortTrigger.setAttribute("aria-haspopup", "listbox");
        sortTrigger.setAttribute("aria-expanded", String(state.sortOpen));
        sortTrigger.setAttribute("aria-controls", "codex-sidebar-sort-menu");
        const sortLabel = document.createElement("span");
        sortLabel.className = "codex-sidebar-sort-label";
        sortLabel.textContent = "\u6392\u5E8F";
        const sortValue = document.createElement("span");
        sortValue.className = "codex-sidebar-sort-value";
        sortValue.textContent = sortOptions.find(([value]) => value === state.sort)?.[1] ?? "\u9ED8\u8BA4";
        const sortChevron = document.createElement("span");
        sortChevron.className = "codex-sidebar-sort-chevron";
        sortTrigger.append(sortLabel, sortValue, sortChevron);
        const focusSort = (selector = ".codex-sidebar-sort-trigger") => requestAnimationFrame(() => document.querySelector(selector)?.focus({ preventScroll: true }));
        sortTrigger.addEventListener("click", () => {
          state.sortOpen = !state.sortOpen;
          renderToolbar(entriesFrom(titleNodes()), "sort-toggle");
          focusSort(state.sortOpen ? ".codex-sidebar-sort-option[aria-selected='true']" : void 0);
        });
        sortTrigger.addEventListener("keydown", (event) => {
          if (!["ArrowDown", "ArrowUp", "Escape"].includes(event.key)) return;
          event.preventDefault();
          event.stopPropagation();
          if (event.key === "Escape") state.sortOpen = false;
          else state.sortOpen = true;
          renderToolbar(entriesFrom(titleNodes()), "sort-keyboard");
          focusSort(event.key === "Escape" ? void 0 : event.key === "ArrowUp" ? ".codex-sidebar-sort-option:last-child" : ".codex-sidebar-sort-option[aria-selected='true']");
        });
        sortControl.appendChild(sortTrigger);
        if (state.sortOpen) {
          const sortMenu = document.createElement("div");
          sortMenu.id = "codex-sidebar-sort-menu";
          sortMenu.className = "codex-sidebar-sort-menu";
          sortMenu.setAttribute("role", "listbox");
          sortOptions.forEach(([value, label], index) => {
            const option = button("codex-sidebar-sort-option", "");
            option.dataset.value = value;
            option.setAttribute("role", "option");
            option.setAttribute("aria-selected", String(state.sort === value));
            const optionLabel = document.createElement("span");
            optionLabel.textContent = label;
            const check = document.createElement("span");
            check.className = "codex-sidebar-sort-check";
            check.textContent = state.sort === value ? "\u2713" : "";
            option.append(optionLabel, check);
            option.addEventListener("click", () => {
              state.sort = value;
              state.sortOpen = false;
              trace("sort-change", { value: state.sort });
              renderToolbar(entriesFrom(titleNodes()), "sort");
              focusSort();
            });
            option.addEventListener("keydown", (event) => {
              const options = [...sortMenu.querySelectorAll(".codex-sidebar-sort-option")];
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                state.sortOpen = false;
                renderToolbar(entriesFrom(titleNodes()), "sort-escape");
                focusSort();
              } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
                event.preventDefault();
                const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
                options[nextIndex]?.focus({ preventScroll: true });
              }
            });
            sortMenu.appendChild(option);
          });
          sortControl.appendChild(sortMenu);
        }
        controls.append(search, sortControl);
        const counts = /* @__PURE__ */ new Map();
        entries.forEach((item) => counts.set(item.tag, (counts.get(item.tag) ?? 0) + 1));
        const rail = document.createElement("div");
        rail.className = "codex-sidebar-filter-rail";
        rail.setAttribute("role", "group");
        rail.setAttribute("aria-label", "\u6309\u6807\u7B7E\u7B5B\u9009");
        [["all", "\u5168\u90E8", entries.length], ...Array.from(counts, ([tag, count]) => [tag, tag, count])].sort((a2, b2) => a2[0] === "all" ? -1 : b2[0] === "all" ? 1 : a2[1].localeCompare(b2[1], "zh-CN")).forEach(([value, label, count]) => {
          const chip = button("codex-sidebar-filter-chip", label);
          chip.setAttribute("aria-pressed", String(state.tag === value));
          chip.title = `${label} \xB7 ${count} \u4E2A\u4F1A\u8BDD`;
          const badge = document.createElement("span");
          badge.className = "codex-sidebar-filter-count";
          badge.textContent = String(count);
          if (value === "all" || state.tag === value) chip.appendChild(badge);
          chip.addEventListener("click", () => {
            state.tag = state.tag === value && value !== "all" ? "all" : value;
            trace("tag-click", { value, selected: state.tag });
            renderToolbar(entriesFrom(titleNodes()), "tag");
          });
          rail.appendChild(chip);
        });
        const results = selectVisibleEntries(entries, state, contentMatches);
        const panel = document.createElement("div");
        panel.className = "codex-sidebar-results";
        const panelHead = document.createElement("div");
        panelHead.className = "codex-sidebar-results-head";
        const summary = document.createElement("span");
        summary.setAttribute("aria-live", "polite");
        summary.textContent = searchLoading ? `${results.length} / ${entries.length} \u4E2A\u4F1A\u8BDD \xB7 \u6B63\u5728\u641C\u7D22\u6B63\u6587\u2026` : searchError ? `${results.length} / ${entries.length} \u4E2A\u4F1A\u8BDD \xB7 ${searchError}` : `${results.length} / ${entries.length} \u4E2A\u4F1A\u8BDD${state.query ? " \xB7 \u540D\u79F0\u4E0E\u6B63\u6587" : ""}`;
        panelHead.appendChild(summary);
        const list = document.createElement("div");
        list.className = "codex-sidebar-results-list";
        list.setAttribute("role", "list");
        renderResultsList(list, { entries: results, query: state.query, sort: state.sort, onOpen: (entry2) => {
          void openEntry(entry2);
        } });
        panel.append(panelHead, list);
        body.append(controls, rail, panel);
      } else {
        const configured = new Set(tagDefinitions.map(({ name }) => name.toLocaleLowerCase()));
        const detected = [...new Set(entries.filter((item) => item.tagged && !configured.has(item.tag.toLocaleLowerCase())).map((item) => item.tag))];
        const note = document.createElement("p");
        note.className = "codex-sidebar-tag-settings-note";
        note.textContent = "\u65B0\u589E\u6807\u7B7E\u4F1A\u7ACB\u5373\u83B7\u5F97\u914D\u8272\uFF1B\u5220\u9664\u53EA\u79FB\u9664\u914D\u8272\u5B9A\u4E49\uFF0C\u4E0D\u4F1A\u4FEE\u6539\u5DF2\u6709\u4F1A\u8BDD\u6807\u9898\u3002" + (detected.length ? ` \u5F53\u524D\u672A\u914D\u7F6E\uFF1A${detected.join("\u3001")}` : "");
        const form = document.createElement("form");
        form.className = "codex-sidebar-tag-form";
        const tagInput = document.createElement("input");
        tagInput.className = "codex-sidebar-tag-input";
        tagInput.placeholder = "\u65B0\u6807\u7B7E\uFF0C\u4F8B\u5982 Review";
        tagInput.maxLength = 20;
        tagInput.setAttribute("aria-label", "\u65B0\u6807\u7B7E\u540D\u79F0");
        const toneSelect = document.createElement("select");
        toneSelect.className = "codex-sidebar-tag-tone";
        toneSelect.setAttribute("aria-label", "\u6807\u7B7E\u989C\u8272");
        [["neutral", "\u4E2D\u6027"], ["blue", "\u84DD\u8272"], ["purple", "\u7D2B\u8272"], ["red", "\u7EA2\u8272"], ["amber", "\u7425\u73C0"], ["green", "\u7EFF\u8272"]].forEach(([value, label]) => {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = label;
          toneSelect.appendChild(option);
        });
        const add = button("codex-sidebar-tag-add", "\u6DFB\u52A0\u6807\u7B7E");
        add.type = "submit";
        form.append(tagInput, toneSelect, add);
        const error = document.createElement("div");
        error.className = "codex-sidebar-tag-error";
        error.textContent = state.tagError;
        form.addEventListener("submit", (event) => {
          event.preventDefault();
          const name = tagInput.value.trim();
          if (!name || /[\[\]【】]/u.test(name)) state.tagError = "\u8BF7\u8F93\u5165 1\u201320 \u4E2A\u5B57\u7B26\uFF0C\u4E14\u4E0D\u8981\u5305\u542B\u62EC\u53F7";
          else if (tagDefinitions.some((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) state.tagError = "\u8FD9\u4E2A\u6807\u7B7E\u5DF2\u7ECF\u5B58\u5728";
          else {
            tagDefinitions = [...tagDefinitions, { name, tone: toneSelect.value }];
            state.tagError = "";
            syncTagDefinitions();
          }
          renderToolbar(entriesFrom(titleNodes()), "tag-config-add");
        });
        const configList = document.createElement("div");
        configList.className = "codex-sidebar-tag-config-list";
        tagDefinitions.slice().sort((a2, b2) => a2.name.localeCompare(b2.name, "zh-CN")).forEach((definition) => {
          const row = document.createElement("div");
          row.className = "codex-sidebar-tag-config-row";
          const name = document.createElement("span");
          name.className = "codex-sidebar-result-tag";
          name.dataset.tone = definition.tone;
          name.textContent = definition.name;
          const tone = document.createElement("span");
          tone.className = "codex-sidebar-tag-config-tone";
          tone.textContent = { neutral: "\u4E2D\u6027", blue: "\u84DD\u8272", purple: "\u7D2B\u8272", red: "\u7EA2\u8272", amber: "\u7425\u73C0", green: "\u7EFF\u8272" }[definition.tone] ?? definition.tone;
          const remove = button("codex-sidebar-tag-delete", "\xD7");
          remove.title = `\u5220\u9664 ${definition.name} \u914D\u8272`;
          remove.setAttribute("aria-label", `\u5220\u9664 ${definition.name} \u914D\u8272`);
          remove.addEventListener("click", () => {
            tagDefinitions = tagDefinitions.filter((item) => item.name.toLocaleLowerCase() !== definition.name.toLocaleLowerCase());
            syncTagDefinitions();
            renderToolbar(entriesFrom(titleNodes()), "tag-config-delete");
          });
          row.append(name, tone, remove);
          configList.appendChild(row);
        });
        body.append(note, form, error, configList);
      }
      dialog.append(header, body);
      overlay.appendChild(dialog);
      overlay.addEventListener("pointerdown", (event) => {
        if (event.target !== overlay) return;
        state.open = false;
        state.sortOpen = false;
        renderToolbar(entriesFrom(titleNodes()), "backdrop");
      });
      dialog.addEventListener("pointerdown", (event) => {
        if (!state.sortOpen || event.target.closest(".codex-sidebar-sort-control")) return;
        state.sortOpen = false;
        dialog.querySelector(".codex-sidebar-sort-menu")?.remove();
        const trigger = dialog.querySelector(".codex-sidebar-sort-trigger");
        trigger?.setAttribute("aria-expanded", "false");
      }, true);
      dialog.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          state.open = false;
          state.sortOpen = false;
          renderToolbar(entriesFrom(titleNodes()), "escape");
          return;
        }
        if (event.key !== "Tab") return;
        const focusable = [...dialog.querySelectorAll("button, input, select")].filter((item) => !item.disabled);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      });
      modal = overlay;
      document.body.appendChild(overlay);
      const restoredInput = activeInputClass ? dialog.querySelector(`.${activeInputClass}`) : null;
      if (restoredInput) {
        restoredInput.focus({ preventScroll: true });
        if (selectionStart !== null) restoredInput.setSelectionRange(selectionStart, selectionStart);
      } else {
        requestAnimationFrame(() => dialog.querySelector(state.view === "sessions" ? ".codex-sidebar-search-input" : ".codex-sidebar-tag-input")?.focus({ preventScroll: true }));
      }
    };
    const hasInteractionFocus = () => Boolean(host?.matches(":focus-within") || modal?.matches(":focus-within"));
    const refresh = (reason = "observer") => {
      const nodes = titleNodes();
      nodes.forEach(enhanceNode);
      const entries = entriesFrom(nodes);
      if (host?.isConnected && renderedIndexSignature === indexSignature(entries)) return;
      if (pointerActive || hasInteractionFocus()) {
        pendingToolbarRefresh = true;
        trace("render-deferred", { reason, pointerActive, focusWithin: hasInteractionFocus() });
        return;
      }
      renderToolbar(entries, reason);
    };
    const flushDeferredRefresh = () => {
      if (!pendingToolbarRefresh || pointerActive || hasInteractionFocus()) return;
      refresh("interaction-end");
    };
    const trackPointerDown = (event) => {
      if (!host?.contains(event.target) && !modal?.contains(event.target)) return;
      pointerActive = true;
      trace("pointerdown", { control: event.target.closest("button,select,input")?.className ?? "toolbar" });
    };
    const trackPointerEnd = () => {
      if (!pointerActive) return;
      setTimeout(() => {
        pointerActive = false;
        trace("pointerend");
        flushDeferredRefresh();
      }, 0);
    };
    const trackFocusOut = (event) => {
      if (!host?.contains(event.target) && !modal?.contains(event.target)) return;
      setTimeout(flushDeferredRefresh, 0);
    };
    document.addEventListener("pointerdown", trackPointerDown, true);
    document.addEventListener("pointerup", trackPointerEnd, true);
    document.addEventListener("pointercancel", trackPointerEnd, true);
    document.addEventListener("focusout", trackFocusOut, true);
    const isRelevantMutation = (mutation) => {
      const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
      if (!target || host?.contains(target) || modal?.contains(target)) return false;
      if (target.closest(codexSelectors.threadTitle)) return true;
      return [...mutation.addedNodes, ...mutation.removedNodes].some(mutationContainsSidebarNode);
    };
    const observer = new MutationObserver((mutations) => {
      if (!mutations.some(isRelevantMutation)) return;
      if (queued) return;
      observerRefreshCount += 1;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        refresh("observer");
      });
    });
    observer.observe(document.body ?? document.documentElement, { childList: true, subtree: true, characterData: true });
    refresh("install");
    const runtime = {
      version,
      tagDefinitions: () => tagDefinitions.map(({ name, tone }) => ({ name, tone })),
      contentThreadIds: () => Array.from(entryCache.values(), (entry) => entry.threadId).filter(Boolean),
      debugIndex: () => Array.from(entryCache.values(), ({ key, threadId, title, projectId, pinned }) => ({ key, threadId, title, projectId, pinned })),
      setSearchResult: (result) => {
        if (!result || result.type !== "searchResult" || result.requestId !== activeSearchRequestId || result.query !== state.query.trim()) return false;
        contentMatches.clear();
        if (Array.isArray(result.items)) {
          result.items.forEach((item) => {
            if (typeof item?.threadId === "string" && typeof item?.snippet === "string") contentMatches.set(item.threadId, item);
          });
        }
        searchLoading = false;
        searchError = typeof result.error === "string" ? result.error : "";
        if (result.indexStatus && typeof result.indexStatus === "object") searchIndexStatus = result.indexStatus;
        trace("search-result", { requestId: result.requestId, results: contentMatches.size, error: searchError || null });
        if (state.open) renderToolbar(entriesFrom(titleNodes()), "search-result");
        return true;
      },
      status: () => ({
        version,
        enhanced: document.querySelectorAll(`[${ENHANCED}]`).length,
        indexed: entryCache.size,
        searchLoading,
        searchResults: contentMatches.size,
        searchIndexStatus,
        toolbar: Boolean(document.getElementById(TOOLBAR_ID)),
        visibleResults: modal?.querySelectorAll(".codex-sidebar-result").length ?? 0,
        renderCount,
        observerRefreshCount
      }),
      debug: () => debugEvents.slice(),
      dispose: () => {
        clearPendingSearch();
        observer.disconnect();
        document.removeEventListener("pointerdown", trackPointerDown, true);
        document.removeEventListener("pointerup", trackPointerEnd, true);
        document.removeEventListener("pointercancel", trackPointerEnd, true);
        document.removeEventListener("focusout", trackFocusOut, true);
        document.querySelectorAll(`[${ENHANCED}]`).forEach(restoreNode);
        modal?.remove();
        modal = null;
        document.getElementById(TOOLBAR_ID)?.remove();
        document.getElementById(STYLE_ID)?.remove();
        try {
          localStorage.removeItem(CACHE_KEY);
        } catch {
        }
        if (window.__codexSidebarTags === runtime) delete window.__codexSidebarTags;
        return true;
      }
    };
    window.__codexSidebarTags = runtime;
    return runtime.status();
  }
  return __toCommonJS(entry_exports);
})();
