import { copyToClipboard } from "../clipboard";

// Adds hover-highlight + a right-click context menu ("Copy to clipboard" /
// "Save as SVG") to rendered math blocks in the preview pane. Listeners are
// attached to the container via delegation, so they survive preview re-renders.
export function initMathActions(preview: HTMLElement) {
	let currentHover: HTMLElement | null = null;

	function closestMath(target: EventTarget | null): HTMLElement | null {
		if (!(target instanceof HTMLElement)) return null;
		return (
			(target.closest(".katex-display") as HTMLElement | null) ||
			(target.closest(".katex") as HTMLElement | null)
		);
	}

	function setHover(m: HTMLElement | null) {
		if (m === currentHover) return;
		currentHover?.classList.remove("qm-math-hover");
		currentHover = m;
		m?.classList.add("qm-math-hover");
	}

	function getLatex(m: HTMLElement): string | null {
		const ann = m.querySelector('annotation[encoding="application/x-tex"]');
		return ann?.textContent?.trim() || null;
	}

	preview.addEventListener("mouseover", (e) => setHover(closestMath(e.target)));
	preview.addEventListener("mouseleave", () => setHover(null));

	// ---- Context menu ----
	const menu = document.createElement("div");
	menu.className = "context-menu";
	menu.hidden = true;
	menu.innerHTML = `
		<button class="context-item" data-act="copy" type="button">Copy to clipboard</button>
		<button class="context-item" data-act="svg" type="button">Save as SVG</button>`;
	document.body.appendChild(menu);

	let ctxLatex = "";
	let ctxDisplay = false;

	function openMenu(x: number, y: number) {
		menu.hidden = false;
		const rect = menu.getBoundingClientRect();
		menu.style.left = `${Math.min(x, window.innerWidth - rect.width - 8)}px`;
		menu.style.top = `${Math.min(y, window.innerHeight - rect.height - 8)}px`;
	}
	function closeMenu() {
		menu.hidden = true;
	}

	preview.addEventListener("contextmenu", (e) => {
		const m = closestMath(e.target);
		if (!m) return; // leave the native menu for non-math content
		const latex = getLatex(m);
		if (!latex) return;
		e.preventDefault();
		ctxLatex = latex;
		ctxDisplay = m.classList.contains("katex-display");
		openMenu(e.clientX, e.clientY);
	});

	menu.addEventListener("click", async (e) => {
		const btn = (e.target as HTMLElement).closest(
			"[data-act]",
		) as HTMLElement | null;
		if (!btn) return;
		const act = btn.dataset.act;
		closeMenu();

		if (act === "copy") {
			await copyToClipboard(ctxLatex);
		} else if (act === "svg") {
			try {
				const { tex2svg } = await import("./tex2svg");
				downloadFile(
					tex2svg(ctxLatex, ctxDisplay),
					"equation.svg",
					"image/svg+xml;charset=utf-8",
				);
			} catch (err) {
				console.error("SVG export failed:", err);
				alert("Sorry, SVG export failed — see the console for details.");
			}
		}
	});

	// Dismiss the menu on any outside interaction.
	document.addEventListener("click", closeMenu);
	document.addEventListener("scroll", closeMenu, true);
	window.addEventListener("blur", closeMenu);
	document.addEventListener("keydown", (e) => {
		if (e.key === "Escape") closeMenu();
	});
}

function downloadFile(content: string, name: string, type: string) {
	const blob = new Blob([content], { type });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = name;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}
