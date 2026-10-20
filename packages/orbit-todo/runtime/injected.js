"use strict";
var CodexPlugin = (() => {
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

  // src/injected/entry.tsx
  var entry_exports = {};
  __export(entry_exports, {
    activate: () => activate
  });

  // ../../node_modules/preact/dist/preact.module.js
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
  function m(n2, l3) {
    for (var u4 in l3) n2[u4] = l3[u4];
    return n2;
  }
  function b(n2) {
    n2 && n2.parentNode && n2.parentNode.removeChild(n2);
  }
  function k(l3, u4, t3) {
    var i3, r3, o3, e3 = {};
    for (o3 in u4) "key" == o3 ? i3 = u4[o3] : "ref" == o3 ? r3 = u4[o3] : e3[o3] = u4[o3];
    if (arguments.length > 2 && (e3.children = arguments.length > 3 ? n.call(arguments, 2) : t3), "function" == typeof l3 && null != l3.defaultProps) for (o3 in l3.defaultProps) void 0 === e3[o3] && (e3[o3] = l3.defaultProps[o3]);
    return x(l3, e3, i3, r3, null);
  }
  function x(n2, t3, i3, r3, o3) {
    var e3 = { type: n2, props: t3, key: i3, ref: r3, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: null == o3 ? ++u : o3, __i: -1, __u: 0 };
    return null == o3 && null != l.vnode && l.vnode(e3), e3;
  }
  function S(n2) {
    return n2.children;
  }
  function C(n2, l3) {
    this.props = n2, this.context = l3;
  }
  function $(n2, l3) {
    if (null == l3) return n2.__ ? $(n2.__, n2.__i + 1) : null;
    for (var u4; l3 < n2.__k.length; l3++) if (null != (u4 = n2.__k[l3]) && null != u4.__e) return u4.__e;
    return "function" == typeof n2.type ? $(n2) : null;
  }
  function I(n2) {
    if (n2.__P && n2.__d) {
      var u4 = n2.__v, t3 = u4.__e, i3 = [], r3 = [], o3 = m({}, u4);
      o3.__v = u4.__v + 1, l.vnode && l.vnode(o3), q(n2.__P, o3, u4, n2.__n, n2.__P.namespaceURI, 32 & u4.__u ? [t3] : null, i3, null == t3 ? $(u4) : t3, !!(32 & u4.__u), r3), o3.__v = u4.__v, o3.__.__k[o3.__i] = o3, D(i3, o3, r3), u4.__e = u4.__ = null, o3.__e != t3 && P(o3);
    }
  }
  function P(n2) {
    if (null != (n2 = n2.__) && null != n2.__c) return n2.__e = n2.__c.base = null, n2.__k.some(function(l3) {
      if (null != l3 && null != l3.__e) return n2.__e = n2.__c.base = l3.__e;
    }), P(n2);
  }
  function A(n2) {
    (!n2.__d && (n2.__d = true) && i.push(n2) && !H.__r++ || r != l.debounceRendering) && ((r = l.debounceRendering) || o)(H);
  }
  function H() {
    try {
      for (var n2, l3 = 1; i.length; ) i.length > l3 && i.sort(e), n2 = i.shift(), l3 = i.length, I(n2);
    } finally {
      i.length = H.__r = 0;
    }
  }
  function L(n2, l3, u4, t3, i3, r3, o3, e3, f4, c3, a3) {
    var s3, h3, p3, v3, y3, _3, g4 = t3 && t3.__k || w, m3 = l3.length;
    for (f4 = T(u4, l3, g4, f4, m3), s3 = 0; s3 < m3; s3++) null != (p3 = u4.__k[s3]) && (h3 = -1 != p3.__i && g4[p3.__i] || d, p3.__i = s3, _3 = q(n2, p3, h3, i3, r3, o3, e3, f4, c3, a3), v3 = p3.__e, p3.ref && h3.ref != p3.ref && (h3.ref && J(h3.ref, null, p3), a3.push(p3.ref, p3.__c || v3, p3)), null == y3 && null != v3 && (y3 = v3), 4 & p3.__u ? (f4 = j(p3, f4, n2), h3.__e && (h3.__e = null)) : "function" == typeof p3.type && void 0 !== _3 ? f4 = _3 : v3 && (f4 = v3.nextSibling), p3.__u &= -7);
    return u4.__e = y3, f4;
  }
  function T(n2, l3, u4, t3, i3) {
    var r3, o3, e3, f4, c3, a3 = u4.length, s3 = a3, h3 = 0;
    for (n2.__k = new Array(i3), r3 = 0; r3 < i3; r3++) null != (o3 = l3[r3]) && "boolean" != typeof o3 && "function" != typeof o3 ? ("string" == typeof o3 || "number" == typeof o3 || "bigint" == typeof o3 || o3.constructor == String ? o3 = n2.__k[r3] = x(null, o3, null, null, null) : g(o3) ? o3 = n2.__k[r3] = x(S, { children: o3 }, null, null, null) : void 0 === o3.constructor && o3.__b > 0 ? o3 = n2.__k[r3] = x(o3.type, o3.props, o3.key, o3.ref ? o3.ref : null, o3.__v) : n2.__k[r3] = o3, f4 = r3 + h3, o3.__ = n2, o3.__b = n2.__b + 1, e3 = null, -1 != (c3 = o3.__i = O(o3, u4, f4, s3)) && (s3--, (e3 = u4[c3]) && (e3.__u |= 2)), null == e3 || null == e3.__v ? (-1 == c3 && (i3 > a3 ? h3-- : i3 < a3 && h3++), "function" != typeof o3.type && (o3.__u |= 4)) : c3 != f4 && (c3 == f4 - 1 ? h3-- : c3 == f4 + 1 ? h3++ : (c3 > f4 ? h3-- : h3++, o3.__u |= 4))) : n2.__k[r3] = null;
    if (s3) for (r3 = 0; r3 < a3; r3++) null != (e3 = u4[r3]) && 0 == (2 & e3.__u) && (e3.__e == t3 && (t3 = $(e3)), K(e3, e3));
    return t3;
  }
  function j(n2, l3, u4) {
    var t3, i3;
    if ("function" == typeof n2.type) {
      for (t3 = n2.__k, i3 = 0; t3 && i3 < t3.length; i3++) t3[i3] && (t3[i3].__ = n2, l3 = j(t3[i3], l3, u4));
      return l3;
    }
    n2.__e != l3 && (l3 && n2.type && !l3.parentNode && (l3 = $(n2)), l3 = u4.insertBefore(n2.__e, l3 || null));
    do {
      l3 = l3 && l3.nextSibling;
    } while (null != l3 && 8 == l3.nodeType);
    return l3;
  }
  function F(n2, l3) {
    return l3 = l3 || [], null == n2 || "boolean" == typeof n2 || (g(n2) ? n2.some(function(n3) {
      F(n3, l3);
    }) : l3.push(n2)), l3;
  }
  function O(n2, l3, u4, t3) {
    var i3, r3, o3, e3 = n2.key, f4 = n2.type, c3 = l3[u4], a3 = null != c3 && 0 == (2 & c3.__u);
    if (null === c3 && null == e3 || a3 && e3 == c3.key && f4 == c3.type) return u4;
    if (t3 > (a3 ? 1 : 0)) {
      for (i3 = u4 - 1, r3 = u4 + 1; i3 >= 0 || r3 < l3.length; ) if (null != (c3 = l3[o3 = i3 >= 0 ? i3-- : r3++]) && 0 == (2 & c3.__u) && e3 == c3.key && f4 == c3.type) return o3;
    }
    return -1;
  }
  function z(n2, l3, u4) {
    "-" == l3[0] ? n2.setProperty(l3, null == u4 ? "" : u4) : n2[l3] = null == u4 ? "" : "number" != typeof u4 || _.test(l3) ? u4 : u4 + "px";
  }
  function N(n2, l3, u4, t3, i3) {
    var r3, o3;
    n: if ("style" == l3) if ("string" == typeof u4) n2.style.cssText = u4;
    else {
      if ("string" == typeof t3 && (n2.style.cssText = t3 = ""), t3) for (l3 in t3) u4 && l3 in u4 || z(n2.style, l3, "");
      if (u4) for (l3 in u4) t3 && u4[l3] == t3[l3] || z(n2.style, l3, u4[l3]);
    }
    else if ("o" == l3[0] && "n" == l3[1]) r3 = l3 != (l3 = l3.replace(s, "$1")), o3 = l3.toLowerCase(), l3 = o3 in n2 || "onFocusOut" == l3 || "onFocusIn" == l3 ? o3.slice(2) : l3.slice(2), n2.l || (n2.l = {}), n2.l[l3 + r3] = u4, u4 ? t3 ? u4[a] = t3[a] : (u4[a] = h, n2.addEventListener(l3, r3 ? v : p, r3)) : n2.removeEventListener(l3, r3 ? v : p, r3);
    else {
      if ("http://www.w3.org/2000/svg" == i3) l3 = l3.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
      else if ("width" != l3 && "height" != l3 && "href" != l3 && "list" != l3 && "form" != l3 && "tabIndex" != l3 && "download" != l3 && "rowSpan" != l3 && "colSpan" != l3 && "role" != l3 && "popover" != l3 && l3 in n2) try {
        n2[l3] = null == u4 ? "" : u4;
        break n;
      } catch (n3) {
      }
      "function" == typeof u4 || (null == u4 || false === u4 && "-" != l3[4] ? n2.removeAttribute(l3) : n2.setAttribute(l3, "popover" == l3 && 1 == u4 ? "" : u4));
    }
  }
  function V(n2) {
    return function(u4) {
      if (this.l) {
        var t3 = this.l[u4.type + n2];
        if (null == u4[c]) u4[c] = h++;
        else if (u4[c] < t3[a]) return;
        return t3(l.event ? l.event(u4) : u4);
      }
    };
  }
  function q(n2, u4, t3, i3, r3, o3, e3, f4, c3, a3) {
    var s3, h3, p3, v3, y3, d3, _3, k3, x3, M3, I2, P4, A4, H3, T4, j4, F3 = u4.type;
    if (void 0 !== u4.constructor) return null;
    128 & t3.__u && (c3 = !!(32 & t3.__u), o3 = [f4 = u4.__e = t3.__e]), (s3 = l.__b) && s3(u4);
    n: if ("function" == typeof F3) {
      h3 = e3.length;
      try {
        if (x3 = u4.props, M3 = F3.prototype && F3.prototype.render, I2 = (s3 = F3.contextType) && i3[s3.__c], P4 = s3 ? I2 ? I2.props.value : s3.__ : i3, t3.__c ? k3 = (p3 = u4.__c = t3.__c).__ = p3.__E : (M3 ? u4.__c = p3 = new F3(x3, P4) : (u4.__c = p3 = new C(x3, P4), p3.constructor = F3, p3.render = Q), I2 && I2.sub(p3), p3.state || (p3.state = {}), p3.__n = i3, v3 = p3.__d = true, p3.__h = [], p3._sb = []), M3 && null == p3.__s && (p3.__s = p3.state), M3 && null != F3.getDerivedStateFromProps && (p3.__s == p3.state && (p3.__s = m({}, p3.__s)), m(p3.__s, F3.getDerivedStateFromProps(x3, p3.__s))), y3 = p3.props, d3 = p3.state, p3.__v = u4, v3) M3 && null == F3.getDerivedStateFromProps && null != p3.componentWillMount && p3.componentWillMount(), M3 && null != p3.componentDidMount && p3.__h.push(p3.componentDidMount);
        else {
          if (M3 && null == F3.getDerivedStateFromProps && x3 !== y3 && null != p3.componentWillReceiveProps && p3.componentWillReceiveProps(x3, P4), u4.__v == t3.__v || !p3.__e && null != p3.shouldComponentUpdate && false === p3.shouldComponentUpdate(x3, p3.__s, P4)) {
            u4.__v != t3.__v && (p3.props = x3, p3.state = p3.__s, p3.__d = false), u4.__e = t3.__e, u4.__k = t3.__k, u4.__k.some(function(n3) {
              n3 && (n3.__ = u4);
            }), w.push.apply(p3.__h, p3._sb), p3._sb = [], p3.__h.length && e3.push(p3), f4 = $(t3);
            break n;
          }
          null != p3.componentWillUpdate && p3.componentWillUpdate(x3, p3.__s, P4), M3 && null != p3.componentDidUpdate && p3.__h.push(function() {
            p3.componentDidUpdate(y3, d3, _3);
          });
        }
        if (p3.context = P4, p3.props = x3, p3.__P = n2, p3.__e = false, A4 = l.__r, H3 = 0, M3) p3.state = p3.__s, p3.__d = false, A4 && A4(u4), s3 = p3.render(p3.props, p3.state, p3.context), w.push.apply(p3.__h, p3._sb), p3._sb = [];
        else do {
          p3.__d = false, A4 && A4(u4), s3 = p3.render(p3.props, p3.state, p3.context), p3.state = p3.__s;
        } while (p3.__d && ++H3 < 25);
        p3.state = p3.__s, null != p3.getChildContext && (i3 = m(m({}, i3), p3.getChildContext())), M3 && !v3 && null != p3.getSnapshotBeforeUpdate && (_3 = p3.getSnapshotBeforeUpdate(y3, d3)), T4 = null != s3 && s3.type === S && null == s3.key ? E(s3.props.children) : s3, f4 = L(n2, g(T4) ? T4 : [T4], u4, t3, i3, r3, o3, e3, f4, c3, a3), p3.base = u4.__e, u4.__u &= -161, p3.__h.length && e3.push(p3), k3 && (p3.__E = p3.__ = null);
      } catch (n3) {
        if (e3.length = h3, u4.__v = null, c3 || null != o3) {
          if (n3.then) {
            for (u4.__u |= c3 ? 160 : 128; f4 && 8 == f4.nodeType && f4.nextSibling; ) f4 = f4.nextSibling;
            null != o3 && (o3[o3.indexOf(f4)] = null), u4.__e = f4;
          } else if (null != o3) for (j4 = o3.length; j4--; ) b(o3[j4]);
        } else u4.__e = t3.__e;
        null == u4.__k && (u4.__k = t3.__k || []), n3.then || B(u4), l.__e(n3, u4, t3);
      }
    } else null == o3 && u4.__v == t3.__v ? (u4.__k = t3.__k, u4.__e = t3.__e) : f4 = u4.__e = G(t3.__e, u4, t3, i3, r3, o3, e3, c3, a3);
    return (s3 = l.diffed) && s3(u4), 128 & u4.__u ? void 0 : f4;
  }
  function B(n2) {
    n2 && (n2.__c && (n2.__c.__e = true), n2.__k && n2.__k.some(B));
  }
  function D(n2, u4, t3) {
    for (var i3 = 0; i3 < t3.length; i3++) J(t3[i3], t3[++i3], t3[++i3]);
    l.__c && l.__c(u4, n2), n2.some(function(u5) {
      try {
        n2 = u5.__h, u5.__h = [], n2.some(function(n3) {
          n3.call(u5);
        });
      } catch (n3) {
        l.__e(n3, u5.__v);
      }
    });
  }
  function E(n2) {
    return "object" != typeof n2 || null == n2 || n2.__b > 0 ? n2 : g(n2) ? n2.map(E) : void 0 !== n2.constructor ? null : m({}, n2);
  }
  function G(u4, t3, i3, r3, o3, e3, f4, c3, a3) {
    var s3, h3, p3, v3, y3, w3, _3, m3 = i3.props || d, k3 = t3.props, x3 = t3.type;
    if ("svg" == x3 ? o3 = "http://www.w3.org/2000/svg" : "math" == x3 ? o3 = "http://www.w3.org/1998/Math/MathML" : o3 || (o3 = "http://www.w3.org/1999/xhtml"), null != e3) {
      for (s3 = 0; s3 < e3.length; s3++) if ((y3 = e3[s3]) && "setAttribute" in y3 == !!x3 && (x3 ? y3.localName == x3 : 3 == y3.nodeType)) {
        u4 = y3, e3[s3] = null;
        break;
      }
    }
    if (null == u4) {
      if (null == x3) return document.createTextNode(k3);
      u4 = document.createElementNS(o3, x3, k3.is && k3), c3 && (l.__m && l.__m(t3, e3), c3 = false), e3 = null;
    }
    if (null == x3) m3 === k3 || c3 && u4.data == k3 || (u4.data = k3);
    else {
      if (e3 = "textarea" == x3 && null != k3.defaultValue ? null : e3 && n.call(u4.childNodes), !c3 && null != e3) for (m3 = {}, s3 = 0; s3 < u4.attributes.length; s3++) m3[(y3 = u4.attributes[s3]).name] = y3.value;
      for (s3 in m3) y3 = m3[s3], "dangerouslySetInnerHTML" == s3 ? p3 = y3 : "children" == s3 || s3 in k3 || "value" == s3 && "defaultValue" in k3 || "checked" == s3 && "defaultChecked" in k3 || N(u4, s3, null, y3, o3);
      for (s3 in k3) y3 = k3[s3], "children" == s3 ? v3 = y3 : "dangerouslySetInnerHTML" == s3 ? h3 = y3 : "value" == s3 ? w3 = y3 : "checked" == s3 ? _3 = y3 : c3 && "function" != typeof y3 || m3[s3] === y3 || N(u4, s3, y3, m3[s3], o3);
      if (h3) c3 || p3 && (h3.__html == p3.__html || h3.__html == u4.innerHTML) || (u4.innerHTML = h3.__html), t3.__k = [];
      else if (p3 && (u4.innerHTML = ""), L("template" == t3.type ? u4.content : u4, g(v3) ? v3 : [v3], t3, i3, r3, "foreignObject" == x3 ? "http://www.w3.org/1999/xhtml" : o3, e3, f4, e3 ? e3[0] : i3.__k && $(i3, 0), c3, a3), null != e3) for (s3 = e3.length; s3--; ) b(e3[s3]);
      c3 && "textarea" != x3 || (s3 = "value", "progress" == x3 && null == w3 ? u4.removeAttribute("value") : null != w3 && (w3 !== u4[s3] || "progress" == x3 && !w3 || "option" == x3 && w3 != m3[s3]) && N(u4, s3, w3, m3[s3], o3), s3 = "checked", null != _3 && _3 != u4[s3] && N(u4, s3, _3, m3[s3], o3));
    }
    return u4;
  }
  function J(n2, u4, t3) {
    try {
      if ("function" == typeof n2) {
        var i3 = "function" == typeof n2.__u;
        i3 && n2.__u(), i3 && null == u4 || (n2.__u = n2(u4));
      } else n2.current = u4;
    } catch (n3) {
      l.__e(n3, t3);
    }
  }
  function K(n2, u4, t3) {
    var i3, r3;
    if (l.unmount && l.unmount(n2), (i3 = n2.ref) && (i3.current && i3.current != n2.__e || J(i3, null, u4)), null != (i3 = n2.__c)) {
      if (i3.componentWillUnmount) try {
        i3.componentWillUnmount();
      } catch (n3) {
        l.__e(n3, u4);
      }
      i3.base = i3.__P = i3.__n = null;
    }
    if (i3 = n2.__k) for (r3 = 0; r3 < i3.length; r3++) i3[r3] && K(i3[r3], u4, t3 || "function" != typeof n2.type);
    t3 || b(n2.__e), n2.__c = n2.__ = n2.__e = void 0;
  }
  function Q(n2, l3, u4) {
    return this.constructor(n2, u4);
  }
  function R(u4, t3, i3) {
    var r3, o3, e3, f4;
    t3 == document && (t3 = document.documentElement), l.__ && l.__(u4, t3), o3 = (r3 = "function" == typeof i3) ? null : i3 && i3.__k || t3.__k, e3 = [], f4 = [], q(t3, u4 = (!r3 && i3 || t3).__k = k(S, null, [u4]), o3 || d, d, t3.namespaceURI, !r3 && i3 ? [i3] : o3 ? null : t3.firstChild ? n.call(t3.childNodes) : null, e3, !r3 && i3 ? i3 : o3 ? o3.__e : t3.firstChild, r3, f4), D(e3, u4, f4), u4.props.children = null;
  }
  n = w.slice, l = { __e: function(n2, l3, u4, t3) {
    for (var i3, r3, o3; l3 = l3.__; ) if ((i3 = l3.__c) && !i3.__) try {
      if ((r3 = i3.constructor) && null != r3.getDerivedStateFromError && (i3.setState(r3.getDerivedStateFromError(n2)), o3 = i3.__d), null != i3.componentDidCatch && (i3.componentDidCatch(n2, t3 || {}), o3 = i3.__d), o3) return i3.__E = i3;
    } catch (l4) {
      n2 = l4;
    }
    throw n2;
  } }, u = 0, t = function(n2) {
    return null != n2 && void 0 === n2.constructor;
  }, C.prototype.setState = function(n2, l3) {
    var u4;
    u4 = null != this.__s && this.__s != this.state ? this.__s : this.__s = m({}, this.state), "function" == typeof n2 && (n2 = n2(m({}, u4), this.props)), n2 && m(u4, n2), null != n2 && this.__v && (l3 && this._sb.push(l3), A(this));
  }, C.prototype.forceUpdate = function(n2) {
    this.__v && (this.__e = true, n2 && this.__h.push(n2), A(this));
  }, C.prototype.render = S, i = [], o = "function" == typeof Promise ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, e = function(n2, l3) {
    return n2.__v.__b - l3.__v.__b;
  }, H.__r = 0, f = Math.random().toString(8), c = "__d" + f, a = "__a" + f, s = /(PointerCapture)$|Capture$/i, h = 0, p = V(false), v = V(true), y = 0;

  // ../orbit/dist/ui/tooltip.js
  var tooltipStyles = `
  position: fixed; z-index: 10000; width: max-content; max-width: min(20rem, calc(100vw - 16px));
  padding: var(--tooltip-padding-block, 5px) var(--tooltip-padding-inline, 12px);
  border: 1px solid var(--tooltip-border-color, var(--color-border-tooltip, #8883));
  border-radius: var(--tooltip-border-radius, 16px); corner-shape: var(--tooltip-corner-shape, round);
  background: var(--tooltip-background-color, var(--color-background-tooltip, Canvas));
  color: var(--tooltip-text-color, var(--color-text-tooltip, CanvasText));
  box-shadow: var(--tooltip-box-shadow, var(--shadow-tooltip, 0 8px 18px #0f172a33));
  font-size: var(--tooltip-font-size, 13px); font-weight: var(--tooltip-font-weight, 400);
  line-height: var(--tooltip-line-height, 18px); letter-spacing: var(--tooltip-letter-spacing, -.15px);
  zoom: var(--codex-window-zoom, 1); overflow-wrap: break-word; text-align: center; pointer-events: none; user-select: none;
`;
  function mountTooltip(trigger, options) {
    const doc = trigger.ownerDocument;
    const view = doc.defaultView;
    if (!view)
      throw new Error("Tooltips require a browser document");
    const events = new view.AbortController();
    const id = options.id ?? `orbit-tooltip-${view.crypto.randomUUID()}`;
    let timer = null;
    let tooltip = null;
    const hide = () => {
      if (timer !== null)
        view.clearTimeout(timer);
      timer = null;
      tooltip?.remove();
      tooltip = null;
      const describedBy = trigger.getAttribute("aria-describedby")?.split(/\s+/).filter((value) => value !== id).join(" ");
      if (describedBy)
        trigger.setAttribute("aria-describedby", describedBy);
      else
        trigger.removeAttribute("aria-describedby");
    };
    const show = () => {
      hide();
      if (!trigger.isConnected || trigger.getAttribute("aria-expanded") === "true")
        return;
      tooltip = doc.createElement("div");
      tooltip.id = id;
      tooltip.className = "orbit-ui-tooltip";
      tooltip.setAttribute("role", "tooltip");
      tooltip.textContent = options.label;
      tooltip.style.cssText = tooltipStyles;
      doc.body.appendChild(tooltip);
      trigger.setAttribute("aria-describedby", [trigger.getAttribute("aria-describedby"), id].filter(Boolean).join(" "));
      const anchor = trigger.getBoundingClientRect();
      const zoom = Number.parseFloat(view.getComputedStyle(tooltip).zoom) || 1;
      const offset = options.offset ?? 2;
      const padding = 8;
      tooltip.style.maxWidth = `min(20rem, ${Math.max(0, view.innerWidth - padding * 2) / zoom}px)`;
      const bounds = tooltip.getBoundingClientRect();
      let side = options.side ?? "right";
      if (side === "right" && anchor.right + offset + bounds.width > view.innerWidth - padding)
        side = "left";
      else if (side === "left" && anchor.left - offset - bounds.width < padding)
        side = "right";
      else if (side === "bottom" && anchor.bottom + offset + bounds.height > view.innerHeight - padding)
        side = "top";
      else if (side === "top" && anchor.top - offset - bounds.height < padding)
        side = "bottom";
      const left = side === "right" ? anchor.right + offset : side === "left" ? anchor.left - offset - bounds.width : anchor.left + (anchor.width - bounds.width) / 2;
      const top = side === "bottom" ? anchor.bottom + offset : side === "top" ? anchor.top - offset - bounds.height : anchor.top + (anchor.height - bounds.height) / 2;
      tooltip.style.left = `${Math.max(padding, Math.min(left, view.innerWidth - padding - bounds.width)) / zoom}px`;
      tooltip.style.top = `${Math.max(padding, Math.min(top, view.innerHeight - padding - bounds.height)) / zoom}px`;
      tooltip.dataset.side = side;
    };
    const listenerOptions = { signal: events.signal };
    trigger.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "touch" || event.buttons)
        return;
      hide();
      timer = view.setTimeout(show, options.delay ?? 200);
    }, listenerOptions);
    trigger.addEventListener("pointerleave", hide, listenerOptions);
    trigger.addEventListener("focus", show, listenerOptions);
    trigger.addEventListener("blur", hide, listenerOptions);
    trigger.addEventListener("click", hide, listenerOptions);
    doc.addEventListener("pointerdown", hide, { ...listenerOptions, capture: true });
    doc.addEventListener("keydown", (event) => {
      if (event.key === "Escape")
        hide();
    }, listenerOptions);
    doc.addEventListener("scroll", (event) => {
      if (event.target === doc || event.target instanceof view.Element && event.target.contains(trigger))
        hide();
    }, { ...listenerOptions, capture: true });
    view.addEventListener("resize", hide, listenerOptions);
    view.addEventListener("blur", hide, listenerOptions);
    return () => {
      hide();
      events.abort();
    };
  }

  // ../orbit/dist/ui/sidebar-button.js
  var presentationAttributes = /* @__PURE__ */ new Set([
    "class",
    "style",
    "data-color",
    "data-variant",
    "data-squircle",
    "data-pill",
    "data-uniform",
    "data-size",
    "data-icon-size",
    "data-suppress-active-style"
  ]);
  function createSidebarButton(options) {
    const doc = options.icon.ownerDocument;
    const view = doc.defaultView;
    if (!view)
      throw new Error("Sidebar buttons require a browser document");
    const button = options.template?.cloneNode(true) ?? doc.createElement("button");
    for (const attribute of Array.from(button.attributes)) {
      if (!presentationAttributes.has(attribute.name))
        button.removeAttribute(attribute.name);
    }
    button.type = "button";
    button.id = options.id;
    button.setAttribute("aria-label", options.ariaLabel ?? options.label);
    const icon2 = options.icon.cloneNode(true);
    icon2.setAttribute("aria-hidden", "true");
    icon2.setAttribute("focusable", "false");
    const nativeIcon = button.querySelector("svg");
    if (nativeIcon) {
      for (const name of ["class", "style", "width", "height"]) {
        const value = nativeIcon.getAttribute(name);
        if (value !== null)
          icon2.setAttribute(name, value);
      }
      nativeIcon.replaceWith(icon2);
    } else {
      icon2.setAttribute("width", "20");
      icon2.setAttribute("height", "20");
      button.prepend(icon2);
    }
    const walker = doc.createTreeWalker(button, view.NodeFilter.SHOW_TEXT);
    let labeled = false;
    while (walker.nextNode()) {
      if (icon2.contains(walker.currentNode))
        continue;
      if (!walker.currentNode.textContent?.trim())
        continue;
      walker.currentNode.textContent = labeled ? "" : options.label;
      labeled = true;
    }
    let style = null;
    if (!options.template) {
      button.append(doc.createTextNode(options.label));
      const selector = `#${view.CSS.escape(options.id)}`;
      style = doc.createElement("style");
      style.id = `${options.id}-style`;
      doc.getElementById(style.id)?.remove();
      style.textContent = `
      ${selector} { display: flex; align-items: center; gap: 8px; width: 100%; min-height: 32px; padding: 0 12px;
        border: 0; border-radius: 6px; background: transparent; color: var(--color-text-tertiary, var(--color-token-text-secondary, inherit));
        font: inherit; text-align: left; cursor: pointer; }
      ${selector}:hover { background: var(--color-token-list-hover-background, #8882); color: var(--color-text-foreground, inherit); }
      ${selector}:focus-visible { outline: 2px solid var(--color-border-focus, #4b8cff); outline-offset: -2px; }
    `;
      doc.head.append(style);
    }
    if (options.onClick)
      button.addEventListener("click", options.onClick);
    const disposeTooltip = options.tooltip === false ? () => {
    } : mountTooltip(button, {
      label: options.label,
      ...options.tooltip,
      id: `${options.id}-tooltip`
    });
    return {
      element: button,
      dispose() {
        disposeTooltip();
        if (options.onClick)
          button.removeEventListener("click", options.onClick);
        style?.remove();
        button.remove();
      }
    };
  }

  // ../orbit/dist/ui/select.js
  var styles = `
.orbit-ui-select-trigger { display:inline-flex; align-items:center; justify-content:space-between; gap:10px; min-width:0; min-height:32px; padding:6px 9px; border:1px solid var(--color-border-light, var(--color-token-border-light, #8883)); border-radius:8px; background:var(--color-background-control, var(--color-token-input-background, Canvas)); color:var(--color-text-foreground, var(--color-token-text-primary, CanvasText)); font:inherit; text-align:left; cursor:pointer; }
.orbit-ui-select-trigger > span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.orbit-ui-select-trigger > svg { width:14px; height:14px; flex:none; }
.orbit-ui-select-trigger:disabled { opacity:.5; cursor:default; }
.orbit-ui-select-trigger:focus-visible { outline:2px solid var(--color-border-focus, var(--color-token-focus-border, #4b8cff)); outline-offset:2px; }
.orbit-ui-select-popup { position:fixed; inset:auto; margin:0; z-index:10001; box-sizing:border-box; width:max-content; max-width:calc(100vw - 16px); overflow:auto; overscroll-behavior:contain; padding:4px; border:1px solid var(--color-border-light, var(--color-token-border-light, #8883)); border-radius:10px; background:var(--color-background-elevated-secondary-opaque, var(--color-background-elevated-high, var(--color-token-dropdown-background, Canvas))); color:var(--color-text-foreground, var(--color-token-text-primary, CanvasText)); font:inherit; font-size:13px; line-height:1.5; box-shadow:0 8px 24px #0003, 0 2px 6px #0002; zoom:var(--codex-window-zoom, 1); }
.orbit-ui-select-option { display:flex; align-items:center; gap:10px; box-sizing:border-box; min-height:32px; padding:6px 8px; border-radius:6px; color:inherit; cursor:pointer; }
.orbit-ui-select-option > span { flex:1; min-width:0; overflow-wrap:anywhere; }
.orbit-ui-select-option > svg { width:14px; height:14px; flex:none; visibility:hidden; }
.orbit-ui-select-option[aria-selected="true"] > svg { visibility:visible; }
.orbit-ui-select-option[data-active] { background:var(--color-token-list-hover-background, #8882); }
.orbit-ui-select-option[aria-disabled="true"] { opacity:.45; cursor:default; }
`;
  function icon(doc, path) {
    const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.7");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    const shape = doc.createElementNS(svg.namespaceURI, "path");
    shape.setAttribute("d", path);
    svg.append(shape);
    return svg;
  }
  function mountSelect(trigger, options) {
    const doc = trigger.ownerDocument, view = doc.defaultView;
    if (!view)
      throw new Error("Selects require a browser document");
    if (!trigger.isConnected)
      throw new Error("Select triggers must be connected before mounting");
    const root = trigger.getRootNode();
    const scope = trigger.closest('dialog, [role="dialog"]') ?? (root instanceof view.ShadowRoot ? root : doc.body);
    const sheet = doc.createElement("style");
    sheet.textContent = styles;
    (root instanceof view.ShadowRoot ? root : doc.head).append(sheet);
    const events = new view.AbortController(), listenerOptions = { signal: events.signal };
    const id = `orbit-select-${view.crypto.randomUUID()}`;
    const ownedAttributes = ["role", "type", "aria-haspopup", "aria-expanded", "aria-controls", "aria-activedescendant"];
    const originals = new Map(ownedAttributes.map((name) => [name, trigger.getAttribute(name)]));
    const originalNodes = [...trigger.childNodes], originalValue = trigger.value;
    const label = doc.createElement("span");
    trigger.replaceChildren(label, icon(doc, "m6 9 6 6 6-6"));
    trigger.classList.add("orbit-ui-select-trigger");
    trigger.type = "button";
    trigger.setAttribute("role", "combobox");
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    let state = options, popup = null, active = -1;
    let search = "", lastTyped = 0, disposed = false;
    const disabled = () => trigger.matches(":disabled");
    const close = () => {
      popup?.remove();
      popup = null;
      active = -1;
      search = "";
      trigger.setAttribute("aria-expanded", "false");
      trigger.removeAttribute("aria-activedescendant");
      trigger.removeAttribute("aria-controls");
    };
    const selectActive = (index, scroll = true) => {
      active = index;
      popup?.querySelectorAll('[role="option"]').forEach((element, i3) => element.toggleAttribute("data-active", i3 === index));
      const current = popup?.children[index];
      if (current) {
        trigger.setAttribute("aria-activedescendant", current.id);
        if (scroll)
          current.scrollIntoView({ block: "nearest" });
      } else
        trigger.removeAttribute("aria-activedescendant");
    };
    const enabled = () => state.choices.map((choice, index) => choice.disabled ? -1 : index).filter((index) => index >= 0);
    const position = () => {
      if (!popup)
        return;
      const anchor = trigger.getBoundingClientRect(), currentZoom = Reflect.get(popup, "currentCSSZoom");
      const zoom = typeof currentZoom === "number" && Number.isFinite(currentZoom) && currentZoom > 0 ? currentZoom : Number.parseFloat(view.getComputedStyle(popup).zoom) || 1;
      const padding = 8, gap = 4, below = view.innerHeight - padding - anchor.bottom - gap, above = anchor.top - padding - gap;
      const side = below >= Math.min(280 * zoom, popup.scrollHeight * zoom) || below >= above ? "bottom" : "top";
      popup.style.maxWidth = `${Math.max(0, view.innerWidth - padding * 2) / zoom}px`;
      popup.style.minWidth = `${Math.min(Math.max(120, anchor.width), view.innerWidth - padding * 2) / zoom}px`;
      popup.style.maxHeight = `${Math.max(0, Math.min(280, (side === "bottom" ? below : above) / zoom))}px`;
      const bounds = popup.getBoundingClientRect();
      popup.style.left = `${Math.max(padding, Math.min(anchor.left, view.innerWidth - padding - bounds.width)) / zoom}px`;
      popup.style.top = `${Math.max(padding, side === "bottom" ? anchor.bottom + gap : anchor.top - gap - bounds.height) / zoom}px`;
      popup.dataset.side = side;
    };
    const choose = () => {
      const choice = state.choices[active];
      if (disabled() || !choice || choice.disabled) {
        close();
        return;
      }
      const changed = choice.value !== state.value;
      state = { ...state, value: choice.value };
      label.textContent = choice.label;
      trigger.value = choice.value;
      close();
      trigger.focus({ preventScroll: true });
      if (changed)
        options.onChange(choice.value);
    };
    const renderOptions = () => {
      if (!popup)
        return;
      popup.replaceChildren(...state.choices.map((choice, index) => {
        const item = doc.createElement("div");
        item.className = "orbit-ui-select-option";
        item.id = `${id}-${index}`;
        item.setAttribute("role", "option");
        item.setAttribute("aria-selected", String(choice.value === state.value));
        if (choice.disabled)
          item.setAttribute("aria-disabled", "true");
        const text = doc.createElement("span");
        text.textContent = choice.label;
        item.append(text, icon(doc, "m5 12 4 4L19 6"));
        item.addEventListener("pointermove", () => {
          if (!choice.disabled)
            selectActive(index, false);
        });
        item.addEventListener("pointerdown", (event) => event.preventDefault());
        item.addEventListener("click", () => {
          if (!choice.disabled) {
            active = index;
            choose();
          }
        });
        return item;
      }));
    };
    const open = () => {
      if (disposed || disabled() || popup || !enabled().length)
        return;
      popup = doc.createElement("div");
      popup.className = "orbit-ui-select-popup";
      popup.id = id;
      popup.setAttribute("role", "listbox");
      const accessibleLabel = trigger.getAttribute("aria-label");
      if (accessibleLabel)
        popup.setAttribute("aria-label", accessibleLabel);
      const labeledBy = trigger.getAttribute("aria-labelledby");
      if (labeledBy)
        popup.setAttribute("aria-labelledby", labeledBy);
      scope.append(popup);
      renderOptions();
      if (typeof popup.showPopover === "function") {
        popup.popover = "manual";
        popup.showPopover();
      }
      trigger.setAttribute("aria-expanded", "true");
      trigger.setAttribute("aria-controls", id);
      const index = state.choices.findIndex((choice) => choice.value === state.value && !choice.disabled);
      selectActive(index >= 0 ? index : enabled()[0], false);
      position();
      popup.children[active]?.scrollIntoView({ block: "nearest" });
    };
    trigger.addEventListener("click", () => {
      if (popup)
        close();
      else
        open();
    }, listenerOptions);
    trigger.addEventListener("keydown", (event) => {
      if (event.isComposing || disabled())
        return;
      if (event.key === "Escape" && popup) {
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      }
      if (event.key === "Tab") {
        if (popup)
          choose();
        return;
      }
      if (["Enter", " ", "ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        const wasOpen = Boolean(popup);
        if ((event.key === "Enter" || event.key === " ") && wasOpen) {
          choose();
          return;
        }
        open();
        if (!popup)
          return;
        const indices = enabled(), offset = indices.indexOf(active);
        if (event.key === "Home")
          selectActive(indices[0]);
        else if (event.key === "End")
          selectActive(indices.at(-1));
        else if (wasOpen && (event.key === "ArrowDown" || event.key === "ArrowUp"))
          selectActive(indices[Math.max(0, Math.min(indices.length - 1, offset + (event.key === "ArrowDown" ? 1 : -1)))]);
        return;
      }
      if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        event.stopPropagation();
        const now = Date.now(), character = event.key.toLocaleLowerCase();
        search = now - lastTyped > 750 ? character : search + character;
        lastTyped = now;
        const needle = [...search].every((value) => value === character) ? character : search;
        open();
        for (let step = 1; step <= state.choices.length; step++) {
          const index = (active + step) % state.choices.length, choice = state.choices[index];
          if (!choice.disabled && choice.label.toLocaleLowerCase().startsWith(needle)) {
            selectActive(index);
            break;
          }
        }
      }
    }, listenerOptions);
    const outside = (event) => {
      if (!event.composedPath().includes(trigger) && (!popup || !event.composedPath().includes(popup)))
        close();
    };
    doc.addEventListener("pointerdown", outside, { ...listenerOptions, capture: true });
    doc.addEventListener("focusin", outside, { ...listenerOptions, capture: true });
    doc.addEventListener("scroll", (event) => {
      const target = event.composedPath()[0];
      if (target === doc || target instanceof view.Element && target.contains(trigger))
        close();
    }, { ...listenerOptions, capture: true });
    view.addEventListener("resize", close, listenerOptions);
    view.addEventListener("blur", close, listenerOptions);
    const update = (next) => {
      if (disposed)
        return;
      const previousActive = state.choices[active]?.value;
      state = next;
      label.textContent = state.choices.find((choice) => choice.value === state.value)?.label ?? "";
      trigger.value = state.value;
      if (disabled() || !enabled().length) {
        close();
        return;
      }
      if (popup) {
        renderOptions();
        const index = state.choices.findIndex((choice) => choice.value === previousActive && !choice.disabled);
        selectActive(index >= 0 ? index : enabled()[0], false);
        position();
      }
    };
    update(options);
    return { update, close, dispose() {
      if (disposed)
        return;
      close();
      disposed = true;
      events.abort();
      sheet.remove();
      trigger.classList.remove("orbit-ui-select-trigger");
      for (const [name, value] of originals) {
        if (value === null)
          trigger.removeAttribute(name);
        else
          trigger.setAttribute(name, value);
      }
      trigger.replaceChildren(...originalNodes);
      trigger.value = originalValue;
    } };
  }

  // ../orbit/dist/ui/home-sections.js
  function registry(document2) {
    const owner = document2.defaultView;
    if (!owner)
      throw new Error("Home sections require a browser document");
    const key = /* @__PURE__ */ Symbol.for("@c0sc0s/orbit/ui/home-sections/v1");
    let value = Reflect.get(owner, key);
    if (!value) {
      value = { sections: /* @__PURE__ */ new Map(), listeners: /* @__PURE__ */ new Set() };
      Reflect.set(owner, key, value);
    }
    return value;
  }
  function registerHomeSection(section, document2 = globalThis.document) {
    if (!/^[a-z][a-z0-9.-]{0,63}$/u.test(section.id) || typeof section.title !== "string" || !section.title.trim() || section.title.length > 80 || typeof section.mount !== "function" || section.slot !== void 0 && !["overview", "main"].includes(section.slot) || section.order !== void 0 && !Number.isSafeInteger(section.order) || section.defaultVisible !== void 0 && typeof section.defaultVisible !== "boolean")
      throw new Error("Invalid Home section");
    const state = registry(document2);
    if (state.sections.has(section.id))
      throw new Error(`Home section already registered: ${section.id}`);
    const registered = Object.freeze({ ...section, title: section.title.trim() });
    state.sections.set(section.id, registered);
    for (const listener of state.listeners)
      listener();
    return () => {
      if (state.sections.get(section.id) !== registered)
        return;
      state.sections.delete(section.id);
      for (const listener of state.listeners)
        listener();
    };
  }

  // src/shared/model.ts
  var RUNTIME_VERSION = "0.1.13";
  var PAGE_SIZE = 200;
  var TodoError = class extends Error {
    constructor(code, message) {
      super(message);
      this.code = code;
    }
    code;
  };
  function unwrap(result) {
    if (!result.ok) throw new TodoError(result.error.code, result.error.message);
    return result.data;
  }
  function progress(task, tasks) {
    const children = tasks.filter((item) => item.parentId === task.id && !item.archivedAt);
    return { done: children.filter((item) => item.status === "done").length, total: children.length };
  }

  // ../../node_modules/preact/hooks/dist/hooks.module.js
  var t2;
  var r2;
  var u2;
  var i2;
  var o2 = 0;
  var f2 = [];
  var c2 = l;
  var e2 = c2.__b;
  var a2 = c2.__r;
  var v2 = c2.diffed;
  var l2 = c2.__c;
  var m2 = c2.unmount;
  var p2 = c2.__;
  function s2(n2, t3) {
    c2.__h && c2.__h(r2, n2, o2 || t3), o2 = 0;
    var u4 = r2.__H || (r2.__H = { __: [], __h: [] });
    return n2 >= u4.__.length && u4.__.push({}), u4.__[n2];
  }
  function d2(n2) {
    return o2 = 1, y2(D2, n2);
  }
  function y2(n2, u4, i3) {
    var o3 = s2(t2++, 2);
    if (o3.t = n2, !o3.__c && (o3.__ = [i3 ? i3(u4) : D2(void 0, u4), function(n3) {
      var t3 = o3.__N ? o3.__N[0] : o3.__[0], r3 = o3.t(t3, n3);
      t3 !== r3 && (o3.__N = [r3, o3.__[1]], o3.__c.setState({}));
    }], o3.__c = r2, !r2.__f)) {
      var f4 = function(n3, t3, r3) {
        if (!o3.__c.__H) return true;
        var u5 = false, i4 = o3.__c.props !== n3;
        if (o3.__c.__H.__.some(function(n4) {
          if (n4.__N) {
            u5 = true;
            var t4 = n4.__[0];
            n4.__ = n4.__N, n4.__N = void 0, t4 !== n4.__[0] && (i4 = true);
          }
        }), c3) {
          var f5 = c3.call(this, n3, t3, r3);
          return u5 ? f5 || i4 : f5;
        }
        return !u5 || i4;
      };
      r2.__f = true;
      var c3 = r2.shouldComponentUpdate, e3 = r2.componentWillUpdate;
      r2.componentWillUpdate = function(n3, t3, r3) {
        if (this.__e) {
          var u5 = c3;
          c3 = void 0, f4(n3, t3, r3), c3 = u5;
        }
        e3 && e3.call(this, n3, t3, r3);
      }, r2.shouldComponentUpdate = f4;
    }
    return o3.__N || o3.__;
  }
  function h2(n2, u4) {
    var i3 = s2(t2++, 3);
    !c2.__s && C2(i3.__H, u4) && (i3.__ = n2, i3.u = u4, r2.__H.__h.push(i3));
  }
  function _2(n2, u4) {
    var i3 = s2(t2++, 4);
    !c2.__s && C2(i3.__H, u4) && (i3.__ = n2, i3.u = u4, r2.__h.push(i3));
  }
  function A2(n2) {
    return o2 = 5, T2(function() {
      return { current: n2 };
    }, []);
  }
  function T2(n2, r3) {
    var u4 = s2(t2++, 7);
    return C2(u4.__H, r3) && (u4.__ = n2(), u4.__H = r3, u4.__h = n2), u4.__;
  }
  function q2(n2, t3) {
    return o2 = 8, T2(function() {
      return n2;
    }, t3);
  }
  function j2() {
    for (var n2; n2 = f2.shift(); ) {
      var t3 = n2.__H;
      if (n2.__P && t3) try {
        t3.__h.some(z2), t3.__h.some(B2), t3.__h = [];
      } catch (r3) {
        t3.__h = [], c2.__e(r3, n2.__v);
      }
    }
  }
  c2.__b = function(n2) {
    r2 = null, e2 && e2(n2);
  }, c2.__ = function(n2, t3) {
    n2 && t3.__k && t3.__k.__m && (n2.__m = t3.__k.__m), p2 && p2(n2, t3);
  }, c2.__r = function(n2) {
    a2 && a2(n2), t2 = 0;
    var i3 = (r2 = n2.__c).__H;
    i3 && (u2 === r2 ? (i3.__h = [], r2.__h = [], i3.__.some(function(n3) {
      n3.__N && (n3.__ = n3.__N), n3.u = n3.__N = void 0;
    })) : (i3.__h.some(z2), i3.__h.some(B2), i3.__h = [], t2 = 0)), u2 = r2;
  }, c2.diffed = function(n2) {
    v2 && v2(n2);
    var t3 = n2.__c;
    t3 && t3.__H && (t3.__H.__h.length && (1 !== f2.push(t3) && i2 === c2.requestAnimationFrame || ((i2 = c2.requestAnimationFrame) || w2)(j2)), t3.__H.__.some(function(n3) {
      n3.u && (n3.__H = n3.u, n3.u = void 0);
    })), u2 = r2 = null;
  }, c2.__c = function(n2, t3) {
    t3.some(function(n3) {
      try {
        n3.__h.some(z2), n3.__h = n3.__h.filter(function(n4) {
          return !n4.__ || B2(n4);
        });
      } catch (r3) {
        t3.some(function(n4) {
          n4.__h && (n4.__h = []);
        }), t3 = [], c2.__e(r3, n3.__v);
      }
    }), l2 && l2(n2, t3);
  }, c2.unmount = function(n2) {
    m2 && m2(n2);
    var t3, r3 = n2.__c;
    r3 && r3.__H && (r3.__H.__.some(function(n3) {
      try {
        z2(n3);
      } catch (n4) {
        t3 = n4;
      }
    }), r3.__H = void 0, t3 && c2.__e(t3, r3.__v));
  };
  var k2 = "function" == typeof requestAnimationFrame;
  function w2(n2) {
    var t3, r3 = function() {
      clearTimeout(u4), k2 && cancelAnimationFrame(t3), setTimeout(n2);
    }, u4 = setTimeout(r3, 35);
    k2 && (t3 = requestAnimationFrame(r3));
  }
  function z2(n2) {
    var t3 = r2, u4 = n2.__c;
    "function" == typeof u4 && (n2.__c = void 0, u4()), r2 = t3;
  }
  function B2(n2) {
    var t3 = r2;
    n2.__c = n2.__(), r2 = t3;
  }
  function C2(n2, t3) {
    return !n2 || n2.length !== t3.length || t3.some(function(t4, r3) {
      return t4 !== n2[r3];
    });
  }
  function D2(n2, t3) {
    return "function" == typeof t3 ? t3(n2) : t3;
  }

  // ../../node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js
  var f3 = 0;
  function u3(e3, t3, n2, o3, i3, u4) {
    t3 || (t3 = {});
    var a3, c3, p3 = t3;
    if ("ref" in p3) for (c3 in p3 = {}, t3) "ref" == c3 ? a3 = t3[c3] : p3[c3] = t3[c3];
    var l3 = { type: e3, props: p3, key: n2, ref: a3, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --f3, __i: -1, __u: 0, __source: i3, __self: u4 };
    if ("function" == typeof e3 && (a3 = e3.defaultProps)) for (c3 in a3) void 0 === p3[c3] && (p3[c3] = a3[c3]);
    return l.vnode && l.vnode(l3), l3;
  }

  // src/injected/task-controls.tsx
  var paths = {
    chevron: "m9 5 7 7-7 7",
    close: "m6 6 12 12M6 18 18 6",
    plus: "M12 5v14M5 12h14",
    trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7M14 10v7",
    refresh: "M20 7v5h-5M4 17v-5h5M6.1 7a7 7 0 0 1 11.6-1L20 9M4 15l2.3 3A7 7 0 0 0 18 17",
    edit: "m15 4 5 5-11 11H4v-5L15 4ZM12 7l5 5",
    search: "m21 21-4.5-4.5M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0"
  };
  function Icon({ name }) {
    return /* @__PURE__ */ u3("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.7", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true", children: /* @__PURE__ */ u3("path", { d: paths[name] }) });
  }
  function TaskCheck({ task, disabled, onToggle }) {
    return /* @__PURE__ */ u3(
      "button",
      {
        class: `ot-check ${task.status === "doing" ? "is-doing" : ""}`,
        disabled,
        "aria-label": `${task.status === "done" ? "\u91CD\u65B0\u6253\u5F00" : "\u5B8C\u6210"} ${task.title}`,
        "aria-pressed": task.status === "done",
        onClick: onToggle,
        children: /* @__PURE__ */ u3("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.5", "aria-hidden": "true", children: [
          /* @__PURE__ */ u3("circle", { cx: "12", cy: "12", r: "8.5" }),
          task.status === "done" && /* @__PURE__ */ u3("path", { d: "m8 12 3 3 5-6", "stroke-linecap": "round", "stroke-linejoin": "round" }),
          task.status === "doing" && /* @__PURE__ */ u3("circle", { cx: "12", cy: "12", r: "3", fill: "currentColor", stroke: "none" })
        ] })
      }
    );
  }
  function DeleteButton({ task, disabled, onDelete, children }) {
    return /* @__PURE__ */ u3("button", { class: children ? "ot-delete" : "ot-row-delete", "aria-label": `\u5220\u9664 ${task.title}`, title: "\u5220\u9664\u4EFB\u52A1\u53CA\u5176\u5B50\u4EFB\u52A1", disabled, onClick: onDelete, children: [
      /* @__PURE__ */ u3(Icon, { name: "trash" }),
      children
    ] });
  }

  // src/injected/description.tsx
  function splitDescription(value) {
    const match = /(?:^|\n\n)飞书任务：(https:\/\/applink\.larkoffice\.com\/client\/todo\/detail\?[^\s]+)\s*$/u.exec(value);
    if (!match) return { body: value, source: null, suffix: "" };
    return { body: value.slice(0, match.index), source: match[1], suffix: value.slice(match.index) };
  }
  function DescriptionText({ value }) {
    return /* @__PURE__ */ u3("div", { class: "ot-description-text", children: value.split(/(https?:\/\/[^\s]+)/u).map(
      (part, index) => /^https?:\/\//u.test(part) ? /* @__PURE__ */ u3("a", { href: part, target: "_blank", rel: "noopener noreferrer", children: part }, index) : part
    ) });
  }

  // src/injected/task-editor.ts
  var editableFields = ["title", "description", "status", "parentId", "project", "dueDate"];
  function taskPatch(editor) {
    return Object.fromEntries(editableFields.filter((field) => editor.draft[field] !== editor.base[field]).map((field) => [field, editor.draft[field]]));
  }
  function createEditor(task) {
    return { base: task, draft: task, conflicts: [], incoming: null, descriptionOpen: false, childTitle: "" };
  }
  function reconcileEditor(editor, latest) {
    if (!editor) return createEditor(latest);
    if (latest.revision < editor.base.revision) return editor;
    const patch = taskPatch(editor);
    const conflicts = editableFields.filter((field) => field in patch && latest[field] !== editor.base[field] && latest[field] !== editor.draft[field]);
    if (conflicts.length) return { ...editor, conflicts, incoming: latest };
    return { ...editor, base: latest, draft: { ...latest, ...patch }, conflicts: [], incoming: null };
  }

  // src/injected/select.tsx
  function Select({ label, value, choices, onChange, disabled, title, className = "" }) {
    const trigger = A2(null), control = A2(null), change = A2(onChange);
    const committed = A2(false);
    change.current = onChange;
    _2(() => {
      if (!trigger.current) return;
      const instance = mountSelect(trigger.current, { value, choices, onChange: (next) => {
        committed.current = true;
        change.current(next);
      } });
      control.current = instance;
      return () => {
        instance.dispose();
        control.current = null;
      };
    }, []);
    _2(() => {
      control.current?.update({ value, choices });
      if (!disabled && committed.current && trigger.current) {
        committed.current = false;
        const root = trigger.current.getRootNode(), doc = trigger.current.ownerDocument;
        const active = root instanceof ShadowRoot ? root.activeElement : doc.activeElement;
        if (!active || active === doc.body) trigger.current.focus({ preventScroll: true });
      }
    }, [value, choices, disabled]);
    return /* @__PURE__ */ u3("button", { type: "button", ref: trigger, class: className, "aria-label": label, disabled, title });
  }

  // src/injected/task-detail.tsx
  var statusLabels = { todo: "\u5F85\u529E", doing: "\u8FDB\u884C\u4E2D", done: "\u5DF2\u5B8C\u6210" };
  function TaskDetail({ task, tasks, api, busy, mutate, add, select, editor: cached, saveEditor, remove, changeStatus, reveal, branchEdited, close }) {
    const [editor, setEditor] = d2(cached), [error, setError] = d2("");
    const current = A2(cached), titleInput = A2(null), descriptionInput = A2(null);
    const accept = (next) => {
      current.current = next;
      setEditor(next);
      saveEditor(task.id, next);
    };
    h2(() => {
      let active = true;
      void api("get", { id: task.id }).then((next) => {
        if (active) {
          accept(reconcileEditor(current.current, next));
          setError("");
        }
      }).catch((failure) => {
        if (active) setError(failure.message);
      });
      return () => {
        active = false;
      };
    }, [api, task.id, task.revision]);
    _2(() => {
      for (const input of [titleInput.current, descriptionInput.current]) {
        if (input) {
          input.style.height = "auto";
          input.style.height = `${input.scrollHeight}px`;
        }
      }
    }, [editor?.draft.title, editor?.draft.description, editor?.descriptionOpen]);
    h2(() => {
      if (editor?.descriptionOpen) descriptionInput.current?.focus();
    }, [editor?.descriptionOpen]);
    h2(() => {
      if (editor && matchMedia("(max-width: 720px)").matches) titleInput.current?.focus({ preventScroll: true });
    }, [Boolean(editor)]);
    if (!editor) return /* @__PURE__ */ u3("div", { class: "ot-empty", children: error || "\u6B63\u5728\u8BFB\u53D6\u2026" });
    const { draft, base } = editor;
    const dirty = Object.keys(taskPatch(editor)).length > 0;
    const edit = (patch) => accept({ ...editor, draft: { ...draft, ...patch } });
    const description = splitDescription(draft.description);
    const readonly = Boolean(task.archivedAt || base.archivedAt), parent = tasks.find((item) => item.id === task.parentId);
    const children = tasks.filter((item) => item.parentId === task.id && Boolean(item.archivedAt) === readonly);
    const forbidden = /* @__PURE__ */ new Set([task.id]);
    for (let depth = 0; depth < 16; depth++) for (const item of tasks) if (item.parentId && forbidden.has(item.parentId)) forbidden.add(item.id);
    const focusTitle = () => requestAnimationFrame(() => titleInput.current?.focus());
    const useLatest = () => {
      if (editor.incoming) accept({ ...createEditor(editor.incoming), childTitle: editor.childTitle });
      else accept({ ...createEditor(base), childTitle: editor.childTitle });
      focusTitle();
    };
    return /* @__PURE__ */ u3("div", { class: "ot-detail-content", children: [
      error && /* @__PURE__ */ u3("div", { class: "ot-error", role: "alert", children: error }),
      editor.conflicts.length > 0 && /* @__PURE__ */ u3("div", { class: "ot-conflict", role: "alert", children: [
        "\u540C\u4E00\u5185\u5BB9\u5DF2\u5728\u5176\u4ED6\u7A97\u53E3\u66F4\u65B0\uFF0C\u8349\u7A3F\u4ECD\u4FDD\u7559\u3002",
        /* @__PURE__ */ u3("div", { children: [
          /* @__PURE__ */ u3("button", { onClick: useLatest, children: "\u4F7F\u7528\u6700\u65B0\u5185\u5BB9" }),
          /* @__PURE__ */ u3("button", { onClick: () => {
            if (editor.incoming) accept({ ...editor, base: editor.incoming, draft: { ...editor.incoming, ...taskPatch(editor) }, incoming: null, conflicts: [] });
          }, children: "\u4FDD\u7559\u6211\u7684\u4FEE\u6539" })
        ] })
      ] }),
      /* @__PURE__ */ u3("div", { class: "ot-detail-toolbar", children: [
        readonly ? /* @__PURE__ */ u3("span", { class: "ot-deleted-label", children: "\u5DF2\u5220\u9664" }) : /* @__PURE__ */ u3(Select, { label: "\u4EFB\u52A1\u72B6\u6001", className: "ot-status-select", value: draft.status, disabled: busy || branchEdited(task), title: branchEdited(task) ? "\u4FDD\u5B58\u7F16\u8F91\u540E\u53EF\u5207\u6362\u72B6\u6001" : "\u4EFB\u52A1\u72B6\u6001", choices: Object.entries(statusLabels).map(([value, label]) => ({ value, label })), onChange: (value) => {
          void changeStatus(task, value);
        } }),
        /* @__PURE__ */ u3("div", { class: "ot-detail-actions", children: [
          !readonly && /* @__PURE__ */ u3(DeleteButton, { task, disabled: busy || branchEdited(task), onDelete: () => {
            void remove(task);
          }, children: "\u5220\u9664" }),
          /* @__PURE__ */ u3("button", { class: "ot-detail-close", "aria-label": "\u8FD4\u56DE\u4EFB\u52A1\u5217\u8868", title: "\u8FD4\u56DE\u4EFB\u52A1\u5217\u8868", onClick: close, children: /* @__PURE__ */ u3(Icon, { name: "close" }) })
        ] })
      ] }),
      parent && /* @__PURE__ */ u3("button", { class: "ot-parent-link", disabled: busy, onClick: () => reveal(parent), children: [
        "\u2190 ",
        parent.title
      ] }),
      /* @__PURE__ */ u3("form", { class: "ot-edit-form", onKeyDown: (event) => {
        if (event.key === "Enter" && event.isComposing) event.preventDefault();
      }, onSubmit: (event) => {
        event.preventDefault();
        if (readonly || busy || editor.conflicts.length) return;
        const patch = taskPatch(editor);
        if (!Object.keys(patch).length) {
          accept({ ...editor, descriptionOpen: false });
          focusTitle();
          return;
        }
        void mutate("update", { id: task.id, ifRevision: base.revision, patch }).then((next) => {
          if (next) {
            accept({ ...createEditor(next), childTitle: current.current?.childTitle ?? "" });
            if (next.parentId !== base.parentId) reveal(next);
            focusTitle();
          }
        });
      }, children: [
        /* @__PURE__ */ u3("textarea", { class: "ot-title-input", ref: titleInput, "aria-label": "\u4EFB\u52A1\u6807\u9898", rows: 1, maxLength: 300, value: draft.title, readOnly: readonly || busy, onInput: (event) => edit({ title: event.currentTarget.value }) }),
        /* @__PURE__ */ u3("div", { class: "ot-description", children: editor.descriptionOpen ? /* @__PURE__ */ u3("textarea", { ref: descriptionInput, "aria-label": "\u4EFB\u52A1\u63CF\u8FF0", placeholder: "\u6DFB\u52A0\u63CF\u8FF0\u2026", rows: 3, maxLength: 12e3 - description.suffix.length, value: description.body, readOnly: readonly || busy, onInput: (event) => edit({ description: `${event.currentTarget.value}${description.suffix}` }) }) : /* @__PURE__ */ u3(S, { children: description.body ? /* @__PURE__ */ u3(S, { children: [
          /* @__PURE__ */ u3(DescriptionText, { value: description.body }),
          !readonly && /* @__PURE__ */ u3("button", { class: "ot-edit-description", type: "button", "aria-label": "\u7F16\u8F91\u63CF\u8FF0", title: "\u7F16\u8F91\u63CF\u8FF0", onClick: () => accept({ ...editor, descriptionOpen: true }), children: /* @__PURE__ */ u3(Icon, { name: "edit" }) })
        ] }) : !readonly && /* @__PURE__ */ u3("button", { class: "ot-add-description", type: "button", onClick: () => accept({ ...editor, descriptionOpen: true }), children: "\u6DFB\u52A0\u63CF\u8FF0\u2026" }) }) }),
        /* @__PURE__ */ u3("div", { class: "ot-links", children: [
          description.source && /* @__PURE__ */ u3("a", { href: description.source, target: "_blank", rel: "noopener noreferrer", children: "\u5728\u98DE\u4E66\u6253\u5F00 \u2197" }),
          task.threadId && /* @__PURE__ */ u3("button", { type: "button", disabled: busy, onClick: () => {
            void mutate("open", { id: task.id });
          }, children: "\u6253\u5F00\u4F1A\u8BDD \u2197" })
        ] }),
        /* @__PURE__ */ u3("details", { class: "ot-metadata", children: [
          /* @__PURE__ */ u3("summary", { children: [
            /* @__PURE__ */ u3(Icon, { name: "chevron" }),
            /* @__PURE__ */ u3("span", { children: "\u5C5E\u6027" }),
            /* @__PURE__ */ u3("span", { class: "ot-metadata-preview", children: [draft.project, draft.dueDate].filter(Boolean).join(" \xB7 ") })
          ] }),
          /* @__PURE__ */ u3("fieldset", { class: "ot-fields", disabled: readonly || busy, children: [
            /* @__PURE__ */ u3("label", { children: [
              "\u622A\u6B62\u65E5\u671F",
              /* @__PURE__ */ u3("input", { type: "date", "aria-label": "\u622A\u6B62\u65E5\u671F", value: draft.dueDate ?? "", onInput: (event) => edit({ dueDate: event.currentTarget.value || null }) })
            ] }),
            /* @__PURE__ */ u3("label", { children: [
              "\u9879\u76EE",
              /* @__PURE__ */ u3("input", { "aria-label": "\u6240\u5C5E\u9879\u76EE", maxLength: 1024, value: draft.project ?? "", onInput: (event) => edit({ project: event.currentTarget.value || null }) })
            ] }),
            /* @__PURE__ */ u3("label", { class: "ot-field-wide", children: [
              "\u7236\u4EFB\u52A1",
              /* @__PURE__ */ u3(Select, { label: "\u7236\u4EFB\u52A1", value: draft.parentId ?? "", disabled: readonly || busy, choices: [{ value: "", label: "\u65E0" }, ...tasks.filter((item) => !forbidden.has(item.id) && (!item.archivedAt || item.id === draft.parentId)).map((item) => ({ value: item.id, label: item.title }))], onChange: (value) => edit({ parentId: value || null }) })
            ] })
          ] })
        ] }),
        !readonly && (dirty || editor.descriptionOpen) && /* @__PURE__ */ u3("div", { class: "ot-save-bar", children: [
          /* @__PURE__ */ u3("button", { type: "button", disabled: busy, onClick: useLatest, children: "\u53D6\u6D88" }),
          /* @__PURE__ */ u3("button", { class: "ot-primary", disabled: busy || !draft.title.trim() || editor.conflicts.length > 0, children: "\u4FDD\u5B58" })
        ] })
      ] }),
      /* @__PURE__ */ u3("div", { class: "ot-subtasks", children: [
        /* @__PURE__ */ u3("div", { class: "ot-subtask-heading", children: [
          /* @__PURE__ */ u3("span", { children: "\u5B50\u4EFB\u52A1" }),
          children.length > 0 && /* @__PURE__ */ u3("span", { children: [
            children.filter((item) => item.status === "done").length,
            "/",
            children.length
          ] })
        ] }),
        children.map((item) => /* @__PURE__ */ u3("div", { class: `ot-detail-child ${item.status === "done" ? "is-done" : ""}`, children: [
          /* @__PURE__ */ u3(TaskCheck, { task: item, disabled: busy || branchEdited(item) || readonly, onToggle: () => {
            void changeStatus(item, item.status === "done" ? "todo" : "done");
          } }),
          /* @__PURE__ */ u3("button", { class: "ot-child-title", disabled: busy, onClick: () => select(item.id), children: item.title }),
          !readonly && /* @__PURE__ */ u3(DeleteButton, { task: item, disabled: busy || branchEdited(item), onDelete: () => {
            void remove(item);
          } })
        ] }, item.id)),
        !readonly && /* @__PURE__ */ u3("form", { class: "ot-add-child", onKeyDown: (event) => {
          if (event.key === "Enter" && event.isComposing) event.preventDefault();
        }, onSubmit: (event) => {
          event.preventDefault();
          void add(editor.childTitle, task.id).then((created) => {
            if (created && current.current) accept({ ...current.current, childTitle: "" });
          });
        }, children: [
          /* @__PURE__ */ u3(Icon, { name: "plus" }),
          /* @__PURE__ */ u3("input", { "aria-label": "\u65B0\u5B50\u4EFB\u52A1\u6807\u9898", placeholder: "\u6DFB\u52A0\u5B50\u4EFB\u52A1\u2026", value: editor.childTitle, maxLength: 300, readOnly: busy, onInput: (event) => accept({ ...editor, childTitle: event.currentTarget.value }) }),
          /* @__PURE__ */ u3("button", { disabled: busy || !editor.childTitle.trim(), children: "\u6DFB\u52A0" })
        ] })
      ] })
    ] });
  }

  // src/injected/task-view.ts
  function matchesFilter(task, filter) {
    return !task.archivedAt && (filter === "all" || (filter === "open" ? task.status !== "done" : task.status === "done"));
  }
  function taskPath(task, byId) {
    const titles = [], seen = /* @__PURE__ */ new Set([task.id]);
    let parentId = task.parentId;
    while (parentId && !seen.has(parentId)) {
      seen.add(parentId);
      const parent = byId.get(parentId);
      if (!parent) break;
      titles.unshift(parent.title);
      parentId = parent.parentId;
    }
    return titles.join(" / ");
  }
  function buildTaskView(tasks, filter, query) {
    const byId = new Map(tasks.map((task) => [task.id, task]));
    const needle = query.trim().toLocaleLowerCase();
    const matches = tasks.filter((task) => matchesFilter(task, filter) && (!needle || `${task.title}
${task.project ?? ""}`.toLocaleLowerCase().includes(needle)));
    const flat = filter === "done" || Boolean(needle);
    const children = /* @__PURE__ */ new Map();
    const ids = new Set(matches.map((task) => task.id));
    for (const task of matches) if (task.parentId && ids.has(task.parentId)) {
      const siblings = children.get(task.parentId) ?? [];
      siblings.push(task);
      children.set(task.parentId, siblings);
    }
    const roots = flat ? [...matches].sort((a3, b2) => b2.updatedAt.localeCompare(a3.updatedAt)) : matches.filter((task) => !task.parentId || !ids.has(task.parentId));
    return { matches, roots, flat, children, byId };
  }
  function dueLabel(date, today) {
    if (date === today) return "\u4ECA\u5929";
    return date.slice(0, 4) === today.slice(0, 4) ? date.slice(5).replace("-", "/") : date.replaceAll("-", "/");
  }
  function localDate(now = /* @__PURE__ */ new Date()) {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  // src/injected/use-task-store.ts
  var empty = () => ({ items: [], loading: true, error: "", generation: 0 });
  function useTaskStore(api, subscribe) {
    const [active, setActive] = d2(empty);
    const [pending, setPending] = d2(0), [operationError, setOperationError] = d2("");
    const sequence = A2(0);
    const refresh = q2(async () => {
      const request = ++sequence.current;
      const update = (patch) => {
        if (request === sequence.current) setActive((before) => ({ ...before, ...patch }));
      };
      update({ loading: true });
      try {
        for (let attempt = 0; attempt < 3; attempt++) {
          const items = [];
          let generation, retry = false;
          for (let offset = 0; ; offset += PAGE_SIZE) {
            const page = await api("list", { offset, limit: PAGE_SIZE });
            if (request !== sequence.current) return;
            if (generation !== void 0 && page.generation !== generation) {
              retry = true;
              break;
            }
            generation = page.generation;
            items.push(...page.items);
            if (items.length >= page.total) break;
          }
          if (retry) continue;
          update({ items, error: "", generation });
          return;
        }
        throw new Error("\u4EFB\u52A1\u6B63\u5728\u9891\u7E41\u66F4\u65B0\uFF0C\u8BF7\u7A0D\u540E\u5237\u65B0\u3002");
      } catch (failure) {
        update({ error: `\u4EFB\u52A1\u5217\u8868\u672A\u80FD\u5237\u65B0\uFF1A${failure.message}` });
      } finally {
        update({ loading: false });
      }
    }, [api]);
    h2(() => {
      void refresh();
      const unsubscribe = subscribe(() => {
        void refresh();
      });
      return () => {
        sequence.current++;
        unsubscribe();
      };
    }, [refresh, subscribe]);
    const mutate = async (method, payload) => {
      setPending((value) => value + 1);
      setOperationError("");
      try {
        const result = await api(method, payload);
        await refresh();
        return result;
      } catch (failure) {
        setOperationError(failure.message);
        return void 0;
      } finally {
        setPending((value) => value - 1);
      }
    };
    return { active, busy: pending > 0, error: operationError, setError: setOperationError, mutate, refresh };
  }

  // src/injected/panel.tsx
  var filters = [["open", "\u672A\u5B8C\u6210"], ["all", "\u5168\u90E8"], ["done", "\u5DF2\u5B8C\u6210"]];
  function subtreeOf(task, tasks) {
    const ids = /* @__PURE__ */ new Set([task.id]), result = [task];
    for (let depth = 0; depth < 16; depth++) for (const item of tasks) if (item.parentId && ids.has(item.parentId) && !ids.has(item.id)) {
      ids.add(item.id);
      result.push(item);
    }
    return result;
  }
  function TodoPanel({ api, subscribe, open, onClose, returnFocus, selectionRequest }) {
    const store = useTaskStore(api, subscribe);
    const [selected, setSelected] = d2(null), [filter, setFilter] = d2("open");
    const [query, setQuery] = d2(""), [title, setTitle] = d2("");
    const [capturing, setCapturing] = d2(false);
    const [expanded, setExpanded] = d2(/* @__PURE__ */ new Set());
    const [edited, setEdited] = d2(/* @__PURE__ */ new Set()), [notice, setNotice] = d2(null);
    const [confirmation, setConfirmation] = d2(null), [today, setToday] = d2(localDate());
    const editors = A2(/* @__PURE__ */ new Map()), requests = A2(/* @__PURE__ */ new Map());
    const panel = A2(null), confirmationFocus = A2(null);
    const captureInput = A2(null), captureTrigger = A2(null);
    const { busy, mutate, setError } = store;
    const snapshot = store.active, allTasks = snapshot.items;
    const view = buildTaskView(allTasks, filter, query);
    const blocked = busy || Boolean(confirmation);
    const counts = { open: allTasks.filter((item) => item.status !== "done").length, all: allTasks.length, done: allTasks.filter((item) => item.status === "done").length };
    const saveEditor = q2((id, editor) => {
      editors.current.set(id, editor);
      const dirty = Object.keys(taskPatch(editor)).length > 0;
      setEdited((before) => {
        if (before.has(id) === dirty) return before;
        const next = new Set(before);
        if (dirty) next.add(id);
        else next.delete(id);
        return next;
      });
    }, []);
    h2(() => {
      if (!open) return;
      const scope = panel.current?.getRootNode();
      const previous = scope instanceof ShadowRoot ? scope.activeElement : document.activeElement;
      panel.current?.querySelector(".ot-search")?.focus({ preventScroll: true });
      setToday(localDate());
      const timer = setInterval(() => setToday(localDate()), 6e4);
      return () => {
        clearInterval(timer);
        if (previous?.isConnected && previous !== document.body) previous.focus({ preventScroll: true });
        else returnFocus?.()?.focus({ preventScroll: true });
      };
    }, [open, returnFocus]);
    h2(() => {
      if (confirmation) panel.current?.querySelector(".ot-confirm .ot-primary")?.focus();
    }, [confirmation]);
    h2(() => {
      if (!selectionRequest) return;
      setFilter("all");
      setQuery("");
      setSelected(selectionRequest.id);
      setError("");
    }, [selectionRequest]);
    const select = (id) => {
      setSelected(id);
      setError("");
    };
    const startCapture = () => {
      setCapturing(true);
      requestAnimationFrame(() => captureInput.current?.focus());
    };
    const hideCapture = () => {
      setCapturing(false);
      requestAnimationFrame(() => captureTrigger.current?.focus());
    };
    const closeDetail = () => {
      const trigger = panel.current?.querySelector('.ot-task-name[aria-current="true"]');
      select(null);
      requestAnimationFrame(() => {
        if (trigger?.isConnected) trigger.focus({ preventScroll: true });
        else panel.current?.querySelector(".ot-search")?.focus({ preventScroll: true });
      });
    };
    const close = () => {
      setConfirmation(null);
      onClose();
    };
    const reveal = (task, focus = true) => {
      setFilter(filter === "all" ? "all" : task.status === "done" ? "done" : "open");
      setQuery("");
      setSelected(task.id);
      setError("");
      const ancestors = /* @__PURE__ */ new Set();
      let parent = task.parentId;
      while (parent && !ancestors.has(parent)) {
        ancestors.add(parent);
        parent = view.byId.get(parent)?.parentId ?? null;
      }
      setExpanded((before) => /* @__PURE__ */ new Set([...before, ...ancestors]));
      if (focus) requestAnimationFrame(() => panel.current?.querySelector('.ot-task-name[aria-current="true"]')?.focus());
    };
    const branchEdited = (task) => subtreeOf(task, allTasks).some((item) => !item.archivedAt && edited.has(item.id));
    const add = async (value, parentId = null) => {
      if (!value.trim() || blocked) return false;
      const key = parentId ?? "root", previous = requests.current.get(key);
      const request = previous?.title === value ? previous : { title: value, id: crypto.randomUUID() };
      requests.current.set(key, request);
      const result = await mutate("create", { title: value, parentId, requestId: request.id });
      if (!result) return false;
      requests.current.delete(key);
      if (parentId) {
        const parent = view.byId.get(parentId);
        if (parent) reveal({ ...parent, status: "todo" }, false);
        setExpanded((before) => /* @__PURE__ */ new Set([...before, parentId]));
      } else {
        reveal(result.tasks[0], false);
        if (matchMedia("(max-width: 720px)").matches) setSelected(null);
      }
      return true;
    };
    const remove = async (task) => {
      const subtree = subtreeOf(task, allTasks).filter((item) => !item.archivedAt);
      const next = await mutate("archive", { id: task.id, ifRevision: task.revision });
      if (!next) return;
      setNotice({ message: subtree.length > 1 ? `\u5DF2\u5220\u9664\u4EFB\u52A1\u53CA ${subtree.length - 1} \u4E2A\u5B50\u4EFB\u52A1` : "\u5DF2\u5220\u9664\u4EFB\u52A1", undo: async () => {
        const restored = await mutate("restore", { id: next.id, ifRevision: next.revision });
        if (restored) {
          setNotice(null);
          reveal(restored);
        }
      } });
      const parent = task.parentId ? view.byId.get(task.parentId) : void 0;
      if (subtree.some((item) => item.id === selected)) setSelected(parent && matchesFilter(parent, filter) ? parent.id : null);
      panel.current?.querySelector(".ot-search")?.focus({ preventScroll: true });
    };
    const finish = async (task) => {
      setConfirmation(null);
      const result = await mutate("complete", { id: task.id, ifRevision: task.revision, ifGeneration: store.active.generation });
      if (!result) return;
      setNotice({ message: result.undo.length > 1 ? `\u5DF2\u5B8C\u6210 ${result.undo.length} \u9879\u4EFB\u52A1` : "\u5DF2\u5B8C\u6210\u4EFB\u52A1", undo: async () => {
        const restored = await mutate("undoCompletion", { changes: result.undo });
        if (restored) {
          setNotice(null);
          reveal(task);
        }
      } });
      if (filter === "open" && selected && result.undo.some((item) => item.id === selected)) setSelected(null);
      requestAnimationFrame(() => panel.current?.querySelector(".ot-search")?.focus({ preventScroll: true }));
    };
    const changeStatus = async (task, status) => {
      if (branchEdited(task)) {
        setError("\u8BF7\u5148\u4FDD\u5B58\u8BE5\u4EFB\u52A1\u53CA\u5B50\u4EFB\u52A1\u7684\u4FEE\u6539\u3002");
        return;
      }
      if (status === "done") {
        const unfinished = subtreeOf(task, store.active.items).filter((item) => item.id !== task.id && item.status !== "done");
        if (unfinished.length) {
          const scope = panel.current?.getRootNode();
          confirmationFocus.current = scope instanceof ShadowRoot ? scope.activeElement : document.activeElement;
          setConfirmation(task);
        } else await finish(task);
        return;
      }
      const next = await mutate("update", { id: task.id, ifRevision: task.revision, patch: { status } });
      if (!next) return;
      setNotice({ message: status === "doing" ? "\u5DF2\u5F00\u59CB\u4EFB\u52A1" : "\u5DF2\u91CD\u65B0\u6253\u5F00\u4EFB\u52A1", undo: async () => {
        const restored = await mutate("update", { id: next.id, ifRevision: next.revision, patch: { status: task.status } });
        if (restored) {
          setNotice(null);
          reveal(restored);
        }
      } });
      if (filter === "done") setSelected(null);
    };
    const changeFilter = (next) => {
      setFilter(next);
      setSelected(null);
      setError("");
    };
    const cancelCompletion = () => {
      setConfirmation(null);
      requestAnimationFrame(() => {
        if (confirmationFocus.current?.isConnected) confirmationFocus.current.focus();
        else panel.current?.querySelector(".ot-search")?.focus();
      });
    };
    const row = (task) => {
      const children = view.children.get(task.id) ?? [], count = progress(task, store.active.items);
      const isExpanded = expanded.has(task.id), path = view.flat ? taskPath(task, view.byId) : "";
      const locked = blocked || branchEdited(task);
      return /* @__PURE__ */ u3("li", { class: "ot-branch", children: [
        /* @__PURE__ */ u3("div", { class: `ot-row ${selected === task.id ? "is-selected" : ""} ${task.status === "done" ? "is-done" : ""}`, children: [
          !view.flat && children.length ? /* @__PURE__ */ u3(
            "button",
            {
              class: `ot-expand ${isExpanded ? "is-expanded" : ""}`,
              "aria-label": `${isExpanded ? "\u6298\u53E0" : "\u5C55\u5F00"} ${task.title}`,
              "aria-expanded": isExpanded,
              disabled: blocked,
              onClick: () => setExpanded((before) => {
                const next = new Set(before);
                if (isExpanded) next.delete(task.id);
                else next.add(task.id);
                return next;
              }),
              children: /* @__PURE__ */ u3(Icon, { name: "chevron" })
            }
          ) : /* @__PURE__ */ u3("span", { class: "ot-expand-space", "aria-hidden": "true" }),
          /* @__PURE__ */ u3(TaskCheck, { task, disabled: locked, onToggle: () => {
            void changeStatus(task, task.status === "done" ? "todo" : "done");
          } }),
          /* @__PURE__ */ u3("button", { class: "ot-task-name", disabled: Boolean(confirmation), onClick: () => select(task.id), "aria-current": selected === task.id ? "true" : void 0, children: [
            /* @__PURE__ */ u3("span", { children: [
              task.title,
              edited.has(task.id) && /* @__PURE__ */ u3("span", { class: "ot-draft-dot", "aria-label": "\u672A\u4FDD\u5B58\u4FEE\u6539", children: " \xB7" })
            ] }),
            path && /* @__PURE__ */ u3("small", { class: "ot-task-path", title: path, children: path })
          ] }),
          /* @__PURE__ */ u3("span", { class: "ot-row-meta", children: [
            task.dueDate && /* @__PURE__ */ u3("time", { dateTime: task.dueDate, title: `\u622A\u6B62 ${task.dueDate}`, class: task.status !== "done" && task.dueDate < today ? "is-overdue" : "", children: dueLabel(task.dueDate, today) }),
            !view.flat && count.total > 0 && /* @__PURE__ */ u3("span", { "aria-label": `\u5DF2\u5B8C\u6210 ${count.done} / ${count.total} \u4E2A\u5B50\u4EFB\u52A1`, title: `\u5DF2\u5B8C\u6210 ${count.done} / ${count.total} \u4E2A\u5B50\u4EFB\u52A1`, children: [
              count.done,
              "/",
              count.total
            ] })
          ] }),
          /* @__PURE__ */ u3(DeleteButton, { task, disabled: locked, onDelete: () => {
            void remove(task);
          } })
        ] }),
        !view.flat && children.length > 0 && isExpanded && /* @__PURE__ */ u3("ul", { class: "ot-children", children: children.map(row) })
      ] }, task.id);
    };
    const current = selected ? view.byId.get(selected) : void 0;
    const error = store.error || snapshot.error;
    return /* @__PURE__ */ u3("div", { class: "ot-overlay", hidden: !open, onPointerDown: (event) => {
      if (event.target === event.currentTarget) close();
    }, children: /* @__PURE__ */ u3("div", { class: `ot-panel ${current ? "has-detail" : ""}`, ref: panel, hidden: !open, role: "dialog", "aria-modal": "true", "aria-label": "\u5F85\u529E\u4EFB\u52A1", tabIndex: -1, onKeyDown: (event) => {
      if (event.key === "Escape" && !event.isComposing) {
        event.preventDefault();
        event.stopPropagation();
        if (confirmation) cancelCompletion();
        else close();
      }
      if (event.key === "Tab") {
        const scope = panel.current?.querySelector(".ot-confirm") ?? panel.current;
        const controls = [...scope?.querySelectorAll("button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary, a[href]") ?? []].filter((item) => item.tabIndex >= 0 && item.getClientRects().length > 0 && (item.tagName === "SUMMARY" || !item.closest("details:not([open])")));
        const first = controls[0], last = controls[controls.length - 1];
        const active = panel.current?.getRootNode() instanceof ShadowRoot ? panel.current.getRootNode().activeElement : document.activeElement;
        if (event.shiftKey && (active === first || active === panel.current)) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && (active === last || active === panel.current)) {
          event.preventDefault();
          first?.focus();
        }
      }
    }, children: [
      /* @__PURE__ */ u3("header", { class: "ot-header", children: [
        /* @__PURE__ */ u3("h2", { children: "\u5F85\u529E\u4EFB\u52A1" }),
        /* @__PURE__ */ u3("div", { class: "ot-header-actions", children: [
          /* @__PURE__ */ u3("button", { "aria-label": "\u5237\u65B0\u4EFB\u52A1", title: "\u5237\u65B0", disabled: snapshot.loading || blocked, onClick: () => {
            void store.refresh();
          }, children: /* @__PURE__ */ u3(Icon, { name: "refresh" }) }),
          /* @__PURE__ */ u3("button", { "aria-label": "\u5173\u95ED\u5F85\u529E", title: "\u5173\u95ED", onClick: close, children: /* @__PURE__ */ u3(Icon, { name: "close" }) })
        ] })
      ] }),
      error && /* @__PURE__ */ u3("div", { role: "alert", class: "ot-error", children: error }),
      confirmation && /* @__PURE__ */ u3("div", { class: "ot-confirm", role: "alertdialog", "aria-modal": "true", "aria-label": "\u5B8C\u6210\u7236\u4EFB\u52A1", children: [
        /* @__PURE__ */ u3("div", { children: [
          /* @__PURE__ */ u3("strong", { children: [
            "\u5B8C\u6210\u300C",
            confirmation.title,
            "\u300D\uFF1F"
          ] }),
          /* @__PURE__ */ u3("p", { children: [
            "\u5C06\u540C\u65F6\u5B8C\u6210 ",
            subtreeOf(confirmation, store.active.items).filter((item) => item.id !== confirmation.id && item.status !== "done").length,
            " \u4E2A\u672A\u5B8C\u6210\u5B50\u4EFB\u52A1\u3002"
          ] })
        ] }),
        /* @__PURE__ */ u3("button", { onClick: cancelCompletion, children: "\u53D6\u6D88" }),
        /* @__PURE__ */ u3("button", { class: "ot-primary", onClick: () => {
          void finish(confirmation);
        }, children: "\u4E00\u5E76\u5B8C\u6210" })
      ] }),
      /* @__PURE__ */ u3("div", { class: "ot-workspace", children: [
        /* @__PURE__ */ u3("section", { class: "ot-list", "aria-label": "\u4EFB\u52A1\u6811", children: [
          /* @__PURE__ */ u3("div", { class: "ot-list-tools", children: [
            /* @__PURE__ */ u3("div", { class: "ot-list-toolbar", children: [
              /* @__PURE__ */ u3("div", { class: "ot-search-field", children: [
                /* @__PURE__ */ u3(Icon, { name: "search" }),
                /* @__PURE__ */ u3("input", { class: "ot-search", "aria-label": "\u641C\u7D22\u4EFB\u52A1", placeholder: "\u641C\u7D22\u4EFB\u52A1\u6216\u9879\u76EE", disabled: Boolean(confirmation), value: query, onInput: (event) => setQuery(event.currentTarget.value) }),
                query && /* @__PURE__ */ u3("button", { type: "button", "aria-label": "\u6E05\u9664\u641C\u7D22", disabled: Boolean(confirmation), onClick: () => {
                  setQuery("");
                  panel.current?.querySelector(".ot-search")?.focus();
                }, children: /* @__PURE__ */ u3(Icon, { name: "close" }) })
              ] }),
              /* @__PURE__ */ u3("button", { class: "ot-new-task", ref: captureTrigger, disabled: blocked, "aria-expanded": capturing, "aria-controls": "ot-task-capture", onClick: startCapture, children: [
                /* @__PURE__ */ u3(Icon, { name: "plus" }),
                /* @__PURE__ */ u3("span", { children: "\u65B0\u5EFA\u4EFB\u52A1" })
              ] })
            ] }),
            /* @__PURE__ */ u3("div", { class: "ot-filters", role: "tablist", "aria-label": "\u4EFB\u52A1\u7B5B\u9009", onKeyDown: (event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const index = filters.findIndex(([value]) => value === filter);
              const next = event.key === "Home" ? 0 : event.key === "End" ? filters.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + filters.length) % filters.length;
              changeFilter(filters[next][0]);
              panel.current?.querySelector(`#ot-filter-${filters[next][0]}`)?.focus();
            }, children: filters.map(([value, label]) => /* @__PURE__ */ u3("button", { id: `ot-filter-${value}`, role: "tab", "aria-selected": filter === value, "aria-controls": "ot-task-results", tabIndex: filter === value ? 0 : -1, disabled: blocked, class: filter === value ? "is-active" : "", onClick: () => changeFilter(value), children: [
              label,
              /* @__PURE__ */ u3("span", { class: "ot-filter-count", children: counts[value] })
            ] }, value)) }),
            capturing && /* @__PURE__ */ u3("form", { class: "ot-quick-add", id: "ot-task-capture", onKeyDown: (event) => {
              if (event.isComposing) {
                if (event.key === "Enter") event.preventDefault();
                return;
              }
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                hideCapture();
              }
            }, onSubmit: (event) => {
              event.preventDefault();
              void add(title).then((saved) => {
                if (saved) {
                  setTitle("");
                  captureInput.current?.focus();
                }
              });
            }, children: [
              /* @__PURE__ */ u3("div", { class: "ot-capture-field", children: [
                /* @__PURE__ */ u3("input", { ref: captureInput, "aria-label": "\u65B0\u4EFB\u52A1\u6807\u9898", "aria-describedby": "ot-capture-hint", placeholder: "\u4EFB\u52A1\u540D\u79F0", value: title, maxLength: 300, readOnly: busy, disabled: Boolean(confirmation), onInput: (event) => setTitle(event.currentTarget.value) }),
                /* @__PURE__ */ u3("button", { class: "ot-primary ot-create-submit", disabled: blocked || !title.trim(), children: "\u521B\u5EFA" }),
                /* @__PURE__ */ u3("button", { type: "button", class: "ot-capture-cancel", "aria-label": "\u6536\u8D77\u65B0\u5EFA\u4EFB\u52A1", title: "\u6536\u8D77 \xB7 Esc", disabled: busy, onClick: hideCapture, children: /* @__PURE__ */ u3(Icon, { name: "close" }) })
              ] }),
              /* @__PURE__ */ u3("p", { id: "ot-capture-hint", class: "ot-capture-hint", children: "Enter \u521B\u5EFA \xB7 Esc \u6536\u8D77" })
            ] })
          ] }),
          /* @__PURE__ */ u3("div", { class: "ot-tree-scroll", id: "ot-task-results", role: "tabpanel", "aria-labelledby": `ot-filter-${filter}`, "aria-busy": snapshot.loading, children: view.matches.length ? /* @__PURE__ */ u3("ul", { class: "ot-tree", children: view.roots.map(row) }) : /* @__PURE__ */ u3("div", { class: "ot-empty", children: snapshot.loading ? "\u6B63\u5728\u8BFB\u53D6\u2026" : query.trim() ? "\u6CA1\u6709\u7B26\u5408\u6761\u4EF6\u7684\u4EFB\u52A1" : filter === "done" ? "\u6682\u65E0\u5DF2\u5B8C\u6210\u4EFB\u52A1" : filter === "open" ? "\u6CA1\u6709\u672A\u5B8C\u6210\u4EFB\u52A1" : "\u6682\u65E0\u4EFB\u52A1" }) })
        ] }),
        current && /* @__PURE__ */ u3("section", { class: "ot-detail", "aria-label": "\u4EFB\u52A1\u8BE6\u60C5", children: /* @__PURE__ */ u3(TaskDetail, { task: current, tasks: allTasks, api, busy: blocked, mutate, add, select, editor: editors.current.get(current.id), saveEditor, remove, changeStatus, reveal, branchEdited, close: closeDetail }, current.id) })
      ] }),
      notice && /* @__PURE__ */ u3("div", { class: "ot-toast", children: [
        /* @__PURE__ */ u3("span", { role: "status", children: notice.message }),
        /* @__PURE__ */ u3("button", { disabled: blocked, onClick: () => {
          void notice.undo();
        }, children: "\u64A4\u9500" }),
        /* @__PURE__ */ u3("button", { class: "ot-toast-close", "aria-label": "\u5173\u95ED\u63D0\u793A", onClick: () => setNotice(null), children: /* @__PURE__ */ u3(Icon, { name: "close" }) })
      ] })
    ] }) });
  }

  // src/injected/styles.ts
  var styles2 = `
:host {
  --ot-surface: var(--color-background-elevated-primary-opaque, var(--color-background-elevated-base, var(--color-token-dropdown-background, Canvas)));
  --ot-menu-surface: var(--color-background-elevated-secondary-opaque, var(--color-background-elevated-high, var(--color-token-dropdown-background, Canvas)));
  --ot-control: var(--color-background-control, var(--color-background-secondary-soft, var(--color-token-input-background, #8881)));
  --ot-text: var(--color-text-foreground, var(--color-text-primary, var(--color-token-text-primary, CanvasText)));
  --ot-secondary: var(--color-text-secondary, var(--color-token-text-secondary, var(--ot-text)));
  --ot-muted: var(--color-text-tertiary, var(--color-token-text-tertiary, #888));
  --ot-line: var(--color-border-light, var(--color-token-border-light, #8883));
  --ot-hover: var(--color-token-list-hover-background, #8882);
  --ot-selected: var(--color-token-list-active-selection-background, var(--color-background-secondary-soft-alpha-hover, #8883));
  --ot-primary: var(--color-background-primary-solid, var(--ot-text));
  --ot-on-primary: var(--color-text-primary-solid, var(--ot-surface));
  --ot-focus: var(--color-border-focus, var(--color-token-focus-border, #4b8cff));
  --ot-danger: var(--color-text-danger, #d95c5c);
  color: var(--ot-text); font: inherit; font-size: 13px; line-height: 1.5; color-scheme: inherit;
}
* { box-sizing: border-box; }
[hidden] { display: none !important; }
button, input, textarea { color: inherit; font: inherit; }
button { padding: 0; border: 0; border-radius: 6px; background: transparent; cursor: pointer; transition: background 100ms ease, color 100ms ease; }
button:disabled { opacity: .5; cursor: default; }
button:hover:not(:disabled) { background: var(--ot-hover); }
button:focus-visible, summary:focus-visible, a:focus-visible { outline: 2px solid var(--ot-focus); outline-offset: 2px; }
svg { display: block; width: 16px; height: 16px; flex: none; }
a { color: var(--color-text-link, var(--ot-secondary)); text-underline-offset: 3px; }
input, textarea { min-width: 0; padding: 7px 9px; border: 1px solid var(--ot-line); border-radius: 8px; background: var(--ot-control); }
input:focus-visible, textarea:focus-visible { outline: 0; border-color: var(--ot-focus); box-shadow: 0 0 0 2px color-mix(in srgb, var(--ot-focus) 18%, transparent); }
input::placeholder, textarea::placeholder { color: var(--ot-muted); }
.ot-overlay { position: fixed; inset: 0; z-index: 10000; display: grid; place-items: center; padding: 24px; background: #0006; backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px); animation: ot-fade-in 140ms ease-out; }
.ot-panel { position: relative; display: flex; flex-direction: column; width: min(680px, calc(100vw - 48px)); height: min(680px, calc(100vh - 48px)); max-height: calc(100vh - 48px); border: 1px solid var(--ot-line); border-radius: 16px; background: var(--ot-surface); color: var(--ot-text); box-shadow: 0 24px 70px #0007, 0 4px 18px #0003; overflow: hidden; outline: none; animation: ot-dialog-in 180ms cubic-bezier(.2,.8,.2,1); }
.ot-panel.has-detail { width: min(960px, calc(100vw - 48px)); }
.ot-header { display: flex; align-items: center; gap: 12px; padding: 15px 16px 12px; border-bottom: 1px solid var(--ot-line); }
.ot-header h2 { margin: 0; font-size: 17px; font-weight: 650; }
.ot-header-actions { display: flex; gap: 4px; margin-left: auto; }
.ot-header-actions button { display: grid; width: 28px; height: 28px; place-items: center; border-radius: 7px; color: var(--ot-muted); }
.ot-header-actions button:hover { color: var(--ot-text); }
.ot-workspace { display: grid; grid-template-columns: minmax(0, 1fr); flex: 1; min-height: 0; }
.has-detail .ot-workspace { grid-template-columns: minmax(320px, .85fr) minmax(360px, 1.15fr); }
.ot-list { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.has-detail .ot-list { border-right: 1px solid var(--ot-line); }
.ot-list-tools { padding: 12px 16px 8px; }
.ot-list-toolbar { display: flex; align-items: center; gap: 8px; }
.ot-search-field { display: flex; flex: 1; align-items: center; min-width: 0; height: 36px; padding: 0 9px; border: 1px solid transparent; border-radius: 8px; background: var(--ot-control); color: var(--ot-muted); }
.ot-search-field:focus-within { border-color: var(--ot-focus); }
.ot-search { width: 100%; height: 100%; padding: 0 7px; border: 0; background: transparent; color: var(--ot-text); }
.ot-search:focus-visible { box-shadow: none; }
.ot-search-field button { display: grid; flex: none; width: 22px; height: 22px; place-items: center; }
.ot-search-field button svg { width: 13px; height: 13px; }
.ot-new-task { display: flex; flex: none; align-items: center; gap: 5px; height: 36px; padding: 0 10px; border: 1px solid var(--ot-line); border-radius: 8px; font-size: 12px; font-weight: 500; white-space: nowrap; }
.ot-new-task[aria-expanded="true"] { background: var(--ot-control); }
.ot-filter-count { margin-left: 5px; color: var(--ot-muted); font-size: 11px; font-weight: 400; font-variant-numeric: tabular-nums; }
.ot-filters { display: flex; gap: 4px; margin-top: 10px; }
.ot-filters button { height: 28px; padding: 0 9px; color: var(--ot-secondary); font-size: 12px; white-space: nowrap; }
.ot-filters button.is-active { color: var(--ot-text); background: var(--ot-control); font-weight: 500; }
.ot-filters button.is-active .ot-filter-count { color: var(--ot-secondary); }
.ot-quick-add { margin-top: 10px; }
.ot-capture-field { display: flex; align-items: center; gap: 4px; padding: 4px; border: 1px solid var(--ot-line); border-radius: 8px; }
.ot-capture-field:focus-within { border-color: var(--ot-focus); box-shadow: 0 0 0 2px color-mix(in srgb, var(--ot-focus) 12%, transparent); }
.ot-capture-field input { flex: 1; width: 100%; height: 30px; padding: 4px 7px; border: 0; border-radius: 4px; background: transparent; }
.ot-capture-field input:focus-visible { box-shadow: none; }
.ot-capture-field button { flex: none; height: 28px; font-size: 12px; }
.ot-create-submit { padding: 0 10px; }
.ot-create-submit:disabled { background: var(--ot-control); color: var(--ot-muted); opacity: 1; }
.ot-capture-cancel { display: grid; width: 28px; place-items: center; color: var(--ot-muted); }
.ot-capture-hint { margin: 5px 2px 0; color: var(--ot-muted); font-size: 11px; }
.ot-tree-scroll { flex: 1; overflow: auto; padding: 0 12px 20px; overscroll-behavior: contain; }
.ot-tree, .ot-children { margin: 0; padding: 0; list-style: none; }
.ot-children { margin-left: 20px; padding-left: 3px; border-left: 1px solid var(--ot-line); }
.ot-row { display: grid; grid-template-columns: 18px 26px minmax(0, 1fr) auto 24px; align-items: center; min-height: 40px; column-gap: 2px; margin: 1px 0; padding: 3px 4px; border-radius: 8px; }
.ot-row:hover { background: var(--ot-hover); }
.ot-row.is-selected { background: var(--ot-selected); }
.ot-expand, .ot-expand-space { display: grid; width: 18px; height: 28px; place-items: center; color: var(--ot-muted); }
.ot-expand svg { width: 14px; height: 14px; }
.ot-expand.is-expanded svg { transform: rotate(90deg); }
.ot-check { display: grid; width: 26px; height: 28px; place-items: center; }
.ot-check svg { width: 20px; height: 20px; color: var(--ot-muted); }
.ot-check.is-doing svg, .ot-check[aria-pressed="true"] svg { color: var(--ot-text); }
.ot-task-name { min-width: 0; padding: 6px 4px; text-align: left; overflow-wrap: anywhere; line-height: 1.5; }
.ot-tree > .ot-branch > .ot-row .ot-task-name { font-weight: 500; }
.ot-task-path { display: block; margin-top: 3px; color: var(--ot-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; font-weight: 400; }
.ot-draft-dot { color: var(--ot-focus); }
.ot-task-name:hover, .ot-child-title:hover { background: transparent !important; }
.is-done .ot-task-name > span:first-child, .is-done .ot-child-title { color: var(--ot-muted); text-decoration: line-through; }
.ot-row-meta { padding: 0 4px; color: var(--ot-muted); font-size: 11px; font-variant-numeric: tabular-nums; }
.ot-row-meta time { display: block; }
.ot-row-meta .is-overdue { color: var(--ot-danger); }
.ot-row-delete { display: grid; width: 24px; height: 28px; place-items: center; color: var(--ot-muted); opacity: 0; }
.ot-row:hover .ot-row-delete, .ot-row:focus-within .ot-row-delete, .ot-row.is-selected .ot-row-delete, .ot-detail-child:hover .ot-row-delete, .ot-detail-child:focus-within .ot-row-delete { opacity: 1; }
.ot-row-delete:hover:not(:disabled), .ot-delete:hover:not(:disabled) { color: var(--ot-danger); background: color-mix(in srgb, var(--ot-danger) 9%, transparent); }
.ot-detail { min-width: 0; overflow: auto; overscroll-behavior: contain; }
.ot-detail-content { padding: 16px 20px 56px; }
.ot-detail-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 16px; }
.ot-detail-actions { display: flex; align-items: center; gap: 6px; }
.ot-detail-close { display: grid; width: 28px; height: 28px; place-items: center; color: var(--ot-muted); }
.ot-status-select.orbit-ui-select-trigger { width: auto; min-height: 30px; padding: 4px 8px; border-color: transparent; background: var(--ot-control); color: var(--ot-secondary); font-size: 12px; }
.ot-delete { display: flex; align-items: center; gap: 5px; padding: 5px 7px; color: var(--ot-muted); font-size: 12px; }
.ot-deleted-label { color: var(--ot-muted); font-size: 12px; }
.ot-parent-link { display: block; max-width: 100%; margin: -2px 0 10px; color: var(--ot-muted); font-size: 12px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; text-align: left; }
.ot-title-input { display: block; width: 100%; min-height: 30px; padding: 0 2px; border: 1px solid transparent; border-radius: 4px; background: transparent; font-size: 18px; font-weight: 650; line-height: 1.5; resize: none; overflow: hidden; }
.ot-title-input:disabled { opacity: 1; }
.ot-description { position: relative; margin: 16px 0 10px; }
.ot-description-text { padding-right: 24px; color: var(--ot-secondary); white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.7; }
.ot-description-text a { color: var(--color-text-link, var(--ot-text)); }
.ot-edit-description { position: absolute; top: -2px; right: -2px; display: grid; width: 28px; height: 28px; place-items: center; color: var(--ot-muted); }
.ot-add-description { padding: 4px 2px; color: var(--ot-muted); }
.ot-description textarea { width: 100%; min-height: 88px; max-height: 300px; padding: 8px; line-height: 1.7; resize: vertical; }
.ot-links { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; }
.ot-links:empty { display: none; }
.ot-links a { text-decoration: none; }
.ot-links a:hover { text-decoration: underline; }
.ot-links button { color: var(--ot-secondary); }
.ot-metadata { margin: 16px 0; }
.ot-metadata summary { display: flex; align-items: center; gap: 6px; padding: 8px 0; color: var(--ot-muted); font-size: 12px; list-style: none; cursor: pointer; }
.ot-metadata summary::-webkit-details-marker { display: none; }
.ot-metadata summary svg { width: 12px; height: 12px; }
.ot-metadata[open] summary svg { transform: rotate(90deg); }
.ot-metadata-preview { margin-left: auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%; }
.ot-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 0; padding: 8px 0; border: 0; }
.ot-fields label { display: flex; flex-direction: column; gap: 6px; color: var(--ot-muted); font-size: 12px; }
.ot-fields input, .ot-fields .orbit-ui-select-trigger { width: 100%; color: var(--ot-text); font-size: 13px; }
.ot-field-wide { grid-column: 1 / -1; }
.ot-save-bar { display: flex; justify-content: flex-end; gap: 6px; margin: 12px 0 16px; font-size: 12px; }
.ot-save-bar button { padding: 6px 12px; border: 1px solid var(--ot-line); border-radius: 7px; }
.ot-primary { background: var(--ot-primary); color: var(--ot-on-primary); }
.ot-primary:hover:not(:disabled) { background: var(--color-background-primary-solid-hover, var(--ot-primary)); }
.ot-subtasks { padding-top: 16px; border-top: 1px solid var(--ot-line); }
.ot-subtask-heading { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; color: var(--ot-muted); font-size: 12px; font-variant-numeric: tabular-nums; }
.ot-subtask-heading > span:first-child { margin-right: auto; color: var(--ot-secondary); font-weight: 600; }
.ot-detail-child { display: flex; align-items: center; gap: 6px; min-height: 40px; margin: 0 -6px; padding: 4px 2px; border-radius: 6px; }
.ot-detail-child:hover { background: var(--ot-hover); }
.ot-child-title { flex: 1; min-width: 0; padding: 5px 0; text-align: left; overflow-wrap: anywhere; }
.ot-add-child { min-height: 36px; margin: 6px 0 0; padding-left: 3px; }
.ot-add-child { display: flex; align-items: center; gap: 7px; }
.ot-add-child > svg { color: var(--ot-muted); }
.ot-add-child input { width: 100%; padding: 8px 0; border: 0; border-radius: 0; background: transparent; }
.ot-add-child button { flex: none; padding: 4px 6px; font-size: 12px; }
.ot-add-child input:focus-visible { box-shadow: none; }
.ot-add-child:focus-within { border-radius: 6px; box-shadow: 0 0 0 1px var(--ot-focus); }
.ot-toast { position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 12px; width: max-content; max-width: calc(100% - 32px); padding: 8px 10px 8px 14px; border: 1px solid var(--ot-line); border-radius: 10px; background: var(--ot-menu-surface); box-shadow: 0 4px 18px #0003; font-size: 12px; }
.ot-toast > button { flex: none; padding: 4px; }
.ot-toast > button:not(.ot-toast-close) { font-weight: 600; }
.ot-toast-close { color: var(--ot-muted); }
.ot-empty { padding: 52px 16px; color: var(--ot-muted); text-align: center; font-size: 13px; }
.ot-error { padding: 10px 16px; border-bottom: 1px solid var(--ot-line); background: color-mix(in srgb, var(--ot-danger) 8%, transparent); color: var(--ot-danger); font-size: 12px; }
.ot-conflict { margin-bottom: 12px; padding: 10px; border: 1px solid var(--ot-line); border-radius: 8px; background: var(--ot-control); color: var(--ot-secondary); font-size: 12px; }
.ot-conflict button { margin-left: 6px; text-decoration: underline; }
.ot-confirm { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--ot-line); background: var(--ot-menu-surface); font-size: 12px; }
.ot-confirm > div { flex: 1; min-width: 0; }
.ot-confirm strong { display: block; overflow-wrap: anywhere; font-weight: 600; }
.ot-confirm p { margin: 4px 0 0; color: var(--ot-secondary); }
.ot-confirm > button { flex: none; padding: 6px 10px; border: 1px solid var(--ot-line); }
@keyframes ot-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes ot-dialog-in { from { opacity: 0; transform: translateY(6px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
@media (hover: none) { .ot-row-delete { opacity: 1; } }
@media (max-width: 720px) {
  .ot-overlay { padding: 10px; }
  .ot-panel, .ot-panel.has-detail { width: calc(100vw - 20px); height: min(680px, calc(100vh - 20px)); max-height: calc(100vh - 20px); }
  .has-detail .ot-workspace { grid-template-columns: minmax(0, 1fr); }
  .has-detail .ot-list { display: none; }
  .ot-detail-content { padding: 16px 14px 56px; }
  .ot-detail-close { width: auto; padding: 0 7px; gap: 5px; display: flex; }
  .ot-detail-close::after { content: "\u8FD4\u56DE\u5217\u8868"; font-size: 12px; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
`;

  // src/injected/sidebar-launcher.ts
  function navigationTemplate() {
    const buttons = [...document.querySelectorAll("button")];
    for (const labels of [["Plugins", "\u63D2\u4EF6"], ["Tools", "Tool", "\u5DE5\u5177"]]) {
      const matches = buttons.filter((button2) => labels.includes(button2.textContent?.trim() ?? "") || labels.includes(button2.getAttribute("aria-label") ?? ""));
      const button = matches.find((item) => item.closest("nav, aside")) ?? matches[0];
      if (button) return button;
    }
  }
  function todoIcon() {
    const icon2 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon2.setAttribute("viewBox", "0 0 24 24");
    icon2.setAttribute("fill", "none");
    icon2.setAttribute("stroke", "currentColor");
    icon2.setAttribute("stroke-width", "1.7");
    icon2.setAttribute("stroke-linecap", "round");
    icon2.setAttribute("stroke-linejoin", "round");
    const path = document.createElementNS(icon2.namespaceURI, "path");
    path.setAttribute("d", "m3 6 1.5 1.5L7 5m-4 7 1.5 1.5L7 11m-4 7 1.5 1.5L7 17M11 6h10M11 12h10M11 18h10");
    icon2.append(path);
    return icon2;
  }
  function mountSidebarLauncher(onOpen) {
    let control = null;
    let anchor = null;
    let frame = null;
    let expanded = false;
    const reconcile = () => {
      if (control?.element.isConnected && anchor?.isConnected) return;
      control?.dispose();
      control = null;
      const template = navigationTemplate();
      if (!template) return;
      const wrapper = template.parentElement;
      anchor = wrapper && getComputedStyle(wrapper).display === "contents" ? wrapper : template;
      control = createSidebarButton({
        id: "orbit-todo-launcher",
        label: "Todo",
        icon: todoIcon(),
        template,
        ariaLabel: "\u6253\u5F00\u5F85\u529E\u4EFB\u52A1",
        tooltip: { label: "\u5F85\u529E" },
        onClick: onOpen
      });
      control.element.setAttribute("aria-haspopup", "dialog");
      control.element.setAttribute("aria-expanded", String(expanded));
      anchor.insertAdjacentElement("afterend", control.element);
    };
    const observer = new MutationObserver(() => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        reconcile();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    reconcile();
    return {
      element: () => control?.element ?? null,
      setExpanded(value) {
        expanded = value;
        control?.element.setAttribute("aria-expanded", String(value));
      },
      dispose() {
        observer.disconnect();
        if (frame !== null) cancelAnimationFrame(frame);
        control?.dispose();
        control = null;
      }
    };
  }

  // ../../node_modules/preact/compat/dist/compat.module.js
  function g3(n2, t3) {
    for (var e3 in t3) n2[e3] = t3[e3];
    return n2;
  }
  function E2(n2, t3) {
    for (var e3 in n2) if ("__source" !== e3 && !(e3 in t3)) return true;
    for (var r3 in t3) if ("__source" !== r3 && n2[r3] !== t3[r3]) return true;
    return false;
  }
  function M2(n2, t3) {
    this.props = n2, this.context = t3;
  }
  (M2.prototype = new C()).isPureReactComponent = true, M2.prototype.shouldComponentUpdate = function(n2, t3) {
    return E2(this.props, n2) || E2(this.state, t3);
  };
  var T3 = l.__b;
  l.__b = function(n2) {
    n2.type && n2.type.__f && n2.ref && (n2.props.ref = n2.ref, n2.ref = null), T3 && T3(n2);
  };
  var A3 = "undefined" != typeof Symbol && Symbol.for && /* @__PURE__ */ Symbol.for("react.forward_ref") || 3911;
  var O2 = l.__e;
  l.__e = function(n2, t3, e3, r3) {
    if (n2.then) {
      for (var u4, o3 = t3; o3 = o3.__; ) if ((u4 = o3.__c) && u4.__c) return null == t3.__e && (t3.__e = e3.__e, t3.__k = e3.__k || []), u4.__c(n2, t3);
    }
    O2(n2, t3, e3, r3);
  };
  var U2 = l.unmount;
  function V2(n2, t3, e3) {
    return n2 && (n2.__c && n2.__c.__H && (n2.__c.__H.__.forEach(function(n3) {
      "function" == typeof n3.__c && n3.__c();
    }), n2.__c.__H = null), null != (n2 = g3({}, n2)).__c && (n2.__c.__P === e3 && (n2.__c.__P = t3), n2.__c.__e = true, n2.__c = null), n2.__k = n2.__k && n2.__k.map(function(n3) {
      return V2(n3, t3, e3);
    })), n2;
  }
  function W2(n2, t3, e3) {
    return n2 && e3 && (n2.__v = null, n2.__k = n2.__k && n2.__k.map(function(n3) {
      return W2(n3, t3, e3);
    }), n2.__c && n2.__c.__P === t3 && (n2.__e && e3.appendChild(n2.__e), n2.__c.__e = true, n2.__c.__P = e3)), n2;
  }
  function P3() {
    this.__u = 0, this.o = null, this.__b = null;
  }
  function j3(n2) {
    var t3 = n2.__ && n2.__.__c;
    return t3 && t3.__a && t3.__a(n2);
  }
  function B3() {
    this.i = null, this.l = null;
  }
  l.unmount = function(n2) {
    var t3 = n2.__c;
    t3 && (t3.__z = true), t3 && t3.__R && t3.__R(), t3 && 32 & n2.__u && (n2.type = null), U2 && U2(n2);
  }, (P3.prototype = new C()).__c = function(n2, t3) {
    var e3 = t3.__c, r3 = this;
    null == r3.o && (r3.o = []), r3.o.push(e3);
    var u4 = j3(r3.__v), o3 = false, i3 = function() {
      o3 || r3.__z || (o3 = true, e3.__R = null, u4 ? u4(f4) : f4());
    };
    e3.__R = i3;
    var l3 = e3.__P;
    e3.__P = null;
    var f4 = function() {
      if (!--r3.__u) {
        if (r3.state.__a) {
          var n3 = r3.state.__a;
          r3.__v.__k[0] = W2(n3, n3.__c.__P, n3.__c.__O);
        }
        var t4;
        for (r3.setState({ __a: r3.__b = null }); t4 = r3.o.pop(); ) t4.__P = l3, t4.forceUpdate();
      }
    };
    r3.__u++ || 32 & t3.__u || r3.setState({ __a: r3.__b = r3.__v.__k[0] }), n2.then(i3, i3);
  }, P3.prototype.componentWillUnmount = function() {
    this.o = [];
  }, P3.prototype.render = function(n2, e3) {
    if (this.__b) {
      if (this.__v.__k) {
        var r3 = document.createElement("div"), o3 = this.__v.__k[0].__c;
        this.__v.__k[0] = V2(this.__b, r3, o3.__O = o3.__P);
      }
      this.__b = null;
    }
    var i3 = e3.__a && k(S, null, n2.fallback);
    return i3 && (i3.__u &= -33), [k(S, null, e3.__a ? null : n2.children), i3];
  };
  var H2 = function(n2, t3, e3) {
    if (++e3[1] === e3[0] && n2.l.delete(t3), n2.props.revealOrder && ("t" !== n2.props.revealOrder[0] || !n2.l.size)) for (e3 = n2.i; e3; ) {
      for (; e3.length > 3; ) e3.pop()();
      if (e3[1] < e3[0]) break;
      n2.i = e3 = e3[2];
    }
  };
  function Z(n2) {
    return this.getChildContext = function() {
      return n2.context;
    }, n2.children;
  }
  function Y(n2) {
    var e3 = this, r3 = n2.h;
    if (e3.componentWillUnmount = function() {
      R(null, e3.v), e3.v = null, e3.h = null;
    }, e3.h && e3.h !== r3 && e3.componentWillUnmount(), !e3.v) {
      for (var u4 = e3.__v; null !== u4 && !u4.__m && null !== u4.__; ) u4 = u4.__;
      e3.h = r3, e3.v = { nodeType: 1, parentNode: r3, childNodes: [], __k: { __m: u4.__m }, contains: function() {
        return true;
      }, namespaceURI: r3.namespaceURI, insertBefore: function(n3, t3) {
        this.childNodes.push(n3), e3.h.insertBefore(n3, t3);
      }, removeChild: function(n3) {
        this.childNodes.splice(this.childNodes.indexOf(n3) >>> 1, 1), e3.h.removeChild(n3);
      } };
    }
    R(k(Z, { context: e3.context }, n2.__v), e3.v);
  }
  function $2(n2, e3) {
    var r3 = k(Y, { __v: n2, h: e3 });
    return r3.containerInfo = e3, r3;
  }
  (B3.prototype = new C()).__a = function(n2) {
    var t3 = this, e3 = j3(t3.__v), r3 = t3.l.get(n2);
    return r3[0]++, function(u4) {
      var o3 = function() {
        t3.props.revealOrder ? (r3.push(u4), H2(t3, n2, r3)) : u4();
      };
      e3 ? e3(o3) : o3();
    };
  }, B3.prototype.render = function(n2) {
    this.i = null, this.l = /* @__PURE__ */ new Map();
    var t3 = F(n2.children);
    n2.revealOrder && "b" === n2.revealOrder[0] && t3.reverse();
    for (var e3 = t3.length; e3--; ) this.l.set(t3[e3], this.i = [1, 0, this.i]);
    return n2.children;
  }, B3.prototype.componentDidUpdate = B3.prototype.componentDidMount = function() {
    var n2 = this;
    this.l.forEach(function(t3, e3) {
      H2(n2, e3, t3);
    });
  };
  var q3 = "undefined" != typeof Symbol && Symbol.for && /* @__PURE__ */ Symbol.for("react.element") || 60103;
  var G2 = /^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|dominant|fill|flood|font|glyph(?!R)|horiz|image(!S)|letter|lighting|marker(?!H|W|U)|overline|paint|pointer|shape|stop|strikethrough|stroke|text(?!L)|transform|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/;
  var J2 = /^on(Ani|Tra|Tou|BeforeInp|Compo)/;
  var K2 = /[A-Z0-9]/g;
  var Q2 = "undefined" != typeof document;
  var X2 = function(n2) {
    return ("undefined" != typeof Symbol && "symbol" == typeof /* @__PURE__ */ Symbol() ? /fil|che|rad/ : /fil|che|ra/).test(n2);
  };
  C.prototype.isReactComponent = true, ["componentWillMount", "componentWillReceiveProps", "componentWillUpdate"].forEach(function(t3) {
    Object.defineProperty(C.prototype, t3, { configurable: true, get: function() {
      return this["UNSAFE_" + t3];
    }, set: function(n2) {
      Object.defineProperty(this, t3, { configurable: true, writable: true, value: n2 });
    } });
  });
  var en = l.event;
  l.event = function(n2) {
    return en && (n2 = en(n2)), n2.persist = function() {
    }, n2.isPropagationStopped = function() {
      return this.cancelBubble;
    }, n2.isDefaultPrevented = function() {
      return this.defaultPrevented;
    }, n2.nativeEvent = n2;
  };
  var rn;
  var un = { configurable: true, get: function() {
    return this.class;
  } };
  var on = l.vnode;
  l.vnode = function(n2) {
    "string" == typeof n2.type && (function(n3) {
      var t3 = n3.props, e3 = n3.type, u4 = {}, o3 = -1 == e3.indexOf("-");
      for (var i3 in t3) {
        var l3 = t3[i3];
        if (!("value" === i3 && "defaultValue" in t3 && null == l3 || Q2 && "children" === i3 && "noscript" === e3 || "class" === i3 || "className" === i3)) {
          var f4 = i3.toLowerCase();
          "defaultValue" === i3 && "value" in t3 && null == t3.value ? i3 = "value" : "download" === i3 && true === l3 ? l3 = "" : "translate" === f4 && "no" === l3 ? l3 = false : "o" === f4[0] && "n" === f4[1] ? "ondoubleclick" === f4 ? i3 = "ondblclick" : "onchange" !== f4 || "input" !== e3 && "textarea" !== e3 || X2(t3.type) ? "onfocus" === f4 ? i3 = "onfocusin" : "onblur" === f4 ? i3 = "onfocusout" : J2.test(i3) && (i3 = f4) : f4 = i3 = "oninput" : o3 && G2.test(i3) ? i3 = i3.replace(K2, "-$&").toLowerCase() : null === l3 && (l3 = void 0), "oninput" === f4 && u4[i3 = f4] && (i3 = "oninputCapture"), u4[i3] = l3;
        }
      }
      "select" == e3 && (u4.multiple && Array.isArray(u4.value) && (u4.value = F(t3.children).forEach(function(n4) {
        n4.props.selected = -1 != u4.value.indexOf(n4.props.value);
      })), null != u4.defaultValue && (u4.value = F(t3.children).forEach(function(n4) {
        n4.props.selected = u4.multiple ? -1 != u4.defaultValue.indexOf(n4.props.value) : u4.defaultValue == n4.props.value;
      }))), t3.class && !t3.className ? (u4.class = t3.class, Object.defineProperty(u4, "className", un)) : t3.className && (u4.class = u4.className = t3.className), n3.props = u4;
    })(n2), n2.$$typeof = q3, on && on(n2);
  };
  var ln = l.__r;
  l.__r = function(n2) {
    ln && ln(n2), rn = n2.__c;
  };
  var fn = l.diffed;
  l.diffed = function(n2) {
    fn && fn(n2);
    var t3 = n2.props, e3 = n2.__e;
    null != e3 && "textarea" === n2.type && "value" in t3 && t3.value !== e3.value && (e3.value = null == t3.value ? "" : t3.value), rn = null;
  };

  // src/injected/home-tasks.tsx
  function HomeTasks({ api, subscribe, openTask, header }) {
    const store = useTaskStore(api, subscribe), snapshot = store.active;
    const [expandedIds, setExpandedIds] = d2(/* @__PURE__ */ new Set()), [today, setToday] = d2(localDate());
    const [completed, setCompleted] = d2(null), [confirmation, setConfirmation] = d2(null);
    const root = A2(null), confirmFocus = A2(null), undoFocus = A2(null);
    const view = buildTaskView(snapshot.items, "open", "");
    const error = store.error || snapshot.error;
    const subtree = (task) => [task, ...(view.children.get(task.id) ?? []).flatMap(subtree)];
    const group = (task) => {
      const items = subtree(task);
      if (items.some((item) => item.status === "doing")) return "doing";
      if (items.some((item) => item.dueDate && item.dueDate < today)) return "overdue";
      return "pending";
    };
    const groups = [["doing", "\u8FDB\u884C\u4E2D"], ["overdue", "\u5DF2\u903E\u671F"], ["pending", "\u5F85\u529E"]].map(([value, label]) => ({ value, label, items: view.roots.filter((task) => group(task) === value) })).filter((group2) => group2.items.length);
    h2(() => {
      if (!header) return;
      header.summary.textContent = snapshot.loading && !snapshot.items.length ? "" : String(view.matches.length);
      header.summary.setAttribute("aria-label", `\u5171 ${view.matches.length} \u9879\u672A\u5B8C\u6210`);
      header.setCompact(!snapshot.loading && !error && view.matches.length === 0);
    });
    h2(() => {
      const timer = setInterval(() => setToday(localDate()), 6e4);
      return () => clearInterval(timer);
    }, []);
    h2(() => {
      if (confirmation) root.current?.querySelector(".oth-confirm .ot-primary")?.focus();
    }, [confirmation]);
    const finish = async (task) => {
      const result = await store.mutate("complete", { id: task.id, ifRevision: task.revision, ifGeneration: snapshot.generation });
      if (!result) return;
      setConfirmation(null);
      setCompleted(result);
      requestAnimationFrame(() => undoFocus.current?.focus({ preventScroll: true }));
    };
    const complete = (task) => {
      if (subtree(task).length > 1) {
        const scope = root.current?.getRootNode();
        confirmFocus.current = scope instanceof ShadowRoot ? scope.activeElement : document.activeElement;
        setConfirmation(task);
      } else void finish(task);
    };
    const cancel = () => {
      setConfirmation(null);
      requestAnimationFrame(() => confirmFocus.current?.focus());
    };
    const row = (task) => {
      const children = view.children.get(task.id) ?? [], expanded = expandedIds.has(task.id), blocked = store.busy || Boolean(confirmation);
      return /* @__PURE__ */ u3("li", { children: [
        /* @__PURE__ */ u3("div", { class: "oth-task-row", children: [
          children.length ? /* @__PURE__ */ u3(
            "button",
            {
              class: `ot-expand ${expanded ? "is-expanded" : ""}`,
              "aria-label": `${expanded ? "\u6298\u53E0" : "\u5C55\u5F00"} ${task.title}`,
              "aria-expanded": expanded,
              disabled: blocked,
              onClick: () => setExpandedIds((before) => {
                const next = new Set(before);
                if (next.has(task.id)) next.delete(task.id);
                else next.add(task.id);
                return next;
              }),
              children: /* @__PURE__ */ u3(Icon, { name: "chevron" })
            }
          ) : /* @__PURE__ */ u3("span", { class: "ot-expand-space", "aria-hidden": "true" }),
          /* @__PURE__ */ u3(TaskCheck, { task, disabled: blocked, onToggle: () => complete(task) }),
          /* @__PURE__ */ u3("button", { class: "oth-task-title", title: task.title, disabled: Boolean(confirmation), onClick: () => openTask(task.id), children: task.title }),
          task.project && /* @__PURE__ */ u3("span", { class: "oth-project", title: task.project, children: task.project }),
          task.dueDate && /* @__PURE__ */ u3("time", { class: task.dueDate < today ? "is-overdue" : "", dateTime: task.dueDate, title: `\u622A\u6B62 ${task.dueDate}`, children: dueLabel(task.dueDate, today) })
        ] }),
        children.length > 0 && expanded && /* @__PURE__ */ u3("ul", { class: "oth-children", children: children.map(row) })
      ] }, task.id);
    };
    const allTasks = /* @__PURE__ */ u3("button", { disabled: Boolean(confirmation), onClick: () => openTask(null), children: "\u5168\u90E8\u4EFB\u52A1" });
    return /* @__PURE__ */ u3("div", { class: "oth-home", ref: root, children: [
      header ? $2(allTasks, header.actions) : /* @__PURE__ */ u3("header", { class: "oth-header", children: [
        /* @__PURE__ */ u3("span", { children: !snapshot.loading && view.matches.length ? `${view.matches.length} \u9879\u672A\u5B8C\u6210` : "" }),
        allTasks
      ] }),
      error && /* @__PURE__ */ u3("div", { class: "oth-error", role: "alert", children: [
        /* @__PURE__ */ u3("span", { children: error }),
        /* @__PURE__ */ u3("button", { onClick: () => {
          void store.refresh();
        }, children: "\u91CD\u8BD5" })
      ] }),
      confirmation && /* @__PURE__ */ u3("div", { class: "oth-confirm", role: "alertdialog", "aria-modal": "true", "aria-label": "\u5B8C\u6210\u7236\u4EFB\u52A1", onKeyDown: (event) => {
        if (event.key === "Escape" && !event.isComposing) {
          event.preventDefault();
          cancel();
        }
        if (event.key === "Tab") {
          const buttons = [...event.currentTarget.querySelectorAll("button:not(:disabled)")];
          const scope = event.currentTarget.getRootNode(), active = scope instanceof ShadowRoot ? scope.activeElement : document.activeElement;
          if (event.shiftKey && active === buttons[0]) {
            event.preventDefault();
            buttons.at(-1)?.focus();
          } else if (!event.shiftKey && active === buttons.at(-1)) {
            event.preventDefault();
            buttons[0]?.focus();
          }
        }
      }, children: [
        /* @__PURE__ */ u3("p", { children: [
          "\u540C\u65F6\u5B8C\u6210\u300C",
          confirmation.title,
          "\u300D\u53CA ",
          subtree(confirmation).length - 1,
          " \u4E2A\u5B50\u4EFB\u52A1\uFF1F"
        ] }),
        /* @__PURE__ */ u3("div", { children: [
          /* @__PURE__ */ u3("button", { disabled: store.busy, onClick: cancel, children: "\u53D6\u6D88" }),
          /* @__PURE__ */ u3("button", { class: "ot-primary", disabled: store.busy, onClick: () => {
            void finish(confirmation);
          }, children: "\u4E00\u5E76\u5B8C\u6210" })
        ] })
      ] }),
      snapshot.loading && !snapshot.items.length ? /* @__PURE__ */ u3("div", { class: "oth-empty", role: "status", children: "\u6B63\u5728\u8BFB\u53D6\u5F85\u529E\u2026" }) : !error && !view.matches.length ? /* @__PURE__ */ u3("div", { class: "oth-empty", children: [
        /* @__PURE__ */ u3("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.5", "aria-hidden": "true", children: [
          /* @__PURE__ */ u3("circle", { cx: "12", cy: "12", r: "9" }),
          /* @__PURE__ */ u3("path", { d: "m8 12 3 3 5-6" })
        ] }),
        /* @__PURE__ */ u3("h3", { children: "\u90FD\u5B8C\u6210\u4E86" })
      ] }) : /* @__PURE__ */ u3("div", { class: "oth-task-scroll", role: "region", "aria-label": "\u5F85\u529E\u5217\u8868", tabIndex: 0, children: groups.map(
        ({ value, label, items }) => /* @__PURE__ */ u3("section", { class: `oth-group ${value === "overdue" ? "is-overdue" : ""}`, "aria-label": label, children: [
          groups.length > 1 && /* @__PURE__ */ u3("h3", { children: [
            label,
            /* @__PURE__ */ u3("span", { children: items.length })
          ] }),
          /* @__PURE__ */ u3("ul", { children: items.map((task) => /* @__PURE__ */ u3("li", { class: "oth-task-group", children: /* @__PURE__ */ u3("ul", { children: row(task) }) }, task.id)) })
        ] }, value)
      ) }),
      completed && /* @__PURE__ */ u3("div", { class: "oth-toast", children: [
        /* @__PURE__ */ u3("span", { role: "status", children: completed.undo.length > 1 ? `\u5DF2\u5B8C\u6210 ${completed.undo.length} \u9879\u4EFB\u52A1` : "\u5DF2\u5B8C\u6210\u4EFB\u52A1" }),
        /* @__PURE__ */ u3("button", { ref: undoFocus, disabled: store.busy || Boolean(confirmation), onClick: () => {
          void store.mutate("undoCompletion", { changes: completed.undo }).then((result) => {
            if (result) {
              setCompleted(null);
              (header?.actions ?? root.current)?.querySelector("button")?.focus();
            }
          });
        }, children: "\u64A4\u9500" }),
        /* @__PURE__ */ u3("button", { class: "oth-toast-close", "aria-label": "\u5173\u95ED\u63D0\u793A", onClick: () => setCompleted(null), children: /* @__PURE__ */ u3(Icon, { name: "close" }) })
      ] })
    ] });
  }

  // src/injected/home-styles.ts
  var homeStyles = `
:host { display:block; width:100%; }
.oth-home { position:relative; width:100%; }
.oth-header { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:12px; }
.oth-header > span { color:var(--ot-muted); font-size:12px; }
.oth-header > button { flex:none; padding:3px 0; color:var(--ot-secondary); font-size:12px; }
.oth-task-scroll { max-height:min(300px,44vh); overflow-y:auto; overscroll-behavior:contain; scrollbar-width:thin; scrollbar-color:var(--ot-line) transparent; scrollbar-gutter:stable; padding:2px 4px 2px 0; border-radius:7px; }
.oth-task-scroll:focus-visible { outline:2px solid var(--color-border-focused,#6b9eff); outline-offset:3px; }
.oth-group { margin:0 0 16px; }
.oth-group:last-of-type { margin-bottom:0; }
.oth-group h3 { display:flex; align-items:center; gap:8px; margin:0 0 8px; color:var(--ot-secondary); font-size:12px; font-weight:600; }
.oth-group h3 > span { color:var(--ot-muted); font-weight:400; font-variant-numeric:tabular-nums; }
.oth-group.is-overdue h2, .oth-task-row time.is-overdue { color:var(--ot-danger); }
.oth-group ul { list-style:none; margin:0; padding:0; }
.oth-task-group { padding:0; }
.oth-task-row { display:grid; grid-template-columns:16px 24px minmax(0,1fr) auto auto; align-items:center; gap:4px; min-height:36px; padding:2px 6px; border-radius:7px; }
.oth-home .ot-check { width:24px; height:28px; }
.oth-home .ot-check svg { width:16px; height:16px; }
.oth-home .ot-expand,.oth-home .ot-expand-space { width:16px; }
.oth-home .ot-expand svg { width:12px; height:12px; }
.oth-task-row:hover { background:var(--ot-hover); }
.oth-task-title { min-width:0; padding:5px 4px; text-align:left; font-size:13px; line-height:1.5; display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; overflow-wrap:anywhere; }
.oth-task-title:hover { background:transparent !important; }
.oth-task-row time { padding:0 8px; color:var(--ot-muted); font-size:12px; font-variant-numeric:tabular-nums; }
.oth-group .oth-children { margin-left:20px; }
.oth-children .oth-task-title { font-size:13px; color:var(--ot-secondary); }
.oth-project { max-width:160px; color:var(--ot-muted); font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
@media(max-width:620px) { .oth-project { display:none; } }
.oth-empty { display:flex; align-items:center; gap:8px; padding:4px 0; color:var(--ot-muted); }
.oth-empty > svg { width:18px; height:18px; }
.oth-empty h3 { margin:0; font-size:12px; font-weight:400; color:var(--ot-secondary); }
.oth-error { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:20px; padding:12px; border:1px solid var(--ot-line); border-radius:8px; color:var(--ot-danger); font-size:12px; }
.oth-error button { padding:4px 8px; flex:none; color:var(--ot-text); }
.oth-confirm { position:sticky; z-index:1; top:12px; padding:16px; border:1px solid var(--ot-line); border-radius:10px; background:var(--ot-surface); box-shadow:0 4px 16px #0002; }
.oth-confirm p { margin:0 0 12px; }
.oth-confirm > div { display:flex; justify-content:flex-end; gap:8px; }
.oth-confirm button { padding:6px 12px; border:1px solid var(--ot-line); }
.oth-toast { position:sticky; bottom:16px; display:flex; align-items:center; gap:14px; width:max-content; max-width:100%; margin:20px auto 0; padding:8px 10px 8px 14px; border:1px solid var(--ot-line); border-radius:10px; background:var(--ot-menu-surface); box-shadow:0 4px 18px #0003; font-size:12px; }
.oth-toast button { flex:none; padding:4px; font-weight:600; }
.oth-toast-close { color:var(--ot-muted); }
`;

  // src/injected/entry.tsx
  function activate(context) {
    const host = document.createElement("div");
    host.id = "orbit-todo-root";
    const shadow = host.attachShadow({ mode: "open" }), style = document.createElement("style"), root = document.createElement("div");
    style.textContent = styles2;
    shadow.append(style, root);
    document.body.append(host);
    context.onDispose(() => {
      R(null, root);
      host.remove();
    });
    const api = async (method, payload) => unwrap(await context.rpc.call(method, payload, { signal: context.signal }));
    const subscribe = (refresh) => context.events.subscribe("changed", refresh);
    let open = false, selectionRequest;
    let origin = null;
    const close = () => {
      open = false;
      update();
    };
    const launcher = mountSidebarLauncher(() => {
      origin = launcher.element();
      open = true;
      update();
    });
    context.onDispose(launcher.dispose);
    const returnFocus = () => origin?.isConnected ? origin : launcher.element();
    const openTask = (id) => {
      let active = document.activeElement;
      while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
      origin = active instanceof HTMLElement ? active : null;
      selectionRequest = { id, sequence: (selectionRequest?.sequence ?? 0) + 1 };
      open = true;
      update();
    };
    context.onDispose(registerHomeSection({ id: context.id, title: "\u5F85\u529E\u4E8B\u9879", slot: "main", order: 100, mount(container, header) {
      const section = document.createElement("div"), shadow2 = section.attachShadow({ mode: "open" });
      const style2 = document.createElement("style"), content = document.createElement("div");
      style2.textContent = styles2 + homeStyles;
      shadow2.append(style2, content);
      container.append(section);
      R(/* @__PURE__ */ u3(HomeTasks, { api, subscribe, openTask, header }), content);
      return () => {
        R(null, content);
        section.remove();
      };
    } }));
    function update() {
      launcher.setExpanded(open);
      R(/* @__PURE__ */ u3(TodoPanel, { api, subscribe, open, onClose: close, returnFocus, selectionRequest }), root);
    }
    update();
    return { isActive: () => host.isConnected, status: () => ({ version: RUNTIME_VERSION, mounted: host.isConnected, launcherMounted: Boolean(launcher.element()?.isConnected) }) };
  }
  return __toCommonJS(entry_exports);
})();
