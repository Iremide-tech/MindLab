"use client";

import { useEffect } from "react";

/**
 * Adds a Leave control on /dashboard that asks whether to save,
 * then returns to the workspaces home.
 */
export default function DashboardLeaveEnhancer() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.location.pathname.startsWith("/dashboard")) return;

    const btnId = "mindlab-leave-workspace-btn";
    const menuId = "mindlab-leave-workspace-menu";

    function clickSaveIfPresent() {
      const saveBtn = Array.from(document.querySelectorAll("button")).find((el) => {
        const t = (el.textContent || "").trim().toLowerCase();
        return t === "save" || t === "save map";
      });
      if (saveBtn && !(saveBtn as HTMLButtonElement).disabled) {
        (saveBtn as HTMLButtonElement).click();
        return true;
      }
      return false;
    }

    function onLeaveClick() {
      const nodeCount = document.querySelectorAll(".react-flow__node").length;

      if (nodeCount > 0) {
        const save = window.confirm(
          "Save this workspace before leaving?\n\nOK = Save then leave\nCancel = Leave without saving"
        );

        if (save) {
          const clicked = clickSaveIfPresent();
          window.setTimeout(
            () => {
              window.location.href = "/workspaces";
            },
            clicked ? 1000 : 0
          );
          return;
        }
      }

      window.location.href = "/workspaces";
    }

    function makeHeaderButton() {
      const btn = document.createElement("button");
      btn.id = btnId;
      btn.type = "button";
      btn.textContent = "Leave";
      btn.setAttribute("aria-label", "Leave workspace");
      btn.className =
        "min-h-10 shrink-0 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white";
      btn.addEventListener("click", onLeaveClick);
      return btn;
    }

    function makeMenuButton() {
      const menuBtn = document.createElement("button");
      menuBtn.id = menuId;
      menuBtn.type = "button";
      menuBtn.textContent = "Leave workspace";
      menuBtn.className =
        "flex w-full items-center justify-between rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-left text-sm font-medium text-white/90";
      menuBtn.addEventListener("click", onLeaveClick);
      return menuBtn;
    }

    function ensureButtons() {
      const header = document.querySelector("header");
      if (!header) return;

      if (!document.getElementById(btnId)) {
        const desktopActions =
          header.querySelector(".hidden.lg\\:flex") ||
          header.querySelector("[class*='lg:flex']");

        if (desktopActions) {
          desktopActions.appendChild(makeHeaderButton());
        } else {
          const topRow = header.querySelector(":scope > div");
          (topRow || header).appendChild(makeHeaderButton());
        }
      }

      if (!document.getElementById(menuId)) {
        const logout = Array.from(document.querySelectorAll("button")).find(
          (el) => (el.textContent || "").trim() === "Log out"
        );
        // Only inject into mobile menu stack (full-width logout), not the desktop strip
        if (
          logout &&
          logout.parentElement &&
          logout.className.includes("w-full")
        ) {
          logout.parentElement.insertBefore(makeMenuButton(), logout);
        }
      }
    }

    ensureButtons();
    const observer = new MutationObserver(() => ensureButtons());
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      document.getElementById(btnId)?.remove();
      document.getElementById(menuId)?.remove();
    };
  }, []);

  return null;
}
