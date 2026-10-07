import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { SceneController } from "./scene/mount-scene";
import styles from "./hero-scene.module.css";

function subscribeReducedMotion(onChange: () => void) {
  const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  media?.addEventListener("change", onChange);
  return () => media?.removeEventListener("change", onChange);
}
function reducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? true;
}

export function HeroScene() {
  const stage = useRef<HTMLDivElement>(null);
  const holder = useRef<HTMLDivElement>(null);
  const controller = useRef<SceneController | null>(null);
  const [renderer, setRenderer] = useState("fallback");
  const [paused, setPaused] = useState(false);
  const reduced = useSyncExternalStore(subscribeReducedMotion, reducedMotion, () => true);
  const stopped = paused || reduced;
  const latestPause = useRef(stopped);
  useEffect(() => {
    latestPause.current = stopped;
    controller.current?.setPaused(stopped);
  }, [stopped]);
  useEffect(() => {
    const target = stage.current,
      graphics = holder.current;
    if (!target || !graphics) return;
    let cancelled = false,
      requested = false;
    const load = async () => {
      if (requested) return;
      requested = true;
      try {
        const { mountScene } = await import("./scene/mount-scene");
        await document.fonts.ready;
        if (cancelled) return;
        controller.current = mountScene(target, graphics, (status) => {
          if (!cancelled) setRenderer(status);
        });
        controller.current?.setPaused(latestPause.current);
      } catch {
        if (!cancelled) setRenderer("fallback");
      }
    };
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void load();
    });
    observer.observe(target);
    return () => {
      cancelled = true;
      observer.disconnect();
      controller.current?.dispose();
      controller.current = null;
    };
  }, []);
  return (
    <div
      className={`${styles.stage} ${stopped ? styles.paused : ""}`}
      ref={stage}
      data-renderer={renderer}
      aria-label="Minh họa giao diện: phiếu thi, bút và đồng hồ trong không gian"
    >
      <div className={styles.halo} aria-hidden="true" />
      <div className={styles.orbit} aria-hidden="true" />
      <div className={styles.fallback} aria-hidden="true">
        <div className={styles.sheet}>
          <div className={styles.paperHeader}>
            BÀI THI MẪU <span>01 / 03</span>
          </div>
          <div className={styles.paperTitle}>
            Sẵn sàng cho
            <br />
            câu đầu tiên?
          </div>
          <div className={styles.paperLine} />
          <div className={styles.option}>
            A <span>Một lựa chọn rõ ràng</span>
          </div>
          <div className={`${styles.option} ${styles.selected}`}>
            B <span>Nhịp làm bài của bạn</span>
            <span>✓</span>
          </div>
          <div className={styles.option}>
            C <span>Tiếp tục khám phá</span>
          </div>
          <div className={styles.paperFooter}>
            ExamPlatform <span>→</span>
          </div>
        </div>
        <div className={styles.pen} />
      </div>
      <div className={styles.graphics} ref={holder} aria-hidden="true" />
      <div className={`${styles.tag} ${styles.tagTop}`}>
        <span aria-hidden="true" />
        Không gian để tập trung
      </div>
      <div className={`${styles.tag} ${styles.tagBottom}`}>
        <span aria-hidden="true">⚑</span>
        <div>
          <b>Câu cần xem lại?</b>
          <span>Đánh dấu, rồi tiếp tục.</span>
        </div>
      </div>
      <span className={styles.caption}>Minh họa giao diện</span>
      <button
        className={styles.motion}
        type="button"
        disabled={reduced}
        aria-pressed={stopped}
        onClick={() => setPaused((value) => !value)}
      >
        <span aria-hidden="true">{stopped ? "▷" : "Ⅱ"}</span>
        {reduced ? "Hiệu ứng tĩnh" : paused ? "Bật hiệu ứng" : "Dừng hiệu ứng"}
      </button>
    </div>
  );
}
