'use client';

import { useEffect, useRef, useState } from 'react';

type LayoutMode = 'left' | 'center' | 'right';

interface DraggableSidebarProps {
  children?: React.ReactNode;
  sidebarContent?: React.ReactNode;
  initialMode?: LayoutMode;
  compact?: boolean;
}

export function DraggableSidebar({ children, sidebarContent, initialMode = 'left', compact = false }: DraggableSidebarProps) {
  const [currentMode, setCurrentMode] = useState<LayoutMode>(initialMode);
  const [isDragging, setIsDragging] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef(0);

  useEffect(() => {
		const navWindow = navRef.current?.querySelector(
			".nav_window"
		) as HTMLElement;
		if (!navWindow || !navRef.current || !containerRef.current) return;

		// インタラクティブな要素かどうかをチェック
		const isInteractiveElement = (target: HTMLElement): boolean => {
			// ボタン、リンク、input等のインタラクティブな要素
			if (
				target.matches(
					'button, a, input, select, textarea, [role="button"]'
				)
			) {
				return true;
			}
			// 親要素を辿ってチェック
			let parent = target.parentElement;
			while (parent && parent !== navRef.current) {
				if (
					parent.matches(
						'button, a, input, select, textarea, [role="button"]'
					)
				) {
					return true;
				}
				parent = parent.parentElement;
			}
			return false;
		};

		const startDrag = (e: MouseEvent | TouchEvent) => {
			const target = e.target as HTMLElement;

			// インタラクティブな要素ではドラッグしない
			if (isInteractiveElement(target)) {
				return;
			}

			e.preventDefault();
			setIsDragging(true);
			navRef.current?.classList.add("dragging");

			const startX = "clientX" in e ? e.clientX : e.touches[0].clientX;
			const containerRect = containerRef.current!.getBoundingClientRect();
			const navRect = navRef.current!.getBoundingClientRect();

			// ドラッグ開始時のオフセットを計算
			dragOffsetRef.current = startX - navRect.left;

			const handleMove = (e: MouseEvent | TouchEvent) => {
				if (!navRef.current || !containerRef.current) return;

				const currentX =
					"clientX" in e ? e.clientX : e.touches[0].clientX;
				const containerWidth = containerRect.width;
				const navWidth = navRect.width;

				// カーソルに追従する位置を計算
				const targetX = currentX - dragOffsetRef.current;
				const clampedX = Math.max(
					0,
					Math.min(targetX, containerWidth - navWidth)
				);

				// リアルタイムで位置を更新
				navRef.current.style.left = `${clampedX}px`;

				// 位置判定（スナップ用）
				const relativeX = currentX / containerWidth;
				let targetMode: LayoutMode;

				if (relativeX < 0.25) {
					targetMode = "left";
				} else if (relativeX > 0.75) {
					targetMode = "right";
				} else {
					targetMode = "center";
				}

				// モードが変わった場合のみ更新
				if (targetMode !== currentMode) {
					setCurrentMode(targetMode);
				}
			};

			const handleEnd = () => {
				if (!navRef.current || !containerRef.current) return;

				setIsDragging(false);
				navRef.current.classList.remove("dragging");

				// 最終的な位置にスナップ
				const containerRect =
					containerRef.current.getBoundingClientRect();
				const navRect = navRef.current.getBoundingClientRect();
				const relativeX =
					(navRect.left + navRect.width / 2) / containerRect.width;

				let finalMode: LayoutMode;
				if (relativeX < 0.33) {
					finalMode = "left";
				} else if (relativeX > 0.67) {
					finalMode = "right";
				} else {
					finalMode = "center";
				}

				setCurrentMode(finalMode);

				// ドロップ時にスタイル属性を解除
				navRef.current.style.left = "";

				document.removeEventListener("mousemove", handleMove as any);
				document.removeEventListener("mouseup", handleEnd);
				document.removeEventListener("touchmove", handleMove as any);
				document.removeEventListener("touchend", handleEnd);
			};

			document.addEventListener("mousemove", handleMove as any);
			document.addEventListener("mouseup", handleEnd);
			document.addEventListener("touchmove", handleMove as any);
			document.addEventListener("touchend", handleEnd);
		};

		navWindow.addEventListener("mousedown", startDrag as any);
		navWindow.addEventListener("touchstart", startDrag as any);

		return () => {
			navWindow.removeEventListener("mousedown", startDrag as any);
			navWindow.removeEventListener("touchstart", startDrag as any);
		};
  }, [currentMode]);

  return (
		<div
			ref={containerRef}
			className={`draggable-layout app_container ${currentMode} ${compact ? 'compact-sidebar' : ''}`}
		>
			{/* ドラッグ可能なサイドバー */}
			<aside
				ref={navRef}
				className={`nav_section ${currentMode}`}
				role="complementary"
				aria-label="ドラッグ可能なサイドバーナビゲーション"
			>
				{/* <div className="drag_area"></div> */}
				<div
					className="nav_window"
					role="region"
					aria-label="ナビゲーションパネル"
					style={{ cursor: isDragging ? "grabbing" : "grab" }}
				>
					<div className="nav_content flex flex-col gap-4 h-full">
						{sidebarContent || (
							<>
								<div className="text-center mb-2">
									<h2
										className="text-lg font-bold"
										style={{ color: "var(--mc)" }}
									>
										Chat Kanban
									</h2>
									<p className="text-xs mt-1 opacity-70">
										ナビゲーション
									</p>
								</div>

								<div className="controls flex gap-2">
									<button
										className="control_btn flex-1 px-3 py-2 rounded-lg text-sm font-medium transition"
										style={{
											backgroundColor: "var(--bc)",
											color: "var(--tx)",
										}}
										onMouseOver={(e) =>
											(e.currentTarget.style.opacity =
												"0.8")
										}
										onMouseOut={(e) =>
											(e.currentTarget.style.opacity =
												"1")
										}
										aria-label="ダークモード切り替え"
									>
										🌙
									</button>
									<button
										className="control_btn flex-1 px-3 py-2 rounded-lg text-white text-sm font-medium transition"
										style={{ backgroundColor: "var(--mc)" }}
										onMouseOver={(e) =>
											(e.currentTarget.style.opacity =
												"0.9")
										}
										onMouseOut={(e) =>
											(e.currentTarget.style.opacity =
												"1")
										}
										aria-label="データ更新"
									>
										🔄
									</button>
									<button
										className="control_btn flex-1 px-3 py-2 rounded-lg text-white text-sm font-medium transition"
										style={{ backgroundColor: "var(--ac)" }}
										onMouseOver={(e) =>
											(e.currentTarget.style.opacity =
												"0.9")
										}
										onMouseOut={(e) =>
											(e.currentTarget.style.opacity =
												"1")
										}
										aria-label="JSONエクスポート"
									>
										📦
									</button>
								</div>

								{/* 検索ボックス */}
								<div className="search-box mt-2">
									<input
										type="text"
										placeholder="🔍 メッセージを検索..."
										className="w-full px-3 py-2 rounded-lg text-sm transition"
										style={{
											backgroundColor: "var(--bc)",
											color: "var(--tx)",
											border: "1px solid var(--borderColor)",
											outline: "none",
										}}
										onFocus={(e) => {
											e.currentTarget.style.borderColor =
												"var(--mc)";
										}}
										onBlur={(e) => {
											e.currentTarget.style.borderColor =
												"var(--borderColor)";
										}}
										onChange={(e) => {
											// TODO: 検索機能の実装
											console.log(
												"Search query:",
												e.target.value
											);
										}}
										aria-label="メッセージ検索"
									/>
								</div>

								<nav className="navigation flex flex-col gap-2 mt-4">
									<a
										href="#"
										className="px-4 py-2 rounded-lg transition font-medium"
										style={{
											backgroundColor: "transparent",
											border: "1px solid var(--borderColor)",
										}}
										onMouseOver={(e) => {
											e.currentTarget.style.backgroundColor =
												"var(--mc)";
											e.currentTarget.style.color =
												"var(--wh)";
										}}
										onMouseOut={(e) => {
											e.currentTarget.style.backgroundColor =
												"transparent";
											e.currentTarget.style.color =
												"var(--tx)";
										}}
									>
										🏠 ホーム
									</a>
									<a
										href="#"
										className="px-4 py-2 rounded-lg transition font-medium"
										style={{
											backgroundColor: "transparent",
											border: "1px solid var(--borderColor)",
										}}
										onMouseOver={(e) => {
											e.currentTarget.style.backgroundColor =
												"var(--mc)";
											e.currentTarget.style.color =
												"var(--wh)";
										}}
										onMouseOut={(e) => {
											e.currentTarget.style.backgroundColor =
												"transparent";
											e.currentTarget.style.color =
												"var(--tx)";
										}}
									>
										🔍 フィルター
									</a>
									<a
										href="#"
										className="px-4 py-2 rounded-lg transition font-medium"
										style={{
											backgroundColor: "transparent",
											border: "1px solid var(--borderColor)",
										}}
										onMouseOver={(e) => {
											e.currentTarget.style.backgroundColor =
												"var(--mc)";
											e.currentTarget.style.color =
												"var(--wh)";
										}}
										onMouseOut={(e) => {
											e.currentTarget.style.backgroundColor =
												"transparent";
											e.currentTarget.style.color =
												"var(--tx)";
										}}
									>
										📊 統計
									</a>
								</nav>

								<div
									className="mt-auto pt-4 border-t text-xs text-center opacity-60"
									style={{
										borderColor: "var(--borderColor)",
									}}
								>
									<p>💡 このパネルは</p>
									<p>ドラッグで移動できます</p>
								</div>
							</>
						)}
					</div>
				</div>
			</aside>

			{/* メインコンテンツ */}
			{children}
		</div>
  );
}
