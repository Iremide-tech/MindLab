"use client";

import { useEffect } from "react";

/**
 * Adds a Leave control on /dashboard that prompts about saving,
 * then returns to the workspaces home.
 */
export default function DashboardLeaveEnhancer() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.location.pathname.startsWith("/dashboard")) return;

    const btnId = "mindlab-leave-workspace-btn";
    const menuId = "mindlab-leave-workspace-menu";

    function goToWorkspaces(saveFirst: boolean) {
      if (saveFirst) {
        // Trigger the existing Save button if present
        const saveBtn = Array.from(document.querySelectorAll("button")).find(
          (el) => {
            const t = (el.textContent || "").trim().toLowerCase();
            return t === "save" || t === "save map" || t.startsWith("saving");
          }
        );
        if (saveBtn) {
          (saveBtn as HTMLButtonElement).click();
          // Give save a moment, then navigate
          window.setTimeout(() => {
            window.location.href = "/workspaces";
          }, 900);
          return;
        }
      }
      window.location.href = "/workspaces";
    }

    function onLeaveClick() {
      const nodeCount = document.querySelectorAll(".react-flow__node").length;
      if (nodeCount > 0) {
        const save = window.confirm(
          "Save this workspace before leaving?\n\nOK = Save then leave\nCancel = Leave without saving"
        );
        goToWorkspaces(save);
        return;
      }
      window.location.href = "/workspaces";
    }

    function ensureButtons() {
      if (!document.getElementById(btnId)) {
        const header = document.querySelector("header");
        if (header) {
          const btn = document.createElement("button");
          btn.id = btnId;
          btn.type = "button";
          btn.textContent = "Leave";
          btn.setAttribute("aria-label", "Leave workspace");
          btn.className =
            "min-h-10 shrink-0 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white";
          btn.addEventListener("click", onLeaveClick);

          const desktopActions = header.querySelector(
            ".hidden.items-center.gap-2.lg\\:flex, .hidden.lg\\:flex"
          );
          if (desktopActions) {
            desktopActions.appendChild(btn);
          } else {
            // Place near the hamburger / end of the top row
            const topRow = header.querySelector(":scope > div");
            (topRow || header).appendChild(btn);
          }
        }
      }

      // Mobile menu panel (when open)
      if (!document.getElementById(menuId)) {
        const menuPanel = document.querySelector(
          "header .border-t.border-white\\/10, header [class*='border-t']"
        );
        // Also try to find mobile drawer content
        const candidates = Array.from(
          document.querySelectorAll("header button, header div")
        );
        // Inject into mobile menu when "Log out" is visible in a full-width stack
        const logout = Array.from(document.querySelectorAll("button")).find(
          (el) => (el.textContent || "").trim() === "Log out"
        );
        if (logout && logout.parentElement) {
          const existing = document.getElementById(menuId);
          if (!existing) {
            const menuBtn = document.createElement("button");
            menuBtn.id = menuId;
            menuBtn.type = "button";
            menuBtn.textContent = "Leave workspace";
            menuBtn.className =
              "flex w-full items-center justify-between rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-left text-sm font-medium text-white/90";
            menuBtn.addEventListener("click", onLeaveClick);
            logout.parentElement.insertBefore(menuBtn, logout);
          }
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
