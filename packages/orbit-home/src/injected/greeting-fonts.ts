declare const __ORBIT_HOME_DOTO_FONT__: string;
declare const __ORBIT_HOME_CJK_FONT__: string;

export function mountGreetingFonts(document: Document): () => void {
  const style = document.createElement("style");
  // Font faces belong to the document so Chromium can resolve them inside Home's shadow root.
  style.textContent = `
    @font-face { font-family:"Orbit Home Dots"; src:url("${__ORBIT_HOME_DOTO_FONT__}") format("woff2"); font-weight:100 900; font-style:normal; font-display:swap; }
    @font-face { font-family:"Orbit Home CJK Dots"; src:url("${__ORBIT_HOME_CJK_FONT__}") format("woff2"); font-weight:400; font-style:normal; font-display:swap; }
  `;
  document.head.append(style);
  return () => style.remove();
}
