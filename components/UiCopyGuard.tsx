"use client";

import { useEffect } from "react";

/**
 * Replaces leftover provider-branded copy in the workspace UI.
 * Safe no-op when the source strings are already gone.
 */
export default function UiCopyGuard() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const replacements: Array<[RegExp, string]> = [
      [/Gemini is analysing the two topics…/gi, "Analysing the connection between these topics…"],
      [/Gemini is analyzing the two topics…/gi, "Analysing the connection between these topics…"],
      [/\bGemini is analysing\b/gi, "Analysing"],
      [/\bGemini is analyzing\b/gi, "Analyzing"],
    ];

    function scrub(root: ParentNode = document.body) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      let current = walker.nextNode();
      while (current) {
        nodes.push(current as Text);
        current = walker.nextNode();
      }
      for (const node of nodes) {
        let value = node.nodeValue;
        if (!value) continue;
        let next = value;
        for (const [pattern, replacement] of replacements) {
          next = next.replace(pattern, replacement);
        }
        if (next !== value) node.nodeValue = next;
      }
    }

    scrub();
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) scrub(node as ParentNode);
            if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
              let next = node.nodeValue;
              for (const [pattern, replacement] of replacements) {
                next = next.replace(pattern, replacement);
              }
              if (next !== node.nodeValue) node.nodeValue = next;
            }
          });
        }
        if (mutation.type === "characterData" && mutation.target.nodeType === Node.TEXT_NODE) {
          const node = mutation.target as Text;
          let next = node.nodeValue || "";
          for (const [pattern, replacement] of replacements) {
            next = next.replace(pattern, replacement);
          }
          if (next !== node.nodeValue) node.nodeValue = next;
        }
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, []);

  return null;
}
